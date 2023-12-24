"""backend URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import RedirectView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView, TokenBlacklistView
from rest_framework import routers
from core import views as core_views
from backend.constants import HYDRA_VISION_PERSONALITY_NAME, HYDRA_SCOPE_PERSONALITY_NAME
from scanner import views as scanner_views
from django.urls import path


from django.urls import path
from core.views import search_logs



router = routers.DefaultRouter()
if settings.PRODUCT_PERSONALITY.name == HYDRA_SCOPE_PERSONALITY_NAME:
    router.register(r'hw_interfaces', core_views.HWInterfaceView, 'hw_interface')
    router.register(r'user_messages', core_views.UserMessageView, 'user_message')
    router.register(r'backend_events', core_views.BackendEventView, 'backend_event')
    router.register(r'licenses', core_views.LicenseView, 'licenses')
    router.register(r'isotp_endpoint_scanner_configs', scanner_views.ISOTPEndpointScannerConfigView,
                    'isotp_endpoint_scanner_config')
    router.register(r'isotp_endpoint_scan_runs', scanner_views.ISOTPEndpointScanRunView,
                    'isotp_endpoint_scan_run')
    router.register(r'isotp_endpoint_scan_run_findings', scanner_views.ISOTPEndpointScanRunFindingView,
                    'isotp_endpoint_scan_run_finding')
    router.register(r'isotp_endpoints', scanner_views.ISOTPEndpointView, 'isotp_endpoint')
    router.register(r'uds_scanner_configs', scanner_views.UDSScannerConfigView, 'uds_scanner_config')
    router.register(r'uds_scan_runs', scanner_views.UDSScanRunView, 'uds_scan_run')
    router.register(r'uds_scan_run_findings', scanner_views.UDSScanRunFindingView, 'uds_scan_run_finding')
    router.register(r'uds_scan_run_logs', scanner_views.UDSScanRunLogView, 'uds_scan_run_log')
    router.register(r'uds_scan_run_analyzers', scanner_views.UdsAnalyzerResultView, 'uds_scan_run_analyzer')
elif settings.PRODUCT_PERSONALITY.name == HYDRA_VISION_PERSONALITY_NAME:
    router.register(r'user_messages', core_views.UserMessageView, 'user_message')
    router.register(r'backend_events', core_views.BackendEventView, 'backend_event')
    router.register(r'licenses', core_views.LicenseView, 'licenses')
    router.register(r'users', core_views.UserView, 'users')
    router.register(r'groups', core_views.UserGroupView, 'groups')

urlpatterns = [path('api/', include(router.urls)),  path('api-auth/', include('rest_framework.urls')), path('api/search/search_logs/', core_views.search_logs, name='search_logs'),]

if settings.PRODUCT_PERSONALITY.name == HYDRA_VISION_PERSONALITY_NAME:
    # simple jwt token login / refresh / ...
    urlpatterns.append(path('api/token/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'))
    urlpatterns.append(path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'))
    urlpatterns.append(path('api/token/blacklist/', TokenBlacklistView.as_view(), name='token_blacklist'))
    # urlpatterns.append(path('api/token/verify/', TokenVerifyView.as_view(), name='token_verify'))

urlpatterns += static('results/', document_root=settings.SCAN_RESULTS_FOLDER) + \
               static('logfiles/', document_root=settings.LOG_FILES_FOLDER) + \
               static('hydracore_docs/', document_root=settings.HYDRACORE_DOCS_FOLDER) + \
               static('uds_pickles/', document_root=settings.PICKLE_FILES_FOLDER) + \
               static('job_archives/', document_root=settings.JOB_ARCHIVES_FOLDER) + \
               static('job_artifacts/', document_root=settings.JOB_ARTIFACTS_FOLDER)

if settings.RUNNING_IN_BUNDLE:
    # running in pyinstaller bundle
    urlpatterns.append(path('', RedirectView.as_view(url='/index.html', permanent=False)))
    urlpatterns.extend(static(settings.STATIC_URL, document_root=settings.STATIC_ROOT))
else:
    urlpatterns.append(path('admin/', admin.site.urls))
