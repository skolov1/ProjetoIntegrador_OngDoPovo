import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { restaurarSessao } from '@/lib/api'
import { queryClient } from './lib/queryClient'
import './index.css'

if ('scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual'
}

const raiz = document.documentElement
const comportamentoAnterior = raiz.style.scrollBehavior
raiz.style.scrollBehavior = 'auto'
window.scrollTo(0, 0)
raiz.style.scrollBehavior = comportamentoAnterior

function DashboardEntry() {
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <DashboardEntry />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)