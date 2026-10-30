/**
 * Visão geral: tela inicial do painel.
 *
 * Seis totais em cartões, a frequência de cada turma no mês (da menor para a maior, para a
 * turma com mais faltas ficar no topo) e, abaixo, só o que precisa de atenção (alertas com
 * algo a resolver). Cada alerta abre e mostra quem é e onde (o nome do aluno, a turma, o
 * empréstimo), para a pessoa não ficar no escuro; as faltas seguidas têm um botão que abre a
 * chamada daquela turma, e os demais levam à aba onde se resolve. A tela inicial só carrega
 * números; a lista de nomes vem numa chamada à parte, quando um alerta é aberto.
 */

import { useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  ChevronDown,
  CircleCheck,
  Clipboard,
  GraduationCap,
  Package,
  Percent,
  TriangleAlert,
  Users,
  type LucideIcon,
} from "lucide-react";

import { useVisaoGeral, useVisaoGeralDetalhes } from "@/features/dashboard/api";
import {
  LIMITE_DETALHE,
  ROTULO_TELA,
  TODAS_AS_TURMAS,
  formatarFrequencia,
  frequenciaBaixa,
  montarAlertas,
  montarLinhas,
  opcoesDeTurma,
  rotuloRegistros,
  selecionarFrequencia,
  type Alerta,
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

function DetalheAlerta({
  alerta,
  onIr,
  onAbrirChamada,
}: {
  alerta: Alerta;
  onIr: (tela: TelaDestino) => void;
  onAbrirChamada: (turmaId: number) => void;
}) {
  const { data, isLoading, error } = useVisaoGeralDetalhes(true);

  if (isLoading) return <p className="px-1 py-3 text-sm text-grafite/70">Carregando...</p>;
  if (error || !data) {
    return <p className="px-1 py-3 text-sm text-vermelho">Erro ao carregar os detalhes.</p>;
  }

  const linhas = montarLinhas(alerta.chave, data);
  return (
    <div className="mt-3 border-t border-mist-200 pt-1">
      {linhas.length === 0 ? (
        <p className="py-3 text-sm text-grafite/70">Nada mais a resolver aqui.</p>
      ) : (
        <ul>
          {linhas.map((l) => (
            <li
              key={l.chave}
              className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-mist-100 py-2.5 last:border-b-0"
            >
              <div className="min-w-0 flex-1 basis-40">
                <p className="break-words font-medium text-grafite">{l.principal}</p>
                {l.secundario && <p className="text-sm text-grafite/60">{l.secundario}</p>}
              </div>
              {l.turmaId !== undefined && (
                <button
                  type="button"
                  onClick={() => onAbrirChamada(l.turmaId!)}
                  aria-label={`Abrir a chamada de ${l.principal}`}
                  className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-verde px-4 text-sm font-bold text-verde transition-colors hover:bg-verde hover:text-white"
                >
                  Abrir chamada
                  <ArrowRight className="size-4" aria-hidden="true" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {linhas.length >= LIMITE_DETALHE && (
        <p className="pb-2 text-sm text-grafite/60">
          Mostrando as {LIMITE_DETALHE} primeiras. O restante está na aba {ROTULO_TELA[alerta.tela]}.
        </p>
      )}
      <button
        type="button"
        onClick={() => onIr(alerta.tela)}
        className="mt-1 flex min-h-11 items-center gap-1.5 text-sm font-bold text-verde hover:underline"
      >
        Ir para {ROTULO_TELA[alerta.tela]}
        <ArrowRight className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

export function VisaoGeralTela({
  onIr,
  onAbrirChamada,
}: {
  onIr: (tela: TelaDestino) => void;
  onAbrirChamada: (turmaId: number) => void;
}) {
  const { data, isLoading, error } = useVisaoGeral();
  // Alerta aberto no momento (um por vez); a lista de nomes só é buscada quando abre.
  const [alertaAberto, setAlertaAberto] = useState<string | null>(null);
  // "" = ainda não escolheu; "todas"; ou o id da turma escolhida para aparecer sozinha.
  const [turmaEscolhida, setTurmaEscolhida] = useState("");

  if (isLoading) return <p className="mt-6">Carregando...</p>;
  if (error || !data) {
    return <p className="mt-6 text-vermelho">Erro ao carregar a visão geral.</p>;
  }

  const { totais } = data;
  const alertas = montarAlertas(data.alertas);
  const frequencias = selecionarFrequencia(data.frequencia_por_turma, turmaEscolhida);
  const precisaEscolher = data.frequencia_por_turma.length > 1;

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
          {precisaEscolher && (
            <label className="flex items-center gap-2 text-sm text-grafite/70">
              Mostrar
              <select
                name="turma-frequencia"
                value={turmaEscolhida}
                onChange={(e) => setTurmaEscolhida(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-grafite outline-none focus:border-verde focus:ring-4 focus:ring-verde/10"
              >
                <option value="">Selecione uma turma</option>
                <option value={TODAS_AS_TURMAS}>Todas as turmas</option>
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
        ) : frequencias.length === 0 ? (
          <p className="rounded-2xl border border-slate-200/70 bg-white p-4 text-grafite/70 shadow-sm">
            Selecione uma turma para ver a frequência no mês.
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
            {alertas.map((a) => {
              const aberto = alertaAberto === a.chave;
              return (
                <li
                  key={a.chave}
                  className="rounded-2xl border border-slate-200/70 bg-white p-3 shadow-sm sm:p-4"
                >
                  <button
                    type="button"
                    onClick={() => setAlertaAberto(aberto ? null : a.chave)}
                    aria-expanded={aberto}
                    aria-controls={`detalhe-${a.chave}`}
                    className="flex w-full items-center gap-3 text-left"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-amarelo/20 text-amber-700">
                      <TriangleAlert className="size-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1 text-sm font-medium text-grafite sm:text-base">
                      {a.texto}
                    </span>
                    <ChevronDown
                      className={`size-5 shrink-0 text-verde transition-transform ${aberto ? "rotate-180" : ""}`}
                      aria-hidden="true"
                    />
                  </button>
                  {aberto && (
                    <div id={`detalhe-${a.chave}`}>
                      <DetalheAlerta alerta={a} onIr={onIr} onAbrirChamada={onAbrirChamada} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
