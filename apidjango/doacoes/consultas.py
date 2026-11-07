"""Contagens que o Django faria com `annotate(Count(...))` sobre relacoes N:N.

O backend do MongoDB nao executa `Count` com `filter` sobre `ManyToManyField` (nem
`prefetch_related`). Como a ONG tem poucas centenas de registros, cada contagem aqui sai de
uma consulta simples as tabelas de ligacao e e agrupada em Python. `Contagens` calcula cada
mapa uma unica vez (preguicosamente) e e reaproveitada por toda a requisicao.
"""

from collections import Counter, defaultdict
from functools import cached_property

from .models import Aluno, Presenca, Professor, Turma

LigacaoAluno = Aluno.turmas.through  # campos: aluno_id, turma_id
LigacaoProfessor = Professor.turmas.through  # campos: professor_id, turma_id


class Contagens:
    @cached_property
    def alunos_ativos_ids(self) -> set:
        return set(Aluno.objects.filter(ativo=True).values_list("pk", flat=True))

    @cached_property
    def professores_ativos_ids(self) -> set:
        return set(Professor.objects.filter(ativo=True).values_list("pk", flat=True))

    @cached_property
    def _matriculas(self) -> list[tuple]:
        """(aluno_id, turma_id) de todas as matriculas."""
        return list(LigacaoAluno.objects.values_list("aluno_id", "turma_id"))

    @cached_property
    def _vinculos_professor(self) -> list[tuple]:
        """(professor_id, turma_id) de todos os vinculos."""
        return list(LigacaoProfessor.objects.values_list("professor_id", "turma_id"))

    @cached_property
    def alunos_por_turma(self) -> Counter:
        """Alunos ATIVOS de cada turma."""
        return Counter(t for a, t in self._matriculas if a in self.alunos_ativos_ids)

    @cached_property
    def professores_por_turma(self) -> Counter:
        """Professores ATIVOS de cada turma."""
        return Counter(t for p, t in self._vinculos_professor if p in self.professores_ativos_ids)

    @cached_property
    def presencas_por_turma(self) -> Counter:
        return Counter(Presenca.objects.values_list("turma_id", flat=True))

    @cached_property
    def alunos_com_turma(self) -> set:
        return {a for a, _t in self._matriculas}

    @cached_property
    def turmas_por_aluno(self) -> dict:
        mapa = defaultdict(set)
        for a, t in self._matriculas:
            mapa[a].add(t)
        return mapa

    @cached_property
    def alunos_por_professor(self) -> dict:
        """Quantos alunos ativos (sem repetir) estudam nas turmas de cada professor."""
        alunos_da_turma = defaultdict(set)
        for a, t in self._matriculas:
            if a in self.alunos_ativos_ids:
                alunos_da_turma[t].add(a)
        por_professor = defaultdict(set)
        for p, t in self._vinculos_professor:
            por_professor[p] |= alunos_da_turma[t]
        return {p: len(alunos) for p, alunos in por_professor.items()}

    def turmas_do_professor(self, professor_id) -> set:
        return {t for p, t in self._vinculos_professor if p == professor_id}


def turmas_ativas() -> list[Turma]:
    return list(Turma.objects.filter(ativo=True).order_by("nome"))
