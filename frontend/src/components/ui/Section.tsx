/**
 * <Section> e <Eyebrow> — o esqueleto repetido por todas as seções.
 *
 * Centralizar aqui garante que padding, largura maxima e ritmo vertical sejam
 * idênticos de uma seção para outra. Sem isso cada section vira uma variação
 * slightly diferente e a página perde unidade visual.
 */
import type { ElementType, ReactNode } from 'react'

type Tom = 'claro' | 'mint' | 'escuro'

const FUNDOS: Record<Tom, string> = {
  claro: 'bg-white text-grafite',
  mint: 'bg-mist-50 text-grafite',
  escuro: 'bg-verde-escuro text-white',
}

interface SectionProps {
  children: ReactNode
  id?: string
  tom?: Tom
  /** Padding vertical. `compacto` para seções menores. */
  tamanho?: 'normal' | 'compacto'
  as?: ElementType
  className?: string
}

export function Section({
  children,
  id,
  tom = 'claro',
  tamanho = 'normal',
  as: Tag = 'section',
  className = '',
}: SectionProps) {
  const py = tamanho === 'compacto' ? 'py-16 sm:py-20' : 'py-20 sm:py-28'

  return (
    <Tag id={id} className={`${py} ${FUNDOS[tom]} ${className}`}>
      <div className="mx-auto max-w-7xl px-6 lg:px-8">{children}</div>
    </Tag>
  )
}

/**
 * Rótulo pequeno acima do título ("QUEM SOMOS", "NOSSO IMPACTO").
 * O manual usa versalete com tracking largo e cor de destaque.
 */
export function Eyebrow({
  children,
  tom = 'claro',
  className = '',
}: {
  children: ReactNode
  tom?: Tom
  className?: string
}) {
  const cor = tom === 'escuro' ? 'text-amarelo' : 'text-verde'

  return (
    <p
      className={`text-xs font-bold uppercase tracking-[0.2em] ${cor} ${className}`}
    >
      {children}
    </p>
  )
}

/** Título de seção. `escuro` inverte para branco em fundo verde. */
export function SectionTitle({
  children,
  tom = 'claro',
  className = '',
}: {
  children: ReactNode
  tom?: Tom
  className?: string
}) {
  const cor = tom === 'escuro' ? 'text-white' : 'text-verde-escuro'

  return (
    <h2
      className={`mt-3 text-3xl font-extrabold leading-[1.12] tracking-tight sm:text-4xl lg:text-5xl ${cor} ${className}`}
    >
      {children}
    </h2>
  )
}

/** Parágrafo de apoio. `escuro` usa o tom claro da marca. */
export function SectionLead({
  children,
  tom = 'claro',
  className = '',
}: {
  children: ReactNode
  tom?: Tom
  className?: string
}) {
  const cor =
    tom === 'escuro' ? 'text-mist-200' : 'text-grafite/70'

  return (
    <p className={`mt-5 text-base leading-relaxed sm:text-lg ${cor} ${className}`}>
      {children}
    </p>
  )
}