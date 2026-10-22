/**
 * Nosso Impacto — seção escura com os números da ONG.
 *
 * Os números contam de 0 até o valor quando entram na viewport (useCountUp).
 * Com `prefers-reduced-motion` ligado o valor final aparece direto.
 */
import { Eyebrow, Section, SectionLead, SectionTitle } from '@/components/ui/Section'
import { Reveal } from '@/components/ui/Reveal'
import { Sunburst } from '@/components/ui/Sunburst'
import { INDICADORES } from '@/features/home/data'
import { useCountUp, useReveal } from '@/lib/useReveal'

/** 1200 -> "1.200" (pt-BR usa ponto como separador de milhar) */
function formatarMilhar(n: number): string {
  return n.toLocaleString('pt-BR')
}

function CartaoIndicador({
  valor,
  sufixo,
  rotulo,
  delay,
}: {
  valor: number
  sufixo: string
  rotulo: string
  delay: number
}) {
  const { ref, visivel } = useReveal<HTMLDivElement>({ threshold: 0.4 })
  // A animação só roda depois que o próprio cartão entrou na tela.
  const animado = useCountUp(valor, { ativo: visivel, formato: formatarMilhar })

  return (
    <Reveal
      as="article"
      delay={delay}
      className="group relative overflow-hidden rounded-2xl bg-white/95 p-6 shadow-lg transition-transform duration-300 hover:-translate-y-1"
    >
      {/* Barra colorida que cresce no hover */}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-gradient-to-r from-verde via-amarelo to-laranja transition-transform duration-500 group-hover:scale-x-100"
      />

      <div ref={ref}>
        <p className="text-4xl font-extrabold tracking-tight text-verde sm:text-5xl">
          {animado}
          <span className="text-amarelo">{sufixo}</span>
        </p>
        <p className="mt-2 font-semibold text-verde-escuro">{rotulo}</p>
      </div>
    </Reveal>
  )
}

export function ImpactSection() {
  return (
    <Section id="impacto" tom="escuro" className="relative overflow-hidden">
      <Sunburst
        tone="white"
        size={560}
        rays={28}
        fill={0.05}
        spin={false}
        className="pointer-events-none absolute -top-32 -left-40 text-white opacity-30 select-none"
      />

      <div className="relative">
        <Reveal className="max-w-3xl">
          <Eyebrow tom="escuro">Nosso impacto</Eyebrow>
          <SectionTitle tom="escuro">Transformação real em números</SectionTitle>
          <SectionLead tom="escuro">
            Cada número abaixo representa uma história de uma criança, uma família e uma
            comunidade que avançou junto com a gente.
          </SectionLead>
        </Reveal>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {INDICADORES.map((indicador, i) => (
            <CartaoIndicador
              key={indicador.rotulo}
              {...indicador}
              delay={i * 110}
            />
          ))}
        </div>
      </div>
    </Section>
  )
}