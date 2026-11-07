/**
 * Configuração única do TanStack Query.
 *
 * Fica fora do componente para que o client seja criado uma vez só: recriar a cada
 * render descartaria todo o cache e a query dispararia em loop.
 */
import { QueryClient } from '@tanstack/react-query'

/**
 * Só repete o que pode ser a API acordando (sem resposta, timeout ou erro 5xx). Erro 4xx
 * (401, 404, 400...) é resposta de verdade: repetir não muda nada e só atrasa a mensagem.
 */
export function deveRepetir(falhas: number, erro: unknown): boolean {
  if (falhas >= 4) return false
  const status = (erro as { response?: { status?: number } } | null)?.response?.status
  return status === undefined || status >= 500
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Até 4 repetições (esperando 2, 4, 8 e 10 s) cobrem o tempo de a API gratuita acordar.
      retry: deveRepetir,
      retryDelay: (tentativa) => Math.min(2000 * 2 ** tentativa, 10_000),
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
})