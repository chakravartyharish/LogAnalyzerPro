from core.models import License

DEFAULT_MAX_UDS_SCAN_TIME = 300  # default value in seconds if no license is set
MAX_UDS_SCAN_TIME_NAME = "MaxUDSScanTime"
DEFAULT_MAX_ANALYZER_RESULTS = 10  # default number of analyzer results shown
MAX_ANALYZER_RESULTS_NAME = "MaxAnalyzerResults"
DEFAULT_MAX_REMOTE_RUNNERS = 0  # default number of allowed remote runners
MAX_REMOTE_RUNNERS_NAME = "MaxRemoteRunners"

LICENSE_FEATURE_UNLIMITED_COUNT_MARKER = -1


class LicenseManager:
    @classmethod
    def get_allowed_max_scan_run_duration(cls, scan_run_duration: int) -> int:
        highest_allowed_scan_time = DEFAULT_MAX_UDS_SCAN_TIME
        for license in License.objects.get_valid_licenses():
            max_uds_scan_time = license.license_config.get("Features", {}).get(MAX_UDS_SCAN_TIME_NAME,
                                                                               DEFAULT_MAX_UDS_SCAN_TIME)
            if max_uds_scan_time == LICENSE_FEATURE_UNLIMITED_COUNT_MARKER:
                return scan_run_duration

            highest_allowed_scan_time = max(max_uds_scan_time, highest_allowed_scan_time)
        if scan_run_duration > highest_allowed_scan_time:
            print(
                f'User set {MAX_UDS_SCAN_TIME_NAME} {scan_run_duration} is higher '
                f'than allowed {highest_allowed_scan_time}')

        return min(scan_run_duration, highest_allowed_scan_time)

    @classmethod
    def get_allowed_max_analyzer_results(cls) -> int:
        highest_allowed_analyzer_results = DEFAULT_MAX_ANALYZER_RESULTS
        for license in License.objects.get_valid_licenses():
            max_analyzer_results = license.license_config.get("Features", {}).get(MAX_ANALYZER_RESULTS_NAME,
                                                                                  DEFAULT_MAX_ANALYZER_RESULTS)
            if max_analyzer_results == LICENSE_FEATURE_UNLIMITED_COUNT_MARKER:
                return LICENSE_FEATURE_UNLIMITED_COUNT_MARKER

            highest_allowed_analyzer_results = max(max_analyzer_results, highest_allowed_analyzer_results)

        return highest_allowed_analyzer_results

    @classmethod
    def get_allowed_max_remote_runners(cls) -> int:
        highest_allowed_remote_runners = DEFAULT_MAX_REMOTE_RUNNERS
        for license in License.objects.get_valid_licenses():
            max_remote_runners = license.license_config.get("Features", {}).get(MAX_REMOTE_RUNNERS_NAME,
                                                                                DEFAULT_MAX_REMOTE_RUNNERS)
            if max_remote_runners == LICENSE_FEATURE_UNLIMITED_COUNT_MARKER:
                return LICENSE_FEATURE_UNLIMITED_COUNT_MARKER

            highest_allowed_remote_runners = max(max_remote_runners, highest_allowed_remote_runners)

        return highest_allowed_remote_runners
