/**
 * Layout da Dashboard de administração — CONECTADO À API REAL.
 *
 * Estrutura fixa: sidebar + conteúdo principal.
 * Usa TanStack Query para consumir a API Django (via Orval).
 * Todas as operações CRUD funcionam via hooks em src/features/dashboard/api.ts
 */

import { useState, useEffect } from "react";
import {
  Shield,
  Users,
  Clipboard,
  MessageCircle,
  LogOut,
  Plus,
  Edit,
  Trash2,
  UserCheck,
  UserX,
  X,
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
  useDoacoesAdmin,
  useDoacoesResumo,
} from "@/features/dashboard/api";
import { encerrarSessao, restaurarSessao } from "@/lib/api";
import { alunosRetrieve } from "@/api/generated/alunos/alunos";
import { professoresRetrieve } from "@/api/generated/professores/professores";
import { turmasRetrieve } from "@/api/generated/turmas/turmas";
import type {
  DiaSemanaEnum,
  ExameAptidaoEnum,
  SexoEnum,
} from "@/api/generated/model";
import {
  cpfValido,
  ehMenor,
  soDigitos,
  telefoneValido,
} from "@/lib/aluno";
// import types removed as they're not directly used

type Screen = "presenca" | "alunos" | "doacoes" | "turmas" | "professores";
type TipoCadastro = "turma" | "aluno" | "professor";

const ITENS_MENU: { id: Screen; label: string; Icon: LucideIcon }[] = [
  { id: "presenca", label: "Presenças", Icon: Users },
  { id: "alunos", label: "Alunos", Icon: Shield },
  { id: "turmas", label: "Turmas", Icon: Clipboard },
  { id: "professores", label: "Professores", Icon: MessageCircle },
  { id: "doacoes", label: "Doações", Icon: Clipboard },
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
  nome_responsavel: string;
  cpf_responsavel: string;
  rg_responsavel: string;
  telefone_responsavel: string;
  endereco_responsavel: string;
  exame_aptidao: ExameAptidaoEnum;
  exame_validade: string;
  consentimento_responsavel: boolean;
  mensalidade: string;
  turma: number | undefined;
  ativo: boolean;
};

const ALUNO_VAZIO: FormAluno = {
  nome: "",
  cpf: "",
  rg: "",
  data_nascimento: "",
  sexo: "N",
  nome_responsavel: "",
  cpf_responsavel: "",
  rg_responsavel: "",
  telefone_responsavel: "",
  endereco_responsavel: "",
  exame_aptidao: "pendente",
  exame_validade: "",
  consentimento_responsavel: false,
  mensalidade: "20.00",
  turma: undefined,
  ativo: true,
};

const CLASSE_CAMPO =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-grafite outline-none focus:border-verde focus:ring-4 focus:ring-verde/10";

// Ação que espera confirmação num popup antes de rodar.
type Confirmacao = {
  titulo: string;
  texto: string;
  rotulo: string;
  onConfirm: () => void;
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
  return "";
}

export function DashboardLayout() {
  const [screen, setScreen] = useState<Screen>("presenca");
  const [showForm, setShowForm] = useState<
    "turma" | "aluno" | "professor" | null
  >(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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
  const { data: doacoesResumo } = useDoacoesResumo();
  const { data: doacoesAdminData } = useDoacoesAdmin();
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
  const createProfessor = useCreateProfessor();
  const updateProfessor = useUpdateProfessor();
  const deleteProfessor = useDeleteProfessor();

  // O access token fica so em memoria: ao abrir o painel, pedimos um novo pelo
  // cookie httpOnly de refresh. Sem sessao valida, volta para o login.
  useEffect(() => {
    restaurarSessao().then((ok) => {
      if (ok) setIsLoading(false);
      else window.location.href = "/login.html";
    });
  }, []);

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-mist-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-verde border-t-transparent"></div>
      </div>
    );
  }

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
    };
    if (editingId !== null) {
      updateAluno.mutate({ id: editingId, data: payload }, aoSalvar);
    } else {
      createAluno.mutate(payload, aoSalvar);
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
          nome_responsavel: a.nome_responsavel ?? "",
          cpf_responsavel: a.cpf_responsavel ?? "",
          rg_responsavel: a.rg_responsavel ?? "",
          telefone_responsavel: a.telefone_responsavel ?? "",
          endereco_responsavel: a.endereco_responsavel ?? "",
          exame_aptidao: a.exame_aptidao ?? "pendente",
          exame_validade: a.exame_validade ?? "",
          // Já autorizado antes: o checkbox volta marcado.
          consentimento_responsavel: a.consentimento_registrado,
          mensalidade: String(a.mensalidade ?? "20.00"),
          turma: a.turma ?? undefined,
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

  const handleDelete = (id: number, type: "turma" | "aluno" | "professor") => {
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
    if (showForm === "turma")
      return (
        <FormModal
          title={editingId !== null ? "Editar Turma" : "Nova Turma"}
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
          />
          <select
            name="dia_semana"
            value={formTurma.dia_semana}
            onChange={(e) =>
              setFormTurma({ ...formTurma, dia_semana: e.target.value as DiaSemanaEnum })
            }
            required
          >
            <option value="SEG">Segunda</option>
            <option value="TER">Terça</option>
            <option value="QUA">Quarta</option>
            <option value="QUI">Quinta</option>
            <option value="SEX">Sexta</option>
            <option value="SAB">Sábado</option>
            <option value="DOM">Domingo</option>
          </select>
          <input
            type="time"
            name="horario_inicio"
            value={formTurma.horario_inicio}
            onChange={(e) =>
              setFormTurma({ ...formTurma, horario_inicio: e.target.value })
            }
            required
          />
          <input
            type="time"
            name="horario_fim"
            value={formTurma.horario_fim}
            onChange={(e) =>
              setFormTurma({ ...formTurma, horario_fim: e.target.value })
            }
            required
          />
          <input
            type="date"
            name="data_inicio"
            value={formTurma.data_inicio}
            onChange={(e) =>
              setFormTurma({ ...formTurma, data_inicio: e.target.value })
            }
            required
          />
          <input
            type="date"
            name="data_fim"
            value={formTurma.data_fim || ""}
            onChange={(e) =>
              setFormTurma({ ...formTurma, data_fim: e.target.value })
            }
          />
          <label className="flex items-center gap-2">
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
          <input
            type="text"
            name="mensalidade"
            placeholder="Mensalidade (ex: 20.00)"
            value={"R$ " + formAluno.mensalidade}
            onChange={(e) =>
              setFormAluno({
                ...formAluno,
                mensalidade: e.target.value.replace(/^R\$\s?/, ""),
              })
            }
            required
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-grafite outline-none focus:border-verde focus:ring-4 focus:ring-verde/10"

          />
          <select
            name="turma"
            value={formAluno.turma || ""}
            onChange={(e) =>
              setFormAluno({
                ...formAluno,
                turma: e.target.value ? Number(e.target.value) : undefined,
              })
            }
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-grafite outline-none focus:border-verde focus:ring-4 focus:ring-verde/10"

          >
            <option value="">Sem turma</option>
            {turmas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </select>
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
          />
          <input
            name="cpf"
            placeholder="CPF"
            value={formProfessor.cpf}
            onChange={(e) =>
              setFormProfessor({ ...formProfessor, cpf: e.target.value })
            }
            required
          />
          <input
            type="email"
            name="email"
            placeholder="E-mail"
            value={formProfessor.email}
            onChange={(e) =>
              setFormProfessor({ ...formProfessor, email: e.target.value })
            }
          />
          <input
            name="telefone"
            placeholder="Telefone"
            value={formProfessor.telefone}
            onChange={(e) =>
              setFormProfessor({ ...formProfessor, telefone: e.target.value })
            }
          />
          <select
            name="turmas"
            multiple
            value={formProfessor.turmas.map(String)}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions).map((o) =>
                Number(o.value),
              );
              setFormProfessor({ ...formProfessor, turmas: selected });
            }}
          >
            <option value="">Selecione turmas</option>
            {turmas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2">
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
      <aside className="w-64 bg-verde-escuro min-h-screen flex flex-col">
        <div className="flex h-16 items-center justify-between px-6 border-b border-white/10">
          <h2 className="font-extrabold text-white">ONG do Povo</h2>
          <button
            type="button"
            onClick={() => void encerrarSessao()}
            className="p-2 rounded-md hover:bg-white/10 transition-colors"
            aria-label="Sair"
          >
            <LogOut className="size-4" />
          </button>
        </div>

        <nav className="flex flex-col gap-2 px-6 py-8">
          {ITENS_MENU.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setScreen(id)}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 text-left font-medium transition-colors ${screen === id ? "bg-white/10 text-verde hover:bg-white/20" : "text-white/70 hover:text-white/100"}`}
            >
              <Icon className="size-4" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="ml-2 p-6 bg-mist-50">
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-verde">
            Dashboard
          </p>
          <h1 className="mt-2 text-3xl font-extrabold text-verde-escuro">
            Painel de Administração
          </h1>
          <p className="mt-2 text-grafite/70">
            Gerencie as operações da ONG do Povo.
          </p>
        </div>

        {/* PRESENÇAS */}
        {screen === "presenca" && (
          <div className="mt-6 space-y-4">
            <h3 className="text-xl font-bold text-verde">Presenças</h3>
            <p className="text-grafite/60">
              Gerencie turmas na aba <strong>Turmas</strong>, depois registre
              presença.
            </p>
          </div>
        )}

        {/* TURMAS */}
        {screen === "turmas" && (
          <div className="mt-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-verde">Turmas</h3>
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
                  <div key={t.id} className="bg-white p-4 rounded-xl shadow">
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
              <h3 className="text-xl font-bold text-verde">Alunos</h3>
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
              <div className="overflow-x-auto">
                <table className="w-full bg-white rounded-xl shadow">
                  <thead className="bg-mist-100">
                    <tr className="text-left text-grafite/70 text-sm">
                      <th className="p-3">Nome</th>
                      <th className="p-3">CPF</th>
                      <th className="p-3">Turma</th>
                      <th className="p-3">Mensalidade</th>
                      <th className="p-3">Exame</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alunos.map((a) => (
                      <tr key={a.id} className="border-t border-mist-200">
                        <td className="p-3 font-medium text-grafite">
                          {a.nome}
                        </td>
                        <td className="p-3 text-grafite/60 text-sm">
                          {a.cpf_mascarado ?? "—"}
                        </td>
                        <td className="p-3 text-grafite/60 text-sm">
                          {a.turma_nome || "—"}
                        </td>
                        <td className="p-3 text-grafite/60">
                          R$ {Number(a.mensalidade).toFixed(2)}
                        </td>
                        <td className="p-3">
                          <ExameBadge situacao={a.exame_situacao} />
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-1 rounded text-xs ${a.ativo ? "bg-verde/10 text-verde" : "bg-vermelho/10 text-vermelho"}`}
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
              <h3 className="text-xl font-bold text-verde">Professores</h3>
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
                  <div key={p.id} className="bg-white p-4 rounded-xl shadow">
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

        {/* DOAÇÕES */}
        {screen === "doacoes" && (
          <div className="mt-6 space-y-4">
            <h3 className="text-xl font-bold text-verde">Doações</h3>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl bg-white p-6 shadow">
                <p className="text-3xl font-bold text-verde">
                  R$ {doacoesResumo?.total || "0,00"}
                </p>
                <p className="text-sm text-grafite/60">Confirmadas</p>
              </div>
              <div className="rounded-xl bg-white p-6 shadow">
                <p className="text-3xl font-bold text-vermelho">
                  {doacoesAdminData?.count || 0}
                </p>
                <p className="text-sm text-grafite/60">Total</p>
              </div>
              <div className="rounded-xl bg-white p-6 shadow">
                <p className="text-3xl font-bold text-grafite">
                  {doacoesAdminData?.count || 0}
                </p>
                <p className="text-sm text-grafite/60">Total de doações</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full bg-white rounded-xl shadow">
                <thead className="bg-mist-100">
                  <tr className="text-left text-grafite/70 text-sm">
                    <th className="p-3">Doador</th>
                    <th className="p-3">Valor</th>
                    <th className="p-3">Destinação</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {doacoesAdminData?.results?.map((d) => (
                    <tr key={d.id} className="border-t border-mist-200">
                      <td className="p-3 font-medium text-grafite">
                        {d.anonimo ? "Anônimo" : d.nome}
                      </td>
                      <td className="p-3 text-grafite/60">
                        R$ {Number(d.valor).toFixed(2)}
                      </td>
                      <td className="p-3 text-grafite/60 text-sm">
                        {d.destinacao}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-1 rounded text-xs ${d.status === "CONFIRMADA" ? "bg-verde/10 text-verde" : d.status === "PENDENTE" ? "bg-amarelo/10 text-amarelo" : "bg-vermelho/10 text-vermelho"}`}
                        >
                          {d.status}
                        </span>
                      </td>
                      <td className="p-3 text-grafite/60 text-sm">
                        {new Date(d.criado_em).toLocaleDateString("pt-BR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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

// Modal reutilizável
function FormModal({
  title,
  onClose,
  onSubmit,
  submitting,
  children,
}: {
  title: string;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form
        onSubmit={onSubmit}
        className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-verde-escuro">{title}</h3>
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
  return <span className={`px-2 py-1 rounded text-xs ${classe}`}>{rotulo}</span>;
}

// Popup de confirmação (no lugar do confirm() do navegador).
function ConfirmModal({
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
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
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
