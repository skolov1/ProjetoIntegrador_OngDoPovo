/**
 * Hero — primeira dobra da landing.
 *
 * Fundo CLARO (a referência é clara; a versão anterior era verde escura) com o
 * padrão de raios da marca girando ao fundo e um mosaico de fotos à direita.
 */
import { MapPin } from 'lucide-react'

import { Header } from '@/components/layout/Header'
import { LinkBotao } from '@/components/ui/Button'
import { Reveal } from '@/components/ui/Reveal'
import { Sunburst } from '@/components/ui/Sunburst'
import { ONG } from '@/features/home/data'

const FOTOS = [
  {
    src: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=800&q=85',
    alt: 'Crianças jogando basquete em uma quadra',
    className: 'col-span-2 row-span-2',
    flutua: true,
  },
  {
    src: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=600&q=85',
    alt: 'Jovens em treino de futebol',
    className: 'col-span-1 row-span-1',
    flutua: false,
  },
  {
    src: 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&w=600&q=85',
    alt: 'Criança sorrindo durante uma atividade',
    className: 'col-span-1 row-span-1',
    flutua: false,
  },
]

export function HeroSection() {
  return (
    <section
      id="inicio"
      className="relative overflow-hidden bg-linear-to-b from-mist-50 via-white to-mist-100 pt-28 pb-16 sm:pt-32 sm:pb-20 lg:pt-36 lg:pb-48 2xl:pb-89"
    >
      {/* Padrão de raios — o elemento gráfico do manual, em marca d'água */}
      <Sunburst
        tone="green"
        size={720}
        rays={32}
        fill={0.06}
        className="pointer-events-none absolute top-28 -right-2 hidden text-verde opacity-70 select-none sm:block"
      />
      <Sunburst
        tone="green"
        size={420}
        rays={24}
        fill={0.05}
        spin={false}
        className="pointer-events-none absolute -bottom-40 -left-56 hidden
                   text-verde opacity-25 select-none lg:block"
      />

      <Header />

      <div className="relative mx-auto top-20 grid max-w-7xl items-center gap-14 px-6 lg:grid-cols-[1fr_0.95fr] lg:gap-10 lg:px-8">
        {/* Coluna de texto */}
        <div>
          <Reveal>
            <a
              href={ONG.linkMaps}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-2 rounded-full border border-verde/25 bg-white/80 px-4 py-2 text-[0.7rem] font-bold uppercase tracking-[0.18em] text-verde backdrop-blur-sm transition-colors hover:bg-white"
            >
              <MapPin className="size-3.5" aria-hidden="true" />
              Ilha das Caieiras, Praia Grande - SP
            </a>
          </Reveal>

          <Reveal delay={90}>
            <h1 className="mt-6 text-4xl font-extrabold leading-[1.06] tracking-tight text-verde-escuro sm:text-5xl lg:text-6xl xl:text-[4.25rem]">
              Mais oportunidades para um{' '}
              <span className="relative whitespace-nowrap text-verde">
                futuro
                {/* Sublinhado em pincel, feito com gradiente da paleta */}
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 -bottom-1 h-2.5 rounded-full bg-linear-to-r from-amarelo via-laranja to-vermelho opacity-70"
                />
              </span>{' '}
              melhor.
            </h1>
          </Reveal>

          {/* Categorias */}
          <Reveal delay={250}>
            <ul className="mt-7 flex flex-wrap gap-2">
              {ONG.areas.map((area) => (
                <li
                  key={area}
                  className="rounded-full bg-verde/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-verde-escuro"
                >
                  {area}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={320}>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <LinkBotao href="#participar">Quero me cadastrar</LinkBotao>
              <LinkBotao href="#programas" variante="contorno-claro">
                Como ajudar
              </LinkBotao>
            </div>
          </Reveal>
        </div>

        {/* Mosaico de fotos */}
        <Reveal delay={200} direction="left">
          <div className="relative mx-auto w-full max-w-md lg:ml-auto lg:max-w-none">
            {/* Halo amarelo atrás do mosaico */}
            <div
              aria-hidden="true"
              className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-br from-amarelo/25 via-verde/10 to-transparent blur-2xl"
            />

            {/* Altura explicita: sem ela as linhas do grid colapsam para 0 e as fotos
                somem — `h-full` dentro de row de altura auto não tem contra o
                que se posicionar. */}
            <div className="relative grid h-96 grid-cols-3 grid-rows-2 gap-3 sm:h-120">
              {FOTOS.map((foto, i) => (
                <div
                  key={foto.src}
                  className={`overflow-hidden rounded-2xl shadow-lg ring-1 ring-white/60 ${
                    foto.className
                  } ${foto.flutua ? 'animate-float' : ''}`}
                  style={i > 0 ? { animationDelay: `${i * 0.9}s` } : undefined}
                >
                  <img
                    src={foto.src}
                    alt={foto.alt}
                    loading={i === 0 ? 'eager' : 'lazy'}
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>

            {/* Selo flutuante com a assinatura da marca */}
            <div className="absolute -bottom-6 -left-4 max-w-[15rem] rounded-2xl bg-verde-escuro px-5 py-4 text-white shadow-2xl sm:-left-8">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-amarelo">
                Nossa essência
              </p>
              <p className="mt-1.5 text-sm font-semibold leading-snug">
                {ONG.assinatura}
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
