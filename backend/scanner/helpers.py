import io
import os
import zipfile
from typing import List

from scanner.management.scanrunner.findings_helper import Findings
from scanner.models import ISOTPEndpointScanRunFinding


def get_isotp_endpoint_csv_report_data(isotp_scan_run_findings: List[ISOTPEndpointScanRunFinding]):
    finding_key_mapping = {
        "Rx Id": "rx_id",
        "Tx Id": "tx_id",
        "Extended Address": "ext_address",
        "Rx Extended Address": "rx_ext_address",
        "Padding": "padding",
        "Base class": "basecls"
    }

    report_rows = list()
    header = list(finding_key_mapping.keys())
    report_rows.append(header)

    for finding in isotp_scan_run_findings:
        finding_row = list()

        for key, mapped_key in finding_key_mapping.items():
            finding_row.append(getattr(finding, mapped_key))

        report_rows.append(finding_row)

    return report_rows


def get_overall_csv_report_data(uds_scan_run_finding: Findings):
    testcase_info_mapping = {
        "Name": lambda a: getattr(a, "name"),
        "States completed": lambda a: " ".join(
            [repr(state) for state, completion_status in getattr(a, "states_completed").items() if completion_status]),
        "States not completed": lambda a: " ".join(
            [repr(state) for state, completion_status in getattr(a, "states_completed").items() if
             not completion_status]),
        "Scanned states": lambda a: " ".join([repr(state) for state in getattr(a, "scanned_states")])
    }

    testcase_statistics_mapping = {
        "Number answered": "num_answered",
        "Number unanswered": "num_unanswered",
        "Number negative Response": "num_negative_resps",
        "Answer time min": "answertime_min",
        "Answer time max": "answertime_max",
        "Answer time avg": "answertime_avg",
        "Answer time min negative resp": "answertime_min_nr",
        "Answer time max negative resp": "answertime_max_nr",
        "Answer time avg negative resp": "answertime_avg_nr",
        "Answer time min positive resp": "answertime_min_pr",
        "Answer time max positive resp": "answertime_max_pr",
        "Answer time avg positive resp": "answertime_avg_pr"
    }

    overall_report_rows = list()
    header = list(testcase_info_mapping.keys()) + list(testcase_statistics_mapping.keys())
    overall_report_rows.append(header)
    statistics_overall_key = "statistics"
    statistics_sub_key = "all"

    for testcase in uds_scan_run_finding.get_testcases_as_objects():
        overall_report_row = list()

        for key, mapped_key in testcase_info_mapping.items():
            overall_report_row.append(mapped_key(testcase))

        try:
            all_statistics = getattr(testcase, statistics_overall_key).get(statistics_sub_key)
        except:  # noqa: E722
            all_statistics = {}

        for mapped_key in testcase_statistics_mapping.values():
            overall_report_row.append(all_statistics.get(mapped_key))

        overall_report_rows.append(overall_report_row)

    return overall_report_rows


def get_testcase_csv_report_data(testcase):
    testcase_result_attr_mapping = {
        "Request": "req",
        "Request timestamp": "req_ts",
        "Response": "resp",
        "Response timestamp": "resp_ts",
        "State": "state",
    }

    testcase_report_rows = list()
    header = list(testcase_result_attr_mapping.keys())

    testcase_report_rows.append(header)

    for result in testcase.results:
        testcase_report_row = list()

        for mapped_key in testcase_result_attr_mapping.values():
            testcase_report_row.append(getattr(result, mapped_key))

        testcase_report_rows.append(testcase_report_row)

    return testcase_report_rows


def create_zip_buffer_of_csv_reports(csv_report_files, temp_dir):
    buffer = io.BytesIO()

    with zipfile.ZipFile(buffer, mode="w") as zf:
        compression = zipfile.ZIP_DEFLATED
        for report_file in csv_report_files:
            file_path = os.path.join(temp_dir, report_file)
            if os.path.exists(file_path):
                zf.write(file_path, report_file, compress_type=compression)

    return buffer
