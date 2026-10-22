"""
Modelo de doação.

Fluxo real: quem doar preenche o formulário do site, o registro nasce como
PENDENTE e a equipe confere no extrato antes de marcar como CONFIRMADA.

Uma ONG que recebe PIX não tem como o sistema sozinho saber se o dinheiro caiu —
alguém precisa olhar. Por isso o status existe e por isso ele é setado **no
servidor**, nunca vindo do formulário público.
"""

from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone


class Doacao(models.Model):
    class Status(models.TextChoices):
        PENDENTE = "PENDENTE", "Pendente"
        CONFIRMADA = "CONFIRMADA", "Confirmada"
        CANCELADA = "CANCELADA", "Cancelada"

    class FormaPagamento(models.TextChoices):
        PIX = "PIX", "Pix"
        DINHEIRO = "DINHEIRO", "Dinheiro"
        CARTAO = "CARTAO", "Cartão"
        TRANSFERENCIA = "TRANSFERENCIA", "Transferência"

    class Destinacao(models.TextChoices):
        """Causa escolhida pelo doador.

        Existe para que o painel da Fase 3 consiga agrupar a captação por
        finalidade. Começou como choices fixos em vez de um modelo Campanha
        separado porque resolve o agrupamento com uma linha e não trava o
        desenho — se virar campanha com meta e prazo, o modelo é aditivo.
        """

        GERAL = "GERAL", "Onde mais precisar"
        MATERIAL = "MATERIAL", "Material esportivo"
        INFRAESTRUTURA = "INFRAESTRUTURA", "Infraestrutura da sede"
        ALIMENTACAO = "ALIMENTACAO", "Alimentação e eventos"

    # --- Quem doou -------------------------------------------------------
    nome = models.CharField("nome", max_length=150)
    email = models.EmailField("e-mail")
    telefone = models.CharField("telefone", max_length=20, blank=True)

    # Decisao do time (04/10/2026): o dado e gravado mesmo quando anonimo,
    # porque a ONG precisa poder emitir recibo depois. Em troca, nenhum endpoint
    # publico expoe dado pessoal. Ver DoacaoPublicSerializer.
    anonimo = models.BooleanField("doação anônima", default=False)

    # --- O que foi doado -------------------------------------------------
    valor = models.DecimalField(
        "valor",
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("1.00"))],
    )
    forma_pagamento = models.CharField(
        "forma de pagamento", max_length=20, choices=FormaPagamento.choices
    )
    destinacao = models.CharField(
        "destinação", max_length=20, choices=Destinacao.choices, default=Destinacao.GERAL
    )

    # --- Situacao --------------------------------------------------------
    # O status e SEMPRE PENDENTE na criacao. Ver DoacaoPublicCreateSerializer.
    status = models.CharField(
        "status", max_length=20, choices=Status.choices, default=Status.PENDENTE
    )
    mensagem = models.TextField("mensagem", blank=True)

    criado_em = models.DateTimeField("criado em", auto_now_add=True)
    confirmado_em = models.DateTimeField("confirmado em", null=True, blank=True)

    class Meta:
        verbose_name = "Doação"
        verbose_name_plural = "Doações"
        ordering = ["-criado_em"]
        indexes = [
            # É a query que o painel da Fase 3 roda: confirmadas por período.
            models.Index(fields=["status", "-criado_em"], name="doacao_status_criado_idx"),
            models.Index(fields=["destinacao"], name="doacao_destinacao_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.nome_exibido} — R$ {self.valor}"

    @property
    def nome_exibido(self) -> str:
        """Nome para exibição na listagem do admin."""
        return "Anônimo" if self.anonimo else self.nome

    def confirmar(self) -> None:
        """Marca como confirmada e carimba a data."""
        self.status = self.Status.CONFIRMADA
        self.confirmado_em = timezone.now()
        self.save(update_fields=["status", "confirmado_em"])

    def cancelar(self) -> None:
        self.status = self.Status.CANCELADA
        self.save(update_fields=["status"])


# =============================================================================
# Modelos de Presença / Alunos / Turmas / Professores
# =============================================================================


class Turma(models.Model):
    """Turma com horário fixo (ex.: 'Futsal Sub-12 - Terça 18h')."""

    class DiaSemana(models.TextChoices):
        SEGUNDA = "SEG", "Segunda"
        TERCA = "TER", "Terça"
        QUARTA = "QUA", "Quarta"
        QUINTA = "QUI", "Quinta"
        SEXTA = "SEX", "Sexta"
        SABADO = "SAB", "Sábado"
        DOMINGO = "DOM", "Domingo"

    nome = models.CharField("Nome da turma", max_length=100)
    descricao = models.CharField("Descrição", max_length=255, blank=True)
    dia_semana = models.CharField("Dia da semana", max_length=3, choices=DiaSemana.choices)
    horario_inicio = models.TimeField("Horário de início")
    horario_fim = models.TimeField("Horário de fim")
    data_inicio = models.DateField("Data de início")
    data_fim = models.DateField("Data de fim", blank=True, null=True)
    ativo = models.BooleanField("Ativo", default=True)
    criado_em = models.DateTimeField("Criado em", auto_now_add=True)

    class Meta:
        verbose_name = "Turma"
        verbose_name_plural = "Turmas"
        ordering = ["dia_semana", "horario_inicio", "nome"]
        indexes = [
            models.Index(fields=["ativo", "dia_semana"], name="turma_ativo_dia_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.nome} ({self.get_dia_semana_display()} {self.horario_inicio.strftime('%H:%M')})"

    @property
    def horario_formatado(self) -> str:
        return f"{self.get_dia_semana_display()} {self.horario_inicio.strftime('%H:%M')}–{self.horario_fim.strftime('%H:%M')}"


class Aluno(models.Model):
    """Aluno com campos diferenciados por idade (maior/menor)."""

    class Sexo(models.TextChoices):
        MASCULINO = "M", "Masculino"
        FEMININO = "F", "Feminino"
        OUTRO = "O", "Outro"
        NAO_INFORMAR = "N", "Prefiro não informar"

    # --- Dados pessoais ---
    nome = models.CharField("Nome completo", max_length=150)
    data_nascimento = models.DateField("Data de nascimento")
    sexo = models.CharField("Sexo", max_length=1, choices=Sexo.choices, default=Sexo.NAO_INFORMAR)
    rg = models.CharField("RG", max_length=20)
    cpf = models.CharField("CPF", max_length=14, unique=True)
    comprovante_residencia = models.ImageField(
        "Comprovante de residência",
        upload_to="alunos/comprovantes/",
        blank=True,
        null=True,
    )

    # --- Maior de idade ---
    titulo_eleitor = models.CharField(
        "Título de eleitor", max_length=20, blank=True, null=True
    )

    # --- Menor de idade (responsável) ---
    rg_responsavel = models.CharField(
        "RG do responsável", max_length=20, blank=True, null=True
    )
    certificado_nascimento = models.ImageField(
        "Certidão de nascimento",
        upload_to="alunos/comprovantes/",
        blank=True,
        null=True,
    )
    atestado_medico = models.ImageField(
        "Atestado médico de aptidão física",
        upload_to="alunos/comprovantes/",
        blank=True,
        null=True,
    )

    # --- Comuns ---
    mensalidade = models.DecimalField(
        "Mensalidade", max_digits=10, decimal_places=2, default=0.00
    )
    turma = models.ForeignKey(
        Turma,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="alunos",
        verbose_name="Turma",
    )
    ativo = models.BooleanField("Ativo", default=True)
    criado_em = models.DateTimeField("Cadastrado em", auto_now_add=True)
    atualizado_em = models.DateTimeField("Atualizado em", auto_now=True)

    class Meta:
        verbose_name = "Aluno"
        verbose_name_plural = "Alunos"
        ordering = ["nome"]
        indexes = [
            models.Index(fields=["ativo", "turma"], name="aluno_ativo_turma_idx"),
            models.Index(fields=["cpf"], name="aluno_cpf_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.nome} ({self.data_nascimento.strftime('%d/%m/%Y')})"

    @property
    def idade(self) -> int:
        """Idade atual em anos."""
        from datetime import date

        hoje = date.today()
        return (
            hoje.year
            - self.data_nascimento.year
            - (
                (hoje.month, hoje.day)
                < (self.data_nascimento.month, self.data_nascimento.day)
            )
        )

    @property
    def eh_maior_de_idade(self) -> bool:
        return self.idade >= 18

    @property
    def campos_obrigatorios_faltando(self) -> list[str]:
        """Retorna lista de campos obrigatórios que estão vazios conforme a idade."""
        faltando = []
        if not self.rg:
            faltando.append("RG")
        if not self.cpf:
            faltando.append("CPF")
        if not self.comprovante_residencia:
            faltando.append("Comprovante de residência")
        if self.eh_maior_de_idade:
            if not self.titulo_eleitor:
                faltando.append("Título de eleitor")
        else:
            if not self.rg_responsavel:
                faltando.append("RG do responsável")
            if not self.certificado_nascimento:
                faltando.append("Certidão de nascimento")
            if not self.atestado_medico:
                faltando.append("Atestado médico")
        return faltando


class Presenca(models.Model):
    """Registro de presença do aluno na turma em uma data."""

    class Situacao(models.TextChoices):
        PRESENTE = "PRESENTE", "Presente"
        AUSENTE = "AUSENTE", "Ausente"
        JUSTIFICADO = "JUSTIFICADO", "Justificado"

    aluno = models.ForeignKey(
        Aluno, on_delete=models.CASCADE, related_name="presencas", verbose_name="Aluno"
    )
    turma = models.ForeignKey(
        Turma, on_delete=models.CASCADE, related_name="presencas", verbose_name="Turma"
    )
    data = models.DateField("Data da aula")
    situacao = models.CharField(
        "Situação", max_length=20, choices=Situacao.choices, default=Situacao.PRESENTE
    )
    observacao = models.CharField("Observação", max_length=255, blank=True)
    registrado_em = models.DateTimeField("Registrado em", auto_now_add=True)
    registrado_por = models.CharField("Registrado por", max_length=100, blank=True)

    class Meta:
        verbose_name = "Presença"
        verbose_name_plural = "Presenças"
        ordering = ["-data", "aluno__nome"]
        unique_together = [["aluno", "turma", "data"]]
        indexes = [
            models.Index(fields=["turma", "data"], name="presenca_turma_data_idx"),
            models.Index(fields=["aluno", "data"], name="presenca_aluno_data_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.aluno.nome} – {self.data.strftime('%d/%m/%Y')} – {self.get_situacao_display()}"


class Professor(models.Model):
    """Professor/Instrutor responsável por turmas."""

    nome = models.CharField("Nome completo", max_length=150)
    cpf = models.CharField("CPF", max_length=14, unique=True)
    email = models.EmailField("E-mail", blank=True)
    telefone = models.CharField("Telefone", max_length=20, blank=True)
    turmas = models.ManyToManyField(
        Turma,
        blank=True,
        related_name="professores",
        verbose_name="Turmas",
    )
    ativo = models.BooleanField("Ativo", default=True)
    criado_em = models.DateTimeField("Criado em", auto_now_add=True)

    class Meta:
        verbose_name = "Professor"
        verbose_name_plural = "Professores"
        ordering = ["nome"]

    def __str__(self) -> str:
        return self.nome

    @property
    def total_alunos(self) -> int:
        """Total de alunos ativos nas turmas deste professor."""
        return Aluno.objects.filter(turma__in=self.turmas.all(), ativo=True).distinct().count()
