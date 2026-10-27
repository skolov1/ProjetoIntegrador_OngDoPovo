"""Dias da semana e horários de uma turma, sem banco (função pura, fácil de testar).

Uma turma pode acontecer em mais de um dia (ex.: segunda e quarta, 19h30). Este
módulo tem a ordem dos dias e o texto que o painel e a landing mostram.
"""

from collections.abc import Iterable
from datetime import time

DIAS = [
    ("SEG", "Segunda"),
    ("TER", "Terça"),
    ("QUA", "Quarta"),
    ("QUI", "Quinta"),
    ("SEX", "Sexta"),
    ("SAB", "Sábado"),
    ("DOM", "Domingo"),
]

# Segunda a domingo: a ordem em que a grade é mostrada (ordenar pelo código "SEG",
# "TER"... em texto sairia errado).
ORDEM_DIAS = [codigo for codigo, _ in DIAS]
ROTULO_DIA = dict(DIAS)


# Travessão (U+2013) entre o início e o fim, e ponto médio entre grupos de horário.
TRAVESSAO = chr(0x2013)
PONTO_MEDIO = chr(0xB7)


def faixa_horaria(inicio: time, fim: time) -> str:
    """Faixa de um horário: 19:30, travessão, 20:30."""
    return f"{inicio:%H:%M}{TRAVESSAO}{fim:%H:%M}"


def _juntar_dias(rotulos: list[str]) -> str:
    if len(rotulos) <= 1:
        return "".join(rotulos)
    return ", ".join(rotulos[:-1]) + " e " + rotulos[-1]


def formatar_horarios(horarios: Iterable[tuple[str, time, time]]) -> str:
    """Texto dos horários de uma turma, juntando os dias que têm o mesmo horário.

    [("SEG", 19:30, 20:30), ("QUA", 19:30, 20:30)] vira "Segunda e Quarta" + a faixa.
    Horários diferentes ficam separados por um ponto médio.
    """
    ordenados = sorted(horarios, key=lambda h: (ORDEM_DIAS.index(h[0]), h[1], h[2]))
    if not ordenados:
        return "Sem horário"
    grupos: dict[tuple[time, time], list[str]] = {}
    for dia, inicio, fim in ordenados:
        grupos.setdefault((inicio, fim), []).append(ROTULO_DIA[dia])
    return f" {PONTO_MEDIO} ".join(
        f"{_juntar_dias(dias)} {faixa_horaria(inicio, fim)}"
        for (inicio, fim), dias in grupos.items()
    )
