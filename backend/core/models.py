import base64
import datetime
import json
import logging
import multiprocessing
import random
import tempfile
from datetime import timedelta
from pathlib import Path
from dulwich import porcelain as dulwich_porcelain
import requests
from cachetools import cached, TTLCache
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.contrib.auth.models import BaseUserManager, AbstractBaseUser, Group
from django.utils import timezone
from django.conf import settings
from backend.constants import HYDRA_SCOPE_PERSONALITY_NAME
from core.constants import LICENSE_SERVER_URL, LICENSE_SERVER_API_ACTIVATE_LICENSE, DEFAULT_USER_GROUP_NAME, \
    DEFAULT_TESTCASES_METADATA_FILE_NAME

from core.validators import validate_hw_interface_config, validate_hw_interface_current_device_path

from backend.license_utils import decode_and_verify_license_blob, check_license_expired, check_license_disabled, \
    check_license_hw_id_valid_for_current_machine
from backend.utils import get_hardware_id

core_models_logger = logging.getLogger("backend.core.models")


class UserGroup(Group):
    description = models.CharField(max_length=150, null=True, blank=True)
    creation_date = models.DateTimeField(default=timezone.now, blank=True)

    def __str__(self):
        return self.description or self.name


class HWInterface(models.Model):
    class State(models.TextChoices):
        AVAILABLE = 'AVAILABLE', _('The interface is currently available')
        UNAVAILABLE = 'UNAVAILABLE', _('The interface is currently not available')

    class Subtype(models.TextChoices):
        Vector = 'Vector', _('Vector CAN interface')
        PCAN = 'PCAN', _('Peak CAN interface')
        SocketCAN = 'SocketCAN', _('Linux kernel SocketCAN interface')
        GS = 'GS', _('Geschwister Schneider USB/CAN (aka candleLight)')
        SLCAN = 'SLCAN', _('Serial Line CAN')

    class Category(models.TextChoices):
        CAN = 'CAN', _('CAN Interface')

    # TODO: use this model as the "base" for all available subtypes (each with their specific config options)
    name = models.CharField(max_length=100, unique=True)
    category = models.CharField(max_length=100, choices=Category.choices)
    subtype = models.CharField(max_length=100, choices=Subtype.choices)
    state = models.CharField(max_length=100, choices=State.choices, default=State.AVAILABLE)

    # FIXME: this needs a better representation
    #        for now the idea is that this is just a serialized json object with all the config options
    #        { 'baudrate': 115200, 'something': 'else', ... }
    #        the same is true for the "current device path", maybe change the name as it is not really
    #        a path (URL?)
    config = models.JSONField(max_length=4096, default=dict, validators=[validate_hw_interface_config])
    current_device_path = models.JSONField(max_length=1024, default=dict,
                                           validators=[validate_hw_interface_current_device_path])

    # Extended state information: sometimes available/unavailable is not useful, we can tell whether a SocketCAN
    #  interface is UP or DOWN, or if a SLCAN interface is likely a false positive; and we want to report these to the
    #  user in some way. We can't put it in config or current_device_path because those are used by the PythonCAN Bus
    #  constructor, so we put all these ancillary information here
    extended_state = models.JSONField(max_length=1024, default=dict)

    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['category', 'subtype', 'state', 'created_at', 'updated_at']

    def __str__(self):
        return '{}:{}:{}:{}'.format(self.category, self.subtype, self.name, self.id)


class UserMessage(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, blank=True, null=True)

    # TODO: think about more "dynamic options"
    class State(models.TextChoices):
        CREATED = 'CREATED', _('The message was created')
        PRESENTED = 'PRESENTED', _('The message was presented to the user')
        ACKNOWLEDGED = 'ACKNOWLEDGED', _('The message was acknowledged by the user')

    state = models.CharField(max_length=100, choices=State.choices, default=State.CREATED)
    title = models.CharField(max_length=100, default=_('Important Message'))
    message = models.CharField(max_length=1024)
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return '{}:{}'.format(self.state, self.id)


def random_unique_identifier():
    return random.randbytes(32).hex()


class BackendEvent(models.Model):
    groups = models.ManyToManyField(UserGroup, blank=True, related_name='backend_events')

    class Type(models.TextChoices):
        HWIF = 'HWIF', _('Hardware Interface')
        SCANNER = 'SCANNER', _('Scanner')
        GENERAL = 'GENERAL', _('General')

    class Level(models.TextChoices):
        FATAL_ERROR = 'FATAL_ERROR', _('Fatal Error')
        ERROR = 'ERROR', _('Error')
        WARNING = 'WARNING', _('Warning')
        INFO = 'INFO', _('Info')
        DEBUG = 'DEBUG', _('Debug')
        VERBOSE = 'VERBOSE', _('Verbose')

    unique_identifier = models.CharField(max_length=100, default=random_unique_identifier, unique=True)
    type = models.CharField(max_length=100, choices=Type.choices, default=Type.GENERAL)
    level = models.CharField(max_length=100, choices=Level.choices, default=Level.INFO)
    template = models.CharField(max_length=1024)
    extras = models.JSONField(max_length=1024, default=dict)
    timestamp = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return '{}:{}'.format(self.id, self.unique_identifier)


class LicenseManager(models.Manager):
    def get_valid_licenses(self):
        return [lic for lic in self.all() if lic.is_valid()]


class License(models.Model):
    groups = models.ManyToManyField(UserGroup, blank=True, related_name='licenses')
    license_text = models.CharField(max_length=1000)
    disabled = models.BooleanField(default=False)  # License can be disabled remotely
    objects = LicenseManager()

    @property
    def license_config(self):
        return decode_and_verify_license_blob(self.license_text)

    def is_valid(self):
        return not (check_license_expired(self.license_config)
                    or check_license_disabled(self)
                    or not check_license_hw_id_valid_for_current_machine(self))

    def save(self, *args, **kwargs):
        # self.pk == None means the object was just created.
        # (we only want to activate if license is inserted)
        if not self.pk:
            serial = self.license_config["Serial"]
            try:
                url = LICENSE_SERVER_URL + \
                      LICENSE_SERVER_API_ACTIVATE_LICENSE + f"/{serial}/"
                response = requests.post(url)
                if response.status_code == 200:
                    core_models_logger.info(f"Activated license {serial}")
                else:
                    core_models_logger.info(
                        f"License {serial} could not be activated:"
                        f" {response.status_code} {response.text}")
            except Exception:
                pass
        super(License, self).save(*args, **kwargs)

    def __str__(self):
        return '{}:{}'.format(self.id, self.license_text)


class SystemData(models.Model):

    @property
    def influxdb_env(self):
        return dict(settings.INFLUXDB.get('common', {}),
                    **settings.INFLUXDB.get('gui', {}))

    @property
    def hardware_id(self):
        return get_hardware_id()

    @property
    def backend_version(self):
        return settings.RELEASE_VERSION

    @property
    def app_environment(self):
        return settings.APP_ENVIRONMENT

    @property
    def license_request(self):
        return base64.b64encode(json.dumps({"HWID": self.hardware_id}).encode("utf-8")).decode()

    @property
    def product_personality_name(self):
        return settings.PRODUCT_PERSONALITY.name

    @property
    @cached(cache=TTLCache(maxsize=1, ttl=timedelta(minutes=30), timer=datetime.datetime.now))
    def remote_testcases_dict(self):
        try:
            meta_data_repo_url = settings.REMOTE_TESTCASES.get("META_DATA_REPO_URL")
            # Note: we kill the clone process after 3 seconds so the whole execution
            # doesn't get stuck here if there are any problems
            with tempfile.TemporaryDirectory() as temp_clone_folder:
                def clone_repo():
                    dulwich_porcelain.clone(meta_data_repo_url, temp_clone_folder,
                                            errstream=dulwich_porcelain.NoneStream())
                p = multiprocessing.Process(target=clone_repo)
                p.start()
                p.join(3)
                if p.is_alive():
                    p.kill()
                    p.join()
                    raise TimeoutError
                with open(Path(temp_clone_folder) / DEFAULT_TESTCASES_METADATA_FILE_NAME) as json_file:
                    return json.load(json_file)
        except:  # noqa: E722
            return {}

    def save(self, *args, **kwargs):
        if self.__class__.objects.count():
            self.pk = self.__class__.objects.first().pk
        super().save(*args, **kwargs)

    def __str__(self):
        return '{}:{}'.format(self.hardware_id, self.backend_version)


class UserData(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, blank=True, null=True)

    user_data = models.CharField(max_length=4 * 4096)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    def save(self, *args, **kwargs):
        if settings.PRODUCT_PERSONALITY.name == HYDRA_SCOPE_PERSONALITY_NAME:
            # only enforce this for HydraScope (no users)
            if self.__class__.objects.count():
                self.pk = self.__class__.objects.first().pk
        super().save(*args, **kwargs)


#
# User (exists for HydraScope and HydraVision but is only "used" for HydraVision)
#

class UserManager(BaseUserManager):
    @classmethod
    def create_and_attach_user_data_object_if_necessary(cls, user):
        if settings.PRODUCT_PERSONALITY.name == HYDRA_SCOPE_PERSONALITY_NAME:
            return
        if not UserData.objects.filter(user=user):
            # create an empty UserData object if we are running in HydraScope mode
            # (every user has his own settings)
            UserData.objects.create(user=user, user_data=base64.b64encode(json.dumps({}).encode("utf-8")).decode())

    def create_user(self, email, password=None, is_active=True, groups=None):
        if not email:
            raise ValueError('Users must have an email address')

        if not password:
            raise ValueError('Users must have a password')

        if not groups:
            groups = UserGroup.objects.filter(name=DEFAULT_USER_GROUP_NAME)

        # create user
        user = self.model(email=self.normalize_email(email), is_active=is_active)
        user.set_password(password)
        user.save()
        user.groups.set(groups)
        self.create_and_attach_user_data_object_if_necessary(user)

        return user

    def create_superuser(self, email, password):
        user = self.create_user(email, password=password)
        user.is_admin = True
        user.is_staff = True
        user.is_active = True
        user.save()
        return user


class User(AbstractBaseUser):
    email = models.EmailField(unique=True)
    is_active = models.BooleanField(default=True)
    is_admin = models.BooleanField(default=False)
    is_staff = models.BooleanField(default=False)
    creation_date = models.DateTimeField(default=timezone.now, blank=True)
    groups = models.ManyToManyField(UserGroup, blank=True, related_name="users")
    name = models.CharField(max_length=100, default='', blank=True)
    company = models.CharField(max_length=100, default='', blank=True)

    objects = UserManager()
    USERNAME_FIELD = 'email'

    def __str__(self):
        return self.email

    def get_full_name(self):
        return self.email

    def get_short_name(self):
        return self.email

    # NOTE: unfortunately not all used modules (simple jwt / rest) agree on the function / attribute name
    #       (has_perm vs. has_perms) ... keep both for now

    def _has_perms(self, perm, obj=None):
        return True

    has_perm = _has_perms
    has_perms = _has_perms

    def has_module_perms(self, app_label):
        return True
