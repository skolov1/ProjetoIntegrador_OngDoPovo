"""
Testes da "Visão geral" do painel: totais e alertas, só com números (nunca nomes).

Rodar: pytest
"""

import itertools
from datetime import date, timedelta

import pytest
from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APIClient

from .fabricas import criar_turma
from .models import (
    Aluno,
    AtividadeAvulsa,
    DoacaoItem,
    Emprestimo,
    Presenca,
    Professor,
)

pytestmark = pytest.mark.django_db

URL = "/api/v1/visao-geral/"

_cpfs = itertools.count(10)


@pytest.fixture
def staff():
    usuario = User.objects.create_user(username="gestor", password="SenhaForte@123", is_staff=True)
    cliente = APIClient()
    cliente.force_authenticate(usuario)
    return cliente


def hoje() -> date:
    return timezone.localdate()


def aluno(nome="Ana", turma=None, ativo=True) -> Aluno:
    novo = Aluno.objects.create(nome=nome, data_nascimento=date(2010, 1, 1), ativo=ativo)
    if turma is not None:
        novo.turmas.add(turma)
    return novo


def professor(turma, ativo=True) -> Professor:
    novo = Professor.objects.create(nome="Mestre", cpf=f"{next(_cpfs):011d}", ativo=ativo)
    novo.turmas.add(turma)
    return novo


def turma(nome="Futsal", **extra):
    # Começou há 30 dias, para já valer como turma em andamento.
    extra.setdefault("data_inicio", hoje() - timedelta(days=30))
    return criar_turma(nome, **extra)


def presencas(a, t, situacoes_recentes_primeiro):
    """Registra uma presença por dia, a mais recente primeiro na lista (hoje, ontem...)."""
    for i, situacao in enumerate(situacoes_recentes_primeiro):
        dia = hoje() - timedelta(days=i)
        Presenca.objects.create(aluno=a, turma=t, data=dia, situacao=situacao)


class TestAcesso:
    def test_sem_login_e_recusado(self):
        assert APIClient().get(URL).status_code in (401, 403)

    def test_usuario_comum_e_recusado(self):
        comum = User.objects.create_user(username="comum", password="SenhaForte@123")
        cliente = APIClient()
        cliente.force_authenticate(comum)

        assert cliente.get(URL).status_code == 403

    def test_equipe_acessa(self, staff):
        assert staff.get(URL).status_code == 200


class TestTotais:
    def test_banco_vazio_zera_tudo(self, staff):
        dados = staff.get(URL).data

        assert dados["totais"] == {
            "alunos_ativos": 0,
            "turmas_ativas": 0,
            "professores_ativos": 0,
            "eventos_servicos_ativos": 0,
            "frequencia_mes": None,
            "itens_emprestados": 0,
        }
        assert dados["alertas"] == {
            "faltantes": 0,
            "emprestimos_atrasados": 0,
            "turmas_sem_professor": 0,
            "alunos_sem_turma": 0,
        }

    def test_conta_so_alunos_turmas_e_professores_ativos(self, staff):
        t = turma()
        turma("Judô", ativo=False)
        aluno("Ana", t)
        aluno("Bia", t, ativo=False)
        professor(t)
        professor(t, ativo=False)

        totais = staff.get(URL).data["totais"]

        assert (totais["alunos_ativos"], totais["turmas_ativas"], totais["professores_ativos"]) == (
            1,
            1,
            1,
        )

    def test_turma_ja_encerrada_nao_conta_como_ativa(self, staff):
        turma("Antiga", data_fim=hoje() - timedelta(days=1))
        turma("Atual")

        assert staff.get(URL).data["totais"]["turmas_ativas"] == 1

    def test_eventos_e_servicos_contam_agendados_e_abertos(self, staff):
        AtividadeAvulsa.objects.create(nome="Campanha", tipo="CAMPANHA", status="ABERTO")
        AtividadeAvulsa.objects.create(nome="Feira", tipo="EVENTO", status="AGENDADO")
        AtividadeAvulsa.objects.create(nome="Antigo", tipo="EVENTO", status="ENCERRADO")

        assert staff.get(URL).data["totais"]["eventos_servicos_ativos"] == 2

    def test_itens_emprestados_somam_as_quantidades_ainda_nao_devolvidas(self, staff):
        doacao = DoacaoItem.objects.create(item="MULETAS", quantidade=10)
        Emprestimo.objects.create(doacao=doacao, quantidade=2, pessoa_nome="João")
        Emprestimo.objects.create(doacao=doacao, quantidade=3, pessoa_nome="Maria")
        Emprestimo.objects.create(
            doacao=doacao, quantidade=4, pessoa_nome="Zé", devolvido_em=hoje()
        )

        assert staff.get(URL).data["totais"]["itens_emprestados"] == 5


class TestFrequenciaDoMes:
    def test_sem_nenhuma_chamada_no_mes_vem_nulo(self, staff):
        assert staff.get(URL).data["totais"]["frequencia_mes"] is None

    def test_percentual_de_presentes_ignorando_justificadas(self, staff):
        t = turma()
        a = aluno("Ana", t)
        # Mesmo dia da semana não importa: um registro por dia, todos no mês corrente.
        inicio_do_mes = hoje().replace(day=1)
        situacoes = ["PRESENTE", "PRESENTE", "PRESENTE", "AUSENTE", "JUSTIFICADO"]
        for i, situacao in enumerate(situacoes):
            Presenca.objects.create(
                aluno=a, turma=t, data=inicio_do_mes + timedelta(days=i), situacao=situacao
            )

        # 3 presentes / (3 presentes + 1 ausente); a justificada não entra na conta.
        assert staff.get(URL).data["totais"]["frequencia_mes"] == 75

    def test_chamadas_de_outros_meses_nao_entram(self, staff):
        t = turma()
        a = aluno("Ana", t)
        Presenca.objects.create(
            aluno=a, turma=t, data=hoje().replace(day=1) - timedelta(days=1), situacao="AUSENTE"
        )

        assert staff.get(URL).data["totais"]["frequencia_mes"] is None


class TestAlertas:
    def test_faltante_tem_tres_faltas_seguidas(self, staff):
        t = turma()
        presencas(aluno("Ana", t), t, ["AUSENTE", "AUSENTE", "AUSENTE"])
        presencas(aluno("Bia", t), t, ["AUSENTE", "AUSENTE", "PRESENTE"])

        assert staff.get(URL).data["alertas"]["faltantes"] == 1

    def test_justificada_nao_quebra_nem_soma_na_sequencia(self, staff):
        t = turma()
        presencas(aluno("Ana", t), t, ["AUSENTE", "JUSTIFICADO", "AUSENTE", "AUSENTE"])

        assert staff.get(URL).data["alertas"]["faltantes"] == 1

    def test_aluno_faltante_em_duas_turmas_conta_uma_vez(self, staff):
        t1, t2 = turma("Futsal"), turma("Muay Thai")
        a = aluno("Ana", t1)
        a.turmas.add(t2)
        presencas(a, t1, ["AUSENTE"] * 3)
        presencas(a, t2, ["AUSENTE"] * 3)

        assert staff.get(URL).data["alertas"]["faltantes"] == 1

    def test_aluno_inativo_nao_e_faltante(self, staff):
        t = turma()
        presencas(aluno("Ana", t, ativo=False), t, ["AUSENTE"] * 3)

        assert staff.get(URL).data["alertas"]["faltantes"] == 0

    def test_faltas_numa_turma_que_o_aluno_deixou_nao_contam(self, staff):
        t = turma()
        a = aluno("Ana")  # nunca foi matriculada nesta turma
        presencas(a, t, ["AUSENTE"] * 3)

        assert staff.get(URL).data["alertas"]["faltantes"] == 0

    def test_emprestimo_atrasado_passou_do_prazo_e_nao_foi_devolvido(self, staff):
        doacao = DoacaoItem.objects.create(item="MULETAS", quantidade=5)
        antigo = Emprestimo.limite_atraso() - timedelta(days=1)
        Emprestimo.objects.create(doacao=doacao, pessoa_nome="João", emprestado_em=antigo)
        Emprestimo.objects.create(
            doacao=doacao, pessoa_nome="Maria", emprestado_em=antigo, devolvido_em=hoje()
        )
        Emprestimo.objects.create(doacao=doacao, pessoa_nome="Zé")  # emprestado hoje

        assert staff.get(URL).data["alertas"]["emprestimos_atrasados"] == 1

    def test_turma_sem_professor_ativo(self, staff):
        sem = turma("Sem professor")
        com = turma("Com professor")
        professor(com)
        com_inativo = turma("Professor inativo")
        professor(com_inativo, ativo=False)
        assert sem is not None

        assert staff.get(URL).data["alertas"]["turmas_sem_professor"] == 2

    def test_turma_que_ainda_nao_comecou_ou_inativa_nao_e_alerta(self, staff):
        turma("Futura", data_inicio=hoje() + timedelta(days=10))
        turma("Parada", ativo=False)

        assert staff.get(URL).data["alertas"]["turmas_sem_professor"] == 0

    def test_alunos_ativos_sem_turma(self, staff):
        t = turma()
        aluno("Sem turma")
        aluno("Inativo sem turma", ativo=False)
        aluno("Matriculada", t)

        assert staff.get(URL).data["alertas"]["alunos_sem_turma"] == 1


class TestPrivacidade:
    def test_a_resposta_so_tem_numeros_nunca_nomes(self, staff):
        t = turma("Futsal Sub-10")
        a = aluno("Ana Souza Lima", t)
        presencas(a, t, ["AUSENTE"] * 3)
        professor(t)

        corpo = str(staff.get(URL).data)

        assert "Ana Souza Lima" not in corpo
        assert "Futsal Sub-10" not in corpo
