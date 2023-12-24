#-----------------------------------------------------------------------------
# Copyright (c) 2005-2022, PyInstaller Development Team.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
#
# The full license is in the file COPYING.txt, distributed with this software.
#
# SPDX-License-Identifier: Apache-2.0
#-----------------------------------------------------------------------------

# This Django rthook was tested with Django 1.8.3.

import django.core.management
import django.utils.autoreload


def _get_commands():
    # Django groupss commands by app. This returns static dict() as it is for django 1.8 and the default project.
    commands = {
        'changepassword': 'django.contrib.auth',
        'clearsessions': 'django.contrib.sessions',
        'createsuperuser': 'django.contrib.auth',
        'dbshell': 'django.core',
        'findstatic': 'django.contrib.staticfiles',
        'flush': 'django.core',
        'inspectdb': 'django.core',
        'makemigrations': 'django.core',
        'migrate': 'django.core',
        'runfcgi': 'django.core',
        'showmigrations': 'django.core',
        'squashmigrations': 'django.core',
        'syncdb': 'django.core',
        'validate': 'django.core',
        'loaddata': 'django.core',

        # FIXME: "ModuleNotFoundError: No module named 'rest_framework_simplejwt.token_blacklist.management.commands.token_blacklist'"
        # 'token_blacklist': 'rest_framework_simplejwt.token_blacklist',
        'runserver': 'channels',
        'runscanhandler': 'scanner',
        'usbcatherder': 'core',
    }
    return commands


_old_restart_with_reloader = django.utils.autoreload.restart_with_reloader


def _restart_with_reloader(*args):
    import sys
    a0 = sys.argv.pop(0)
    try:
        return _old_restart_with_reloader(*args)
    finally:
        sys.argv.insert(0, a0)


# Override get_commands() function otherwise the app will complain that there are no commands.
django.core.management.get_commands = _get_commands
# Override restart_with_reloader() function, otherwise the app might complain that some commands do not exist;
# e.g., runserver.
django.utils.autoreload.restart_with_reloader = _restart_with_reloader
