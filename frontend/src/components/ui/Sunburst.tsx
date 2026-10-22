/**
 * <Sunburst> — o padrão gráfico da marca.
 *
 * O manual descreve "raios de movimento, energia e união" e é isso que aparece
 * atrás do mascote na logo. Aqui ele vira um elemento decorativo: um SVG de
 * raios radiais que gira devagar.
 *
 * Reproduzido em SVG/CSS em vez de recortado da logo para não carregar bitmap.
 */
interface SunburstProps {
  /** 'green' para fundo claro, 'white' para fundo escuro. */
  tone?: 'green' | 'white'
  size?: number
  /** Raios por quadrante. 24 dá o mesmo densismo da logo. */
  rays?: number
  className?: string
  /** Gira devagar (usa a animação do index.css). */
  spin?: boolean
  /** Preenchimento interno: 0 = só raios, 1 = disco cheio. */
  fill?: number
}

export function Sunburst({
  tone = 'green',
  size = 480,
  rays = 24,
  className = '',
  spin = true,
  fill = 0.18,
}: SunburstProps) {
  const cor = tone === 'green' ? 'var(--color-verde)' : 'currentColor'
  const opacidadeDisco = fill

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={`${spin ? 'animate-sunburst' : ''} ${className}`}
      style={{ transformOrigin: '50% 50%' }}
    >
      {/* Disco central: dá corpo ao padrão sem competir com o conteúdo. */}
      <circle cx="100" cy="100" r="78" fill={cor} opacity={opacidadeDisco} />

      {Array.from({ length: rays }).map((_, i) => {
        const angulo = (360 / rays) * i
        return (
          <rect
            key={angulo}
            x="96.5"
            y="4"
            width="7"
            height="34"
            rx="3.5"
            fill={cor}
            opacity={0.55}
            transform={`rotate(${angulo} 100 100)`}
          />
        )
      })}
    </svg>
  )
}