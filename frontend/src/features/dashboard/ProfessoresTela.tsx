/**
 * Tela de professores: cards com busca por nome, filtro de situação e paginação.
 * O card mostra só o CPF mascarado; o completo aparece ao abrir a edição.
 */

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/Button";
import {
  useAlterarAtivoProfessor,
  useDeleteProfessor,
  useProfessores,
} from "@/features/dashboard/api";
import { ConfirmModal, type Confirmacao } from "@/features/dashboard/modais";
import {
  BarraDeFiltros,
  Paginacao,
  type FiltroAtivo,
} from "@/features/dashboard/pecas";
import { ProfessorCard } from "@/features/dashboard/ProfessorCard";
import { useDebounce } from "@/lib/useDebounce";

export function ProfessoresTela({
  onNovo,
  onEditar,
}: {
  onNovo: () => void;
  onEditar: (id: number) => void;
}) {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<FiltroAtivo>("");
  const [pagina, setPagina] = useState(1);
  const [confirmacao, setConfirmacao] = useState<Confirmacao | null>(null);
  const [erroAcao, setErroAcao] = useState("");

  const termo = useDebounce(busca.trim());
  const { data, isLoading, error } = useProfessores({
    page: pagina,
    ...(termo && { search: termo }),
    ...(filtro && { ativo: filtro === "ativos" }),
  });
  const alternar = useAlterarAtivoProfessor();
  const excluir = useDeleteProfessor();

  const professores = data?.results ?? [];
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
    if (professores.length === 1 && pagina > 1) setPagina(pagina - 1);
  };

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-extrabold text-verde-escuro">Professores</h3>
        <Button variante="secundaria" onClick={onNovo}>
          <Plus className="size-4 mr-2" />
          Novo Professor
        </Button>
      </div>

      <BarraDeFiltros
        busca={busca}
        onBusca={mudarBusca}
        filtro={filtro}
        onFiltro={mudarFiltro}
        placeholder="Buscar professor pelo nome"
      />

      {erroAcao && (
        <p role="alert" className="text-sm text-vermelho">
          {erroAcao}
        </p>
      )}
      {isLoading && <p>Carregando...</p>}
      {error && (
        <p className="text-vermelho">
          Erro ao carregar professores.{' '}
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

      {!isLoading && !error && professores.length === 0 && (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-grafite/60">
          {temFiltro
            ? "Nenhum professor encontrado com esses filtros."
            : "Nenhum professor cadastrado ainda. Use Novo Professor para começar."}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {professores.map((p) => (
          <ProfessorCard
            key={p.id}
            professor={p}
            onEditar={() => onEditar(p.id)}
            onAlternarAtivo={() =>
              setConfirmacao({
                titulo: p.ativo === false ? "Reativar professor?" : "Inativar professor?",
                texto:
                  p.ativo === false
                    ? `${p.nome} volta a ficar ativo.`
                    : `${p.nome} fica como inativo, mas o cadastro e as turmas dele ficam guardados.`,
                rotulo: p.ativo === false ? "Reativar" : "Inativar",
                onConfirm: () => {
                  setErroAcao("");
                  alternar.mutate(
                    { id: p.id, ativo: p.ativo === false },
                    { onError: aoFalhar, onSuccess: () => filtro && recuarSeVazia() },
                  );
                },
              })
            }
            onExcluir={() =>
              setConfirmacao({
                titulo: "Excluir professor?",
                texto:
                  "O cadastro do professor é apagado. As turmas e os alunos não são afetados. Esta ação não pode ser desfeita.",
                rotulo: "Excluir",
                perigo: true,
                onConfirm: () => {
                  setErroAcao("");
                  excluir.mutate(p.id, { onError: aoFalhar, onSuccess: recuarSeVazia });
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
