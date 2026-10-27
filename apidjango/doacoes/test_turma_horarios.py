"""
Testes da turma em um ou mais dias da semana (`HorarioTurma`).

Rodar: pytest
"""

from datetime import time

import pytest
from auditlog.models import LogEntry
from django.contrib.auth.models import User
from rest_framework.test import APIClient

from .fabricas import criar_turma
from .models import HorarioTurma, Turma

pytestmark = pytest.mark.django_db

URL = "/api/v1/turmas/"
T = chr(0x2013)  # travessão


@pytest.fixture
def staff():
    usuario = User.objects.create_user(
        username="gestor", password="SenhaForte@123", is_staff=True, first_name="Maria"
    )
    cliente = APIClient()
    cliente.force_authenticate(usuario)
    cliente.usuario = usuario
    return cliente


DOIS_DIAS_18H = [("SEG", time(18, 0), time(19, 0)), ("QUA", time(18, 0), time(19, 0))]


def horario(dia, inicio="19:30", fim="20:30"):
    return {"dia_semana": dia, "horario_inicio": inicio, "horario_fim": fim}


def payload(**extra):
    dados = {
        "nome": "Muay Thai",
        "data_inicio": "2026-01-01",
        "horarios": [horario("SEG"), horario("QUA")],
    }
    dados.update(extra)
    return dados


class TestCriar:
    def test_cria_turma_em_dois_dias(self, staff):
        resposta = staff.post(URL, payload(), format="json")

        assert resposta.status_code == 201
        assert [h["dia_semana"] for h in resposta.data["horarios"]] == ["SEG", "QUA"]
        assert resposta.data["horario_formatado"] == f"Segunda e Quarta 19:30{T}20:30"
        assert HorarioTurma.objects.count() == 2

    def test_horarios_voltam_em_ordem_de_segunda_a_domingo(self, staff):
        resposta = staff.post(
            URL, payload(horarios=[horario("SAB"), horario("TER")]), format="json"
        )

        assert [h["dia_semana"] for h in resposta.data["horarios"]] == ["TER", "SAB"]

    def test_exige_ao_menos_um_horario(self, staff):
        resposta = staff.post(URL, payload(horarios=[]), format="json")

        assert resposta.status_code == 400
        assert "horarios" in resposta.data
        assert Turma.objects.count() == 0

    def test_fim_precisa_ser_depois_do_inicio(self, staff):
        resposta = staff.post(
            URL, payload(horarios=[horario("SEG", "20:00", "19:00")]), format="json"
        )

        assert resposta.status_code == 400
        assert Turma.objects.count() == 0

    def test_mesmo_dia_e_inicio_repetido_e_recusado(self, staff):
        resposta = staff.post(
            URL,
            payload(
                horarios=[horario("SEG", "19:00", "20:00"), horario("SEG", "19:00", "21:00")]
            ),
            format="json",
        )

        assert resposta.status_code == 400
        assert "horarios" in resposta.data

    def test_mesmo_dia_em_dois_horarios_diferentes_vale(self, staff):
        resposta = staff.post(
            URL,
            payload(
                horarios=[horario("SEG", "08:00", "09:00"), horario("SEG", "19:00", "20:00")]
            ),
            format="json",
        )

        assert resposta.status_code == 201

    def test_nasce_oculta_da_grade_publica(self, staff):
        resposta = staff.post(URL, payload(), format="json")

        assert resposta.data["visivel_na_grade"] is False
        assert resposta.data["nome_publico"] == ""

    def test_grava_visibilidade_e_nome_publico(self, staff):
        resposta = staff.post(
            URL,
            payload(visivel_na_grade=True, nome_publico="Muay Thai (adulto)"),
            format="json",
        )

        assert resposta.data["visivel_na_grade"] is True
        assert resposta.data["nome_publico"] == "Muay Thai (adulto)"


class TestEditar:
    def test_troca_os_dias_sem_mexer_nos_que_continuam(self, staff):
        turma = criar_turma("Futsal", horarios=DOIS_DIAS_18H)
        segunda = turma.horarios.get(dia_semana="SEG")

        resposta = staff.patch(
            f"{URL}{turma.id}/",
            {"horarios": [horario("SEG", "18:00", "19:00"), horario("SEX", "18:00", "19:00")]},
            format="json",
        )

        assert resposta.status_code == 200
        assert [h["dia_semana"] for h in resposta.data["horarios"]] == ["SEG", "SEX"]
        # A segunda continua sendo o mesmo registro (não foi apagada e recriada).
        assert turma.horarios.get(dia_semana="SEG").pk == segunda.pk
        assert not turma.horarios.filter(dia_semana="QUA").exists()

    def test_muda_so_o_fim_do_mesmo_dia_atualiza_no_lugar(self, staff):
        turma = criar_turma("Futsal", "SEG", time(18, 0), time(19, 0))
        existente = turma.horarios.get()

        staff.patch(
            f"{URL}{turma.id}/", {"horarios": [horario("SEG", "18:00", "19:30")]}, format="json"
        )

        existente.refresh_from_db()
        assert existente.horario_fim == time(19, 30)
        assert turma.horarios.count() == 1

    def test_patch_sem_horarios_nao_mexe_neles(self, staff):
        turma = criar_turma("Futsal")

        resposta = staff.patch(f"{URL}{turma.id}/", {"nome": "Futsal Sub-12"}, format="json")

        assert resposta.status_code == 200
        assert resposta.data["nome"] == "Futsal Sub-12"
        assert turma.horarios.count() == 1

    def test_nao_deixa_ficar_sem_horario(self, staff):
        turma = criar_turma("Futsal")

        resposta = staff.patch(f"{URL}{turma.id}/", {"horarios": []}, format="json")

        assert resposta.status_code == 400
        assert turma.horarios.count() == 1

    def test_excluir_turma_leva_os_horarios_junto(self, staff):
        turma = criar_turma("Futsal", horarios=DOIS_DIAS_18H)

        assert staff.delete(f"{URL}{turma.id}/").status_code == 204
        assert HorarioTurma.objects.count() == 0


class TestListaEFiltro:
    def test_lista_mostra_o_texto_dos_dias(self, staff):
        criar_turma("Futsal", horarios=DOIS_DIAS_18H)

        linha = staff.get(URL).data["results"][0]

        assert linha["horario_formatado"] == f"Segunda e Quarta 18:00{T}19:00"
        assert linha["visivel_na_grade"] is False

    def test_filtra_por_dia_sem_repetir_turma(self, staff):
        criar_turma(
            "Duas vezes na quarta",
            horarios=[("QUA", time(8, 0), time(9, 0)), ("QUA", time(19, 0), time(20, 0))],
        )
        criar_turma("So segunda", "SEG")

        dados = staff.get(URL, {"dia_semana": "QUA"}).data

        assert dados["count"] == 1
        assert dados["results"][0]["nome"] == "Duas vezes na quarta"

    def test_filtra_por_visibilidade(self, staff):
        criar_turma("Publica", visivel_na_grade=True)
        criar_turma("Interna")

        nomes = {r["nome"] for r in staff.get(URL, {"visivel_na_grade": "true"}).data["results"]}

        assert nomes == {"Publica"}


class TestAuditoria:
    def test_mudar_um_horario_aparece_no_historico_com_quem_fez(self, staff):
        turma = criar_turma("Futsal", "SEG", time(18, 0), time(19, 0))

        staff.patch(
            f"{URL}{turma.id}/", {"horarios": [horario("SEG", "18:00", "19:30")]}, format="json"
        )

        entrada = LogEntry.objects.filter(
            content_type__model="horarioturma", action=LogEntry.Action.UPDATE
        ).get()
        assert entrada.actor == staff.usuario
