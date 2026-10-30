import { describe, expect, it } from 'vitest'

import type { VisaoGeralAlertas } from '@/api/generated/model'

import { formatarFrequencia, montarAlertas } from './visaoGeral'

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
