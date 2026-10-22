import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import { LoginPage } from '@/features/auth/LoginPage'
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)