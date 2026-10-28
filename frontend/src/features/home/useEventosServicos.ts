import { useQuery } from '@tanstack/react-query'

import type { EventoServicoPublico } from '@/api/generated/model'

/**
 * Eventos, serviços e campanhas do bloco "Eventos e serviços" da landing
 * (`GET /api/v1/eventos-servicos/`, público). Encerrados já vêm de fora.
 *
 * Importa o cliente só quando a consulta roda, como `useGrade`: sem `VITE_API_URL` o
 * erro cai aqui e o bloco some, sem derrubar a página inicial.
 */
export function useEventosServicos() {
  return useQuery<EventoServicoPublico[]>({
    queryKey: ['eventos-servicos'],
    queryFn: async () => {
      const { eventosServicosList } = await import('@/api/generated/grade/grade')
      return (await eventosServicosList()).data
    },
    staleTime: 60_000,
  })
}
