/**
 * "Instalar app" (PWA): o Chrome/Edge avisam quando o site pode ser instalado
 * (`beforeinstallprompt`). Guardamos o aviso para abrir o convite só quando a pessoa
 * clicar no link do rodapé. Sem o aviso (iPhone, site já instalado, navegador sem
 * suporte), o link não aparece.
 *
 * O ouvinte fica no módulo, e não no componente, porque o navegador pode disparar o
 * evento antes de o rodapé montar.
 */

import { useSyncExternalStore } from "react";

interface EventoInstalar extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let evento: EventoInstalar | null = null;
const ouvintes = new Set<() => void>();
const avisar = () => ouvintes.forEach((o) => o());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    evento = e as EventoInstalar;
    avisar();
  });
  window.addEventListener("appinstalled", () => {
    evento = null;
    avisar();
  });
}

const assinar = (ouvinte: () => void) => {
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
};

export function useInstalarApp() {
  const podeInstalar = useSyncExternalStore(
    assinar,
    () => evento !== null,
    () => false,
  );

  const instalar = async () => {
    if (!evento) return;
    const convite = evento;
    // O aviso só vale uma vez: depois de abrir o convite, o link some até o navegador oferecer de novo.
    evento = null;
    avisar();
    await convite.prompt();
    await convite.userChoice;
  };

  return { podeInstalar, instalar };
}
