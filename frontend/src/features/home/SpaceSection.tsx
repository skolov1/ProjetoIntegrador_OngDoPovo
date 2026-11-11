/**
 * Nosso Espaço — endereço, horários e a grade da agenda da semana.
 * A referência mostra a tabela de horários ao lado do bloco de endereço.
 */
import { useMemo, useState, type KeyboardEvent } from "react";
import { Clock3, MapPin } from "lucide-react";

import {
  Eyebrow,
  Section,
  SectionLead,
  SectionTitle,
} from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";
import { ONG } from "@/features/home/data";
import { EventosServicos } from "@/features/home/EventosServicos";
import { useGrade } from "@/features/home/useGrade";
import { agruparPorDia, diaInicial, estiloDoStatus } from "@/lib/grade";
import { rotuloPublicoDoStatus } from "@/lib/horarios";
import { MENSALIDADE_POR_ATIVIDADE } from "@/lib/inscricao";

export function SpaceSection() {
  const { data: grade, isLoading, isError } = useGrade();
  const precisaProfessor = grade?.some((i) => i.status === "FALTA_PROFESSOR");

  // Uma aba por dia com aula; abre em hoje (ou no próximo dia com aula).
  const [diaEscolhido, setDiaEscolhido] = useState<string | null>(null);
  const grupos = useMemo(() => agruparPorDia(grade ?? []), [grade]);
  const grupoAtivo =
    grupos.find((g) => g.dia === diaEscolhido) ??
    grupos.find((g) => g.dia === diaInicial(grupos, new Date()));
  // Altura do dia mais cheio, para o cartão não pular ao trocar de aba.
  const maiorDia = Math.max(0, ...grupos.map((g) => g.itens.length));

  function trocarComSetas(e: KeyboardEvent<HTMLDivElement>) {
    if (!grupoAtivo || (e.key !== "ArrowRight" && e.key !== "ArrowLeft")) return;
    e.preventDefault();
    const atual = grupos.findIndex((g) => g.dia === grupoAtivo.dia);
    const passo = e.key === "ArrowRight" ? 1 : -1;
    const proximo = grupos[(atual + passo + grupos.length) % grupos.length];
    setDiaEscolhido(proximo.dia);
    document.getElementById(`grade-aba-${proximo.dia}`)?.focus();
  }

  return (
    <Section id="espaco" tom="claro">
      <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        {/* Endereço */}
        <Reveal>
          <Eyebrow>Nosso espaço</Eyebrow>
          <SectionTitle>Nossas portas estão sempre abertas</SectionTitle>
          <SectionLead>
            Estabelecidos na comunidade de Caieiras, somos um espaço de
            convivência onde toda a família é bem-vinda.
          </SectionLead>

          <dl className="mt-8 space-y-4">
            <div className="flex gap-4 rounded-2xl bg-mist-50 p-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-verde">
                <MapPin className="size-5" aria-hidden="true" />
              </span>
              <div>
                <dt className="font-extrabold text-verde-escuro">Endereço</dt>
                <dd className="mt-0.5 text-sm text-grafite/70">
                  {ONG.endereco}
                </dd>
              </div>
            </div>
            <div className="flex gap-4 rounded-2xl bg-mist-50 p-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-verde">
                <Clock3 className="size-5" aria-hidden="true" />
              </span>
              <div>
                <dt className="font-extrabold text-verde-escuro">
                  Atendimento
                </dt>
                <dd className="mt-0.5 text-sm text-grafite/70">
                  Segunda a sábado, das 9h às 20h
                </dd>
              </div>
            </div>
          </dl>

          <a
            href={ONG.linkMaps}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-verde underline-offset-4 hover:underline"
          >
            Ver endereço completo no mapa →
          </a>
        </Reveal>

        {/* Agenda */}
        <Reveal delay={140}>
          <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 bg-mist-50 px-5 py-4 sm:px-6">
              <div>
                <h3 className="font-extrabold text-verde-escuro">
                  Grade da semana
                </h3>
                <p className="text-sm text-grafite/60">
                  Programação regular da sede
                </p>
              </div>
              <span className="hidden rounded-full bg-verde px-3 py-1 text-xs font-bold uppercase tracking-wider text-white sm:inline">
                R$ {MENSALIDADE_POR_ATIVIDADE} por modalidade
              </span>
            </div>

            {isLoading && (
              <p className="px-5 py-6 text-sm text-grafite/60 sm:px-6">
                Carregando a grade... na primeira visita do dia pode levar alguns segundos.
              </p>
            )}
            {isError && (
              <p className="px-5 py-6 text-sm text-grafite/70 sm:px-6">
                Não foi possível carregar a grade agora. Tente de novo em
                instantes ou fale com a gente pelo WhatsApp.
              </p>
            )}
            {grade?.length === 0 && (
              <p className="px-5 py-6 text-sm text-grafite/70 sm:px-6">
                Nenhuma atividade na grade no momento.
              </p>
            )}

            {grupoAtivo && (
              <>
                <div
                  role="tablist"
                  aria-label="Dia da semana"
                  className="flex gap-1.5 overflow-x-auto border-b border-slate-100 px-4 py-3 sm:px-5"
                  onKeyDown={trocarComSetas}
                >
                  {grupos.map((g) => {
                    const ativo = g.dia === grupoAtivo.dia;
                    return (
                      <button
                        key={g.dia}
                        type="button"
                        role="tab"
                        id={`grade-aba-${g.dia}`}
                        aria-selected={ativo}
                        aria-controls="grade-painel"
                        tabIndex={ativo ? 0 : -1}
                        onClick={() => setDiaEscolhido(g.dia)}
                        className={`flex-1 whitespace-nowrap rounded-full px-3 py-2 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-verde ${
                          ativo
                            ? "bg-verde text-white"
                            : "bg-mist-50 text-grafite/70 hover:bg-mist-100"
                        }`}
                      >
                        <span className="sm:hidden">{g.curto}</span>
                        <span className="max-sm:hidden">{g.rotulo}</span>
                      </button>
                    );
                  })}
                </div>

                <ul
                  role="tabpanel"
                  id="grade-painel"
                  aria-labelledby={`grade-aba-${grupoAtivo.dia}`}
                  className="divide-y divide-slate-100"
                  style={{ minHeight: `${maiorDia * 3.75}rem` }}
                >
                  {grupoAtivo.itens.map((item) => (
                    <li
                      key={item.chave}
                      className="flex min-h-15 items-center gap-4 px-5 py-3 transition-colors hover:bg-mist-50 sm:px-6"
                    >
                      <span className="w-26 shrink-0 text-sm font-bold tabular-nums text-verde">
                        {item.horario}
                      </span>
                      <p className="min-w-0 flex-1 font-bold text-verde-escuro">
                        {item.nome}
                      </p>
                      {item.status !== "ATIVO" && (
                        <span
                          className={`w-fit whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${estiloDoStatus(
                            item.status,
                          )}`}
                        >
                          {rotuloPublicoDoStatus(item.status)}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            )}
            {precisaProfessor && (
              <p className="border-t border-slate-100 bg-amarelo/10 px-5 py-3 text-sm text-grafite/80 sm:px-6">
                Tem aula procurando professor. Quer ensinar?{" "}
                <a
                  href="#voluntariado"
                  className="font-bold text-verde underline underline-offset-4"
                >
                  Seja voluntário →
                </a>
              </p>
            )}
          </div>
        </Reveal>
      </div>
      <EventosServicos />
    </Section>
  );
}
