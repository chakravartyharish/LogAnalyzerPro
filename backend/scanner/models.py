import os
import django.core.validators
from django.db import models
from django.dispatch import receiver
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from core.models import HWInterface
from scanner.validators import validate_scan_range, validate_extended_scan_range, validate_uds_scan_arguments
from backend.decorators import record_unexpected_exception_in_model_signal_handler_as_frontend_notification_decorator

from backend import settings


class ScannerConfig(models.Model):
    name = models.CharField(max_length=100)
    remote_scan_selected_channel = models.CharField(max_length=50, blank=True, null=True)

    class Meta:
        ordering = ['name', ]
        abstract = True

    def __str__(self):
        return '{}:{}'.format(self.id, self.name)


class ISOTPEndpointScannerConfig(ScannerConfig):
    scan_range = models.CharField(max_length=100, default=_('0-0x7ff'), validators=[validate_scan_range])
    extended_addressing = models.BooleanField(default=False)
    extended_scan_range = models.CharField(max_length=100, default=_('0x00-0xff'),
                                           validators=[validate_extended_scan_range])
    noise_listen_time = models.IntegerField(default=2,
                                            validators=[django.core.validators.MinValueValidator(0)])
    sniff_time = models.FloatField(default=0.1,
                                   validators=[django.core.validators.MinValueValidator(0.05)])
    extended_can_id = models.BooleanField(default=False)
    verify_results = models.BooleanField(default=True)


class UDSScannerConfig(ScannerConfig):
    uds_scan_arguments = models.JSONField(
        default=dict, max_length=4 * 4096, validators=[validate_uds_scan_arguments])


class ISOTPEndpoint(models.Model):

    # this is just a hint, pointing to the CAN interface that was used to create this endpoint
    # (no foreign key because the CAN insterfaces are not really persistent)
    hw_interface = models.CharField(max_length=100, default=_('Unknown'))
    name = models.CharField(max_length=100, default=_('Endpoint'))
    rx_id = models.IntegerField(default=0, validators=[django.core.validators.MinValueValidator(0),
                                                       django.core.validators.MaxValueValidator(0x1fffffff)])
    tx_id = models.IntegerField(default=0, validators=[django.core.validators.MinValueValidator(0),
                                                       django.core.validators.MaxValueValidator(0x1fffffff)])
    ext_address = models.IntegerField(default=None, blank=True, null=True,
                                      validators=[django.core.validators.MinValueValidator(0),
                                                  django.core.validators.MaxValueValidator(0xff)])
    rx_ext_address = models.IntegerField(default=None, blank=True, null=True,
                                         validators=[django.core.validators.MinValueValidator(0),
                                                     django.core.validators.MaxValueValidator(0xff)])
    padding = models.BooleanField(default=False)

    def __str__(self):
        return f'{self.id}:{self.name}:{self.hw_interface}:{self.rx_id}:{self.tx_id}'


class ScanRun(models.Model):

    class State(models.TextChoices):
        CREATED = 'CREATED', _('Scan was created and should run as soon as possible')
        RUNNING = 'RUNNING', _('Scan is running')
        PAUSED = 'PAUSED', _('Scan is paused')
        FINISHED_SUCCESS = 'FINISHED_SUCCESS', _('Scan successfully finished')
        FINISHED_ERROR = 'FINISHED_ERROR', _('Scan finished with an error')

    class DesiredState(models.TextChoices):
        PAUSED = 'PAUSED', _('Scan is paused')
        RUNNING = 'RUNNING', _('Scan is running')
        FINISHED = 'FINISHED', _('Scan finished w/o an error')

    # a scan run can be executed on the 'local machine' using a 'hardware interface' or it can run remotely
    # (its either or)

    # local execution
    hw_interface = models.ForeignKey(HWInterface, blank=True, null=True, on_delete=models.CASCADE)

    state = models.CharField(max_length=100, choices=State.choices, default=State.CREATED)
    desired_state = models.CharField(max_length=100, choices=DesiredState.choices,
                                     default=DesiredState.RUNNING)
    error_description = models.CharField(max_length=2048, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    finished_at = models.DateTimeField(blank=True, null=True)

    # NOTE: having this flag is not pretty but the simplest solution to distinguish between
    #       the two states - "scanner finished the job" / "scanner was interrupted"
    #       (the proper solution would be to add a new state "FINISHED_SUCCESS_INTERRUPTED",
    #        however that would imply to update the scan_runner state handling without introducing any new issues)
    scan_was_aborted = models.BooleanField(default=False)

    @property
    def is_local_scan(self):
        return True

    @property
    def execution_location(self):
        return 'LOCAL'

    def __str__(self):
        return f'{self.id}:{self.state}'

    class Meta:
        abstract = True


class ISOTPEndpointScanRun(ScanRun):
    config = models.ForeignKey(ISOTPEndpointScannerConfig, on_delete=models.CASCADE)


class UDSScanRun(ScanRun):
    config = models.ForeignKey(UDSScannerConfig, on_delete=models.CASCADE)
    isotp_endpoint = models.ForeignKey(ISOTPEndpoint, on_delete=models.CASCADE)
    smart_scan = models.BooleanField(default=False)
    security_access_key_generation_server_url = models.URLField(max_length=512, null=True, blank=True)


class ISOTPEndpointScanRunFinding(models.Model):

    scan_run = models.ForeignKey(ISOTPEndpointScanRun, related_name='scan_run_findings', on_delete=models.CASCADE)
    created_at = models.DateTimeField(default=timezone.now)
    rx_id = models.IntegerField(default=0)
    tx_id = models.IntegerField(default=0)
    ext_address = models.IntegerField(default=None, blank=True, null=True)
    rx_ext_address = models.IntegerField(default=None, blank=True, null=True)
    padding = models.BooleanField()
    basecls = models.CharField(max_length=10, default="ISOTP")

    def __str__(self):
        return f'{self.id}:{self.scan_run}:{self.rx_id}:{self.tx_id}'


class UDSScanRunFinding(models.Model):
    scan_run = models.ForeignKey(UDSScanRun, related_name='scan_run_findings', on_delete=models.CASCADE)
    created_at = models.DateTimeField(default=timezone.now)
    results_file = models.FileField(upload_to=str(settings.SCAN_RESULTS_FOLDER_PATH))

    def __str__(self):
        return f'{self.id}:{self.scan_run}'


class ScanLog(models.Model):
    class LogType(models.TextChoices):
        SCANNER = 'SCANNER', _('Output of Scanner-Software')
        UDS = 'UDS', _('Message log of all UDS messages during scan_run')
        CAN = 'CAN', _('Message log of all CAN messages during scan_run')

    created_at = models.DateTimeField(default=timezone.now)
    log_type = models.CharField(max_length=100, choices=LogType.choices, default=LogType.SCANNER)
    log_file = models.FileField(upload_to=str(settings.LOG_FILES_FOLDER_PATH))

    def __str__(self):
        return f'{self.id}:{self.log_type}:{self.log_file}'

    class Meta:
        abstract = True


class UDSScanRunLog(ScanLog):
    scan_run_finding = models.ForeignKey(UDSScanRunFinding, related_name='log_files',
                                         on_delete=models.CASCADE)


class ISOTPEndpointScanRunLog(ScanLog):
    scan_run = models.ForeignKey(ISOTPEndpointScanRun, related_name='log_files',
                                 on_delete=models.CASCADE)


class UDSScanRunPickleFile(models.Model):
    scan_run = models.ForeignKey(UDSScanRun, related_name='scan_run_pickles', on_delete=models.CASCADE)
    created_at = models.DateTimeField(default=timezone.now)
    pickle_file = models.FileField(upload_to=str(settings.PICKLE_FILES_FOLDER_PATH))

    def __str__(self):
        return f'{self.id}:{self.scan_run}'


class UDSAnalyzerResult(models.Model):
    class ResultTypes(models.TextChoices):
        INFORMAL = 'INFORMAL', _('Informal result')
        WARNING = 'WARNING', _('Warning')
        VULNERABILITY = 'VULNERABILITY', _('Vulnerability')

    created_at = models.DateTimeField(default=timezone.now)
    name = models.CharField(max_length=500)
    info = models.CharField(max_length=5000)
    result_type = models.CharField(max_length=100, choices=ResultTypes.choices, default=ResultTypes.INFORMAL)
    scan_run_finding = models.ForeignKey(UDSScanRunFinding, related_name='analyzer_results',
                                         on_delete=models.CASCADE)

    def __str__(self):
        return f'{self.id}:{self.name}:{self.result_type}'


#
# signal handlers
#

@receiver(models.signals.post_delete, sender=UDSScanRunFinding)
@record_unexpected_exception_in_model_signal_handler_as_frontend_notification_decorator
def auto_delete_results_file_on_delete(sender, instance, **kwargs):
    """
    Deletes file from filesystem
    when corresponding `UDSScanRunFinding` object is deleted.
    """
    if instance.results_file:
        if os.path.isfile(instance.results_file.path):
            os.remove(instance.results_file.path)


@receiver(models.signals.post_delete, sender=UDSScanRunLog)
@record_unexpected_exception_in_model_signal_handler_as_frontend_notification_decorator
def auto_delete_uds_scan_run_log_file_on_delete(sender, instance, **kwargs):
    """
    Deletes file from filesystem
    when corresponding `ScanLog` object is deleted.
    """
    if instance.log_file:
        if os.path.isfile(instance.log_file.path):
            os.remove(instance.log_file.path)


@receiver(models.signals.post_delete, sender=ISOTPEndpointScanRunLog)
@record_unexpected_exception_in_model_signal_handler_as_frontend_notification_decorator
def auto_delete_isotp_scan_run_log_file_on_delete(sender, instance, **kwargs):
    """
    Deletes file from filesystem
    when corresponding `ScanLog` object is deleted.
    """
    if instance.log_file:
        if os.path.isfile(instance.log_file.path):
            os.remove(instance.log_file.path)


@receiver(models.signals.post_delete, sender=UDSScanRunPickleFile)
@record_unexpected_exception_in_model_signal_handler_as_frontend_notification_decorator
def auto_delete_uds_scan_run_pickle_file_on_delete(sender, instance, **kwargs):
    """
    Deletes file from filesystem
    when corresponding `UDSScanRunPickleFile` object is deleted.
    """
    if instance.pickle_file:
        if os.path.isfile(instance.pickle_file.path):
            os.remove(instance.pickle_file.path)
