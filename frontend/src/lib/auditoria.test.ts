import { describe, expect, it } from 'vitest'

import { formatarDataHora, iniciais, listarMudancas } from './auditoria'

describe('iniciais', () => {
  it('usa a primeira letra do nome e do sobrenome', () => {
    expect(iniciais('Maria Silva')).toBe('MS')
  })

  it('com mais de dois nomes, usa o primeiro e o último', () => {
    expect(iniciais('João Pedro de Souza')).toBe('JS')
  })

  it('com um nome só, usa uma letra', () => {
    expect(iniciais('admin')).toBe('A')
  })

  it('ignora espaços sobrando e vem em maiúsculas', () => {
    expect(iniciais('  ana  lima ')).toBe('AL')
  })

  it('devolve ponto de interrogação sem nome', () => {
    expect(iniciais('')).toBe('?')
  })
})

describe('formatarDataHora', () => {
  it('mostra dia, mês, ano e hora no horário local', () => {
    const iso = new Date(2026, 9, 27, 23, 15).toISOString()
    expect(formatarDataHora(iso)).toBe('27/10/2026 às 23:15')
  })

  it('completa com zero à esquerda', () => {
    const iso = new Date(2026, 0, 5, 8, 3).toISOString()
    expect(formatarDataHora(iso)).toBe('05/01/2026 às 08:03')
  })
})

describe('listarMudancas', () => {
  it('transforma o objeto da API em linhas com rótulo, antes e depois', () => {
    const linhas = listarMudancas({
      quantidade: { rotulo: 'Quantidade', de: '2', para: '5' },
      doador_nome: { rotulo: 'Doador', de: '', para: 'Joana' },
    })

    expect(linhas).toEqual([
      { campo: 'quantidade', rotulo: 'Quantidade', de: '2', para: '5' },
      { campo: 'doador_nome', rotulo: 'Doador', de: '', para: 'Joana' },
    ])
  })

  it('devolve lista vazia quando não há detalhe', () => {
    expect(listarMudancas({})).toEqual([])
    expect(listarMudancas(undefined)).toEqual([])
  })
})
