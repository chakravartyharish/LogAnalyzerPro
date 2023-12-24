import os
import logging
import json
import asyncio
from functools import partial
from jwt import decode as jwt_decode
from asgiref.sync import sync_to_async
from channels.auth import BaseMiddleware, AuthMiddlewareStack
from channels.generic.websocket import AsyncWebsocketConsumer
from rest_framework_simplejwt.tokens import UntypedToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from django.http import HttpResponse
from django.conf import settings
from django.contrib.auth import get_user_model
from asgiref.compatibility import guarantee_single_callable
from channels.consumer import get_handler_name
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from .decorators import create_frontend_notification_from


logger = logging.getLogger(__name__)


# see settings.py

# ALLOWED_HOSTS_PER_URL = ((re.compile(r'127(?:\..+){3}'), re.compile('.*')),             # always allow all requests from localhost
#                          (re.compile(r'.+'), re.compile('^.*/ws/remoterunner/.+$'))     # allow requests for the remote runner api from everywhere
#                          )


def is_host_allowed(client_ip, request_path):
    for host_re, url_re in settings.ALLOWED_HOSTS_PER_URL:
        if host_re.match(client_ip) and url_re.match(request_path):
            return True
    return False


def get_default_client_ip():
    return os.environ.get('DJANGO_REQUEST_DEFAULT_CLIENT_IP', '')


def get_client_ip_from_scope(scope):
    client_ip_port = scope.get('client')
    if client_ip_port is not None:
        return client_ip_port[0]
    else:
        return get_default_client_ip()


# "REST" middleware

class RESTLogExceptionsMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def process_exception(self, request, exception):
        create_frontend_notification_from(exception, request.user)

    def __call__(self, request):
        return self.get_response(request)


class RESTDynamicAllowedHostsMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if hasattr(request, 'scope'):
            client_ip = get_client_ip_from_scope(request.scope)
        else:
            # it is possible that a request has no scope (WSGI)
            client_ip = get_default_client_ip()

        if is_host_allowed(client_ip, request.path):
            return self.get_response(request)

        response = HttpResponse()
        response.status_code = 403
        return response


# "channels" middleware

class WebsocketDenyAllConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.close()


class ChannelsDynamicAllowedHostsMiddleware(BaseMiddleware):

    def __init__(self, inner):
        self.__websocket_deny_all = WebsocketDenyAllConsumer.as_asgi()
        return super().__init__(inner)

    async def __call__(self, scope, receive, send):
        client_ip = get_client_ip_from_scope(scope)
        path = scope.get('path')

        if is_host_allowed(client_ip, path):
            return await super().__call__(scope, receive, send)

        return await self.__websocket_deny_all(scope, receive, send)


def ChannelsDynamicAllowedHostsMiddlewareStack(inner):
    return AuthMiddlewareStack(ChannelsDynamicAllowedHostsMiddleware(inner))


# NOTE: this is a copy of "from channelsmultiplexer import AsyncJsonWebsocketDemultiplexer"
#       where the scope gets passed on to the upstream applications as is (else injecting the user won't work)
class _AsyncJsonWebsocketDemultiplexer(AsyncJsonWebsocketConsumer):
    """
    JSON-understanding WebSocket consumer subclass that handles de-multiplexing streams using a "stream" key in a
    top-level dict and the actual payload in a sub-dict called "payload".
    This lets you run multiple streams over a single WebSocket connection in a standardised way.
    Incoming messages on streams are dispatched to consumers so you can just tie in consumers the normal way.
    """
    applications = {}
    application_close_timeout = 5

    def __init__(self, **kwargs):
        for key, app in kwargs.items():
            self.applications[key] = app

        super().__init__()

    async def __call__(self, scope, receive, send):
        self.application_streams = {}
        self.application_futures = {}
        self.applications_accepting_frames = set()
        self.closing = False

        # NOTE: do not copy the scope here so that upstream applications can see changes to it
        # scope = scope.copy()
        # scope['demultiplexer_cls'] = self.__class__
        self.scope = scope

        loop = asyncio.get_event_loop()
        # create the child applications
        await loop.create_task(self._create_upstream_applications())
        # start observing for messages
        message_consumer = loop.create_task(super().__call__(scope, receive, send))
        try:
            # wait for either an upstream application to close or the message consumer loop.
            await asyncio.wait(
                list(self.application_futures.values()) + [message_consumer],
                return_when=asyncio.FIRST_COMPLETED
            )
        finally:
            # make sure we clean up the message consumer loop
            message_consumer.cancel()
            try:
                # check if there were any exceptions raised
                await message_consumer
            except asyncio.CancelledError:
                pass
            finally:
                # Make sure we clean up upstream applications on exit
                for future in self.application_futures.values():
                    future.cancel()
                    try:
                        # check for exceptions
                        await future
                    except asyncio.CancelledError:
                        pass

    async def _create_upstream_applications(self):
        """
        Create the upstream applications.
        """
        loop = asyncio.get_event_loop()
        for stream_name, application in self.applications.items():
            application = guarantee_single_callable(application)
            upstream_queue = asyncio.Queue()
            self.application_streams[stream_name] = upstream_queue
            self.application_futures[stream_name] = loop.create_task(
                application(
                    self.scope,
                    upstream_queue.get,
                    partial(self.dispatch_downstream, stream_name=stream_name)
                )
            )

    async def send_upstream(self, message, stream_name=None):
        """
        Send a message upstream to a de-multiplexed application.

        If stream_name is includes will send just to that upstream steam, if not included will send ot all upstream
        streams.
        """
        if stream_name is None:
            for stream_queue in self.application_streams.values():
                await stream_queue.put(message)
            return
        stream_queue = self.application_streams.get(stream_name)
        if stream_queue is None:
            raise ValueError(f"Invalid multiplexed frame received (stream not mapped) - {stream_name}")
        await stream_queue.put(message)

    async def dispatch_downstream(self, message, stream_name):
        """
        Handle a downstream message coming from an upstream steam.

        if there is not handling method set for this method type it will propagate the message further downstream.

        This is called as part of the co-routine of an upstream steam, not the same loop as used for upstream messages
        in the de-multiplexer.
        """
        handler = getattr(self, get_handler_name(message), None)
        if handler:
            await handler(message, stream_name=stream_name)
        else:
            # if there is not handler then just pass the message further downstream.
            await self.base_send(message)

    # Websocket upstream handlers

    async def websocket_connect(self, message):
        await self.send_upstream(message)

    async def receive_json(self, content, **kwargs):
        """
        Rout the message down the correct stream.
        """
        # Check the frame looks good
        if isinstance(content, dict) and "stream" in content and "payload" in content:
            # Match it to a channel
            stream_name = content["stream"]
            payload = content["payload"]

            # block upstream frames
            if stream_name not in self.applications_accepting_frames:
                raise ValueError(f"Invalid multiplexed frame received (stream not mapped) - {stream_name}")
            # send it on to the application that handles this stream
            await self.send_upstream(
                message={
                    "type": "websocket.receive",
                    "text": await self.encode_json(payload)
                },
                stream_name=stream_name
            )
            return
        else:
            raise ValueError("Invalid multiplexed **frame received (no channel/payload key)")

    async def websocket_disconnect(self, message):
        """
        Handle the disconnect message.

        This is propagated to all upstream applications.
        """
        # set this flag so as to ensure we don't send a downstream `websocket.close` message due to all
        # child applications closing.
        self.closing = True
        # inform all children
        await self.send_upstream(message)
        await super().websocket_disconnect(message)

    async def disconnect(self, code):
        """
        default is to wait for the child applications to close.
        """
        try:
            await asyncio.wait(
                self.application_futures.values(),
                return_when=asyncio.ALL_COMPLETED,
                timeout=self.application_close_timeout
            )
        except asyncio.TimeoutError:
            pass

    # Note if all child applications close within the timeout this cor-routine will be killed before we get here.

    async def websocket_send(self, message, stream_name):
        """
        Capture downstream websocket.send messages from the upstream applications.
        """
        text = message.get("text")
        # todo what to do on binary!
        json = await self.decode_json(text)
        data = {
            "stream": stream_name,
            "payload": json
        }
        await self.send_json(data)

    async def websocket_accept(self, message, stream_name):
        """
        Intercept downstream `websocket.accept` message and thus allow this upstream application to accept websocket
        frames.
        """
        is_first = not self.applications_accepting_frames
        self.applications_accepting_frames.add(stream_name)
        # accept the connection after the first upstream application accepts.
        if is_first:
            await self.accept()

    async def websocket_close(self, message, stream_name):
        """
        Handle downstream `websocket.close` message.

        Will disconnect this upstream application from receiving any new frames.

        If there are not more upstream applications accepting messages it will then call `close`.
        """
        if stream_name in self.applications_accepting_frames:
            # remove from set of upstream streams than can receive new messages
            self.applications_accepting_frames.remove(stream_name)

        # we are already closing due to an upstream websocket.disconnect command

        if self.closing:
            return
        # if none of the upstream applications are listing we need to close.
        if not self.applications_accepting_frames:
            await self.close(message.get("code"))


class AsyncWebsocketJWTAuthProvider(AsyncWebsocketConsumer):

    SET_JWT_ACCESS_TOKEN_STREAM_NAME = 'set_jwt_access_token'
    SCOPE_JWT_ACCESS_TOKEN_KEY = 'jwt_access_token'

    application = None
    application_close_timeout = 5

    def __init__(self, **kwargs):
        self.application = kwargs.pop('upstream_application')
        super().__init__(**kwargs)

    async def __call__(self, scope, receive, send):
        self.application_queue = None
        self.application_task = None
        self.scope = scope
        self.closing = False

        loop = asyncio.get_event_loop()
        await loop.create_task(self._create_upstream_application())
        message_consumer = loop.create_task(super().__call__(scope, receive, send))
        try:
            # wait for either an upstream application to close or the message consumer loop.
            await asyncio.wait(
                [self.application_task, message_consumer],
                return_when=asyncio.FIRST_COMPLETED
            )
        finally:
            # make sure we clean up the message consumer loop
            message_consumer.cancel()
            try:
                # check if there were any exceptions raised
                await message_consumer
            except asyncio.CancelledError:
                pass
            finally:
                self.application_task.cancel()
                try:
                    # check for exceptions
                    await self.application_task
                except asyncio.CancelledError:
                    pass

    async def _create_upstream_application(self):
        loop = asyncio.get_event_loop()
        application = guarantee_single_callable(self.application)
        self.application_queue = asyncio.Queue()
        self.application_task = loop.create_task(
            application(
                self.scope,
                self.application_queue.get,
                self.send_downstream
            )
        )

    async def send_upstream(self, message):
        if self.application_queue is None:
            raise ValueError('No application queue')
        await self.application_queue.put(message)

    async def send_downstream(self, message):
        handler = getattr(self, get_handler_name(message), None)
        if handler:
            await handler(message)
        else:
            await self.base_send(message)

    # websocket upstream handlers

    async def websocket_connect(self, message):
        await self.send_upstream(message)

    async def websocket_receive(self, message):
        content = json.loads(message.get('text', {}))
        if isinstance(content, dict):
            stream_name = content.get('stream')
            payload = content.get('payload', {})

            # JWT set access token
            if stream_name == self.SET_JWT_ACCESS_TOKEN_STREAM_NAME:
                access_token = payload['data']['access']
                self.scope[self.SCOPE_JWT_ACCESS_TOKEN_KEY] = access_token
                logger.info(f'set jwt access token to {access_token}')
                return

        # JWT auth check
        token = self.scope.get(self.SCOPE_JWT_ACCESS_TOKEN_KEY, b'INVALID')
        try:
            # validate the token
            UntypedToken(token)
        except (InvalidToken, TokenError):
            logger.warning(f'Closing DCRF websocket connection (stream "{stream_name}" , JWT token "{token.decode()}")')
            await self.close()
            return

        # TODO: only query / set the user if the token changes
        decoded_data = jwt_decode(token, settings.SECRET_KEY, algorithms=['HS256'])
        user = await sync_to_async(get_user_model().objects.get)(id=decoded_data['user_id'])
        self.scope['user'] = user

        # forward to application
        await self.send_upstream(message)

    async def websocket_disconnect(self, message):
        self.closing = True
        await self.send_upstream(message)
        await super().websocket_disconnect(message)

    # NOTE: if the child application closes within the timeout this coroutine will be killed before we get here

    async def websocket_send(self, message):
        await self.base_send(message)

    async def websocket_accept(self, message):
        await self.accept()

    async def websocket_close(self, message):
        if self.closing:
            return
        await self.close(message.get('code'))

    async def disconnect(self, code):
        try:
            await asyncio.wait(
                [self.application_task],
                return_when=asyncio.ALL_COMPLETED,
                timeout=self.application_close_timeout
            )
        except asyncio.TimeoutError:
            pass
