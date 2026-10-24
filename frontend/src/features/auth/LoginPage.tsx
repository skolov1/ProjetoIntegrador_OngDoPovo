/**
 * Página de Login para a Dashboard de Administração.
 *
 * Autentica o usuário via JWT e redireciona para /dashboard.html.
 * O access token vai no header Authorization, o refresh token em cookie httpOnly.
 */

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { AlertCircle } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Eyebrow } from '@/components/ui/Section'
import { ONG } from '@/features/home/data'
import { api } from '@/lib/api'

import type { CustomTokenObtainPairRequest, LoginResponse } from '@/api/generated/model'

export function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const loginMutation = useMutation({
    mutationFn: async (credentials: CustomTokenObtainPairRequest) => {
      const response = await api.post<LoginResponse>('/auth/token/', credentials)
      return response.data
    },
    onSuccess: () => {
      // O servidor gravou o cookie httpOnly de refresh. O painel (outra pagina)
      // pede o access token a partir dele; nada de token em sessionStorage.
      window.location.href = '/dashboard.html'
    },
    onError: (err: AxiosError<{ detail?: string }>) => {
      setError(err.response?.data?.detail || 'Credenciais inválidas. Tente novamente.')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    loginMutation.mutate({ username, password })
  }

  return (
    <div className="min-h-screen bg-mist-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm sm:p-8">
        <a
          href="/"
          aria-label={`${ONG.nome} — voltar ao site`}
          className="mb-5 flex flex-col items-center gap-2"
        >
          <picture>
            <source srcSet="/logo-ong-do-povo.webp" type="image/webp" />
            <img
              src="/logo-ong-do-povo.png"
              alt=""
              width={72}
              height={72}
              className="size-18 object-contain"
            />
          </picture>
          <span className="text-2xl font-extrabold uppercase tracking-tight text-verde-escuro">
            {ONG.nome}
          </span>
        </a>

        <Eyebrow>Acesso Restrito</Eyebrow>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-verde-escuro">
          Área Administrativa
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-grafite/70">
          Faça login para acessar o painel de administração da ONG do Povo.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-vermelho/30 bg-vermelho/5 p-3 text-sm text-vermelho" role="alert">
              <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
              {error}
            </div>
          )}

          <div>
            <label htmlFor="username" className="block text-sm font-bold text-verde-escuro mb-1.5">
              Usuário
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-grafite outline-none focus:border-verde focus:ring-4 focus:ring-verde/10"
              placeholder="Digite seu usuário"
              disabled={loginMutation.isPending}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-bold text-verde-escuro mb-1.5">
              Senha
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-grafite outline-none focus:border-verde focus:ring-4 focus:ring-verde/10"
              placeholder="Digite sua senha"
              disabled={loginMutation.isPending}
            />
          </div>

          <Button disabled={loginMutation.isPending} className="w-full">
            {loginMutation.isPending ? 'Entrando...' : (
              <>
                {/*<LogIn className="size-4 mr-2" aria-hidden="true" />*/}
                Entrar
              </>
            )}
          </Button>

          <p className="text-center text-xs text-grafite/50">
            Apenas usuários autorizados. Contato via WhatsApp para suporte.
          </p>
        </form>
      </div>
    </div>
  )
}
