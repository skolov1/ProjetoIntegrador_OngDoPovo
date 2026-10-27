import { describe, expect, it } from 'vitest'

import { estiloDoStatus } from './grade'

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

  it('situação desconhecida cai num estilo neutro, sem quebrar', () => {
    expect(estiloDoStatus('OUTRA')).toContain('mist')
  })
})
