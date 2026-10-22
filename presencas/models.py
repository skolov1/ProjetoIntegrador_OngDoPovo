from django.db import models
from django.contrib.auth.models import User

class Turma(models.Model):
    nome = models.CharField("Nome da Turma", max_length=100)
    descricao = models.CharField("Descrição", max_length=255, blank=True)
    data_inicio = models.DateField("Data de Início")
    data_fim = models.DateField("Data Fim", blank=True, null=True)
    ativo = models.BooleanField("Ativo", default=True)

    class Meta:
        verbose_name = "Turma"
        verbose_name_plural = "Turmas"
        ordering = ["nome"]

    def __str__(self):
        return self.nome

class Aluno(models.Model):
    # Dados pessoais
    nome = models.CharField("Nome Completo", max_length=150)
    data_nascimento = models.DateField("Data de Nascimento")
    rg = models.CharField("RG", max_length=20)
    cpf = models.CharField("CPF", max_length=20, unique=True)
    comprovante_residencia = models.ImageField(
        "Comprovante de Residência",
        upload_to='alunos/comprovantes/',
        blank=True, null=True)
    
    # Para maior de idade
    titulo_eleitor = models.CharField(
        "Título de Eleitor",
        max_length=20, blank=True, null=True)
    
    # Para menor de idade
    rg_responsavel = models.CharField(
        "RG do Responsável", max_length=20, blank=True, null=True)
    certificado_nascimento = models.ImageField(
        "Certidão de Nascimento",
        upload_to='alunos/comprovantes/',
        blank=True, null=True)
    atestado_medico = models.ImageField(
        "Atestado Médico de Aptidão Física",
        upload_to='alunos/comprovantes/',
        blank=True, null=True)
    
    # Dados comuns
    mensalidade = models.DecimalField(
        "Mensalidade", max_digits=10, decimal_places=2, default=0.00)
    ativo = models.BooleanField("Ativo", default=True)
    data_criacao = models.DateTimeField("Data de Cadastro", auto_now_add=True)
    
    class Meta:
        verbose_name = "Aluno"
        verbose_name_plural = "Alunos"
        ordering = ["nome"]
    
    def __str__(self):
        return f"{self.nome} ({self.data_nascimento.strftime('%d/%m/%Y')})"
    
    @property
    def eh_maior_de_idade(self):
        """Verifica se o aluno é maior de 18 anos."""
        from datetime import date
        hoje = date.today()
        idade = hoje.year - self.data_nascimento.year - \
                ((hoje.month, hoje.month) < (self.data_nascimento.month, self.data_nascimento.day))
        return idade >= 18

class Presenca(models.Model):
    STATUS_CHOICES = [
        ('presente', 'Presente'),
        ('ausente', 'Ausente'),
        ('justificado', 'Justificado'),
    ]
    
    aluno = models.ForeignKey(Aluno, on_delete=models.CASCADE, verbose_name="Aluno")
    turma = models.ForeignKey(Turma, on_delete=models.CASCADE, verbose_name="Turma")
    data = models.DateField("Data da Aula")
    situacao = models.CharField("Situação", max_length=20, choices=STATUS_CHOICES, default='presente')
    data_registro = models.DateTimeField("Data do Registro", auto_now_add=True)
    
    class Meta:
        verbose_name = "Presença"
        verbose_name_plural = "Presenças"
        ordering = ["-data"]
        unique_together = [['aluno', 'turma', 'data']]
    
    def __str__(self):
        return f"{self.aluno.nome} - {self.data.strftime('%d/%m/%Y')} - {self.get_situacao_display()}"
    
    @property
    def eh_presente(self):
        return self.situacao == 'presente'
