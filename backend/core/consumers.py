import logging
from djangochannelsrestframework.observer import model_observer
from channels.generic.websocket import WebsocketConsumer, JsonWebsocketConsumer
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from backend.base_consumers import DCRFBaseCRUDWithSubscriptionConsumerWithUserHandling
from backend.base_consumers import DCRFBaseCRUDWithSubscriptionConsumerWithoutUserHandling
from .models import HWInterface, SystemData, UserMessage, BackendEvent, License, UserData, User, UserGroup
from .serializers import HWInterfaceSerializer, SystemDataSerializer, UserMessageSerializer, UserSerializer, \
    UserGroupSerializer
from .serializers import BackendEventSerializer, LicenseSerializer, UserDataSerializer


logger = logging.getLogger(__name__)


class TerminalFrontendConsumer(WebsocketConsumer):

    @staticmethod
    def make_terminal_channel_group_name(id):
        return f'TERMINAL.{id}'

    def connect(self):
        async_to_sync(self.channel_layer.group_add)(
            self.make_terminal_channel_group_name(self.scope['url_route']['kwargs']['id']),
            self.channel_name
        )
        self.accept()

    def disconnect(self, _):
        async_to_sync(self.channel_layer.group_discard)(
            self.make_terminal_channel_group_name(self.scope['url_route']['kwargs']['id']),
            self.channel_name
        )

    def receive(self, text_data=None):
        # frontend -> remote terminal
        terminal_id = self.scope['url_route']['kwargs']['id']
        event = {'type': 'terminal_forward_data',
                 'terminal_id': terminal_id,
                 'direction': 'FRONTEND_TO_TERMINAL',
                 'data': text_data}
        async_to_sync(self.channel_layer.group_send)(self.make_terminal_channel_group_name(terminal_id), event)

    def terminal_forward_data(self, event):
        if event['direction'] != 'TERMINAL_TO_FRONTEND':
            return
        terminal_id = self.scope['url_route']['kwargs']['id']
        if event['terminal_id'] == terminal_id:
            self.send(event['data'])


class LiveDataConsumer(JsonWebsocketConsumer):
    LIVE_DATA_CHANNEL_GROUP_NAME = 'LIVE_DATA_GROUP'

    def connect(self):
        async_to_sync(self.channel_layer.group_add)(
            self.LIVE_DATA_CHANNEL_GROUP_NAME,
            self.channel_name
        )
        self.accept()

    def disconnect(self, _):
        async_to_sync(self.channel_layer.group_discard)(
            self.LIVE_DATA_CHANNEL_GROUP_NAME,
            self.channel_name
        )

    def forward_data_to_clients(self, event):
        self.send_json(event['data'])

    @staticmethod
    def send_logline_to_clients(logline, id='GLOBAL'):
        LiveDataConsumer.send_loglines_to_clients([logline], id=id)

    @staticmethod
    def send_loglines_to_clients(loglines, id='GLOBAL'):
        # valid ids - "GLOBAL" / "UDSSCAN::{scan_db_id}" / "ISOTPEPSCAN::{scan_db_id} / "GENERICREMOTEJOB::{remote_job_id}"
        if not loglines:
            return
        data = {'id': id, 'loglines': loglines}
        event = {'type': 'forward_data_to_clients', 'data': data}
        return async_to_sync(get_channel_layer().group_send)(LiveDataConsumer.LIVE_DATA_CHANNEL_GROUP_NAME, event)


class SystemDataConsumer(DCRFBaseCRUDWithSubscriptionConsumerWithoutUserHandling):

    model_class = SystemData
    serializer_class = SystemDataSerializer

    @model_observer(model_class, serializer_class=serializer_class)
    async def model_change(self, *args, **kwargs):
        return await super().send_message_to_subscribers(*args, **kwargs)


class HWInterfaceConsumer(DCRFBaseCRUDWithSubscriptionConsumerWithoutUserHandling):

    model_class = HWInterface
    serializer_class = HWInterfaceSerializer

    @model_observer(model_class, serializer_class=serializer_class)
    async def model_change(self, *args, **kwargs):
        return await super().send_message_to_subscribers(*args, **kwargs)


class UserMessageConsumer(DCRFBaseCRUDWithSubscriptionConsumerWithUserHandling):

    model_class = UserMessage
    serializer_class = UserMessageSerializer

    @model_observer(model_class, serializer_class=serializer_class)
    async def model_change(self, *args, **kwargs):
        return await super().send_message_to_subscribers(*args, **kwargs)

    @model_change.groups_for_consumer
    def model_change(self, *args, **kwargs):
        for group in DCRFBaseCRUDWithSubscriptionConsumerWithUserHandling.groups_for_consumer(self, *args, **kwargs):
            yield group

    @model_change.groups_for_signal
    def model_change(self, *args, **kwargs):
        for group in DCRFBaseCRUDWithSubscriptionConsumerWithUserHandling.groups_for_signal(self, *args, **kwargs):
            yield group


class BackendEventConsumer(DCRFBaseCRUDWithSubscriptionConsumerWithUserHandling):

    model_class = BackendEvent
    serializer_class = BackendEventSerializer

    @model_observer(model_class, serializer_class=serializer_class)
    async def model_change(self, *args, **kwargs):
        return await super().send_message_to_subscribers(*args, **kwargs)

    @model_change.groups_for_consumer
    def model_change(self, *args, **kwargs):
        for group in DCRFBaseCRUDWithSubscriptionConsumerWithUserHandling.groups_for_consumer(self, *args, **kwargs):
            yield group

    @model_change.groups_for_signal
    def model_change(self, *args, **kwargs):
        for group in DCRFBaseCRUDWithSubscriptionConsumerWithUserHandling.groups_for_signal(self, *args, **kwargs):
            yield group


class LicenseConsumer(DCRFBaseCRUDWithSubscriptionConsumerWithUserHandling):

    model_class = License
    serializer_class = LicenseSerializer

    @model_observer(model_class, serializer_class=serializer_class)
    async def model_change(self, *args, **kwargs):
        return await super().send_message_to_subscribers(*args, **kwargs)

    @model_change.groups_for_consumer
    def model_change(self, *args, **kwargs):
        for group in DCRFBaseCRUDWithSubscriptionConsumerWithUserHandling.groups_for_consumer(self, *args, **kwargs):
            yield group

    @model_change.groups_for_signal
    def model_change(self, *args, **kwargs):
        for group in DCRFBaseCRUDWithSubscriptionConsumerWithUserHandling.groups_for_signal(self, *args, **kwargs):
            yield group


class UserDataConsumer(DCRFBaseCRUDWithSubscriptionConsumerWithUserHandling):

    model_class = UserData
    serializer_class = UserDataSerializer

    @model_observer(model_class, serializer_class=serializer_class)
    async def model_change(self, *args, **kwargs):
        return await super().send_message_to_subscribers(*args, **kwargs)

    @model_change.groups_for_consumer
    def model_change(self, *args, **kwargs):
        for group in DCRFBaseCRUDWithSubscriptionConsumerWithUserHandling.groups_for_consumer(self, *args, **kwargs):
            yield group

    @model_change.groups_for_signal
    def model_change(self, *args, **kwargs):
        for group in DCRFBaseCRUDWithSubscriptionConsumerWithUserHandling.groups_for_signal(self, *args, **kwargs):
            yield group


class UserConsumer(DCRFBaseCRUDWithSubscriptionConsumerWithoutUserHandling):

    model_class = User
    serializer_class = UserSerializer

    def get_queryset(self, **kwargs):
        user = self.scope['user']
        if user.is_admin:
            return self.model_class.objects.all()
        elif user.is_staff:
            return self.model_class.objects.filter(is_admin=False)
        else:
            return self.model_class.objects.filter(pk=user.pk)

    @model_observer(model_class, serializer_class=serializer_class)
    async def model_change(self, *args, **kwargs):
        return await super().send_message_to_subscribers(*args, **kwargs)


class UserGroupConsumer(DCRFBaseCRUDWithSubscriptionConsumerWithoutUserHandling):

    model_class = UserGroup
    serializer_class = UserGroupSerializer

    def get_queryset(self, **kwargs):
        if self.scope['user'].is_staff or self.scope['user'].is_admin:
            return self.model_class.objects.all()
        else:
            return [obj for obj in self.model_class.objects.all() if self.scope['user'] in obj.users.all()]

    @model_observer(model_class, serializer_class=serializer_class)
    async def model_change(self, *args, **kwargs):
        return await super().send_message_to_subscribers(*args, **kwargs)
