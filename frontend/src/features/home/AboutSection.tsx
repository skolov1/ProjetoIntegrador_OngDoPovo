/**
 * Quem somos — história da ONG com galeria de fotos e três princípios.
 * Layout: texto da história à esquerda, galeria de imagens à direita,
 * princípios em largura total abaixo.
 */
import { Eyebrow, Section, SectionLead, SectionTitle } from '@/components/ui/Section'
import { Reveal } from '@/components/ui/Reveal'
import Autoplay from 'embla-carousel-autoplay'
import {
  Carousel,
  CarouselContent,
  CarouselDots,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/Carousel'
import { PRINCIPIOS } from '@/features/home/data'
import { cor, icone } from '@/features/home/icons'

/* -------------------------------------------------------------------------- */
/* Fotos da história da ONG (prefixo imgXX)                                    */
/* -------------------------------------------------------------------------- */

import fotoHistoria1 from '@/assets/fotos/img20.webp'
import fotoHistoria2 from '@/assets/fotos/img45.webp'
import fotoHistoria3 from '@/assets/fotos/img47.webp'
import fotoHistoria4 from '@/assets/fotos/img67.webp'
import fotoHistoria5 from '@/assets/fotos/img69.webp'
import fotoHistoria6 from '@/assets/fotos/img87.webp'

const FOTOS_HISTORIA = [
  {
    src: fotoHistoria1,
    alt: 'Início das atividades da ONG do Povo na garagem',
  },
  {
    src: fotoHistoria2,
    alt: 'Primeiros alunos participando das atividades',
  },
  {
    src: fotoHistoria3,
    alt: 'Esporte e inclusão na comunidade Caieiras',
  },
  {
    src: fotoHistoria4,
    alt: 'Consolidação da ONG em 2020',
  },
  {
    src: fotoHistoria5,
    alt: 'Transformação social através do esporte',
  },
  {
    src: fotoHistoria6,
    alt: 'Gerações acolhidas pela ONG do Povo',
  },
]

export function AboutSection() {
  return (
    <Section id="quem-somos" tom="claro">
      <div className="grid min-w-0 grid-cols-1 gap-10 pt-4 lg:grid-cols-12 lg:gap-12 lg:pt-12">
        {/* Coluna de texto — história estendida */}
        <div className="mx-auto w-full min-w-0 space-y-6 lg:col-span-6">
          <Reveal>
            <Eyebrow>Quem somos</Eyebrow>
            <SectionTitle>História</SectionTitle>
            <SectionLead>
              A Ong do Povo foi fundada em 2013 por Rodrigo e Ana, que começaram
              suas atividades na garagem de sua casa no bairro Caieiras, em
              Praia Grande. Inicialmente, com poucos recursos e estrutura
              improvisada, eles ofereceram atividades como muay thai, balé e
              treinamento funcional para crianças da comunidade.
            </SectionLead>
          </Reveal>

          <Reveal delay={120}>
            <p className="text-lg leading-relaxed text-grafite/70">
              A iniciativa foi oficialmente consolidada em 2020, quando Rodrigo
              e Ana fundaram a ONG do Povo, criando um espaço dedicado à
              transformação social por meio do esporte e da inclusão. Desde
              então, a ONG tem impactado positivamente a vida de muitas
              crianças e jovens, oferecendo uma variedade de atividades e
              programas que promovem desenvolvimento pessoal e comunitário.
            </p>
          </Reveal>

          <Reveal delay={240}>
            <p className="text-lg leading-relaxed text-grafite/70">
              O propósito central do projeto é ser um movimento de
              transformação social, baseado em amor, dedicação e respeito,
              inspirando e acolhendo gerações da comunidade.
            </p>
          </Reveal>
        </div>

        {/* Coluna de fotos da história */}
        <div className="mx-auto w-full min-w-0 overflow-hidden lg:col-span-6">
          <Reveal>
            <Carousel
              opts={{ loop: true }}
              plugins={[
                Autoplay({
                  delay: 5000,
                  stopOnMouseEnter: true,
                  stopOnFocusIn: true,
                  stopOnInteraction: false,
                }),
              ]}
              aria-label="Fotos da história da ONG do Povo"
              className="mx-auto max-w-2xl overflow-hidden"
            >
              <CarouselContent>
              {FOTOS_HISTORIA.map((foto, i) => (
                <CarouselItem key={i}>
                  <div className="flex h-72 items-center justify-center overflow-hidden rounded-2xl bg-mist-100 p-3 shadow-lg ring-1 ring-slate-900/5 sm:h-[28rem]">
                    <img
                      src={foto.src}
                      alt={foto.alt}
                      loading={i === 0 ? 'eager' : 'lazy'}
                      decoding="async"
                      className="max-h-full max-w-full object-contain transition-transform duration-500 hover:scale-[1.02]"
                    />
                  </div>
                </CarouselItem>
              ))}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
              <CarouselDots count={FOTOS_HISTORIA.length} />
            </Carousel>
          </Reveal>
        </div>
      </div>

      {/* Princípios — largura total abaixo */}
      <div className="mt-16 lg:mt-24 pt-8 lg:pt-12 border-t border-slate-100/50">
        <Reveal>
          <p className="mb-6 text-center lg:text-left text-sm font-bold uppercase tracking-[0.18em] text-grafite/45">
            Nosso trabalho se baseia em 3 princípios
          </p>
        </Reveal>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {PRINCIPIOS.map((principio, i) => {
            const Icone = icone(principio.icon)
            const paleta = cor(principio.cor)

            return (
              <Reveal key={principio.titulo} delay={i * 110} as="article">
                <div className="group flex flex-col gap-3 rounded-2xl border border-slate-200/70 bg-white p-5 sm:p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-verde/25 hover:shadow-lg">
                  <span
                    className={`grid size-11 sm:size-12 shrink-0 place-items-center rounded-xl ${paleta.bg} text-white transition-transform duration-300 group-hover:scale-110`}
                  >
                    <Icone className="size-5 sm:size-6" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="font-extrabold text-verde-escuro">
                      {principio.titulo}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-grafite/70">
                      {principio.descricao}
                    </p>
                  </div>
                </div>
              </Reveal>
            )
          })}
        </div>
      </div>
    </Section>
  )
}
