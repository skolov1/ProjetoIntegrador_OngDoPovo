/**
 * Peças de formulário compartilhadas pelas telas do painel: modal de formulário,
 * popup de confirmação e a classe dos campos.
 */

import { X } from "lucide-react";

import { Button } from "@/components/ui/Button";

export const CLASSE_CAMPO =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-grafite outline-none focus:border-verde focus:ring-4 focus:ring-verde/10";

// Ação que espera confirmação num popup antes de rodar.
export type Confirmacao = {
  titulo: string;
  texto: string;
  rotulo: string;
  onConfirm: () => void;
};

// Modal reutilizável
export function FormModal({
  title,
  onClose,
  onSubmit,
  submitting,
  largura = "max-w-md",
  children,
}: {
  title: string;
  largura?: string;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form
        onSubmit={onSubmit}
        className={`bg-white rounded-3xl p-6 sm:p-8 shadow-2xl w-full ${largura} max-h-[90vh] overflow-y-auto`}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-extrabold text-verde-escuro">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-mist-100 rounded"
          >
            <X className="size-5" />
          </button>
        </div>
        <main className="grid grid-cols-1 lg:grid-cols-2 gap-4">{children}</main>
        <div className="mt-6 flex justify-end gap-3">
          <Button variante="contorno-claro" onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={submitting}>
            {submitting ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </form>
    </div>
  );
}

// Popup de confirmação (no lugar do confirm() do navegador).
export function ConfirmModal({
  titulo,
  texto,
  rotulo,
  onConfirm,
  onClose,
}: Confirmacao & { onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-titulo"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
    >
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl w-full max-w-sm">
        <h3 id="confirm-titulo" className="text-lg font-bold text-verde-escuro">
          {titulo}
        </h3>
        <p className="mt-2 text-sm text-grafite/70">{texto}</p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variante="contorno-claro" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={onConfirm}>{rotulo}</Button>
        </div>
      </div>
    </div>
  );
}
