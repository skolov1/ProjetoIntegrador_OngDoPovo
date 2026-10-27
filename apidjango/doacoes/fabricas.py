"""Fábricas para os testes: criam turma já com seus horários.

Uma turma agora tem um ou mais `HorarioTurma`; criar só a `Turma` deixaria ela sem
dia nem horário.
"""

from datetime import date, time

from .models import HorarioTurma, Turma


def criar_turma(
    nome: str = "Futsal",
    dia: str = "SEG",
    inicio: time = time(18, 0),
    fim: time = time(19, 0),
    horarios: list[tuple[str, time, time]] | None = None,
    **extra,
) -> Turma:
    """Turma com um horário (`dia`, `inicio`, `fim`) ou com vários (`horarios`)."""
    dados = {"nome": nome, "data_inicio": date(2026, 1, 1)}
    dados.update(extra)
    turma = Turma.objects.create(**dados)
    for dia_semana, hora_inicio, hora_fim in horarios or [(dia, inicio, fim)]:
        HorarioTurma.objects.create(
            turma=turma,
            dia_semana=dia_semana,
            horario_inicio=hora_inicio,
            horario_fim=hora_fim,
        )
    return turma
