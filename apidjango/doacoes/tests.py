"""
Testes do painel: doações de itens, alunos (LGPD), turmas e as rotas removidas.

Rodar: pytest
"""

import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient

from .documentos import cpf_valido, mascarar_cpf, telefone_valido
from .faltas import eh_faltante, faltas_seguidas
from .models import Aluno, Consentimento, DoacaoItem, Presenca, Turma

pytestmark = pytest.mark.django_db

URL_CRIAR = "/api/v1/doacoes/"
URL_PUBLICO = "/api/v1/doacoes/publico/"
URL_RESUMO = "/api/v1/doacoes/resumo/"
URL_ADMIN = "/api/v1/doacoes/admin/"

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
# As rotas de doação em dinheiro saíram (painel e públicas)
# --------------------------------------------------------------------------- #


class TestRotasDeDinheiroRemovidas:
    @pytest.mark.parametrize(
        "caminho",
        [URL_CRIAR, URL_PUBLICO, URL_RESUMO, URL_ADMIN, f"{URL_ADMIN}1/", f"{URL_ADMIN}confirmar/"],
    )
    def test_nao_existem_mais(self, cliente, admin, caminho):
        for logado in (False, True):
            if logado:
                cliente.force_authenticate(admin)
            for metodo in (cliente.get, cliente.post):
                assert metodo(caminho).status_code == 404


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

    def test_campo_mensalidade_efetiva_nao_e_gravavel(self, staff):
        t1 = self.turma("Muay Thai")

        criado = staff.post(
            self.URL, self.maior(turmas=[t1.id], mensalidade="1.00"), format="json"
        ).data

        assert criado["mensalidade"] == "20.00"

    def test_mensalidade_personalizada_vale_no_lugar_do_calculo(self, staff):
        t1, t2 = self.turma("Muay Thai"), self.turma("Judô")

        criado = staff.post(
            self.URL,
            self.maior(turmas=[t1.id, t2.id], mensalidade_personalizada="30.00"),
            format="json",
        ).data

        assert criado["mensalidade"] == "30.00"
        assert criado["mensalidade_calculada"] == "40.00"
        assert criado["mensalidade_personalizada"] == "30.00"

    def test_personalizada_pode_ser_zero_para_isencao(self, staff):
        t1 = self.turma("Muay Thai")

        criado = staff.post(
            self.URL,
            self.maior(turmas=[t1.id], mensalidade_personalizada="0.00"),
            format="json",
        ).data

        assert criado["mensalidade"] == "0.00"

    def test_limpar_a_personalizada_volta_ao_calculo(self, staff):
        t1 = self.turma("Muay Thai")
        criado = staff.post(
            self.URL,
            self.maior(turmas=[t1.id], mensalidade_personalizada="5.00"),
            format="json",
        ).data

        editado = staff.patch(
            f"{self.URL}{criado['id']}/", {"mensalidade_personalizada": None}, format="json"
        ).data

        assert editado["mensalidade"] == "20.00"

    def test_personalizada_negativa_e_recusada(self, staff):
        response = staff.post(
            self.URL, self.maior(mensalidade_personalizada="-1.00"), format="json"
        )

        assert response.status_code == 400
        assert "mensalidade_personalizada" in response.data

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

    def test_documentos_comecam_pendentes(self, staff):
        criado = staff.post(self.URL, self.maior(), format="json").data

        assert criado["comprovante_residencia"] == "pendente"
        assert criado["titulo_eleitor"] == "pendente"
        assert "Comprovante de residência" in criado["campos_obrigatorios_faltando"]
        assert "Título de eleitor" in criado["campos_obrigatorios_faltando"]

    def test_marcar_documentos_como_entregues(self, staff):
        criado = staff.post(self.URL, self.maior(), format="json").data

        editado = staff.patch(
            f"{self.URL}{criado['id']}/",
            {"comprovante_residencia": "entregue", "titulo_eleitor": "entregue"},
            format="json",
        ).data

        assert editado["comprovante_residencia"] == "entregue"
        assert editado["titulo_eleitor"] == "entregue"
        assert editado["campos_obrigatorios_faltando"] == []

    def test_situacao_de_documento_invalida_e_recusada(self, staff):
        response = staff.post(
            self.URL, self.maior(comprovante_residencia="enviado"), format="json"
        )

        assert response.status_code == 400
        assert "comprovante_residencia" in response.data

    def test_titulo_nao_e_cobrado_do_menor(self, staff):
        criado = staff.post(self.URL, self.menor(), format="json").data

        assert "Título de eleitor" not in criado["campos_obrigatorios_faltando"]

    def test_listagem_traz_documentos_pendentes(self, staff):
        staff.post(self.URL, self.maior(), format="json")
        staff.post(self.URL, self.menor(), format="json")

        itens = {a["nome"]: a for a in staff.get(self.URL).data["results"]}

        assert itens["Carlos Adulto"]["documentos_pendentes"] == [
            "Comprovante de residência",
            "Título de eleitor",
        ]
        # Título de eleitor não é cobrado do menor.
        assert itens["Ana Menor"]["documentos_pendentes"] == ["Comprovante de residência"]

    def test_documentos_em_dia_nao_aparecem_como_pendentes(self, staff):
        staff.post(
            self.URL,
            self.maior(comprovante_residencia="entregue", titulo_eleitor="entregue"),
            format="json",
        )

        item = staff.get(self.URL).data["results"][0]

        assert item["documentos_pendentes"] == []


class TestDoacaoItem:
    URL = "/api/v1/doacoes/itens/"

    @pytest.fixture
    def staff(self, cliente, admin):
        cliente.force_authenticate(admin)
        return cliente

    def test_anonimo_nao_acessa(self, cliente):
        assert cliente.get(self.URL).status_code in (401, 403)
        assert cliente.post(self.URL, {"item": "MULETAS"}, format="json").status_code in (
            401,
            403,
        )

    def test_usuario_sem_staff_nao_acessa(self, cliente, nao_admin):
        cliente.force_authenticate(nao_admin)

        assert cliente.get(self.URL).status_code == 403

    def test_registra_doacao_de_item(self, staff):
        response = staff.post(
            self.URL,
            {"item": "MULETAS", "quantidade": 2, "doador_nome": "Joana", "observacao": "usadas"},
            format="json",
        )

        assert response.status_code == 201
        assert response.data["item_rotulo"] == "Muletas"
        assert response.data["doador_exibido"] == "Joana"
        assert DoacaoItem.objects.count() == 1

    def test_doador_vazio_aparece_como_anonimo(self, staff):
        response = staff.post(self.URL, {"item": "ALIMENTOS", "quantidade": 5}, format="json")

        assert response.data["doador_exibido"] == "Anônimo"

    @pytest.mark.parametrize("item", ["DINHEIRO", "PIX", "", "BOLA"])
    def test_so_aceita_os_itens_da_pagina(self, staff, item):
        response = staff.post(self.URL, {"item": item, "quantidade": 1}, format="json")

        assert response.status_code == 400
        assert "item" in response.data

    @pytest.mark.parametrize("quantidade", [0, -1])
    def test_quantidade_precisa_ser_positiva(self, staff, quantidade):
        response = staff.post(
            self.URL, {"item": "MULETAS", "quantidade": quantidade}, format="json"
        )

        assert response.status_code == 400
        assert "quantidade" in response.data

    def test_resumo_soma_por_item_e_lista_os_zerados(self, staff):
        DoacaoItem.objects.create(item="MULETAS", quantidade=2)
        DoacaoItem.objects.create(item="MULETAS", quantidade=3)
        DoacaoItem.objects.create(item="ALIMENTOS", quantidade=10)

        totais = {r["item"]: r["total"] for r in staff.get(self.URL + "resumo/").data}

        assert totais == {
            "ALIMENTOS": 10,
            "CADEIRA_RODAS": 0,
            "MULETAS": 5,
            "CADEIRA_BANHO": 0,
            "OUTRO": 0,
        }

    def test_filtra_por_item_e_edita_e_exclui(self, staff):
        a = DoacaoItem.objects.create(item="MULETAS", quantidade=1)
        DoacaoItem.objects.create(item="ALIMENTOS", quantidade=1)

        assert staff.get(self.URL, {"item": "MULETAS"}).data["count"] == 1
        assert staff.patch(f"{self.URL}{a.id}/", {"quantidade": 4}, format="json").data[
            "quantidade"
        ] == 4
        assert staff.delete(f"{self.URL}{a.id}/").status_code == 204
        assert DoacaoItem.objects.count() == 1

    def test_item_outro_usa_o_texto_escrito(self, staff):
        response = staff.post(
            self.URL,
            {"item": "OUTRO", "item_descricao": "Bola de futsal", "quantidade": 3},
            format="json",
        )

        assert response.status_code == 201
        assert response.data["item_rotulo"] == "Bola de futsal"

    def test_item_outro_exige_descricao(self, staff):
        response = staff.post(
            self.URL, {"item": "OUTRO", "item_descricao": "  ", "quantidade": 1}, format="json"
        )

        assert response.status_code == 400
        assert "item_descricao" in response.data

    @pytest.mark.parametrize("texto", ["Dinheiro", "pix de 50", "R$ 20", "100 reais"])
    def test_item_outro_nao_aceita_dinheiro(self, staff, texto):
        response = staff.post(
            self.URL, {"item": "OUTRO", "item_descricao": texto, "quantidade": 1}, format="json"
        )

        assert response.status_code == 400
        assert "item_descricao" in response.data

    def test_descricao_e_ignorada_quando_o_item_nao_e_outro(self, staff):
        response = staff.post(
            self.URL,
            {"item": "MULETAS", "item_descricao": "qualquer coisa", "quantidade": 1},
            format="json",
        )

        assert response.data["item_descricao"] == ""
        assert response.data["item_rotulo"] == "Muletas"


class TestFaltasSeguidas:
    """Regra do faltante: 3 faltas seguidas; justificada é ignorada (não soma nem quebra)."""

    @pytest.mark.parametrize(
        ("historico", "esperado"),
        [
            ([], 0),
            (["PRESENTE"], 0),
            (["AUSENTE"], 1),
            (["AUSENTE", "AUSENTE", "PRESENTE", "AUSENTE"], 2),
            (["AUSENTE", "AUSENTE", "AUSENTE"], 3),
            (["AUSENTE", "AUSENTE", "AUSENTE", "PRESENTE"], 3),
            # Justificada no meio não quebra a sequência nem soma.
            (["AUSENTE", "JUSTIFICADO", "AUSENTE", "AUSENTE"], 3),
            (["JUSTIFICADO", "JUSTIFICADO"], 0),
            (["PRESENTE", "AUSENTE", "AUSENTE", "AUSENTE"], 0),
        ],
    )
    def test_conta_as_faltas_mais_recentes(self, historico, esperado):
        assert faltas_seguidas(historico) == esperado

    def test_faltante_com_tres_ou_mais(self):
        assert eh_faltante(["AUSENTE", "AUSENTE", "AUSENTE"])
        assert not eh_faltante(["AUSENTE", "AUSENTE", "PRESENTE"])
        assert not eh_faltante(["AUSENTE", "JUSTIFICADO", "AUSENTE"])


class TestChamada:
    CHAMADA = "/api/v1/presencas/chamada/"
    LOTE = "/api/v1/presencas/lote/"

    @pytest.fixture
    def staff(self, cliente, admin):
        cliente.force_authenticate(admin)
        return cliente

    @pytest.fixture
    def turma(self):
        return Turma.objects.create(
            nome="Muay Thai",
            dia_semana="SEG",
            horario_inicio="19:00",
            horario_fim="20:00",
            data_inicio="2026-01-01",
        )

    def aluno(self, nome, turma, **extra):
        aluno = Aluno.objects.create(nome=nome, data_nascimento="1990-01-01", **extra)
        aluno.turmas.add(turma)
        return aluno

    def registrar(self, aluno, turma, dia, situacao):
        return Presenca.objects.create(aluno=aluno, turma=turma, data=dia, situacao=situacao)

    def test_exige_login_de_admin(self, cliente, nao_admin, turma):
        params = {"turma": turma.id, "data": "2026-10-26"}

        assert cliente.get(self.CHAMADA, params).status_code in (401, 403)
        cliente.force_authenticate(nao_admin)
        assert cliente.get(self.CHAMADA, params).status_code == 403

    def test_lista_so_alunos_ativos_da_turma_em_ordem_alfabetica(self, staff, turma):
        self.aluno("Zeca", turma)
        self.aluno("Ana", turma)
        self.aluno("Inativo", turma, ativo=False)
        Aluno.objects.create(nome="Outra turma", data_nascimento="1990-01-01")

        itens = staff.get(self.CHAMADA, {"turma": turma.id, "data": "2026-10-26"}).data

        assert [i["aluno_nome"] for i in itens] == ["Ana", "Zeca"]

    def test_aluno_sem_registro_vem_sem_situacao_e_sem_falta(self, staff, turma):
        self.aluno("Ana", turma)

        item = staff.get(self.CHAMADA, {"turma": turma.id, "data": "2026-10-26"}).data[0]

        assert item["situacao"] is None
        assert item["faltas_seguidas"] == 0
        assert item["faltante"] is False

    def test_parametros_obrigatorios_e_validos(self, staff, turma):
        assert staff.get(self.CHAMADA).status_code == 400
        assert staff.get(self.CHAMADA, {"turma": turma.id, "data": "ontem"}).status_code == 400
        assert staff.get(self.CHAMADA, {"turma": 999, "data": "2026-10-26"}).status_code == 400

    def test_faltante_com_tres_faltas_seguidas(self, staff, turma):
        ana = self.aluno("Ana", turma)
        for dia in ("2026-10-12", "2026-10-19", "2026-10-26"):
            self.registrar(ana, turma, dia, "AUSENTE")

        item = staff.get(self.CHAMADA, {"turma": turma.id, "data": "2026-10-26"}).data[0]

        assert item["faltas_seguidas"] == 3
        assert item["faltante"] is True

    def test_justificada_nao_conta_para_o_faltante(self, staff, turma):
        ana = self.aluno("Ana", turma)
        self.registrar(ana, turma, "2026-10-12", "AUSENTE")
        self.registrar(ana, turma, "2026-10-19", "JUSTIFICADO")
        self.registrar(ana, turma, "2026-10-26", "AUSENTE")

        item = staff.get(self.CHAMADA, {"turma": turma.id, "data": "2026-10-26"}).data[0]

        assert item["faltas_seguidas"] == 2
        assert item["faltante"] is False

    def test_presenca_zera_a_sequencia(self, staff, turma):
        ana = self.aluno("Ana", turma)
        for dia, sit in (
            ("2026-10-05", "AUSENTE"),
            ("2026-10-12", "AUSENTE"),
            ("2026-10-19", "PRESENTE"),
            ("2026-10-26", "AUSENTE"),
        ):
            self.registrar(ana, turma, dia, sit)

        item = staff.get(self.CHAMADA, {"turma": turma.id, "data": "2026-10-26"}).data[0]

        assert item["faltas_seguidas"] == 1

    def test_historico_so_ate_a_data_consultada(self, staff, turma):
        ana = self.aluno("Ana", turma)
        for dia in ("2026-10-12", "2026-10-19", "2026-10-26"):
            self.registrar(ana, turma, dia, "AUSENTE")

        item = staff.get(self.CHAMADA, {"turma": turma.id, "data": "2026-10-19"}).data[0]

        assert item["faltas_seguidas"] == 2

    def test_faltas_de_outra_turma_nao_contam(self, staff, turma):
        outra = Turma.objects.create(
            nome="Judô",
            dia_semana="TER",
            horario_inicio="18:00",
            horario_fim="19:00",
            data_inicio="2026-01-01",
        )
        ana = self.aluno("Ana", turma)
        for dia in ("2026-10-12", "2026-10-19", "2026-10-26"):
            self.registrar(ana, outra, dia, "AUSENTE")

        item = staff.get(self.CHAMADA, {"turma": turma.id, "data": "2026-10-26"}).data[0]

        assert item["faltas_seguidas"] == 0

    def test_salvar_chamada_em_lote_e_reler(self, staff, turma):
        ana, bia = self.aluno("Ana", turma), self.aluno("Bia", turma)

        response = staff.post(
            self.LOTE,
            {
                "turma": turma.id,
                "data": "2026-10-26",
                "presencas": [
                    {"aluno_id": ana.id, "situacao": "PRESENTE"},
                    {"aluno_id": bia.id, "situacao": "JUSTIFICADO", "observacao": "gripe"},
                ],
            },
            format="json",
        )

        assert response.status_code == 201
        itens = {
            i["aluno_nome"]: i
            for i in staff.get(self.CHAMADA, {"turma": turma.id, "data": "2026-10-26"}).data
        }
        assert itens["Ana"]["situacao"] == "PRESENTE"
        assert itens["Bia"]["situacao"] == "JUSTIFICADO"
        assert itens["Bia"]["observacao"] == "gripe"

    def test_salvar_de_novo_atualiza_sem_duplicar(self, staff, turma):
        ana = self.aluno("Ana", turma)
        corpo = {"turma": turma.id, "data": "2026-10-26"}

        staff.post(
            self.LOTE,
            {**corpo, "presencas": [{"aluno_id": ana.id, "situacao": "AUSENTE"}]},
            format="json",
        )
        staff.post(
            self.LOTE,
            {**corpo, "presencas": [{"aluno_id": ana.id, "situacao": "PRESENTE"}]},
            format="json",
        )

        assert Presenca.objects.count() == 1
        assert Presenca.objects.get().situacao == "PRESENTE"

    @pytest.mark.parametrize("situacao", ["FALTOU", "", "presente"])
    def test_lote_recusa_situacao_invalida(self, staff, turma, situacao):
        ana = self.aluno("Ana", turma)

        response = staff.post(
            self.LOTE,
            {
                "turma": turma.id,
                "data": "2026-10-26",
                "presencas": [{"aluno_id": ana.id, "situacao": situacao}],
            },
            format="json",
        )

        assert response.status_code == 400
        assert Presenca.objects.count() == 0

    def test_lote_recusa_aluno_fora_da_turma_ou_inativo(self, staff, turma):
        de_fora = Aluno.objects.create(nome="De fora", data_nascimento="1990-01-01")
        inativo = self.aluno("Inativo", turma, ativo=False)

        for aluno in (de_fora, inativo):
            response = staff.post(
                self.LOTE,
                {
                    "turma": turma.id,
                    "data": "2026-10-26",
                    "presencas": [{"aluno_id": aluno.id, "situacao": "PRESENTE"}],
                },
                format="json",
            )
            assert response.status_code == 400

        assert Presenca.objects.count() == 0

    def test_lote_recusa_lista_vazia_ou_aluno_repetido(self, staff, turma):
        ana = self.aluno("Ana", turma)
        corpo = {"turma": turma.id, "data": "2026-10-26"}

        vazia = staff.post(self.LOTE, {**corpo, "presencas": []}, format="json")
        repetido = staff.post(
            self.LOTE,
            {
                **corpo,
                "presencas": [
                    {"aluno_id": ana.id, "situacao": "PRESENTE"},
                    {"aluno_id": ana.id, "situacao": "AUSENTE"},
                ],
            },
            format="json",
        )

        assert vazia.status_code == 400
        assert repetido.status_code == 400
