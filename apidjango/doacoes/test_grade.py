"""
Testes da grade da semana (endpoint público da landing).

A grade mostra dia, turma, horário e situação, sem nenhum dado pessoal. Turma
inativa ou já encerrada não aparece.

Rodar: pytest
"""

from datetime import date, time, timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from .grade import STATUS_AGENDADO, STATUS_ATIVO, STATUS_FALTA_PROFESSOR, status_da_turma
from .models import Aluno, Professor, Turma

pytestmark = pytest.mark.django_db

URL = "/api/v1/grade/"
CPF_PROFESSOR = "52998224725"


def hoje() -> date:
    return timezone.localdate()


def turma(nome="Futsal", dia="SEG", inicio=time(18, 0), fim=time(19, 0), **extra):
    dados = {
        "nome": nome,
        "dia_semana": dia,
        "horario_inicio": inicio,
        "horario_fim": fim,
        "data_inicio": hoje() - timedelta(days=30),
    }
    dados.update(extra)
    return Turma.objects.create(**dados)


def com_professor(t: Turma, ativo=True) -> Professor:
    professor = Professor.objects.create(nome="Mestre", cpf=CPF_PROFESSOR, ativo=ativo)
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
            "id",
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
