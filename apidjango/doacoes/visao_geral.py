"""Números da "Visão geral" do painel: totais e alertas, só contagens (nunca nomes).

Tudo é calculado na hora, a partir dos dados já cadastrados (nada é gravado). As regras
reaproveitam as que já existem: a situação da turma vem de `grade.py` (a mesma da
landing) e o "faltante" de `faltas.py` (3 faltas seguidas, justificadas ignoradas).
"""

from datetime import date
from itertools import groupby

from django.db.models import Count, F, Q, Sum
from django.db.models.functions import Coalesce

from .faltas import eh_faltante
from .grade import StatusGrade, status_da_turma
from .models import (
    Aluno,
    AtividadeAvulsa,
    Emprestimo,
    Presenca,
    Professor,
    Turma,
)


def _turmas_por_situacao(hoje: date) -> tuple[int, int]:
    """(turmas em andamento ou agendadas, turmas que começaram e estão sem professor ativo)."""
    turmas = Turma.objects.filter(ativo=True).annotate(
        professores_ativos=Count("professores", filter=Q(professores__ativo=True))
    )
    situacoes = [
        status_da_turma(
            ativo=t.ativo,
            data_inicio=t.data_inicio,
            data_fim=t.data_fim,
            professores_ativos=t.professores_ativos,
            hoje=hoje,
        )
        for t in turmas
    ]
    ativas = [s for s in situacoes if s is not None]
    return len(ativas), sum(1 for s in ativas if s == StatusGrade.FALTA_PROFESSOR)


def _alunos_faltantes(hoje: date) -> int:
    """Alunos ativos com 3+ faltas seguidas em alguma turma em que ainda estão matriculados."""
    registros = (
        Presenca.objects.filter(
            Q(turma__data_fim__isnull=True) | Q(turma__data_fim__gte=hoje),
            turma__ativo=True,
            aluno__ativo=True,
            aluno__turmas=F("turma"),  # só quem continua matriculado na turma
            data__lte=hoje,
        )
        .order_by("turma_id", "aluno_id", "-data")
        .values_list("turma_id", "aluno_id", "situacao")
    )
    faltantes: set[int] = set()
    for (_turma, aluno_id), grupo in groupby(registros, key=lambda r: (r[0], r[1])):
        if eh_faltante([situacao for _t, _a, situacao in grupo]):
            faltantes.add(aluno_id)
    return len(faltantes)


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


def montar_visao_geral(hoje: date) -> dict:
    turmas_ativas, turmas_sem_professor = _turmas_por_situacao(hoje)
    emprestados = Emprestimo.objects.filter(devolvido_em__isnull=True)

    return {
        "totais": {
            "alunos_ativos": Aluno.objects.filter(ativo=True).count(),
            "turmas_ativas": turmas_ativas,
            "professores_ativos": Professor.objects.filter(ativo=True).count(),
            "eventos_servicos_ativos": AtividadeAvulsa.objects.exclude(
                status=AtividadeAvulsa.Status.ENCERRADO
            ).count(),
            "frequencia_mes": _frequencia_do_mes(hoje),
            "itens_emprestados": emprestados.aggregate(
                total=Coalesce(Sum("quantidade"), 0)
            )["total"],
        },
        "alertas": {
            "faltantes": _alunos_faltantes(hoje),
            "emprestimos_atrasados": emprestados.filter(
                emprestado_em__lt=Emprestimo.limite_atraso(hoje)
            ).count(),
            "turmas_sem_professor": turmas_sem_professor,
            "alunos_sem_turma": Aluno.objects.filter(ativo=True, turmas__isnull=True).count(),
        },
    }
