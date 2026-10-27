/**
 * Funções puras das telas de cadastro do painel (turmas, professores, listas paginadas).
 */

/** Itens por página que a API devolve por padrão. */
export const POR_PAGINA = 20

/** Quantas páginas tem uma lista de `total` itens (sempre pelo menos uma). */
export function totalDePaginas(total: number, porPagina: number = POR_PAGINA): number {
  return Math.max(1, Math.ceil(total / porPagina))
}

/** "Nenhum aluno", "1 aluno", "7 alunos". */
export function rotuloAlunos(quantidade: number): string {
  if (quantidade === 0) return 'Nenhum aluno'
  return quantidade === 1 ? '1 aluno' : `${quantidade} alunos`
}

/**
 * Texto do popup de excluir turma. Excluir apaga junto as presenças da turma, então
 * o aviso diz quantas são e sugere Inativar, que guarda o histórico.
 */
export function textoExcluirTurma(totalPresencas: number): string {
  if (totalPresencas === 0) {
    return 'Esta turma não tem presenças registradas. Esta ação não pode ser desfeita.'
  }
  const presencas = totalPresencas === 1 ? '1 presença ' : `${totalPresencas} presenças `
  return (
    `Excluir apaga também ${presencas}registrada${totalPresencas === 1 ? '' : 's'} nesta turma, ` +
    'e isso não pode ser desfeito. Para só parar de usar a turma e guardar o histórico, use Inativar.'
  )
}
