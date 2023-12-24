# TODO: remove this file if its not needed (do the automated tests really need it?)

import backend.settings as django_settings

import setuptools

with open("README.md", "r") as fh:
    long_description = fh.read()

setuptools.setup(
    name='backend',
    version=django_settings.RELEASE_VERSION,
    author="dissecto GmbH",
    author_email="info@dissec.to",
    package_data={
        'backend': ['VERSION'],
    },
    python_requires='>=2.7, !=3.0.*, !=3.1.*, !=3.2.*, !=3.3.*, <4',
    # pip > 9 handles all the versioning
    install_requires=[
        'cachetools',
        'django==4.0.4',
        'djangorestframework',
        'django-cors-headers',
        'djangochannelsrestframework',
        'channelsmultiplexer',
        'channels-redis',
        'python-can',
        'gs_usb',
        'python-can[gs_usb]',
        'pyusb',
        'libusb',
        'pyserial',
        'process_runner @ git+https://dev:2Wypmvq9s9s-j3141cRD@git.intern.dissec.to/the-product/process-runner.git#egg=process_runner'
    ],
    description="dissecto backend",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="",
    packages=setuptools.find_packages(),
    classifiers=[
        "Programming Language :: Python :: 3",
        "Operating System :: OS Independent"]
    )
