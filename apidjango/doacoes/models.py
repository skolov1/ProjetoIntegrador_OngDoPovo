"""
Modelo de doação.

Fluxo real: quem doar preenche o formulário do site, o registro nasce como
PENDENTE e a equipe confere no extrato antes de marcar como CONFIRMADA.

Uma ONG que recebe PIX não tem como o sistema sozinho saber se o dinheiro caiu —
alguém precisa olhar. Por isso o status existe e por isso ele é setado **no
servidor**, nunca vindo do formulário público.
"""

from datetime import date
from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone

from .documentos import mascarar_cpf

# Versão do termo de tratamento de dados que o responsável aceita no cadastro.
# Ao mudar o texto do termo, aumente a versão: o consentimento guarda qual foi aceito.
VERSAO_TERMO = "1.0"

# Cada turma em que o aluno está matriculado custa este valor por mês.
MENSALIDADE_POR_TURMA = Decimal("20.00")


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


class DoacaoItem(models.Model):
    """Doação de item físico registrada pela equipe no painel.

    Os itens são os que a página do site pede além do PIX. Dinheiro não entra
    aqui: o PIX a ONG confere no extrato do banco.
    """

    class Item(models.TextChoices):
        ALIMENTOS = "ALIMENTOS", "Alimentos não perecíveis"
        CADEIRA_RODAS = "CADEIRA_RODAS", "Cadeira de rodas"
        MULETAS = "MULETAS", "Muletas"
        CADEIRA_BANHO = "CADEIRA_BANHO", "Cadeira de banho"
        OUTRO = "OUTRO", "Outro"

    item = models.CharField("item", max_length=20, choices=Item.choices)
    # Só quando item = OUTRO: o que foi doado, escrito pela equipe.
    item_descricao = models.CharField("descrição do item", max_length=100, blank=True)
    quantidade = models.PositiveIntegerField(
        "quantidade", default=1, validators=[MinValueValidator(1)]
    )
    # Só o necessário: o nome é opcional (vazio = doador anônimo).
    doador_nome = models.CharField("doador", max_length=150, blank=True)
    recebido_em = models.DateField("recebido em", default=timezone.localdate)
    observacao = models.CharField("observação", max_length=255, blank=True)
    criado_em = models.DateTimeField("registrado em", auto_now_add=True)

    class Meta:
        verbose_name = "Doação de item"
        verbose_name_plural = "Doações de itens"
        ordering = ["-recebido_em", "-criado_em"]
        indexes = [models.Index(fields=["item"], name="doacaoitem_item_idx")]

    def __str__(self) -> str:
        return f"{self.quantidade}x {self.item_exibido} - {self.doador_exibido}"

    @property
    def item_exibido(self) -> str:
        """Nome do item; para OUTRO, o que a equipe escreveu."""
        if self.item == self.Item.OUTRO and self.item_descricao:
            return self.item_descricao
        return self.get_item_display()

    @property
    def doador_exibido(self) -> str:
        return self.doador_nome or "Anônimo"


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
    """Aluno. Menor de idade não tem CPF próprio: o CPF fica no responsável.

    Por LGPD o sistema guarda só o necessário: nenhum arquivo, imagem ou número de
    documento. Comprovante de residência, título de eleitor e exame de aptidão
    física são só etiquetas de situação (o exame tem também a validade); os
    documentos em si ficam com a ONG, no papel.
    """

    class Sexo(models.TextChoices):
        MASCULINO = "M", "Masculino"
        FEMININO = "F", "Feminino"
        OUTRO = "O", "Outro"
        NAO_INFORMAR = "N", "Prefiro não informar"

    class ExameAptidao(models.TextChoices):
        PENDENTE = "pendente", "Pendente"
        APTO = "apto", "Apto"
        NAO_APTO = "nao_apto", "Não apto"

    # --- Dados pessoais ---
    nome = models.CharField("Nome completo", max_length=150)
    data_nascimento = models.DateField("Data de nascimento")
    sexo = models.CharField("Sexo", max_length=1, choices=Sexo.choices, default=Sexo.NAO_INFORMAR)
    rg = models.CharField("RG ou certidão de nascimento", max_length=20, blank=True)
    # Só para maior de idade. Vazio (NULL) para menor; NULL não conflita com unique.
    cpf = models.CharField("CPF", max_length=14, unique=True, blank=True, null=True)

    class DocumentoSituacao(models.TextChoices):
        PENDENTE = "pendente", "Pendente"
        ENTREGUE = "entregue", "Entregue"

    # --- Documentos (só a situação, sem arquivo nem número) ---
    comprovante_residencia = models.CharField(
        "Comprovante de residência",
        max_length=10,
        choices=DocumentoSituacao.choices,
        default=DocumentoSituacao.PENDENTE,
    )
    # Só se aplica a maior de idade.
    titulo_eleitor = models.CharField(
        "Título de eleitor",
        max_length=10,
        choices=DocumentoSituacao.choices,
        default=DocumentoSituacao.PENDENTE,
    )

    # --- Responsável (obrigatório para menor de 18 anos) ---
    nome_responsavel = models.CharField("Nome do responsável", max_length=150, blank=True)
    cpf_responsavel = models.CharField("CPF do responsável", max_length=14, blank=True)
    rg_responsavel = models.CharField("RG do responsável", max_length=20, blank=True, default="")
    telefone_responsavel = models.CharField("Telefone do responsável", max_length=20, blank=True)
    endereco_responsavel = models.CharField("Endereço do responsável", max_length=255, blank=True)

    # --- Exame de aptidão física (vale para menores) ---
    exame_aptidao = models.CharField(
        "Exame de aptidão física",
        max_length=10,
        choices=ExameAptidao.choices,
        default=ExameAptidao.PENDENTE,
    )
    exame_validade = models.DateField("Validade do exame", blank=True, null=True)

    # --- Comuns ---
    turmas = models.ManyToManyField(
        Turma,
        blank=True,
        related_name="alunos",
        verbose_name="Turmas",
    )
    # Valor combinado com a ONG (desconto, isenção...). Vazio = usa o cálculo por turma.
    mensalidade_personalizada = models.DecimalField(
        "Mensalidade personalizada",
        max_digits=10,
        decimal_places=2,
        blank=True,
        null=True,
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    ativo = models.BooleanField("Ativo", default=True)
    criado_em = models.DateTimeField("Cadastrado em", auto_now_add=True)
    atualizado_em = models.DateTimeField("Atualizado em", auto_now=True)

    class Meta:
        verbose_name = "Aluno"
        verbose_name_plural = "Alunos"
        ordering = ["nome"]
        indexes = [
            models.Index(fields=["ativo"], name="aluno_ativo_idx"),
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
    def mensalidade_calculada(self) -> Decimal:
        """Valor por turma x turmas do aluno."""
        # `.all()` aproveita o prefetch da listagem e evita uma consulta por aluno.
        return MENSALIDADE_POR_TURMA * len(self.turmas.all())

    @property
    def mensalidade(self) -> Decimal:
        """O que o aluno paga: o valor personalizado, se houver, senão o calculado."""
        if self.mensalidade_personalizada is not None:
            return self.mensalidade_personalizada
        return self.mensalidade_calculada

    @property
    def cpf_mascarado(self) -> str | None:
        """CPF para listagens (123.***.***-00). Menor não tem CPF para exibir."""
        if not self.cpf or not self.eh_maior_de_idade:
            return None
        return mascarar_cpf(self.cpf)

    @property
    def exame_situacao(self) -> str | None:
        """Situação do exame para sinalizar na tela. Só vale para menores.

        `ausente` (pendente), `vencido`, `nao_apto` ou `valido`.
        """
        if self.eh_maior_de_idade:
            return None
        if self.exame_aptidao == self.ExameAptidao.PENDENTE:
            return "ausente"
        if self.exame_aptidao == self.ExameAptidao.NAO_APTO:
            return "nao_apto"
        if self.exame_validade and self.exame_validade < date.today():
            return "vencido"
        return "valido"

    @property
    def documentos_pendentes(self) -> list[str]:
        """Documentos ainda não entregues. Título de eleitor só conta para maior de idade."""
        pendentes = []
        if self.comprovante_residencia == self.DocumentoSituacao.PENDENTE:
            pendentes.append("Comprovante de residência")
        if self.eh_maior_de_idade and self.titulo_eleitor == self.DocumentoSituacao.PENDENTE:
            pendentes.append("Título de eleitor")
        return pendentes

    @property
    def campos_obrigatorios_faltando(self) -> list[str]:
        """Retorna lista de campos obrigatórios que estão vazios conforme a idade."""
        faltando = self.documentos_pendentes
        if not self.eh_maior_de_idade:
            if not self.nome_responsavel:
                faltando.append("Nome do responsável")
            if not self.cpf_responsavel:
                faltando.append("CPF do responsável")
            if not self.telefone_responsavel:
                faltando.append("Telefone do responsável")
            if self.exame_aptidao == self.ExameAptidao.PENDENTE:
                faltando.append("Exame de aptidão física")
            if not self.consentimentos.exists():
                faltando.append("Consentimento do responsável")
        return faltando


class Consentimento(models.Model):
    """Registro de que o responsável autorizou o tratamento dos dados do menor.

    Guarda o nome do responsável no momento do aceite e a versão do termo, para
    comprovar o que foi aceito mesmo se o cadastro mudar depois.
    """

    aluno = models.ForeignKey(
        Aluno, on_delete=models.CASCADE, related_name="consentimentos", verbose_name="Aluno"
    )
    responsavel_nome = models.CharField("Responsável", max_length=150)
    versao_termo = models.CharField("Versão do termo", max_length=20, default=VERSAO_TERMO)
    registrado_em = models.DateTimeField("Registrado em", auto_now_add=True)

    class Meta:
        verbose_name = "Consentimento"
        verbose_name_plural = "Consentimentos"
        ordering = ["-registrado_em"]

    def __str__(self) -> str:
        return f"{self.aluno.nome} - termo {self.versao_termo} - {self.registrado_em:%d/%m/%Y}"


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
        return Aluno.objects.filter(turmas__in=self.turmas.all(), ativo=True).distinct().count()
