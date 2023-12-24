# -*- mode: python ; coding: utf-8 -*-


block_cipher = None


a = Analysis(
    ['manage.py'],
    pathex=[],
    binaries=[],
    datas=[('static', 'static'),],
    hiddenimports=['channels',
                   'channels.apps',
                   'channels_redis.core',
                   'core',
                   'core.apps',
                   'scanner',
                   'scanner.apps',
                   'backend.asgi',
                   'backend.settings',
                   'django.contrib.auth',
                   'django.contrib.admin',
                   'django.contrib.contenttypes',
                   'django.contrib.sessions',
                   'django.contrib.sessions.serializers',
                   'django.contrib.messages',
                   'djangochannelsrestframework',
                   'django.contrib.staticfiles',
                   'rest_framework_simplejwt.serializers',
                   'rest_framework_simplejwt.state',
                   'rest_framework_simplejwt.token_blacklist.management.commands'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=['pyi_rth_django.py'],	# override the default django runtime hook
    excludes=['rest_framework_simplejwt.token_blacklist.migrations.0010_fix_migrate_to_bigautofield',
              'rest_framework_simplejwt.token_blacklist.migrations.0011_linearizes_history'],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)
pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='backend',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
