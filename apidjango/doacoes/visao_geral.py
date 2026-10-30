"""Números da "Visão geral" do painel: totais, alertas e frequência por turma.

A tela inicial traz só contagens e nomes de turma. Os detalhes de cada alerta (quem e onde,
com o nome do aluno, sem CPF nem contato) vêm numa chamada à parte, só quando a pessoa abre.

Tudo é calculado na hora, a partir dos dados já cadastrados (nada é gravado). As regras
reaproveitam as que já existem: a situação da turma vem de `grade.py` (a mesma da
landing) e o "faltante" de `faltas.py` (3 faltas seguidas, justificadas ignoradas).
"""

from datetime import date
from itertools import groupby

from django.core.cache import cache
from django.db.models import Count, F, Q, Sum
from django.db.models.functions import Coalesce

from .faltas import eh_faltante, faltas_seguidas
from .grade import StatusGrade, status_da_turma
from .models import (
    Aluno,
    AtividadeAvulsa,
    Emprestimo,
    Presenca,
    Professor,
    Turma,
)

# Quantas linhas cada alerta traz na lista de detalhes; o total real fica na contagem do alerta.
LIMITE_DETALHE = 50


def _classificar_turmas(hoje: date) -> tuple[list[Turma], list[Turma]]:
    """(turmas em andamento ou agendadas, as que começaram e estão sem professor ativo)."""
    turmas = (
        Turma.objects.filter(ativo=True)
        .annotate(professores_ativos=Count("professores", filter=Q(professores__ativo=True)))
        .order_by("nome")
    )
    ativas, sem_professor = [], []
    for t in turmas:
        situacao = status_da_turma(
            ativo=t.ativo,
            data_inicio=t.data_inicio,
            data_fim=t.data_fim,
            professores_ativos=t.professores_ativos,
            hoje=hoje,
        )
        if situacao is None:
            continue
        ativas.append(t)
        if situacao == StatusGrade.FALTA_PROFESSOR:
            sem_professor.append(t)
    return ativas, sem_professor


def _faltantes(hoje: date) -> list[dict]:
    """Uma linha por aluno ativo e turma com 3+ faltas seguidas (mais faltas primeiro).

    Só conta turma em andamento em que o aluno ainda está matriculado.
    """
    registros = (
        Presenca.objects.filter(
            Q(turma__data_fim__isnull=True) | Q(turma__data_fim__gte=hoje),
            turma__ativo=True,
            aluno__ativo=True,
            aluno__turmas=F("turma"),  # só quem continua matriculado na turma
            data__lte=hoje,
        )
        .order_by("turma_id", "aluno_id", "-data")
        .values_list("turma_id", "aluno_id", "situacao", "turma__nome", "aluno__nome")
    )
    linhas = []
    for (turma_id, aluno_id), grupo in groupby(registros, key=lambda r: (r[0], r[1])):
        grupo = list(grupo)
        situacoes = [r[2] for r in grupo]
        if eh_faltante(situacoes):
            linhas.append(
                {
                    "aluno_id": aluno_id,
                    "aluno_nome": grupo[0][4],
                    "turma_id": turma_id,
                    "turma_nome": grupo[0][3],
                    "faltas_seguidas": faltas_seguidas(situacoes),
                }
            )
    return sorted(
        linhas, key=lambda x: (-x["faltas_seguidas"], x["aluno_nome"], x["turma_nome"])
    )


def _frequencia_do_mes(hoje: date) -> int | None:
    """% de presentes entre presentes e ausentes do mês; justificadas não entram na conta."""
    do_mes = Presenca.objects.filter(data__year=hoje.year, data__month=hoje.month)
    contagem = do_mes.aggregate(
        presentes=Count("id", filter=Q(situacao=Presenca.Situacao.PRESENTE)),
        ausentes=Count("id", filter=Q(situacao=Presenca.Situacao.AUSENTE)),
    )
    total = contagem["presentes"] + contagem["ausentes"]
    if total == 0:
        return None
    return round(100 * contagem["presentes"] / total)


def _frequencia_por_turma(hoje: date) -> list[dict]:
    """% de presentes de cada turma ativa no mês, da menor para a maior (empate: por nome).

    Mesma regra do número geral (justificadas fora da conta). Turma sem nenhuma
    presença ou ausência no mês não aparece, em vez de mostrar 0%.
    """
    linhas = (
        Presenca.objects.filter(
            data__year=hoje.year,
            data__month=hoje.month,
            turma__ativo=True,
            situacao__in=[Presenca.Situacao.PRESENTE, Presenca.Situacao.AUSENTE],
        )
        .values("turma_id", "turma__nome")
        .annotate(
            registros=Count("id"),
            presentes=Count("id", filter=Q(situacao=Presenca.Situacao.PRESENTE)),
        )
    )
    por_turma = [
        {
            "turma_id": linha["turma_id"],
            "turma": linha["turma__nome"],
            "percentual": round(100 * linha["presentes"] / linha["registros"]),
            "registros": linha["registros"],
        }
        for linha in linhas
    ]
    return sorted(por_turma, key=lambda t: (t["percentual"], t["turma"]))


def _emprestimos_atrasados(hoje: date):
    return Emprestimo.objects.filter(
        devolvido_em__isnull=True, emprestado_em__lt=Emprestimo.limite_atraso(hoje)
    )


def montar_visao_geral(hoje: date) -> dict:
    turmas_ativas, turmas_sem_professor = _classificar_turmas(hoje)
    # Uma consulta só para os dois números de alunos e uma para os dois de empréstimos: o
    # banco fica longe da API, e cada ida e volta custa ~200 ms.
    alunos = Aluno.objects.filter(ativo=True).aggregate(
        ativos=Count("id", distinct=True),
        sem_turma=Count("id", filter=Q(turmas__isnull=True), distinct=True),
    )
    emprestados = Emprestimo.objects.filter(devolvido_em__isnull=True).aggregate(
        itens=Coalesce(Sum("quantidade"), 0),
        atrasados=Count("id", filter=Q(emprestado_em__lt=Emprestimo.limite_atraso(hoje))),
    )

    return {
        "totais": {
            "alunos_ativos": alunos["ativos"],
            "turmas_ativas": len(turmas_ativas),
            "professores_ativos": Professor.objects.filter(ativo=True).count(),
            "eventos_servicos_ativos": AtividadeAvulsa.objects.exclude(
                status=AtividadeAvulsa.Status.ENCERRADO
            ).count(),
            "frequencia_mes": _frequencia_do_mes(hoje),
            "itens_emprestados": emprestados["itens"],
        },
        "alertas": {
            "faltantes": len({linha["aluno_id"] for linha in _faltantes(hoje)}),
            "emprestimos_atrasados": emprestados["atrasados"],
            "turmas_sem_professor": len(turmas_sem_professor),
            "alunos_sem_turma": alunos["sem_turma"],
        },
        "frequencia_por_turma": _frequencia_por_turma(hoje),
    }


def montar_detalhes(hoje: date) -> dict:
    """As listas por trás de cada alerta (quem e onde), com no máximo `LIMITE_DETALHE` linhas."""
    _ativas, sem_professor = _classificar_turmas(hoje)
    atrasados = _emprestimos_atrasados(hoje).select_related("doacao").order_by("emprestado_em")
    sem_turma = Aluno.objects.filter(ativo=True, turmas__isnull=True).order_by("nome")

    return {
        "faltantes": _faltantes(hoje)[:LIMITE_DETALHE],
        "emprestimos_atrasados": [
            {
                "emprestimo_id": e.id,
                "item": e.doacao.item_exibido,
                "quantidade": e.quantidade,
                "pessoa_nome": e.pessoa_nome,
                "emprestado_em": e.emprestado_em,
                "devolver_ate": e.devolver_ate,
            }
            for e in atrasados[:LIMITE_DETALHE]
        ],
        "turmas_sem_professor": [
            {"turma_id": t.id, "turma_nome": t.nome} for t in sem_professor[:LIMITE_DETALHE]
        ],
        "alunos_sem_turma": [
            {"aluno_id": a.id, "aluno_nome": a.nome} for a in sem_turma[:LIMITE_DETALHE]
        ],
    }


# Por quanto tempo o resultado vale. É a tela inicial, aberta por toda a equipe, e o banco
# fica longe da API: refazer ~8 consultas a cada abertura custava ~2 s. O preço é que um
# número pode ficar até este tempo atrasado depois de uma alteração.
CACHE_SEGUNDOS = 30


def visao_geral_guardada(hoje: date) -> dict:
    """`montar_visao_geral`, guardado por `CACHE_SEGUNDOS` (e só para o dia de `hoje`)."""
    return cache.get_or_set(
        f"visao-geral:totais:{hoje.isoformat()}", lambda: montar_visao_geral(hoje), CACHE_SEGUNDOS
    )


def detalhes_guardados(hoje: date) -> dict:
    """`montar_detalhes`, guardado do mesmo jeito."""
    return cache.get_or_set(
        f"visao-geral:detalhes:{hoje.isoformat()}", lambda: montar_detalhes(hoje), CACHE_SEGUNDOS
    )
