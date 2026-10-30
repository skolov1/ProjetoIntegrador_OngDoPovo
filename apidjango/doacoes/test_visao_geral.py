"""
Testes da "Visão geral" do painel: totais e alertas, só com números (nunca nomes).

Rodar: pytest
"""

import itertools
from datetime import date, timedelta

import pytest
from django.contrib.auth.models import User
from django.core.cache import cache
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
from .visao_geral import LIMITE_DETALHE

pytestmark = pytest.mark.django_db

URL = "/api/v1/visao-geral/"
URL_DETALHES = "/api/v1/visao-geral/detalhes/"

_cpfs = itertools.count(10)


@pytest.fixture(autouse=True)
def cache_limpo():
    """A Visão geral guarda o resultado por alguns segundos; cada teste começa sem isso."""
    cache.clear()
    yield
    cache.clear()


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
        assert dados["frequencia_por_turma"] == []

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


def marcar(a, t, situacoes):
    """Uma presença por dia, a partir do dia 1 do mês corrente (todas dentro do mês)."""
    inicio = hoje().replace(day=1)
    for i, situacao in enumerate(situacoes):
        dia = inicio + timedelta(days=i)
        Presenca.objects.create(aluno=a, turma=t, data=dia, situacao=situacao)


class TestFrequenciaPorTurma:
    def por_turma(self, staff):
        return staff.get(URL).data["frequencia_por_turma"]

    def test_percentual_de_cada_turma_da_menor_para_a_maior(self, staff):
        boa, ruim = turma("Futsal"), turma("Muay Thai")
        marcar(aluno("Ana", boa), boa, ["PRESENTE", "PRESENTE", "PRESENTE", "AUSENTE"])
        marcar(aluno("Bia", ruim), ruim, ["PRESENTE", "AUSENTE"])

        assert self.por_turma(staff) == [
            {"turma_id": ruim.id, "turma": "Muay Thai", "percentual": 50, "registros": 2},
            {"turma_id": boa.id, "turma": "Futsal", "percentual": 75, "registros": 4},
        ]

    def test_empate_desempata_pelo_nome(self, staff):
        b, a = turma("Balé"), turma("Artes")
        marcar(aluno("Ana", b), b, ["PRESENTE"])
        marcar(aluno("Bia", a), a, ["PRESENTE"])

        assert [linha["turma"] for linha in self.por_turma(staff)] == ["Artes", "Balé"]

    def test_justificada_fica_fora_da_conta_e_turma_so_com_justificadas_nao_aparece(self, staff):
        t, so_justificadas = turma("Futsal"), turma("Judô")
        marcar(aluno("Ana", t), t, ["PRESENTE", "JUSTIFICADO", "AUSENTE"])
        marcar(aluno("Bia", so_justificadas), so_justificadas, ["JUSTIFICADO"])

        assert self.por_turma(staff) == [
            {"turma_id": t.id, "turma": "Futsal", "percentual": 50, "registros": 2}
        ]

    def test_turmas_com_o_mesmo_nome_ficam_separadas_pelo_id(self, staff):
        primeira, segunda = turma("Futsal"), turma("Futsal")
        marcar(aluno("Ana", primeira), primeira, ["PRESENTE"])
        marcar(aluno("Bia", segunda), segunda, ["AUSENTE"])

        linhas = self.por_turma(staff)

        assert {(linha["turma_id"], linha["percentual"]) for linha in linhas} == {
            (primeira.id, 100),
            (segunda.id, 0),
        }

    def test_turma_inativa_e_chamada_de_outro_mes_nao_entram(self, staff):
        parada = turma("Parada", ativo=False)
        antiga = turma("Antiga")
        marcar(aluno("Ana", parada), parada, ["AUSENTE"])
        Presenca.objects.create(
            aluno=aluno("Bia", antiga),
            turma=antiga,
            data=hoje().replace(day=1) - timedelta(days=1),
            situacao="AUSENTE",
        )

        assert self.por_turma(staff) == []


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
    def test_a_resposta_nunca_traz_nome_de_aluno_nem_de_professor(self, staff):
        t = turma("Futsal Sub-10")
        a = aluno("Ana Souza Lima", t)
        presencas(a, t, ["AUSENTE"] * 3)
        Professor.objects.create(nome="Mestre Carlos Andrade", cpf="52998224725").turmas.add(t)

        corpo = str(staff.get(URL).data)

        assert "Ana Souza Lima" not in corpo
        assert "Mestre Carlos Andrade" not in corpo


class TestDetalhes:
    """Quem e onde: a lista por trás de cada alerta, para o painel não deixar a pessoa no escuro."""

    def detalhes(self, staff):
        resposta = staff.get(URL_DETALHES)
        assert resposta.status_code == 200
        return resposta.data

    def test_sem_login_e_usuario_comum_sao_recusados(self):
        assert APIClient().get(URL_DETALHES).status_code in (401, 403)
        comum = User.objects.create_user(username="comum", password="SenhaForte@123")
        cliente = APIClient()
        cliente.force_authenticate(comum)
        assert cliente.get(URL_DETALHES).status_code == 403

    def test_sem_nada_a_resolver_todas_as_listas_vem_vazias(self, staff):
        assert self.detalhes(staff) == {
            "faltantes": [],
            "emprestimos_atrasados": [],
            "turmas_sem_professor": [],
            "alunos_sem_turma": [],
        }

    def test_faltantes_trazem_aluno_turma_e_quantas_faltas(self, staff):
        t = turma("Futsal sub 14")
        a = aluno("Ana Souza Lima", t)
        presencas(a, t, ["AUSENTE"] * 4)

        assert self.detalhes(staff)["faltantes"] == [
            {
                "aluno_id": a.id,
                "aluno_nome": "Ana Souza Lima",
                "turma_id": t.id,
                "turma_nome": "Futsal sub 14",
                "faltas_seguidas": 4,
            }
        ]

    def test_aluno_faltante_em_duas_turmas_aparece_uma_vez_por_turma(self, staff):
        t1, t2 = turma("Futsal"), turma("Muay Thai")
        a = aluno("Ana", t1)
        a.turmas.add(t2)
        presencas(a, t1, ["AUSENTE"] * 3)
        presencas(a, t2, ["AUSENTE"] * 5)

        linhas = self.detalhes(staff)["faltantes"]

        # Mais faltas primeiro; cada linha leva à chamada da sua turma.
        assert [(linha["turma_nome"], linha["faltas_seguidas"]) for linha in linhas] == [
            ("Muay Thai", 5),
            ("Futsal", 3),
        ]

    def test_so_entra_quem_e_faltante_de_verdade(self, staff):
        t = turma()
        presencas(aluno("Ana", t), t, ["AUSENTE", "AUSENTE", "PRESENTE"])
        presencas(aluno("Bia", t, ativo=False), t, ["AUSENTE"] * 3)

        assert self.detalhes(staff)["faltantes"] == []

    def test_emprestimos_atrasados_trazem_item_pessoa_e_datas(self, staff):
        doacao = DoacaoItem.objects.create(item="MULETAS", quantidade=5)
        antigo = Emprestimo.limite_atraso() - timedelta(days=1)
        atrasado = Emprestimo.objects.create(
            doacao=doacao, quantidade=2, pessoa_nome="João da Silva", emprestado_em=antigo
        )
        Emprestimo.objects.create(doacao=doacao, pessoa_nome="Maria")  # em dia
        Emprestimo.objects.create(
            doacao=doacao, pessoa_nome="Zé", emprestado_em=antigo, devolvido_em=hoje()
        )

        assert self.detalhes(staff)["emprestimos_atrasados"] == [
            {
                "emprestimo_id": atrasado.id,
                "item": doacao.item_exibido,
                "quantidade": 2,
                "pessoa_nome": "João da Silva",
                "emprestado_em": antigo.isoformat(),
                "devolver_ate": atrasado.devolver_ate.isoformat(),
            }
        ]

    def test_turmas_sem_professor_trazem_id_e_nome(self, staff):
        sem = turma("Sem professor")
        professor(turma("Com professor"))
        turma("Futura", data_inicio=hoje() + timedelta(days=10))

        assert self.detalhes(staff)["turmas_sem_professor"] == [
            {"turma_id": sem.id, "turma_nome": "Sem professor"}
        ]

    def test_alunos_sem_turma_em_ordem_alfabetica(self, staff):
        t = turma()
        bia = aluno("Bia")
        ana = aluno("Ana")
        aluno("Inativa", ativo=False)
        aluno("Matriculada", t)

        assert self.detalhes(staff)["alunos_sem_turma"] == [
            {"aluno_id": ana.id, "aluno_nome": "Ana"},
            {"aluno_id": bia.id, "aluno_nome": "Bia"},
        ]

    def test_cada_lista_tem_um_teto_e_o_alerta_continua_com_o_total(self, staff):
        for i in range(LIMITE_DETALHE + 5):
            aluno(f"Aluno {i:03d}")

        detalhes = self.detalhes(staff)
        total = staff.get(URL).data["alertas"]["alunos_sem_turma"]

        assert len(detalhes["alunos_sem_turma"]) == LIMITE_DETALHE
        assert total == LIMITE_DETALHE + 5

    def test_a_lista_bate_com_a_contagem_do_alerta(self, staff):
        t = turma()
        presencas(aluno("Ana", t), t, ["AUSENTE"] * 3)
        aluno("Sem turma")
        sem = turma("Sem professor")
        assert sem is not None

        alertas = staff.get(URL).data["alertas"]
        detalhes = self.detalhes(staff)

        assert len(detalhes["faltantes"]) == alertas["faltantes"]
        assert len(detalhes["alunos_sem_turma"]) == alertas["alunos_sem_turma"]
        assert len(detalhes["turmas_sem_professor"]) == alertas["turmas_sem_professor"]


class TestResultadoGuardado:
    """A tela inicial é a mais pedida e faz ~10 consultas ao banco (que fica longe da API):
    o resultado vale por alguns segundos e é igual para toda a equipe."""

    def test_a_segunda_chamada_nao_toca_no_banco(self, staff, django_assert_num_queries):
        aluno("Ana")
        staff.get(URL)

        with django_assert_num_queries(0):
            segunda = staff.get(URL)

        assert segunda.status_code == 200
        assert segunda.data["totais"]["alunos_ativos"] == 1

    def test_o_resultado_guardado_nao_ve_mudanca_ate_vencer(self, staff):
        aluno("Ana")
        assert staff.get(URL).data["totais"]["alunos_ativos"] == 1

        aluno("Bia")
        assert staff.get(URL).data["totais"]["alunos_ativos"] == 1  # ainda o guardado

        cache.clear()  # é o que o tempo faz ao vencer
        assert staff.get(URL).data["totais"]["alunos_ativos"] == 2

    def test_os_detalhes_tambem_sao_guardados(self, staff, django_assert_num_queries):
        aluno("Sem turma")
        staff.get(URL_DETALHES)

        with django_assert_num_queries(0):
            segunda = staff.get(URL_DETALHES)

        assert [a["aluno_nome"] for a in segunda.data["alunos_sem_turma"]] == ["Sem turma"]

    def test_totais_e_detalhes_nao_se_misturam(self, staff):
        aluno("Sem turma")

        totais = staff.get(URL).data
        detalhes = staff.get(URL_DETALHES).data

        assert "totais" in totais and "totais" not in detalhes
        assert "alunos_sem_turma" in detalhes and isinstance(totais["alertas"], dict)

    def test_o_guardado_e_so_de_hoje(self, staff, monkeypatch):
        from . import views

        aluno("Ana")
        staff.get(URL)
        amanha = hoje() + timedelta(days=1)
        monkeypatch.setattr(views.timezone, "localdate", lambda: amanha)
        aluno("Bia")

        # Outro dia = outra chave: não reaproveita o resultado de ontem.
        assert staff.get(URL).data["totais"]["alunos_ativos"] == 2
