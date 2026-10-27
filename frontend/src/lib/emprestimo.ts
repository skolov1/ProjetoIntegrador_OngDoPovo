/**
 * Funções puras da seção de empréstimos do painel (datas e aviso de atraso).
 * O status do empréstimo (emprestado, atrasado, devolvido) vem calculado da API.
 */

/** Prazo, em meses, depois do qual o item emprestado passa a "atrasado". */
export const PRAZO_EMPRESTIMO_MESES = 3

/** Data de hoje como AAAA-MM-DD no fuso local (toISOString usaria UTC e viraria o dia à noite). */
export function dataLocalISO(data: Date = new Date()): string {
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const dia = String(data.getDate()).padStart(2, '0')
  return `${data.getFullYear()}-${mes}-${dia}`
}

/** AAAA-MM-DD para DD/MM/AAAA, sem passar por Date (evita deslocar o dia pelo fuso). */
export function formatarDataBr(iso: string | null | undefined): string {
  if (!iso) return '—'
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
}

/** Texto do aviso do topo da seção; `null` quando não há nada atrasado. */
export function textoAvisoAtrasados(quantidade: number): string | null {
  if (quantidade <= 0) return null
  const prazo = `mais de ${PRAZO_EMPRESTIMO_MESES} meses`
  return quantidade === 1
    ? `1 item está emprestado há ${prazo}.`
    : `${quantidade} itens estão emprestados há ${prazo}.`
}
