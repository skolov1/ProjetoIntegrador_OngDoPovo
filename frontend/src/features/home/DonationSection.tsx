/**
 * Doação — o seletor de valor vira formulário de verdade.
 *
 * Antes (Fase 1) os cartões de R$ 50/100/150 eram decorativos e o botão abria
 * o WhatsApp. Agora o valor escolhido alimenta o campo `valor` do POST, e o
 * registro entra no banco como PENDENTE para a equipe conferir no extrato.
 *
 * O client vem do Orval (`pnpm api:generate`), então o payload é tipado pelo
 * serializer do Django: se o backend mudar a assinatura, o erro aparece aqui.
 */

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowRight, Check, Copy, CreditCard, QrCode, TriangleAlert } from 'lucide-react'

import { doacoesCreate } from '@/api/generated/doacoes/doacoes'
import type { DoacaoPublicCreateRequest } from '@/api/generated/model/doacaoPublicCreateRequest'
import { Eyebrow, Section, SectionLead, SectionTitle } from '@/components/ui/Section'
import { Reveal } from '@/components/ui/Reveal'
import { Sunburst } from '@/components/ui/Sunburst'
import { ONG } from '@/features/home/data'
import qrCodeImg from '../../../../refs/qrcode_donate.jpg'

/* -------------------------------------------------------------------------- */
/* Schema do formulário                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Espelha as regras do `DoacaoPublicCreateSerializer`.
 *
 * Atenção: `status` não existe aqui de propósito. O backend não aceita o campo,
 * e o zod garante que nem tentemos mandar.
 */
const schema = z.object({
  nome: z.string().trim().min(3, 'Informe o nome completo'),
  email: z.email('E-mail inválido'),
  // Vazio é válido; se preencher, precisa ter DDD + número.
  telefone: z
    .string()
    .trim()
    .refine((v) => v === '' || v.replace(/\D/g, '').length >= 10, 'Telefone incompleto'),
  anonimo: z.boolean(),
  // O input type="number" devolve string; quem converte é o
  // `valueAsNumber: true` no register (abaixo). Sem `z.coerce`, porque ele deixa
  // o tipo de entrada como `unknown` e quebra o Resolver do react-hook-form.
  valor: z.number().positive('Informe um valor maior que zero'),
  formaPagamento: z.enum(['PIX', 'DINHEIRO', 'CARTAO', 'TRANSFERENCIA']),
  destinacao: z.enum(['GERAL', 'MATERIAL', 'INFRAESTRUTURA', 'ALIMENTACAO']),
  mensagem: z.string().max(500, 'Máximo de 500 caracteres'),
})

type FormularioDoacao = z.infer<typeof schema>

/**
 * Formulário em camelCase (idiomático do React) para o contrato da API em
 * snake_case (idiomático do Django).
 *
 * Fica explícito de propósito: se o backend renomear um campo, o erro de tipo
 * aponta ESTA linha, e não se espalha pelo JSX.
 *
 * Atenção ao `valor`: o tipo gerado diz `string`, não `number`. O DecimalField
 * do Django vira string no OpenAPI com o padrão `^-?\d{0,8}(\.\d{0,2})?$`.
 */
function paraRequisicao(form: FormularioDoacao): DoacaoPublicCreateRequest {
  return {
    nome: form.nome,
    email: form.email,
    // Campo opcional: só vai no corpo se tiver conteúdo.
    ...(form.telefone ? { telefone: form.telefone } : {}),
    anonimo: form.anonimo,
    valor: form.valor.toFixed(2),
    forma_pagamento: form.formaPagamento,
    destinacao: form.destinacao,
    ...(form.mensagem ? { mensagem: form.mensagem } : {}),
  }
}

/* -------------------------------------------------------------------------- */
/* Opções — espelham as TextChoices do model                                    */
/* -------------------------------------------------------------------------- */

// const VALORES_SUGERIDOS = [
//   { valor: 50, descricao: 'Ajuda a manter o ballet acessível a todas as crianças.' },
//   { valor: 100, descricao: 'Financia materiais esportivos e fraldas para os alunos.' },
//   { valor: 150, descricao: 'Garante oficinas e o food dos eventos comunitários.' },
// ]

const FORMAS_PAGAMENTO = [
  { valor: 'PIX', rotulo: 'PIX', Icon: QrCode },
  { valor: 'DINHEIRO', rotulo: 'Dinheiro', Icon: CreditCard },
  { valor: 'CARTAO', rotulo: 'Cartão', Icon: CreditCard },
  { valor: 'TRANSFERENCIA', rotulo: 'Transferência', Icon: CreditCard },
] as const

const DESTINACOES = [
  { valor: 'GERAL', rotulo: 'Onde mais precisar' },
  { valor: 'MATERIAL', rotulo: 'Material esportivo' },
  { valor: 'INFRAESTRUTURA', rotulo: 'Infraestrutura da sede' },
  { valor: 'ALIMENTACAO', rotulo: 'Alimentação e eventos' },
] as const

/* -------------------------------------------------------------------------- */
/* Estilos de campo — compartilhados para não repetir a classe 6x              */
/* -------------------------------------------------------------------------- */

const CAMPO =
  'mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-normal text-grafite outline-none transition placeholder:text-slate-400 focus:border-verde focus:ring-4 focus:ring-verde/10'
const ROTULO = 'text-sm font-bold text-verde-escuro'
const ERRO = 'mt-1 text-xs font-semibold text-vermelho'

export function DonationSection() {
  const [copiado, setCopiado] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    control,
    formState: { errors },
  } = useForm<FormularioDoacao>({
    resolver: zodResolver(schema),
    defaultValues: {
      nome: '',
      email: '',
      telefone: '',
      anonimo: false,
      valor: 100,
      formaPagamento: 'PIX',
      destinacao: 'GERAL',
      mensagem: '',
    },
  })

  // `useWatch` em vez de `watch()`: `watch()` rerenderiza o componente inteiro a
  // cada tecla e a própria lib sinaliza isso. `useWatch` isola a assinatura.
  const valor = useWatch({ control, name: 'valor' })
  const formaPagamento = useWatch({ control, name: 'formaPagamento' })

  const mutacao = useMutation({
    mutationFn: doacoesCreate,
    onSuccess: () => reset(),
  })

  async function copiarChave() {
    try {
      await navigator.clipboard.writeText(ONG.chavePix)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2200)
    } catch {
      // clipboard bloqueado (http/permissão) — a chave está visível logo abaixo.
    }
  }

  /* ---- Sucesso ---------------------------------------------------------- */
  if (mutacao.isSuccess) {
    const resposta = mutacao.data as { id?: number } | undefined

    return (
      <Section id="doe" tom="escuro">
        <div className="mx-auto max-w-xl text-center">
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-verde text-white">
            <Check className="size-8" aria-hidden="true" />
          </span>
          <h2 className="mt-6 text-3xl font-extrabold text-white">
            Registro recebido!
          </h2>
          <p className="mt-4 leading-relaxed text-mist-200">
            Obrigado por apoiar a ONG do Povo. Nossa equipe vai conferir o pagamento
            no extrato e confirmar sua doação em breve.
          </p>
          <p className="mt-4 text-sm text-mist-200/70">
            <strong className="text-amarelo">Atenção:</strong> sua doação ainda
            está <strong>pendente de conferência</strong>. No caso pagou mas ainda não
            foi confirmada pela equipe.
          </p>
          {resposta?.id && (
            <p className="mt-3 font-mono text-xs text-mist-200/50">
              protocolo #{resposta.id}
            </p>
          )}
          <button
            type="button"
            onClick={() => mutacao.reset()}
            className="mt-8 rounded-full border-2 border-white/30 px-6 py-3 text-sm font-bold uppercase tracking-wider text-white transition hover:border-white hover:bg-white/10"
          >
            Fazer outra doação
          </button>
        </div>
      </Section>
    )
  }

  /* ---- Formulário ------------------------------------------------------- */
  return (
    <Section id="doe" tom="escuro" className="relative overflow-hidden">
      <Sunburst
        tone="white"
        size={620}
        rays={30}
        fill={0.05}
        className="pointer-events-none absolute -right-40 -bottom-48 text-white opacity-25 select-none"
      />

      <div className="relative grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
        {/* Coluna de escolha */}
        <Reveal>
          <Eyebrow tom="escuro">Onde nossa missão toca</Eyebrow>
          <SectionTitle tom="escuro">Apoie nossos projetos com uma doação</SectionTitle>
          <SectionLead tom="escuro">
            Sua contribuição transforma o impacto real no bairro: mantém aulas
            gratuitas, material esportivo e as ações de saúde da comunidade.
          </SectionLead>

          <p className="mt-6 text-sm text-mist-200">
            Aceitamos também doações de alimentos não perecíveis, cadeiras de rodas, muletas e cadeiras de banho.
          </p>
          <div className="mt-4 flex justify-center">
            <img src={qrCodeImg} alt="QR Code para doações via PIX" className="w-48 h-48" />
          </div>

          <p className="mt-8 text-sm font-bold uppercase tracking-[0.18em] text-mist-200">
            Escolha um valor
          </p>

          {/*<div className="mt-4 space-y-2.5" role="radiogroup" aria-label="Valor da doação">
            {VALORES_SUGERIDOS.map((opcao) => {
              const ativo = Number(valor) === opcao.valor
              return (
                <button
                  key={opcao.valor}
                  type="button"
                  role="radio"
                  aria-checked={ativo}
                  onClick={() => setValue('valor', opcao.valor, { shouldValidate: true })}
                  className={`flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-left transition-all duration-300 ${
                    ativo
                      ? 'border-verde bg-white shadow-xl shadow-verde/20'
                      : 'border-white/15 bg-white/5 hover:border-white/35 hover:bg-white/10'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`grid size-6 shrink-0 place-items-center rounded-full border-2 transition-colors ${
                      ativo ? 'border-verde bg-verde text-white' : 'border-white/40'
                    }`}
                  >
                    {ativo && <Check className="size-3.5" strokeWidth={3} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block text-lg font-extrabold ${ativo ? 'text-verde-escuro' : 'text-white'}`}
                    >
                      R$ {opcao.valor}
                    </span>
                    <span
                      className={`mt-0.5 block text-sm leading-relaxed ${ativo ? 'text-grafite/70' : 'text-mist-200'}`}
                    >
                      {opcao.descricao}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>*/}

          {/* Valor livre */}
          <div className="mt-3 max-w-xs flex items-center gap-3">
            <label className={ROTULO} htmlFor="valor">
              Ou escolha outro valor
            </label>
            <div className="relative mt-2">
              <span className="pointer-events-none absolute top-8 left-4 -translate-y-1/2 text-grafite/50">
                R$
              </span>
              <input
                id="valor"
                type="number"
                min="1"
                step="0.01"
                inputMode="decimal"
                aria-invalid={errors.valor ? 'true' : undefined}
                {...register('valor', { valueAsNumber: true })}
                className={`${CAMPO} pl-11 flex items-center ${errors.valor ? 'border-vermelho' : ''}`}
              />
            </div>
            {errors.valor && <p className={ERRO}>{errors.valor.message}</p>}
          </div>
        </Reveal>

        {/* Coluna do formulário */}
        <Reveal delay={160}>
          <form
            onSubmit={handleSubmit((dados) => mutacao.mutate(paraRequisicao(dados)))}
            className="rounded-2xl bg-white p-6 shadow-2xl sm:p-7"
            noValidate
          >
            <h3 className="text-lg font-extrabold text-verde-escuro">Seus dados</h3>
            <p className="mt-1 text-sm text-grafite/65">
              Usamos para confirmar o recebimento. Não divulgamos.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label className={ROTULO} htmlFor="nome">
                  Nome completo
                </label>
                <input
                  id="nome"
                  type="text"
                  autoComplete="name"
                  placeholder="Como devemos te chamar"
                  aria-invalid={errors.nome ? 'true' : undefined}
                  {...register('nome')}
                  className={`${CAMPO} ${errors.nome ? 'border-vermelho' : ''}`}
                />
                {errors.nome && <p className={ERRO}>{errors.nome.message}</p>}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={ROTULO} htmlFor="email">
                    E-mail
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="voce@email.com"
                    aria-invalid={errors.email ? 'true' : undefined}
                    {...register('email')}
                    className={`${CAMPO} ${errors.email ? 'border-vermelho' : ''}`}
                  />
                  {errors.email && <p className={ERRO}>{errors.email.message}</p>}
                </div>
                <div>
                  <label className={ROTULO} htmlFor="telefone">
                    WhatsApp <span className="font-normal text-grafite/40">(opcional)</span>
                  </label>
                  <input
                    id="telefone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="(13) 90000-0000"
                    aria-invalid={errors.telefone ? 'true' : undefined}
                    {...register('telefone')}
                    className={`${CAMPO} ${errors.telefone ? 'border-vermelho' : ''}`}
                  />
                  {errors.telefone && <p className={ERRO}>{errors.telefone.message}</p>}
                </div>
              </div>

              {/* Anonimato */}
              <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-mist-50 p-4">
                <input
                  type="checkbox"
                  className="mt-0.5 size-5 shrink-0 accent-verde"
                  {...register('anonimo')}
                />
                <span>
                  <span className="block text-sm font-bold text-verde-escuro">
                    Doação anônima
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-grafite/65">
                    Seu nome não aparece na listagem da equipe nem em nenhum mural.
                    Guardamos o contato para emitir recibo, se precisar.
                  </span>
                </span>
              </label>

              {/* Forma de pagamento */}
              <div>
                <span className={ROTULO}>Forma de pagamento</span>
                <div
                  className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4"
                  role="radiogroup"
                  aria-label="Forma de pagamento"
                >
                  {FORMAS_PAGAMENTO.map(({ valor: v, rotulo, Icon }) => {
                    const ativo = formaPagamento === v
                    return (
                      <button
                        key={v}
                        type="button"
                        role="radio"
                        aria-checked={ativo}
                        onClick={() =>
                          setValue('formaPagamento', v, { shouldValidate: true })
                        }
                        className={`flex flex-col items-center gap-1 rounded-xl border-2 px-2 py-3 text-xs font-bold transition-all duration-300 ${
                          ativo
                            ? 'border-verde bg-verde/10 text-verde'
                            : 'border-slate-200 text-grafite/60 hover:border-slate-300'
                        }`}
                      >
                        <Icon className="size-4" aria-hidden="true" />
                        {rotulo}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Destinação */}
              <div>
                <label className={ROTULO} htmlFor="destinacao">
                  Para onde vai a doação
                </label>
                <select id="destinacao" {...register('destinacao')} className={CAMPO}>
                  {DESTINACOES.map((d) => (
                    <option key={d.valor} value={d.valor}>
                      {d.rotulo}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={ROTULO} htmlFor="mensagem">
                  Mensagem <span className="font-normal text-grafite/40">(opcional)</span>
                </label>
                <textarea
                  id="mensagem"
                  rows={2}
                  maxLength={500}
                  placeholder="Deixe uma palavra de incentivo"
                  aria-invalid={errors.mensagem ? 'true' : undefined}
                  {...register('mensagem')}
                  className={`${CAMPO} resize-none ${errors.mensagem ? 'border-vermelho' : ''}`}
                />
                {errors.mensagem && <p className={ERRO}>{errors.mensagem.message}</p>}
              </div>

              {/* Chave PIX */}
              <div className="rounded-xl bg-mist-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-grafite/50">
                  Chave PIX ({ONG.cnpj})
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
                    : 'Pague pelo PIX e depois envie o formulário abaixo.'}
                </p>
              </div>

              {mutacao.isError && (
                <p
                  role="alert"
                  className="flex items-start gap-2 rounded-xl border border-vermelho/30 bg-vermelho/5 p-3 text-sm text-vermelho"
                >
                  <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  Não foi possível registrar agora. Tente de novo em instantes ou fale
                  com a gente pelo WhatsApp.
                </p>
              )}

              <button
                type="submit"
                disabled={mutacao.isPending}
                className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-verde px-6 py-3.5 text-sm font-bold uppercase tracking-wider text-white shadow-lg shadow-verde/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-verde/35 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {mutacao.isPending ? 'Registrando…' : `Registrar R$ ${Number(valor || 0).toFixed(2)}`}
                <ArrowRight
                  className="size-4 transition-transform duration-300 group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </button>

              <p className="text-center text-xs leading-relaxed text-grafite/50">
                Ao registrar, você concorda que a ONG do Povo entre em contato para
                confirmar o pagamento. A ONG é uma organização sem fins lucrativos.
              </p>
            </div>
          </form>
        </Reveal>
      </div>
    </Section>
  )
}
