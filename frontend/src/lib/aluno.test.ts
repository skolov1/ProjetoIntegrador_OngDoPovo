import { describe, expect, it } from 'vitest'

import { calcularIdade, calcularMensalidade, cpfValido, ehMenor, mascararCpf, telefoneValido } from './aluno'

const hoje = new Date(2026, 9, 24) // 24/10/2026

describe('calcularIdade', () => {
  it('conta o aniversário só depois de passar', () => {
    expect(calcularIdade('2008-10-24', hoje)).toBe(18)
    expect(calcularIdade('2008-10-25', hoje)).toBe(17)
    expect(calcularIdade('2015-05-10', hoje)).toBe(11)
  })

  it('devolve null sem data válida', () => {
    expect(calcularIdade('', hoje)).toBeNull()
    expect(calcularIdade('2099-01-01', hoje)).toBeNull()
  })
})

describe('ehMenor', () => {
  it('menor de 18 anos', () => {
    expect(ehMenor('2008-10-25', hoje)).toBe(true)
    expect(ehMenor('2008-10-24', hoje)).toBe(false)
    expect(ehMenor('', hoje)).toBe(false)
  })
})

describe('cpfValido', () => {
  it('aceita CPF com dígitos verificadores corretos, com ou sem máscara', () => {
    expect(cpfValido('52998224725')).toBe(true)
    expect(cpfValido('529.982.247-25')).toBe(true)
  })

  it('recusa dígito errado, tamanho errado e sequência repetida', () => {
    expect(cpfValido('12345678900')).toBe(false)
    expect(cpfValido('5299822472')).toBe(false)
    expect(cpfValido('11111111111')).toBe(false)
  })
})

describe('telefoneValido', () => {
  it('aceita fixo e celular com DDD', () => {
    expect(telefoneValido('(13) 98888-7777')).toBe(true)
    expect(telefoneValido('1332221111')).toBe(true)
  })

  it('recusa curto, longo ou DDD iniciado em 0', () => {
    expect(telefoneValido('98888')).toBe(false)
    expect(telefoneValido('03988887777')).toBe(false)
    expect(telefoneValido('139888877778')).toBe(false)
  })
})

describe('mascararCpf', () => {
  it('mostra só o começo e o fim', () => {
    expect(mascararCpf('12345678900')).toBe('123.***.***-00')
  })
})

describe('calcularMensalidade', () => {
  it('cobra R$ 20 por turma', () => {
    expect(calcularMensalidade(0)).toBe(0)
    expect(calcularMensalidade(1)).toBe(20)
    expect(calcularMensalidade(3)).toBe(60)
  })
})
