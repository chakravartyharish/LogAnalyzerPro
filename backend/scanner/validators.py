from typing import Dict, Any

from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _

import ast

def _validate_number(value: str, maximum: int) -> None:
    charset = "1234567890ABCDEFabcdefx"

    if any([c not in charset for c in value]):
        raise ValidationError(_('%(value)s contains unsupported characters'), params={'value': value})
    try:
        int_value = ast.literal_eval(value)
        if int_value > maximum:
            raise ValidationError(
                _('%(value)s is to greater than the allowed maximum %(maxval)d'),
                params={'value': value, 'maxval': maximum})
        if int_value < 0:
            raise ValidationError(
                _('%(value)s is less than 0'), params={'value': value})
    except (ValueError, TypeError, SyntaxError):
        raise ValidationError(_('%(value)s has wrong format'), params={'value': value})


def _validate_scan_range(value: str, maximum: int) -> None:
    charset = "1234567890ABCDEFabcdef x,-"

    if any([c not in charset for c in value]):
        raise ValidationError(_('%(value)s contains unsupported characters'), params={'value': value})

    parts = value.split(',')
    nums = [p for p in parts if '-' not in p]
    for n in nums:
        _validate_number(n, maximum)

    ranges = [p for p in parts if '-' in p]
    for r in ranges:
        if r.count('-') != 1:
            raise ValidationError(_('%(value)s has wrong format'), params={'value': r})

        c = r.split('-')
        if len(c) != 2:
            raise ValidationError(_('%(value)s has wrong format'), params={'value': r})

        _validate_number(c[0], maximum)
        _validate_number(c[1], maximum)


def validate_scan_range(value: str) -> None:
    _validate_scan_range(value, 0x1fffffff)


def validate_extended_scan_range(value: str) -> None:
    _validate_scan_range(value, 0xff)


def validate_uds_scan_arguments(value: Dict[str, Any]) -> None:
    pass
