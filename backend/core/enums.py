import os
from enum import Enum


def check_if_item_in_enum(value, enum_type: Enum) -> bool:
    """
    Validate if a given value is present in the values of an enum
    :param value: the item to validate
    :param enum_type: the enum to check if value is present
    :returns: True if item in enum_type, False otherwise
    """
    return value in set(item.value for item in enum_type)


def get_and_validate_var_value_from_env(env_var_name: str, default_value: str, enum_type: Enum) -> str:
    """
    Gets the value from an env var and validates if it is in a given enum.
    :param env_var_name: name of the env var to get the value from
    :param default_value: default value to use if env_var_value is not in enum_type
    :param enum_type: the enum to validate env_var_value against
    :returns: default_value if env_var_value is not in enum_type, env_var_value otherwise
    """
    env_var_value = os.environ.get(env_var_name, default_value)

    if not check_if_item_in_enum(env_var_value, enum_type):
        # ToDo: Logging
        print(f"Value {env_var_value} from env var {env_var_name} is not in the provided enum. "
              f"Default value \"{default_value}\" is used.")
        return default_value

    return env_var_value


class AppEnvironmentEnum(Enum):
    PRODUCTION = "production"
    TEST = "test"
    DEVELOPMENT = "development"
