import logging
from typing import Dict

from asgiref.sync import sync_to_async
from djangochannelsrestframework.permissions import AllowAny, IsAuthenticated
from rest_framework import status
from django.conf import settings
from djangochannelsrestframework.decorators import action
from djangochannelsrestframework.generics import GenericAsyncAPIConsumer
from djangochannelsrestframework.mixins import (
    ListModelMixin,
    RetrieveModelMixin,
    PatchModelMixin,
    UpdateModelMixin,
    CreateModelMixin,
    DeleteModelMixin,
)
from backend.constants import HYDRA_VISION_PERSONALITY_NAME
from backend.helpers import check_if_model_with_user_reference

logger = logging.getLogger(__name__)


class DCRFBaseCRUDWithSubscriptionConsumer(ListModelMixin,
                                           RetrieveModelMixin,
                                           PatchModelMixin,
                                           UpdateModelMixin,
                                           CreateModelMixin,
                                           DeleteModelMixin,
                                           GenericAsyncAPIConsumer):
    if settings.PRODUCT_PERSONALITY.name == HYDRA_VISION_PERSONALITY_NAME:
        permission_classes = [IsAuthenticated]
    else:
        permission_classes = [AllowAny]

    async def send_message_to_subscribers(self,
                                          message: Dict,
                                          action,
                                          subscribing_request_ids=[],
                                          **kwargs):
        response_message = dict(errors=[], response_status=status.HTTP_200_OK, **dict(action=action, data=message))
        for request_id in subscribing_request_ids:
            await self.send_json(dict(request_id=request_id, **response_message))

    # @staticmethod
    # def serialize_model_change(self,
    #                            instance,
    #                            action,
    #                            **kwargs) -> Dict:
    #     return dict(action=action.value, data=self.serializer_class(instance).data)


class DCRFBaseCRUDWithSubscriptionConsumerWithUserHandling(DCRFBaseCRUDWithSubscriptionConsumer):

    def get_queryset(self, **kwargs):
        if settings.PRODUCT_PERSONALITY.name == HYDRA_VISION_PERSONALITY_NAME:
            user = self.scope['user']
            if check_if_model_with_user_reference(self.model_class):
                return self.model_class.objects.filter(user=user)
            user_groups = user.groups.all()
            return self.model_class.objects.filter(groups__in=user_groups).distinct()
        else:
            return self.model_class.objects.all()

    @staticmethod
    def groups_for_consumer(observer, groups=None, user=None, **kwargs):
        if settings.PRODUCT_PERSONALITY.name == HYDRA_VISION_PERSONALITY_NAME:
            if groups:
                for group in groups:
                    yield f'-{observer.model_cls.__name__.lower()}-groupid__{group.id}'
            elif user:
                yield f'-{observer.model_cls.__name__.lower()}-userid__{user.id}'
        else:
            yield f'-{observer.model_cls.__name__.lower()}-alluser'

    @staticmethod
    def groups_for_signal(observer, instance, **kwargs):
        if settings.PRODUCT_PERSONALITY.name == HYDRA_VISION_PERSONALITY_NAME:
            klass = instance.__class__
            if check_if_model_with_user_reference(klass):
                user = instance.user
                yield f'-{observer.model_cls.__name__.lower()}-userid__{user.id}'
            else:
                # We can't get groups for signal if model object has no group
                # anymore. So if model object has no groups anymore it just gets
                # deleted without notifying anyone (frontend should reload if
                # group gets deleted)
                # (see remoterunner/models.py auto_delete_instance_if_group_empty)
                try:
                    # Note: this could lead to performance issues due to the
                    # DB accesses. To fix this maybe save the group strings
                    # inside the model
                    groups = list(instance.groups.all())
                except ValueError:
                    return
                for group in groups:
                    yield f'-{observer.model_cls.__name__.lower()}-groupid__{group.id}'
        else:
            yield f'-{observer.model_cls.__name__.lower()}-alluser'

    @action()
    async def subscribe_to_all_changes(self, request_id, **kwargs):
        if check_if_model_with_user_reference(self.model_class):
            user = self.scope.get('user')
            await self.model_change.subscribe(request_id=request_id, user=user)
        else:
            groups = await sync_to_async(list)(self.scope.get('user').groups.all())
            await self.model_change.subscribe(request_id=request_id, groups=groups)

    @action()
    async def unsubscribe_from_all_changes(self, request_id, **kwargs):
        if check_if_model_with_user_reference(self.model_class):
            user = self.scope.get('user')
            await self.model_change.unsubscribe(request_id=request_id, user=user)
        else:
            groups = await sync_to_async(list)(self.scope.get('user').groups.all())
            await self.model_change.unsubscribe(request_id=request_id, groups=groups)


class DCRFBaseCRUDWithSubscriptionConsumerWithoutUserHandling(DCRFBaseCRUDWithSubscriptionConsumer):

    def get_queryset(self, **kwargs):
        return self.model_class.objects.all()

    @action()
    async def subscribe_to_all_changes(self, request_id, **kwargs):
        await self.model_change.subscribe(request_id=request_id)

    @action()
    async def unsubscribe_from_all_changes(self, request_id, **kwargs):
        await self.model_change.unsubscribe(request_id=request_id)
