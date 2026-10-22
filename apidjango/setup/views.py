"""
Views de autenticação e health check.

Fluxo de cookies (decisão do time — seção 13.1 do PLANO_REMODELAGEM.md):

    login  -> access token no corpo da resposta + refresh token em cookie httpOnly
    refresh-> lê o cookie, devolve novo access token no corpo
    logout -> apaga o cookie

O access token viaja no header `Authorization: Bearer ...`, exatamente como o
DRF espera, então nao há CSRF a se preocupar: DRF com JWT nao exige token CSRF.
"""

from django.conf import settings
from django.db import connection
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import serializers, status
from rest_framework.decorators import (
    api_view,
    authentication_classes,
    permission_classes,
)
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

from .serializers import CustomTokenObtainPairSerializer

# --------------------------------------------------------------------------- #
# Helpers de cookie
# --------------------------------------------------------------------------- #

def set_refresh_cookie(response, token):
    """Grava o refresh token num cookie httpOnly."""
    response.set_cookie(
        key=settings.JWT_REFRESH_COOKIE_NAME,
        value=token,
        max_age=int(settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds()),
        httponly=True,
        secure=settings.JWT_REFRESH_COOKIE_SECURE,
        samesite=settings.JWT_REFRESH_COOKIE_SAMESITE,
        path=settings.JWT_REFRESH_COOKIE_PATH,
    )


def clear_refresh_cookie(response):
    """Apaga o cookie do refresh token. Precisa usar o mesmo path de quem gravou."""
    response.delete_cookie(
        key=settings.JWT_REFRESH_COOKIE_NAME,
        path=settings.JWT_REFRESH_COOKIE_PATH,
        samesite=settings.JWT_REFRESH_COOKIE_SAMESITE,
    )


# --------------------------------------------------------------------------- #
# Schemas do OpenAPI
# --------------------------------------------------------------------------- #

class MeSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    username = serializers.CharField()
    name = serializers.CharField()
    email = serializers.EmailField(allow_blank=True)
    role = serializers.CharField()
    is_staff = serializers.BooleanField()


class PingSerializer(serializers.Serializer):
    servico = serializers.CharField()
    status = serializers.CharField()
    banco = serializers.CharField()


class AccessTokenSerializer(serializers.Serializer):
    """Corpo de /auth/token/refresh/ — so o access token volta."""

    access = serializers.CharField()


class LoginUserSerializer(serializers.Serializer):
    """Dados do usuario devolvidos junto do access token no login."""

    id = serializers.IntegerField()
    username = serializers.CharField()
    name = serializers.CharField()
    role = serializers.CharField()
    is_staff = serializers.BooleanField()


class LoginResponseSerializer(serializers.Serializer):
    """Corpo de /auth/token/.

    Nao inclui `refresh`: o token vai em cookie httpOnly, nunca no corpo.
    """

    access = serializers.CharField()
    user = LoginUserSerializer()


# --------------------------------------------------------------------------- #
# Auth
# --------------------------------------------------------------------------- #

@extend_schema(
    summary='Autentica e devolve o access token',
    description=(
        'Recebe usuario e senha, devolve `{access, user}` no corpo e grava o '
        'refresh token num cookie httpOnly. O campo `refresh` nunca aparece na '
        'resposta. Limitado a 10 tentativas por minuto por IP.'
    ),
    tags=['auth'],
    request=CustomTokenObtainPairSerializer,
    responses={
        200: LoginResponseSerializer,
        401: OpenApiResponse(description='Credenciais invalidas'),
        429: OpenApiResponse(description='Limite de tentativas excedido'),
    },
)
class CookieTokenObtainPairView(TokenObtainPairView):
    """POST /api/v1/auth/token/

    Devolve `{access, user}` no corpo e grava o refresh token em cookie httpOnly.
    O campo `refresh` e REMOVIDO do corpo de proposito.
    """

    serializer_class = CustomTokenObtainPairSerializer
    throttle_scope = 'auth'

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)

        # Em caso de erro (credenciais invalidas) nao ha token para gravar.
        if response.status_code == status.HTTP_200_OK:
            refresh_token = response.data.pop('refresh')
            set_refresh_cookie(response, refresh_token)

        return response


@extend_schema(
    summary='Renova o access token',
    description=(
        'Le o refresh token do cookie httpOnly e devolve um novo access token. '
        'Com ROTATE_REFRESH_TOKENS ligado, o cookie e renovado junto.'
    ),
    tags=['auth'],
    request=None,
    responses={
        200: AccessTokenSerializer,
        401: OpenApiResponse(description='Sessao expirada ou sem cookie valido'),
    },
)
class CookieTokenRefreshView(APIView):
    """POST /api/v1/auth/token/refresh/

    Le o refresh token do cookie httpOnly e devolve um novo access token.
    """

    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_scope = 'auth'

    def post(self, request):
        token = request.COOKIES.get(settings.JWT_REFRESH_COOKIE_NAME)
        if not token:
            return Response(
                {'detail': 'Sessao expirada. Faca login novamente.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        serializer = TokenRefreshSerializer(data={'refresh': token})
        serializer.is_valid(raise_exception=True)

        data = {'access': serializer.validated_data['access']}

        # Com ROTATE_REFRESH_TOKENS ligado o SimpleJWT emite um refresh novo;
        # quando emite, o cookie precisa ser atualizado junto.
        new_refresh = serializer.validated_data.get('refresh')

        response = Response(data)
        if new_refresh:
            set_refresh_cookie(response, new_refresh)

        return response


@extend_schema(
    summary='Encerra a sessao',
    description=(
        'Apaga o cookie httpOnly do refresh token. O access token em memoria '
        'continua valido ate expirar, entao o frontend deve limpar o estado da '
        'sessao imediatamente apos chamar esta rota.'
    ),
    tags=['auth'],
    request=None,
    responses={204: OpenApiResponse(description='Sessao encerrada')},
)
class LogoutView(APIView):
    """POST /api/v1/auth/logout/

    Apaga o cookie. O access token em memoria continua valido ate expirar —
    por isso o frontend deve limpar o estado da sessao imediatamente.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        response = Response(status=status.HTTP_204_NO_CONTENT)
        clear_refresh_cookie(response)
        return response


class MeView(APIView):
    """GET /api/v1/auth/me/

    Dados do usuario autenticado (via header Authorization).
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(tags=['auth'], responses={200: MeSerializer})
    def get(self, request):
        user = request.user
        return Response(
            {
                'id': user.id,
                'username': user.username,
                'name': user.get_full_name() or user.username,
                'email': user.email,
                'role': getattr(user, 'role', 'VOLUNTARIO'),
                'is_staff': user.is_staff,
            }
        )


# --------------------------------------------------------------------------- #
# Health check
# --------------------------------------------------------------------------- #

@extend_schema(
    summary='Verifica se a API esta no ar',
    tags=['sistema'],
    description=(
        'Sprint 0 do plano de remodelagem. Endpoint publico e sem autenticacao '
        'usado para validar o encanamento React -> Django. Tambem reporta se o '
        'banco esta acessivel.'
    ),
    responses={200: PingSerializer},
)
@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def ping(request):
    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT 1')
            cursor.fetchone()
        db_status = 'ok'
    except Exception:
        db_status = 'erro'

    return Response({'servico': 'django', 'status': 'ok', 'banco': db_status})