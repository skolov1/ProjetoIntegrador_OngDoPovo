/**
 * Tela de turmas: cards com busca por nome, filtro de situação e paginação.
 *
 * Novo e Editar abrem o formulário do painel (que mora no DashboardLayout); aqui
 * ficam a lista e as ações seguras: inativar/reativar e excluir com aviso.
 */

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/Button";
import {
  useAlterarAtivoTurma,
  useDeleteTurma,
  useTurmas,
} from "@/features/dashboard/api";
import { ConfirmModal, type Confirmacao } from "@/features/dashboard/modais";
import {
  BarraDeFiltros,
  Paginacao,
  type FiltroAtivo,
} from "@/features/dashboard/pecas";
import { TurmaCard } from "@/features/dashboard/TurmaCard";
import { textoExcluirTurma } from "@/lib/cadastros";
import { useDebounce } from "@/lib/useDebounce";

export function TurmasTela({
  onNova,
  onEditar,
}: {
  onNova: () => void;
  onEditar: (id: number) => void;
}) {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<FiltroAtivo>("");
  const [pagina, setPagina] = useState(1);
  const [confirmacao, setConfirmacao] = useState<Confirmacao | null>(null);
  const [erroAcao, setErroAcao] = useState("");

  const termo = useDebounce(busca.trim());
  const { data, isLoading, error } = useTurmas({
    page: pagina,
    ...(termo && { search: termo }),
    ...(filtro && { ativo: filtro === "ativos" }),
  });
  const alternar = useAlterarAtivoTurma();
  const excluir = useDeleteTurma();

  const turmas = data?.results ?? [];
  const total = data?.count ?? 0;
  const temFiltro = Boolean(termo || filtro);

  const mudarBusca = (valor: string) => {
    setBusca(valor);
    setPagina(1);
  };
  const mudarFiltro = (valor: FiltroAtivo) => {
    setFiltro(valor);
    setPagina(1);
  };
  const aoFalhar = () => setErroAcao("Não foi possível concluir a ação. Tente de novo.");
  // Excluir (ou inativar com filtro ligado) o único item da página recua uma página.
  const recuarSeVazia = () => {
    if (turmas.length === 1 && pagina > 1) setPagina(pagina - 1);
  };

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-extrabold text-verde-escuro">Turmas</h3>
        <Button variante="secundaria" onClick={onNova}>
          <Plus className="size-4 mr-2" />
          Nova Turma
        </Button>
      </div>

      <BarraDeFiltros
        busca={busca}
        onBusca={mudarBusca}
        filtro={filtro}
        onFiltro={mudarFiltro}
        placeholder="Buscar turma pelo nome"
        rotulos={["Todas", "Ativas", "Inativas"]}
      />

      {erroAcao && (
        <p role="alert" className="text-sm text-vermelho">
          {erroAcao}
        </p>
      )}
      {isLoading && <p>Carregando...</p>}
      {error && (
        <p className="text-vermelho">
          Erro ao carregar turmas.{' '}
          {pagina > 1 && (
            <button
              type="button"
              onClick={() => setPagina(1)}
              className="font-semibold underline underline-offset-4"
            >
              Voltar à primeira página
            </button>
          )}
        </p>
      )}

      {!isLoading && !error && turmas.length === 0 && (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-grafite/60">
          {temFiltro
            ? "Nenhuma turma encontrada com esses filtros."
            : "Nenhuma turma cadastrada ainda. Use Nova Turma para começar."}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {turmas.map((t) => (
          <TurmaCard
            key={t.id}
            turma={t}
            onEditar={() => onEditar(t.id)}
            onAlternarAtivo={() =>
              setConfirmacao({
                titulo: t.ativo === false ? "Reativar turma?" : "Inativar turma?",
                texto:
                  t.ativo === false
                    ? `${t.nome} volta a aparecer na lista de chamada.`
                    : `${t.nome} sai da lista de chamada, mas o cadastro e as presenças ficam guardados.`,
                rotulo: t.ativo === false ? "Reativar" : "Inativar",
                onConfirm: () => {
                  setErroAcao("");
                  alternar.mutate(
                    { id: t.id, ativo: t.ativo === false },
                    { onError: aoFalhar, onSuccess: () => filtro && recuarSeVazia() },
                  );
                },
              })
            }
            onExcluir={() =>
              setConfirmacao({
                titulo: "Excluir turma?",
                texto: textoExcluirTurma(t.total_presencas),
                rotulo: "Excluir",
                perigo: true,
                onConfirm: () => {
                  setErroAcao("");
                  excluir.mutate(t.id, { onError: aoFalhar, onSuccess: recuarSeVazia });
                },
              })
            }
          />
        ))}
      </div>

      <Paginacao pagina={pagina} total={total} onMudar={setPagina} />

      {confirmacao && (
        <ConfirmModal
          {...confirmacao}
          onClose={() => setConfirmacao(null)}
          onConfirm={() => {
            confirmacao.onConfirm();
            setConfirmacao(null);
          }}
        />
      )}
    </div>
  );
}
