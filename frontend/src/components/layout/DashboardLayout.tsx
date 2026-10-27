/**
 * Layout da Dashboard de administração — CONECTADO À API REAL.
 *
 * Estrutura fixa: sidebar + conteúdo principal.
 * Usa TanStack Query para consumir a API Django (via Orval).
 * Todas as operações CRUD funcionam via hooks em src/features/dashboard/api.ts
 */

import { useState } from "react";
import {
  Shield,
  Users,
  Clipboard,
  MessageCircle,
  History,
  Plus,
  Edit,
  Trash2,
  UserCheck,
  UserX,
  type LucideIcon,
} from "lucide-react";

// import types only (Section removed from usage)
import { Button } from "@/components/ui/Button";
import {
  useTurmas,
  useCreateTurma,
  useUpdateTurma,
  useDeleteTurma,
  useAlunos,
  useCreateAluno,
  useUpdateAluno,
  useDeleteAluno,
  useAlterarAtivoAluno,
  useProfessores,
  useCreateProfessor,
  useUpdateProfessor,
  useDeleteProfessor,
  useDoacoesItens,
  useDoacoesItensResumo,
  useCreateDoacaoItem,
  useUpdateDoacaoItem,
  useDeleteDoacaoItem,
} from "@/features/dashboard/api";
import { PresencasTela } from "@/features/dashboard/PresencasTela";
import { AuditoriaTela } from "@/features/dashboard/AuditoriaTela";
import { UsuarioLogado } from "@/features/dashboard/UsuarioLogado";
import { Sunburst } from "@/components/ui/Sunburst";
import { EmprestimosSecao } from "@/features/dashboard/EmprestimosSecao";
import {
  CLASSE_CAMPO,
  ConfirmModal,
  FormModal,
  type Confirmacao,
} from "@/features/dashboard/modais";
import { alunosRetrieve } from "@/api/generated/alunos/alunos";
import { professoresRetrieve } from "@/api/generated/professores/professores";
import { turmasRetrieve } from "@/api/generated/turmas/turmas";
import type {
  ComprovanteResidenciaEnum,
  DiaSemanaEnum,
  ExameAptidaoEnum,
  ItemEnum,
  SexoEnum,
  TituloEleitorEnum,
} from "@/api/generated/model";
import {
  MENSALIDADE_POR_TURMA,
  calcularMensalidade,
  cpfValido,
  ehMenor,
  valorMensalidade,
  soDigitos,
  telefoneValido,
} from "@/lib/aluno";
// import types removed as they're not directly used

type Screen =
  | "presenca"
  | "alunos"
  | "doacoes"
  | "turmas"
  | "professores"
  | "auditoria";
type TipoCadastro = "turma" | "aluno" | "professor";

const ITENS_MENU: { id: Screen; label: string; Icon: LucideIcon }[] = [
  { id: "presenca", label: "Presenças", Icon: Users },
  { id: "alunos", label: "Alunos", Icon: Shield },
  { id: "turmas", label: "Turmas", Icon: Clipboard },
  { id: "professores", label: "Professores", Icon: MessageCircle },
  { id: "doacoes", label: "Doações", Icon: Clipboard },
  { id: "auditoria", label: "Auditoria", Icon: History },
];

type FormTurma = {
  nome: string;
  dia_semana: DiaSemanaEnum;
  horario_inicio: string;
  horario_fim: string;
  data_inicio: string;
  data_fim: string;
  ativo: boolean;
};
type FormAluno = {
  nome: string;
  cpf: string;
  rg: string;
  data_nascimento: string;
  sexo: SexoEnum;
  comprovante_residencia: ComprovanteResidenciaEnum;
  titulo_eleitor: TituloEleitorEnum;
  nome_responsavel: string;
  cpf_responsavel: string;
  rg_responsavel: string;
  telefone_responsavel: string;
  endereco_responsavel: string;
  exame_aptidao: ExameAptidaoEnum;
  exame_validade: string;
  consentimento_responsavel: boolean;
  turmas: number[];
  // Vazio = usa o cálculo (R$ 20 por turma).
  mensalidade_personalizada: string;
  ativo: boolean;
};

const ALUNO_VAZIO: FormAluno = {
  nome: "",
  cpf: "",
  rg: "",
  data_nascimento: "",
  sexo: "N",
  comprovante_residencia: "pendente",
  titulo_eleitor: "pendente",
  nome_responsavel: "",
  cpf_responsavel: "",
  rg_responsavel: "",
  telefone_responsavel: "",
  endereco_responsavel: "",
  exame_aptidao: "pendente",
  exame_validade: "",
  consentimento_responsavel: false,
  turmas: [],
  mensalidade_personalizada: "",
  ativo: true,
};

// Mesmos itens que a página do site pede além do PIX (dinheiro fica de fora).
const ITENS_DOACAO: [ItemEnum, string][] = [
  ["ALIMENTOS", "Alimentos não perecíveis"],
  ["CADEIRA_RODAS", "Cadeira de rodas"],
  ["MULETAS", "Muletas"],
  ["CADEIRA_BANHO", "Cadeira de banho"],
  ["OUTRO", "Outro (escrever)"],
];

const hoje = () => new Date().toISOString().split("T")[0];
const DOACAO_VAZIA = (): FormDoacao => ({
  item: "ALIMENTOS",
  item_descricao: "",
  quantidade: "1",
  doador_nome: "",
  recebido_em: hoje(),
  observacao: "",
});

type FormDoacao = {
  item: ItemEnum;
  item_descricao: string;
  quantidade: string;
  doador_nome: string;
  recebido_em: string;
  observacao: string;
};
type FormProfessor = {
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
  turmas: number[];
  ativo: boolean;
};

// Primeira regra que o cadastro do aluno quebra, ou "" se está tudo certo.
function erroDoAluno(f: FormAluno, menor: boolean): string {
  if (!f.data_nascimento) return "Informe a data de nascimento.";
  if (menor) {
    if (!f.nome_responsavel.trim()) return "Informe o nome do responsável.";
    if (!cpfValido(f.cpf_responsavel)) return "CPF do responsável inválido.";
    if (!telefoneValido(f.telefone_responsavel))
      return "Telefone do responsável inválido. Use DDD + número.";
    if (!f.consentimento_responsavel)
      return "Marque que o responsável autorizou o tratamento dos dados do menor.";
  } else if (f.cpf && !cpfValido(f.cpf)) {
    return "CPF inválido.";
  }
  if (f.mensalidade_personalizada && valorMensalidade(f.mensalidade_personalizada) === null)
    return "Mensalidade inválida. Use um valor como 20,00 ou deixe vazio.";
  return "";
}

export function DashboardLayout() {
  const [screen, setScreen] = useState<Screen>("presenca");
  const [showForm, setShowForm] = useState<
    "turma" | "aluno" | "professor" | "doacao" | null
  >(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formTurma, setFormTurma] = useState<FormTurma>({
    nome: "",
    dia_semana: "SEG",
    horario_inicio: "08:00",
    horario_fim: "09:00",
    data_inicio: new Date().toISOString().split("T")[0],
    data_fim: "",
    ativo: true,
  });
  const [formAluno, setFormAluno] = useState<FormAluno>(ALUNO_VAZIO);
  const [formDoacao, setFormDoacao] = useState<FormDoacao>(DOACAO_VAZIA());
  const [erroForm, setErroForm] = useState("");
  const [confirmacao, setConfirmacao] = useState<Confirmacao | null>(null);
  const [formProfessor, setFormProfessor] = useState<FormProfessor>({
    nome: "",
    cpf: "",
    email: "",
    telefone: "",
    turmas: [],
    ativo: true,
  });

  // Queries - ALWAYS called first to maintain hook order
  const {
    data: turmasData,
    isLoading: loadingTurmas,
    error: errorTurmas,
  } = useTurmas();
  const {
    data: alunosData,
    isLoading: loadingAlunos,
    error: errorAlunos,
  } = useAlunos();
  const { data: doacoesResumo } = useDoacoesItensResumo();
  const { data: doacoesData } = useDoacoesItens();
  const { data: professoresData, isLoading: loadingProfessores } =
    useProfessores();

  // Mutations - ALWAYS called to maintain hook order
  const createTurma = useCreateTurma();
  const updateTurma = useUpdateTurma();
  const deleteTurma = useDeleteTurma();
  const createAluno = useCreateAluno();
  const updateAluno = useUpdateAluno();
  const deleteAluno = useDeleteAluno();
  const alterarAtivoAluno = useAlterarAtivoAluno();
  const createDoacao = useCreateDoacaoItem();
  const updateDoacao = useUpdateDoacaoItem();
  const deleteDoacao = useDeleteDoacaoItem();
  const createProfessor = useCreateProfessor();
  const updateProfessor = useUpdateProfessor();
  const deleteProfessor = useDeleteProfessor();

  // Extract results from paginated responses
  const turmas = turmasData?.results ?? [];
  const alunos = alunosData?.results ?? [];
  const professores = professoresData?.results || [];

  // Helper functions
  const closeForm = () => {
    setShowForm(null);
    setEditingId(null);
    setFormTurma({
      nome: "",
      dia_semana: "SEG",
      horario_inicio: "08:00",
      horario_fim: "09:00",
      data_inicio: new Date().toISOString().split("T")[0],
      data_fim: "",
      ativo: true,
    });
    setFormAluno(ALUNO_VAZIO);
    setFormDoacao(DOACAO_VAZIA());
    setErroForm("");
    setFormProfessor({
      nome: "",
      cpf: "",
      email: "",
      telefone: "",
      turmas: [],
      ativo: true,
    });
  };

  // Junta os erros de validação que a API devolve ({campo: ["msg"]}) em uma frase.
  const mensagemDeErro = (erro: unknown) => {
    const data = (erro as { response?: { data?: unknown } })?.response?.data;
    if (data && typeof data === "object") {
      return Object.entries(data as Record<string, unknown>)
        .map(([campo, msg]) => `${campo}: ${Array.isArray(msg) ? msg.join(" ") : String(msg)}`)
        .join("\n");
    }
    return "Não foi possível salvar. Tente novamente.";
  };

  const aoSalvar = {
    onSuccess: () => closeForm(),
    onError: (erro: unknown) => alert(mensagemDeErro(erro)),
  };

  const handleSubmitTurma = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...formTurma, data_fim: formTurma.data_fim || null };
    if (editingId !== null) {
      updateTurma.mutate({ id: editingId, data: payload }, aoSalvar);
    } else {
      createTurma.mutate(payload, aoSalvar);
    }
  };

  const handleSubmitAluno = (e: React.FormEvent) => {
    e.preventDefault();
    const menor = ehMenor(formAluno.data_nascimento);
    const erro = erroDoAluno(formAluno, menor);
    setErroForm(erro);
    if (erro) return;
    // Menor não tem CPF próprio; a API também ignora, mas nem enviamos.
    const payload = {
      ...formAluno,
      cpf: menor ? null : soDigitos(formAluno.cpf) || null,
      cpf_responsavel: soDigitos(formAluno.cpf_responsavel),
      telefone_responsavel: soDigitos(formAluno.telefone_responsavel),
      exame_validade: formAluno.exame_validade || null,
      mensalidade_personalizada: valorMensalidade(formAluno.mensalidade_personalizada),
    };
    if (editingId !== null) {
      updateAluno.mutate({ id: editingId, data: payload }, aoSalvar);
    } else {
      createAluno.mutate(payload, aoSalvar);
    }
  };

  const handleSubmitDoacao = (e: React.FormEvent) => {
    e.preventDefault();
    const quantidade = Number(formDoacao.quantidade);
    if (!Number.isInteger(quantidade) || quantidade < 1) {
      setErroForm("A quantidade precisa ser um número inteiro, de 1 para cima.");
      return;
    }
    setErroForm("");
    if (formDoacao.item === "OUTRO" && !formDoacao.item_descricao.trim()) {
      setErroForm("Escreva qual item foi doado.");
      return;
    }
    const payload = {
      ...formDoacao,
      item_descricao: formDoacao.item === "OUTRO" ? formDoacao.item_descricao.trim() : "",
      quantidade,
    };
    if (editingId !== null) {
      updateDoacao.mutate({ id: editingId, data: payload }, aoSalvar);
    } else {
      createDoacao.mutate(payload, aoSalvar);
    }
  };

  const handleSubmitProfessor = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...formProfessor };
    if (editingId !== null) {
      updateProfessor.mutate({ id: editingId, data: payload }, aoSalvar);
    } else {
      createProfessor.mutate(payload, aoSalvar);
    }
  };

  // A lista traz só um resumo de cada cadastro; para editar, carregamos o
  // cadastro completo do servidor (o formulário precisa de todos os campos).
  const handleEdit = async (tipo: TipoCadastro, id: number) => {
    try {
      if (tipo === "turma") {
        const t = (await turmasRetrieve(id)).data;
        setFormTurma({
          nome: t.nome,
          dia_semana: t.dia_semana,
          horario_inicio: t.horario_inicio.slice(0, 5),
          horario_fim: t.horario_fim.slice(0, 5),
          data_inicio: t.data_inicio,
          data_fim: t.data_fim ?? "",
          ativo: t.ativo ?? true,
        });
      } else if (tipo === "aluno") {
        const a = (await alunosRetrieve(id)).data;
        setFormAluno({
          nome: a.nome,
          cpf: a.cpf ?? "",
          rg: a.rg ?? "",
          data_nascimento: a.data_nascimento,
          sexo: a.sexo ?? "N",
          comprovante_residencia: a.comprovante_residencia ?? "pendente",
          titulo_eleitor: a.titulo_eleitor ?? "pendente",
          nome_responsavel: a.nome_responsavel ?? "",
          cpf_responsavel: a.cpf_responsavel ?? "",
          rg_responsavel: a.rg_responsavel ?? "",
          telefone_responsavel: a.telefone_responsavel ?? "",
          endereco_responsavel: a.endereco_responsavel ?? "",
          exame_aptidao: a.exame_aptidao ?? "pendente",
          exame_validade: a.exame_validade ?? "",
          // Já autorizado antes: o checkbox volta marcado.
          consentimento_responsavel: a.consentimento_registrado,
          turmas: a.turmas ?? [],
          mensalidade_personalizada: a.mensalidade_personalizada ?? "",
          ativo: a.ativo ?? true,
        });
      } else {
        const p = (await professoresRetrieve(id)).data;
        setFormProfessor({
          nome: p.nome,
          cpf: p.cpf,
          email: p.email ?? "",
          telefone: p.telefone ?? "",
          turmas: p.turmas ?? [],
          ativo: p.ativo ?? true,
        });
      }
      setEditingId(id);
      setShowForm(tipo);
    } catch {
      alert("Não foi possível carregar o cadastro para edição.");
    }
  };

  const handleDelete = (
    id: number,
    type: "turma" | "aluno" | "professor" | "doacao",
  ) => {
    const definitiva =
      type === "aluno"
        ? "Isso apaga de vez o cadastro, o consentimento e as presenças deste aluno. Não dá para desfazer."
        : "Esta ação não pode ser desfeita.";
    setConfirmacao({
      titulo: "Excluir definitivamente?",
      texto: definitiva,
      rotulo: "Excluir",
      onConfirm: () => {
        if (type === "turma") deleteTurma.mutate(id);
        else if (type === "aluno") deleteAluno.mutate(id);
        else if (type === "doacao") deleteDoacao.mutate(id);
        else deleteProfessor.mutate(id);
      },
    });
  };

  const handleAlterarAtivo = (id: number, nome: string, ativo: boolean) => {
    setConfirmacao({
      titulo: ativo ? "Reativar aluno?" : "Inativar aluno?",
      texto: ativo
        ? `${nome} volta a aparecer nas turmas e na lista de chamada.`
        : `${nome} sai das turmas e da lista de chamada, mas o cadastro e o histórico ficam guardados.`,
      rotulo: ativo ? "Reativar" : "Inativar",
      onConfirm: () => alterarAtivoAluno.mutate({ id, ativo }),
    });
  };

  const menor = ehMenor(formAluno.data_nascimento);

  const renderFormModal = () => {
    if (showForm === "doacao")
      return (
        <FormModal
          title={editingId !== null ? "Editar doação" : "Registrar doação"}
          largura="max-w-3xl"
          onClose={closeForm}
          onSubmit={handleSubmitDoacao}
          submitting={createDoacao.isPending || updateDoacao.isPending}
        >
          <label className="text-sm text-grafite/70">
            Item
            <select
              name="item"
              value={formDoacao.item}
              onChange={(e) =>
                setFormDoacao({ ...formDoacao, item: e.target.value as ItemEnum })
              }
              className={`${CLASSE_CAMPO} mt-1`}
            >
              {ITENS_DOACAO.map(([valor, rotulo]) => (
                <option key={valor} value={valor}>
                  {rotulo}
                </option>
              ))}
            </select>
          </label>
          {formDoacao.item === "OUTRO" && (
            <label className="text-sm text-grafite/70 lg:col-span-2">
              Qual item?
              <input
                name="item_descricao"
                placeholder="Ex.: bola de futsal, cobertores, brinquedos"
                maxLength={100}
                value={formDoacao.item_descricao}
                onChange={(e) =>
                  setFormDoacao({ ...formDoacao, item_descricao: e.target.value })
                }
                required
                className={`${CLASSE_CAMPO} mt-1`}
              />
            </label>
          )}
          <label className="text-sm text-grafite/70">
            Quantidade
            <input
              type="number"
              min={1}
              step={1}
              name="quantidade"
              value={formDoacao.quantidade}
              onChange={(e) =>
                setFormDoacao({ ...formDoacao, quantidade: e.target.value })
              }
              required
              className={`${CLASSE_CAMPO} mt-1`}
            />
          </label>
          <label className="text-sm text-grafite/70">
            Doador (vazio = anônimo)
            <input
              name="doador_nome"
              value={formDoacao.doador_nome}
              onChange={(e) =>
                setFormDoacao({ ...formDoacao, doador_nome: e.target.value })
              }
              className={`${CLASSE_CAMPO} mt-1`}
            />
          </label>
          <label className="text-sm text-grafite/70">
            Recebido em
            <input
              type="date"
              name="recebido_em"
              value={formDoacao.recebido_em}
              onChange={(e) =>
                setFormDoacao({ ...formDoacao, recebido_em: e.target.value })
              }
              required
              className={`${CLASSE_CAMPO} mt-1`}
            />
          </label>
          <label className="text-sm text-grafite/70 lg:col-span-2">
            Observação (opcional)
            <input
              name="observacao"
              placeholder="Ex.: 2 kg de arroz, cadeira usada"
              value={formDoacao.observacao}
              onChange={(e) =>
                setFormDoacao({ ...formDoacao, observacao: e.target.value })
              }
              className={`${CLASSE_CAMPO} mt-1`}
            />
          </label>
          {erroForm && (
            <p role="alert" className="lg:col-span-2 text-sm text-vermelho">
              {erroForm}
            </p>
          )}
        </FormModal>
      );
    if (showForm === "turma")
      return (
        <FormModal
          title={editingId !== null ? "Editar Turma" : "Nova Turma"}
          largura="max-w-3xl"
          onClose={closeForm}
          onSubmit={handleSubmitTurma}
          submitting={createTurma.isPending || updateTurma.isPending}
        >
          <input
            name="nome"
            placeholder="Nome da turma"
            value={formTurma.nome}
            onChange={(e) =>
              setFormTurma({ ...formTurma, nome: e.target.value })
            }
            required
            className={`${CLASSE_CAMPO} lg:col-span-2`}
          />
          <label className="text-sm text-grafite/70 lg:col-span-2">
            Dia da semana
            <select
              name="dia_semana"
              value={formTurma.dia_semana}
              onChange={(e) =>
                setFormTurma({
                  ...formTurma,
                  dia_semana: e.target.value as DiaSemanaEnum,
                })
              }
              required
              className={`${CLASSE_CAMPO} mt-1`}
            >
              <option value="SEG">Segunda</option>
              <option value="TER">Terça</option>
              <option value="QUA">Quarta</option>
              <option value="QUI">Quinta</option>
              <option value="SEX">Sexta</option>
              <option value="SAB">Sábado</option>
              <option value="DOM">Domingo</option>
            </select>
          </label>
          <label className="text-sm text-grafite/70">
            Horário de início
            <input
              type="time"
              name="horario_inicio"
              value={formTurma.horario_inicio}
              onChange={(e) =>
                setFormTurma({ ...formTurma, horario_inicio: e.target.value })
              }
              required
              className={`${CLASSE_CAMPO} mt-1`}
            />
          </label>
          <label className="text-sm text-grafite/70">
            Horário de fim
            <input
              type="time"
              name="horario_fim"
              value={formTurma.horario_fim}
              onChange={(e) =>
                setFormTurma({ ...formTurma, horario_fim: e.target.value })
              }
              required
              className={`${CLASSE_CAMPO} mt-1`}
            />
          </label>
          <label className="text-sm text-grafite/70">
            Data de início
            <input
              type="date"
              name="data_inicio"
              value={formTurma.data_inicio}
              onChange={(e) =>
                setFormTurma({ ...formTurma, data_inicio: e.target.value })
              }
              required
              className={`${CLASSE_CAMPO} mt-1`}
            />
          </label>
          <label className="text-sm text-grafite/70">
            Data de fim (opcional)
            <input
              type="date"
              name="data_fim"
              value={formTurma.data_fim || ""}
              onChange={(e) =>
                setFormTurma({ ...formTurma, data_fim: e.target.value })
              }
              className={`${CLASSE_CAMPO} mt-1`}
            />
          </label>
          <label className="flex items-center gap-2 lg:col-span-2">
            <input
              type="checkbox"
              checked={formTurma.ativo}
              onChange={(e) =>
                setFormTurma({ ...formTurma, ativo: e.target.checked })
              }
            />{" "}
            Ativa
          </label>
        </FormModal>
      );
    if (showForm === "aluno")
      return (
        <FormModal
          title={editingId !== null ? "Editar Aluno" : "Novo Aluno"}
          largura="max-w-3xl"
          onClose={closeForm}
          onSubmit={handleSubmitAluno}
          submitting={createAluno.isPending || updateAluno.isPending}
        >
          <input
            name="nome"
            placeholder="Nome completo"
            value={formAluno.nome}
            onChange={(e) =>
              setFormAluno({ ...formAluno, nome: e.target.value })
            }
            required
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-grafite outline-none focus:border-verde focus:ring-4 focus:ring-verde/10"
          />
          <input
            name="rg"
            placeholder="RG ou certidão de nascimento (opcional)"
            value={formAluno.rg}
            onChange={(e) => setFormAluno({ ...formAluno, rg: e.target.value })}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-grafite outline-none focus:border-verde focus:ring-4 focus:ring-verde/10"
          />
          <input
            type="date"
            name="data_nascimento"
            value={formAluno.data_nascimento}
            onChange={(e) =>
              setFormAluno({ ...formAluno, data_nascimento: e.target.value })
            }
            required
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-grafite outline-none focus:border-verde focus:ring-4 focus:ring-verde/10"

          />
          <select
            name="sexo"
            value={formAluno.sexo}
            onChange={(e) =>
              setFormAluno({ ...formAluno, sexo: e.target.value as SexoEnum })
            }
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-grafite outline-none focus:border-verde focus:ring-4 focus:ring-verde/10"

          >
            <option value="M">Masculino</option>
            <option value="F">Feminino</option>
            <option value="O">Outro</option>
            <option value="N">Não informar</option>
          </select>
          {menor ? (
            <>
              <p className="lg:col-span-2 text-sm font-bold text-verde-escuro">
                Responsável (obrigatório para menor de 18 anos)
              </p>
              <input
                name="nome_responsavel"
                placeholder="Nome do responsável"
                value={formAluno.nome_responsavel}
                onChange={(e) =>
                  setFormAluno({ ...formAluno, nome_responsavel: e.target.value })
                }
                required
                className={CLASSE_CAMPO}
              />
              <input
                name="cpf_responsavel"
                placeholder="CPF do responsável"
                inputMode="numeric"
                value={formAluno.cpf_responsavel}
                onChange={(e) =>
                  setFormAluno({ ...formAluno, cpf_responsavel: e.target.value })
                }
                required
                className={CLASSE_CAMPO}
              />
              <input
                name="rg_responsavel"
                placeholder="RG do responsável"
                value={formAluno.rg_responsavel}
                onChange={(e) =>
                  setFormAluno({ ...formAluno, rg_responsavel: e.target.value })
                }
                className={CLASSE_CAMPO}
              />
              <input
                type="tel"
                name="telefone_responsavel"
                placeholder="Telefone do responsável"
                value={formAluno.telefone_responsavel}
                onChange={(e) =>
                  setFormAluno({
                    ...formAluno,
                    telefone_responsavel: e.target.value,
                  })
                }
                required
                className={CLASSE_CAMPO}
              />
              <input
                name="endereco_responsavel"
                placeholder="Endereço do responsável"
                value={formAluno.endereco_responsavel}
                onChange={(e) =>
                  setFormAluno({
                    ...formAluno,
                    endereco_responsavel: e.target.value,
                  })
                }
                className={`${CLASSE_CAMPO} lg:col-span-2`}
              />
              <label className="lg:col-span-2 flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={formAluno.consentimento_responsavel}
                  onChange={(e) =>
                    setFormAluno({
                      ...formAluno,
                      consentimento_responsavel: e.target.checked,
                    })
                  }
                />
                Responsável autorizou o tratamento dos dados do menor
              </label>
              <p className="lg:col-span-2 text-sm font-bold text-verde-escuro">
                Exame de aptidão física
              </p>
              <select
                name="exame_aptidao"
                value={formAluno.exame_aptidao}
                onChange={(e) =>
                  setFormAluno({
                    ...formAluno,
                    exame_aptidao: e.target.value as ExameAptidaoEnum,
                  })
                }
                className={CLASSE_CAMPO}
              >
                <option value="pendente">Pendente</option>
                <option value="apto">Apto</option>
                <option value="nao_apto">Não apto</option>
              </select>
              <input
                type="date"
                name="exame_validade"
                aria-label="Validade do exame"
                value={formAluno.exame_validade}
                onChange={(e) =>
                  setFormAluno({ ...formAluno, exame_validade: e.target.value })
                }
                className={CLASSE_CAMPO}
              />
            </>
          ) : (
            <input
              name="cpf"
              placeholder="CPF (opcional)"
              inputMode="numeric"
              value={formAluno.cpf}
              onChange={(e) => setFormAluno({ ...formAluno, cpf: e.target.value })}
              className={CLASSE_CAMPO}
            />
          )}
          <fieldset className="lg:col-span-2 grid grid-cols-2 gap-4">
            <legend className="mb-2 text-sm font-bold text-verde-escuro">
              Documentos (só a situação; o papel fica com a ONG)
            </legend>
            <label className="text-sm text-grafite/70">
              Comprovante de residência
              <select
                name="comprovante_residencia"
                value={formAluno.comprovante_residencia}
                onChange={(e) =>
                  setFormAluno({
                    ...formAluno,
                    comprovante_residencia: e.target.value as ComprovanteResidenciaEnum,
                  })
                }
                className={`${CLASSE_CAMPO} mt-1`}
              >
                <option value="pendente">Pendente</option>
                <option value="entregue">Entregue</option>
              </select>
            </label>
            {!menor && (
              <label className="text-sm text-grafite/70">
                Título de eleitor
                <select
                  name="titulo_eleitor"
                  value={formAluno.titulo_eleitor}
                  onChange={(e) =>
                    setFormAluno({
                      ...formAluno,
                      titulo_eleitor: e.target.value as TituloEleitorEnum,
                    })
                  }
                  className={`${CLASSE_CAMPO} mt-1`}
                >
                  <option value="pendente">Pendente</option>
                  <option value="entregue">Entregue</option>
                </select>
              </label>
            )}
          </fieldset>
          <fieldset className="lg:col-span-2">
            <legend className="text-sm font-bold text-verde-escuro">
              Turmas
            </legend>
            <div className="mt-2 grid gap-1">
              {turmas.length === 0 && (
                <p className="text-sm text-grafite/60">
                  Nenhuma turma cadastrada ainda.
                </p>
              )}
              {turmas.map((t) => (
                <label key={t.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={formAluno.turmas.includes(t.id)}
                    onChange={(e) =>
                      setFormAluno({
                        ...formAluno,
                        turmas: e.target.checked
                          ? [...formAluno.turmas, t.id]
                          : formAluno.turmas.filter((id) => id !== t.id),
                      })
                    }
                  />
                  {t.nome} <span className="text-grafite/50">({t.horario_formatado})</span>
                </label>
              ))}
            </div>
            <label className="mt-3 block text-sm text-grafite/70">
              Mensalidade (R$)
              <input
                name="mensalidade_personalizada"
                inputMode="decimal"
                placeholder={`Automática: ${calcularMensalidade(formAluno.turmas.length).toFixed(2)}`}
                value={formAluno.mensalidade_personalizada}
                onChange={(e) =>
                  setFormAluno({
                    ...formAluno,
                    mensalidade_personalizada: e.target.value,
                  })
                }
                className={`${CLASSE_CAMPO} mt-1`}
              />
            </label>
            <p className="mt-1 text-xs text-grafite/60">
              Deixe vazio para cobrar R$ {MENSALIDADE_POR_TURMA} por turma. Preencha só para
              mudar o valor deste aluno (0 = isento).
            </p>
          </fieldset>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formAluno.ativo}
              onChange={(e) =>
                setFormAluno({ ...formAluno, ativo: e.target.checked })
              }
            />{" "}
            Ativo
          </label>
          {erroForm && (
            <p role="alert" className="lg:col-span-2 text-sm text-vermelho">
              {erroForm}
            </p>
          )}
        </FormModal>
      );
    if (showForm === "professor")
      return (
        <FormModal
          title={editingId !== null ? "Editar Professor" : "Novo Professor"}
          largura="max-w-3xl"
          onClose={closeForm}
          onSubmit={handleSubmitProfessor}
          submitting={createProfessor.isPending || updateProfessor.isPending}
        >
          <input
            name="nome"
            placeholder="Nome completo"
            value={formProfessor.nome}
            onChange={(e) =>
              setFormProfessor({ ...formProfessor, nome: e.target.value })
            }
            required
            className={CLASSE_CAMPO}
          />
          <input
            name="cpf"
            placeholder="CPF"
            inputMode="numeric"
            value={formProfessor.cpf}
            onChange={(e) =>
              setFormProfessor({ ...formProfessor, cpf: e.target.value })
            }
            required
            className={CLASSE_CAMPO}
          />
          <input
            type="email"
            name="email"
            placeholder="E-mail"
            value={formProfessor.email}
            onChange={(e) =>
              setFormProfessor({ ...formProfessor, email: e.target.value })
            }
            className={CLASSE_CAMPO}
          />
          <input
            type="tel"
            name="telefone"
            placeholder="Telefone"
            value={formProfessor.telefone}
            onChange={(e) =>
              setFormProfessor({ ...formProfessor, telefone: e.target.value })
            }
            className={CLASSE_CAMPO}
          />
          <fieldset className="lg:col-span-2">
            <legend className="text-sm font-bold text-verde-escuro">
              Turmas
            </legend>
            <div className="mt-2 grid gap-1">
              {turmas.length === 0 && (
                <p className="text-sm text-grafite/60">
                  Nenhuma turma cadastrada ainda.
                </p>
              )}
              {turmas.map((t) => (
                <label key={t.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={formProfessor.turmas.includes(t.id)}
                    onChange={(e) =>
                      setFormProfessor({
                        ...formProfessor,
                        turmas: e.target.checked
                          ? [...formProfessor.turmas, t.id]
                          : formProfessor.turmas.filter((id) => id !== t.id),
                      })
                    }
                  />
                  {t.nome}{" "}
                  <span className="text-grafite/50">({t.horario_formatado})</span>
                </label>
              ))}
            </div>
          </fieldset>
          <label className="flex items-center gap-2 lg:col-span-2">
            <input
              type="checkbox"
              checked={formProfessor.ativo}
              onChange={(e) =>
                setFormProfessor({ ...formProfessor, ativo: e.target.checked })
              }
            />{" "}
            Ativo
          </label>
        </FormModal>
      );
    return null;
  };

  return (
    <div className="min-h-screen bg-mist-50 flex flex-row">
      <aside className="relative sticky top-0 flex h-screen w-64 shrink-0 flex-col overflow-hidden bg-linear-to-b from-verde-900 via-verde-escuro to-verde-escuro">
        <Sunburst
          tone="white"
          size={420}
          rays={24}
          fill={0.06}
          spin={false}
          className="pointer-events-none absolute -left-40 bottom-16 text-white opacity-15"
        />
        <div className="relative flex h-16 items-center gap-3 px-6 border-b border-white/10">
          <picture>
            <source srcSet="/logo-icone.webp" type="image/webp" />
            <img
              src="/logo-icone.png"
              alt=""
              width={36}
              height={36}
              className="size-9 object-contain"
            />
          </picture>
          <h2 className="text-lg font-extrabold tracking-tight text-white">ONG do Povo</h2>
        </div>

        <nav className="relative flex flex-col gap-1.5 px-4 py-6">
          {ITENS_MENU.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setScreen(id)}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-bold transition-all duration-300 ${screen === id ? "bg-verde text-white shadow-lg shadow-verde/25" : "text-white/75 hover:bg-white/10 hover:text-white"}`}
            >
              <Icon className="size-4" />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <UsuarioLogado />
      </aside>

      <main className="min-w-0 flex-1 bg-linear-to-b from-mist-50 via-white to-mist-50 p-6 lg:p-10">
        <div className="relative mb-8 overflow-hidden rounded-3xl bg-linear-to-br from-verde-900 to-verde-escuro p-6 text-white shadow-lg sm:p-8">
          <Sunburst
            tone="white"
            size={360}
            rays={24}
            fill={0.06}
            spin={false}
            className="pointer-events-none absolute -right-24 -top-36 text-white opacity-30"
          />
          <div className="relative">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-amarelo">
              Dashboard
            </p>
            <h1 className="mt-2 text-3xl font-extrabold">Painel de Administração</h1>
            <p className="mt-2 text-white/70">Gerencie as operações da ONG do Povo.</p>
          </div>
        </div>

        {/* PRESENÇAS */}
        {screen === "presenca" && <PresencasTela />}

        {/* AUDITORIA */}
        {screen === "auditoria" && <AuditoriaTela />}

        {/* TURMAS */}
        {screen === "turmas" && (
          <div className="mt-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-extrabold text-verde-escuro">Turmas</h3>
              <Button
                variante="secundaria"
                onClick={() => {
                  closeForm();
                  setEditingId(null);
                  setFormTurma({
                    nome: "",
                    dia_semana: "SEG",
                    horario_inicio: "08:00",
                    horario_fim: "09:00",
                    data_inicio: new Date().toISOString().split("T")[0],
                    data_fim: "",
                    ativo: true,
                  });
                  setShowForm("turma");
                }}
              >
                <Plus className="size-4 mr-2" />
                Nova Turma
              </Button>
            </div>
            {loadingTurmas ? (
              <p>Carregando...</p>
            ) : errorTurmas ? (
              <p className="text-vermelho">Erro ao carregar turmas</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {turmas.map((t) => (
                  <div key={t.id} className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                    <h4 className="font-bold text-verde mb-2">{t.nome}</h4>
                    <p className="text-sm text-grafite/60">
                      {t.horario_formatado}
                    </p>
                    <p className="text-xs text-grafite/50">
                      {t.ativo ? "Ativa" : "Inativa"}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Button
                        variante="contorno-claro"
                        onClick={() => void handleEdit("turma", t.id)}
                      >
                        <Edit className="size-4" />
                      </Button>
                      <Button
                        variante="contorno-claro"
                        onClick={() => handleDelete(t.id, "turma")}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ALUNOS */}
        {screen === "alunos" && (
          <div className="mt-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-extrabold text-verde-escuro">Alunos</h3>
              <Button
                variante="secundaria"
                onClick={() => {
                  closeForm();
                  setEditingId(null);
                  setFormAluno(ALUNO_VAZIO);
                  setShowForm("aluno");
                }}
              >
                <Plus className="size-4 mr-2" />
                Novo Aluno
              </Button>
            </div>
            {loadingAlunos ? (
              <p>Carregando...</p>
            ) : errorAlunos ? (
              <p className="text-vermelho">Erro ao carregar alunos</p>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200/70 bg-white shadow-sm">
                <table className="w-full">
                  <thead className="bg-mist-100/70">
                    <tr className="text-left text-xs font-bold uppercase tracking-wider text-verde-escuro/70">
                      <th className="p-3">Nome</th>
                      <th className="p-3">CPF</th>
                      <th className="p-3">Turmas</th>
                      <th className="p-3">Mensalidade</th>
                      <th className="p-3">Documentos</th>
                      <th className="p-3">Exame</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alunos.map((a) => (
                      <tr key={a.id} className="border-t border-mist-200 transition-colors hover:bg-mist-50">
                        <td className="p-3 font-medium text-grafite">
                          {a.nome}
                        </td>
                        <td className="p-3 text-grafite/60 text-sm">
                          {a.cpf_mascarado ?? "—"}
                        </td>
                        <td className="p-3 text-grafite/60 text-sm">
                          {a.turmas_nomes.length ? a.turmas_nomes.join(", ") : "—"}
                        </td>
                        <td className="p-3 text-grafite/60">
                          R$ {Number(a.mensalidade).toFixed(2)}
                        </td>
                        <td className="p-3">
                          <DocumentosBadge pendentes={a.documentos_pendentes} />
                        </td>
                        <td className="p-3">
                          <ExameBadge situacao={a.exame_situacao} />
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold ${a.ativo ? "bg-verde/10 text-verde" : "bg-vermelho/10 text-vermelho"}`}
                          >
                            {a.ativo ? "Ativo" : "Inativo"}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <Button
                              variante="contorno-claro"
                              onClick={() => void handleEdit("aluno", a.id)}
                            >
                              <Edit className="size-4" />
                            </Button>
                            <Button
                              variante="contorno-claro"
                              aria-label={a.ativo ? "Inativar aluno" : "Reativar aluno"}
                              title={a.ativo ? "Inativar" : "Reativar"}
                              onClick={() =>
                                handleAlterarAtivo(a.id, a.nome, !a.ativo)
                              }
                            >
                              {a.ativo ? (
                                <UserX className="size-4" />
                              ) : (
                                <UserCheck className="size-4" />
                              )}
                            </Button>
                            <Button
                              variante="contorno-claro"
                              aria-label="Excluir definitivamente"
                              title="Excluir definitivamente"
                              onClick={() => handleDelete(a.id, "aluno")}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* PROFESSORES */}
        {screen === "professores" && (
          <div className="mt-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-extrabold text-verde-escuro">Professores</h3>
              <Button
                variante="secundaria"
                onClick={() => {
                  closeForm();
                  setEditingId(null);
                  setFormProfessor({
                    nome: "",
                    cpf: "",
                    email: "",
                    telefone: "",
                    turmas: [],
                    ativo: true,
                  });
                  setShowForm("professor");
                }}
              >
                <Plus className="size-4 mr-2" />
                Novo Professor
              </Button>
            </div>
            {loadingProfessores || !professoresData ? (
              <p>Carregando...</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {professores.map((p) => (
                  <div key={p.id} className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                    <h4 className="font-bold text-verde mb-2">{p.nome}</h4>
                    <p className="text-sm text-grafite/60">CPF: {p.cpf}</p>
                    <p className="text-sm text-grafite/60">
                      Turmas: {p.turmas_nomes?.join(", ") || "—"}
                    </p>
                    <p className="text-xs text-grafite/50">
                      Alunos: {p.total_alunos}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Button
                        variante="contorno-claro"
                        onClick={() => void handleEdit("professor", p.id)}
                      >
                        <Edit className="size-4" />
                      </Button>
                      <Button
                        variante="contorno-claro"
                        onClick={() => handleDelete(p.id, "professor")}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* DOAÇÕES (só itens; o PIX a ONG confere no extrato) */}
        {screen === "doacoes" && (
          <div className="mt-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-extrabold text-verde-escuro">
                Doações de itens
              </h3>
              <Button
                variante="secundaria"
                onClick={() => {
                  closeForm();
                  setShowForm("doacao");
                }}
              >
                <Plus className="size-4 mr-2" />
                Registrar doação
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {(doacoesResumo ?? []).map((r) => (
                <div key={r.item} className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
                  <p className="text-3xl font-extrabold text-verde">{r.total}</p>
                  <p className="text-sm text-grafite/60">{r.item_rotulo}</p>
                </div>
              ))}
            </div>
            <div className="overflow-x-auto rounded-2xl border border-slate-200/70 bg-white shadow-sm">
              <table className="w-full">
                <thead className="bg-mist-100/70">
                  <tr className="text-left text-xs font-bold uppercase tracking-wider text-verde-escuro/70">
                    <th className="p-3">Data</th>
                    <th className="p-3">Item</th>
                    <th className="p-3">Qtd.</th>
                    <th className="p-3">Doador</th>
                    <th className="p-3">Observação</th>
                    <th className="p-3">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {(doacoesData?.results ?? []).map((d) => (
                    <tr key={d.id} className="border-t border-mist-200 transition-colors hover:bg-mist-50">
                      <td className="p-3 text-grafite/60 text-sm">
                        {new Date(`${d.recebido_em}T00:00:00`).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="p-3 font-medium text-grafite">
                        {d.item_rotulo}
                      </td>
                      <td className="p-3 text-grafite/60">{d.quantidade}</td>
                      <td className="p-3 text-grafite/60 text-sm">
                        {d.doador_exibido}
                      </td>
                      <td className="p-3 text-grafite/60 text-sm">
                        {d.observacao || "—"}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <Button
                            variante="contorno-claro"
                            aria-label="Editar doação"
                            onClick={() => {
                              closeForm();
                              setFormDoacao({
                                item: d.item,
                                item_descricao: d.item_descricao ?? "",
                                quantidade: String(d.quantidade),
                                doador_nome: d.doador_nome ?? "",
                                recebido_em: d.recebido_em ?? hoje(),
                                observacao: d.observacao ?? "",
                              });
                              setEditingId(d.id);
                              setShowForm("doacao");
                            }}
                          >
                            <Edit className="size-4" />
                          </Button>
                          <Button
                            variante="contorno-claro"
                            aria-label="Excluir doação"
                            onClick={() => handleDelete(d.id, "doacao")}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {doacoesData?.results?.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-grafite/50">
                        Nenhuma doação de item registrada ainda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <EmprestimosSecao />
          </div>
        )}

        {renderFormModal()}
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
      </main>
    </div>
  );
}

// Selo dos documentos na listagem: "Em dia" ou quantos faltam (nomes no tooltip).
function DocumentosBadge({ pendentes }: { pendentes: readonly string[] }) {
  if (pendentes.length === 0)
    return (
      <span className="px-3 py-1 rounded-full text-xs font-bold bg-verde/10 text-verde">
        Em dia
      </span>
    );
  return (
    <span
      title={`Pendentes: ${pendentes.join(", ")}`}
      className="px-3 py-1 rounded-full text-xs font-bold bg-amarelo/10 text-amarelo"
    >
      {pendentes.length} pendente{pendentes.length > 1 ? "s" : ""}
    </span>
  );
}

// Selo do exame de aptidão na listagem: só aparece para menor.
function ExameBadge({ situacao }: { situacao?: string | null }) {
  if (!situacao) return <span className="text-grafite/40 text-sm">—</span>;
  const visual: Record<string, [string, string]> = {
    valido: ["Em dia", "bg-verde/10 text-verde"],
    vencido: ["Vencido", "bg-vermelho/10 text-vermelho"],
    ausente: ["Ausente", "bg-amarelo/10 text-amarelo"],
    nao_apto: ["Não apto", "bg-vermelho/10 text-vermelho"],
  };
  const [rotulo, classe] = visual[situacao] ?? ["—", ""];
  return <span className={`px-3 py-1 rounded-full text-xs font-bold ${classe}`}>{rotulo}</span>;
}
