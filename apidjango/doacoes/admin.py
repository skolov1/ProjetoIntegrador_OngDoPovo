"""
Admin do Django — o back-office da equipe da ONG.

É a interface de gestão da Fase 2: filtro por status para achar o que está
pendente de conferência, busca por doador e ações em massa para confirmar.

Quando o painel em React entrar na Fase 3, este continua sendo o lugar de
digitação rápida; o painel vira leitura e visualização.
"""

from django.contrib import admin
from django.utils import timezone

from .models import Aluno, Consentimento, Doacao, Presenca, Professor, Turma


@admin.register(Doacao)
class DoacaoAdmin(admin.ModelAdmin):
    list_display = (
        "criado_em",
        "nome_exibido",
        "valor",
        "forma_pagamento",
        "destinacao",
        "status",
    )
    list_filter = ("status", "forma_pagamento", "destinacao", "anonimo", "criado_em")
    search_fields = ("nome", "email", "telefone")
    date_hierarchy = "criado_em"
    list_per_page = 25
    list_select_related = True

    # criado_em e confirmado_em são automáticos — não editáveis à mão.
    readonly_fields = ("criado_em", "confirmado_em", "nome_exibido")

    fieldsets = (
        ("Doador", {"fields": ("nome", "email", "telefone", "anonimo")}),
        ("Doação", {"fields": ("valor", "forma_pagamento", "destinacao")}),
        ("Situação", {"fields": ("status", "mensagem")}),
        ("Controle", {"fields": ("nome_exibido", "criado_em", "confirmado_em")}),
    )

    @admin.display(description="nome", ordering="nome")
    def nome_exibido(self, obj: Doacao) -> str:
        """Doadores anônimos aparecem como "Anônimo" na listagem.

        Decisão do time (04/10/2026): o dado é gravado mesmo assim, porque a
        ONG precisa emitir recibo. Aqui ele não é exibido.

        Delega para a property do model, que é a mesma que o serializer da API
        usa — assim as duas telas nunca discordam sobre o que é anônimo.
        """
        return obj.nome_exibido

    @admin.action(description="confirmar selecionadas")
    def acao_confirmar(self, request, queryset):
        """Ação em massa: marca como confirmada e carimba a data."""
        pendentes = queryset.exclude(status=Doacao.Status.CONFIRMADA)
        total = pendentes.count()

        for doacao in pendentes:
            doacao.confirmar()

        self.message_user(request, f"{total} doação(ões) confirmada(s).")

    @admin.action(description="cancelar selecionadas")
    def acao_cancelar(self, request, queryset):
        """Ação em massa: cancela o que não foi confirmada."""
        pendentes = queryset.exclude(status=Doacao.Status.CANCELADA)
        total = pendentes.count()

        for doacao in pendentes:
            doacao.status = Doacao.Status.CANCELADA
            doacao.save(update_fields=["status"])

        self.message_user(request, f"{total} doação(ões) cancelada(s).")

    @admin.action(description="carimbar confirmado_em nas confirmadas sem data")
    def acao_carimbar(self, request, queryset):
        """Repara registros confirmados que ficaram sem a data de confirmação."""
        sem_data = queryset.filter(
            status=Doacao.Status.CONFIRMADA, confirmado_em__isnull=True
        )
        total = sem_data.count()
        sem_data.update(confirmado_em=timezone.now())
        self.message_user(request, f"{total} registro(s) carimbado(s).")

    actions = ["acao_confirmar", "acao_cancelar", "acao_carimbar"]


@admin.register(Turma)
class TurmaAdmin(admin.ModelAdmin):
    list_display = (
        "nome",
        "dia_semana",
        "horario_inicio",
        "horario_fim",
        "data_inicio",
        "ativo",
        "total_alunos",
    )
    list_filter = ("ativo", "dia_semana", "data_inicio")
    search_fields = ("nome", "descricao")
    date_hierarchy = "data_inicio"
    list_per_page = 25
    list_editable = ("ativo",)
    filter_horizontal = ()

    def total_alunos(self, obj: Turma) -> int:
        return obj.alunos.filter(ativo=True).count()

    total_alunos.short_description = "Alunos ativos"


class ConsentimentoInline(admin.TabularInline):
    """Consentimentos são prova de aceite: só leitura."""

    model = Consentimento
    extra = 0
    can_delete = False
    readonly_fields = ("responsavel_nome", "versao_termo", "registrado_em")

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Aluno)
class AlunoAdmin(admin.ModelAdmin):
    list_display = (
        "nome",
        "cpf_mascarado",
        "idade",
        "turmas_lista",
        "exame_aptidao",
        "mensalidade",
        "ativo",
        "criado_em",
    )
    list_filter = (
        "ativo",
        "turmas",
        "sexo",
        "comprovante_residencia",
        "exame_aptidao",
        "criado_em",
    )
    search_fields = ("nome",)
    date_hierarchy = "criado_em"
    list_per_page = 25
    list_editable = ("ativo",)
    filter_horizontal = ("turmas",)
    inlines = (ConsentimentoInline,)
    readonly_fields = (
        "criado_em",
        "atualizado_em",
        "idade",
        "eh_maior_de_idade",
        "campos_obrigatorios_faltando",
        "mensalidade",
    )

    fieldsets = (
        (
            "Dados pessoais",
            {
                "fields": ("nome", "data_nascimento", "sexo", "rg", "cpf"),
                "description": "O CPF é só para maior de 18 anos. Menor não tem CPF próprio.",
            },
        ),
        (
            "Responsável (menor de 18 anos)",
            {
                "fields": (
                    "nome_responsavel",
                    "cpf_responsavel",
                    "rg_responsavel",
                    "telefone_responsavel",
                    "endereco_responsavel",
                ),
            },
        ),
        (
            "Documentos e exame",
            {
                "fields": (
                    "comprovante_residencia",
                    "titulo_eleitor",
                    "exame_aptidao",
                    "exame_validade",
                ),
                "description": (
                    "Só a situação (pendente/entregue). Os documentos ficam com a ONG, "
                    "no papel. Título de eleitor: só maior de idade. Exame: só menor."
                ),
            },
        ),
        (
            "Vínculo e financeiro",
            {
                "fields": ("turmas", "mensalidade_personalizada", "mensalidade", "ativo"),
                "description": (
                    "Mensalidade: R$ 20 por turma. Preencha a personalizada só para "
                    "mudar esse valor (desconto, isenção); vazia, vale o cálculo."
                ),
            },
        ),
        (
            "Controle",
            {
                "fields": (
                    "criado_em",
                    "atualizado_em",
                    "idade",
                    "eh_maior_de_idade",
                    "campos_obrigatorios_faltando",
                ),
                "classes": ("collapse",),
            },
        ),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).prefetch_related("turmas")

    @admin.display(description="Turmas")
    def turmas_lista(self, obj: Aluno) -> str:
        return ", ".join(t.nome for t in obj.turmas.all()) or "—"

    @admin.display(description="Mensalidade")
    def mensalidade(self, obj: Aluno):
        return f"R$ {obj.mensalidade:.2f}"

    @admin.display(description="CPF")
    def cpf_mascarado(self, obj: Aluno) -> str:
        return obj.cpf_mascarado or "—"


@admin.register(Presenca)
class PresencaAdmin(admin.ModelAdmin):
    list_display = (
        "data",
        "turma",
        "aluno",
        "situacao",
        "registrado_em",
        "registrado_por",
    )
    list_filter = ("situacao", "turma", "data", "registrado_por")
    search_fields = ("aluno__nome", "turma__nome", "observacao")
    date_hierarchy = "data"
    list_per_page = 50
    list_editable = ("situacao",)
    list_select_related = ("aluno", "turma")
    readonly_fields = ("registrado_em",)

    fieldsets = (
        ("Presença", {"fields": ("aluno", "turma", "data", "situacao", "observacao")}),
        ("Auditoria", {"fields": ("registrado_em", "registrado_por"), "classes": ("collapse",)}),
    )


@admin.register(Professor)
class ProfessorAdmin(admin.ModelAdmin):
    list_display = ("nome", "cpf", "email", "telefone", "ativo", "total_alunos", "criado_em")
    list_filter = ("ativo", "turmas", "criado_em")
    search_fields = ("nome", "cpf", "email")
    date_hierarchy = "criado_em"
    list_per_page = 25
    list_editable = ("ativo",)
    filter_horizontal = ("turmas",)
    readonly_fields = ("criado_em", "total_alunos")

    fieldsets = (
        ("Dados pessoais", {"fields": ("nome", "cpf", "email", "telefone")}),
        ("Vínculo", {"fields": ("turmas", "ativo")}),
        ("Controle", {"fields": ("criado_em", "total_alunos"), "classes": ("collapse",)}),
    )