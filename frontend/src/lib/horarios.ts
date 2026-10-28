/**
 * Dias e horários de uma turma (formulário do painel) e o texto público da grade.
 * Funções puras, sem React, para testar sem montar tela.
 */

import type { DiaSemanaEnum } from '@/api/generated/model'

/** Segunda a domingo, na ordem em que aparecem nos selects. */
export const DIAS_DA_SEMANA: readonly [DiaSemanaEnum, string][] = [
  ['SEG', 'Segunda'],
  ['TER', 'Terça'],
  ['QUA', 'Quarta'],
  ['QUI', 'Quinta'],
  ['SEX', 'Sexta'],
  ['SAB', 'Sábado'],
  ['DOM', 'Domingo'],
]

const ROTULO_DIA = Object.fromEntries(DIAS_DA_SEMANA) as Record<DiaSemanaEnum, string>

/** Uma linha "dia + início + fim" do formulário da turma (horas como "HH:MM"). */
export type HorarioForm = {
  dia_semana: DiaSemanaEnum
  horario_inicio: string
  horario_fim: string
}

export function horarioVazio(): HorarioForm {
  return { dia_semana: 'SEG', horario_inicio: '08:00', horario_fim: '09:00' }
}

/**
 * Mensagem do primeiro problema nos horários, ou `null` se estiver tudo certo.
 * Espelha o que a API recusa: ao menos um horário, fim depois do início e dois
 * horários no mesmo dia não podem começar na mesma hora.
 */
export function validarHorarios(horarios: HorarioForm[]): string | null {
  if (horarios.length === 0) return 'Adicione ao menos um dia e horário.'
  if (horarios.some((h) => !h.horario_inicio || !h.horario_fim)) {
    return 'Preencha o início e o fim de todos os horários.'
  }
  const vistos = new Set<string>()
  for (const h of horarios) {
    const dia = ROTULO_DIA[h.dia_semana]
    // "HH:MM" compara certo como texto.
    if (h.horario_fim <= h.horario_inicio) return `${dia}: o fim precisa ser depois do início.`
    const chave = `${h.dia_semana}|${h.horario_inicio}`
    if (vistos.has(chave)) return `${dia}: há dois horários começando às ${h.horario_inicio}.`
    vistos.add(chave)
  }
  return null
}

/**
 * Linha nova para o botão "Adicionar dia": repete o horário da última linha no primeiro
 * dia da semana que ainda não tem aquele horário (o caso comum é a mesma aula em vários dias).
 */
export function novoHorarioDepoisDe(horarios: HorarioForm[]): HorarioForm {
  const ultimo = horarios[horarios.length - 1]
  if (!ultimo) return horarioVazio()
  const usados = new Set(
    horarios
      .filter((h) => h.horario_inicio === ultimo.horario_inicio)
      .map((h) => h.dia_semana),
  )
  const livre = DIAS_DA_SEMANA.find(([codigo]) => !usados.has(codigo))
  return { ...ultimo, dia_semana: livre ? livre[0] : ultimo.dia_semana }
}

/**
 * Texto da situação na grade pública. "Falta professor" é uma informação interna;
 * para o visitante vira um convite.
 */
export function rotuloPublicoDoStatus(status: string): string {
  if (status === 'FALTA_PROFESSOR') return 'Procuramos professor'
  if (status === 'AGENDADO') return 'Agendado'
  return 'Ativo'
}

/** Tipos e situações de um evento ou serviço (bloco "Eventos e serviços" do site). */
export const TIPOS_EVENTO_SERVICO = [
  ['EVENTO', 'Evento'],
  ['SERVICO', 'Serviço'],
  ['CAMPANHA', 'Campanha'],
] as const

export const SITUACOES_EVENTO_SERVICO = [
  ['AGENDADO', 'Agendado'],
  ['ABERTO', 'Aberto'],
  ['ENCERRADO', 'Encerrado'],
] as const

/** Formulário de um evento, serviço ou campanha (não é turma: sem alunos nem chamada). */
export type AtividadeForm = {
  nome: string
  tipo: (typeof TIPOS_EVENTO_SERVICO)[number][0]
  /** Data específica (AAAA-MM-DD). Não combina com dia da semana. */
  data: string
  /** Recorrência ("toda quinta"). Sem data e sem dia = "sob agendamento". */
  dia_semana: DiaSemanaEnum | ''
  horario_inicio: string
  horario_fim: string
  /** Usado quando não há faixa de horário. Ex.: "Sob agendamento". */
  horario_texto: string
  status: (typeof SITUACOES_EVENTO_SERVICO)[number][0]
  /** "Mostrar no site". */
  visivel_na_grade: boolean
}

/** Mensagem do primeiro problema no formulário da atividade, ou `null` se estiver certo. */
export function validarAtividadeAvulsa(f: AtividadeForm): string | null {
  if (!f.nome.trim()) return 'Informe o nome da atividade.'
  if (f.data && f.dia_semana) return 'Use a data ou o dia da semana, não os dois.'
  if (Boolean(f.horario_inicio) !== Boolean(f.horario_fim)) {
    return 'Informe o início e o fim, ou deixe os dois vazios.'
  }
  if (f.horario_inicio && f.horario_fim <= f.horario_inicio) {
    return 'O fim precisa ser depois do início.'
  }
  return null
}
