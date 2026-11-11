import { describe, expect, it } from 'vitest'

import type { GradeItem } from '@/api/generated/model'

import { agruparPorDia, diaInicial, estiloDoStatus } from './grade'

describe('estiloDoStatus', () => {
  it('cada situação da grade tem a própria cor', () => {
    const ativo = estiloDoStatus('ATIVO')
    const agendado = estiloDoStatus('AGENDADO')
    const falta = estiloDoStatus('FALTA_PROFESSOR')

    expect(ativo).toContain('verde')
    expect(agendado).toContain('azul')
    expect(falta).toContain('amarelo')
    expect(new Set([ativo, agendado, falta]).size).toBe(3)
  })

  it('Aberto tem a cor de ativo', () => {
    expect(estiloDoStatus('ABERTO')).toContain('verde')
  })

  it('situação desconhecida cai num estilo neutro, sem quebrar', () => {
    expect(estiloDoStatus('OUTRA')).toContain('mist')
  })
})

const item = (over: Partial<GradeItem>): GradeItem => ({
  chave: `${over.nome}-${over.dia}`,
  nome: 'Aula',
  dia: 'SEG',
  dia_rotulo: 'Segunda',
  horario_inicio: '19:00',
  horario_fim: '20:00',
  horario: '19:00–20:00',
  status: 'ATIVO',
  status_rotulo: 'Ativo',
  ...over,
})

describe('agruparPorDia', () => {
  it('junta as aulas por dia, na ordem da semana, e só cria aba para dia com aula', () => {
    const grupos = agruparPorDia([
      item({ nome: 'Jazz', dia: 'QUI', dia_rotulo: 'Quinta' }),
      item({ nome: 'Futsal', dia: 'SEG' }),
      item({ nome: 'Capoeira', dia: 'SEG' }),
    ])

    expect(grupos.map((g) => g.dia)).toEqual(['SEG', 'QUI'])
    expect(grupos[0]).toMatchObject({ rotulo: 'Segunda', curto: 'Seg' })
    expect(grupos[0].itens).toHaveLength(2)
  })

  it('dentro do dia, ordena por horário de início e depois pelo nome', () => {
    const [seg] = agruparPorDia([
      item({ nome: 'Muay Thai Adulto', horario_inicio: '20:30' }),
      item({ nome: 'Futsal', horario_inicio: '19:00' }),
      item({ nome: 'Kung Fu', horario_inicio: '19:30' }),
      item({ nome: 'Ballet', horario_inicio: '19:30' }),
    ])

    expect(seg.itens.map((i) => i.nome)).toEqual(['Futsal', 'Ballet', 'Kung Fu', 'Muay Thai Adulto'])
  })

  it('atividade sem dia vai para a aba "A combinar", por último', () => {
    const grupos = agruparPorDia([
      item({ nome: 'Reforço', dia: '', dia_rotulo: '' }),
      item({ nome: 'Futsal', dia: 'SEX', dia_rotulo: 'Sexta' }),
    ])

    expect(grupos.map((g) => g.dia)).toEqual(['SEX', ''])
    expect(grupos[1]).toMatchObject({ rotulo: 'A combinar', curto: 'A combinar' })
  })

  it('grade vazia não tem abas', () => {
    expect(agruparPorDia([])).toEqual([])
  })
})

describe('diaInicial', () => {
  const grupos = agruparPorDia([
    item({ dia: 'SEG' }),
    item({ dia: 'QUA', dia_rotulo: 'Quarta' }),
    item({ dia: 'SEX', dia_rotulo: 'Sexta' }),
  ])

  it('abre no dia de hoje quando hoje tem aula', () => {
    // 11/11/2026 é uma quarta-feira.
    expect(diaInicial(grupos, new Date(2026, 10, 11))).toBe('QUA')
  })

  it('sem aula hoje, abre no próximo dia com aula', () => {
    expect(diaInicial(grupos, new Date(2026, 10, 12))).toBe('SEX') // quinta → sexta
  })

  it('depois do último dia da semana, volta para o primeiro', () => {
    expect(diaInicial(grupos, new Date(2026, 10, 14))).toBe('SEG') // sábado → segunda
  })

  it('sem nenhum grupo devolve vazio', () => {
    expect(diaInicial([], new Date(2026, 10, 11))).toBe('')
  })
})
