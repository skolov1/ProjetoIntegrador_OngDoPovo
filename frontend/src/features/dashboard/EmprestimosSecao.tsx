/**
 * Empréstimos de itens — seção logo abaixo das doações no painel.
 *
 * A equipe escolhe um item que já foi doado, informa quem pegou e quando. Depois
 * de 3 meses sem devolução, o empréstimo ganha o status "Atrasado" (calculado na
 * API) e a seção mostra um aviso no topo.
 */

import { useState } from "react";
import { AlertTriangle, Edit, Plus, RotateCcw, Trash2 } from "lucide-react";

import type { Emprestimo } from "@/api/generated/model";
import { Button } from "@/components/ui/Button";
import {
  useCreateEmprestimo,
  useDeleteEmprestimo,
  useEmprestimos,
  useItensEmprestaveis,
  useUpdateEmprestimo,
} from "@/features/dashboard/api";
import {
  CLASSE_CAMPO,
  ConfirmModal,
  FormModal,
  type Confirmacao,
} from "@/features/dashboard/modais";
import { dataLocalISO, formatarDataBr, textoAvisoAtrasados } from "@/lib/emprestimo";

type FormEmprestimo = {
  doacao: string;
  quantidade: string;
  pessoa_nome: string;
  emprestado_em: string;
  observacao: string;
};

const FORM_VAZIO = (): FormEmprestimo => ({
  doacao: "",
  quantidade: "1",
  pessoa_nome: "",
  emprestado_em: dataLocalISO(),
  observacao: "",
});

// Filtro da tabela: valor enviado à API (vazio = todos).
const FILTROS = [
  ["", "Todos"],
  ["EMPRESTADO", "Emprestados"],
  ["ATRASADO", "Atrasados"],
  ["DEVOLVIDO", "Devolvidos"],
] as const;

type FiltroStatus = (typeof FILTROS)[number][0];

const CLASSE_STATUS: Record<string, string> = {
  EMPRESTADO: "bg-amarelo/10 text-amarelo",
  ATRASADO: "bg-vermelho/10 text-vermelho",
  DEVOLVIDO: "bg-verde/10 text-verde",
};

// Junta o que a API recusou ({campo: ["msg"]} ou {detail: "msg"}) em uma frase.
function mensagemDeErro(erro: unknown): string {
  const data = (erro as { response?: { data?: unknown } })?.response?.data;
  if (data && typeof data === "object") {
    return Object.values(data as Record<string, unknown>)
      .map((msg) => (Array.isArray(msg) ? msg.join(" ") : String(msg)))
      .join(" ");
  }
  return "Não foi possível salvar. Tente novamente.";
}

export function EmprestimosSecao() {
  const [filtro, setFiltro] = useState<FiltroStatus>("");
  const [formAberto, setFormAberto] = useState(false);
  const [editando, setEditando] = useState<Emprestimo | null>(null);
  const [form, setForm] = useState<FormEmprestimo>(FORM_VAZIO());
  const [erro, setErro] = useState("");
  const [confirmacao, setConfirmacao] = useState<Confirmacao | null>(null);

  const { data: lista } = useEmprestimos(filtro ? { status: filtro } : undefined);
  const { data: atrasados } = useEmprestimos({ status: "ATRASADO" });
  const { data: emprestaveis } = useItensEmprestaveis();
  const criar = useCreateEmprestimo();
  const atualizar = useUpdateEmprestimo();
  const excluir = useDeleteEmprestimo();

  const aviso = textoAvisoAtrasados(atrasados?.count ?? 0);
  const itens = emprestaveis ?? [];
  const escolhido = itens.find((i) => String(i.id) === form.doacao);

  const fechar = () => {
    setFormAberto(false);
    setEditando(null);
    setErro("");
    setForm(FORM_VAZIO());
  };

  const abrirNovo = () => {
    fechar();
    setFormAberto(true);
  };

  const abrirEdicao = (e: Emprestimo) => {
    setErro("");
    setForm({
      doacao: String(e.doacao),
      quantidade: String(e.quantidade ?? 1),
      pessoa_nome: e.pessoa_nome,
      emprestado_em: e.emprestado_em ?? dataLocalISO(),
      observacao: e.observacao ?? "",
    });
    setEditando(e);
    setFormAberto(true);
  };

  const opcoes = { onSuccess: fechar, onError: (e: unknown) => setErro(mensagemDeErro(e)) };

  const salvar = (ev: React.FormEvent) => {
    ev.preventDefault();
    setErro("");
    const quantidade = Number(form.quantidade);
    if (!Number.isInteger(quantidade) || quantidade < 1) {
      setErro("A quantidade precisa ser um número inteiro maior que zero.");
      return;
    }
    if (!form.pessoa_nome.trim()) {
      setErro("Informe quem pegou o item emprestado.");
      return;
    }
    const dados = {
      quantidade,
      pessoa_nome: form.pessoa_nome.trim(),
      emprestado_em: form.emprestado_em,
      observacao: form.observacao.trim(),
    };
    if (editando) {
      atualizar.mutate({ id: editando.id, data: dados }, opcoes);
    } else {
      if (!form.doacao) {
        setErro("Escolha o item que foi emprestado.");
        return;
      }
      criar.mutate({ ...dados, doacao: Number(form.doacao) }, opcoes);
    }
  };

  const devolver = (e: Emprestimo) =>
    setConfirmacao({
      titulo: "Marcar como devolvido?",
      texto: `${e.item_rotulo} emprestado para ${e.pessoa_nome} volta a ficar disponível.`,
      rotulo: "Marcar devolução",
      onConfirm: () =>
        atualizar.mutate({ id: e.id, data: { devolvido_em: dataLocalISO() } }),
    });

  const apagar = (e: Emprestimo) =>
    setConfirmacao({
      titulo: "Excluir empréstimo?",
      texto: "O registro some do histórico. Esta ação não pode ser desfeita.",
      rotulo: "Excluir",
      onConfirm: () => excluir.mutate(e.id),
    });

  const emprestimos = lista?.results ?? [];

  return (
    <section aria-labelledby="emprestimos-titulo" className="space-y-4 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 id="emprestimos-titulo" className="text-xl font-extrabold text-verde-escuro">
          Empréstimos de itens
        </h3>
        <Button variante="secundaria" onClick={abrirNovo}>
          <Plus className="size-4 mr-2" />
          Registrar empréstimo
        </Button>
      </div>

      {aviso && (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-xl border border-vermelho/30 bg-vermelho/5 p-4 text-sm text-vermelho"
        >
          <AlertTriangle className="size-5 shrink-0" aria-hidden="true" />
          <p>
            <strong>Atenção:</strong> {aviso}
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por status">
        {FILTROS.map(([valor, rotulo]) => (
          <button
            key={valor}
            type="button"
            aria-pressed={filtro === valor}
            onClick={() => setFiltro(valor)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              filtro === valor
                ? "bg-verde text-white"
                : "bg-mist-100 text-grafite/70 hover:bg-mist-200"
            }`}
          >
            {rotulo}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200/70 bg-white shadow-sm">
        <table className="w-full">
          <thead className="bg-mist-100/70">
            <tr className="text-left text-xs font-bold uppercase tracking-wider text-verde-escuro/70">
              <th className="p-3">Item</th>
              <th className="p-3">Quem pegou</th>
              <th className="p-3">Qtd.</th>
              <th className="p-3">Emprestado em</th>
              <th className="p-3">Devolver até</th>
              <th className="p-3">Status</th>
              <th className="p-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {emprestimos.map((e) => (
              <tr key={e.id} className="border-t border-mist-200 transition-colors hover:bg-mist-50">
                <td className="p-3 font-medium text-grafite">{e.item_rotulo}</td>
                <td className="p-3 text-grafite/70 text-sm">{e.pessoa_nome}</td>
                <td className="p-3 text-grafite/60">{e.quantidade}</td>
                <td className="p-3 text-grafite/60 text-sm">
                  {formatarDataBr(e.emprestado_em)}
                </td>
                <td className="p-3 text-grafite/60 text-sm">
                  {e.devolvido_em
                    ? `Devolvido em ${formatarDataBr(e.devolvido_em)}`
                    : formatarDataBr(e.devolver_ate)}
                </td>
                <td className="p-3">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      CLASSE_STATUS[e.status] ?? ""
                    }`}
                  >
                    {e.status_rotulo}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex gap-2">
                    {!e.devolvido_em && (
                      <Button
                        variante="contorno-claro"
                        aria-label="Marcar devolução"
                        title="Marcar devolução"
                        onClick={() => devolver(e)}
                      >
                        <RotateCcw className="size-4" />
                      </Button>
                    )}
                    <Button
                      variante="contorno-claro"
                      aria-label="Editar empréstimo"
                      onClick={() => abrirEdicao(e)}
                    >
                      <Edit className="size-4" />
                    </Button>
                    <Button
                      variante="contorno-claro"
                      aria-label="Excluir empréstimo"
                      onClick={() => apagar(e)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {emprestimos.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-grafite/50">
                  {filtro
                    ? "Nenhum empréstimo com este status."
                    : "Nenhum empréstimo registrado ainda."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {formAberto && (
        <FormModal
          title={editando ? "Editar empréstimo" : "Registrar empréstimo"}
          largura="max-w-3xl"
          onClose={fechar}
          onSubmit={salvar}
          submitting={criar.isPending || atualizar.isPending}
        >
          {editando ? (
            <p className="lg:col-span-2 rounded-xl bg-mist-50 p-3 text-sm text-grafite/70">
              Item: <strong>{editando.item_rotulo}</strong>
            </p>
          ) : (
            <label className="text-sm text-grafite/70 lg:col-span-2">
              Item doado
              <select
                name="doacao"
                value={form.doacao}
                onChange={(e) => setForm({ ...form, doacao: e.target.value })}
                required
                className={`${CLASSE_CAMPO} mt-1`}
              >
                <option value="">Selecione um item…</option>
                {itens.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.item_rotulo} — doado em {formatarDataBr(i.recebido_em)} por{" "}
                    {i.doador_exibido} ({i.disponivel}{" "}
                    {i.disponivel > 1 ? "disponíveis" : "disponível"})
                  </option>
                ))}
              </select>
              {itens.length === 0 && (
                <span className="mt-1 block text-xs text-grafite/50">
                  Nenhum item disponível. Registre a doação do item primeiro.
                </span>
              )}
            </label>
          )}
          <label className="text-sm text-grafite/70 lg:col-span-2">
            Quem pegou emprestado
            <input
              name="pessoa_nome"
              value={form.pessoa_nome}
              maxLength={150}
              onChange={(e) => setForm({ ...form, pessoa_nome: e.target.value })}
              required
              className={`${CLASSE_CAMPO} mt-1`}
            />
          </label>
          <label className="text-sm text-grafite/70">
            Quantidade
            <input
              type="number"
              min={1}
              max={escolhido?.disponivel}
              step={1}
              name="quantidade"
              value={form.quantidade}
              onChange={(e) => setForm({ ...form, quantidade: e.target.value })}
              required
              className={`${CLASSE_CAMPO} mt-1`}
            />
          </label>
          <label className="text-sm text-grafite/70">
            Emprestado em
            <input
              type="date"
              name="emprestado_em"
              max={dataLocalISO()}
              value={form.emprestado_em}
              onChange={(e) => setForm({ ...form, emprestado_em: e.target.value })}
              required
              className={`${CLASSE_CAMPO} mt-1`}
            />
          </label>
          <label className="text-sm text-grafite/70 lg:col-span-2">
            Observação (opcional)
            <input
              name="observacao"
              placeholder="Ex.: para a mãe, após cirurgia"
              maxLength={255}
              value={form.observacao}
              onChange={(e) => setForm({ ...form, observacao: e.target.value })}
              className={`${CLASSE_CAMPO} mt-1`}
            />
          </label>
          {erro && (
            <p role="alert" className="lg:col-span-2 text-sm text-vermelho">
              {erro}
            </p>
          )}
        </FormModal>
      )}

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
    </section>
  );
}
