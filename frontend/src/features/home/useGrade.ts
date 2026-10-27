import { useQuery } from '@tanstack/react-query'

import type { GradeItem } from '@/api/generated/model'

/**
 * Grade da semana da landing, vinda do back-end (`GET /api/v1/grade/`, público).
 *
 * O cliente da API é importado só quando a consulta roda: se a `VITE_API_URL` não
 * estiver configurada, `lib/api` falha ao carregar, e assim o erro cai aqui (a seção
 * mostra "grade indisponível") em vez de derrubar a página inicial inteira.
 */
export function useGrade() {
  return useQuery<GradeItem[]>({
    queryKey: ['grade'],
    queryFn: async () => {
      const { gradeList } = await import('@/api/generated/grade/grade')
      return (await gradeList()).data
    },
    staleTime: 60_000,
  })
}
