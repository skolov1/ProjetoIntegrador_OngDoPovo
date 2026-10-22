/**
 * Sprint 0 — prova de que o encanamento React -> Django funciona.
 *
 * Este componente existe para ser apagado. Ele valida que:
 *   1. o CORS está configurado (o browser só deixa chamar se os headers voltarem)
 *   2. a baseURL do axios aponta para o Django, não para o Vite
 *   3. o client gerado pelo Orval conversa com a API de verdade
 *
 * Se ele mostra `{"servico": "django", "status": "ok"}`, o caminho está inteiro.
 * Na Fase 2 ele sai da landing e vira teste automatizado no pytest.
 */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Activity, RefreshCw } from 'lucide-react'

import { pingRetrieve } from '@/api/generated/sistema/sistema'
import { setAccessToken } from '@/lib/api'

type Estado = 'ocioso' | 'carregando' | 'sucesso' | 'erro'

export function ApiTestPanel() {
  const [tentativas, setTentativas] = useState(0)

  const consulta = useQuery({
    queryKey: ['ping'],
    queryFn: pingRetrieve,
    // Não repetir sozinho: só faz sentido quando alguém clica.
    staleTime: 30_000,
    retry: false,
    // Começa desligado; o botão liga a query na primeira vez.
    enabled: tentativas > 0,
  })

  /**
   * Cuidado: no React Query v5, `isPending` é `true` também para uma query
   * desligada e sem dados. Usar `isPending` direto faria o painel mostrar
   * "carregando" antes de qualquer clique. O estado real de carregamento é
   * `fetchStatus === 'fetching'`, e "nunca foi executado" é
   * `data === undefined && fetchStatus === 'idle'`.
   */
  const estado: Estado =
    consulta.fetchStatus === 'fetching'
      ? 'carregando'
      : consulta.isError
        ? 'erro'
        : consulta.data !== undefined
          ? 'sucesso'
          : 'ocioso'

  return (
    <section id="testar-api" className="bg-white px-6 py-10">
      <div className="mx-auto max-w-3xl rounded-2xl border border-dashed border-verde/25 bg-mist-50 p-6">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-verde">
          <Activity className="size-3.5" aria-hidden="true" />
          Sprint 0 — teste de integração
        </div>

        <p className="mt-3 text-sm leading-relaxed text-grafite/70">
          Verifica se o React conseguiu falar com o Django. Se aparecer{' '}
          <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs text-verde">
            django
          </code>{' '}
          abaixo, o encanamento inteiro (CORS + baseURL + client gerado) está
          funcionando.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setTentativas((t) => t + 1)}
            disabled={consulta.fetchStatus === 'fetching'}
            className="group inline-flex items-center gap-2 rounded-full bg-verde px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-verde/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
          >
            {consulta.fetchStatus === 'fetching' ? (
              <>
                <RefreshCw className="size-4 animate-spin" aria-hidden="true" />
                Testando…
              </>
            ) : (
              'Testar API'
            )}
          </button>

          {estado === 'sucesso' && (
            <button
              type="button"
              onClick={() => setAccessToken(null)}
              className="rounded-full border border-verde/25 px-5 py-2.5 text-sm font-semibold text-verde transition-colors hover:bg-verde hover:text-white"
              title="Limpa o access token em memória"
            >
              Limpar sessão
            </button>
          )}
        </div>

        <output
          aria-live="polite"
          className="mt-4 block min-h-12 overflow-x-auto rounded-xl bg-verde-escuro p-4 font-mono text-xs text-mist-100"
        >
          {estado === 'ocioso' && 'aguardando…'}
          {estado === 'carregando' && 'requisição em andamento…'}
          {estado === 'erro' &&
            `falhou: ${consulta.error instanceof Error ? consulta.error.message : 'erro desconhecido'}`}
          {estado === 'sucesso' && JSON.stringify(consulta.data, null, 2)}
        </output>
      </div>
    </section>
  )
}