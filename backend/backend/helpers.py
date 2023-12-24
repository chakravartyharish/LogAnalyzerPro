from core.models import UserData, UserMessage, UserGroup


def check_if_model_with_user_reference(klass):
    return klass in [UserData, UserMessage, UserGroup]
