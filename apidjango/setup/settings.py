"""
Django settings for o setup project.

Configuração do back-end do Sistema ONG do Povo (Projeto Integrador).

Documentação:
    https://docs.djangoproject.com/en/5.2/topics/settings/
    https://docs.djangoproject.com/en/5.2/ref/settings/

Variáveis de ambiente: ver .env.example
"""
import os
import sys
from datetime import timedelta
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Path explicito: o manage.py funciona independente do diretorio de onde e chamado.
load_dotenv(BASE_DIR / ".env")


def env_bool(name, default=False):
    """Le booleano de env aceitando 'true'/'false' em qualquer caixa."""
    return os.getenv(name, str(default)).strip().lower() in ("true", "1", "yes")


# --- Seguranca -------------------------------------------------------------
# Seguro por padrao: sem DJANGO_DEBUG=True no ambiente, o Django roda como producao.
# Para desenvolver, copie apidjango/.env.example para apidjango/.env (ele liga o DEBUG).
DEBUG = env_bool("DJANGO_DEBUG", True)

# Os testes (pytest) rodam sem .env e sem HTTPS: ficam de fora das regras de producao.
TESTING = "pytest" in sys.modules
PRODUCAO = not DEBUG and not TESTING

_CHAVE_DE_DESENVOLVIMENTO = "django-insecure-dev-only-nao-usar-em-producao"
SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", _CHAVE_DE_DESENVOLVIMENTO)
if PRODUCAO and SECRET_KEY == _CHAVE_DE_DESENVOLVIMENTO:
    raise ImproperlyConfigured(
        "Defina DJANGO_SECRET_KEY no ambiente (em desenvolvimento, use DJANGO_DEBUG=True)."
    )


def _lista(nome, padrao):
    return [item.strip() for item in os.getenv(nome, padrao).split(",") if item.strip()]


ALLOWED_HOSTS = _lista("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1,[::1]")

# CSRF trusted origins para o login via cookie funcionar em dev.
CSRF_TRUSTED_ORIGINS = _lista(
    "DJANGO_CSRF_TRUSTED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
)

# O Render informa o proprio endereco: ja entra nos hosts e origens confiaveis.
_HOST_RENDER = os.getenv("RENDER_EXTERNAL_HOSTNAME", "")
if _HOST_RENDER:
    ALLOWED_HOSTS.append(_HOST_RENDER)
    CSRF_TRUSTED_ORIGINS.append(f"https://{_HOST_RENDER}")


# --- Apps ------------------------------------------------------------------

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Terceiros
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",
    "drf_spectacular",
    "django_filters",
    "auditlog",
    # Domino
    "setup",
    "doacoes",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    # Serve os arquivos estaticos (admin do Django) sem Nginx. Logo apos o Security.
    "whitenoise.middleware.WhiteNoiseMiddleware",
    # CorsMiddleware precisa vir antes de qualquer middleware que possa gerar
    # resposta, senao o preflight OPTIONS sai sem os headers de CORS.
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
]

ROOT_URLCONF = "setup.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "setup.wsgi.application"

# https://whitenoise.readthedocs.io/
WHITENOISE_AUTOREFRESH = DEBUG


# --- Django REST Framework -------------------------------------------------

REST_FRAMEWORK = {
    # Autenticacao por JWT em Authorization: Bearer <token>.
    # CSRF exempt: o access token vem no header, nao em cookie.
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticatedOrReadOnly",
    ),
    "DEFAULT_PAGINATION_CLASS": "setup.pagination.PaginacaoPadrao",
    "PAGE_SIZE": 20,
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ),
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_THROTTLE_CLASSES": (
        "rest_framework.throttling.ScopedRateThrottle",
    ),
    "DEFAULT_THROTTLE_RATES": {
        # Protege o login contra forca bruta. Ajustavel por env sem mexer no codigo
        # (a ONG pode ter varios usuarios atras do mesmo IP de uma escola/cooperativa).
        "auth": os.getenv("DJANGO_AUTH_THROTTLE", "10/minute"),
        # Endpoints públicos de leitura (grade da semana).
        "publico": os.getenv("DJANGO_PUBLIC_THROTTLE", "120/minute"),
    },
}


# --- Autenticacao JWT ------------------------------------------------------

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    # A cada refresh o token anterior e invalidado (evita reuso de token roubado)
    "ROTATE_REFRESH_TOKENS": True,
    # Para invalidar de fato o token anterior seria preciso o app
    # 'rest_framework_simplejwt.token_blacklist'. Deixamos False por enquanto:
    # o token antigo expira sozinho em 7 dias, e a complexidade extra nao compensa
    # para o escopo atual. Reavaliar quando houver doacao real em producao.
    "BLACKLIST_AFTER_ROTATION": False,
    "UPDATE_LAST_LOGIN": True,

    "AUTH_HEADER_TYPES": ("Bearer",),
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
    "AUTH_HEADER_NAME": "HTTP_AUTHORIZATION",
}

# Nome do cookie httpOnly que carrega o refresh token.
# Precisa bater com o nome usado nas views de auth (setup/views.py).
JWT_REFRESH_COOKIE_NAME = "ong_refresh_token"
# O cookie é httpOnly: o JS não o lê, só o browser o envia. Restringir o path
# faz ele ir apenas para refresh/logout, não em toda requisição à API.
JWT_REFRESH_COOKIE_PATH = "/api/v1/auth/"
# Em dev (http://localhost) o cookie com Secure=True seria descartado pelo browser.
JWT_REFRESH_COOKIE_SECURE = not DEBUG
JWT_REFRESH_COOKIE_SAMESITE = "Lax"


# --- drf-spectacular (contrato de API) ------------------------------------

SPECTACULAR_SETTINGS = {
    "TITLE": "Sistema ONG do Povo — API",
    "DESCRIPTION": (
        "API do Sistema ONG do Povo (Projeto Integrador). "
        "O schema em /api/schema/ alimenta o gerador de client do frontend."
    ),
    "VERSION": "1.0.0",
    # Schema fica fora do DRF routing padrao (/api/ e o prefixo do dominio).
    "SERVE_INCLUDE_SCHEMA": False,
    # --- Divisao de responsabilidade do prefixo /api/v1 ---
    # Sem TRIM, o schema emite os paths completos (/api/v1/ping/) E o SERVERS
    # acrescenta o prefixo de novo -> o Orval gera /api/v1/api/v1/ping/
    # e o Django responde 404.
    #
    # Com TRIM, os paths ficam relativos (/ping/) e o prefixo fica no SERVERS.
    # O Orval usa SERVER para montar a baseURL, e a instancia do axios em
    # src/lib/api.ts usa VITE_API_URL com o mesmo prefixo. Um lugar so.
    "SCHEMA_PATH_PREFIX": r"/api/v1",
    "SCHEMA_PATH_PREFIX_TRIM": True,
    "SERVERS": [
        {"url": "http://localhost:8000/api/v1", "description": "Desenvolvimento local"},
    ],
    "COMPONENT_SPLIT_REQUEST": True,
    "SORT_OPERATIONS": True,
    "DISABLE_ERRORS_AND_WARNINGS": False,
}


# --- Database --------------------------------------------------------------

# Os padrões abaixo são os do banco que o docker-compose.yml cria (só para
# desenvolvimento local). Em produção, defina DB_* no ambiente/.env.
def _banco_da_url(url):
    """Le `postgres://usuario:senha@host:porta/banco?sslmode=require` (padrao dos provedores)."""
    partes = urlparse(url)
    config = {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": partes.path.lstrip("/"),
        "USER": unquote(partes.username or ""),
        "PASSWORD": unquote(partes.password or ""),
        "HOST": partes.hostname or "",
        "PORT": str(partes.port or 5432),
    }
    sslmode = parse_qs(partes.query).get("sslmode", [""])[0]
    if sslmode:
        config["OPTIONS"] = {"sslmode": sslmode}
    return config


# Em producao, o mais simples e definir DATABASE_URL (Render, Neon, Supabase...).
if os.getenv("DATABASE_URL"):
    DATABASES = {"default": _banco_da_url(os.environ["DATABASE_URL"])}
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.getenv("DB_NAME", "ongdb"),
            "USER": os.getenv("DB_USER", "postgres"),
            "PASSWORD": os.getenv("DB_PASSWORD", "123"),
            "HOST": os.getenv("DB_HOST", "localhost"),
            "PORT": os.getenv("DB_PORT", "5432"),
        }
    }


# --- Password validation ---------------------------------------------------

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]


# --- Internationalization --------------------------------------------------

LANGUAGE_CODE = "pt-br"

TIME_ZONE = "America/Sao_Paulo"

USE_I18N = True

USE_TZ = True


# --- Static & Media files --------------------------------------------------

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

if PRODUCAO:
    # Arquivos com hash no nome e compactados; precisa de `collectstatic` no deploy.
    STORAGES = {
        "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
        "staticfiles": {
            "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"
        },
    }

# Evita W042 e usa BigAutoField (64 bits) nas chaves primarias.
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


# --- Email -----------------------------------------------------------------

EMAIL_BACKEND = os.getenv(
    "DJANGO_EMAIL_BACKEND",
    "django.core.mail.backends.console.EmailBackend",
)
DEFAULT_FROM_EMAIL = os.getenv("DJANGO_DEFAULT_FROM_EMAIL", "ongdopovo@outlook.com")


# --- CORS ------------------------------------------------------------------

CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
    ).split(",")
    if origin.strip()
]

CORS_ALLOW_CREDENTIALS = True


# --- HTTPS em producao (atras do proxy do Render) -----------------------------

if PRODUCAO:
    # O Render termina o TLS e avisa pelo cabecalho; sem isto o Django acharia que
    # toda requisicao e HTTP e redirecionaria em loop.
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SECURE_SSL_REDIRECT = env_bool("DJANGO_SSL_REDIRECT", True)
    # O health check do Render fala HTTP simples: nao pode ser redirecionado.
    SECURE_REDIRECT_EXEMPT = [r"^api/v1/ping/$"]
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    # HSTS fica desligado ate o dominio definitivo estar no ar; depois, suba (ex.: 31536000).
    SECURE_HSTS_SECONDS = int(os.getenv("DJANGO_HSTS_SECONDS", "0"))
