/**
 * Visual das situações da grade da semana (landing).
 * As situações vêm da API (`/grade/`): ATIVO, AGENDADO e FALTA_PROFESSOR.
 */

const ESTILOS: Record<string, string> = {
  ATIVO: 'bg-verde/10 text-verde',
  AGENDADO: 'bg-azul/10 text-azul',
  FALTA_PROFESSOR: 'bg-amarelo/20 text-[#8a6100]',
  ABERTO: 'bg-verde/10 text-verde',
}

/** Classes do selo da situação; uma situação nova (ainda sem cor) cai num estilo neutro. */
export function estiloDoStatus(status: string): string {
  return ESTILOS[status] ?? 'bg-mist-100 text-grafite/70'
}

/** Um dia da grade pública: a aba e as aulas dele, já em ordem de horário. */
export type GrupoDoDia<T> = {
  /** Código do dia (SEG...DOM) ou '' para "A combinar". */
  dia: string
  /** Nome inteiro, para telas largas e leitores de tela. */
  rotulo: string
  /** Nome curto da aba no celular. */
  curto: string
  itens: T[]
}

type ItemDaGrade = { nome: string; dia: string; horario_inicio: string }

// Na ordem da semana; [código, nome, abreviação]. O índice + 1 bate com Date.getDay() (DOM = 0).
const SEMANA: readonly [string, string, string][] = [
  ['SEG', 'Segunda', 'Seg'],
  ['TER', 'Terça', 'Ter'],
  ['QUA', 'Quarta', 'Qua'],
  ['QUI', 'Quinta', 'Qui'],
  ['SEX', 'Sexta', 'Sex'],
  ['SAB', 'Sábado', 'Sáb'],
  ['DOM', 'Domingo', 'Dom'],
]

/**
 * Agrupa as linhas da grade em abas por dia da semana. Só entra dia que tem aula;
 * atividade sem dia fixo vai para "A combinar", no fim. Dentro do dia, por horário e nome.
 */
export function agruparPorDia<T extends ItemDaGrade>(itens: T[]): GrupoDoDia<T>[] {
  const ordenar = (lista: T[]) =>
    [...lista].sort(
      (a, b) =>
        a.horario_inicio.localeCompare(b.horario_inicio) || a.nome.localeCompare(b.nome, 'pt-BR'),
    )
  const grupos: GrupoDoDia<T>[] = []
  for (const [dia, rotulo, curto] of SEMANA) {
    const doDia = itens.filter((i) => i.dia === dia)
    if (doDia.length > 0) grupos.push({ dia, rotulo, curto, itens: ordenar(doDia) })
  }
  const conhecidos = new Set(SEMANA.map(([dia]) => dia))
  const semDia = itens.filter((i) => !conhecidos.has(i.dia))
  if (semDia.length > 0) {
    grupos.push({ dia: '', rotulo: 'A combinar', curto: 'A combinar', itens: ordenar(semDia) })
  }
  return grupos
}

/**
 * Aba que abre primeiro: hoje, se tiver aula; senão o próximo dia com aula (dando a
 * volta na semana). Sem grupos devolve ''.
 */
export function diaInicial(grupos: GrupoDoDia<unknown>[], hoje: Date): string {
  const comAula = new Set(grupos.map((g) => g.dia))
  const indiceHoje = (hoje.getDay() + 6) % 7 // SEG = 0 ... DOM = 6
  for (let passo = 0; passo < 7; passo++) {
    const dia = SEMANA[(indiceHoje + passo) % 7][0]
    if (comAula.has(dia)) return dia
  }
  return grupos[0]?.dia ?? ''
}
