import os   # noqa (pytest has an issue here where it tries to find this import for this module and excepts if it does not exist, although it is not needed)
from rest_framework import serializers
from core.models import HWInterface
from .models import ISOTPEndpointScannerConfig, ISOTPEndpointScanRun, ISOTPEndpointScanRunFinding, \
    ISOTPEndpoint, UDSScannerConfig, UDSScanRunFinding, UDSScanRun, ISOTPEndpointScanRunLog, \
    UDSScanRunLog, UDSScanRunPickleFile, UDSAnalyzerResult
from backend.license_manager import LicenseManager, LICENSE_FEATURE_UNLIMITED_COUNT_MARKER
from backend.decorators import enforce_at_least_one_valid_license_decorator


class EnforceAtLeastOneValidLicenseSerializer(serializers.ModelSerializer):

    @enforce_at_least_one_valid_license_decorator
    def create(self, *args):
        return super(EnforceAtLeastOneValidLicenseSerializer, self).create(*args)

    @enforce_at_least_one_valid_license_decorator
    def update(self, *args):
        return super(EnforceAtLeastOneValidLicenseSerializer, self).update(*args)


class ISOTPEndpointScannerConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = ISOTPEndpointScannerConfig
        fields = ('id', 'name', 'scan_range', 'extended_addressing', 'extended_scan_range',
                  'noise_listen_time', 'sniff_time', 'extended_can_id', 'verify_results',
                  'remote_scan_selected_channel')
        read_only_fields = ('id',)


class UDSScannerConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = UDSScannerConfig
        fields = ('id', 'name', 'uds_scan_arguments', 'remote_scan_selected_channel')
        read_only_fields = ('id',)


class ISOTPEndpointSerializer(EnforceAtLeastOneValidLicenseSerializer):
    class Meta:
        model = ISOTPEndpoint
        fields = ('id', 'hw_interface', 'name', 'rx_id', 'tx_id', 'ext_address', 'rx_ext_address',
                  'padding')
        read_only_fields = ('id',)


class ISOTPEndpointScanLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ISOTPEndpointScanRunLog
        fields = ('id', 'created_at', 'log_type', 'log_file')
        read_only_fields = ('id', 'created_at', 'log_type', 'log_file')


class UDSScanLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = UDSScanRunLog
        fields = ('id', 'created_at', 'log_type', 'log_file', 'scan_run_finding')
        # read_only_fields = ('id', 'created_at', 'log_type', 'log_file')
        read_only_fields = ('id', 'created_at')


class UDSScanRunPickleFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UDSScanRunPickleFile
        fields = ('id', 'created_at', 'pickle_file')
        # read_only_fields = ('id', 'created_at', 'pickle_file')
        read_only_fields = ('id', 'created_at')


class ISOTPEndpointScanRunFindingSerializer(serializers.ModelSerializer):
    class Meta:
        model = ISOTPEndpointScanRunFinding
        fields = ('id', 'scan_run', 'created_at', 'rx_id', 'tx_id', 'ext_address', 'rx_ext_address',
                  'padding', 'basecls')
        read_only_fields = ('id', 'scan_run', 'created_at', 'rx_id', 'tx_id', 'ext_address',
                            'rx_ext_address', 'padding', 'basecls')


class UdsAnalyzerResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = UDSAnalyzerResult
        fields = ('id', 'scan_run_finding', 'created_at', 'name', 'info', 'result_type')
        # read_only_fields = ('id', 'scan_run_finding', 'created_at', 'name', 'info', 'result_type')
        read_only_fields = ('id', 'created_at')


class UDSScanRunFindingSerializer(serializers.ModelSerializer):
    log_files = UDSScanLogSerializer(many=True, read_only=True)
    analyzer_results = UdsAnalyzerResultSerializer(many=True, read_only=True)

    class Meta:
        model = UDSScanRunFinding
        fields = ('id', 'scan_run', 'created_at', 'results_file', 'log_files', 'analyzer_results')
        # read_only_fields = ('id', 'scan_run', 'created_at', 'results_file', 'log_files', 'analyzer_results')
        read_only_fields = ('id', 'created_at')

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        max_analyzer_results = LicenseManager.get_allowed_max_analyzer_results()

        if max_analyzer_results == LICENSE_FEATURE_UNLIMITED_COUNT_MARKER:
            return ret

        ret["analyzer_results"] = ret["analyzer_results"][:max_analyzer_results]

        return ret


class ISOTPEndpointScanRunSerializer(serializers.ModelSerializer):
    scan_run_findings = ISOTPEndpointScanRunFindingSerializer(many=True, read_only=True)
    log_files = ISOTPEndpointScanLogSerializer(many=True, read_only=True)
    config = ISOTPEndpointScannerConfigSerializer()
    hw_interface = serializers.SlugRelatedField(queryset=HWInterface.objects.all(), slug_field='name', required=False)

    class Meta:
        model = ISOTPEndpointScanRun
        fields = ('id', 'hw_interface', 'scan_run_findings', 'log_files', 'state',
                  'error_description', 'created_at', 'finished_at', 'config', 'desired_state', 'scan_was_aborted')
        read_only_fields = ('id', 'scan_run_findings', 'log_files', 'error_description', 'created_at', 'scan_was_aborted')

    @enforce_at_least_one_valid_license_decorator
    def update(self, instance, validated_data):
        ISOTPEndpointScannerConfigSerializer().update(instance.config, validated_data.pop('config'))
        return super(ISOTPEndpointScanRunSerializer, self).update(instance, validated_data)

    @enforce_at_least_one_valid_license_decorator
    def create(self, validated_data):
        validated_data['config'] = ISOTPEndpointScannerConfigSerializer().create(validated_data.pop('config'))
        return super(ISOTPEndpointScanRunSerializer, self).create(validated_data)


class UDSScanRunSerializer(serializers.ModelSerializer):
    scan_run_findings = UDSScanRunFindingSerializer(many=True, read_only=True)
    config = UDSScannerConfigSerializer()
    hw_interface = serializers.SlugRelatedField(queryset=HWInterface.objects.all(), slug_field='name', required=False, allow_null=True)

    class Meta:
        model = UDSScanRun
        fields = ('id', 'hw_interface', 'scan_run_findings', 'state',
                  'error_description', 'created_at', 'finished_at', 'config', 'isotp_endpoint', 'desired_state',
                  'smart_scan', 'security_access_key_generation_server_url', 'scan_was_aborted')
        read_only_fields = ('id', 'scan_run_findings', 'error_description', 'created_at', 'scan_was_aborted')

    @enforce_at_least_one_valid_license_decorator
    def update(self, instance, validated_data):
        config = get_validated_uds_scan_run_config(validated_data.pop('config'))
        UDSScannerConfigSerializer().update(instance.config, config)
        return super(UDSScanRunSerializer, self).update(instance, validated_data)

    @enforce_at_least_one_valid_license_decorator
    def create(self, validated_data):
        config = get_validated_uds_scan_run_config(validated_data.pop('config'))
        validated_data['config'] = UDSScannerConfigSerializer().create(config)
        return super(UDSScanRunSerializer, self).create(validated_data)


def get_validated_uds_scan_run_config(config):
    max_allowed_scan_duration = LicenseManager.get_allowed_max_scan_run_duration(config["uds_scan_arguments"]["scan_timeout"])
    config["uds_scan_arguments"]["scan_timeout"] = max_allowed_scan_duration
    return config
