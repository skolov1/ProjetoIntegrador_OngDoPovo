/**
 * Cliente HTTP central.
 *
 * Decisao do time (PLANO_REMODELAGEM.md, secao 13.1): o refresh token vive em
 * cookie httpOnly, entao o axios precisa enviar `withCredentials: true` em toda
 * chamada. Sem isso o browser descarta o cookie e a sessao morre a cada 15 min.
 *
 * O access token fica so em memoria (nunca em localStorage). Se a pagina
 * recarregar, o interceptor chama /auth/token/refresh/ automaticamente usando o
 * cookie para recuperar a sessao — o usuario nao percebe o refresh.
 *
 * Ao abrir o painel, `restaurarSessao()` faz esse refresh; `encerrarSessao()` apaga
 * o cookie no servidor e volta ao login.
 */
import axios, {
  type AxiosError,
  type InternalAxiosRequestConfig,
} from 'axios'

/**
 * Prefixo da API declarado em UM lugar só.
 *
 * O schema OpenAPI é gerado com `SCHEMA_PATH_PREFIX = '/api/v1'` no
 * settings.py do Django, então o Orval emite caminhos SEM o prefixo
 * (`/ping/`, `/auth/token/`). Ele é concatenado aqui.
 *
 * Se o prefixo aparecesse nos dois lados, a chamada viraria
 * `/api/v1/api/v1/ping/` e o Django responderia 404.
 */
const BASE_URL = import.meta.env.VITE_API_URL

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  timeout: 15000,
})

/** Access token em memoria. Some ao recarregar a pagina — de proposito. */
let accessToken: string | null = null

export function setAccessToken(token: string | null): void {
  accessToken = token
}

export function getAccessToken(): string | null {
  return accessToken
}

/** Rotas onde um 401 nao significa "token expirado" e nao deve gerar refresh. */
const ROTAS_SEM_REFRESH = [
  '/auth/token/',
  '/auth/token/refresh/',
  '/auth/logout/',
]

/**
 * Refresh em andamento. Se varias requisoes falharem com 401 ao mesmo tempo,
 * todas aguardam a MESMA promessa em vez de disparar N refreshes (evita corrida).
 */
let refreshEmAndamento: Promise<string | null> | null = null

async function renovarAccessToken(): Promise<string | null> {
  try {
    // Nao usa `api` de proposito: evita recursar no interceptor.
    // Sem checagem previa de cookie — o proprio refresh responde 401 se faltar.
    const { data } = await axios.post(
      `${BASE_URL}/auth/token/refresh/`,
      {},
      { withCredentials: true },
    )
    setAccessToken(data.access)
    return data.access
  } catch {
    setAccessToken(null)
    return null
  }
}

/**
 * Pede um access token novo usando o cookie de refresh. Devolve `false` se nao ha
 * sessao valida. Reaproveita o refresh em andamento (o React em modo estrito roda
 * o efeito duas vezes em desenvolvimento, e dois refreshes seguidos se atropelam).
 */
export async function restaurarSessao(): Promise<boolean> {
  refreshEmAndamento ??= renovarAccessToken().finally(() => {
    refreshEmAndamento = null
  })
  return (await refreshEmAndamento) !== null
}

/** Apaga o cookie de refresh no servidor, limpa a memoria e volta ao login. */
export async function encerrarSessao(): Promise<void> {
  try {
    await api.post('/auth/logout/')
  } finally {
    setAccessToken(null)
    window.location.href = '/login.html'
  }
}

// Coloca o access token no header de toda requisicao
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

// Recupera a sessao quando o access token expira (15 min)
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as
      | (InternalAxiosRequestConfig & { _tentouRenovar?: boolean })
      | undefined

    const eh401 = error.response?.status === 401
    const url = original?.url ?? ''
    const jaTentou = original?._tentouRenovar === true
    const ehRotaDeAuth = ROTAS_SEM_REFRESH.some((rota) => url.includes(rota))

    if (!eh401 || jaTentou || ehRotaDeAuth || !original) {
      return Promise.reject(error)
    }

    original._tentouRenovar = true

    refreshEmAndamento ??= renovarAccessToken().finally(() => {
      refreshEmAndamento = null
    })

    const novoToken = await refreshEmAndamento
    if (!novoToken) {
      return Promise.reject(error)
    }

    return api(original)
  },
)