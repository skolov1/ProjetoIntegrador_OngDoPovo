/**
 * Visão geral: tela inicial do painel.
 *
 * Seis totais em cartões, a frequência de cada turma no mês (da menor para a maior, para a
 * turma com mais faltas ficar no topo) e, abaixo, só o que precisa de atenção (alertas com
 * algo a resolver), cada um com um botão que leva à aba onde a pessoa resolve. A API devolve
 * só números e nomes de turma; quem quiser ver os alunos vai para a aba indicada.
 */

import { useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  CircleCheck,
  Clipboard,
  GraduationCap,
  Package,
  Percent,
  TriangleAlert,
  Users,
  type LucideIcon,
} from "lucide-react";

import { useVisaoGeral } from "@/features/dashboard/api";
import {
  filtrarFrequencia,
  formatarFrequencia,
  frequenciaBaixa,
  montarAlertas,
  opcoesDeTurma,
  rotuloRegistros,
  type TelaDestino,
} from "@/lib/visaoGeral";

function CartaoTotal({
  Icone,
  valor,
  rotulo,
}: {
  Icone: LucideIcon;
  valor: string | number;
  rotulo: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm sm:p-5">
      <span className="grid size-10 place-items-center rounded-xl bg-verde/10 text-verde">
        <Icone className="size-5" aria-hidden="true" />
      </span>
      <p className="mt-3 text-3xl font-extrabold leading-none text-verde-escuro">{valor}</p>
      <p className="mt-1.5 text-sm text-grafite/70">{rotulo}</p>
    </article>
  );
}

export function VisaoGeralTela({ onIr }: { onIr: (tela: TelaDestino) => void }) {
  const { data, isLoading, error } = useVisaoGeral();
  // "" = todas as turmas; senão, o id da turma escolhida para aparecer sozinha.
  const [turmaEscolhida, setTurmaEscolhida] = useState("");

  if (isLoading) return <p className="mt-6">Carregando...</p>;
  if (error || !data) {
    return <p className="mt-6 text-vermelho">Erro ao carregar a visão geral.</p>;
  }

  const { totais } = data;
  const alertas = montarAlertas(data.alertas);
  const frequencias = filtrarFrequencia(
    data.frequencia_por_turma,
    turmaEscolhida === "" ? null : Number(turmaEscolhida),
  );

  return (
    <div className="mt-6 space-y-8">
      <section aria-labelledby="titulo-totais" className="space-y-4">
        <h3 id="titulo-totais" className="text-xl font-extrabold text-verde-escuro">
          Visão geral
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          <CartaoTotal Icone={Users} valor={totais.alunos_ativos} rotulo="Alunos ativos" />
          <CartaoTotal Icone={Clipboard} valor={totais.turmas_ativas} rotulo="Turmas ativas" />
          <CartaoTotal
            Icone={GraduationCap}
            valor={totais.professores_ativos}
            rotulo="Professores ativos"
          />
          <CartaoTotal
            Icone={CalendarDays}
            valor={totais.eventos_servicos_ativos}
            rotulo="Eventos e serviços"
          />
          <CartaoTotal
            Icone={Percent}
            valor={formatarFrequencia(totais.frequencia_mes)}
            rotulo="Frequência no mês"
          />
          <CartaoTotal
            Icone={Package}
            valor={totais.itens_emprestados}
            rotulo="Itens emprestados"
          />
        </div>
      </section>

      <section aria-labelledby="titulo-frequencia" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <h3 id="titulo-frequencia" className="text-xl font-extrabold text-verde-escuro">
            Frequência por turma
          </h3>
          {data.frequencia_por_turma.length > 1 && (
            <label className="flex items-center gap-2 text-sm text-grafite/70">
              Mostrar
              <select
                name="turma-frequencia"
                value={turmaEscolhida}
                onChange={(e) => setTurmaEscolhida(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-grafite outline-none focus:border-verde focus:ring-4 focus:ring-verde/10"
              >
                <option value="">Todas as turmas</option>
                {opcoesDeTurma(data.frequencia_por_turma).map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nome}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        {data.frequencia_por_turma.length === 0 ? (
          <p className="rounded-2xl border border-slate-200/70 bg-white p-4 text-grafite/70 shadow-sm">
            Ainda não há chamadas neste mês.
          </p>
        ) : (
          <ul className={`grid gap-2 ${frequencias.length > 1 ? "sm:grid-cols-2" : ""}`}>
            {frequencias.map((t) => {
              const baixa = frequenciaBaixa(t.percentual);
              return (
                <li
                  key={t.turma_id}
                  className={`rounded-2xl border p-3 shadow-sm sm:p-4 ${
                    baixa ? "border-amber-300 bg-amber-50/60" : "border-slate-200/70 bg-white"
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate font-medium text-grafite">{t.turma}</span>
                    <span
                      className={`shrink-0 text-lg font-extrabold ${
                        baixa ? "text-amber-800" : "text-verde-escuro"
                      }`}
                    >
                      {t.percentual}%
                    </span>
                  </div>
                  <div
                    role="progressbar"
                    aria-label={`Frequência de ${t.turma}`}
                    aria-valuenow={t.percentual}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    className="mt-2 h-2 overflow-hidden rounded-full bg-mist-100"
                  >
                    <div
                      className={`h-full rounded-full ${baixa ? "bg-amber-500" : "bg-verde"}`}
                      style={{ width: `${t.percentual}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-grafite/60">
                    {rotuloRegistros(t.registros)} no mês
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="titulo-atencao" className="space-y-3">
        <h3 id="titulo-atencao" className="text-xl font-extrabold text-verde-escuro">
          Precisa de atenção
        </h3>
        {alertas.length === 0 ? (
          <p
            role="status"
            className="flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white p-4 text-verde shadow-sm"
          >
            <CircleCheck className="size-5 shrink-0" aria-hidden="true" />
            Tudo em dia.
          </p>
        ) : (
          <ul className="space-y-2">
            {alertas.map((a) => (
              <li
                key={a.chave}
                className="flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white p-3 shadow-sm sm:p-4"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-amarelo/20 text-amber-700">
                  <TriangleAlert className="size-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1 text-sm font-medium text-grafite sm:text-base">
                  {a.texto}
                </span>
                <button
                  type="button"
                  onClick={() => onIr(a.tela)}
                  aria-label={`Ver: ${a.texto}`}
                  className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-verde px-4 text-sm font-bold text-verde transition-colors hover:bg-verde hover:text-white"
                >
                  Ver
                  <ArrowRight className="size-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
