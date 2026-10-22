import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './App.tsx'
import { queryClient } from './lib/queryClient.ts'
import './index.css'

/*
 * Sem isso, ao dar reload o navegador restaura a posição de scroll anterior
 * (por exemplo, se o usuário tinha clicado em "#programas" no menu). O
 * resultado é que a landing abre já "no meio" da página, com o header sólido
 * e uma faixa em branco acima — obrigando o usuário a subir a rolagem.
 *
 * Como é uma landing de uma página só, abrir sempre no topo é o comportamento
 * desejado.
 */
if ('scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual'
}

// Sobe ao topo de forma instantânea. O `html` tem `scroll-behavior: smooth`
// (para os links de âncora), então desligamos temporariamente para o reload
// não animar a subida.
const raiz = document.documentElement
const comportamentoAnterior = raiz.style.scrollBehavior
raiz.style.scrollBehavior = 'auto'
window.scrollTo(0, 0)
raiz.style.scrollBehavior = comportamentoAnterior

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)