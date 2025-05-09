

import os
import dj_database_url
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/5.1/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = 'django-insecure-gko%l37t30+r4=%h0l=@npj&_o!06%fsnrd8!=#j6yem@x5)&t'

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = ['localhost', '127.0.0.1', 'doc-management.onrender.com', '*']


# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'mozilla_django_oidc',
    'resource',
    'allauth',
    'allauth.account',
    'allauth.socialaccount',
    'allauth.socialaccount.providers.openid_connect',
]

AUTHENTICATION_BACKENDS = (
    'resource.backends.MyOIDCAuthenticationBackend',
    'django.contrib.auth.backends.ModelBackend',
    'allauth.account.auth_backends.AuthenticationBackend',
)

OIDC_RP_CLIENT_ID = "resource-center"
OIDC_RP_CLIENT_SECRET = "WR1t72WQYTi0DZq9kakp29hcOXNakpW5"  

KEYCLOAK_URL = "http://localhost:9090"
REALM = "ResourceCenterRealm"

OIDC_OP_AUTHORIZATION_ENDPOINT = f"{KEYCLOAK_URL}/realms/{REALM}/protocol/openid-connect/auth"
OIDC_OP_TOKEN_ENDPOINT = f"{KEYCLOAK_URL}/realms/{REALM}/protocol/openid-connect/token"
OIDC_OP_USER_ENDPOINT = f"{KEYCLOAK_URL}/realms/{REALM}/protocol/openid-connect/userinfo"
OIDC_OP_JWKS_ENDPOINT = f"{KEYCLOAK_URL}/realms/{REALM}/protocol/openid-connect/certs"
OIDC_OP_LOGOUT_ENDPOINT = f"{KEYCLOAK_URL}/realms/{REALM}/protocol/openid-connect/logout"

OIDC_RP_SIGN_ALGO = "RS256"

LOGIN_URL = "oidc_authentication_init"
LOGOUT_REDIRECT_URL = "http://localhost:9090"
LOGIN_REDIRECT_URL = "http://localhost:8000/my-files"




MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware', 
    'allauth.account.middleware.AccountMiddleware',
]

ROOT_URLCONF = 'resource_center.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [os.path.join(BASE_DIR, 'templates')],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'resource_center.wsgi.application'




DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# DATABASES = {
#     'default': {
#         'ENGINE': 'django.db.backends.postgresql',
#         'NAME': 'resource_management',
#         'USER': 'passenger',
#         'PASSWORD': 'pass',
#         'HOST': 'localhost',  # Change if using a remote server
#         'PORT': '5432',  # Default PostgreSQL port
#     }
# }

# DATABASES = {
#     'default': dj_database_url.config(default=os.getenv('DATABASE_URL'))
# }




# Password validation
# https://docs.djangoproject.com/en/5.1/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/5.1/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.1/howto/static-files/

STATIC_URL = 'static/'
STATICFILES_DIRS = [os.path.join(BASE_DIR, 'static')]
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_STORAGE = 'django.contrib.staticfiles.storage.StaticFilesStorage'
WHITENOISE_MANIFEST_STRICT = False
WHITENOISE_KEEP_ONLY_HASHED_FILES = True


MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# REST_FRAMEWORK = {
#     'DEFAULT_PERMISSION_CLASSES': [
#         'rest_framework.permissions.AllowAny',  # Allow anyone to use the API
#     ],
# }

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
        'rest_framework.authentication.TokenAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}

# Default primary key field type
# https://docs.djangoproject.com/en/5.1/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'  # Use appropriate SMTP server
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'hussenjebril12@gmail.com'
EMAIL_HOST_PASSWORD = 'muka nvoo hzlk aavw'
DEFAULT_FROM_EMAIL = 'hussenjebril12@gmail.com'





