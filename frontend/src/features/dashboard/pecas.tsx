/**
 * Peças pequenas compartilhadas pelas telas de cadastro do painel: botão de ícone,
 * selo ativo/inativo, barra de busca com filtro e paginação.
 */

import type { LucideIcon } from "lucide-react";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { CLASSE_CAMPO } from "@/features/dashboard/modais";
import { POR_PAGINA, totalDePaginas } from "@/lib/cadastros";

/** Botão redondo só com ícone. O `rotulo` vira o nome acessível e a dica ao passar o mouse. */
export function BotaoIcone({
  icone: Icone,
  rotulo,
  onClick,
  perigo = false,
}: {
  icone: LucideIcon;
  rotulo: string;
  onClick: () => void;
  perigo?: boolean;
}) {
  const cores = perigo
    ? "border-vermelho/40 text-vermelho hover:border-vermelho hover:bg-vermelho hover:text-white"
    : "border-verde text-verde hover:bg-verde hover:text-white";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={rotulo}
      title={rotulo}
      className={`grid size-9 shrink-0 place-items-center rounded-full border-2 transition-colors ${cores}`}
    >
      <Icone className="size-4" aria-hidden="true" />
    </button>
  );
}

export function SeloAtivo({
  ativo,
  rotuloAtivo,
  rotuloInativo,
}: {
  ativo: boolean;
  rotuloAtivo: string;
  rotuloInativo: string;
}) {
  return (
    <span
      className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
        ativo ? "bg-verde/10 text-verde" : "bg-vermelho/10 text-vermelho"
      }`}
    >
      {ativo ? rotuloAtivo : rotuloInativo}
    </span>
  );
}

export type FiltroAtivo = "" | "ativos" | "inativos";

/** Busca por nome (com lupa) e filtro Todos / Ativos / Inativos. */
export function BarraDeFiltros({
  busca,
  onBusca,
  filtro,
  onFiltro,
  placeholder,
  rotulos = ["Todos", "Ativos", "Inativos"],
}: {
  busca: string;
  onBusca: (valor: string) => void;
  filtro: FiltroAtivo;
  onFiltro: (valor: FiltroAtivo) => void;
  placeholder: string;
  rotulos?: [string, string, string];
}) {
  const opcoes: [FiltroAtivo, string][] = [
    ["", rotulos[0]],
    ["ativos", rotulos[1]],
    ["inativos", rotulos[2]],
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
      <div className="relative w-full max-w-xs">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-grafite/40"
        />
        <input
          type="search"
          name="busca"
          aria-label={placeholder}
          placeholder={placeholder}
          value={busca}
          onChange={(e) => onBusca(e.target.value)}
          className={`${CLASSE_CAMPO} pl-11`}
        />
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por situação">
        {opcoes.map(([valor, rotulo]) => (
          <button
            key={valor}
            type="button"
            aria-pressed={filtro === valor}
            onClick={() => onFiltro(valor)}
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
    </div>
  );
}

/** Rodapé de lista paginada: quantos registros, página atual e Anterior / Próxima. */
export function Paginacao({
  pagina,
  total,
  onMudar,
  porPagina = POR_PAGINA,
}: {
  pagina: number;
  total: number;
  onMudar: (pagina: number) => void;
  porPagina?: number;
}) {
  if (total === 0) return null;
  const paginas = totalDePaginas(total, porPagina);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-grafite/70">
      <span>
        {total} registro{total > 1 ? "s" : ""} · página {pagina} de {paginas}
      </span>
      {paginas > 1 && (
        <div className="flex gap-2">
          <Button
            variante="contorno-claro"
            tamanho="md"
            disabled={pagina <= 1}
            onClick={() => onMudar(pagina - 1)}
          >
            Anterior
          </Button>
          <Button
            variante="contorno-claro"
            tamanho="md"
            disabled={pagina >= paginas}
            onClick={() => onMudar(pagina + 1)}
          >
            Próxima
          </Button>
        </div>
      )}
    </div>
  );
}
