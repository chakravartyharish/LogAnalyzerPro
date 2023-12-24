from typing import Dict, Any, Union

from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _


def _get_and_validate_bustype(value: Dict[str, Any]) -> Dict[str, Union[int, str, float, bool]]:
    try:
        bus_type_str = value["bustype"]
    except KeyError:
        raise ValidationError(_('Configuration must contain the keyword "bustype"'))

    mapping = {}
    try:
        bus_type: Dict[str, Union[int, str, float, bool]] = mapping[bus_type_str]
    except KeyError:
        raise ValidationError(_('Only the following values for "bustype" are allowed: "%(value)s"'),
                              params={'value': str(mapping.keys())})

    return bus_type


def validate_hw_interface_config(config: Dict[str, Any]) -> None:
    bus_type = _get_and_validate_bustype(config)

    allowed_keys = bus_type.__annotations__.keys()

    top_level_dicts = ["usbcatherder_data", "user_data"]
    for top_level_dict in top_level_dicts:
        if top_level_dict in config.keys():
            for k in config[top_level_dict].keys():
                if k not in allowed_keys:
                    raise ValidationError(_('Unsupported key "%(value)s" in configuration'), params={'value': k})


def validate_hw_interface_current_device_path(value: Dict[str, Any]) -> None:
    bus_type = _get_and_validate_bustype(value)

    allowed_keys = bus_type.__annotations__.keys()

    for k in value.keys():
        if k not in allowed_keys:
            raise ValidationError(_('Unsupported key "%(value)s" in configuration'), params={'value': k})
