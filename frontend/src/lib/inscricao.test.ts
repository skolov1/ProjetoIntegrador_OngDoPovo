import { describe, expect, it } from 'vitest'

import {
  calcularIdade,
  calcularMensalidade,
  formatarReais,
  montarMensagemInscricao,
  validarInscricao,
  type DadosInscricao,
} from './inscricao'

// Data fixa para os testes não dependerem do dia em que rodam.
const HOJE = new Date(2026, 9, 24) // 24/10/2026

const base: DadosInscricao = {
  nome: 'Ana',
  sobrenome: 'Souza',
  nascimento: '1990-05-10',
  modalidades: ['Muay Thai'],
  cursos: [],
  telefone: '',
  responsavelNome: '',
  responsavelSobrenome: '',
  responsavelTelefone: '',
}

describe('calcularIdade', () => {
  it('conta anos completos', () => {
    expect(calcularIdade('2015-10-24', HOJE)).toBe(11) // aniversário hoje
    expect(calcularIdade('2015-10-25', HOJE)).toBe(10) // aniversário amanhã
    expect(calcularIdade('2015-01-01', HOJE)).toBe(11)
  })

  it('rejeita data inválida ou futura', () => {
    expect(calcularIdade('', HOJE)).toBeNull()
    expect(calcularIdade('2015-02-31', HOJE)).toBeNull()
    expect(calcularIdade('2030-01-01', HOJE)).toBeNull()
  })
})

describe('mensalidade', () => {
  it('é R$ 20,00 por modalidade ou curso', () => {
    expect(calcularMensalidade(0)).toBe(0)
    expect(calcularMensalidade(1)).toBe(20)
    expect(calcularMensalidade(3)).toBe(60)
    expect(formatarReais(40)).toBe('R$ 40,00')
  })
})

describe('validarInscricao', () => {
  it('aceita adulto com uma modalidade', () => {
    expect(validarInscricao(base, HOJE)).toEqual({})
  })

  it('exige nome, sobrenome e pelo menos uma atividade', () => {
    const erros = validarInscricao({ ...base, nome: '', sobrenome: ' ', modalidades: [] }, HOJE)
    expect(erros.nome).toBeDefined()
    expect(erros.sobrenome).toBeDefined()
    expect(erros.atividades).toBeDefined()
  })

  it('menor de 18 exige nome e telefone do responsável', () => {
    const menor = { ...base, nascimento: '2015-05-10' }
    const erros = validarInscricao(menor, HOJE)
    expect(erros.responsavelNome).toBeDefined()
    expect(erros.responsavelSobrenome).toBeDefined()
    expect(erros.responsavelTelefone).toBeDefined()

    const ok = {
      ...menor,
      responsavelNome: 'Maria',
      responsavelSobrenome: 'Souza',
      responsavelTelefone: '(13) 99999-0000',
    }
    expect(validarInscricao(ok, HOJE)).toEqual({})
  })

  it('18 anos completos já é maior de idade', () => {
    expect(validarInscricao({ ...base, nascimento: '2008-10-24' }, HOJE)).toEqual({})
  })

  it('curso só a partir de 14 anos (inclusive)', () => {
    const responsavel = {
      responsavelNome: 'Maria',
      responsavelSobrenome: 'Souza',
      responsavelTelefone: '13999990000',
    }
    const aos13 = { ...base, ...responsavel, nascimento: '2013-10-25', modalidades: [], cursos: ['Tranças'] }
    expect(validarInscricao(aos13, HOJE).cursos).toBeDefined()

    const aos14 = { ...aos13, nascimento: '2012-10-24' }
    expect(validarInscricao(aos14, HOJE).cursos).toBeUndefined()
  })

  it('adulto que escolhe curso precisa informar telefone', () => {
    const comCurso = { ...base, modalidades: [], cursos: ['Barbearia'] }
    expect(validarInscricao(comCurso, HOJE).telefone).toBeDefined()
    expect(validarInscricao({ ...comCurso, telefone: '13988066437' }, HOJE)).toEqual({})
  })
})

describe('montarMensagemInscricao', () => {
  it('adulto com modalidades', () => {
    const msg = montarMensagemInscricao({ ...base, modalidades: ['Muay Thai', 'Jazz'] }, HOJE)
    expect(msg).toContain('Aluno: Ana Souza')
    expect(msg).toContain('Data de nascimento: 10/05/1990 (36 anos)')
    expect(msg).toContain('Modalidades: Muay Thai, Jazz')
    expect(msg).toContain('Mensalidade estimada: R$ 40,00')
    expect(msg).not.toContain('Responsável')
  })

  it('menor leva o responsável; curso entra como lista de espera e conta na mensalidade', () => {
    const msg = montarMensagemInscricao(
      {
        ...base,
        nascimento: '2010-03-02',
        modalidades: ['Futsal'],
        cursos: ['Manicure'],
        responsavelNome: 'Maria',
        responsavelSobrenome: 'Souza',
        responsavelTelefone: '(13) 99999-0000',
      },
      HOJE,
    )
    expect(msg).toContain('(16 anos)')
    expect(msg).toContain('Cursos (lista de espera): Manicure')
    expect(msg).toContain('Responsável: Maria Souza — (13) 99999-0000')
    expect(msg).toContain('Mensalidade estimada: R$ 40,00')
  })

  it('adulto com curso leva o telefone para contato', () => {
    const msg = montarMensagemInscricao(
      { ...base, modalidades: [], cursos: ['Barbearia'], telefone: '(13) 98806-6437' },
      HOJE,
    )
    expect(msg).toContain('Telefone para contato: (13) 98806-6437')
  })

  it('quebra de linha e acentos sobrevivem à codificação do link', () => {
    const msg = montarMensagemInscricao(base, HOJE)
    const link = `?text=${encodeURIComponent(msg)}`
    expect(link).toContain('%0A')
    expect(decodeURIComponent(link.slice(6))).toBe(msg)
  })
})
