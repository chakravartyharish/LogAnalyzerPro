from backend.settings import APP_ENVIRONMENT

LICENSE_SERVER_BASE_URL = "https://license.dissec.to" if APP_ENVIRONMENT == "production" else "http://localhost"
LICENSE_SERVER_PORT = "" if APP_ENVIRONMENT == "production" else ":9000"
LICENSE_SERVER_API = "/api"
LICENSE_SERVER_URL = LICENSE_SERVER_BASE_URL + LICENSE_SERVER_PORT + LICENSE_SERVER_API

LICENSE_SERVER_API_SERIAL_BLACKLIST = "/blacklisted_serials"
LICENSE_SERVER_API_ACTIVATE_LICENSE = "/activate_license"

DEFAULT_USER_GROUP_NAME = "Default"

DEFAULT_TESTCASES_METADATA_FILE_NAME = "testcases_meta_data.json"
