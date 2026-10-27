import { ArrowLeft, ShieldCheck } from 'lucide-react'

import { Footer } from '@/components/layout/Footer'
import { Sunburst } from '@/components/ui/Sunburst'
import { ONG } from '@/features/home/data'

const dadosTratados = [
  ['Nome, data de nascimento e sexo', 'Aluno', 'Identificar o aluno e separar menor de maior de idade.'],
  ['RG ou certidão de nascimento (opcional)', 'Aluno', 'Conferência na matrícula.'],
  ['CPF (opcional)', 'Aluno maior de 18 anos', 'Identificação do adulto. O menor não tem CPF guardado.'],
  ['Nome, CPF, RG, telefone e endereço', 'Responsável do menor', 'Identificar quem responde pelo menor e permitir contato. Nome, CPF e telefone são obrigatórios.'],
  ['Situação do comprovante de residência e do título de eleitor', 'Aluno; título apenas para maior', 'Saber se a documentação da matrícula está completa. O documento não é guardado.'],
  ['Situação e validade do exame de aptidão física', 'Aluno menor', 'Saber se o menor pode praticar a atividade e quando o exame vence.'],
  ['Nome do responsável, data, hora e versão do termo', 'Menor', 'Provar que o responsável autorizou o tratamento dos dados.'],
  ['Item, quantidade, data, observação e nome do doador (opcional)', 'Doador', 'Controlar o que a ONG recebeu, como alimentos, cadeiras e muletas. Sem nome, a doação é anônima. Não guardamos telefone, e-mail nem documento do doador.'],
  ['Item emprestado, quantidade, nome de quem pegou, datas do empréstimo e da devolução', 'Quem pegou o item emprestado', 'Saber onde está o item e avisar quando passa de 3 meses sem devolução. Guardamos só o nome, sem telefone, e-mail nem documento.'],
  ['Registro de ações: conta de quem criou, alterou ou excluiu, data e hora, tipo de registro e campos alterados', 'Equipe da ONG', 'Saber quem fez cada alteração e proteger os dados. CPF, RG, telefone e endereço aparecem ocultos nesse registro.'],
  ['Turmas, situação (ativo ou inativo), presenças e mensalidade (R$ 20 por turma, podendo ser ajustada por aluno)', 'Aluno', 'Operação da ONG: turmas, cobrança e lista de chamada.'],
] as const

export function PrivacyPage() {
  return (
    <div className="min-h-screen bg-mist-50 text-grafite">
      <header className="relative overflow-hidden bg-verde-900 text-white">
        <Sunburst
          tone="white"
          size={420}
          rays={24}
          fill={0.05}
          spin={false}
          className="pointer-events-none absolute -right-36 -top-44 text-white opacity-25"
        />
        <div className="relative mx-auto max-w-7xl px-6 py-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <a href="/#inicio" className="flex items-center gap-3">
              <img
                src="/logo-icone.webp"
                alt=""
                width={40}
                height={40}
                className="size-10 object-contain"
              />
              <span className="text-lg font-extrabold tracking-tight">{ONG.nome}</span>
            </a>
            <a
              href="/#inicio"
              className="inline-flex items-center gap-2 text-sm font-bold text-mist-200 transition-colors hover:text-white"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Voltar para a página inicial
            </a>
          </div>
          <div className="mt-16 max-w-3xl pb-16">
            <div className="flex items-center gap-3 text-amarelo">
              <ShieldCheck className="size-8" aria-hidden="true" />
              <span className="text-xs font-bold uppercase tracking-[0.18em]">
                Transparência e cuidado
              </span>
            </div>
            <h1 className="mt-5 text-4xl font-extrabold tracking-tight sm:text-5xl">
              Política de Privacidade
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-mist-200 sm:text-lg">
              Entenda quais dados pessoais a {ONG.nome} trata, por que eles são
              necessários e como você pode exercer seus direitos.
            </p>
          </div>
        </div>
      </header>

      <main id="conteudo" className="mx-auto max-w-5xl px-6 py-12 lg:px-8 lg:py-20">
        <article className="space-y-12">
          <section aria-labelledby="escopo">
            <h2 id="escopo" className="text-2xl font-extrabold text-verde-900">
              Sobre esta política
            </h2>
            <p className="mt-4 leading-relaxed">
              Esta política explica o tratamento de dados realizado no painel
              administrativo da {ONG.nome}, utilizado para a gestão de alunos,
              turmas, presenças e doações, e também a pré-inscrição feita pelo
              site. O painel exige login de administrador e o cadastro de
              menores depende da autorização do responsável.
            </p>
          </section>

          <section aria-labelledby="dados-guardados">
            <h2 id="dados-guardados" className="text-2xl font-extrabold text-verde-900">
              Dados guardados e finalidade
            </h2>
            <div className="mt-5 overflow-hidden rounded-2xl border border-mist-200 bg-white shadow-sm">
              <div className="hidden grid-cols-[1.25fr_0.8fr_1.5fr] gap-6 bg-verde-900 px-6 py-4 text-xs font-bold uppercase tracking-wider text-white md:grid">
                <span>Dado</span>
                <span>Quem</span>
                <span>Finalidade</span>
              </div>
              {dadosTratados.map(([dado, quem, finalidade]) => (
                <div
                  key={dado}
                  className="grid gap-2 border-b border-mist-100 px-5 py-5 last:border-0 md:grid-cols-[1.25fr_0.8fr_1.5fr] md:gap-6 md:px-6"
                >
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-verde md:hidden">
                      Dado
                    </span>
                    <p className="font-semibold">{dado}</p>
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-verde md:hidden">
                      Quem
                    </span>
                    <p className="text-sm leading-relaxed">{quem}</p>
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-verde md:hidden">
                      Finalidade
                    </span>
                    <p className="text-sm leading-relaxed text-grafite/80">{finalidade}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section aria-labelledby="pre-inscricao">
            <h2 id="pre-inscricao" className="text-2xl font-extrabold text-verde-900">
              Pré-inscrição pelo WhatsApp
            </h2>
            <p className="mt-4 leading-relaxed">
              O formulário de pré-inscrição do site não grava nada em nosso
              sistema. Ele apenas monta uma mensagem, que você mesmo envia pelo
              WhatsApp para a coordenação. Nessa mensagem vão o nome e a data de
              nascimento do aluno, as atividades de interesse e um telefone para
              contato (o do responsável, quando o aluno é menor de idade).
            </p>
            <p className="mt-4 rounded-xl border-l-4 border-amarelo bg-amarelo/10 p-4 text-sm leading-relaxed">
              Nenhum documento é pedido nem enviado nessa etapa. RG, CPF e
              demais documentos só são conferidos na matrícula presencial.
            </p>
          </section>

          <section aria-labelledby="nao-coletado">
            <h2 id="nao-coletado" className="text-2xl font-extrabold text-verde-900">
              O que não é coletado
            </h2>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                'Número do título de eleitor e do comprovante de residência: apenas a situação é registrada.',
                'Conteúdo do atestado médico: o sistema guarda apenas a situação e a validade; o documento fica com a ONG, em papel.',
                'Imagem ou arquivo de documentos: não há upload, pois a conferência é presencial.',
                'CPF do menor: somente o CPF do responsável é guardado.',
              ].map((item) => (
                <li key={item} className="rounded-xl border border-mist-200 bg-white p-5 text-sm leading-relaxed">
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="protecao">
            <h2 id="protecao" className="text-2xl font-extrabold text-verde-900">
              Como os dados são protegidos
            </h2>
            <ul className="mt-5 space-y-3 leading-relaxed">
              <li>O painel exige login de administrador, e cada pessoa da equipe usa a própria conta.</li>
              <li>O painel registra quem criou, alterou ou excluiu cada informação. Esse registro não guarda CPF, RG, telefone nem endereço, e ao excluir um aluno o nome dele também sai do histórico.</li>
              <li>Na listagem de alunos, o CPF aparece mascarado (só para maiores de idade) e os dados do responsável não são exibidos. O CPF completo só aparece ao abrir o cadastro para edição.</li>
              <li>CPF e telefone não aparecem em URLs nem em parâmetros de busca; a busca é apenas por nome.</li>
              <li>Menores só são cadastrados com o checkbox de autorização do responsável. Cada autorização registra a versão do termo.</li>
            </ul>
          </section>

          <section aria-labelledby="direitos">
            <h2 id="direitos" className="text-2xl font-extrabold text-verde-900">
              Seus direitos
            </h2>
            <p className="mt-4 leading-relaxed">
              Você, ou o responsável pelo menor, pode pedir à ONG a qualquer
              momento:
            </p>
            <ul className="mt-5 space-y-3 leading-relaxed">
              <li><strong>Correção:</strong> atualizamos o cadastro com os dados corretos.</li>
              <li><strong>Saída da atividade:</strong> o aluno deixa as turmas e a lista de chamada, e o cadastro fica guardado.</li>
              <li><strong>Exclusão:</strong> apagamos definitivamente o cadastro, a autorização do responsável e as presenças do aluno. Depois de confirmada, a exclusão não pode ser desfeita.</li>
              <li><strong>Cópia:</strong> entregamos a você as informações que constam no cadastro.</li>
            </ul>
            <p className="mt-5 rounded-xl border-l-4 border-amarelo bg-amarelo/10 p-4 text-sm leading-relaxed">
              Guardamos apenas o necessário para a operação e apagamos o
              cadastro de quem pedir a exclusão, salvo obrigação legal de manter
              o dado.
            </p>
          </section>

          <section aria-labelledby="contato">
            <h2 id="contato" className="text-2xl font-extrabold text-verde-900">
              Fale com a ONG do Povo
            </h2>
            <p className="mt-4 leading-relaxed">
              Para dúvidas ou para fazer qualquer um dos pedidos acima, escreva
              para{' '}
              <a className="font-bold text-verde underline underline-offset-4" href={`mailto:${ONG.email}`}>
                {ONG.email}
              </a>
              .
            </p>
          </section>

          <section aria-labelledby="em-definicao">
            <h2 id="em-definicao" className="text-2xl font-extrabold text-verde-900">
              Pontos em definição
            </h2>
            <p className="mt-4 leading-relaxed">
              A ONG está formalizando o texto completo do termo de consentimento,
              o prazo de retenção de cadastros inativos e a criptografia de CPF
              e RG do responsável no banco de dados. A versão do termo utilizada
              fica registrada a cada autorização.
            </p>
          </section>
        </article>
      </main>

      <Footer onPrivacyPage />
    </div>
  )
}
