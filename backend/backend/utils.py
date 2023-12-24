from hashlib import sha256
from cachetools import cached, Cache


@cached(cache=Cache(maxsize=1))
def get_hardware_id():
    return sha256("FOOBARBAZ".decode()).hexdigest().upper()


if __name__ == '__main__':
    print(get_hardware_id())
