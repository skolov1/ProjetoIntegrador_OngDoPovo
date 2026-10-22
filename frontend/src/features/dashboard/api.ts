/**
 * Hooks da API para a Dashboard de Administração.
 *
 * Centraliza todas as chamadas à API do Django (via Orval) para a dashboard.
 * Usa TanStack Query para cache, refetch automático e estados de loading/error.
 * 
 * IMPORTANTE: As funções do Orval retornam AxiosResponse<T>, precisamos extrair .data
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  doacoesTurmasList,
  doacoesTurmasCreate,
  doacoesTurmasUpdate,
  doacoesTurmasDestroy,
  doacoesAlunosList,
  doacoesAlunosCreate,
  doacoesAlunosUpdate,
  doacoesAlunosDestroy,
  doacoesProfessoresList,
  doacoesProfessoresCreate,
  doacoesProfessoresUpdate,
  doacoesProfessoresDestroy,
  doacoesDoacoesAdminList,
  doacoesDoacoesResumoRetrieve,
} from '@/api/generated/doacoes/doacoes'
import type {
  PaginatedTurmaListList,
  PaginatedAlunoListList,
  PaginatedProfessorList,
  PaginatedDoacaoAdminList,
} from '@/api/generated/model'

// Helper para extrair data da resposta do axios
const extractData = <T,>(response: { data: T }) => response.data

// ============================================================================
// TURMAS
// ============================================================================

export function useTurmas(params?: import('@/api/generated/model').DoacoesTurmasListParams) {
  return useQuery<PaginatedTurmaListList>({
    queryKey: ['turmas', params],
    queryFn: () => doacoesTurmasList(params).then(extractData),
    staleTime: 30_000,
  })
}

export function useCreateTurma() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: import('@/api/generated/model').TurmaRequest) => doacoesTurmasCreate(data).then(extractData),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['turmas'] }),
  })
}

export function useUpdateTurma() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: import('@/api/generated/model').TurmaRequest }) => doacoesTurmasUpdate(id, data).then(extractData),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['turmas'] }),
  })
}

export function useDeleteTurma() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => doacoesTurmasDestroy(id).then(extractData),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['turmas'] }),
  })
}

// ============================================================================
// ALUNOS
// ============================================================================

export function useAlunos(params?: import('@/api/generated/model').DoacoesAlunosListParams) {
  return useQuery<PaginatedAlunoListList>({
    queryKey: ['alunos', params],
    queryFn: () => doacoesAlunosList(params).then(extractData),
    staleTime: 30_000,
  })
}

export function useCreateAluno() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: import('@/api/generated/model').AlunoRequest) => doacoesAlunosCreate(data).then(extractData),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alunos'] }),
  })
}

export function useUpdateAluno() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: import('@/api/generated/model').AlunoRequest }) => doacoesAlunosUpdate(id, data).then(extractData),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alunos'] }),
  })
}

export function useDeleteAluno() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => doacoesAlunosDestroy(id).then(extractData),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alunos'] }),
  })
}

// ============================================================================
// PROFESSORES
// ============================================================================

export function useProfessores(params?: import('@/api/generated/model').DoacoesProfessoresListParams) {
  return useQuery<PaginatedProfessorList>({
    queryKey: ['professores', params],
    queryFn: () => doacoesProfessoresList(params).then(extractData),
    staleTime: 60_000,
  })
}

export function useCreateProfessor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: import('@/api/generated/model').ProfessorRequest) => doacoesProfessoresCreate(data).then(extractData),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['professores'] }),
  })
}

export function useUpdateProfessor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: import('@/api/generated/model').ProfessorRequest }) => doacoesProfessoresUpdate(id, data).then(extractData),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['professores'] }),
  })
}

export function useDeleteProfessor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => doacoesProfessoresDestroy(id).then(extractData),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['professores'] }),
  })
}

// ============================================================================
// DOAÇÕES
// ============================================================================

export function useDoacoesAdmin(params?: import('@/api/generated/model').DoacoesDoacoesAdminListParams) {
  return useQuery<PaginatedDoacaoAdminList>({
    queryKey: ['doacoes', 'admin', params],
    queryFn: () => doacoesDoacoesAdminList(params).then(extractData),
    staleTime: 30_000,
  })
}

export function useDoacoesResumo() {
  return useQuery<any>({
    queryKey: ['doacoes', 'resumo'],
    queryFn: () => doacoesDoacoesResumoRetrieve().then(extractData),
    staleTime: 60_000,
  })
}