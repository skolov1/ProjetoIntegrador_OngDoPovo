/**
 * Programas & Atividades — grid dos programas com abas.
 *
 * Abas:
 *  - Modalidades: esportes oferecidos (sem vagas)
 *  - Outros: exames de vista, cursos e capacitações, eventos
 *  - Galeria: fotos das práticas esportivas na ONG
 *
 * Cada card usa uma cor diferente da paleta da marca (roxo, laranja, verde,
 * azul, amarelo, vermelho), como na referência.
 */
import { ArrowRight } from 'lucide-react'

import { Eyebrow, Section, SectionLead, SectionTitle } from '@/components/ui/Section'
import { Reveal } from '@/components/ui/Reveal'
import { Sunburst } from '@/components/ui/Sunburst'
import { PROGRAMAS } from '@/features/home/data'
import { cor, icone } from '@/features/home/icons'
import { useState } from 'react'

/* -------------------------------------------------------------------------- */
/* Dados das modalidades (vagas removidas, conforme solicitação)              */
/* -------------------------------------------------------------------------- */

const modalidades = [
  {
    slug: 'muay-thai',
    nome: 'Muay Thai',
    descricao: 'Aulas para faixa etária de 07 a 12 anos às segundas, quartas e sextas, 19:30–20:30; acima de 13 anos 20:30–21:30.',
    cor: 'vermelho',
    icone: 'punho',
  },
  {
    slug: 'karate',
    nome: 'Karatê',
    descricao: 'Disponível para idades acima de 7 anos, aulas terças e quintas, 18:30–19:30.',
    cor: 'laranja',
    icone: 'punho',
  },
  {
    slug: 'ballet',
    nome: 'Ballet',
    descricao: 'Turmas terças/quartas e segundas/quartas com horários variados.',
    cor: 'roxo',
    icone: 'ballet',
  },
  {
    slug: 'capoeira',
    nome: 'Capoeira',
    descricao: 'Pessoas acima de 6 anos, treinos segundas, quartas e sextas, 20:00–22:00.',
    cor: 'verde',
    icone: 'run',
  },
  {
    slug: 'kung-fu',
    nome: 'Kung Fu',
    descricao: 'Idades acima de 7 anos, terças e quintas, 19:30–20:30.',
    cor: 'amarelo',
    icone: 'punho',
  },
  {
    slug: 'futebol-campo',
    nome: 'Futebol de Campo',
    descricao: 'Público 07–15 anos, aulas segundas, quartas e sextas, 09:00–11:00.',
    cor: 'verde',
    icone: 'basquete',
  },
  {
    slug: 'futsal',
    nome: 'Futsal',
    descricao: 'Aulas segundas e quartas; turmas 07–09 (19:00–20:00), 10–12 (20:00–21:00), 12–15 (21:00–22:00).',
    cor: 'verde',
    icone: 'futsal',
  },
  {
    slug: 'funcional',
    nome: 'Funcional',
    descricao: 'A partir de 12 anos, terças e quintas, 20:30–21:30.',
    cor: 'azul',
    icone: 'funcional',
  },
  {
    slug: 'jazz',
    nome: 'Jazz',
    descricao: 'Turmas quintas-feiras 20:30–21:30; segundas e quartas 16:40–17:10.',
    cor: 'vermelho',
    icone: 'jazz',
  },
]

const outros = PROGRAMAS.filter((p) =>
  ['saude-visual', 'capacitacao', 'eventos'].includes(p.slug)
)

/* -------------------------------------------------------------------------- */
/* Fotos das práticas esportivas (prefixo imagens_ong_page-XXXX)              */
/* -------------------------------------------------------------------------- */

import fotoEsporte1 from '../../../../refs/imagens_ong/imagens_ong_page-0001.jpg'
import fotoEsporte2 from '../../../../refs/imagens_ong/imagens_ong_page-0002.jpg'
import fotoEsporte3 from '../../../../refs/imagens_ong/imagens_ong_page-0003.jpg'
import fotoEsporte4 from '../../../../refs/imagens_ong/imagens_ong_page-0004.jpg'
import fotoEsporte5 from '../../../../refs/imagens_ong/imagens_ong_page-0005.jpg'
import fotoEsporte6 from '../../../../refs/imagens_ong/imagens_ong_page-0006.jpg'
import fotoEsporte7 from '../../../../refs/imagens_ong/imagens_ong_page-0007.jpg'

const FOTOS_ESPORTE = [
  { src: fotoEsporte1, alt: 'Prática esportiva na ONG do Povo' },
  { src: fotoEsporte2, alt: 'Aulas de esporte na comunidade' },
  { src: fotoEsporte3, alt: 'Atividades físicas e inclusão' },
  { src: fotoEsporte4, alt: 'Jovens praticando esportes' },
  { src: fotoEsporte5, alt: 'Esporte transformando vidas' },
  { src: fotoEsporte6, alt: 'Prática esportiva em grupo' },
  { src: fotoEsporte7, alt: 'Movimento e bem-estar na ONG' },
]

type Tab = 'modalidades' | 'outros' | 'galeria'

export function ProgramsSection() {
  const [activeTab, setActiveTab] = useState<Tab>('modalidades')

  return (
    <Section id="programas" tom="mint" className="relative overflow-hidden">
      <Sunburst
        tone="green"
        size={480}
        rays={24}
        fill={0.05}
        spin={false}
        className="pointer-events-none absolute -right-36 bottom-0 text-verde opacity-40 select-none"
      />

      <div className="relative">
        <Reveal className="max-w-2xl">
          <Eyebrow>O que fazemos</Eyebrow>
          <SectionTitle>Nossos programas e atividades</SectionTitle>
          <SectionLead>
            Ações contínuas criadas para preencher as lacunas de esporte, educação
            profissional e saúde dentro da comunidade.
          </SectionLead>
        </Reveal>

        {/* Abas */}
        <div className="mt-12 flex flex-col space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button
              type="button"
              onClick={() => setActiveTab('modalidades')}
              className={`
                px-5 py-2.5 rounded-lg font-medium whitespace-nowrap transition-colors
                ${activeTab === 'modalidades'
                  ? 'bg-verde text-white shadow-sm shadow-verde/20'
                  : 'bg-mist-200 text-grafite/70 hover:bg-mist-300'}
              `}
            >
              Modalidades
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('outros')}
              className={`
                px-5 py-2.5 rounded-lg font-medium whitespace-nowrap transition-colors
                ${activeTab === 'outros'
                  ? 'bg-verde text-white shadow-sm shadow-verde/20'
                  : 'bg-mist-200 text-grafite/70 hover:bg-mist-300'}
              `}
            >
              Outros
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('galeria')}
              className={`
                px-5 py-2.5 rounded-lg font-medium whitespace-nowrap transition-colors
                ${activeTab === 'galeria'
                  ? 'bg-verde text-white shadow-sm shadow-verde/20'
                  : 'bg-mist-200 text-grafite/70 hover:bg-mist-300'}
              `}
            >
              Galeria
            </button>
          </div>

          {/* Conteúdo das abas */}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 mt-12">
            {activeTab === 'galeria' ? (
              FOTOS_ESPORTE.map((foto, i) => (
                <Reveal key={i} delay={i * 80} as="article">
                  <div className="group relative flex aspect-video overflow-hidden rounded-2xl shadow-lg ring-1 ring-slate-900/5 bg-white transition-all duration-400 hover:-translate-y-1.5 hover:shadow-2xl">
                    <img
                      src={foto.src}
                      alt={foto.alt}
                      loading="lazy"
                      className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-verde/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute bottom-0 left-0 p-5 w-full bg-gradient-to-t from-black/60 via-transparent to-transparent">
                      <h3 className="text-base font-extrabold text-white shadow-sm">
                        Prática esportiva
                      </h3>
                      <p className="mt-1 text-sm text-mist-100">{foto.alt}</p>
                    </div>
                  </div>
                </Reveal>
              ))
            ) : (
              (activeTab === 'modalidades' ? modalidades : outros).map(
                (programa, i) => {
                  const Icone = icone(programa.icone)
                  const paleta = cor(programa.cor)

                  return (
                    <Reveal
                      key={programa.slug}
                      delay={i * 90}
                      as="article"
                      className="h-full"
                    >
                      <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/60 bg-white p-6 transition-all duration-400 hover:-translate-y-1.5 hover:border-verde/25 hover:shadow-2xl">
                        {/* Brilho colorido que entra no hover */}
                        <span
                          aria-hidden="true"
                          className={`absolute -right-8 -top-8 size-28 rounded-full ${paleta.bg} opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-20`}
                        />
                        <span
                          className={`relative grid size-14 place-items-center rounded-2xl ${paleta.bg} text-white shadow-lg ${paleta.ring} transition-transform duration-400 group-hover:scale-110 group-hover:rotate-3`}
                        >
                          <Icone className="size-6" aria-hidden="true" />
                        </span>

                        <h3 className="relative mt-5 text-lg font-extrabold text-verde-escuro">
                          {programa.nome}
                        </h3>
                        <p className="relative mt-2 flex-1 text-sm leading-relaxed text-grafite/70">
                          {programa.descricao}
                        </p>

                        <div className="relative mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                          <a
                            href="#participar"
                            className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-verde transition-colors hover:text-verde-escuro"
                          >
                            Saiba mais
                            <ArrowRight
                              className="size-3.5 transition-transform duration-300 group-hover:translate-x-1"
                              aria-hidden="true"
                            />
                          </a>
                        </div>
                      </div>
                    </Reveal>
                  )
                }
              )
            )}
          </div>
        </div>
      </div>
    </Section>
  )
}
