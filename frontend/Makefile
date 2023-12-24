.PHONY: setup_buildenv build start_devserver dump_licenses collect_licenses_file extract_translatable_strings set_hydrascope_personality set_hydravision_personality clean

all: help 

help::
	@echo clean - cleanup
clean:
	@echo cleaning up
	@rm -rf build
	@rm -rf node_modules

help::
	@echo start_devserver - start a development server
start_devserver: setup_buildenv
	@yarn start

help::
	@echo setup_buildenv - setup a build environment
setup_buildenv:
	@yarn install

help::
	@echo extract_translatable_strings - extract all translatable string from the sources
extract_translatable_strings:
	@yarn extract_translations

help::
	@echo set_hydrascope_personality - set personality to HydraScope
set_hydrascope_personality:
	@echo REACT_APP_PERSONALITY_NAME=HydraScope > .env.local

help::
	@echo set_hydravision_personality - set personality to HydraVision
set_hydravision_personality:
	@echo REACT_APP_PERSONALITY_NAME=HydraVision > .env.local
