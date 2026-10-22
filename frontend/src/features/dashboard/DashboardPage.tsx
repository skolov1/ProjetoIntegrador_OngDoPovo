/**
 * Página da Dashboard de Administração.
 *
 * Esta página substitui a interface padrão do Django Admin com uma UI
 * personalizada que reutiliza o design system da landing page (Tailwind,
 * cores, componentes Section/Reveal/etc.).
 *
 * Telas disponíveis via sidebar:
 * - Presenças: total, taxa, por turma
 * - Alunos: total, novos este mês, cadastro
 * - Doações: totais confirmadas/pendentes, últimas doações
 * - Formulários: total de envios da landing, últimos formulários
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import { DashboardLayout } from '@/components/layout/DashboardLayout'

// Simulação de hook de auth - em produção isso viria do contexto JWT
function useAuth() {
  const [loggedIn, setLoggedIn] = useState(false)
  const [user, setUser] = useState({ name: 'Admin', role: 'ADMIN' })

  useEffect(() => {
    // Verifica se há token de refresh no cookie
    const token = document.cookie.replace(/(?:(?:^|.*\s*)ong_refresh_token\s*=\s*([^;])).*$/i, '$1')
    setLoggedIn(!!token)
    if (token) setUser({ name: 'Coordenador', role: 'ADMIN' })
  }, [])

  return { loggedIn, user }
}

export function DashboardPage() {
  const { loggedIn } = useAuth()
  const navigate = useNavigate()

  // Se não estiver logado, redireciona para login
  useEffect(() => {
    if (!loggedIn) {
      navigate('/login', { replace: true })
    }
  }, [loggedIn, navigate])

  if (!loggedIn) {
    return null // Mostra nada até verificar auth
  }

  return <DashboardLayout />
}