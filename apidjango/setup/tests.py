"""
Testes do fluxo de autenticacao.

O ponto SENSITVEL do projeto e o refresh token em cookie httpOnly (decisao do
time, secao 13.1 do PLANO_REMODELAGEM.md). Se alguem mexer na view e o refresh
passar a vazar no corpo da resposta, estes testes quebram.

Rodar:  pytest
"""

import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient

pytestmark = pytest.mark.django_db

CREDENCIAIS = {"username": "coordenador", "password": "SenhaForte@123"}
URL_TOKEN = "/api/v1/auth/token/"
URL_REFRESH = "/api/v1/auth/token/refresh/"
URL_LOGOUT = "/api/v1/auth/logout/"
URL_ME = "/api/v1/auth/me/"
NOME_COOKIE = "ong_refresh_token"


@pytest.fixture(autouse=True)
def limpar_throttle():
    """Zera os contadores de rate limit entre os testes.

    O throttle usa LocMemCache, que e global ao processo: sem isto, o 10/minute
    configurado em settings.py bloqueia os testes a partir da 11a tentativa e o
    time perde tempo debugando um 429 que so existe no pytest.
    """
    from django.core.cache import cache

    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def user(db):
    return User.objects.create_user(
        username=CREDENCIAIS["username"],
        password=CREDENCIAIS["password"],
        first_name="Ana",
        last_name="Souza",
    )


@pytest.fixture
def client():
    return APIClient()


class TestLogin:
    def test_devolve_access_token_no_corpo(self, client, user):
        response = client.post(URL_TOKEN, CREDENCIAIS, format="json")

        assert response.status_code == 200
        assert "access" in response.data

    def test_refresh_token_nao_vaza_no_corpo(self, client, user):
        """O refresh NUNCA pode aparecer no JSON — so no cookie httpOnly."""
        response = client.post(URL_TOKEN, CREDENCIAIS, format="json")

        assert "refresh" not in response.data

    def test_grava_refresh_em_cookie_httponly(self, client, user):
        response = client.post(URL_TOKEN, CREDENCIAIS, format="json")

        cookie = response.cookies[NOME_COOKIE]
        assert cookie.value
        assert cookie["httponly"] is True

    def test_cookie_tem_path_restrito_a_auth(self, client, user):
        response = client.post(URL_TOKEN, CREDENCIAIS, format="json")

        # Path restrito impede o cookie de ir em toda requisicao.
        assert response.cookies[NOME_COOKIE]["path"] == "/api/v1/auth/"

    def test_retorna_dados_do_usuario(self, client, user):
        """O React usa esses dados para o header sem chamar /auth/me/."""
        response = client.post(URL_TOKEN, CREDENCIAIS, format="json")

        assert response.data["user"]["username"] == user.username
        assert response.data["user"]["name"] == "Ana Souza"

    def test_credenciais_invalidas_retornam_401(self, client, user):
        response = client.post(
            URL_TOKEN,
            {"username": CREDENCIAIS["username"], "password": "errada"},
            format="json",
        )

        assert response.status_code == 401

    def test_credenciais_invalidas_nao_gravam_cookie(self, client, user):
        response = client.post(
            URL_TOKEN,
            {"username": CREDENCIAIS["username"], "password": "errada"},
            format="json",
        )

        assert NOME_COOKIE not in response.cookies


class TestRefresh:
    def test_le_o_cookie_e_devolve_novo_access(self, client, user):
        client.post(URL_TOKEN, CREDENCIAIS, format="json")

        response = client.post(URL_REFRESH)

        assert response.status_code == 200
        assert "access" in response.data

    def test_sem_cookie_retorna_401(self, client, user):
        response = client.post(URL_REFRESH)

        assert response.status_code == 401

    def test_renova_o_cookie_por_rotacao(self, client, user):
        """ROTATE_REFRESH_TOKENS: o cookie antigo e substituido por um novo."""
        client.post(URL_TOKEN, CREDENCIAIS, format="json")
        cookie_antigo = client.cookies[NOME_COOKIE].value

        response = client.post(URL_REFRESH)

        cookie_novo = response.cookies.get(NOME_COOKIE)
        assert cookie_novo is not None
        assert cookie_novo.value != cookie_antigo
        assert cookie_novo["httponly"] is True


class TestMe:
    def test_exige_autenticacao(self, client, user):
        response = client.get(URL_ME)

        assert response.status_code == 401

    def test_retorna_usuario_autenticado(self, client, user):
        client.post(URL_TOKEN, CREDENCIAIS, format="json")
        access = client.post(URL_REFRESH).data["access"]
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

        response = client.get(URL_ME)

        assert response.status_code == 200
        assert response.data["username"] == user.username

    def test_token_invalido_retorna_401(self, client, user):
        client.credentials(HTTP_AUTHORIZATION="Bearer token.invalido.aqui")

        response = client.get(URL_ME)

        assert response.status_code == 401


class TestLogout:
    def test_apaga_o_cookie(self, client, user):
        client.post(URL_TOKEN, CREDENCIAIS, format="json")

        response = client.post(URL_LOGOUT)

        assert response.status_code == 204
        assert response.cookies[NOME_COOKIE].value == ""


class TestPing:
    def test_e_publico(self, client):
        response = client.get("/api/v1/ping/")

        assert response.status_code == 200
        assert response.data["servico"] == "django"
        assert response.data["status"] == "ok"

class TestContratoDaAPI:
    """Guarda contra o erro de prefixo duplicado.

    O frontend monta a URL como: VITE_API_URL (que ja tem /api/v1) + o path
    gerado pelo Orval. Se o schema voltar com /api/v1 tambem no path, a
    requisicao sai como /api/v1/api/v1/ping/ e o Django responde 404.

    Ja aconteceu uma vez. Estes testes existem para nao acontecer de novo.
    """

    ROTA = "/api/v1/ping/"

    @property
    def _schema(self):
        from drf_spectacular.generators import SchemaGenerator

        return SchemaGenerator().get_schema(request=None, public=True)

    def test_schema_nao_repete_o_prefixo(self):
        """Os paths do schema devem ser relativos ao SERVERS."""
        paths = list(self._schema["paths"].keys())

        assert paths, "o schema saiu vazio"
        for path in paths:
            assert not path.startswith("/api/v1"), (
                f"o path '{path}' ainda carrega /api/v1. Verifique "
                "SCHEMA_PATH_PREFIX_TRIM em settings.py - sem ele o Orval gera "
                "a URL com o prefixo duplicado e a API responde 404."
            )

    def test_servers_declara_o_prefixo(self):
        """O prefixo tem que estar em SERVERS, que o Orval vira baseURL."""
        servers = self._schema.get("servers", [])

        assert servers, "defina SPECTACULAR_SETTINGS['SERVERS']"
        assert servers[0]["url"].endswith("/api/v1")

    def test_url_final_responde(self):
        """A URL montada como o frontend monta tem que responder 200."""
        response = APIClient().get(self.ROTA)

        assert response.status_code == 200
