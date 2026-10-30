/**
 * Funções puras da "Visão geral" do painel: texto e destino de cada alerta.
 */

import type { VisaoGeralAlertas, VisaoGeralFrequenciaTurma } from '@/api/generated/model'

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

/** Abaixo deste percentual a frequência da turma aparece em alerta (âmbar). */
export const LIMITE_FREQUENCIA_BAIXA = 70

export function frequenciaBaixa(percentual: number): boolean {
  return percentual < LIMITE_FREQUENCIA_BAIXA
}

/** "1 registro", "12 registros": quantas marcações entraram no percentual. */
export function rotuloRegistros(quantidade: number): string {
  return `${quantidade} ${quantidade === 1 ? 'registro' : 'registros'}`
}

/** Valor do seletor para ver todas as turmas de uma vez ("" = ainda não escolheu). */
export const TODAS_AS_TURMAS = 'todas'

/**
 * O que a lista de frequência mostra, conforme a escolha no seletor: nada até a pessoa
 * escolher, todas, ou só uma turma. Com uma única turma não há o que escolher, e ela aparece.
 */
export function selecionarFrequencia(
  lista: VisaoGeralFrequenciaTurma[],
  escolha: string,
): VisaoGeralFrequenciaTurma[] {
  if (lista.length <= 1) return lista
  if (escolha === TODAS_AS_TURMAS) return lista
  return lista.filter((t) => String(t.turma_id) === escolha)
}

/** Opções do seletor de turma, em ordem alfabética (sem diferenciar acento nem maiúscula). */
export function opcoesDeTurma(lista: VisaoGeralFrequenciaTurma[]): { id: number; nome: string }[] {
  return lista
    .map((t) => ({ id: t.turma_id, nome: t.turma }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }))
}
