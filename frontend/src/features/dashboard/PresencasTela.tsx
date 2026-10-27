/**
 * Tela de presenças: lista de chamada de uma turma em uma data.
 *
 * A secretaria escolhe a turma e o dia, marca presente / ausente / justificado de
 * cada aluno e salva tudo de uma vez. Quem não foi marcado fica como AUSENTE
 * (o padrão da chamada): basta marcar quem veio. O aviso de "faltante" (3 faltas seguidas,
 * sem contar as justificadas) vem calculado do servidor.
 */

import { useState } from "react";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/Button";
import type { SituacaoEnum } from "@/api/generated/model";
import {
  usePresencaChamada,
  useSalvarChamada,
  useTurmas,
} from "@/features/dashboard/api";

const OPCOES: { valor: SituacaoEnum; rotulo: string; ativo: string }[] = [
  { valor: "PRESENTE", rotulo: "Presente", ativo: "bg-verde text-white border-verde" },
  { valor: "AUSENTE", rotulo: "Ausente", ativo: "bg-vermelho text-white border-vermelho" },
  {
    valor: "JUSTIFICADO",
    rotulo: "Justificado",
    ativo: "bg-amarelo text-grafite border-amarelo",
  },
];

const CLASSE_CAMPO =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-grafite outline-none focus:border-verde focus:ring-4 focus:ring-verde/10";

const hoje = () => new Date().toISOString().split("T")[0];

export function PresencasTela() {
  const [turmaId, setTurmaId] = useState("");
  const [data, setData] = useState(hoje());
  // Só o que a secretaria mexeu nesta tela; o resto vem do servidor.
  const [edicoes, setEdicoes] = useState<Record<number, SituacaoEnum>>({});
  const [busca, setBusca] = useState("");
  const [soFaltantes, setSoFaltantes] = useState(false);
  const [aviso, setAviso] = useState("");
  // Como a última gravação desta tela terminou: primeira vez ou troca de uma chamada já salva.
  const [ultimaGravacao, setUltimaGravacao] = useState<"salva" | "atualizada">("salva");

  const { data: turmasData } = useTurmas();
  const turmas = (turmasData?.results ?? []).filter((t) => t.ativo !== false);
  const chamada = usePresencaChamada(turmaId ? Number(turmaId) : undefined, data);
  const salvar = useSalvarChamada();

  const itens = chamada.data ?? [];
  // Padrão: ausente. Vale o que a secretaria marcou, senão o que já foi salvo.
  const situacaoDe = (id: number, doServidor: unknown): SituacaoEnum =>
    edicoes[id] ?? ((doServidor as SituacaoEnum | null) || "AUSENTE");

  const visiveis = itens.filter(
    (i) =>
      i.aluno_nome.toLowerCase().includes(busca.trim().toLowerCase()) &&
      (!soFaltantes || i.faltante),
  );
  const contagem = (situacao: SituacaoEnum) =>
    itens.filter((i) => situacaoDe(i.aluno_id, i.situacao) === situacao).length;
  const faltantes = itens.filter((i) => i.faltante).length;
  // A chamada deste dia já está salva no servidor (e não há alteração pendente).
  const chamadaSalva =
    itens.some((i) => i.situacao) && Object.keys(edicoes).length === 0;
  const dataBr = data.split("-").reverse().join("/");

  const mudarFiltro = (turma: string, dia: string) => {
    setTurmaId(turma);
    setData(dia);
    setEdicoes({});
    setAviso("");
    setUltimaGravacao("salva");
  };

  const marcar = (id: number, situacao: SituacaoEnum) => {
    setEdicoes({ ...edicoes, [id]: situacao });
    setAviso("");
  };

  const todosPresentes = () => {
    setEdicoes(
      Object.fromEntries(itens.map((i) => [i.aluno_id, "PRESENTE" as SituacaoEnum])),
    );
    setAviso("");
  };

  const salvarChamada = () => {
    const presencas = itens.map((i) => ({
      aluno_id: i.aluno_id,
      situacao: situacaoDe(i.aluno_id, i.situacao),
    }));
    // Se o servidor já tinha chamada neste dia, esta gravação é uma atualização.
    const eraAtualizacao = itens.some((i) => i.situacao);
    salvar.mutate(
      { turma: Number(turmaId), data, presencas },
      {
        onSuccess: () => {
          setUltimaGravacao(eraAtualizacao ? "atualizada" : "salva");
          setEdicoes({});
          setAviso("");
        },
        onError: () =>
          setAviso("Não foi possível salvar a chamada. Confira a turma e tente de novo."),
      },
    );
  };

  return (
    <div className="mt-6 space-y-4">
      <h3 className="text-xl font-extrabold text-verde-escuro">Presenças</h3>

      <div className="grid gap-4 sm:grid-cols-2 max-w-2xl">
        <label className="text-sm text-grafite/70">
          Turma
          <select
            name="turma"
            value={turmaId}
            onChange={(e) => mudarFiltro(e.target.value, data)}
            className={`${CLASSE_CAMPO} mt-1`}
          >
            <option value="">Escolha a turma</option>
            {turmas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome} ({t.horario_formatado})
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-grafite/70">
          Data da aula
          <input
            type="date"
            name="data"
            value={data}
            onChange={(e) => mudarFiltro(turmaId, e.target.value)}
            className={`${CLASSE_CAMPO} mt-1`}
          />
        </label>
      </div>

      {!turmaId && (
        <p className="text-grafite/60">
          Escolha uma turma para ver a lista de chamada. Turmas e alunos se
          cadastram nas abas <strong>Turmas</strong> e <strong>Alunos</strong>.
        </p>
      )}

      {turmaId && chamada.isLoading && <p>Carregando...</p>}
      {turmaId && chamada.error && (
        <p className="text-vermelho">Erro ao carregar a lista de chamada.</p>
      )}

      {turmaId && !chamada.isLoading && !chamada.error && itens.length === 0 && (
        <p className="text-grafite/60">
          Nenhum aluno ativo nesta turma. Matricule alunos na aba Alunos.
        </p>
      )}

      {itens.length > 0 && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <input
              name="busca"
              placeholder="Buscar aluno pelo nome"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className={`${CLASSE_CAMPO} max-w-xs`}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={soFaltantes}
                onChange={(e) => setSoFaltantes(e.target.checked)}
              />
              Só faltantes ({faltantes})
            </label>
            <Button variante="contorno-claro" onClick={todosPresentes}>
              Todos presentes
            </Button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200/70 bg-white shadow-sm">
            <table className="w-full">
              <thead className="bg-mist-100/70">
                <tr className="text-left text-xs font-bold uppercase tracking-wider text-verde-escuro/70">
                  <th className="p-3">Aluno</th>
                  <th className="p-3">Idade</th>
                  <th className="p-3">Situação</th>
                </tr>
              </thead>
              <tbody>
                {visiveis.map((i) => {
                  const atual = situacaoDe(i.aluno_id, i.situacao);
                  return (
                    <tr key={i.aluno_id} className="border-t border-mist-200 transition-colors hover:bg-mist-50">
                      <td className="p-3 font-medium text-grafite">
                        {i.aluno_nome}
                        {i.faltante ? (
                          <span
                            title="3 faltas seguidas (justificadas não contam)"
                            className="ml-2 px-3 py-1 rounded-full text-xs font-bold bg-vermelho/10 text-vermelho"
                          >
                            Faltante · {i.faltas_seguidas} seguidas
                          </span>
                        ) : (
                          i.faltas_seguidas > 0 && (
                            <span className="ml-2 text-xs text-grafite/50">
                              {i.faltas_seguidas} falta
                              {i.faltas_seguidas > 1 ? "s" : ""} seguida
                              {i.faltas_seguidas > 1 ? "s" : ""}
                            </span>
                          )
                        )}
                      </td>
                      <td className="p-3 text-grafite/60 text-sm">{i.idade}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-2" role="group" aria-label={`Situação de ${i.aluno_nome}`}>
                          {OPCOES.map((o) => (
                            <button
                              key={o.valor}
                              type="button"
                              aria-pressed={atual === o.valor}
                              onClick={() => marcar(i.aluno_id, o.valor)}
                              className={`px-3 py-1.5 rounded-full border text-sm font-semibold transition-colors ${
                                atual === o.valor
                                  ? o.ativo
                                  : "border-slate-200 bg-white text-grafite/70 hover:border-verde"
                              }`}
                            >
                              {o.rotulo}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {visiveis.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-6 text-center text-grafite/50">
                      Nenhum aluno encontrado com esse filtro.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Button disabled={salvar.isPending} onClick={salvarChamada}>
              {salvar.isPending ? "Salvando..." : "Salvar chamada"}
            </Button>
            <span className="text-sm text-grafite/60">
              {contagem("PRESENTE")} presentes · {contagem("AUSENTE")} ausentes ·{" "}
              {contagem("JUSTIFICADO")} justificados
            </span>
          </div>
          {aviso && (
            <p role="alert" className="text-sm text-vermelho">
              {aviso}
            </p>
          )}
          {chamadaSalva && (
            <p role="status" className="flex items-center gap-1 text-sm text-verde">
              <Check className="size-4" aria-hidden="true" />
              Chamada {ultimaGravacao} no dia {dataBr}
            </p>
          )}
        </>
      )}
    </div>
  );
}
