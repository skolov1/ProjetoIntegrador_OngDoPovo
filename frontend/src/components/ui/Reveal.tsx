/**
 * <Reveal> — wrapper que anima a entrada do elemento na viewport.
 *
 * Uso:
 *   <Reveal>conteúdo</Reveal>
 *   <Reveal delay={120} direction="left">coluna</Reveal>
 *
 * O delay em cascata é o que faz um grid de 6 cards "entrar um atrás do outro".
 * Com `prefers-reduced-motion` ligado, a classe `is-visible` é aplicada de
 * imediato e nada se move (ver index.css).
 */
import type { ElementType, ReactNode } from 'react'

import { useReveal } from '@/lib/useReveal'

type Direcao = 'up' | 'left' | 'none'

interface RevealProps {
  children: ReactNode
  /** Atraso em ms — use para escalonar itens de um grid. */
  delay?: number
  direction?: Direcao
  /** Troca a tag renderizada, para não quebrar semântica de heading/li. */
  as?: ElementType
  className?: string
  threshold?: number
}

export function Reveal({
  children,
  delay = 0,
  direction = 'up',
  as: Tag = 'div',
  className = '',
  threshold = 0.15,
}: RevealProps) {
  const { ref, visivel } = useReveal<HTMLDivElement>({ threshold })

  const classes = [
    'reveal',
    direction === 'left' ? 'reveal-x' : '',
    visivel ? 'is-visible' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <Tag
      ref={ref}
      className={classes}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  )
}