/**
 * Ícones de redes sociais.
 *
 * lucide-react removeu os ícones de marca na v1 (política de marca deles), então
 * não dá para importar `Instagram`/`Facebook` de lá. Como são justamente os
 * ícones mais importantes da identidade da ONG, foram recriados aqui como SVG
 * inline com os traçados oficiais das marcas.
 *
 * Não usar um ícone genérico no lugar (ex.: `Camera` para o Instagram): a marca
 * institucional da ONG precisa aparecer com o símbolo correto.
 */

interface Props {
  className?: string
}

/** Glifo do Instagram — quadrado com cantos arredondados + lente + ponto. */
export function InstagramIcon({ className = 'size-4' }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  )
}

/** Glifo do Facebook — a letra "f" dentro do contorno arredondado. */
export function FacebookIcon({ className = 'size-4' }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  )
}