/**
 * Grade da semana: o que aparece para os visitantes do site.
 *
 * As turmas entram sozinhas quando marcadas como "Mostrar na grade" no cadastro da
 * turma. Aqui ficam as atividades avulsas (evento ou serviço que não é turma, como o
 * atendimento oftalmológico) e uma prévia de como a grade está hoje no site.
 */

import { useState } from "react";
import { Edit, Eye, EyeOff, Plus, Trash2 } from "lucide-react";

import type { AtividadeAvulsa } from "@/api/generated/model";
import { Button } from "@/components/ui/Button";
import {
  useAtividadesAvulsas,
  useCreateAtividadeAvulsa,
  useDeleteAtividadeAvulsa,
  useGradePublica,
  useUpdateAtividadeAvulsa,
} from "@/features/dashboard/api";
import {
  CLASSE_CAMPO,
  ConfirmModal,
  FormModal,
  type Confirmacao,
} from "@/features/dashboard/modais";
import { BotaoIcone, SeloAtivo } from "@/features/dashboard/pecas";
import { mensagemDeErroDaApi } from "@/lib/erros";
import { estiloDoStatus } from "@/lib/grade";
import {
  DIAS_DA_SEMANA,
  validarAtividadeAvulsa,
  type AtividadeForm,
} from "@/lib/horarios";

const FORM_VAZIO = (): AtividadeForm => ({
  nome: "",
  dia_semana: "",
  horario_inicio: "",
  horario_fim: "",
  horario_texto: "",
  status: "ATIVO",
  visivel_na_grade: true,
});

export function GradeTela() {
  const [formAberto, setFormAberto] = useState(false);
  const [editando, setEditando] = useState<AtividadeAvulsa | null>(null);
  const [form, setForm] = useState<AtividadeForm>(FORM_VAZIO());
  const [erro, setErro] = useState("");
  const [confirmacao, setConfirmacao] = useState<Confirmacao | null>(null);

  const { data: lista, isLoading } = useAtividadesAvulsas({ page_size: 100 });
  const { data: grade } = useGradePublica();
  const criar = useCreateAtividadeAvulsa();
  const atualizar = useUpdateAtividadeAvulsa();
  const excluir = useDeleteAtividadeAvulsa();

  const atividades = lista?.results ?? [];

  const fechar = () => {
    setFormAberto(false);
    setEditando(null);
    setErro("");
    setForm(FORM_VAZIO());
  };

  const abrirEdicao = (a: AtividadeAvulsa) => {
    setErro("");
    setForm({
      nome: a.nome,
      dia_semana: a.dia_semana ?? "",
      horario_inicio: (a.horario_inicio ?? "").slice(0, 5),
      horario_fim: (a.horario_fim ?? "").slice(0, 5),
      horario_texto: a.horario_texto ?? "",
      status: a.status === "AGENDADO" ? "AGENDADO" : "ATIVO",
      visivel_na_grade: a.visivel_na_grade ?? true,
    });
    setEditando(a);
    setFormAberto(true);
  };

  const salvar = (ev: React.FormEvent) => {
    ev.preventDefault();
    const problema = validarAtividadeAvulsa(form);
    if (problema) {
      setErro(problema);
      return;
    }
    setErro("");
    const dados = {
      nome: form.nome.trim(),
      dia_semana: form.dia_semana,
      // Hora vazia vira nulo: a API não aceita texto vazio num campo de hora.
      horario_inicio: form.horario_inicio || null,
      horario_fim: form.horario_fim || null,
      horario_texto: form.horario_texto.trim(),
      status: form.status,
      visivel_na_grade: form.visivel_na_grade,
    };
    const opcoes = { onSuccess: fechar, onError: (e: unknown) => setErro(mensagemDeErroDaApi(e)) };
    if (editando) atualizar.mutate({ id: editando.id, data: dados }, opcoes);
    else criar.mutate(dados, opcoes);
  };

  const alternarVisibilidade = (a: AtividadeAvulsa) =>
    atualizar.mutate({ id: a.id, data: { visivel_na_grade: !a.visivel_na_grade } });

  return (
    <div className="mt-6 space-y-10">
      <section aria-labelledby="avulsas-titulo" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 id="avulsas-titulo" className="text-xl font-extrabold text-verde-escuro">
              Atividades avulsas
            </h3>
            <p className="text-sm text-grafite/60">
              Eventos e serviços que não são turma. As turmas entram na grade quando
              marcadas como &quot;Mostrar na grade&quot; no cadastro delas.
            </p>
          </div>
          <Button variante="secundaria" onClick={() => { fechar(); setFormAberto(true); }}>
            <Plus className="size-4 mr-2" />
            Nova atividade
          </Button>
        </div>

        {isLoading && <p>Carregando...</p>}
        {!isLoading && atividades.length === 0 && (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-grafite/60">
            Nenhuma atividade avulsa cadastrada. Use Nova atividade para começar.
          </p>
        )}

        {atividades.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-slate-200/70 bg-white shadow-sm">
            <table className="w-full">
              <thead className="bg-mist-100/70">
                <tr className="text-left text-xs font-bold uppercase tracking-wider text-verde-escuro/70">
                  <th className="p-3">Atividade</th>
                  <th className="p-3">Dia</th>
                  <th className="p-3">Horário</th>
                  <th className="p-3">Situação</th>
                  <th className="p-3">No site</th>
                  <th className="p-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {atividades.map((a) => (
                  <tr
                    key={a.id}
                    className={`border-t border-mist-200 transition-colors hover:bg-mist-50 ${
                      a.visivel_na_grade ? "" : "opacity-70"
                    }`}
                  >
                    <td className="p-3 font-medium text-grafite">{a.nome}</td>
                    <td className="p-3 text-sm text-grafite/70">
                      {DIAS_DA_SEMANA.find(([c]) => c === a.dia_semana)?.[1] ?? "A combinar"}
                    </td>
                    <td className="p-3 text-sm text-grafite/70">{a.horario_exibido}</td>
                    <td className="p-3 text-sm text-grafite/70">
                      {a.status === "AGENDADO" ? "Agendado" : "Ativo"}
                    </td>
                    <td className="p-3">
                      <SeloAtivo
                        ativo={a.visivel_na_grade ?? true}
                        rotuloAtivo="Visível"
                        rotuloInativo="Oculta"
                      />
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <BotaoIcone
                          icone={Edit}
                          rotulo={`Editar ${a.nome}`}
                          onClick={() => abrirEdicao(a)}
                        />
                        <BotaoIcone
                          icone={a.visivel_na_grade ? EyeOff : Eye}
                          rotulo={`${a.visivel_na_grade ? "Ocultar do site" : "Mostrar no site"}: ${a.nome}`}
                          onClick={() => alternarVisibilidade(a)}
                        />
                        <BotaoIcone
                          icone={Trash2}
                          rotulo={`Excluir ${a.nome}`}
                          perigo
                          onClick={() =>
                            setConfirmacao({
                              titulo: "Excluir atividade?",
                              texto: `${a.nome} sai da grade e do cadastro. Para só tirar do site por um tempo, use Ocultar.`,
                              rotulo: "Excluir",
                              perigo: true,
                              onConfirm: () => excluir.mutate(a.id),
                            })
                          }
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="previa-titulo" className="space-y-4">
        <div>
          <h3 id="previa-titulo" className="text-xl font-extrabold text-verde-escuro">
            Como está no site agora
          </h3>
          <p className="text-sm text-grafite/60">
            É a grade que os visitantes veem: turmas marcadas para aparecer e atividades
            visíveis, de segunda a domingo.
          </p>
        </div>
        {grade && grade.length === 0 && (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-grafite/60">
            A grade do site está vazia. Marque turmas como &quot;Mostrar na grade&quot; ou
            cadastre uma atividade avulsa.
          </p>
        )}
        {grade && grade.length > 0 && (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm">
            {grade.map((item) => (
              <li
                key={item.chave}
                className="grid grid-cols-[6rem_1fr_auto_auto] items-center gap-x-4 px-5 py-3"
              >
                <span className="text-xs font-bold uppercase tracking-wider text-verde">
                  {item.dia_rotulo}
                </span>
                <span className="font-semibold text-verde-escuro">{item.nome}</span>
                <span className="text-sm text-grafite/70">{item.horario}</span>
                <span
                  className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${estiloDoStatus(
                    item.status,
                  )}`}
                >
                  {item.status_rotulo}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {formAberto && (
        <FormModal
          title={editando ? "Editar atividade" : "Nova atividade"}
          largura="max-w-2xl"
          onClose={fechar}
          onSubmit={salvar}
          submitting={criar.isPending || atualizar.isPending}
        >
          <label className="text-sm text-grafite/70 lg:col-span-2">
            Nome na grade
            <input
              name="nome"
              maxLength={120}
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              required
              className={`${CLASSE_CAMPO} mt-1`}
            />
          </label>
          <label className="text-sm text-grafite/70">
            Dia da semana
            <select
              name="dia_semana"
              value={form.dia_semana}
              onChange={(e) =>
                setForm({ ...form, dia_semana: e.target.value as AtividadeForm["dia_semana"] })
              }
              className={`${CLASSE_CAMPO} mt-1`}
            >
              <option value="">A combinar</option>
              {DIAS_DA_SEMANA.map(([codigo, rotulo]) => (
                <option key={codigo} value={codigo}>
                  {rotulo}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-grafite/70">
            Situação
            <select
              name="status"
              value={form.status}
              onChange={(e) =>
                setForm({ ...form, status: e.target.value as AtividadeForm["status"] })
              }
              className={`${CLASSE_CAMPO} mt-1`}
            >
              <option value="ATIVO">Ativo</option>
              <option value="AGENDADO">Agendado</option>
            </select>
          </label>
          <label className="text-sm text-grafite/70">
            Início (opcional)
            <input
              type="time"
              name="horario_inicio"
              value={form.horario_inicio}
              onChange={(e) => setForm({ ...form, horario_inicio: e.target.value })}
              className={`${CLASSE_CAMPO} mt-1`}
            />
          </label>
          <label className="text-sm text-grafite/70">
            Fim (opcional)
            <input
              type="time"
              name="horario_fim"
              value={form.horario_fim}
              onChange={(e) => setForm({ ...form, horario_fim: e.target.value })}
              className={`${CLASSE_CAMPO} mt-1`}
            />
          </label>
          <label className="text-sm text-grafite/70 lg:col-span-2">
            Texto do horário (quando não há faixa)
            <input
              name="horario_texto"
              maxLength={60}
              placeholder="Ex.: Sob agendamento"
              value={form.horario_texto}
              onChange={(e) => setForm({ ...form, horario_texto: e.target.value })}
              className={`${CLASSE_CAMPO} mt-1`}
            />
          </label>
          <label className="flex items-center gap-2 text-sm lg:col-span-2">
            <input
              type="checkbox"
              checked={form.visivel_na_grade}
              onChange={(e) => setForm({ ...form, visivel_na_grade: e.target.checked })}
            />{" "}
            Mostrar na grade do site
          </label>
          {erro && (
            <p role="alert" className="lg:col-span-2 text-sm text-vermelho">
              {erro}
            </p>
          )}
        </FormModal>
      )}

      {confirmacao && (
        <ConfirmModal
          {...confirmacao}
          onClose={() => setConfirmacao(null)}
          onConfirm={() => {
            confirmacao.onConfirm();
            setConfirmacao(null);
          }}
        />
      )}
    </div>
  );
}
