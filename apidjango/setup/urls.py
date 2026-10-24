"""
Rotas da API.

Prefixo `/api/v1/` desde o dia 1: quando o contrato precisar mudar, a versao
nova convive com a antiga em vez de quebrar o frontend que ja esta em producao.

Tres blocos:

  /api/schema/       OpenAPI em JSON  -> consumido pelo Orval (ver frontend/orval.config.ts)
  /api/docs/         Swagger UI       -> navegavel no browser, util na apresentacao
  /api/v1/           a API em si
"""

from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

from . import views

urlpatterns = [
    # Back-office interno da equipe da ONG
    path('admin/', admin.site.urls),
    # --- Contrato de API ---
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    # --- API ---
    path('api/v1/auth/token/', views.CookieTokenObtainPairView.as_view(), name='token-obtain-pair'),
    path(
        'api/v1/auth/token/refresh/',
        views.CookieTokenRefreshView.as_view(),
        name='token-refresh',
    ),
    path('api/v1/auth/logout/', views.LogoutView.as_view(), name='logout'),
    path('api/v1/auth/me/', views.MeView.as_view(), name='me'),
    path('api/v1/ping/', views.ping, name='ping'),
    # --- Apps de dominio ---
    # prefixo /api/v1 declarado no include, e tambem em
    # SPECTACULAR_SETTINGS['SCHEMA_PATH_PREFIX'] (ver settings.py)
    path('api/v1/', include('doacoes.urls')),
]