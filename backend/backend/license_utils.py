import base64
import json
import pathlib
import time

import requests
from cachetools import cached, TTLCache, Cache

from backend.settings import MEDIA_ROOT
from backend.utils import get_hardware_id
from core.constants import LICENSE_SERVER_URL, LICENSE_SERVER_API_SERIAL_BLACKLIST


def verify_signature(message, b64_signature):
    return True


def decode_and_verify_license_blob(b64_license_with_signature):
    b64_license, b64_signature = b64_license_with_signature.split(':')
    if verify_signature(b64_license, b64_signature) is False:
        raise Exception('Invalid Signature')
    license_dict = json.loads(base64.b64decode(b64_license))

    return license_dict


def check_license_expired(license_dict: dict) -> bool:
    expiry_date = license_dict["ValidUntil"]

    if not (expiry_date == 0):
        return time.time() > expiry_date
    return False


@cached(cache=TTLCache(maxsize=1, ttl=30 * 60))
def fetch_blacklisted_license_serials():
    return requests.get(LICENSE_SERVER_URL + LICENSE_SERVER_API_SERIAL_BLACKLIST)


@cached(cache=Cache(maxsize=1))
def get_local_blacklisted_serials():
    with open(str(pathlib.Path(MEDIA_ROOT) / ".bl")) as bl:
        return json.loads(base64.b64decode(bl.read().encode()).decode())


def check_license_disabled(lic) -> bool:
    current_license_serial = lic.license_config["Serial"]
    if lic.disabled:
        return True

    # Two ways of checking if license has been disabled:
    # - check against license server api
    # - check against "local" list of blacklisted serials which gets added during apps build
    # Both are base64 encoded JSON lists of serial strings
    try:
        response = fetch_blacklisted_license_serials()
        if current_license_serial in json.loads(base64.b64decode(response.text.encode()).decode()):
            lic.disabled = True
            lic.save()
            return True
    except Exception:
        # Couldn't request the license server blacklist.
        # Try "local" blacklist as backup
        try:
            serials = get_local_blacklisted_serials()
            if current_license_serial in serials:
                lic.disabled = True
                lic.save()
                return True
        except Exception:
            # We are basically blind and just have to trust the user
            pass
    return False


def check_license_hw_id_valid_for_current_machine(lic) -> bool:
    hw_id = get_hardware_id()
    license_hw_id = lic.license_config["HWID"]

    return hw_id == license_hw_id
