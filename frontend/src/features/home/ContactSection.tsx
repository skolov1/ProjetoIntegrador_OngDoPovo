/**
 * Contato — canal de mensagem + dados + mapa.
 *
 * Todo contato vai para o WhatsApp: o formulário não grava nada, só monta a
 * mensagem e abre a conversa com a ONG já escrita.
 */
import { Mail, MapPin, MessageCircle, Send, Clock } from 'lucide-react'

import { InstagramIcon } from '@/components/ui/BrandIcons'

import { Eyebrow, Section, SectionLead, SectionTitle } from '@/components/ui/Section'
import { Reveal } from '@/components/ui/Reveal'
import { ASSUNTOS_CONTATO, ONG } from '@/features/home/data'
import { linkWhatsapp, topicoEmNegrito } from '@/lib/whatsapp'

const CANAIS = [
  { Icon: MessageCircle, rotulo: 'WhatsApp', valor: ONG.telefone, href: ONG.whatsapp },
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

interface ContactSectionProps {
  /** Assunto escolhido no formulário (controlado pelo `App`, para a seção Doe poder escolher). */
  assunto: string
  onMudarAssunto: (assunto: string) => void
}

export function ContactSection({ assunto, onMudarAssunto }: ContactSectionProps) {
  function abrirWhatsapp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const dados = new FormData(e.currentTarget)
    const mensagem = [
      topicoEmNegrito(String(dados.get('assunto'))),
      'Olá, ONG do Povo!',
      `Meu nome é ${dados.get('nome')}.`,
      '',
      String(dados.get('mensagem')),
    ].join('\n')
    window.open(linkWhatsapp(mensagem), '_blank', 'noopener,noreferrer')
  }

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
          <form
              className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm sm:p-8"
              onSubmit={abrirWhatsapp}
            >
              <h3 className="text-xl font-extrabold text-verde-escuro">Envie uma mensagem</h3>
              <p className="mt-1 text-sm text-grafite/60">
                Ao enviar, abrimos o WhatsApp com a sua mensagem pronta.
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
                  Assunto
                  <select
                    name="assunto"
                    value={assunto}
                    onChange={(e) => onMudarAssunto(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none transition focus:border-verde focus:ring-4 focus:ring-verde/10"
                  >
                    {ASSUNTOS_CONTATO.map((opcao) => (
                      <option key={opcao} value={opcao}>
                        {opcao}
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
                Enviar pelo WhatsApp
                <Send
                  className="size-4 transition-transform duration-300 group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </button>
          </form>
        </Reveal>
      </div>
    </Section>
  )
}
