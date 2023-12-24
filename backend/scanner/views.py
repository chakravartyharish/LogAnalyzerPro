import csv
import os
import pathlib
import tempfile

from django.http import Http404, HttpResponse
from rest_framework.decorators import action

from .helpers import get_overall_csv_report_data, get_testcase_csv_report_data, create_zip_buffer_of_csv_reports, \
    get_isotp_endpoint_csv_report_data
from .management.scanrunner.findings_helper import Findings
from .serializers import ISOTPEndpointSerializer, \
    ISOTPEndpointScanRunFindingSerializer, ISOTPEndpointScanRunSerializer, \
    ISOTPEndpointScannerConfigSerializer, UDSScanRunSerializer, UDSScannerConfigSerializer, \
    UDSScanRunFindingSerializer, UDSScanLogSerializer, ISOTPEndpointScanLogSerializer, \
    UDSScanRunPickleFileSerializer, UdsAnalyzerResultSerializer
from .models import UDSScanRun, UDSScanRunFinding, ISOTPEndpointScanRun
from backend.decorators import EnforceAtLeastOneValidLicenseBaseView, enforce_at_least_one_valid_license_decorator


class ISOTPEndpointScannerConfigView(EnforceAtLeastOneValidLicenseBaseView):
    http_method_names = ['get', 'put', 'post']
    serializer_class = ISOTPEndpointScannerConfigSerializer


class ISOTPEndpointScanRunView(EnforceAtLeastOneValidLicenseBaseView):
    http_method_names = ['get', 'put', 'post', 'delete']
    serializer_class = ISOTPEndpointScanRunSerializer

    @action(methods=['get'], detail=True)
    @enforce_at_least_one_valid_license_decorator
    def download_zipped_csv_report(self, request, pk=None):
        isotp_scan_run = ISOTPEndpointScanRun.objects.filter(pk=pk).first()
        if isotp_scan_run is None:
            raise Http404

        isotp_scan_run_findings = isotp_scan_run.scan_run_findings.all()

        if isotp_scan_run_findings is None:
            raise Http404

        isotp_scan_run_name = isotp_scan_run.config.name
        report_file_list = list()

        with tempfile.TemporaryDirectory() as temp_dir:
            csv_report_data = get_isotp_endpoint_csv_report_data(isotp_scan_run_findings)
            csv_report_name = f"{isotp_scan_run_name}_isotp_endpoint_scan_report.csv".lower().replace(" ", "")
            report_file_list.append(csv_report_name)

            with open(os.path.join(temp_dir, csv_report_name), 'w', newline='') as file:
                writer = csv.writer(file)
                writer.writerows(csv_report_data)

            buffer = create_zip_buffer_of_csv_reports(report_file_list, temp_dir)

            response = HttpResponse(buffer.getvalue())
            response['Content-Type'] = 'application/x-zip-compressed'
            response['Content-Disposition'] = f'attachment; filename=isotp_scan_run_{pk}_csv_reports.zip'
            return response


class ISOTPEndpointView(EnforceAtLeastOneValidLicenseBaseView):
    http_method_names = ['get', 'put', 'post', 'delete']
    serializer_class = ISOTPEndpointSerializer


class ISOTPEndpointScanRunFindingView(EnforceAtLeastOneValidLicenseBaseView):
    http_method_names = ['get', 'put', 'post']
    serializer_class = ISOTPEndpointScanRunFindingSerializer


class ISOTPEndpointScanRunLogView(EnforceAtLeastOneValidLicenseBaseView):
    http_method_names = ['get', 'put', 'post']
    serializer_class = ISOTPEndpointScanLogSerializer


class UDSScannerConfigView(EnforceAtLeastOneValidLicenseBaseView):
    http_method_names = ['get', 'put', 'post']
    serializer_class = UDSScannerConfigSerializer


class UDSScanRunView(EnforceAtLeastOneValidLicenseBaseView):
    http_method_names = ['get', 'put', 'post', 'delete']
    serializer_class = UDSScanRunSerializer


class UDSScanRunFindingView(EnforceAtLeastOneValidLicenseBaseView):
    http_method_names = ['get', 'put', 'post']
    serializer_class = UDSScanRunFindingSerializer

    @action(methods=['get'], detail=True)
    @enforce_at_least_one_valid_license_decorator
    def download_zipped_csv_report(self, request, pk=None):
        uds_scan_run_finding = UDSScanRunFinding.objects.filter(id=pk).first()

        if uds_scan_run_finding is None:
            raise Http404

        uds_scan_run = UDSScanRun.objects.filter(scan_run_findings=uds_scan_run_finding).first()

        if uds_scan_run is None:
            raise Http404

        findings = Findings(uds_scan_run)
        uds_scan_run_name = uds_scan_run.config.name
        report_file_list = list()

        with tempfile.TemporaryDirectory() as temp_dir:
            overall_csv_report_data = get_overall_csv_report_data(findings)
            overall_csv_report_data_name = f"{uds_scan_run_name}_overall_report.csv".replace("/", "_")
            report_file_list.append(overall_csv_report_data_name)

            with open(os.path.join(temp_dir, overall_csv_report_data_name), 'w', newline='') as file:
                writer = csv.writer(file)
                writer.writerows(overall_csv_report_data)

            for testcase in findings.get_testcases_as_objects():
                testcase_csv_report_data = get_testcase_csv_report_data(testcase)
                testcase_csv_report_data_name = f"{uds_scan_run_name}_{testcase.name}_report.csv".replace("/", "_")
                report_file_list.append(testcase_csv_report_data_name)

                with open(str(pathlib.Path(temp_dir) / testcase_csv_report_data_name), 'w', newline='') as file:
                    writer = csv.writer(file)
                    writer.writerows(testcase_csv_report_data)

            buffer = create_zip_buffer_of_csv_reports(report_file_list, temp_dir)

            response = HttpResponse(buffer.getvalue())
            response['Content-Type'] = 'application/x-zip-compressed'
            response['Content-Disposition'] = f'attachment; filename=uds_report_{pk}_csv_reports.zip'
            return response


class UDSScanRunLogView(EnforceAtLeastOneValidLicenseBaseView):
    http_method_names = ['get', 'put', 'post']
    serializer_class = UDSScanLogSerializer


class UDSScanRunPickelFileView(EnforceAtLeastOneValidLicenseBaseView):
    http_method_names = ['get', 'put', 'post']
    serializer_class = UDSScanRunPickleFileSerializer


class UdsAnalyzerResultView(EnforceAtLeastOneValidLicenseBaseView):
    http_method_names = ['get', 'put', 'post']
    serializer_class = UdsAnalyzerResultSerializer
