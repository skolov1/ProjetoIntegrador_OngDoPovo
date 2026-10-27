/**
 * Junta o que a API recusou em uma frase para mostrar no formulário.
 * A API devolve `{campo: ["mensagem"]}` ou `{detail: "mensagem"}`.
 */
export function mensagemDeErroDaApi(erro: unknown): string {
  const data = (erro as { response?: { data?: unknown } })?.response?.data
  if (data && typeof data === 'object') {
    return Object.values(data as Record<string, unknown>)
      .map((msg) => (Array.isArray(msg) ? msg.join(' ') : String(msg)))
      .join(' ')
  }
  return 'Não foi possível salvar. Tente novamente.'
}
