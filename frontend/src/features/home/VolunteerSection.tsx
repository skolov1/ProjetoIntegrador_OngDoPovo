/**
 * Nós ajudamos com você — convite ao voluntariado.
 * Seção clara com duas "fronteiras" de atuação, como na referência.
 */
import { MessageCircle } from 'lucide-react'

import { LinkBotao } from '@/components/ui/Button'
import { Eyebrow, Section, SectionLead, SectionTitle } from '@/components/ui/Section'
import { Reveal } from '@/components/ui/Reveal'
import { FRONTEIRAS_VOLUNTARIADO } from '@/features/home/data'
import { linkWhatsapp, topicoEmNegrito } from '@/lib/whatsapp'
import fotoVoluntario from '@/assets/fotos/img-1265.webp'

const MENSAGEM_VOLUNTARIO = [
  topicoEmNegrito('Voluntariado'),
  'Olá! Quero ser voluntário(a) na ONG do Povo. Podem me explicar como funciona?',
].join('\n')

export function VolunteerSection() {
  return (
    <Section id="voluntariado" tom="mint" className="relative overflow-hidden">
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        {/* Foto */}
        <Reveal direction="left">
          <div className="relative overflow-hidden rounded-[1.75rem] shadow-2xl ring-1 ring-slate-900/5">
            <img
              src={fotoVoluntario}
              alt="Voluntário durante partida do Interbairros"
              width={1280}
              height={1920}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover aspect-square"
            />
          </div>
        </Reveal>

        {/* Texto */}
        <div>
          <Reveal>
            <Eyebrow>Nós ajudamos com você</Eyebrow>
            <SectionTitle>Compartilhe seu conhecimento com quem precisa</SectionTitle>
            <SectionLead>
              Procuramos pessoas, professores e profissionais para compartilhar
              tempo e conhecimento com a comunidade. Sua experiência faz diferença
              direta na vida de quem precisa.
            </SectionLead>
          </Reveal>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {FRONTEIRAS_VOLUNTARIADO.map((fronteira, i) => (
              <Reveal key={fronteira.titulo} delay={i * 110} className="h-full">
                <div className="h-full rounded-2xl border border-slate-200/60 bg-white p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                  <h3 className="font-extrabold text-verde-escuro">{fronteira.titulo}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-grafite/70">
                    {fronteira.descricao}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={240}>
            <div className="mt-8 w-full items-center justify-center flex flex-col gap-3 sm:flex-row">
              <LinkBotao
                href={linkWhatsapp(MENSAGEM_VOLUNTARIO)}
                variante="primaria"
                seta={false}
                externa
              >
                <MessageCircle className="size-4" aria-hidden="true" />
                Falar com nosso time sobre ser um voluntário
              </LinkBotao>
            </div>
          </Reveal>
        </div>
      </div>
    </Section>
  )
}
