/**
 * Cartão da pessoa logada, no canto inferior da barra lateral: nome completo,
 * tipo de conta e o botão Sair.
 */

import { LogOut } from "lucide-react";

import { useUsuarioLogado } from "@/features/dashboard/api";
import { encerrarSessao } from "@/lib/api";
import { iniciais } from "@/lib/auditoria";

export function UsuarioLogado() {
  const { data: usuario, isLoading } = useUsuarioLogado();
  const nome = usuario?.name ?? "";

  return (
    <div className="relative mt-auto border-t border-white/10 bg-black/10 p-4">
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="grid size-10 shrink-0 place-items-center rounded-full bg-verde text-sm font-bold text-white shadow-lg shadow-verde/25"
        >
          {isLoading ? "…" : iniciais(nome)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-white" title={nome}>
            {isLoading ? "Carregando..." : nome || "Usuário"}
          </p>
          <p className="truncate text-xs text-white/60">
            {usuario?.tipo_conta ?? ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void encerrarSessao()}
          className="rounded-md p-2 transition-colors hover:bg-white/10"
          aria-label="Sair"
          title="Sair"
        >
          <LogOut className="size-4 text-white" />
        </button>
      </div>
    </div>
  );
}
