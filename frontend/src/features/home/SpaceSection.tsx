/**
 * Nosso Espaço — endereço, horários e a grade da agenda da semana.
 * A referência mostra a tabela de horários ao lado do bloco de endereço.
 */
import { Clock3, MapPin } from "lucide-react";

import {
  Eyebrow,
  Section,
  SectionLead,
  SectionTitle,
} from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";
import { AGENDA, ONG } from "@/features/home/data";

const ESTILOS_STATUS: Record<string, string> = {
  Ativo: "bg-verde/10 text-verde",
  Aberto: "bg-amarelo/20 text-[#8a6100]",
  Agendado: "bg-azul/10 text-azul",
};

export function SpaceSection() {
  return (
    <Section id="espaco" tom="claro">
      <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        {/* Endereço */}
        <Reveal>
          <Eyebrow>Nosso espaço</Eyebrow>
          <SectionTitle>Nossas portas estão sempre abertas</SectionTitle>
          <SectionLead>
            estabelecido na comunidade de Caieiras, somos um espaço de
            convivência onde toda a família é bem-vinda.
          </SectionLead>

          <dl className="mt-8 space-y-4">
            <div className="flex gap-4 rounded-2xl bg-mist-50 p-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-verde">
                <MapPin className="size-5" aria-hidden="true" />
              </span>
              <div>
                <dt className="font-extrabold text-verde-escuro">Endereço</dt>
                <dd className="mt-0.5 text-sm text-grafite/70">
                  {ONG.endereco}
                </dd>
              </div>
            </div>
            <div className="flex gap-4 rounded-2xl bg-mist-50 p-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-verde">
                <Clock3 className="size-5" aria-hidden="true" />
              </span>
              <div>
                <dt className="font-extrabold text-verde-escuro">
                  Atendimento
                </dt>
                <dd className="mt-0.5 text-sm text-grafite/70">
                  Segunda a sábado, das 9h às 20h
                </dd>
              </div>
            </div>
          </dl>

          <a
            href={ONG.linkMaps}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-verde underline-offset-4 hover:underline"
          >
            Ver endereço completo no mapa →
          </a>
        </Reveal>

        {/* Agenda */}
        <Reveal delay={140}>
          <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 bg-mist-50 px-5 py-4 sm:px-6">
              <div>
                <h3 className="font-extrabold text-verde-escuro">
                  Grade da semana
                </h3>
                <p className="text-sm text-grafite/60">
                  Programação regular da sede
                </p>
              </div>
              <span className="hidden rounded-full bg-verde px-3 py-1 text-xs font-bold uppercase tracking-wider text-white sm:inline">
                R$ 20 por modalidade
              </span>
            </div>

            <ul className="divide-y divide-slate-100">
              {AGENDA.map((item) => (
                <li
                  key={item.dia + item.atividade}
                  className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 px-5 py-4 transition-colors hover:bg-mist-50 sm:px-6 lg:grid-cols-[5.5rem_1fr_4rem_auto]"
                >
                  <span className="text-xs font-bold uppercase tracking-wider text-verde">
                    {item.dia}
                  </span>
                  <div>
                    <p className="font-bold text-verde-escuro">
                      {item.atividade}
                    </p>
                    <p className="mt-0.5 text-sm text-grafite/60">
                      {item.horario}
                    </p>
                  </div>
                  <span className="hidden text-sm text-grafite/60 lg:block">
                    {item.local}
                  </span>
                  <span
                    className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${
                      ESTILOS_STATUS[item.status] ?? ESTILOS_STATUS.Ativo
                    }`}
                  >
                    {item.status}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
