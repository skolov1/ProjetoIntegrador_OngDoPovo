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
  turmasList,
  turmasCreate,
  turmasUpdate,
  turmasPartialUpdate,
  turmasDestroy,
} from '@/api/generated/turmas/turmas'
import { presencasChamadaList, presencasLoteCreate } from '@/api/generated/presencas/presencas'
import { auditoriaList, auditoriaUsuariosList } from '@/api/generated/auditoria/auditoria'
import { authMeRetrieve } from '@/api/generated/auth/auth'
import { api } from '@/lib/api'
import {
  atividadesAvulsasList,
  atividadesAvulsasCreate,
  atividadesAvulsasPartialUpdate,
  atividadesAvulsasDestroy,
} from '@/api/generated/atividades-avulsas/atividades-avulsas'
import { alunosList, alunosCreate, alunosUpdate, alunosPartialUpdate, alunosDestroy } from '@/api/generated/alunos/alunos'
import {
  professoresList,
  professoresCreate,
  professoresUpdate,
  professoresPartialUpdate,
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
  PaginatedProfessorListList,
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
  AuditoriaListParams,
  AuditoriaUsuario,
  Me,
  PaginatedAuditoriaList,
  AtividadeAvulsaRequest,
  AtividadesAvulsasListParams,
  GradeItem,
  PaginatedAtividadeAvulsaList,
  PatchedAtividadeAvulsaRequest,
  VisaoGeral,
  VisaoGeralDetalhes,
} from '@/api/generated/model'
import {
  visaoGeralDetalhesRetrieve,
  visaoGeralRetrieve,
} from '@/api/generated/visao-geral/visao-geral'

// Página que não existe mais (ex.: excluiu o último item da última página) volta 404.
// Não adianta repetir: a tela recua uma página.
const semRepetirNo404 = (tentativas: number, erro: unknown) =>
  (erro as { response?: { status?: number } })?.response?.status !== 404 && tentativas < 2

// Helper para extrair data da resposta do axios
const extractData = <T,>(response: { data: T }) => response.data

// ============================================================================
// VISÃO GERAL
// ============================================================================

export function useVisaoGeral() {
  return useQuery<VisaoGeral>({
    queryKey: ['visao-geral'],
    queryFn: () => visaoGeralRetrieve().then(extractData),
    staleTime: 30_000,
  })
}

/** Quem está por trás dos alertas; só busca quando a pessoa abre um (`habilitado`). */
export function useVisaoGeralDetalhes(habilitado: boolean) {
  return useQuery<VisaoGeralDetalhes>({
    queryKey: ['visao-geral', 'detalhes'],
    queryFn: () => visaoGeralDetalhesRetrieve().then(extractData),
    enabled: habilitado,
    staleTime: 30_000,
  })
}

// ============================================================================
// TURMAS
// ============================================================================

export function useTurmas(params?: import('@/api/generated/model').TurmasListParams) {
  return useQuery<PaginatedTurmaListList>({
    queryKey: ['turmas', params],
    queryFn: () => turmasList(params).then(extractData),
    staleTime: 30_000,
    retry: semRepetirNo404,
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

// Inativar não apaga nada: a turma só sai da lista de chamada e o histórico fica.
export function useAlterarAtivoTurma() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ativo }: { id: number; ativo: boolean }) =>
      turmasPartialUpdate(id, { ativo }).then(extractData),
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

export function useAlunos(params?: import('@/api/generated/model').AlunosListParams) {
  return useQuery<PaginatedAlunoListList>({
    queryKey: ['alunos', params],
    queryFn: () => alunosList(params).then(extractData),
    staleTime: 30_000,
    retry: semRepetirNo404,
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

export function useProfessores(params?: import('@/api/generated/model').ProfessoresListParams) {
  return useQuery<PaginatedProfessorListList>({
    queryKey: ['professores', params],
    queryFn: () => professoresList(params).then(extractData),
    staleTime: 60_000,
    retry: semRepetirNo404,
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

export function useAlterarAtivoProfessor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ativo }: { id: number; ativo: boolean }) =>
      professoresPartialUpdate(id, { ativo }).then(extractData),
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
    retry: semRepetirNo404,
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

// ============================================================================
// USUÁRIO LOGADO E AUDITORIA
// ============================================================================

// Quem está logado (nome completo e tipo de conta), para o cartão da barra lateral.
export function useUsuarioLogado() {
  return useQuery<Me>({
    queryKey: ['usuario-logado'],
    queryFn: () => authMeRetrieve().then(extractData),
    staleTime: 5 * 60_000,
  })
}

export function useAuditoria(params?: AuditoriaListParams) {
  return useQuery<PaginatedAuditoriaList>({
    queryKey: ['auditoria', params],
    queryFn: () => auditoriaList(params).then(extractData),
    staleTime: 10_000,
    // Mantém a página anterior na tela enquanto a próxima carrega.
    placeholderData: (anterior) => anterior,
  })
}

// Pessoas da equipe, para o filtro "quem fez".
export function useAuditoriaUsuarios() {
  return useQuery<AuditoriaUsuario[]>({
    queryKey: ['auditoria', 'usuarios'],
    queryFn: () => auditoriaUsuariosList().then(extractData),
    staleTime: 60_000,
  })
}

// ============================================================================
// GRADE DA SEMANA (atividades avulsas e prévia do que está no site)
// ============================================================================

export function useAtividadesAvulsas(params?: AtividadesAvulsasListParams) {
  return useQuery<PaginatedAtividadeAvulsaList>({
    queryKey: ['atividades-avulsas', params],
    queryFn: () => atividadesAvulsasList(params).then(extractData),
    staleTime: 30_000,
  })
}

// A prévia mostra o que a landing mostra: mexer em turma ou atividade a atualiza.
// A API deixa a grade 60 s em cache (para a landing); aqui o parâmetro `t` muda a URL a cada
// pedido para a prévia nunca vir do cache do navegador logo depois de uma edição.
export function useGradePublica() {
  return useQuery<GradeItem[]>({
    queryKey: ['grade'],
    queryFn: () => api.get<GradeItem[]>('/grade/', { params: { t: Date.now() } }).then(extractData),
    staleTime: 10_000,
  })
}

function useInvalidarGrade() {
  const qc = useQueryClient()
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ['atividades-avulsas'] }),
      qc.invalidateQueries({ queryKey: ['grade'] }),
    ])
}

export function useCreateAtividadeAvulsa() {
  const invalidar = useInvalidarGrade()
  return useMutation({
    mutationFn: (data: AtividadeAvulsaRequest) => atividadesAvulsasCreate(data).then(extractData),
    onSuccess: invalidar,
  })
}

// Edição e "mostrar/ocultar no site" usam PATCH.
export function useUpdateAtividadeAvulsa() {
  const invalidar = useInvalidarGrade()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: PatchedAtividadeAvulsaRequest }) =>
      atividadesAvulsasPartialUpdate(id, data).then(extractData),
    onSuccess: invalidar,
  })
}

export function useDeleteAtividadeAvulsa() {
  const invalidar = useInvalidarGrade()
  return useMutation({
    mutationFn: (id: number) => atividadesAvulsasDestroy(id).then(extractData),
    onSuccess: invalidar,
  })
}
