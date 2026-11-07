"""Números da "Visão geral" do painel: totais, alertas e frequência por turma.

A tela inicial traz só contagens e nomes de turma. Os detalhes de cada alerta (quem e onde,
com o nome do aluno, sem CPF nem contato) vêm numa chamada à parte, só quando a pessoa abre.

Tudo é calculado na hora, a partir dos dados já cadastrados (nada é gravado). As regras
reaproveitam as que já existem: a situação da turma vem de `grade.py` (a mesma da
landing) e o "faltante" de `faltas.py` (3 faltas seguidas, justificadas ignoradas).
"""

from collections import Counter
from datetime import date
from itertools import groupby

from django.core.cache import cache

from .consultas import Contagens
from .faltas import eh_faltante, faltas_seguidas
from .grade import StatusGrade, status_da_turma
from .models import (
    Aluno,
    AtividadeAvulsa,
    Emprestimo,
    Presenca,
    Turma,
)

# Quantas linhas cada alerta traz na lista de detalhes; o total real fica na contagem do alerta.
LIMITE_DETALHE = 50


def _classificar_turmas(hoje: date, contagens: Contagens) -> tuple[list[Turma], list[Turma]]:
    """(turmas em andamento ou agendadas, as que começaram e estão sem professor ativo)."""
    ativas, sem_professor = [], []
    for t in Turma.objects.filter(ativo=True).order_by("nome"):
        situacao = status_da_turma(
            ativo=t.ativo,
            data_inicio=t.data_inicio,
            data_fim=t.data_fim,
            professores_ativos=contagens.professores_por_turma.get(t.pk, 0),
            hoje=hoje,
        )
        if situacao is None:
            continue
        ativas.append(t)
        if situacao == StatusGrade.FALTA_PROFESSOR:
            sem_professor.append(t)
    return ativas, sem_professor


def _faltantes(hoje: date, contagens: Contagens) -> list[dict]:
    """Uma linha por aluno ativo e turma com 3+ faltas seguidas (mais faltas primeiro).

    Só conta turma em andamento em que o aluno ainda está matriculado.
    """
    turmas = {
        t.pk: t.nome
        for t in Turma.objects.filter(ativo=True)
        if t.data_fim is None or t.data_fim >= hoje
    }
    alunos = {a.pk: a.nome for a in Aluno.objects.filter(ativo=True)}
    # Sem JOIN: o que cruza aluno x turma vem das tabelas de ligacao, ja em memoria.
    matriculados = {
        (a, t) for a, ts in contagens.turmas_por_aluno.items() for t in ts if t in turmas
    }

    registros = (
        Presenca.objects.filter(turma_id__in=list(turmas), data__lte=hoje)
        .order_by("turma_id", "aluno_id", "-data")
        .values_list("turma_id", "aluno_id", "situacao")
    )
    linhas = []
    for (turma_id, aluno_id), grupo in groupby(registros, key=lambda r: (r[0], r[1])):
        if aluno_id not in alunos or (aluno_id, turma_id) not in matriculados:
            continue
        situacoes = [r[2] for r in grupo]
        if eh_faltante(situacoes):
            linhas.append(
                {
                    "aluno_id": str(aluno_id),
                    "aluno_nome": alunos[aluno_id],
                    "turma_id": str(turma_id),
                    "turma_nome": turmas[turma_id],
                    "faltas_seguidas": faltas_seguidas(situacoes),
                }
            )
    return sorted(
        linhas, key=lambda x: (-x["faltas_seguidas"], x["aluno_nome"], x["turma_nome"])
    )


def _presencas_do_mes(hoje: date):
    """(turma_id, situacao) de presentes e ausentes do mês (justificadas ficam de fora)."""
    inicio = hoje.replace(day=1)
    proximo = (inicio.replace(year=inicio.year + 1, month=1)
               if inicio.month == 12 else inicio.replace(month=inicio.month + 1))
    return Presenca.objects.filter(
        data__gte=inicio,
        data__lt=proximo,
        situacao__in=[Presenca.Situacao.PRESENTE, Presenca.Situacao.AUSENTE],
    ).values_list("turma_id", "situacao")


def _frequencia_do_mes(hoje: date) -> int | None:
    """% de presentes entre presentes e ausentes do mês; justificadas não entram na conta."""
    situacoes = Counter(situacao for _turma, situacao in _presencas_do_mes(hoje))
    total = sum(situacoes.values())
    if total == 0:
        return None
    return round(100 * situacoes[Presenca.Situacao.PRESENTE] / total)


def _frequencia_por_turma(hoje: date) -> list[dict]:
    """% de presentes de cada turma ativa no mês, da menor para a maior (empate: por nome).

    Mesma regra do número geral (justificadas fora da conta). Turma sem nenhuma
    presença ou ausência no mês não aparece, em vez de mostrar 0%.
    """
    nomes = {t.pk: t.nome for t in Turma.objects.filter(ativo=True)}
    registros, presentes = Counter(), Counter()
    for turma_id, situacao in _presencas_do_mes(hoje):
        if turma_id not in nomes:
            continue
        registros[turma_id] += 1
        if situacao == Presenca.Situacao.PRESENTE:
            presentes[turma_id] += 1
    por_turma = [
        {
            "turma_id": str(turma_id),
            "turma": nomes[turma_id],
            "percentual": round(100 * presentes[turma_id] / total),
            "registros": total,
        }
        for turma_id, total in registros.items()
    ]
    return sorted(por_turma, key=lambda t: (t["percentual"], t["turma"]))


def _emprestimos_atrasados(hoje: date):
    return Emprestimo.objects.filter(
        devolvido_em__isnull=True, emprestado_em__lt=Emprestimo.limite_atraso(hoje)
    )


def _alunos_sem_turma(contagens: Contagens) -> list[Aluno]:
    return [
        a
        for a in Aluno.objects.filter(ativo=True).order_by("nome")
        if a.pk not in contagens.alunos_com_turma
    ]


def montar_visao_geral(hoje: date) -> dict:
    contagens = Contagens()
    turmas_ativas, turmas_sem_professor = _classificar_turmas(hoje, contagens)
    limite = Emprestimo.limite_atraso(hoje)
    # `values_list` simples: o MongoDB nao agrega por relacao (ver consultas.py).
    emprestados = list(
        Emprestimo.objects.filter(devolvido_em__isnull=True).values_list(
            "quantidade", "emprestado_em"
        )
    )

    return {
        "totais": {
            "alunos_ativos": len(contagens.alunos_ativos_ids),
            "turmas_ativas": len(turmas_ativas),
            "professores_ativos": len(contagens.professores_ativos_ids),
            "eventos_servicos_ativos": AtividadeAvulsa.objects.exclude(
                status=AtividadeAvulsa.Status.ENCERRADO
            ).count(),
            "frequencia_mes": _frequencia_do_mes(hoje),
            "itens_emprestados": sum(q for q, _em in emprestados),
        },
        "alertas": {
            "faltantes": len({linha["aluno_id"] for linha in _faltantes(hoje, contagens)}),
            "emprestimos_atrasados": sum(1 for _q, em in emprestados if em < limite),
            "turmas_sem_professor": len(turmas_sem_professor),
            "alunos_sem_turma": len(_alunos_sem_turma(contagens)),
        },
        "frequencia_por_turma": _frequencia_por_turma(hoje),
    }


def montar_detalhes(hoje: date) -> dict:
    """As listas por trás de cada alerta (quem e onde), com no máximo `LIMITE_DETALHE` linhas."""
    contagens = Contagens()
    _ativas, sem_professor = _classificar_turmas(hoje, contagens)
    atrasados = _emprestimos_atrasados(hoje).select_related("doacao").order_by("emprestado_em")
    sem_turma = _alunos_sem_turma(contagens)

    return {
        "faltantes": _faltantes(hoje, contagens)[:LIMITE_DETALHE],
        "emprestimos_atrasados": [
            {
                "emprestimo_id": str(e.id),
                "item": e.doacao.item_exibido,
                "quantidade": e.quantidade,
                "pessoa_nome": e.pessoa_nome,
                "emprestado_em": e.emprestado_em,
                "devolver_ate": e.devolver_ate,
            }
            for e in atrasados[:LIMITE_DETALHE]
        ],
        "turmas_sem_professor": [
            {"turma_id": str(t.id), "turma_nome": t.nome} for t in sem_professor[:LIMITE_DETALHE]
        ],
        "alunos_sem_turma": [
            {"aluno_id": str(a.id), "aluno_nome": a.nome} for a in sem_turma[:LIMITE_DETALHE]
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
