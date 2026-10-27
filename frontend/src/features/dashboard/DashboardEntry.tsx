/**
 * Porta de entrada do painel: confirma a sessão (cookie de refresh) antes de
 * mostrar o dashboard. Sem sessão válida, volta para o login.
 */

import { useEffect, useState } from 'react'

import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { restaurarSessao } from '@/lib/api'

export function DashboardEntry() {
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    restaurarSessao().then((authenticated) => {
      if (!authenticated) {
        window.location.href = '/login.html'
        return
      }
      setCheckingSession(false)
    })
  }, [])

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-mist-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-verde border-t-transparent" />
      </div>
    )
  }

  return <DashboardLayout />
}
