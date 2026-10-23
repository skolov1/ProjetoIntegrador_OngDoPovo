/**
 * Primitivas de animação.
 *
 * Decisao do time: sem framer-motion / motion. Uma landing page precisa de
 * reveal-on-scroll, contagem crescente e stagger — tudo isso cabe em ~60 linhas
 * de IntersectionObserver, e a alternativa custaria ~50 kB de bundle para o
 * time manter. A troca pode ser feita depois se um dia o escopo pedir algo
 * mais complexo (drag, layout animation, gestos).
 */

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'

/* -------------------------------------------------------------------------- */
/* Movimento reduzido                                                          */
/* -------------------------------------------------------------------------- */

/**
 * True se o sistema pedir menos movimento.
 *
 * Usa `useSyncExternalStore` em vez de useEffect + setState: a media query é
 * estado externo ao React, e essa é a API que o React 19 reserva para isso.
 * Também garante renderização consistente entre servidor e cliente.
 */
export function usePrefersReducedMotion(): boolean {
  const QUERY = '(prefers-reduced-motion: reduce)'

  return useSyncExternalStore(
    // subscribe: avisa o React quando o usuário muda a preferência do sistema
    (aoMudar) => {
      const mq = window.matchMedia(QUERY)
      mq.addEventListener('change', aoMudar)
      return () => mq.removeEventListener('change', aoMudar)
    },
    // getSnapshot: valor atual, lido a cada render
    () => window.matchMedia(QUERY).matches,
    // getServerSnapshot: sem matchMedia no servidor
    () => false,
  )
}

/* -------------------------------------------------------------------------- */
/* Reveal no scroll                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Dispara uma única vez quando o elemento entra na viewport.
 *
 * `once: true` (padrão) porque o efeito de revelação só faz sentido na primeira
 * aparição — reanimar ao subir e descer a página enjoa.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(
  options: { once?: boolean; threshold?: number; rootMargin?: string } = {},
) {
  const { once = true, threshold = 0.15, rootMargin = '0px 0px -80px 0px' } = options

  const ref = useRef<T>(null)
  // Estado inicial já TRUE quando o navegador não tem IntersectionObserver:
  // nesse caso o conteúdo nasce visível em vez de preso em opacity: 0.
  const [visivel, setVisivel] = useState(() =>
    typeof IntersectionObserver === 'undefined',
  )

  useEffect(() => {
    const elemento = ref.current
    if (!elemento || visivel) return

    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) {
          setVisivel(true)
          if (once) observador.disconnect()
        } else if (!once) {
          setVisivel(false)
        }
      },
      { threshold, rootMargin },
    )

    observador.observe(elemento)
    return () => observador.disconnect()
  }, [once, threshold, rootMargin, visivel])

  return { ref, visivel }
}

/* -------------------------------------------------------------------------- */
/* Contagem numérica                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Conta de 0 até o valor quando `ativo` vira true, com easing exponencial.
 *
 * Com movimento reduzido o valor final é derivado durante o render em vez de
 * ser escrito via setState — mais barato e evita render em cascata.
 */
export function useCountUp(
  alvo: number,
  opcoes: { duracao?: number; ativo?: boolean; formato?: (n: number) => string } = {},
) {
  const { duracao = 1600, ativo = false, formato } = opcoes
  const movimentoReduzido = usePrefersReducedMotion()

  const [animado, setAnimado] = useState(0)
  const inicioRef = useRef<number | null>(null)

  useEffect(() => {
    if (!ativo || movimentoReduzido) return

    let frame = 0
    const passo = (agora: number) => {
      // Primeiro frame só marca o zero do relógio.
      if (inicioRef.current === null) inicioRef.current = agora

      const decorrido = agora - inicioRef.current
      const progresso = Math.min(decorrido / duracao, 1)
      // easeOutExpo: rápido no começo, desacelera até o fim.
      const suavizado = progresso === 1 ? 1 : 1 - Math.pow(2, -10 * progresso)

      setAnimado(Math.round(alvo * suavizado))

      if (progresso < 1) frame = requestAnimationFrame(passo)
    }

    frame = requestAnimationFrame(passo)
    return () => cancelAnimationFrame(frame)
  }, [alvo, ativo, duracao, movimentoReduzido])

  const valor = movimentoReduzido ? alvo : animado

  return formato ? formato(valor) : valor
}

/* -------------------------------------------------------------------------- */
/* Scroll                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Distância até o topo da página, para o header encolher e ganhar blur.
 *
 * O setState acontece dentro de requestAnimationFrame — escutar `scroll` direto
 * faria um setState por evento (até 60x por segundo).
 */
export function useScrollY(): number {
  const [y, setY] = useState(0)

  useEffect(() => {
    let frame = 0
    const aoRolar = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => setY(window.scrollY))
    }

    aoRolar()
    window.addEventListener('scroll', aoRolar, { passive: true })
    return () => {
      window.removeEventListener('scroll', aoRolar)
      cancelAnimationFrame(frame)
    }
  }, [])

  return y
}