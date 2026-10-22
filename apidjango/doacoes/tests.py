"""
Testes do app de doações.

O foco é a **regra do status**: uma doação criada pelo formulário público tem de
sair PENDENTE, e nenhuma combinação de campos no corpo da requisição pode
fazer o doador se declarar CONFIRMADA — nem vazar dado pessoal pela leitura
pública.

Rodar: pytest
"""

import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient

from .models import Doacao

pytestmark = pytest.mark.django_db

URL_CRIAR = "/api/v1/doacoes/"
URL_PUBLICO = "/api/v1/doacoes/publico/"
URL_RESUMO = "/api/v1/doacoes/resumo/"
URL_ADMIN = "/api/v1/doacoes/admin/"

PAGAMENTO = {
    "nome": "Maria Silva",
    "email": "maria@exemplo.com",
    "telefone": "13988887777",
    "valor": "100.00",
    "forma_pagamento": "PIX",
    "destinacao": "MATERIAL",
    "mensagem": "Torcendo pelo projeto!",
}


@pytest.fixture
def cliente():
    return APIClient()


@pytest.fixture
def admin(db):
    return User.objects.create_user(
        username="gestor", password="SenhaForte@123", is_staff=True
    )


@pytest.fixture
def nao_admin(db):
    """Usuário autenticado mas sem is_staff — não deve passar no admin."""
    return User.objects.create_user(username="comum", password="SenhaForte@123")


def autenticar(cliente: APIClient, usuario: User) -> None:
    token = cliente.post(
        "/api/v1/auth/token/",
        {"username": usuario.username, "password": "SenhaForte@123"},
        format="json",
    )
    cliente.credentials(HTTP_AUTHORIZATION=f"Bearer {token.data['access']}")


# --------------------------------------------------------------------------- #
# Criação pelo formulário público
# --------------------------------------------------------------------------- #


class TestCriacaoPublica:
    def test_cria_com_status_pendente(self, cliente):
        response = cliente.post(URL_CRIAR, PAGAMENTO, format="json")

        assert response.status_code == 201
        assert response.data["status"] == Doacao.Status.PENDENTE
        assert Doacao.objects.count() == 1

    def test_ignora_status_enviado_no_corpo(self, cliente):
        """O ataque: mandar CONFIRMADA no body para auto-declarar a doação.

        `status` não está na lista de fields do serializer público, então o DRF
        simplesmente não enxerga o campo — não existe como burlar.
        """
        payload = {**PAGAMENTO, "status": Doacao.Status.CONFIRMADA}

        response = cliente.post(URL_CRIAR, payload, format="json")

        assert response.status_code == 201
        assert Doacao.objects.get().status == Doacao.Status.PENDENTE

    def test_ignora_confirmado_em_enviado(self, cliente):
        payload = {**PAGAMENTO, "confirmado_em": "2026-01-01T00:00:00Z"}

        response = cliente.post(URL_CRIAR, payload, format="json")

        assert response.status_code == 201
        assert Doacao.objects.get().confirmado_em is None

    def test_ignora_id_enviado(self, cliente):
        """Tentativa de sobrescrever o id de outra doação."""
        outra = Doacao.objects.create(valor="10.00", forma_pagamento="PIX", nome="X",
                                      email="x@x.com")

        payload = {**PAGAMENTO, "id": outra.id}

        cliente.post(URL_CRIAR, payload, format="json")

        assert Doacao.objects.count() == 2
        assert Doacao.objects.get(id=outra.id).nome == "X"

    def test_nao_exige_autenticacao(self, cliente):
        assert cliente.post(URL_CRIAR, PAGAMENTO, format="json").status_code == 201

    def test_destino_default_geral(self, cliente):
        payload = {k: v for k, v in PAGAMENTO.items() if k != "destinacao"}

        cliente.post(URL_CRIAR, payload, format="json")

        assert Doacao.objects.get().destinacao == Doacao.Destinacao.GERAL

    def test_resposta_nao_ecoa_dado_pessoal(self, cliente):
        response = cliente.post(URL_CRIAR, PAGAMENTO, format="json")

        assert "email" not in response.data
        assert "telefone" not in response.data


class TestValidacaoPublica:
    def test_valor_zero_rejeitado(self, cliente):
        response = cliente.post(URL_CRIAR, {**PAGAMENTO, "valor": "0"}, format="json")

        assert response.status_code == 400
        assert "valor" in response.data

    def test_valor_negativo_rejeitado(self, cliente):
        response = cliente.post(
            URL_CRIAR, {**PAGAMENTO, "valor": "-50.00"}, format="json"
        )

        assert response.status_code == 400

    def test_email_invalido_rejeitado(self, cliente):
        response = cliente.post(
            URL_CRIAR, {**PAGAMENTO, "email": "nao-e-email"}, format="json"
        )

        assert response.status_code == 400

    def test_nome_curto_rejeitado(self, cliente):
        response = cliente.post(URL_CRIAR, {**PAGAMENTO, "nome": "Ab"}, format="json")

        assert response.status_code == 400

    def test_forma_pagamento_invalida_rejeitada(self, cliente):
        response = cliente.post(
            URL_CRIAR, {**PAGAMENTO, "forma_pagamento": "BITCOIN"}, format="json"
        )

        assert response.status_code == 400

    def test_campos_obrigatorios(self, cliente):
        response = cliente.post(URL_CRIAR, {}, format="json")

        assert response.status_code == 400
        for campo in ("nome", "email", "valor", "forma_pagamento"):
            assert campo in response.data


# --------------------------------------------------------------------------- #
# Leitura pública — nunca vaza dado pessoal
# --------------------------------------------------------------------------- #


class TestLeituraPublica:
    @pytest.fixture(autouse=True)
    def _doacoes(self):
        Doacao.objects.create(
            nome="Joao",
            email="joao@exemplo.com",
            telefone="11999999999",
            valor="50.00",
            forma_pagamento="PIX",
            status=Doacao.Status.CONFIRMADA,
        )
        Doacao.objects.create(
            nome="Ana",
            email="ana@exemplo.com",
            valor="100.00",
            forma_pagamento="DINHEIRO",
            status=Doacao.Status.PENDENTE,
        )
        Doacao.objects.create(
            nome="Carlos",
            email="carlos@exemplo.com",
            valor="25.00",
            forma_pagamento="CARTAO",
            status=Doacao.Status.CANCELADA,
        )

    def test_mostra_somente_confirmadas(self, cliente):
        response = cliente.get(URL_PUBLICO)

        assert response.status_code == 200
        assert len(response.data) == 1
        assert float(response.data[0]["valor"]) == 50.00

    def test_nao_expoe_nome_email_ou_telefone(self, cliente):
        """O serializer público não tem esses campos — mesmo para identificado."""
        response = cliente.get(URL_PUBLICO)
        chaves = set(response.data[0].keys())

        assert not chaves & {"nome", "email", "telefone", "mensagem", "nome_exibido"}

    def test_anonimo_tambem_nao_expoe(self, cliente):
        """Doação anônima confirmada: nenhum dado sai."""
        Doacao.objects.create(
            nome="Segredo",
            email="segredo@exemplo.com",
            anonimo=True,
            valor="10.00",
            forma_pagamento="PIX",
            status=Doacao.Status.CONFIRMADA,
        )

        response = cliente.get(URL_PUBLICO)
        doacoes = response.json() if hasattr(response, "json") else response.data

        assert all(not (set(d.keys()) & {"nome", "email"}) for d in doacoes)

    def test_resumo_soma_apenas_confirmadas(self, cliente):
        response = cliente.get(URL_RESUMO)

        assert response.status_code == 200
        assert float(response.data["total"]) == 50.00
        assert response.data["quantidade"] == 1

    def test_resumo_conta_pendentes(self, cliente):
        """A equipe precisa saber quantas aguardam conferência."""
        assert APIClient().get(URL_RESUMO).data["pendentes"] == 1

    def test_resumo_agrupa_por_destinacao(self, cliente):
        response = cliente.get(URL_RESUMO)

        assert response.data["por_destino"][0]["rotulo"] == "Onde mais precisar"


# --------------------------------------------------------------------------- #
# CRUD da equipe
# --------------------------------------------------------------------------- #


class TestAcessoAdmin:
    def test_exige_autenticacao(self, cliente):
        assert cliente.get(URL_ADMIN).status_code in (401, 403)

    def test_usuario_comum_nao_acessa(self, cliente, nao_admin):
        autenticar(cliente, nao_admin)

        assert cliente.get(URL_ADMIN).status_code == 403

    def test_staff_acessa(self, cliente, admin):
        autenticar(cliente, admin)

        assert cliente.get(URL_ADMIN).status_code == 200

    def test_publico_nao_cria_pelo_admin(self, cliente):
        """O formulário público não é o mesmo que o CRUD da equipe."""
        resposta = cliente.post(
            URL_ADMIN, {**PAGAMENTO, "status": Doacao.Status.CONFIRMADA}, format="json"
        )

        assert resposta.status_code in (401, 403)


class TestGestaoDeStatus:
    def test_acao_de_confirmar_em_lote(self, cliente, admin):
        d1 = Doacao.objects.create(
            nome="A", email="a@a.com", valor="10.00", forma_pagamento="PIX"
        )
        d2 = Doacao.objects.create(
            nome="B", email="b@b.com", valor="20.00", forma_pagamento="PIX"
        )
        autenticar(cliente, admin)

        response = cliente.post(
            f"{URL_ADMIN}confirmar/", {"ids": [d1.id, d2.id]}, format="json"
        )

        assert response.status_code == 200
        assert Doacao.objects.filter(status=Doacao.Status.CONFIRMADA).count() == 2

    def test_confirmar_carimba_a_data(self, cliente, admin):
        doacao = Doacao.objects.create(
            nome="A", email="a@a.com", valor="10.00", forma_pagamento="PIX"
        )
        assert doacao.confirmado_em is None
        autenticar(cliente, admin)

        cliente.post(f"{URL_ADMIN}confirmar/", {"ids": [doacao.id]}, format="json")

        doacao.refresh_from_db()
        assert doacao.confirmado_em is not None

    def test_acao_de_cancelar(self, cliente, admin):
        doacao = Doacao.objects.create(
            nome="A", email="a@a.com", valor="10.00", forma_pagamento="PIX"
        )
        autenticar(cliente, admin)

        cliente.post(f"{URL_ADMIN}cancelar/", {"ids": [doacao.id]}, format="json")

        doacao.refresh_from_db()
        assert doacao.status == Doacao.Status.CANCELADA

    def test_criar_pelo_admin_nasce_confirmada(self, cliente, admin):
        """Quem cadastra pelo painel ja conferiu no extrato."""
        autenticar(cliente, admin)

        cliente.post(URL_ADMIN, PAGAMENTO, format="json")

        doacao = Doacao.objects.get()
        assert doacao.status == Doacao.Status.CONFIRMADA
        assert doacao.confirmado_em is not None


class TestAnonimo:
    def test_anonimo_exibido_como_anonimo(self):
        doacao = Doacao.objects.create(
            nome="Fulano",
            email="f@e.com",
            anonimo=True,
            valor="10.00",
            forma_pagamento="PIX",
        )

        assert doacao.nome_exibido == "Anônimo"

    def test_identificado_mostra_o_nome(self):
        doacao = Doacao.objects.create(
            nome="Fulano", email="f@e.com", valor="10.00", forma_pagamento="PIX"
        )

        assert doacao.nome_exibido == "Fulano"

    def test_dado_e_gravado_mesmo_anonimo(self, cliente):
        """Decisão do time: grava para emitir recibo, mas não exibe."""
        cliente.post(URL_CRIAR, {**PAGAMENTO, "anonimo": True}, format="json")

        doacao = Doacao.objects.get()
        assert doacao.anonimo is True
        assert doacao.email == "maria@exemplo.com"


class TestOrdenacao:
    def test_mais_recentes_primeiro(self, cliente):
        Doacao.objects.create(
            nome="Velho",
            email="v@e.com",
            valor="1.00",
            forma_pagamento="PIX",
            status=Doacao.Status.CONFIRMADA,
        )
        Doacao.objects.create(
            nome="Novo",
            email="n@e.com",
            valor="2.00",
            forma_pagamento="PIX",
            status=Doacao.Status.CONFIRMADA,
        )

        response = cliente.get(URL_PUBLICO)

        assert response.data[0]["valor"] == "2.00"
