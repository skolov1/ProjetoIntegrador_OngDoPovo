/**
 * Doação — somente QR Code + chave PIX e a lista de itens que aceitamos.
 *
 * Decisão do time: sem formulário e sem cartão/transferência. Quem doa paga
 * pelo PIX (QR Code ou chave do CNPJ) e a ONG confere no extrato.
 */

import { useState } from 'react'
import { Check, Copy, Wheat, Accessibility, Bath } from 'lucide-react'

import { Eyebrow, Section, SectionLead, SectionTitle } from '@/components/ui/Section'
import { Reveal } from '@/components/ui/Reveal'
import { Sunburst } from '@/components/ui/Sunburst'
import { ONG } from '@/features/home/data'
import qrCodeImg from '../../../../refs/qrcode_donate.jpg'

const ITENS_ACEITOS = [
  { rotulo: 'Alimentos não perecíveis', Icon: Wheat },
  { rotulo: 'Cadeiras de rodas', Icon: Accessibility },
  { rotulo: 'Muletas', Icon: Accessibility },
  { rotulo: 'Cadeiras de banho', Icon: Bath },
] as const

export function DonationSection() {
  const [copiado, setCopiado] = useState(false)

  async function copiarChave() {
    try {
      await navigator.clipboard.writeText(ONG.chavePix)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2200)
    } catch {
      // clipboard bloqueado (http/permissão) — a chave está visível ao lado.
    }
  }

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

      <div className="relative grid items-center gap-10 lg:grid-cols-[1fr_1fr] lg:gap-14">
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
                className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/5 p-4 text-white"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-verde/20 text-verde">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span className="font-semibold">{rotulo}</span>
              </li>
            ))}
          </ul>
        </Reveal>

        {/* QR Code + chave PIX */}
        <Reveal delay={160}>
          <div className="mx-auto w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-2xl sm:p-8">
            <h3 className="text-lg font-extrabold text-verde-escuro">Doe pelo PIX</h3>
            <p className="mt-1 text-sm text-grafite/65">
              Aponte a câmera do banco para o QR Code.
            </p>

            <img
              src={qrCodeImg}
              alt="QR Code para doações via PIX"
              className="mx-auto mt-5 aspect-square w-full max-w-72 rounded-xl object-contain sm:max-w-80"
            />

            <div className="mt-6 rounded-xl bg-mist-50 p-4 text-left">
              <p className="text-xs font-bold uppercase tracking-wider text-grafite/50">
                Chave PIX (CNPJ {ONG.cnpj})
              </p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <code className="truncate font-extrabold text-verde-escuro">
                  {ONG.chavePix}
                </code>
                <button
                  type="button"
                  onClick={copiarChave}
                  aria-label="Copiar chave PIX"
                  className="grid size-9 shrink-0 place-items-center rounded-lg bg-white text-verde transition-colors hover:bg-verde hover:text-white"
                >
                  {copiado ? (
                    <Check className="size-4" aria-hidden="true" />
                  ) : (
                    <Copy className="size-4" aria-hidden="true" />
                  )}
                </button>
              </div>
              <p className="mt-2 text-xs text-grafite/55" role="status" aria-live="polite">
                {copiado
                  ? 'Chave copiada para a área de transferência.'
                  : 'Copie a chave e cole no app do seu banco.'}
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </Section>
  )
}
