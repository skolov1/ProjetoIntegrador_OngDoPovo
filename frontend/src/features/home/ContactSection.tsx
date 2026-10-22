/**
 * Contato — canal de mensagem + dados + mapa.
 *
 * O formulário ainda não envia para a API (app `contato` do Django é Fase 3);
 * hoje mostra confirmação local.
 */
import { useState } from 'react'
import { Check, Mail, MapPin, Send, Clock } from 'lucide-react'

import { InstagramIcon } from '@/components/ui/BrandIcons'

import { Eyebrow, Section, SectionLead, SectionTitle } from '@/components/ui/Section'
import { Reveal } from '@/components/ui/Reveal'
import { ONG } from '@/features/home/data'

const ASSUNTOS = ['Dúvida geral', 'Voluntariado', 'Doações', 'Parceria', 'Imprensa'] as const

const CANAIS = [
  { Icon: MapPin, rotulo: 'Sede', valor: ONG.endereco, href: ONG.linkMaps },
  { Icon: Mail, rotulo: 'E-mail', valor: ONG.email, href: `mailto:${ONG.email}` },
  {
    Icon: InstagramIcon,
    rotulo: 'Instagram',
    valor: `@${ONG.instagram}`,
    href: ONG.instagramUrl,
  },
  { Icon: Clock, rotulo: 'Horário de atendimento', valor: ONG.horarioAtendimento, href: undefined },
  { Icon: Clock, rotulo: 'Horário de funcionamento', valor: ONG.horarioFuncionamento, href: undefined },
] as const

export function ContactSection() {
  const [enviado, setEnviado] = useState(false)

  return (
    <Section id="contato" tom="claro">
      <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        {/* Canais */}
        <Reveal>
          <Eyebrow>Fale conosco</Eyebrow>
          <SectionTitle>Vamos construir essa mudança juntos</SectionTitle>
          <SectionLead>
            Quer saber mais sobre os projetos, fazer uma parceria ou participar como
            voluntário? Nossa equipe está pronta para conversar.
          </SectionLead>

          <ul className="mt-8 space-y-2">
            {CANAIS.map(({ Icon, rotulo, valor, href }) => (
              <li key={rotulo}>
                {href ? (
                  <a
                    href={href}
                    {...(href.startsWith('http')
                      ? { target: '_blank', rel: 'noreferrer noopener' }
                      : {})}
                    className="group flex items-center gap-4 rounded-2xl p-3 transition-colors hover:bg-mist-50"
                  >
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-mist-100 text-verde transition-colors group-hover:bg-verde group-hover:text-white">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <span>
                      <span className="block font-extrabold text-verde-escuro">{rotulo}</span>
                      <span className="mt-0.5 block text-sm text-grafite/70">{valor}</span>
                    </span>
                  </a>
                ) : (
                  <div className="flex items-center gap-4 rounded-2xl p-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-mist-100 text-verde">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <span>
                      <span className="block font-extrabold text-verde-escuro">{rotulo}</span>
                      <span className="mt-0.5 block text-sm text-grafite/70">{valor}</span>
                    </span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Reveal>

        {/* Formulário */}
        <Reveal delay={140}>
          {enviado ? (
            <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-verde/20 bg-mist-50 p-10 text-center">
              <span className="grid size-14 place-items-center rounded-full bg-verde text-white">
                <Check className="size-7" aria-hidden="true" />
              </span>
              <p className="mt-5 text-xl font-extrabold text-verde-escuro">Mensagem enviada!</p>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-grafite/70">
                Recebemos o seu contato e retornaremos pelo e-mail informado o mais
                breve possível.
              </p>
            </div>
          ) : (
            <form
              className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm sm:p-8"
              onSubmit={(e) => {
                e.preventDefault()
                setEnviado(true)
              }}
            >
              <h3 className="text-xl font-extrabold text-verde-escuro">Envie uma mensagem</h3>
              <p className="mt-1 text-sm text-grafite/60">
                Retornaremos assim que possível.
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-bold text-verde-escuro">
                  Nome
                  <input
                    type="text"
                    name="nome"
                    required
                    autoComplete="name"
                    placeholder="Seu nome"
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none transition placeholder:text-slate-400 focus:border-verde focus:ring-4 focus:ring-verde/10"
                  />
                </label>
                <label className="text-sm font-bold text-verde-escuro">
                  E-mail
                  <input
                    type="email"
                    name="email"
                    required
                    autoComplete="email"
                    placeholder="voce@email.com"
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none transition placeholder:text-slate-400 focus:border-verde focus:ring-4 focus:ring-verde/10"
                  />
                </label>
                <label className="text-sm font-bold text-verde-escuro sm:col-span-2">
                  Assunto
                  <select
                    name="assunto"
                    defaultValue={ASSUNTOS[0]}
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none transition focus:border-verde focus:ring-4 focus:ring-verde/10"
                  >
                    {ASSUNTOS.map((assunto) => (
                      <option key={assunto} value={assunto}>
                        {assunto}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-bold text-verde-escuro sm:col-span-2">
                  Mensagem
                  <textarea
                    name="mensagem"
                    rows={5}
                    required
                    placeholder="Escreva sua mensagem..."
                    className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none transition placeholder:text-slate-400 focus:border-verde focus:ring-4 focus:ring-verde/10"
                  />
                </label>
              </div>

              <button
                type="submit"
                className="group mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-verde px-6 py-3.5 text-sm font-bold uppercase tracking-wider text-white shadow-lg shadow-verde/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-verde/35"
              >
                Enviar mensagem
                <Send
                  className="size-4 transition-transform duration-300 group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </button>
            </form>
          )}
        </Reveal>
      </div>
    </Section>
  )
}
