"""
ASGI config for backend project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/4.0/howto/deployment/asgi/
"""

import os

from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application
from django.conf import settings
from django.urls import re_path
from backend.middleware import _AsyncJsonWebsocketDemultiplexer
from backend.middleware import ChannelsDynamicAllowedHostsMiddlewareStack
import core.consumers as core_consumers
import scanner.consumers as scanner_consumers
from backend.constants import HYDRA_SCOPE_PERSONALITY_NAME

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')


if settings.PRODUCT_PERSONALITY.name == HYDRA_SCOPE_PERSONALITY_NAME:
    websocket_urlpatterns = [
        re_path(r'ws/dcrf/$', _AsyncJsonWebsocketDemultiplexer.as_asgi(
            usermessage=core_consumers.UserMessageConsumer.as_asgi(),
            backendevent=core_consumers.BackendEventConsumer.as_asgi(),
            systemdata=core_consumers.SystemDataConsumer.as_asgi(),
            udsscanrun=scanner_consumers.UDSScanRunConsumer.as_asgi(),
            udsscanrunfinding=scanner_consumers.UDSScanRunFindingConsumer.as_asgi(),
            userdata=core_consumers.UserDataConsumer.as_asgi(),
        )),
    ]


application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": ChannelsDynamicAllowedHostsMiddlewareStack(
        URLRouter(websocket_urlpatterns)
    )
})
