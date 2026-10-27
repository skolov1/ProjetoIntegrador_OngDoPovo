"""
Testes da auditoria: quem criou, alterou ou excluiu cada registro do painel.

O login é por JWT e a autenticação acontece dentro da view do DRF (depois do
middleware), então o autor da ação é definido pelas próprias views. Estes testes
garantem que isso não vire "usuário vazio" e que dado pessoal não vaze para o log.

Rodar: pytest
"""

from datetime import date, time

import pytest
from auditlog.models import LogEntry
from django.contrib.auth.models import User
from rest_framework.test import APIClient

from .models import Aluno, DoacaoItem, Emprestimo, Presenca, Turma

pytestmark = pytest.mark.django_db

URL_AUDITORIA = "/api/v1/auditoria/"
CPF_ADULTO = "52998224725"
CPF_RESPONSAVEL = "11144477735"


@pytest.fixture
def maria(db):
    return User.objects.create_user(
        username="maria",
        password="SenhaForte@123",
        first_name="Maria",
        last_name="Silva",
        is_staff=True,
    )


@pytest.fixture
def joao(db):
    return User.objects.create_user(
        username="joao",
        password="SenhaForte@123",
        first_name="João",
        last_name="Souza",
        is_staff=True,
    )


def cliente_de(usuario: User) -> APIClient:
    cliente = APIClient()
    cliente.force_authenticate(usuario)
    return cliente


def registros(modelo: type, acao: int | None = None):
    from django.contrib.contenttypes.models import ContentType

    qs = LogEntry.objects.filter(content_type=ContentType.objects.get_for_model(modelo))
    return qs if acao is None else qs.filter(action=acao)


class TestAutorDaAcao:
    def test_criar_registra_quem_criou(self, maria):
        cliente_de(maria).post(
            "/api/v1/doacoes/itens/", {"item": "MULETAS", "quantidade": 2}, format="json"
        )

        entrada = registros(DoacaoItem, LogEntry.Action.CREATE).get()
        assert entrada.actor == maria

    def test_alterar_registra_quem_alterou_e_o_que_mudou(self, maria, joao):
        doacao = DoacaoItem.objects.create(item="MULETAS", quantidade=2)

        cliente_de(joao).patch(
            f"/api/v1/doacoes/itens/{doacao.id}/", {"quantidade": 5}, format="json"
        )

        entrada = registros(DoacaoItem, LogEntry.Action.UPDATE).get()
        assert entrada.actor == joao
        assert "quantidade" in entrada.changes_dict

    def test_excluir_registra_quem_excluiu(self, maria):
        turma = Turma.objects.create(
            nome="Futsal",
            dia_semana="SEG",
            horario_inicio=time(18, 0),
            horario_fim=time(19, 0),
            data_inicio="2026-01-01",
        )

        cliente_de(maria).delete(f"/api/v1/turmas/{turma.id}/")

        assert registros(Turma, LogEntry.Action.DELETE).get().actor == maria

    def test_cada_pessoa_aparece_na_propria_acao(self, maria, joao):
        cliente_de(maria).post(
            "/api/v1/doacoes/itens/", {"item": "MULETAS", "quantidade": 1}, format="json"
        )
        cliente_de(joao).post(
            "/api/v1/doacoes/itens/", {"item": "CADEIRA_RODAS", "quantidade": 1}, format="json"
        )

        autores = set(registros(DoacaoItem).values_list("actor__username", flat=True))
        assert autores == {"maria", "joao"}

    def test_chamada_em_lote_registra_quem_salvou(self, maria):
        turma = Turma.objects.create(
            nome="Futsal",
            dia_semana="SEG",
            horario_inicio=time(18, 0),
            horario_fim=time(19, 0),
            data_inicio="2026-01-01",
        )
        aluno = Aluno.objects.create(nome="Carlos", data_nascimento=date(1990, 3, 1))
        aluno.turmas.add(turma)

        cliente_de(maria).post(
            "/api/v1/presencas/lote/",
            {
                "turma": turma.id,
                "data": "2026-10-20",
                "presencas": [{"aluno_id": aluno.id, "situacao": "PRESENTE"}],
            },
            format="json",
        )

        assert registros(Presenca, LogEntry.Action.CREATE).get().actor == maria

    def test_acao_fora_do_painel_fica_sem_autor(self):
        DoacaoItem.objects.create(item="MULETAS", quantidade=1)

        assert registros(DoacaoItem).get().actor is None


class TestDadoPessoalNoLog:
    def adulto(self):
        return {"nome": "Carlos Adulto", "data_nascimento": "1990-03-01", "cpf": CPF_ADULTO}

    def test_cpf_nunca_aparece_no_log(self, maria):
        cliente_de(maria).post("/api/v1/alunos/", self.adulto(), format="json")

        entrada = registros(Aluno, LogEntry.Action.CREATE).get()
        assert CPF_ADULTO not in entrada.changes_str
        assert "52998224725" not in str(entrada.changes)
        # Mas fica claro que o campo foi preenchido.
        assert "cpf" in entrada.changes_dict

    def test_telefone_e_cpf_do_responsavel_ficam_ocultos(self, maria):
        cliente_de(maria).post(
            "/api/v1/alunos/",
            {
                "nome": "Ana Menor",
                "data_nascimento": "2015-05-10",
                "nome_responsavel": "Maria Mae",
                "cpf_responsavel": CPF_RESPONSAVEL,
                "telefone_responsavel": "(13) 98888-7777",
                "consentimento_responsavel": True,
            },
            format="json",
        )

        texto = " ".join(e.changes_str for e in registros(Aluno))
        assert CPF_RESPONSAVEL not in texto
        assert "98888-7777" not in texto
        assert "98888" not in texto

    def test_excluir_aluno_apaga_nome_e_dados_do_log(self, maria):
        resposta = cliente_de(maria).post(
            "/api/v1/alunos/",
            {
                "nome": "Ana Menor",
                "data_nascimento": "2015-05-10",
                "nome_responsavel": "Maria Mae",
                "cpf_responsavel": CPF_RESPONSAVEL,
                "telefone_responsavel": "(13) 98888-7777",
                "consentimento_responsavel": True,
            },
            format="json",
        )
        aluno_id = resposta.data["id"]
        turma = Turma.objects.create(
            nome="Futsal",
            dia_semana="SEG",
            horario_inicio=time(18, 0),
            horario_fim=time(19, 0),
            data_inicio="2026-01-01",
        )
        Presenca.objects.create(aluno_id=aluno_id, turma=turma, data=date(2026, 10, 20))

        cliente_de(maria).delete(f"/api/v1/alunos/{aluno_id}/")

        tudo = LogEntry.objects.all()
        for entrada in tudo:
            assert "Ana" not in entrada.object_repr
            assert "Ana" not in entrada.changes_str
        # Quem excluiu e quando continua registrado.
        exclusao = registros(Aluno, LogEntry.Action.DELETE).get()
        assert exclusao.actor == maria
        assert "excluído" in exclusao.object_repr


class TestEndpointAuditoria:
    def test_so_a_equipe_acessa(self, db):
        comum = User.objects.create_user(username="comum", password="SenhaForte@123")

        assert APIClient().get(URL_AUDITORIA).status_code in (401, 403)
        assert cliente_de(comum).get(URL_AUDITORIA).status_code == 403

    def test_lista_com_nome_completo_acao_e_tipo(self, maria):
        cliente_de(maria).post(
            "/api/v1/doacoes/itens/", {"item": "MULETAS", "quantidade": 2}, format="json"
        )

        resposta = cliente_de(maria).get(URL_AUDITORIA)

        assert resposta.status_code == 200
        linha = resposta.data["results"][0]
        assert linha["usuario_nome"] == "Maria Silva"
        assert linha["acao"] == "CRIOU"
        assert linha["acao_rotulo"] == "Criou"
        assert linha["tipo"] == "Doação de item"
        assert "Muletas" in linha["objeto"]
        assert "quantidade" in linha["mudancas"]

    def test_sem_autor_aparece_como_sistema(self, maria):
        DoacaoItem.objects.create(item="MULETAS", quantidade=1)

        linha = cliente_de(maria).get(URL_AUDITORIA).data["results"][0]

        assert linha["usuario_nome"] == "Sistema"
        assert linha["usuario_id"] is None

    def test_mais_recente_primeiro(self, maria):
        c = cliente_de(maria)
        c.post("/api/v1/doacoes/itens/", {"item": "MULETAS", "quantidade": 1}, format="json")
        c.post("/api/v1/doacoes/itens/", {"item": "CADEIRA_RODAS", "quantidade": 1}, format="json")

        objetos = [r["objeto"] for r in c.get(URL_AUDITORIA).data["results"]]

        assert "Cadeira de rodas" in objetos[0]

    def test_filtra_por_usuario_acao_e_tipo(self, maria, joao):
        cliente_de(maria).post(
            "/api/v1/doacoes/itens/", {"item": "MULETAS", "quantidade": 1}, format="json"
        )
        doacao = DoacaoItem.objects.get()
        cliente_de(joao).patch(
            f"/api/v1/doacoes/itens/{doacao.id}/", {"quantidade": 3}, format="json"
        )
        cliente_de(joao).post(
            "/api/v1/turmas/",
            {
                "nome": "Futsal",
                "dia_semana": "SEG",
                "horario_inicio": "18:00",
                "horario_fim": "19:00",
                "data_inicio": "2026-01-01",
            },
            format="json",
        )
        c = cliente_de(maria)

        def total(**filtros):
            return c.get(URL_AUDITORIA, filtros).data["count"]

        assert total(usuario=joao.id) == 2
        assert total(usuario=maria.id) == 1
        assert total(acao="ALTEROU") == 1
        assert total(acao="CRIOU") == 2
        assert total(tipo="turma") == 1
        assert total(usuario=joao.id, tipo="doacaoitem") == 1

    def test_nao_lista_o_proprio_log_nem_outros_apps(self, maria):
        # O usuário em si (auth.User) não é auditado: o log mostra só dados da ONG.
        User.objects.create_user(username="novo", password="SenhaForte@123")

        assert cliente_de(maria).get(URL_AUDITORIA).data["count"] == 0

    def test_nao_aceita_escrita(self, maria):
        c = cliente_de(maria)

        assert c.post(URL_AUDITORIA, {}, format="json").status_code == 405


class TestUsuarioLogado:
    def test_me_devolve_nome_completo_e_tipo_de_conta(self, maria):
        resposta = cliente_de(maria).get("/api/v1/auth/me/")

        assert resposta.status_code == 200
        assert resposta.data["name"] == "Maria Silva"
        assert resposta.data["tipo_conta"] == "Administrador"

    def test_login_devolve_tipo_de_conta(self, maria):
        resposta = APIClient().post(
            "/api/v1/auth/token/",
            {"username": "maria", "password": "SenhaForte@123"},
            format="json",
        )

        assert resposta.data["user"]["tipo_conta"] == "Administrador"
        assert resposta.data["user"]["name"] == "Maria Silva"


class TestEmprestimoNaAuditoria:
    def test_emprestimo_aparece_com_quem_registrou(self, maria):
        doacao = DoacaoItem.objects.create(item="MULETAS", quantidade=3)

        cliente_de(maria).post(
            "/api/v1/doacoes/emprestimos/",
            {"doacao": doacao.id, "pessoa_nome": "Seu João", "quantidade": 1},
            format="json",
        )

        entrada = registros(Emprestimo, LogEntry.Action.CREATE).get()
        assert entrada.actor == maria
