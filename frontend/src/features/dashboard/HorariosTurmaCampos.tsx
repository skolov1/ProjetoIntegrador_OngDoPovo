/**
 * Editor de "dias e horários" do formulário da turma.
 *
 * Uma turma pode acontecer em mais de um dia da semana. Cada linha é um dia com seu
 * horário de início e fim; "Adicionar dia" repete o horário da última linha no
 * próximo dia livre (o caso comum é a mesma aula em vários dias).
 */

import { Plus, Trash2 } from "lucide-react";

import type { DiaSemanaEnum } from "@/api/generated/model";
import { Button } from "@/components/ui/Button";
import { CLASSE_CAMPO } from "@/features/dashboard/modais";
import { BotaoIcone } from "@/features/dashboard/pecas";
import {
  DIAS_DA_SEMANA,
  novoHorarioDepoisDe,
  type HorarioForm,
} from "@/lib/horarios";

export function HorariosTurmaCampos({
  horarios,
  onChange,
}: {
  horarios: HorarioForm[];
  onChange: (horarios: HorarioForm[]) => void;
}) {
  const alterar = (indice: number, parcial: Partial<HorarioForm>) =>
    onChange(horarios.map((h, i) => (i === indice ? { ...h, ...parcial } : h)));

  return (
    <fieldset className="lg:col-span-2 rounded-2xl border border-slate-200 p-4">
      <legend className="px-2 text-sm font-bold text-verde-escuro">
        Dias e horários
      </legend>

      <ul className="space-y-3">
        {horarios.map((h, indice) => (
          <li
            key={indice}
            className="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-3"
          >
            <label className="text-sm text-grafite/70">
              Dia
              <select
                value={h.dia_semana}
                onChange={(e) =>
                  alterar(indice, { dia_semana: e.target.value as DiaSemanaEnum })
                }
                className={`${CLASSE_CAMPO} mt-1`}
              >
                {DIAS_DA_SEMANA.map(([codigo, rotulo]) => (
                  <option key={codigo} value={codigo}>
                    {rotulo}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-grafite/70">
              Início
              <input
                type="time"
                value={h.horario_inicio}
                onChange={(e) => alterar(indice, { horario_inicio: e.target.value })}
                required
                className={`${CLASSE_CAMPO} mt-1`}
              />
            </label>
            <label className="text-sm text-grafite/70">
              Fim
              <input
                type="time"
                value={h.horario_fim}
                onChange={(e) => alterar(indice, { horario_fim: e.target.value })}
                required
                className={`${CLASSE_CAMPO} mt-1`}
              />
            </label>
            <div className="pb-1.5">
              {horarios.length > 1 && (
                <BotaoIcone
                  icone={Trash2}
                  rotulo={`Remover o horário ${indice + 1}`}
                  perigo
                  onClick={() => onChange(horarios.filter((_, i) => i !== indice))}
                />
              )}
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-4">
        <Button
          type="button"
          variante="contorno-claro"
          tamanho="md"
          onClick={() => onChange([...horarios, novoHorarioDepoisDe(horarios)])}
        >
          <Plus className="size-4 mr-2" />
          Adicionar dia
        </Button>
      </div>
    </fieldset>
  );
}
