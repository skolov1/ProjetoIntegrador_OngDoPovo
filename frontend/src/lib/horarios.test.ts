import { describe, expect, it } from 'vitest'

import {
  DIAS_DA_SEMANA,
  horarioVazio,
  novoHorarioDepoisDe,
  rotuloPublicoDoStatus,
  validarAtividadeAvulsa,
  validarHorarios,
  type AtividadeForm,
  type HorarioForm,
} from './horarios'

const seg = (inicio = '19:30', fim = '20:30'): HorarioForm => ({
  dia_semana: 'SEG',
  horario_inicio: inicio,
  horario_fim: fim,
})
const qua = (inicio = '19:30', fim = '20:30'): HorarioForm => ({ ...seg(inicio, fim), dia_semana: 'QUA' })

describe('DIAS_DA_SEMANA', () => {
  it('vai de segunda a domingo', () => {
    expect(DIAS_DA_SEMANA.map(([codigo]) => codigo)).toEqual([
      'SEG',
      'TER',
      'QUA',
      'QUI',
      'SEX',
      'SAB',
      'DOM',
    ])
  })
})

describe('horarioVazio', () => {
  it('começa na segunda, das 8h às 9h', () => {
    expect(horarioVazio()).toEqual({
      dia_semana: 'SEG',
      horario_inicio: '08:00',
      horario_fim: '09:00',
    })
  })
})

describe('validarHorarios', () => {
  it('aceita um ou mais horários corretos', () => {
    expect(validarHorarios([seg()])).toBeNull()
    expect(validarHorarios([seg(), qua()])).toBeNull()
  })

  it('exige ao menos um horário', () => {
    expect(validarHorarios([])).toBe('Adicione ao menos um dia e horário.')
  })

  it('exige início e fim preenchidos', () => {
    expect(validarHorarios([seg('', '20:30')])).toBe('Preencha o início e o fim de todos os horários.')
  })

  it('o fim precisa ser depois do início, e diz em que dia', () => {
    expect(validarHorarios([qua('20:00', '19:00')])).toBe(
      'Quarta: o fim precisa ser depois do início.',
    )
    expect(validarHorarios([seg('19:00', '19:00')])).toBe(
      'Segunda: o fim precisa ser depois do início.',
    )
  })

  it('recusa o mesmo dia começando na mesma hora', () => {
    expect(validarHorarios([seg('19:00', '20:00'), seg('19:00', '21:00')])).toBe(
      'Segunda: há dois horários começando às 19:00.',
    )
  })

  it('aceita o mesmo dia em horários diferentes', () => {
    expect(validarHorarios([seg('08:00', '09:00'), seg('19:00', '20:00')])).toBeNull()
  })
})

describe('novoHorarioDepoisDe', () => {
  it('repete o horário da última linha no primeiro dia ainda livre', () => {
    expect(novoHorarioDepoisDe([seg('19:30', '20:30')])).toEqual({
      dia_semana: 'TER',
      horario_inicio: '19:30',
      horario_fim: '20:30',
    })
  })

  it('pula os dias já usados com aquele horário', () => {
    expect(novoHorarioDepoisDe([seg(), { ...seg(), dia_semana: 'TER' }])).toMatchObject({
      dia_semana: 'QUA',
    })
  })

  it('sem linhas, devolve o horário padrão', () => {
    expect(novoHorarioDepoisDe([])).toEqual(horarioVazio())
  })
})

describe('rotuloPublicoDoStatus', () => {
  it('troca "Falta professor" por um convite, sem soar como aviso', () => {
    expect(rotuloPublicoDoStatus('FALTA_PROFESSOR')).toBe('Procuramos professor')
    expect(rotuloPublicoDoStatus('ATIVO')).toBe('Ativo')
    expect(rotuloPublicoDoStatus('AGENDADO')).toBe('Agendado')
  })
})

describe('validarAtividadeAvulsa', () => {
  const base: AtividadeForm = {
    nome: 'Atendimento oftalmológico',
    dia_semana: 'QUI',
    horario_inicio: '',
    horario_fim: '',
    horario_texto: 'Sob agendamento',
    status: 'ATIVO',
    visivel_na_grade: true,
  }

  it('aceita atividade só com texto de horário', () => {
    expect(validarAtividadeAvulsa(base)).toBeNull()
  })

  it('aceita faixa de horário completa e atividade "a combinar"', () => {
    expect(validarAtividadeAvulsa({ ...base, horario_inicio: '09:00', horario_fim: '11:00' })).toBeNull()
    expect(validarAtividadeAvulsa({ ...base, dia_semana: '', horario_texto: '' })).toBeNull()
  })

  it('exige o nome', () => {
    expect(validarAtividadeAvulsa({ ...base, nome: '   ' })).toBe('Informe o nome da atividade.')
  })

  it('início e fim vêm juntos ou nenhum dos dois', () => {
    expect(validarAtividadeAvulsa({ ...base, horario_inicio: '09:00' })).toBe(
      'Informe o início e o fim, ou deixe os dois vazios.',
    )
    expect(validarAtividadeAvulsa({ ...base, horario_fim: '11:00' })).toBe(
      'Informe o início e o fim, ou deixe os dois vazios.',
    )
  })

  it('o fim precisa ser depois do início', () => {
    expect(validarAtividadeAvulsa({ ...base, horario_inicio: '11:00', horario_fim: '09:00' })).toBe(
      'O fim precisa ser depois do início.',
    )
  })
})
