import { describe, expect, it } from 'vitest'

import type { VisaoGeralAlertas, VisaoGeralFrequenciaTurma } from '@/api/generated/model'

import {
  LIMITE_FREQUENCIA_BAIXA,
  filtrarFrequencia,
  formatarFrequencia,
  frequenciaBaixa,
  montarAlertas,
  opcoesDeTurma,
  rotuloRegistros,
} from './visaoGeral'

const ZERADOS: VisaoGeralAlertas = {
  faltantes: 0,
  emprestimos_atrasados: 0,
  turmas_sem_professor: 0,
  alunos_sem_turma: 0,
}

describe('montarAlertas', () => {
  it('sem nenhum alerta devolve lista vazia', () => {
    expect(montarAlertas(ZERADOS)).toEqual([])
  })

  it('só traz os alertas com quantidade maior que zero', () => {
    const alertas = montarAlertas({ ...ZERADOS, faltantes: 2, alunos_sem_turma: 1 })

    expect(alertas.map((a) => a.chave)).toEqual(['faltantes', 'alunos_sem_turma'])
  })

  it('cada alerta leva para a tela onde a pessoa resolve', () => {
    const alertas = montarAlertas({
      faltantes: 1,
      emprestimos_atrasados: 1,
      turmas_sem_professor: 1,
      alunos_sem_turma: 1,
    })

    expect(Object.fromEntries(alertas.map((a) => [a.chave, a.tela]))).toEqual({
      faltantes: 'presenca',
      emprestimos_atrasados: 'doacoes',
      turmas_sem_professor: 'turmas',
      alunos_sem_turma: 'alunos',
    })
  })

  it('o texto concorda com a quantidade (singular e plural)', () => {
    const um = montarAlertas({
      faltantes: 1,
      emprestimos_atrasados: 1,
      turmas_sem_professor: 1,
      alunos_sem_turma: 1,
    }).map((a) => a.texto)
    const varios = montarAlertas({
      faltantes: 3,
      emprestimos_atrasados: 2,
      turmas_sem_professor: 2,
      alunos_sem_turma: 5,
    }).map((a) => a.texto)

    expect(um).toEqual([
      '1 aluno com 3 faltas seguidas',
      '1 empréstimo atrasado',
      '1 turma sem professor',
      '1 aluno sem turma',
    ])
    expect(varios).toEqual([
      '3 alunos com 3 faltas seguidas',
      '2 empréstimos atrasados',
      '2 turmas sem professor',
      '5 alunos sem turma',
    ])
  })
})

describe('formatarFrequencia', () => {
  it('mostra o percentual', () => {
    expect(formatarFrequencia(75)).toBe('75%')
    expect(formatarFrequencia(0)).toBe('0%')
  })

  it('sem chamadas no mês mostra um traço', () => {
    expect(formatarFrequencia(null)).toBe('—')
  })
})

describe('frequenciaBaixa', () => {
  it('o limite é 70%: abaixo dele é baixa, a partir dele não', () => {
    expect(LIMITE_FREQUENCIA_BAIXA).toBe(70)
    expect(frequenciaBaixa(69)).toBe(true)
    expect(frequenciaBaixa(70)).toBe(false)
    expect(frequenciaBaixa(100)).toBe(false)
    expect(frequenciaBaixa(0)).toBe(true)
  })
})

describe('rotuloRegistros', () => {
  it('concorda com a quantidade', () => {
    expect(rotuloRegistros(1)).toBe('1 registro')
    expect(rotuloRegistros(12)).toBe('12 registros')
  })
})

const TURMAS: VisaoGeralFrequenciaTurma[] = [
  { turma_id: 3, turma: 'Muay Thai', percentual: 50, registros: 10 },
  { turma_id: 1, turma: 'Futsal', percentual: 80, registros: 8 },
  { turma_id: 2, turma: 'Ballet', percentual: 95, registros: 4 },
]

describe('filtrarFrequencia', () => {
  it('sem turma escolhida mostra todas, na ordem que a API mandou', () => {
    expect(filtrarFrequencia(TURMAS, null)).toEqual(TURMAS)
  })

  it('com uma turma escolhida mostra só ela', () => {
    expect(filtrarFrequencia(TURMAS, 1)).toEqual([TURMAS[1]])
  })

  it('se a turma escolhida não está mais na lista, volta a mostrar todas', () => {
    expect(filtrarFrequencia(TURMAS, 99)).toEqual(TURMAS)
  })
})

describe('opcoesDeTurma', () => {
  it('lista as turmas em ordem alfabética, com id e nome', () => {
    expect(opcoesDeTurma(TURMAS)).toEqual([
      { id: 2, nome: 'Ballet' },
      { id: 1, nome: 'Futsal' },
      { id: 3, nome: 'Muay Thai' },
    ])
  })

  it('ignora acento e maiúscula na ordem', () => {
    const nomes = opcoesDeTurma([
      { turma_id: 1, turma: 'Zumba', percentual: 1, registros: 1 },
      { turma_id: 2, turma: 'água', percentual: 1, registros: 1 },
      { turma_id: 3, turma: 'Balé', percentual: 1, registros: 1 },
    ]).map((o) => o.nome)

    expect(nomes).toEqual(['água', 'Balé', 'Zumba'])
  })
})
