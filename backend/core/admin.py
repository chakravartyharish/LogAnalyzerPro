from typing import Any
from django.contrib import admin
from django.contrib.auth.models import Group
# from django.contrib.auth.models import User
from .models import HWInterface, SystemData, UserMessage, BackendEvent, License, UserData, UserGroup
from .models import User as _User, UserManager


# unregister the builtin user / group models

# admin.site.unregister(User)
admin.site.unregister(Group)


class UserAdmin(admin.ModelAdmin):
    def save_model(self, request: Any, obj: _User, form: Any, change: Any) -> None:
        super().save_model(request, obj, form, change)
        UserManager.create_and_attach_user_data_object_if_necessary(obj)


class HWInterfaceAdmin(admin.ModelAdmin):
    pass


class UserMessageAdmin(admin.ModelAdmin):
    pass


class BackendEventAdmin(admin.ModelAdmin):
    pass


class LicenseAdmin(admin.ModelAdmin):
    pass


class SystemDataAdmin(admin.ModelAdmin):
    readonly_fields = ('hardware_id', 'backend_version')


class UserDataAdmin(admin.ModelAdmin):
    pass


class UserGroupAdmin(admin.ModelAdmin):
    pass


admin.site.register(_User, UserAdmin)
admin.site.register(HWInterface, HWInterfaceAdmin)
admin.site.register(UserMessage, UserMessageAdmin)
admin.site.register(BackendEvent, BackendEventAdmin)
admin.site.register(License, LicenseAdmin)
admin.site.register(SystemData, SystemDataAdmin)
admin.site.register(UserData, UserDataAdmin)
admin.site.register(UserGroup, UserGroupAdmin)
