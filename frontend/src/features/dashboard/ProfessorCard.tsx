/**
 * Card de um professor: nome, situação, CPF mascarado, turmas e quantos alunos.
 * O CPF completo só aparece ao abrir a edição.
 */

import { Edit, IdCard, Power, Trash2, Users } from "lucide-react";

import type { ProfessorList } from "@/api/generated/model";
import { BotaoIcone, SeloAtivo } from "@/features/dashboard/pecas";
import { rotuloAlunos } from "@/lib/cadastros";

export function ProfessorCard({
  professor,
  onEditar,
  onAlternarAtivo,
  onExcluir,
}: {
  professor: ProfessorList;
  onEditar: () => void;
  onAlternarAtivo: () => void;
  onExcluir: () => void;
}) {
  const ativo = professor.ativo !== false;
  return (
    <article
      className={`flex flex-col rounded-2xl border border-slate-200/70 p-4 shadow-sm ${
        ativo ? "bg-white" : "bg-mist-50 opacity-80"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-base font-extrabold leading-tight text-verde-escuro">
          {professor.nome}
        </h4>
        <SeloAtivo ativo={ativo} rotuloAtivo="Ativo" rotuloInativo="Inativo" />
      </div>

      <p className="mt-3 flex items-center gap-2 text-sm text-grafite/80">
        <IdCard className="size-4 shrink-0 text-verde" aria-hidden="true" />
        {professor.cpf_mascarado}
      </p>
      <p className="mt-1.5 flex items-center gap-2 text-sm text-grafite/80">
        <Users className="size-4 shrink-0 text-verde" aria-hidden="true" />
        {rotuloAlunos(professor.total_alunos)}
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {professor.turmas_nomes.length === 0 ? (
          <span className="text-xs text-grafite/60">Sem turmas</span>
        ) : (
          professor.turmas_nomes.map((nome) => (
            <span
              key={nome}
              className="rounded-full bg-mist-100 px-2.5 py-0.5 text-xs font-semibold text-verde-escuro"
            >
              {nome}
            </span>
          ))
        )}
      </div>

      <div className="mt-4 flex items-center gap-2 border-t border-mist-200 pt-3">
        <BotaoIcone icone={Edit} rotulo={`Editar ${professor.nome}`} onClick={onEditar} />
        <BotaoIcone
          icone={Power}
          rotulo={`${ativo ? "Inativar" : "Reativar"} ${professor.nome}`}
          onClick={onAlternarAtivo}
        />
        <span className="ml-auto">
          <BotaoIcone
            icone={Trash2}
            rotulo={`Excluir ${professor.nome}`}
            onClick={onExcluir}
            perigo
          />
        </span>
      </div>
    </article>
  );
}
