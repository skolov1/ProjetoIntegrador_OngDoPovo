import { describe, expect, it } from 'vitest'

import { dataLocalISO, formatarDataBr, textoAvisoAtrasados } from './emprestimo'

describe('dataLocalISO', () => {
  it('usa o dia local, não o dia em UTC', () => {
    // 27/10/2026 às 23h no horário local: em UTC (UTC-3) já seria dia 28.
    expect(dataLocalISO(new Date(2026, 9, 27, 23, 0))).toBe('2026-10-27')
  })

  it('completa mês e dia com zero à esquerda', () => {
    expect(dataLocalISO(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})

describe('formatarDataBr', () => {
  it('converte AAAA-MM-DD para DD/MM/AAAA sem mexer no fuso', () => {
    expect(formatarDataBr('2026-10-27')).toBe('27/10/2026')
  })

  it('devolve travessão quando não há data', () => {
    expect(formatarDataBr(null)).toBe('—')
    expect(formatarDataBr(undefined)).toBe('—')
  })
})

describe('textoAvisoAtrasados', () => {
  it('não avisa quando não há atrasados', () => {
    expect(textoAvisoAtrasados(0)).toBeNull()
  })

  it('usa singular e plural', () => {
    expect(textoAvisoAtrasados(1)).toBe('1 item está emprestado há mais de 3 meses.')
    expect(textoAvisoAtrasados(2)).toBe('2 itens estão emprestados há mais de 3 meses.')
  })
})
