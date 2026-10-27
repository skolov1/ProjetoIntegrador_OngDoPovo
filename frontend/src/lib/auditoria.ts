/**
 * Funções puras da tela de auditoria e do cartão do usuário (sem React).
 */

/** Uma alteração campo a campo, como a API devolve em `mudancas`. */
export type Mudanca = { rotulo: string; de: string; para: string }

export type LinhaMudanca = Mudanca & { campo: string }

/** Iniciais para o avatar: primeira letra do primeiro e do último nome. */
export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return '?'
  const primeira = partes[0][0]
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : ''
  return (primeira + ultima).toLocaleUpperCase('pt-BR')
}

/** Data e hora no fuso do navegador, como "27/10/2026 às 23:15". */
export function formatarDataHora(iso: string): string {
  const data = new Date(iso)
  const dois = (n: number) => String(n).padStart(2, '0')
  const dia = `${dois(data.getDate())}/${dois(data.getMonth() + 1)}/${data.getFullYear()}`
  return `${dia} às ${dois(data.getHours())}:${dois(data.getMinutes())}`
}

/** Transforma o objeto `mudancas` da API em linhas para a tabela de detalhes. */
export function listarMudancas(mudancas: Record<string, Mudanca> | undefined): LinhaMudanca[] {
  return Object.entries(mudancas ?? {}).map(([campo, valor]) => ({ campo, ...valor }))
}
