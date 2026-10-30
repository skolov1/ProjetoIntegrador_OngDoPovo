/**
 * Visão geral: tela inicial do painel.
 *
 * Seis totais em cartões e, abaixo, só o que precisa de atenção (alertas com algo a
 * resolver), cada um com um botão que leva à aba onde a pessoa resolve. A API devolve só
 * números, sem nomes; quem quiser ver quem são vai para a aba indicada.
 */

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
  formatarFrequencia,
  montarAlertas,
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

  if (isLoading) return <p className="mt-6">Carregando...</p>;
  if (error || !data) {
    return <p className="mt-6 text-vermelho">Erro ao carregar a visão geral.</p>;
  }

  const { totais } = data;
  const alertas = montarAlertas(data.alertas);

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
