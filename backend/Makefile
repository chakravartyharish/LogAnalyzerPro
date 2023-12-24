.PHONY: download_hydracore_documentation collect_reactjs_bundle freeze freeze_w_tox dump_licenses set_hydrascope_personality set_hydravision_personality create_default_django_superuser clean help

all: help

help::
	@echo clean - cleanup
clean:
	@rm -rf binary
	@rm -rf static

help::
	@echo create_default_django_superuser - create default admin user \(admin@admin.admin / admin\)
create_default_django_superuser:
	@DJANGO_SUPERUSER_PASSWORD=admin DJANGO_SUPERUSER_EMAIL=admin@admin.admin python manage.py createsuperuser --noinput

ifeq ($(OS),Windows_NT)
help::
	@echo set_hydrascope_personality - set personality to HydraScope
set_hydrascope_personality:
	@echo from .personality import HydraScopePersonality;used_personality=HydraScopePersonality() # noqa > backend/used_personality.py

help::
	@echo set_hydravision_personality - set personality to HydraVision
set_hydravision_personality:
	@echo from .personality import HydraVisionPersonality;used_personality=HydraVisionPersonality() # noqa > backend/used_personality.py
else
help::
	@echo set_hydrascope_personality - set personality to HydraScope
set_hydrascope_personality:
	@echo "from .personality import HydraScopePersonality;used_personality=HydraScopePersonality() # noqa" > backend/used_personality.py

help::
	@echo set_hydravision_personality - set personality to HydraVision
set_hydravision_personality:
	@echo "from .personality import HydraVisionPersonality;used_personality=HydraVisionPersonality() # noqa" > backend/used_personality.py
endif
