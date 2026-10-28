/**
 * Bloco "Eventos e serviços", logo abaixo da grade da semana. Não são turmas (sem
 * alunos nem chamada): o visitante vê o que é, quando acontece e como participar,
 * por um botão de WhatsApp com a mensagem pronta. Sem nenhum item, o bloco não aparece.
 */
import { MessageCircle } from "lucide-react";

import { Reveal } from "@/components/ui/Reveal";
import { useEventosServicos } from "@/features/home/useEventosServicos";
import { estiloDoStatus } from "@/lib/grade";
import { linkWhatsapp, mensagemParticipar } from "@/lib/whatsapp";

export function EventosServicos() {
  const { data: itens } = useEventosServicos();

  if (!itens || itens.length === 0) return null;

  return (
    <Reveal delay={100}>
      <div className="mt-12 overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-mist-50 px-5 py-4 sm:px-6">
          <h3 className="font-extrabold text-verde-escuro">Eventos e serviços</h3>
          <p className="text-sm text-grafite/60">
            Atendimentos, campanhas e encontros que acontecem na sede
          </p>
        </div>
        <ul className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3">
          {itens.map((item) => (
            <li
              key={item.chave}
              className="flex flex-col gap-3 rounded-xl border border-slate-200/70 p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-verde">
                  {item.tipo_rotulo}
                </span>
                <span
                  className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${estiloDoStatus(
                    item.status,
                  )}`}
                >
                  {item.status_rotulo}
                </span>
              </div>
              <div className="flex-1">
                <p className="font-bold text-verde-escuro">{item.nome}</p>
                <p className="mt-0.5 text-sm text-grafite/60">
                  {item.quando}
                  {item.horario ? ` · ${item.horario}` : ""}
                </p>
              </div>
              <a
                href={linkWhatsapp(mensagemParticipar(item))}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex w-fit items-center gap-2 text-sm font-bold text-verde underline-offset-4 hover:underline"
              >
                <MessageCircle className="size-4" aria-hidden="true" />
                Como participar
              </a>
            </li>
          ))}
        </ul>
      </div>
    </Reveal>
  );
}
