"""Regra do aluno "faltante": faltas seguidas na mesma turma.

Calculada na hora, a partir das presenças já registradas (nada é gravado).
Falta justificada não conta: ela é ignorada na sequência, ou seja, não soma e
também não quebra uma sequência de faltas.
"""

# Quantas faltas seguidas deixam o aluno "faltante".
LIMITE_FALTAS_SEGUIDAS = 3


def faltas_seguidas(situacoes_recentes_primeiro: list[str]) -> int:
    """Conta as faltas seguidas mais recentes.

    Recebe as situações ("PRESENTE", "AUSENTE", "JUSTIFICADO") da mais nova para a
    mais antiga. Para na primeira presença; justificadas são puladas.
    """
    total = 0
    for situacao in situacoes_recentes_primeiro:
        if situacao == "JUSTIFICADO":
            continue
        if situacao != "AUSENTE":
            break
        total += 1
    return total


def eh_faltante(situacoes_recentes_primeiro: list[str]) -> bool:
    return faltas_seguidas(situacoes_recentes_primeiro) >= LIMITE_FALTAS_SEGUIDAS
