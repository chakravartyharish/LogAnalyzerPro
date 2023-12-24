import base64
import json
from django.apps import AppConfig
from django.db.models.signals import post_migrate
from django.conf import settings
from backend.constants import HYDRA_SCOPE_PERSONALITY_NAME


def create_singleton_objects(*args, **kwargs):

    from .models import SystemData, UserData

    if SystemData.objects.all().count() == 0:
        SystemData.objects.create()

    if settings.PRODUCT_PERSONALITY.name == HYDRA_SCOPE_PERSONALITY_NAME:
        # only auto generate a single userdata object for HydraScope (no users)
        if UserData.objects.all().count() == 0:
            # TODO: add a manager for this (and use it here and when a new user is created, see core/models.py)
            UserData.objects.create(user_data=base64.b64encode(json.dumps({}).encode("utf-8")).decode())


def create_default_group_if_not_exist(*args, **kwargs):
    from .models import UserGroup
    from .constants import DEFAULT_USER_GROUP_NAME

    UserGroup.objects.get_or_create(name=DEFAULT_USER_GROUP_NAME)


class CoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core'

    def ready(self):
        post_migrate.connect(create_singleton_objects, sender=self)
        post_migrate.connect(create_default_group_if_not_exist, sender=self)
