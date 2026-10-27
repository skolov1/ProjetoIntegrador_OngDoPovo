"""Regra da grade da semana (landing): que turma aparece e com qual situação.

Funções puras, sem banco, para testar sem montar dados:

* turma inativa ou já encerrada (`data_fim` no passado) não aparece;
* ainda não começou (`data_inicio` no futuro): Agendado;
* começou, mas nenhum professor ativo vinculado: Falta professor;
* começou e tem professor ativo: Ativo.
"""

from datetime import date

STATUS_ATIVO = "ATIVO"
STATUS_AGENDADO = "AGENDADO"
STATUS_FALTA_PROFESSOR = "FALTA_PROFESSOR"

ROTULOS_STATUS = {
    STATUS_ATIVO: "Ativo",
    STATUS_AGENDADO: "Agendado",
    STATUS_FALTA_PROFESSOR: "Falta professor",
}


def status_da_turma(
    *,
    ativo: bool,
    data_inicio: date,
    data_fim: date | None,
    professores_ativos: int,
    hoje: date,
) -> str | None:
    """Situação da turma na grade, ou `None` quando ela não deve aparecer."""
    if not ativo:
        return None
    if data_fim is not None and data_fim < hoje:
        return None
    if data_inicio > hoje:
        return STATUS_AGENDADO
    if professores_ativos == 0:
        return STATUS_FALTA_PROFESSOR
    return STATUS_ATIVO
