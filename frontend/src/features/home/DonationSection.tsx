/**
 * Doação — somente a lista de itens/equipamentos que aceitamos.
 *
 * Decisão da reunião: sem QR Code, CNPJ ou chave PIX na página.
 */

import { Wheat, Accessibility, Bath } from 'lucide-react'

import { Eyebrow, Section, SectionLead, SectionTitle } from '@/components/ui/Section'
import { Reveal } from '@/components/ui/Reveal'
import { Sunburst } from '@/components/ui/Sunburst'

const ITENS_ACEITOS = [
  { rotulo: 'Alimentos não perecíveis', Icon: Wheat },
  { rotulo: 'Cadeiras de rodas', Icon: Accessibility },
  { rotulo: 'Muletas', Icon: Accessibility },
  { rotulo: 'Cadeiras de banho', Icon: Bath },
] as const

export function DonationSection() {
  return (
    <Section id="doe" tom="escuro" className="relative overflow-hidden">
      <Sunburst
        tone="white"
        size={620}
        rays={30}
        fill={0.05}
        spin={false}
        className="pointer-events-none absolute -right-44 -bottom-48 text-white opacity-25 select-none"
      />

      <div className="relative mx-auto items-center gap-10">
        {/* Texto e itens aceitos */}
        <Reveal>
          <Eyebrow tom="escuro">Onde nossa missão toca</Eyebrow>
          <SectionTitle tom="escuro">Apoie nossos projetos com uma doação</SectionTitle>
          <SectionLead tom="escuro">
            Sua contribuição transforma o impacto real no bairro: mantém as
            atividades, o material esportivo e as ações de saúde da comunidade.
          </SectionLead>

          <p className="mt-8 text-sm font-bold uppercase tracking-[0.18em] text-mist-200">
            Também aceitamos
          </p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {ITENS_ACEITOS.map(({ rotulo, Icon }) => (
              <li
                key={rotulo}
                className="flex items-center gap-3 rounded-2xl border border-white/15 bg-zinc-200 p-4 text-black"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-verde/20 text-verde">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span className="font-semibold">{rotulo}</span>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </Section>
  )
}
