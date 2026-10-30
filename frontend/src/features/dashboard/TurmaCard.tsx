/**
 * Card de uma turma: nome, situação, horário, quantos alunos e as ações.
 * Excluir fica em vermelho e separado da ação segura (Inativar), porque excluir
 * apaga também as presenças da turma. Turma em andamento sem professor ativo ganha
 * borda âmbar e a linha "Sem professor", para a secretaria achar logo o que falta.
 */

import { CircleAlert, Clock, Edit, Globe, Power, Trash2, Users } from "lucide-react";

import type { TurmaList } from "@/api/generated/model";
import { BotaoIcone, SeloAtivo } from "@/features/dashboard/pecas";
import { rotuloAlunos } from "@/lib/cadastros";

export function TurmaCard({
  turma,
  onEditar,
  onAlternarAtivo,
  onExcluir,
}: {
  turma: TurmaList;
  onEditar: () => void;
  onAlternarAtivo: () => void;
  onExcluir: () => void;
}) {
  const ativa = turma.ativo !== false;
  const fundo = !ativa
    ? "border-slate-200/70 bg-mist-50 opacity-80"
    : turma.sem_professor
      ? "border-amber-300 bg-amber-50/60"
      : "border-slate-200/70 bg-white";
  return (
    <article className={`flex flex-col rounded-2xl border p-4 shadow-sm ${fundo}`}>
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-base font-extrabold leading-tight text-verde-escuro">{turma.nome}</h4>
        <SeloAtivo ativo={ativa} rotuloAtivo="Ativa" rotuloInativo="Inativa" />
      </div>

      {turma.sem_professor && (
        <p className="mt-3 flex items-center gap-2 text-sm font-bold text-amber-800">
          <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
          Sem professor
        </p>
      )}

      <p className={`${turma.sem_professor ? "mt-1.5" : "mt-3"} flex items-center gap-2 text-sm text-grafite/80`}>
        <Clock className="size-4 shrink-0 text-verde" aria-hidden="true" />
        {turma.horario_formatado}
      </p>
      <p className="mt-1.5 flex items-center gap-2 text-sm text-grafite/80">
        <Users className="size-4 shrink-0 text-verde" aria-hidden="true" />
        {rotuloAlunos(turma.total_alunos)}
      </p>
      <p className="mt-1.5 flex items-center gap-2 text-sm text-grafite/80">
        <Globe className="size-4 shrink-0 text-verde" aria-hidden="true" />
        {turma.visivel_na_grade ? "Aparece na grade do site" : "Só interna (fora do site)"}
      </p>

      <div className="mt-4 flex items-center gap-2 border-t border-mist-200 pt-3">
        <BotaoIcone icone={Edit} rotulo={`Editar ${turma.nome}`} onClick={onEditar} />
        <BotaoIcone
          icone={Power}
          rotulo={`${ativa ? "Inativar" : "Reativar"} ${turma.nome}`}
          onClick={onAlternarAtivo}
        />
        <span className="ml-auto">
          <BotaoIcone
            icone={Trash2}
            rotulo={`Excluir ${turma.nome}`}
            onClick={onExcluir}
            perigo
          />
        </span>
      </div>
    </article>
  );
}
