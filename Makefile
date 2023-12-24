.PHONY: freeze_backend freeze_backend_w_tox freeze_scanner freeze_scanner_w_tox build_frontend setup_frontend_buildenv build_redis compile_licenses_file clean help build_electron_app build_electron_app_w_tox set_hydrascope_personality set_hydravision_personality

all: help

help::
	@echo clean - cleanup
clean:
	@$(MAKE) -C frontend clean 
	@$(MAKE) -C backend clean 

help::
	@echo setup_frontend_buildenv - setup a build environment for the frontend
setup_frontend_buildenv:
	@$(MAKE) -C frontend setup_buildenv

help::
	@echo set_hydrascope_personality - set personality to HydraScope
set_hydrascope_personality:
	@$(MAKE) -C frontend set_hydrascope_personality
	@$(MAKE) -C backend set_hydrascope_personality
