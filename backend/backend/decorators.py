import logging
from functools import wraps
from rest_framework import viewsets

from core.models import User, UserMessage
from backend.constants import HYDRA_VISION_PERSONALITY_NAME
from django.conf import settings


logger = logging.getLogger(__name__)


class NoValidLicenseException(Exception):
    pass


def create_frontend_notification_from(exception: Exception, user: User = None):
    message = 'The backend encountered an unexpected internal error.'
    if settings.APP_ENVIRONMENT == 'development':
        # do not log the full traceback
        # (the backend logs should be available on the console ...)
        message += f' ({str(exception)})'
    try:
        UserMessage.objects.create(user=user,
                                   title='Internal Backend Error',
                                   message=message)
    except Exception:
        logger.exception('create_frontend_notification_from excepted')


def record_unexpected_exception_in_model_signal_handler_as_frontend_notification_decorator(wrapped_function):
    @wraps(wrapped_function)
    def wrapper(sender, instance, *args, **kwargs):
        try:
            return wrapped_function(sender, instance, *args, **kwargs)
        except Exception as e:
            create_frontend_notification_from(e, instance.user)
            raise
    return wrapper


def set_groups_on_created_model_instance_decorator(wrapped_function):
    @wraps(wrapped_function)
    def wrapper(self, *args, **kwargs):
        if settings.PRODUCT_PERSONALITY.name == HYDRA_VISION_PERSONALITY_NAME:
            request = self.context.get('request')
            user = self.context.get('scope', {}).get('user')
            if not user and request:
                user = request.user
        else:
            user = None
        instance = wrapped_function(self, *args, **kwargs)
        if user:
            instance.groups.set(user.groups.all())
            instance.save()
        return instance
    return wrapper


def enforce_at_least_one_valid_license_decorator(wrapped_function):
    @wraps(wrapped_function)
    def wrapper(*args, **kwargs):
        return wrapped_function(*args, **kwargs)
    return wrapper


# not really a decorator (can not be added to utils because of 'order of initialization issues')
class EnforceAtLeastOneValidLicenseBaseView(viewsets.ModelViewSet):
    @enforce_at_least_one_valid_license_decorator
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    @enforce_at_least_one_valid_license_decorator
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @enforce_at_least_one_valid_license_decorator
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)

    @enforce_at_least_one_valid_license_decorator
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @enforce_at_least_one_valid_license_decorator
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    def get_queryset(self):
        return self.serializer_class.Meta.model.objects.all()
