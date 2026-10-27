/**
 * Hooks da API para a Dashboard de Administração.
 *
 * Centraliza todas as chamadas à API do Django (via Orval) para a dashboard.
 * Usa TanStack Query para cache, refetch automático e estados de loading/error.
 * 
 * IMPORTANTE: As funções do Orval retornam AxiosResponse<T>, precisamos extrair .data
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { turmasList, turmasCreate, turmasUpdate, turmasDestroy } from '@/api/generated/turmas/turmas'
import { presencasChamadaList, presencasLoteCreate } from '@/api/generated/presencas/presencas'
import { alunosList, alunosCreate, alunosUpdate, alunosPartialUpdate, alunosDestroy } from '@/api/generated/alunos/alunos'
import {
  professoresList,
  professoresCreate,
  professoresUpdate,
  professoresDestroy,
} from '@/api/generated/professores/professores'
import {
  doacoesItensList,
  doacoesItensCreate,
  doacoesItensUpdate,
  doacoesItensDestroy,
  doacoesItensResumoList,
  doacoesItensEmprestaveisList,
  doacoesEmprestimosList,
  doacoesEmprestimosCreate,
  doacoesEmprestimosPartialUpdate,
  doacoesEmprestimosDestroy,
} from '@/api/generated/doacoes/doacoes'
import type {
  PaginatedTurmaListList,
  PaginatedAlunoListList,
  PaginatedProfessorList,
  PaginatedDoacaoItemList,
  DoacaoItemResumo,
  DoacaoItemRequest,
  DoacaoItemEmprestavel,
  DoacoesEmprestimosListParams,
  EmprestimoRequest,
  PaginatedEmprestimoList,
  PatchedEmprestimoRequest,
  ChamadaItem,
  PresencaLoteRequest,
} from '@/api/generated/model'

// Helper para extrair data da resposta do axios
const extractData = <T,>(response: { data: T }) => response.data

// ============================================================================
// TURMAS
// ============================================================================

export function useTurmas(params?: import('@/api/generated/model').DoacoesTurmasListParams) {
  return useQuery<PaginatedTurmaListList>({
    queryKey: ['turmas', params],
    queryFn: () => turmasList(params).then(extractData),
    staleTime: 30_000,
  })
}

export function useCreateTurma() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: import('@/api/generated/model').TurmaRequest) => turmasCreate(data).then(extractData),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['turmas'] }),
  })
}

export function useUpdateTurma() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: import('@/api/generated/model').TurmaRequest }) => turmasUpdate(id, data).then(extractData),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['turmas'] }),
  })
}

export function useDeleteTurma() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => turmasDestroy(id).then(extractData),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['turmas'] }),
  })
}

// ============================================================================
// ALUNOS
// ============================================================================

export function useAlunos(params?: import('@/api/generated/model').DoacoesAlunosListParams) {
  return useQuery<PaginatedAlunoListList>({
    queryKey: ['alunos', params],
    queryFn: () => alunosList(params).then(extractData),
    staleTime: 30_000,
  })
}

export function useCreateAluno() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: import('@/api/generated/model').AlunoRequest) => alunosCreate(data).then(extractData),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alunos'] }),
  })
}

export function useUpdateAluno() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: import('@/api/generated/model').AlunoRequest }) => alunosUpdate(id, data).then(extractData),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alunos'] }),
  })
}

/** Inativar (ou reativar) é o padrão: o cadastro e o histórico de presença ficam. */
export function useAlterarAtivoAluno() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ativo }: { id: number; ativo: boolean }) =>
      alunosPartialUpdate(id, { ativo }).then(extractData),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alunos'] }),
  })
}

export function useDeleteAluno() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => alunosDestroy(id).then(extractData),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alunos'] }),
  })
}

// ============================================================================
// PROFESSORES
// ============================================================================

export function useProfessores(params?: import('@/api/generated/model').DoacoesProfessoresListParams) {
  return useQuery<PaginatedProfessorList>({
    queryKey: ['professores', params],
    queryFn: () => professoresList(params).then(extractData),
    staleTime: 60_000,
  })
}

export function useCreateProfessor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: import('@/api/generated/model').ProfessorRequest) => professoresCreate(data).then(extractData),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['professores'] }),
  })
}

export function useUpdateProfessor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: import('@/api/generated/model').ProfessorRequest }) => professoresUpdate(id, data).then(extractData),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['professores'] }),
  })
}

export function useDeleteProfessor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => professoresDestroy(id).then(extractData),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['professores'] }),
  })
}

// ============================================================================
// DOAÇÕES
// ============================================================================

export function useDoacoesItens(params?: import('@/api/generated/model').DoacoesItensListParams) {
  return useQuery<PaginatedDoacaoItemList>({
    queryKey: ['doacoes-itens', params],
    queryFn: () => doacoesItensList(params).then(extractData),
    staleTime: 30_000,
  })
}

export function useDoacoesItensResumo() {
  return useQuery<DoacaoItemResumo[]>({
    queryKey: ['doacoes-itens', 'resumo'],
    queryFn: () => doacoesItensResumoList().then(extractData),
    staleTime: 30_000,
  })
}

export function useCreateDoacaoItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: DoacaoItemRequest) => doacoesItensCreate(data).then(extractData),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['doacoes-itens'] }),
  })
}

export function useUpdateDoacaoItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: DoacaoItemRequest }) =>
      doacoesItensUpdate(id, data).then(extractData),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['doacoes-itens'] }),
  })
}

export function useDeleteDoacaoItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => doacoesItensDestroy(id).then(extractData),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['doacoes-itens'] }),
  })
}

// ============================================================================
// EMPRÉSTIMOS DE ITENS
// ============================================================================

export function useEmprestimos(params?: DoacoesEmprestimosListParams) {
  return useQuery<PaginatedEmprestimoList>({
    queryKey: ['emprestimos', params],
    queryFn: () => doacoesEmprestimosList(params).then(extractData),
    staleTime: 30_000,
  })
}

// Doações com unidades livres para emprestar (alimentos ficam de fora).
export function useItensEmprestaveis() {
  return useQuery<DoacaoItemEmprestavel[]>({
    queryKey: ['doacoes-itens', 'emprestaveis'],
    queryFn: () => doacoesItensEmprestaveisList().then(extractData),
    staleTime: 30_000,
  })
}

// Empréstimo mexe no que está disponível, então atualiza também as doações.
function useInvalidarEmprestimos() {
  const qc = useQueryClient()
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ['emprestimos'] }),
      qc.invalidateQueries({ queryKey: ['doacoes-itens'] }),
    ])
}

export function useCreateEmprestimo() {
  const invalidar = useInvalidarEmprestimos()
  return useMutation({
    mutationFn: (data: EmprestimoRequest) => doacoesEmprestimosCreate(data).then(extractData),
    onSuccess: invalidar,
  })
}

// Edição e devolução usam PATCH: a devolução é só mandar `devolvido_em`.
export function useUpdateEmprestimo() {
  const invalidar = useInvalidarEmprestimos()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: PatchedEmprestimoRequest }) =>
      doacoesEmprestimosPartialUpdate(id, data).then(extractData),
    onSuccess: invalidar,
  })
}

export function useDeleteEmprestimo() {
  const invalidar = useInvalidarEmprestimos()
  return useMutation({
    mutationFn: (id: number) => doacoesEmprestimosDestroy(id).then(extractData),
    onSuccess: invalidar,
  })
}

// ============================================================================
// PRESENÇAS (lista de chamada)
// ============================================================================

export function usePresencaChamada(turma: number | undefined, data: string) {
  return useQuery<ChamadaItem[]>({
    queryKey: ['presencas', 'chamada', turma, data],
    queryFn: () => presencasChamadaList({ turma: turma as number, data }).then(extractData),
    enabled: turma !== undefined && Boolean(data),
  })
}

export function useSalvarChamada() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: PresencaLoteRequest) => presencasLoteCreate(data).then(extractData),
    // A situação salva muda a contagem de faltas seguidas dos próximos dias.
    onSuccess: () => qc.invalidateQueries({ queryKey: ['presencas'] }),
  })
}
