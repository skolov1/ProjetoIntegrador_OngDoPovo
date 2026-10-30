/**
 * Funções puras da "Visão geral" do painel: texto e destino de cada alerta.
 */

import type { VisaoGeralAlertas } from '@/api/generated/model'

/** Abas do painel para onde um alerta leva. */
export type TelaDestino = 'presenca' | 'alunos' | 'doacoes' | 'turmas'

export interface Alerta {
  chave: keyof VisaoGeralAlertas
  texto: string
  quantidade: number
  tela: TelaDestino
}

const plural = (n: number, singular: string, mais: string) => `${n} ${n === 1 ? singular : mais}`

// Ordem = prioridade na tela: o que mais precisa de ação vem primeiro.
const REGRAS: {
  chave: keyof VisaoGeralAlertas
  tela: TelaDestino
  texto: (n: number) => string
}[] = [
  {
    chave: 'faltantes',
    tela: 'presenca',
    texto: (n) => `${plural(n, 'aluno', 'alunos')} com 3 faltas seguidas`,
  },
  {
    chave: 'emprestimos_atrasados',
    tela: 'doacoes',
    texto: (n) => plural(n, 'empréstimo atrasado', 'empréstimos atrasados'),
  },
  {
    chave: 'turmas_sem_professor',
    tela: 'turmas',
    texto: (n) => `${plural(n, 'turma', 'turmas')} sem professor`,
  },
  {
    chave: 'alunos_sem_turma',
    tela: 'alunos',
    texto: (n) => `${plural(n, 'aluno', 'alunos')} sem turma`,
  },
]

/** Só os alertas com algo a resolver (quantidade maior que zero). */
export function montarAlertas(alertas: VisaoGeralAlertas): Alerta[] {
  return REGRAS.filter((r) => alertas[r.chave] > 0).map((r) => ({
    chave: r.chave,
    quantidade: alertas[r.chave],
    tela: r.tela,
    texto: r.texto(alertas[r.chave]),
  }))
}

/** "75%", ou um traço quando o mês ainda não tem chamadas. */
export function formatarFrequencia(valor: number | null): string {
  return valor === null ? '—' : `${valor}%`
}
