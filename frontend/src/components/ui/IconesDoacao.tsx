/**
 * Ícones dos itens de doação que o lucide-react não tem (muletas e cadeira de banho).
 *
 * Desenhados aqui como SVG inline, no mesmo estilo do lucide (24x24, traço de 2,
 * `currentColor`), para combinarem com os demais ícones e herdarem a cor do texto.
 * São traçados próprios: não dependem de banco de ícones, então não exigem licença
 * nem atribuição.
 */

interface Props {
  className?: string
}

function Base({ className = 'size-5', children }: Props & { children: React.ReactNode }) {
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
      {children}
    </svg>
  )
}

/** Muleta axilar: apoio no topo, duas hastes que se unem, barra de mão e ponteira. */
export function MuletasIcon({ className }: Props) {
  return (
    <Base className={className}>
      <path d="M6.5 3h11" />
      <path d="M8.5 3 12 12" />
      <path d="M15.5 3 12 12" />
      <path d="M12 12v9" />
      <path d="M9.5 15.5h5" />
      <path d="M10.5 21h3" />
    </Base>
  )
}

/** Cadeira de banho: encosto alto, assento ripado, pernas e gotas de chuveiro. */
export function CadeiraBanhoIcon({ className }: Props) {
  return (
    <Base className={className}>
      {/* encosto, assento e pernas */}
      <path d="M5 3v10" />
      <path d="M5 13h12" />
      <path d="M7 13v8" />
      <path d="M15 13v8" />
      {/* ripas do encosto e apoio de braço */}
      <path d="M5 6h3" />
      <path d="M5 9.5h6" />
      {/* gotas do chuveiro */}
      <path d="M14 3v2" />
      <path d="M18 3v2" />
      <path d="M22 3v2" />
      <path d="M16 7.5v2" />
      <path d="M20 7.5v2" />
    </Base>
  )
}
