"""
Testes da grade da semana (endpoint público da landing).

A grade mostra dia, turma, horário e situação, sem nenhum dado pessoal. Turma
inativa ou já encerrada não aparece.

Rodar: pytest
"""

import itertools
from datetime import date, time, timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from .fabricas import criar_turma
from .grade import STATUS_AGENDADO, STATUS_ATIVO, STATUS_FALTA_PROFESSOR, status_da_turma
from .models import Aluno, AtividadeAvulsa, Professor

pytestmark = pytest.mark.django_db

URL = "/api/v1/grade/"
CPF_PROFESSOR = "52998224725"


def hoje() -> date:
    return timezone.localdate()


def turma(nome="Futsal", dia="SEG", inicio=time(18, 0), fim=time(19, 0), **extra):
    # Por padrão a turma de teste já está visível na grade e começou há 30 dias.
    extra.setdefault("data_inicio", hoje() - timedelta(days=30))
    extra.setdefault("visivel_na_grade", True)
    return criar_turma(nome, dia, inicio, fim, **extra)


_cpfs = itertools.count(1)


def com_professor(t, ativo=True) -> Professor:
    # CPF é único: o primeiro é o de sempre (os testes procuram por ele no texto).
    cpf = CPF_PROFESSOR if next(_cpfs) == 1 else f"{next(_cpfs):011d}"
    professor = Professor.objects.create(nome="Mestre", cpf=cpf, ativo=ativo)
    professor.turmas.add(t)
    return professor


class TestStatusDaTurma:
    def status(self, **kw):
        base = {
            "ativo": True,
            "data_inicio": hoje() - timedelta(days=1),
            "data_fim": None,
            "professores_ativos": 1,
            "hoje": hoje(),
        }
        base.update(kw)
        return status_da_turma(**base)

    def test_turma_comecada_com_professor_e_ativa(self):
        assert self.status() == STATUS_ATIVO

    def test_sem_professor_ativo_falta_professor(self):
        assert self.status(professores_ativos=0) == STATUS_FALTA_PROFESSOR

    def test_comeca_no_futuro_e_agendada(self):
        assert self.status(data_inicio=hoje() + timedelta(days=7)) == STATUS_AGENDADO

    def test_agendada_vale_mesmo_sem_professor(self):
        status = self.status(data_inicio=hoje() + timedelta(days=7), professores_ativos=0)

        assert status == STATUS_AGENDADO

    def test_comeca_hoje_ja_conta_como_comecada(self):
        assert self.status(data_inicio=hoje()) == STATUS_ATIVO

    def test_inativa_nao_aparece(self):
        assert self.status(ativo=False) is None

    def test_encerrada_nao_aparece(self):
        assert self.status(data_fim=hoje() - timedelta(days=1)) is None

    def test_termina_hoje_ainda_aparece(self):
        assert self.status(data_fim=hoje()) == STATUS_ATIVO


class TestEndpointGrade:
    def test_e_publico_sem_login(self):
        assert APIClient().get(URL).status_code == 200

    def test_traz_dia_turma_horario_e_status(self):
        t = turma("Muay Thai Adulto", dia="SEG", inicio=time(19, 30), fim=time(20, 30))
        com_professor(t)

        linha = APIClient().get(URL).data[0]

        assert linha["nome"] == "Muay Thai Adulto"
        assert linha["dia"] == "SEG"
        assert linha["dia_rotulo"] == "Segunda"
        assert linha["horario_inicio"] == "19:30"
        assert linha["horario_fim"] == "20:30"
        assert linha["horario"] == "19:30\u201320:30"
        assert linha["status"] == "ATIVO"
        assert linha["status_rotulo"] == "Ativo"

    def test_status_falta_professor_e_agendado(self):
        turma("Sem professor", dia="TER")
        futura = turma("Futura", dia="QUA", data_inicio=hoje() + timedelta(days=10))
        com_professor(futura)

        por_nome = {r["nome"]: r for r in APIClient().get(URL).data}

        assert por_nome["Sem professor"]["status"] == "FALTA_PROFESSOR"
        assert por_nome["Sem professor"]["status_rotulo"] == "Falta professor"
        assert por_nome["Futura"]["status"] == "AGENDADO"

    def test_professor_inativo_nao_conta(self):
        t = turma("Futsal")
        com_professor(t, ativo=False)

        assert APIClient().get(URL).data[0]["status"] == "FALTA_PROFESSOR"

    def test_desativada_e_encerrada_nao_aparecem(self):
        turma("Desativada", ativo=False)
        turma("Encerrada", data_fim=hoje() - timedelta(days=1))
        visivel = turma("Visivel")
        com_professor(visivel)

        nomes = [r["nome"] for r in APIClient().get(URL).data]

        assert nomes == ["Visivel"]

    def test_ordena_por_dia_da_semana_e_depois_por_horario(self):
        turma("Sabado", dia="SAB", inicio=time(9, 0), fim=time(10, 0))
        turma("Segunda tarde", dia="SEG", inicio=time(17, 0), fim=time(18, 0))
        turma("Domingo", dia="DOM", inicio=time(8, 0), fim=time(9, 0))
        turma("Segunda manha", dia="SEG", inicio=time(8, 0), fim=time(9, 0))
        turma("Quarta", dia="QUA", inicio=time(10, 0), fim=time(11, 0))

        nomes = [r["nome"] for r in APIClient().get(URL).data]

        assert nomes == ["Segunda manha", "Segunda tarde", "Quarta", "Sabado", "Domingo"]

    def test_nao_expoe_dado_pessoal_nem_ids_internos(self):
        t = turma("Futsal")
        com_professor(t)
        aluno = Aluno.objects.create(nome="Ana Souza", data_nascimento=date(1990, 1, 1))
        aluno.turmas.add(t)

        resposta = APIClient().get(URL)
        texto = str(resposta.data)

        assert set(resposta.data[0]) == {
            "chave",
            "nome",
            "dia",
            "dia_rotulo",
            "horario_inicio",
            "horario_fim",
            "horario",
            "status",
            "status_rotulo",
        }
        assert "Mestre" not in texto
        assert CPF_PROFESSOR not in texto
        assert "Ana" not in texto

    def test_so_aceita_leitura(self):
        assert APIClient().post(URL, {}, format="json").status_code == 405

    def test_lista_vazia_quando_nao_ha_turma_visivel(self):
        turma("Desativada", ativo=False)

        assert APIClient().get(URL).data == []


class TestVisibilidade:
    """Turma interna não vai para o site sozinha."""

    def test_turma_nova_fica_fora_da_grade(self):
        interna = criar_turma("Interna", data_inicio=hoje() - timedelta(days=5))
        com_professor(interna)

        assert interna.visivel_na_grade is False
        assert APIClient().get(URL).data == []

    def test_so_a_turma_marcada_como_visivel_aparece(self):
        escondida = criar_turma("Escondida", data_inicio=hoje() - timedelta(days=5))
        com_professor(escondida)
        publica = turma("Publica")
        com_professor(publica)

        nomes = [r["nome"] for r in APIClient().get(URL).data]

        assert nomes == ["Publica"]

    def test_usa_o_nome_publico_quando_existe(self):
        t = turma("Futsal sub-14 (interna)", nome_publico="Futsal infantil")
        com_professor(t)

        assert APIClient().get(URL).data[0]["nome"] == "Futsal infantil"


class TestVariosDias:
    def test_turma_em_dois_dias_vira_duas_linhas_com_chaves_diferentes(self):
        t = turma(
            "Muay Thai",
            horarios=[("QUA", time(19, 30), time(20, 30)), ("SEG", time(19, 30), time(20, 30))],
        )
        com_professor(t)

        linhas = APIClient().get(URL).data

        pares = [(r["dia"], r["nome"]) for r in linhas]
        assert pares == [("SEG", "Muay Thai"), ("QUA", "Muay Thai")]
        assert len({r["chave"] for r in linhas}) == 2
        assert {r["status"] for r in linhas} == {"ATIVO"}


class TestAvulsasForaDaGrade:
    def test_evento_ou_servico_nao_entra_na_grade_das_turmas(self):
        AtividadeAvulsa.objects.create(nome="Atendimento oftalmológico", dia_semana="QUI")

        assert APIClient().get(URL).data == []


class TestCache:
    def test_resposta_pode_ficar_um_minuto_em_cache(self):
        resposta = APIClient().get(URL)

        controle = resposta["Cache-Control"]
        assert "max-age=60" in controle
        assert "public" in controle
