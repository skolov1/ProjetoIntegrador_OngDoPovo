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
