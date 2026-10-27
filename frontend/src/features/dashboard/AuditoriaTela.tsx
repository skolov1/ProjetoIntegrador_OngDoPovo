/**
 * Auditoria: quem criou, alterou ou excluiu o quê e quando.
 *
 * Só leitura. Dados pessoais sensíveis (CPF, telefone etc.) aparecem ocultos e
 * o nome de aluno excluído é apagado do histórico (ver apidjango/doacoes/auditoria.py).
 */

import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import type { AuditoriaListAcao } from "@/api/generated/model";
import { Button } from "@/components/ui/Button";
import { useAuditoria, useAuditoriaUsuarios } from "@/features/dashboard/api";
import { CLASSE_CAMPO } from "@/features/dashboard/modais";
import { formatarDataHora, listarMudancas, type Mudanca } from "@/lib/auditoria";

const POR_PAGINA = 20;

const ACOES = [
  ["CRIOU", "Criou"],
  ["ALTEROU", "Alterou"],
  ["EXCLUIU", "Excluiu"],
] as const;

// Valor do filtro = nome do modelo no Django, em minúsculas.
const TIPOS = [
  ["aluno", "Aluno"],
  ["turma", "Turma"],
  ["horarioturma", "Horário da turma"],
  ["atividadeavulsa", "Atividade avulsa"],
  ["professor", "Professor"],
  ["presenca", "Presença"],
  ["consentimento", "Consentimento"],
  ["doacaoitem", "Doação de item"],
  ["emprestimo", "Empréstimo de item"],
] as const;

const CLASSE_ACAO: Record<string, string> = {
  CRIOU: "bg-verde/10 text-verde",
  ALTEROU: "bg-amarelo/10 text-amarelo",
  EXCLUIU: "bg-vermelho/10 text-vermelho",
};

type Filtros = {
  usuario: string;
  acao: string;
  tipo: string;
  de: string;
  ate: string;
};

const SEM_FILTRO: Filtros = { usuario: "", acao: "", tipo: "", de: "", ate: "" };

export function AuditoriaTela() {
  const [filtros, setFiltros] = useState<Filtros>(SEM_FILTRO);
  const [pagina, setPagina] = useState(1);
  const [aberto, setAberto] = useState<number | null>(null);

  const { data: pessoas } = useAuditoriaUsuarios();
  const { data, isLoading, error } = useAuditoria({
    page: pagina,
    ...(filtros.usuario && { usuario: Number(filtros.usuario) }),
    ...(filtros.acao && { acao: filtros.acao as AuditoriaListAcao }),
    ...(filtros.tipo && { tipo: filtros.tipo }),
    ...(filtros.de && { de: filtros.de }),
    ...(filtros.ate && { ate: filtros.ate }),
  });

  const registros = data?.results ?? [];
  const total = data?.count ?? 0;
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const temFiltro = Object.values(filtros).some(Boolean);

  const mudar = (campo: keyof Filtros, valor: string) => {
    setFiltros({ ...filtros, [campo]: valor });
    setPagina(1);
    setAberto(null);
  };

  return (
    <div className="mt-6 space-y-4">
      <div>
        <h3 className="text-xl font-extrabold text-verde-escuro">Auditoria</h3>
        <p className="text-sm text-grafite/60">
          Quem criou, alterou ou excluiu cada registro, e quando.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="text-sm text-grafite/70">
          Quem fez
          <select
            name="usuario"
            value={filtros.usuario}
            onChange={(e) => mudar("usuario", e.target.value)}
            className={`${CLASSE_CAMPO} mt-1`}
          >
            <option value="">Todas as pessoas</option>
            {(pessoas ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-grafite/70">
          Ação
          <select
            name="acao"
            value={filtros.acao}
            onChange={(e) => mudar("acao", e.target.value)}
            className={`${CLASSE_CAMPO} mt-1`}
          >
            <option value="">Todas</option>
            {ACOES.map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-grafite/70">
          O que
          <select
            name="tipo"
            value={filtros.tipo}
            onChange={(e) => mudar("tipo", e.target.value)}
            className={`${CLASSE_CAMPO} mt-1`}
          >
            <option value="">Tudo</option>
            {TIPOS.map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-grafite/70">
          De
          <input
            type="date"
            name="de"
            value={filtros.de}
            onChange={(e) => mudar("de", e.target.value)}
            className={`${CLASSE_CAMPO} mt-1`}
          />
        </label>
        <label className="text-sm text-grafite/70">
          Até
          <input
            type="date"
            name="ate"
            value={filtros.ate}
            onChange={(e) => mudar("ate", e.target.value)}
            className={`${CLASSE_CAMPO} mt-1`}
          />
        </label>
      </div>
      {temFiltro && (
        <button
          type="button"
          onClick={() => {
            setFiltros(SEM_FILTRO);
            setPagina(1);
          }}
          className="text-sm font-semibold text-verde underline underline-offset-4"
        >
          Limpar filtros
        </button>
      )}

      {isLoading && <p>Carregando...</p>}
      {error && <p className="text-vermelho">Erro ao carregar o histórico.</p>}

      <div className="overflow-x-auto rounded-2xl border border-slate-200/70 bg-white shadow-sm">
        <table className="w-full">
          <thead className="bg-mist-100/70">
            <tr className="text-left text-xs font-bold uppercase tracking-wider text-verde-escuro/70">
              <th className="p-3 w-8" />
              <th className="p-3">Data e hora</th>
              <th className="p-3">Quem fez</th>
              <th className="p-3">Ação</th>
              <th className="p-3">O que</th>
              <th className="p-3">Registro</th>
            </tr>
          </thead>
          <tbody>
            {registros.map((r) => {
              const linhas = listarMudancas(r.mudancas as Record<string, Mudanca>);
              const expandivel = linhas.length > 0;
              const expandido = aberto === r.id;
              return (
                <Fragment key={r.id}>
                  <tr className="border-t border-mist-200 transition-colors hover:bg-mist-50">
                    <td className="p-3">
                      {expandivel && (
                        <button
                          type="button"
                          aria-expanded={expandido}
                          aria-label={expandido ? "Esconder detalhes" : "Ver detalhes"}
                          onClick={() => setAberto(expandido ? null : r.id)}
                          className="rounded p-1 hover:bg-mist-100"
                        >
                          {expandido ? (
                            <ChevronDown className="size-4" />
                          ) : (
                            <ChevronRight className="size-4" />
                          )}
                        </button>
                      )}
                    </td>
                    <td className="p-3 text-sm text-grafite/60 whitespace-nowrap">
                      {formatarDataHora(r.quando)}
                    </td>
                    <td className="p-3 font-medium text-grafite">{r.usuario_nome}</td>
                    <td className="p-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          CLASSE_ACAO[r.acao] ?? ""
                        }`}
                      >
                        {r.acao_rotulo}
                      </span>
                    </td>
                    <td className="p-3 text-sm text-grafite/70">{r.tipo}</td>
                    <td className="p-3 text-sm text-grafite/70">{r.objeto}</td>
                  </tr>
                  {expandido && (
                    <tr className="bg-mist-50">
                      <td />
                      <td colSpan={5} className="p-3">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-grafite/60">
                              <th className="py-1 pr-4">Campo</th>
                              <th className="py-1 pr-4">Antes</th>
                              <th className="py-1">Depois</th>
                            </tr>
                          </thead>
                          <tbody>
                            {linhas.map((l) => (
                              <tr key={l.campo} className="border-t border-mist-200 transition-colors hover:bg-mist-50">
                                <td className="py-1 pr-4 font-medium text-grafite">
                                  {l.rotulo}
                                </td>
                                <td className="py-1 pr-4 text-grafite/60">{l.de || "—"}</td>
                                <td className="py-1 text-grafite">{l.para || "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {!isLoading && registros.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-grafite/50">
                  {temFiltro
                    ? "Nenhum registro com esses filtros."
                    : "Ainda não há ações registradas."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-grafite/70">
          <span>
            {total} registro{total > 1 ? "s" : ""} · página {pagina} de {paginas}
          </span>
          <div className="flex gap-2">
            <Button
              variante="contorno-claro"
              disabled={pagina <= 1}
              onClick={() => setPagina(pagina - 1)}
            >
              Anterior
            </Button>
            <Button
              variante="contorno-claro"
              disabled={pagina >= paginas}
              onClick={() => setPagina(pagina + 1)}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
