from django.contrib import admin

from .models import ISOTPEndpointScanRunFinding, ISOTPEndpoint, ISOTPEndpointScannerConfig, \
    ISOTPEndpointScanRun, UDSScannerConfig, UDSScanRun, UDSScanRunFinding, UDSScanRunLog, \
    ISOTPEndpointScanRunLog, UDSScanRunPickleFile, UDSAnalyzerResult


class ISOTPEndpointScannerConfigAdmin(admin.ModelAdmin):
    pass


class ISOTPEndpointScanRunAdmin(admin.ModelAdmin):
    pass


class ISOTPEndpointScanRunFindingAdmin(admin.ModelAdmin):
    pass


class ISOTPEndpointAdmin(admin.ModelAdmin):
    pass


class ISOTPEndpointScanRunLogAdmin(admin.ModelAdmin):
    pass


class UDSScannerConfigAdmin(admin.ModelAdmin):
    pass


class UDSScanRunAdmin(admin.ModelAdmin):
    pass


class UDSScanRunFindingAdmin(admin.ModelAdmin):
    pass


class UDSScanRunLogAdmin(admin.ModelAdmin):
    pass


class UDSScanRunPickleFileAdmin(admin.ModelAdmin):
    pass


class UdsAnalyzerResultAdmin(admin.ModelAdmin):
    pass


admin.site.register(ISOTPEndpointScannerConfig, ISOTPEndpointScannerConfigAdmin)
admin.site.register(ISOTPEndpointScanRun, ISOTPEndpointScanRunAdmin)
admin.site.register(ISOTPEndpointScanRunFinding, ISOTPEndpointScanRunFindingAdmin)
admin.site.register(ISOTPEndpoint, ISOTPEndpointAdmin)
admin.site.register(ISOTPEndpointScanRunLog, ISOTPEndpointScanRunLogAdmin)

admin.site.register(UDSScannerConfig, UDSScannerConfigAdmin)
admin.site.register(UDSScanRun, UDSScanRunAdmin)
admin.site.register(UDSScanRunFinding, UDSScanRunFindingAdmin)
admin.site.register(UDSScanRunLog, UDSScanRunLogAdmin)
admin.site.register(UDSScanRunPickleFile, UDSScanRunPickleFileAdmin)
admin.site.register(UDSAnalyzerResult, UdsAnalyzerResultAdmin)
