/**
 * Faça Parte — inscrição por WhatsApp.
 *
 * O formulário não grava nada: valida os dados, monta a mensagem e abre a
 * conversa com a ONG (`wa.me/...?text=`). Os documentos são levados na matrícula
 * presencial e por isso não são campos aqui. As regras ficam em `lib/inscricao.ts`.
 */
import { useState } from 'react'
import { MessageCircle } from 'lucide-react'

import { Eyebrow, Section, SectionLead, SectionTitle } from '@/components/ui/Section'
import { Reveal } from '@/components/ui/Reveal'
import {
  CURSOS,
  IDADE_MINIMA_CURSO,
  MAIORIDADE,
  MENSALIDADE_POR_ATIVIDADE,
  MODALIDADES,
  calcularIdade,
  calcularMensalidade,
  formatarReais,
  montarMensagemInscricao,
  validarInscricao,
  type DadosInscricao,
} from '@/lib/inscricao'
import { linkWhatsapp } from '@/lib/whatsapp'
import fotoNossoEspaco from '@/assets/fotos/ballet-apres-162.webp'


const CAMPO =
  'mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-normal outline-none transition placeholder:text-slate-400 focus:border-verde focus:ring-4 focus:ring-verde/10'
const ROTULO = 'text-sm font-bold text-verde-escuro'
const ERRO = 'mt-1 text-xs font-semibold text-vermelho'

const VAZIO: DadosInscricao = {
  nome: '',
  sobrenome: '',
  nascimento: '',
  modalidades: [],
  cursos: [],
  telefone: '',
  responsavelNome: '',
  responsavelSobrenome: '',
  responsavelTelefone: '',
}

const DOCUMENTOS_MAIOR = [
  'RG',
  'CPF',
  'Comprovante de residência',
  'Título de eleitor',
  'Valor da mensalidade',
]
const DOCUMENTOS_MENOR = [
  'RG, CPF, comprovante de residência e título de eleitor do responsável',
  'RG ou certidão de nascimento do aluno',
  'Atestado médico de aptidão física',
]

function alternar(lista: string[], item: string): string[] {
  return lista.includes(item) ? lista.filter((i) => i !== item) : [...lista, item]
}

export function PreRegisterSection() {
  const [dados, setDados] = useState<DadosInscricao>(VAZIO)
  const [tentouEnviar, setTentouEnviar] = useState(false)
  const [linkEnviado, setLinkEnviado] = useState<string | null>(null)

  const idade = calcularIdade(dados.nascimento)
  const menor = idade !== null && idade < MAIORIDADE
  const total = dados.modalidades.length + dados.cursos.length
  const erros = tentouEnviar ? validarInscricao(dados) : {}

  const atualizar = (parcial: Partial<DadosInscricao>) => setDados((d) => ({ ...d, ...parcial }))

  function enviar(e: React.FormEvent) {
    e.preventDefault()
    setTentouEnviar(true)
    if (Object.keys(validarInscricao(dados)).length > 0) return

    const link = linkWhatsapp(montarMensagemInscricao(dados))
    setLinkEnviado(link)
    window.open(link, '_blank', 'noopener,noreferrer')
  }

  return (
    <Section id="participar" tom="claro">
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        {/* Formulário */}
        <Reveal>
          <Eyebrow>Faça parte</Eyebrow>
          <SectionTitle>Quer matricular seu filho ou praticar um esporte?</SectionTitle>
          <SectionLead>
            Preencha os dados e enviaremos a sua inscrição pelo WhatsApp para a
            coordenação. A mensalidade é de {formatarReais(MENSALIDADE_POR_ATIVIDADE)} por
            modalidade, curso ou capacitação, paga por PIX ou dinheiro trocado (não
            aceitamos cartão).
          </SectionLead>

          <form className="mt-8 space-y-5" onSubmit={enviar} noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={ROTULO}>
                Nome do aluno
                <input
                  type="text"
                  autoComplete="given-name"
                  placeholder="Nome"
                  value={dados.nome}
                  onChange={(e) => atualizar({ nome: e.target.value })}
                  aria-invalid={erros.nome ? 'true' : undefined}
                  className={`${CAMPO} ${erros.nome ? 'border-vermelho' : ''}`}
                />
                {erros.nome && <span className={`block ${ERRO}`}>{erros.nome}</span>}
              </label>
              <label className={ROTULO}>
                Sobrenome
                <input
                  type="text"
                  autoComplete="family-name"
                  placeholder="Sobrenome"
                  value={dados.sobrenome}
                  onChange={(e) => atualizar({ sobrenome: e.target.value })}
                  aria-invalid={erros.sobrenome ? 'true' : undefined}
                  className={`${CAMPO} ${erros.sobrenome ? 'border-vermelho' : ''}`}
                />
                {erros.sobrenome && <span className={`block ${ERRO}`}>{erros.sobrenome}</span>}
              </label>
            </div>

            <label className={`block ${ROTULO}`}>
              Data de nascimento
              <input
                type="date"
                value={dados.nascimento}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => atualizar({ nascimento: e.target.value })}
                aria-invalid={erros.nascimento ? 'true' : undefined}
                className={`${CAMPO} ${erros.nascimento ? 'border-vermelho' : ''}`}
              />
              {idade !== null && (
                <span className="mt-1 block text-xs font-normal text-grafite/60">
                  {idade} anos
                </span>
              )}
              {erros.nascimento && <span className={`block ${ERRO}`}>{erros.nascimento}</span>}
            </label>

            <fieldset>
              <legend className={ROTULO}>Modalidades de interesse</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {MODALIDADES.map((nome) => (
                  <Opcao
                    key={nome}
                    nome={nome}
                    marcado={dados.modalidades.includes(nome)}
                    aoAlternar={() => atualizar({ modalidades: alternar(dados.modalidades, nome) })}
                  />
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className={ROTULO}>
                Cursos{' '}
                <span className="font-normal text-grafite/50">
                  (lista de espera, a partir de {IDADE_MINIMA_CURSO} anos)
                </span>
              </legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {CURSOS.map((nome) => (
                  <Opcao
                    key={nome}
                    nome={nome}
                    marcado={dados.cursos.includes(nome)}
                    aoAlternar={() => atualizar({ cursos: alternar(dados.cursos, nome) })}
                  />
                ))}
              </div>
              {erros.cursos && <p className={ERRO}>{erros.cursos}</p>}
            </fieldset>
            {erros.atividades && <p className={ERRO}>{erros.atividades}</p>}

            {menor && (
              <div className="space-y-4 rounded-2xl border border-amarelo/50 bg-amarelo/10 p-5">
                <p className="text-sm leading-relaxed text-verde-escuro">
                  <strong>Aluno menor de {MAIORIDADE} anos.</strong> A matrícula só pode ser feita
                  por pai, mãe ou guardião legal.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className={ROTULO}>
                    Nome do responsável
                    <input
                      type="text"
                      autoComplete="off"
                      placeholder="Nome"
                      value={dados.responsavelNome}
                      onChange={(e) => atualizar({ responsavelNome: e.target.value })}
                      aria-invalid={erros.responsavelNome ? 'true' : undefined}
                      className={`${CAMPO} ${erros.responsavelNome ? 'border-vermelho' : ''}`}
                    />
                    {erros.responsavelNome && (
                      <span className={`block ${ERRO}`}>{erros.responsavelNome}</span>
                    )}
                  </label>
                  <label className={ROTULO}>
                    Sobrenome do responsável
                    <input
                      type="text"
                      autoComplete="off"
                      placeholder="Sobrenome"
                      value={dados.responsavelSobrenome}
                      onChange={(e) => atualizar({ responsavelSobrenome: e.target.value })}
                      aria-invalid={erros.responsavelSobrenome ? 'true' : undefined}
                      className={`${CAMPO} ${erros.responsavelSobrenome ? 'border-vermelho' : ''}`}
                    />
                    {erros.responsavelSobrenome && (
                      <span className={`block ${ERRO}`}>{erros.responsavelSobrenome}</span>
                    )}
                  </label>
                </div>
                <label className={`block ${ROTULO}`}>
                  Telefone do responsável
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="off"
                    placeholder="(13) 90000-0000"
                    value={dados.responsavelTelefone}
                    onChange={(e) => atualizar({ responsavelTelefone: e.target.value })}
                    aria-invalid={erros.responsavelTelefone ? 'true' : undefined}
                    className={`${CAMPO} ${erros.responsavelTelefone ? 'border-vermelho' : ''}`}
                  />
                  {erros.responsavelTelefone && (
                    <span className={`block ${ERRO}`}>{erros.responsavelTelefone}</span>
                  )}
                </label>
              </div>
            )}

            {idade !== null && !menor && dados.cursos.length > 0 && (
              <label className={`block ${ROTULO}`}>
                Telefone para contato
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="(13) 90000-0000"
                  value={dados.telefone}
                  onChange={(e) => atualizar({ telefone: e.target.value })}
                  aria-invalid={erros.telefone ? 'true' : undefined}
                  className={`${CAMPO} ${erros.telefone ? 'border-vermelho' : ''}`}
                />
                {erros.telefone && <span className={`block ${ERRO}`}>{erros.telefone}</span>}
              </label>
            )}

            <p
              className="rounded-xl bg-mist-50 px-4 py-3 text-sm text-verde-escuro"
              aria-live="polite"
            >
              Mensalidade estimada: <strong>{formatarReais(calcularMensalidade(total))}</strong>{' '}
              <span className="text-grafite/60">
                ({total} {total === 1 ? 'atividade' : 'atividades'} ×{' '}
                {formatarReais(MENSALIDADE_POR_ATIVIDADE)})
              </span>
            </p>

            <button
              type="submit"
              className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-verde px-7 py-3.5 text-sm font-bold uppercase tracking-wider text-white shadow-lg shadow-verde/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-verde/35 sm:w-auto"
            >
              <MessageCircle className="size-4" aria-hidden="true" />
              Enviar inscrição pelo WhatsApp
            </button>

            {linkEnviado && (
              <p className="text-sm text-grafite/70" role="status">
                Abrimos o WhatsApp com a sua mensagem. Se nada abriu,{' '}
                <a
                  href={linkEnviado}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="font-bold text-verde underline-offset-4 hover:underline"
                >
                  clique aqui
                </a>
                .
              </p>
            )}
          </form>

          {/* Documentos: levados na matrícula presencial, não são campos do site. */}
          <div className="mt-8 rounded-2xl border border-slate-200/70 bg-white p-5">
            <h3 className="font-extrabold text-verde-escuro">Na matrícula presencial, leve</h3>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-grafite/50">
                  Maior de idade
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-grafite/75">
                  {DOCUMENTOS_MAIOR.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-grafite/50">
                  Menor de idade
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-grafite/75">
                  {DOCUMENTOS_MENOR.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </Reveal>

        {/* Foto */}
        <Reveal delay={150} direction="left">
          <div className="relative">
            <div
              aria-hidden="true"
              className="absolute -inset-4 rounded-4xl bg-linear-to-br from-verde/15 to-amarelo/15 blur-2xl"
            />
            <div className="relative overflow-hidden rounded-[1.75rem] shadow-2xl ring-1 ring-slate-900/5">
              <img
                src={fotoNossoEspaco}
                alt="Crianças com bolas de basquete após o treino"
                width={1280}
                height={1920}
                loading="lazy"
                decoding="async"
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

function Opcao({
  nome,
  marcado,
  aoAlternar,
}: {
  nome: string
  marcado: boolean
  aoAlternar: () => void
}) {
  return (
    <label
      className={`cursor-pointer rounded-full border-2 px-4 py-2 text-sm font-semibold transition-colors ${
        marcado
          ? 'border-verde bg-verde/10 text-verde'
          : 'border-slate-200 text-grafite/70 hover:border-slate-300'
      }`}
    >
      <input type="checkbox" checked={marcado} onChange={aoAlternar} className="sr-only" />
      {nome}
    </label>
  )
}
