import { describe, expect, it } from 'vitest'

import { rotuloAlunos, textoExcluirTurma, totalDePaginas } from './cadastros'

describe('textoExcluirTurma', () => {
  it('avisa quantas presenças serão apagadas junto', () => {
    const texto = textoExcluirTurma(12)

    expect(texto).toContain('12 presenças')
    expect(texto).toContain('apaga')
    expect(texto).toContain('Inativar')
  })

  it('usa o singular com uma presença', () => {
    expect(textoExcluirTurma(1)).toContain('1 presença ')
  })

  it('sem presenças, diz que não há histórico a perder', () => {
    const texto = textoExcluirTurma(0)

    expect(texto).toContain('não tem presenças')
    expect(texto).toContain('não pode ser desfeita')
  })
})

describe('totalDePaginas', () => {
  it('arredonda para cima', () => {
    expect(totalDePaginas(41, 20)).toBe(3)
    expect(totalDePaginas(40, 20)).toBe(2)
  })

  it('nunca é menos de uma página', () => {
    expect(totalDePaginas(0, 20)).toBe(1)
  })

  it('o padrão é 20 por página', () => {
    expect(totalDePaginas(21)).toBe(2)
  })
})

describe('rotuloAlunos', () => {
  it('trata zero, um e vários', () => {
    expect(rotuloAlunos(0)).toBe('Nenhum aluno')
    expect(rotuloAlunos(1)).toBe('1 aluno')
    expect(rotuloAlunos(7)).toBe('7 alunos')
  })
})
