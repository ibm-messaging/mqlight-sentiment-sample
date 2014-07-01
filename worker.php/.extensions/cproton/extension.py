"""cproton extension

installs cproton
"""
import os
import os.path
import logging
from build_pack_utils import utils


_log = logging.getLogger('cproton')



# Extension Methods
def preprocess_commands(ctx):
    return ()


def service_commands(ctx):
    return {}


def service_environment(ctx):
    return {}


def compile(install):
    print 'Installing cproton ' 
    (install.builder
        .move()
        .everything()
        .under('{BUILD_DIR}/.php-extensions')
        .into('{BUILD_DIR}/php/lib/php/extensions/no-debug-non-zts-20100525/')
        .done())
    (install.builder
        .move()
        .everything()
        .under('{BUILD_DIR}/.lib')
        .into('{BUILD_DIR}/php/lib/')
        .done())
    return 0
