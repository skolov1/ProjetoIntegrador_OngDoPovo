/**
 * Faça Parte — formulário de pré-cadastro de aluno.
 *
 * Os formulários ainda NÃO apontam para a API: enviam os próprios dados e
 * mostram confirmação local. Ligar ao `POST /api/v1/alunos/` é trabalho da
 * Fase 3, junto com o app `alunos` do Django. O botão só aparece na Fase 2.
 */
import { useState } from 'react'
import { Check, Send } from 'lucide-react'

import { Eyebrow, Section, SectionLead, SectionTitle } from '@/components/ui/Section'
import { Reveal } from '@/components/ui/Reveal'


const INTERESSES = [
  'Esporte',
  'Saúde',
  'Educação',
  'Cursos profissionalizantes',
  'Voluntariado',
  'Outro',
] as const

export function PreRegisterSection() {
  const [enviado, setEnviado] = useState(false)

  return (
    <Section id="participar" tom="claro">
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        {/* Formulário */}
        <Reveal>
          <Eyebrow>Faça parte</Eyebrow>
          <SectionTitle>Quer matricular seu filho ou praticar um esporte?</SectionTitle>
          <SectionLead>
            Preencha o formulário e nossa coordenação entra em contato para completar a
            inscrição. A mensalidade é de R$ 20,00 por modalidade, curso ou capacitação, paga por PIX ou dinheiro trocado (não aceitamos cartão).
          </SectionLead>

          {enviado ? (
            <div className="mt-8 flex items-start gap-4 rounded-2xl border border-verde/20 bg-mist-50 p-6">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-verde text-white">
                <Check className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="font-extrabold text-verde-escuro">Pré-cadastro registrado!</p>
                <p className="mt-1 text-sm leading-relaxed text-grafite/70">
                  Nossa equipe vai entrar em contato pelo telefone informado. Enquanto isso,
                  pode conferir a{' '}
                  <a href="#programas" className="font-bold text-verde underline-offset-4 hover:underline">
                    grade de horários
                  </a>
                  .
                </p>
              </div>
            </div>
          ) : (
            <form
              className="mt-8 space-y-4"
              onSubmit={(e) => {
                e.preventDefault()
                setEnviado(true)
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-bold text-verde-escuro">
                  Nome do responsável
                  <input
                    type="text"
                    name="responsavel"
                    required
                    autoComplete="name"
                    placeholder="Nome completo"
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-normal outline-none transition placeholder:text-slate-400 focus:border-verde focus:ring-4 focus:ring-verde/10"
                  />
                </label>

                <label className="text-sm font-bold text-verde-escuro">
                  Telefone de contato
                  <input
                    type="tel"
                    name="telefone"
                    required
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="(11) 90000-0000"
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-normal outline-none transition placeholder:text-slate-400 focus:border-verde focus:ring-4 focus:ring-verde/10"
                  />
                </label>
              </div>

              <label className="block text-sm font-bold text-verde-escuro">
                Tem algum interesse?
                <select
                  name="interesse"
                  defaultValue={INTERESSES[0]}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-normal outline-none transition focus:border-verde focus:ring-4 focus:ring-verde/10"
                >
                  {INTERESSES.map((interesse) => (
                    <option key={interesse} value={interesse}>
                      {interesse}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="submit"
                className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-verde px-7 py-3.5 text-sm font-bold uppercase tracking-wider text-white shadow-lg shadow-verde/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-verde/35 sm:w-auto"
              >
                Enviar pré-cadastro
                <Send
                  className="size-4 transition-transform duration-300 group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </button>
            </form>
          )}
        </Reveal>

        {/* Foto */}
        <Reveal delay={150} direction="left">
          <div className="relative">
            <div
              aria-hidden="true"
              className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-verde/15 to-amarelo/15 blur-2xl"
            />
            <div className="relative overflow-hidden rounded-[1.75rem] shadow-2xl ring-1 ring-slate-900/5">
              <img
                src="https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=900&q=85"
                alt="Crianças com bolas de basquete após o treino"
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>

            {/* Card flutuante de destaque */}
            <div className="absolute -bottom-6 -right-2 rounded-2xl bg-amarelo px-5 py-4 shadow-2xl sm:-right-6">
              <p className="text-3xl font-extrabold leading-none text-verde-escuro">
                R$ 20
              </p>
              <p className="mt-1 text-xs font-bold uppercase tracking-wider text-verde-escuro/70">
                por modalidade
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </Section>
  )
}