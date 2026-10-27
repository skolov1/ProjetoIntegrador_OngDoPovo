"""Regra da grade da semana (landing): que turma aparece e com qual situação.

Funções puras, sem banco, para testar sem montar dados:

* turma inativa ou já encerrada (`data_fim` no passado) não aparece;
* ainda não começou (`data_inicio` no futuro): Agendado;
* começou, mas nenhum professor ativo vinculado: Falta professor;
* começou e tem professor ativo: Ativo.

Além disso, só entra na grade a turma com `visivel_na_grade` ligado (ver a view).
"""

from datetime import date

from django.db import models


class StatusGrade(models.TextChoices):
    ATIVO = "ATIVO", "Ativo"
    AGENDADO = "AGENDADO", "Agendado"
    FALTA_PROFESSOR = "FALTA_PROFESSOR", "Falta professor"


STATUS_ATIVO = StatusGrade.ATIVO
STATUS_AGENDADO = StatusGrade.AGENDADO
STATUS_FALTA_PROFESSOR = StatusGrade.FALTA_PROFESSOR

ROTULOS_STATUS = {status.value: status.label for status in StatusGrade}


def status_da_turma(
    *,
    ativo: bool,
    data_inicio: date,
    data_fim: date | None,
    professores_ativos: int,
    hoje: date,
) -> StatusGrade | None:
    """Situação da turma na grade, ou `None` quando ela não deve aparecer."""
    if not ativo:
        return None
    if data_fim is not None and data_fim < hoje:
        return None
    if data_inicio > hoje:
        return StatusGrade.AGENDADO
    if professores_ativos == 0:
        return StatusGrade.FALTA_PROFESSOR
    return StatusGrade.ATIVO
