/**
 * <Button> — botão e link-botão com as duas variantes da marca.
 *
 * A landing usa CTA verde sólido e contorno escuro. Como `<a>` e `<button>`
 * precisam de estilos idênticos, o componente aceita `href`: com ele, renderiza
 * âncora; sem ele, renderiza button.
 */
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variante = "primaria" | "secundaria" | "contorno-claro";
type Tamanho = "md" | "lg";

const VARIANTES: Record<Variante, string> = {
  primaria:
    "bg-verde text-white shadow-lg shadow-verde/25 hover:bg-verde-700 hover:shadow-xl hover:shadow-verde/35 hover:-translate-y-0.5",
  secundaria:
    "bg-amarelo text-verde-escuro shadow-lg shadow-amarelo/25 hover:bg-[#ffd54a] hover:-translate-y-0.5",
  "contorno-claro":
    "border-2 border-verde text-verde hover:bg-verde hover:text-white hover:-translate-y-0.5",
};

const TAMANHOS: Record<Tamanho, string> = {
  md: "px-6 py-3 text-sm",
  lg: "px-7 py-3.5 text-sm sm:text-base",
};

const BASE =
  "group inline-flex items-center justify-center gap-2 rounded-full font-bold uppercase tracking-wider " +
  "transition-all duration-300 ease-smooth active:translate-y-0 " +
  "disabled:pointer-events-none disabled:opacity-50";

interface BotaoProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variante?: Variante;
  tamanho?: Tamanho;
  /** Setas e ícones: ficam à direita e andam no hover. */
  seta?: boolean;
}

export function Button({
  children,
  variante = "primaria",
  tamanho = "lg",
  seta = true,
  className = "",
  ...props
}: BotaoProps) {
  return (
    <button
      className={`${BASE} ${VARIANTES[variante]} ${TAMANHOS[tamanho]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

interface LinkBotaoProps {
  children: ReactNode;
  href: string;
  variante?: Variante;
  tamanho?: Tamanho;
  seta?: boolean;
  className?: string;
  /** Abre em nova aba com rel seguro (evita tabnabbing). */
  externa?: boolean;
}

export function LinkBotao({
  children,
  href,
  variante = "primaria",
  tamanho = "lg",
  seta = true,
  className = "",
  externa = false,
}: LinkBotaoProps) {
  return (
    <a
      href={href}
      className={`${BASE} ${VARIANTES[variante]} ${TAMANHOS[tamanho]} ${className}`}
      {...(externa ? { target: "_blank", rel: "noreferrer noopener" } : {})}
    >
      {children}
      {seta && (
        <span
          aria-hidden="true"
          className="transition-transform duration-300 group-hover:translate-x-1"
        >
          →
        </span>
      )}
    </a>
  );
}
