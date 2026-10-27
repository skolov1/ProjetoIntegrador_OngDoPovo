"""
Testes do texto de dias e horários de uma turma (função pura, sem banco).

Rodar: pytest
"""

from datetime import time

from .horarios import ORDEM_DIAS, formatar_horarios

T = chr(0x2013)  # travessão
M = chr(0xB7)  # ponto médio


def test_um_dia_e_um_horario():
    assert formatar_horarios([("SEG", time(19, 30), time(20, 30))]) == f"Segunda 19:30{T}20:30"


def test_dois_dias_no_mesmo_horario_viram_uma_frase():
    horarios = [("QUA", time(19, 30), time(20, 30)), ("SEG", time(19, 30), time(20, 30))]

    assert formatar_horarios(horarios) == f"Segunda e Quarta 19:30{T}20:30"


def test_tres_ou_mais_dias_usam_virgula_e_e():
    horarios = [
        ("SEX", time(18, 0), time(19, 0)),
        ("SEG", time(18, 0), time(19, 0)),
        ("QUA", time(18, 0), time(19, 0)),
    ]

    assert formatar_horarios(horarios) == f"Segunda, Quarta e Sexta 18:00{T}19:00"


def test_horarios_diferentes_ficam_separados():
    horarios = [("QUA", time(19, 0), time(20, 0)), ("SEG", time(18, 0), time(19, 0))]

    assert formatar_horarios(horarios) == f"Segunda 18:00{T}19:00 {M} Quarta 19:00{T}20:00"


def test_sem_horario():
    assert formatar_horarios([]) == "Sem horário"


def test_ordem_dos_dias_e_de_segunda_a_domingo():
    assert ORDEM_DIAS == ["SEG", "TER", "QUA", "QUI", "SEX", "SAB", "DOM"]
