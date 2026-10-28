import { describe, expect, it } from 'vitest'

import { linkWhatsapp, mensagemParticipar, topicoEmNegrito } from './whatsapp'

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

describe('mensagemParticipar', () => {
  it('abre com o tipo em negrito e cita o nome e o quando', () => {
    const msg = mensagemParticipar({
      nome: 'Atendimento oftalmológico',
      tipo_rotulo: 'Serviço',
      quando: 'Toda quinta',
    })

    expect(msg.split('\n')[0]).toBe('*SERVIÇO*')
    expect(msg).toContain('"Atendimento oftalmológico" (Toda quinta)')
  })
})
