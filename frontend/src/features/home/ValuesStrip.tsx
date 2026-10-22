/**
 * Faixa de valores — os cinco valores do manual (Inclusão, Movimento, Esperança,
 * Comunidade, Impacto Social) em marquee contínuo.
 *
 * A lista é duplicada no DOM para que a animação de marquee possa "entrar pela
 * esquerda" sem salto no fim da volta. A segunda cópia tem aria-hidden, então
 * leitor de tela anuncia os cinco valores uma vez só.
 */
import { Reveal } from '@/components/ui/Reveal'
import { VALORES } from '@/features/home/data'
import { icone } from '@/features/home/icons'

export function ValuesStrip() {
  const sequencia = [...VALORES, ...VALORES]

  return (
    <section aria-label="Nossa essência" className="overflow-hidden bg-verde py-8">
      <div className="flex w-max animate-marquee items-center gap-10 hover:[animation-play-state:paused]">
        {sequencia.map((valor, i) => {
          const Icone = icone(valor.icon)
          const duplicado = i >= VALORES.length

          return (
            <div
              key={`${valor.label}-${i}`}
              aria-hidden={duplicado || undefined}
              className="flex shrink-0 items-center gap-3"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-white/15 text-white">
                <Icone className="size-5" aria-hidden="true" />
              </span>
              <span className="text-sm font-bold uppercase tracking-[0.18em] text-white">
                {valor.label}
              </span>
              <span aria-hidden="true" className="ml-7 size-1.5 rounded-full bg-amarelo" />
            </div>
          )
        })}
      </div>

      <Reveal className="mt-8 text-center">
        <p className="text-xl font-extrabold text-white sm:text-2xl">
          Juntos vamos mais longe!
        </p>
      </Reveal>
    </section>
  )
}