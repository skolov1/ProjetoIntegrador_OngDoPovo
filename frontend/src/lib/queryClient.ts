/**
 * Configuração única do TanStack Query.
 *
 * Fica fora do componente para que o client seja criado uma vez só: recriar a cada
 * render descartaria todo o cache e a query dispararia em loop.
 */
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Em dev, repetir uma query mascara o erro real; 1 tentativa chega para o time.
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
})