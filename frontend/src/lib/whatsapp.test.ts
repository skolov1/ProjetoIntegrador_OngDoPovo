import { describe, expect, it } from 'vitest'

import { linkWhatsapp, topicoEmNegrito } from './whatsapp'

describe('topicoEmNegrito', () => {
  it('usa asteriscos (negrito do WhatsApp) e caixa alta, com acento', () => {
    expect(topicoEmNegrito('Matrícula')).toBe('*MATRÍCULA*')
    expect(topicoEmNegrito(' dúvida geral ')).toBe('*DÚVIDA GERAL*')
  })
})

describe('linkWhatsapp', () => {
  it('aponta para o número da ONG e codifica o texto', () => {
    const link = linkWhatsapp('*MATRÍCULA*\nOlá!')
    expect(link.startsWith('https://wa.me/5513988066437?text=')).toBe(true)
    expect(link).toContain('*MATR%C3%8DCULA*%0AOl%C3%A1!')
  })
})
