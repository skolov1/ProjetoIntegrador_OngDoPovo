import { topicoEmNegrito } from '@/lib/whatsapp'

/**
 * Regras do formulário de inscrição.
 *
 * A inscrição não grava nada no banco: vira uma mensagem de WhatsApp. Aqui ficam
 * só funções puras (idade, mensalidade, validação e texto), para poder testar.
 */

export const MODALIDADES = [
  'Muay Thai',
  'Karatê',
  'Kung Fu',
  'Capoeira',
  'Futsal',
  'Futebol de campo',
  'Ballet',
  'Funcional',
  'Jazz',
] as const

/** Cursos com lista de espera (cartaz da ONG). */
export const CURSOS = ['Barbearia', 'Tranças', 'Manicure', 'Sobrancelhas'] as const

/** R$ 20,00 por modalidade, curso ou capacitação. */
export const MENSALIDADE_POR_ATIVIDADE = 20
export const IDADE_MINIMA_CURSO = 14
export const MAIORIDADE = 18

export type DadosInscricao = {
  nome: string
  sobrenome: string
  /** AAAA-MM-DD, como vem do <input type="date">. */
  nascimento: string
  modalidades: string[]
  cursos: string[]
  /** Telefone do próprio aluno (maior de idade que escolheu curso). */
  telefone: string
  responsavelNome: string
  responsavelSobrenome: string
  responsavelTelefone: string
}

export type ErrosInscricao = Partial<Record<keyof DadosInscricao | 'atividades', string>>

const soDigitos = (v: string) => v.replace(/\D/g, '')

function partesDaData(iso: string): [number, number, number] | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return null
  const [ano, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])]
  // Rejeita 31/02 etc.: o Date normaliza e o dia muda.
  const d = new Date(ano, mes - 1, dia)
  if (d.getFullYear() !== ano || d.getMonth() !== mes - 1 || d.getDate() !== dia) return null
  return [ano, mes, dia]
}

/** Idade em anos completos na data `hoje`; `null` se a data for inválida ou futura. */
export function calcularIdade(nascimento: string, hoje: Date = new Date()): number | null {
  const partes = partesDaData(nascimento)
  if (!partes) return null
  const [ano, mes, dia] = partes
  let idade = hoje.getFullYear() - ano
  const aindaNaoFezAniversario =
    hoje.getMonth() + 1 < mes || (hoje.getMonth() + 1 === mes && hoje.getDate() < dia)
  if (aindaNaoFezAniversario) idade -= 1
  return idade < 0 ? null : idade
}

export function calcularMensalidade(quantidadeDeAtividades: number): number {
  return quantidadeDeAtividades * MENSALIDADE_POR_ATIVIDADE
}

export function formatarReais(valor: number): string {
  return `R$ ${valor.toFixed(2).replace('.', ',')}`
}

export function validarInscricao(dados: DadosInscricao, hoje: Date = new Date()): ErrosInscricao {
  const erros: ErrosInscricao = {}

  if (dados.nome.trim().length < 2) erros.nome = 'Informe o nome'
  if (dados.sobrenome.trim().length < 2) erros.sobrenome = 'Informe o sobrenome'

  const idade = calcularIdade(dados.nascimento, hoje)
  if (idade === null || idade > 120) {
    erros.nascimento = 'Informe uma data de nascimento válida'
  }

  if (dados.modalidades.length + dados.cursos.length === 0) {
    erros.atividades = 'Escolha pelo menos uma modalidade ou curso'
  }

  if (idade === null) return erros

  const menor = idade < MAIORIDADE
  if (menor) {
    if (dados.responsavelNome.trim().length < 2) {
      erros.responsavelNome = 'Informe o nome do responsável'
    }
    if (dados.responsavelSobrenome.trim().length < 2) {
      erros.responsavelSobrenome = 'Informe o sobrenome do responsável'
    }
    if (soDigitos(dados.responsavelTelefone).length < 10) {
      erros.responsavelTelefone = 'Informe o telefone do responsável com DDD'
    }
  }

  if (dados.cursos.length > 0) {
    if (idade < IDADE_MINIMA_CURSO) {
      erros.cursos = `Os cursos são para quem tem ${IDADE_MINIMA_CURSO} anos ou mais`
    }
    if (!menor && soDigitos(dados.telefone).length < 10) {
      erros.telefone = 'Informe um telefone com DDD para contato'
    }
  }

  return erros
}

const nomeCompleto = (nome: string, sobrenome: string) => `${nome.trim()} ${sobrenome.trim()}`

function dataBr(iso: string): string {
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
}

/** Texto que o visitante envia no WhatsApp. Assume que `validarInscricao` passou. */
export function montarMensagemInscricao(dados: DadosInscricao, hoje: Date = new Date()): string {
  const idade = calcularIdade(dados.nascimento, hoje)
  const total = dados.modalidades.length + dados.cursos.length

  // Só cursos = lista de espera; com modalidade, é matrícula.
  const topico = dados.modalidades.length > 0 ? 'Matrícula' : 'Lista de espera'

  const linhas = [
    topicoEmNegrito(topico),
    'Olá, ONG do Povo! Quero fazer uma inscrição.',
    '',
    `Aluno: ${nomeCompleto(dados.nome, dados.sobrenome)}`,
    `Data de nascimento: ${dataBr(dados.nascimento)} (${idade} anos)`,
  ]
  if (dados.modalidades.length > 0) linhas.push(`Modalidades: ${dados.modalidades.join(', ')}`)
  if (dados.cursos.length > 0) linhas.push(`Cursos (lista de espera): ${dados.cursos.join(', ')}`)

  if (idade !== null && idade < MAIORIDADE) {
    linhas.push(
      `Responsável: ${nomeCompleto(dados.responsavelNome, dados.responsavelSobrenome)} — ` +
        dados.responsavelTelefone.trim(),
    )
  } else if (dados.cursos.length > 0) {
    linhas.push(`Telefone para contato: ${dados.telefone.trim()}`)
  }

  linhas.push(
    '',
    `Mensalidade estimada: ${formatarReais(calcularMensalidade(total))} ` +
      `(${formatarReais(MENSALIDADE_POR_ATIVIDADE)} por modalidade ou curso)`,
  )
  return linhas.join('\n')
}
