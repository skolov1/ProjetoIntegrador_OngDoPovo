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

from .documentos import cpf_valido, mascarar_cpf, telefone_valido
from .models import Aluno, Consentimento, Doacao, Turma

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


class TestPreCadastroPublicoRemovido:
    """A inscrição virou mensagem de WhatsApp: ninguém cria aluno sem ser staff."""

    ALUNO = {
        "nome": "Ana Souza",
        "data_nascimento": "2015-05-10",
        "sexo": "F",
        "rg": "123456789",
        "cpf": "12345678900",
    }

    @pytest.mark.parametrize("url", ["/api/v1/alunos/pre-cadastro/", "/api/v1/alunos/"])
    def test_anonimo_nao_cria_aluno(self, cliente, url):
        response = cliente.post(url, self.ALUNO, format="json")

        assert response.status_code in (401, 403, 404, 405)
        assert Aluno.objects.count() == 0

    def test_usuario_sem_staff_nao_cria_aluno(self, cliente, nao_admin):
        autenticar(cliente, nao_admin)

        response = cliente.post("/api/v1/alunos/", self.ALUNO, format="json")

        assert response.status_code == 403
        assert Aluno.objects.count() == 0


# 52998224725 e 11144477735 são CPFs com dígitos verificadores válidos.
CPF_OK = "52998224725"
CPF_RESP = "11144477735"


class TestDocumentos:
    @pytest.mark.parametrize("cpf", [CPF_OK, "529.982.247-25", CPF_RESP])
    def test_cpf_valido(self, cpf):
        assert cpf_valido(cpf)

    @pytest.mark.parametrize("cpf", ["12345678900", "11111111111", "5299822472", "", "abc"])
    def test_cpf_invalido(self, cpf):
        assert not cpf_valido(cpf)

    def test_mascara_do_cpf(self):
        assert mascarar_cpf("12345678900") == "123.***.***-00"
        assert mascarar_cpf("123.456.789-00") == "123.***.***-00"

    @pytest.mark.parametrize("tel", ["13988887777", "(13) 98888-7777", "1332221111"])
    def test_telefone_valido(self, tel):
        assert telefone_valido(tel)

    @pytest.mark.parametrize("tel", ["98888", "03988887777", "139888877778", ""])
    def test_telefone_invalido(self, tel):
        assert not telefone_valido(tel)


class TestAlunoLGPD:
    URL = "/api/v1/alunos/"

    @pytest.fixture
    def staff(self, cliente, admin):
        # O login é limitado por throttle; aqui o foco é a regra do aluno.
        cliente.force_authenticate(admin)
        return cliente

    def maior(self, **extra):
        return {
            "nome": "Carlos Adulto",
            "data_nascimento": "1990-03-01",
            "cpf": CPF_OK,
            **extra,
        }

    def menor(self, **extra):
        return {
            "nome": "Ana Menor",
            "data_nascimento": "2015-05-10",
            "nome_responsavel": "Maria Mae",
            "cpf_responsavel": CPF_RESP,
            "telefone_responsavel": "(13) 98888-7777",
            "consentimento_responsavel": True,
            **extra,
        }

    def test_maior_cadastra_sem_responsavel_e_sem_consentimento(self, staff):
        response = staff.post(self.URL, self.maior(), format="json")

        assert response.status_code == 201
        assert response.data["cpf"] == CPF_OK
        assert Consentimento.objects.count() == 0

    def test_cpf_invalido_e_recusado(self, staff):
        response = staff.post(self.URL, self.maior(cpf="12345678900"), format="json")

        assert response.status_code == 400
        assert "cpf" in response.data

    def test_menor_sem_consentimento_nao_salva(self, staff):
        response = staff.post(
            self.URL, self.menor(consentimento_responsavel=False), format="json"
        )

        assert response.status_code == 400
        assert "consentimento_responsavel" in response.data
        assert Aluno.objects.count() == 0

    def test_menor_sem_responsavel_nao_salva(self, staff):
        dados = self.menor()
        for campo in ("nome_responsavel", "cpf_responsavel", "telefone_responsavel"):
            dados.pop(campo)

        response = staff.post(self.URL, dados, format="json")

        assert response.status_code == 400
        assert {"nome_responsavel", "cpf_responsavel", "telefone_responsavel"} <= set(
            response.data
        )

    def test_telefone_do_responsavel_invalido(self, staff):
        response = staff.post(
            self.URL, self.menor(telefone_responsavel="123"), format="json"
        )

        assert response.status_code == 400
        assert "telefone_responsavel" in response.data

    def test_menor_grava_consentimento_e_nao_guarda_cpf_proprio(self, staff):
        response = staff.post(self.URL, self.menor(cpf=CPF_OK), format="json")

        assert response.status_code == 201
        aluno = Aluno.objects.get()
        assert aluno.cpf is None
        assert aluno.cpf_responsavel == CPF_RESP
        consentimento = Consentimento.objects.get()
        assert consentimento.aluno == aluno
        assert consentimento.responsavel_nome == "Maria Mae"
        assert consentimento.versao_termo

    def test_editar_menor_ja_autorizado_nao_pede_nem_duplica_consentimento(self, staff):
        criado = staff.post(self.URL, self.menor(), format="json").data

        response = staff.patch(
            f"{self.URL}{criado['id']}/", {"sexo": "F"}, format="json"
        )

        assert response.status_code == 200
        assert Consentimento.objects.count() == 1

    def test_listagem_mascara_cpf_do_maior_e_omite_o_do_menor(self, staff):
        staff.post(self.URL, self.maior(), format="json")
        staff.post(self.URL, self.menor(), format="json")

        itens = {a["nome"]: a for a in staff.get(self.URL).data["results"]}

        assert itens["Carlos Adulto"]["cpf_mascarado"] == "529.***.***-25"
        assert itens["Ana Menor"]["cpf_mascarado"] is None
        for item in itens.values():
            assert "cpf" not in item
            assert "cpf_responsavel" not in item

    def test_cadastro_completo_traz_o_cpf_completo(self, staff):
        criado = staff.post(self.URL, self.maior(), format="json").data

        assert staff.get(f"{self.URL}{criado['id']}/").data["cpf"] == CPF_OK

    @pytest.mark.parametrize("campo", ["cpf", "rg"])
    def test_busca_nao_aceita_documento(self, staff, campo):
        staff.post(self.URL, self.maior(rg="998877"), format="json")
        termo = CPF_OK if campo == "cpf" else "998877"

        assert staff.get(self.URL, {"search": termo}).data["count"] == 0

    @pytest.mark.parametrize(
        ("exame", "validade", "esperado"),
        [
            ("pendente", None, "ausente"),
            ("nao_apto", None, "nao_apto"),
            ("apto", "2000-01-01", "vencido"),
            ("apto", "2999-01-01", "valido"),
            ("apto", None, "valido"),
        ],
    )
    def test_situacao_do_exame_do_menor(self, staff, exame, validade, esperado):
        criado = staff.post(
            self.URL,
            self.menor(exame_aptidao=exame, exame_validade=validade),
            format="json",
        ).data

        assert criado["exame_situacao"] == esperado

    def test_exame_nao_se_aplica_ao_maior(self, staff):
        criado = staff.post(self.URL, self.maior(), format="json").data

        assert criado["exame_situacao"] is None

    def turma(self, nome):
        return Turma.objects.create(
            nome=nome,
            dia_semana="SEG",
            horario_inicio="08:00",
            horario_fim="09:00",
            data_inicio="2026-01-01",
        )

    def test_mensalidade_e_20_por_turma(self, staff):
        t1, t2, t3 = self.turma("Muay Thai"), self.turma("Judô"), self.turma("Violão")

        sem_turma = staff.post(self.URL, self.maior(), format="json").data
        duas = staff.post(
            self.URL,
            self.maior(nome="Duas", cpf=CPF_RESP, turmas=[t1.id, t2.id]),
            format="json",
        ).data

        assert sem_turma["mensalidade"] == "0.00"
        assert duas["mensalidade"] == "40.00"

        editado = staff.patch(
            f"{self.URL}{duas['id']}/", {"turmas": [t1.id, t2.id, t3.id]}, format="json"
        ).data
        assert editado["mensalidade"] == "60.00"
        assert set(editado["turmas_nomes"]) == {"Muay Thai", "Judô", "Violão"}

    def test_mensalidade_enviada_pelo_cliente_e_ignorada(self, staff):
        t1 = self.turma("Muay Thai")

        criado = staff.post(
            self.URL, self.maior(turmas=[t1.id], mensalidade="1.00"), format="json"
        ).data

        assert criado["mensalidade"] == "20.00"

    def test_listagem_traz_turmas_e_mensalidade(self, staff):
        t1, t2 = self.turma("Muay Thai"), self.turma("Judô")
        staff.post(self.URL, self.maior(turmas=[t1.id, t2.id]), format="json")

        item = staff.get(self.URL).data["results"][0]

        assert item["mensalidade"] == "40.00"
        assert set(item["turmas_nomes"]) == {"Muay Thai", "Judô"}

    def test_filtra_alunos_por_turma(self, staff):
        t1, t2 = self.turma("Muay Thai"), self.turma("Judô")
        staff.post(self.URL, self.maior(turmas=[t1.id]), format="json")
        staff.post(
            self.URL, self.maior(nome="Outro", cpf=CPF_RESP, turmas=[t2.id]), format="json"
        )

        resposta = staff.get(self.URL, {"turmas": t2.id}).data

        assert [a["nome"] for a in resposta["results"]] == ["Outro"]
