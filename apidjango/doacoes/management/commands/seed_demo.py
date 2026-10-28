"""Dados de exemplo para desenvolver e demonstrar o sistema.

    python manage.py seed_demo                # turmas, alunos, professores, doações, eventos
    python manage.py seed_demo --com-admin    # e cria o usuário admin/admin (só com DEBUG)
    python manage.py seed_demo --limpar       # apaga o que o seed criou e cria de novo

Tudo é fictício. O que o seed cria leva o prefixo "[Demo]" no nome, e é só isso que o
`--limpar` apaga: dado real cadastrado no painel nunca é tocado. Rodar duas vezes sem
`--limpar` não duplica nada.
"""

from datetime import date, time, timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from doacoes.fabricas import criar_turma
from doacoes.models import (
    Aluno,
    AtividadeAvulsa,
    Consentimento,
    DoacaoItem,
    Emprestimo,
    Presenca,
    Professor,
    Turma,
)

PREFIXO = "[Demo] "


def cpf_valido(base: str) -> str:
    """Completa 9 dígitos com os dois verificadores (CPF fictício, mas válido)."""
    digitos = [int(c) for c in base]
    for tamanho in (9, 10):
        soma = sum(d * (tamanho + 1 - i) for i, d in enumerate(digitos[:tamanho]))
        digitos.append((soma * 10 % 11) % 10)
    return "".join(map(str, digitos))


class Command(BaseCommand):
    help = "Cria dados fictícios de exemplo (turmas, alunos, doações, eventos)."

    def add_arguments(self, parser):
        parser.add_argument("--limpar", action="store_true", help="Apaga o seed antes de criar.")
        parser.add_argument(
            "--com-admin",
            action="store_true",
            help="Cria o usuário admin/admin (só com DJANGO_DEBUG ligado).",
        )

    @transaction.atomic
    def handle(self, *args, **opcoes):
        if opcoes["limpar"]:
            self.limpar()
        if Turma.objects.filter(nome__startswith=PREFIXO).exists():
            self.stdout.write("O seed já está no banco. Use --limpar para recriar.")
        else:
            self.criar()
        if opcoes["com_admin"]:
            self.criar_admin()

    def limpar(self):
        Emprestimo.objects.filter(pessoa_nome__startswith=PREFIXO).delete()
        DoacaoItem.objects.filter(doador_nome__startswith=PREFIXO).delete()
        AtividadeAvulsa.objects.filter(nome__startswith=PREFIXO).delete()
        Aluno.objects.filter(nome__startswith=PREFIXO).delete()  # leva presença e consentimento
        Professor.objects.filter(nome__startswith=PREFIXO).delete()
        Turma.objects.filter(nome__startswith=PREFIXO).delete()
        self.stdout.write("Seed anterior apagado.")

    def criar_admin(self):
        if not settings.DEBUG:
            raise CommandError("--com-admin só roda com DJANGO_DEBUG ligado.")
        usuario, novo = get_user_model().objects.get_or_create(
            username="admin",
            defaults={
                "is_staff": True,
                "is_superuser": True,
                "first_name": "Admin",
                "last_name": "Local",
                "email": "admin@example.com",
            },
        )
        if novo:
            usuario.set_password("admin")
            usuario.save()
        self.stdout.write(
            "Usuário admin criado (senha admin)." if novo else "Usuário admin já existia."
        )

    def criar(self):
        hoje = timezone.localdate()
        inicio = hoje - timedelta(days=60)

        muay = criar_turma(
            f"{PREFIXO}Muay Thai Adulto",
            horarios=[("SEG", time(19, 30), time(20, 30)), ("QUA", time(19, 30), time(20, 30))],
            data_inicio=inicio,
            visivel_na_grade=True,
            nome_publico="Muay Thai Adulto",
        )
        futsal = criar_turma(
            f"{PREFIXO}Futsal Sub-10",
            "TER",
            time(14, 0),
            time(15, 0),
            data_inicio=inicio,
            visivel_na_grade=True,
            nome_publico="Futsal Sub-10",
        )
        # Sem professor vinculado: aparece na grade como "Procuramos professor".
        criar_turma(
            f"{PREFIXO}Ballet Infantil",
            "SEX",
            time(9, 0),
            time(10, 0),
            data_inicio=inicio,
            visivel_na_grade=True,
            nome_publico="Ballet Infantil",
        )
        # Começa no futuro: "Agendado".
        criar_turma(
            f"{PREFIXO}Jazz",
            "SAB",
            time(10, 0),
            time(11, 0),
            data_inicio=hoje + timedelta(days=14),
            visivel_na_grade=True,
            nome_publico="Jazz",
        )
        # Turma interna: não vai para o site.
        criar_turma(
            f"{PREFIXO}Reforço interno", "QUI", time(16, 0), time(17, 0), data_inicio=inicio
        )

        mestre = Professor.objects.create(
            nome=f"{PREFIXO}Mestre João", cpf=cpf_valido("111444777"), telefone="(13) 90000-0001"
        )
        mestre.turmas.add(muay)
        carla = Professor.objects.create(
            nome=f"{PREFIXO}Professora Carla",
            cpf=cpf_valido("222333444"),
            email="carla@example.com",
        )
        carla.turmas.add(futsal)

        ana = Aluno.objects.create(
            nome=f"{PREFIXO}Ana Souza Lima",
            data_nascimento=date(1995, 3, 12),
            sexo=Aluno.Sexo.FEMININO,
            cpf=cpf_valido("333555777"),
        )
        ana.turmas.add(muay)
        pedro = Aluno.objects.create(
            nome=f"{PREFIXO}Pedro Santos",
            data_nascimento=hoje - timedelta(days=365 * 9),
            sexo=Aluno.Sexo.MASCULINO,
            nome_responsavel="Marta Santos",
            cpf_responsavel=cpf_valido("444666888"),
            telefone_responsavel="(13) 90000-0002",
            exame_aptidao=Aluno.ExameAptidao.APTO,
            exame_validade=hoje + timedelta(days=200),
        )
        pedro.turmas.add(futsal)
        Consentimento.objects.create(aluno=pedro, responsavel_nome="Marta Santos")
        lia = Aluno.objects.create(
            nome=f"{PREFIXO}Lia Ferreira",
            data_nascimento=hoje - timedelta(days=365 * 8),
            sexo=Aluno.Sexo.FEMININO,
            nome_responsavel="Paulo Ferreira",
            cpf_responsavel=cpf_valido("555777999"),
            telefone_responsavel="(13) 90000-0003",
        )
        lia.turmas.add(futsal)
        Consentimento.objects.create(aluno=lia, responsavel_nome="Paulo Ferreira")

        # Ana e Pedro presentes nas últimas aulas; Lia com 3 faltas seguidas (faltante).
        for semanas in (3, 2, 1):
            dia = hoje - timedelta(weeks=semanas)
            situacao = Presenca.Situacao
            Presenca.objects.create(aluno=ana, turma=muay, data=dia, situacao=situacao.PRESENTE)
            Presenca.objects.create(aluno=pedro, turma=futsal, data=dia, situacao=situacao.PRESENTE)
            Presenca.objects.create(aluno=lia, turma=futsal, data=dia, situacao=situacao.AUSENTE)

        DoacaoItem.objects.create(
            item=DoacaoItem.Item.ALIMENTOS,
            quantidade=30,
            doador_nome=f"{PREFIXO}Mercado do Bairro",
        )
        cadeira = DoacaoItem.objects.create(
            item=DoacaoItem.Item.CADEIRA_RODAS,
            quantidade=2,
            doador_nome=f"{PREFIXO}Maria Oliveira",
        )
        DoacaoItem.objects.create(
            item=DoacaoItem.Item.MULETAS, quantidade=4, doador_nome=f"{PREFIXO}Anônimo"
        )
        Emprestimo.objects.create(
            doacao=cadeira,
            quantidade=1,
            pessoa_nome=f"{PREFIXO}Seu João",
            emprestado_em=hoje - timedelta(days=20),
        )
        # Passou de 3 meses: aparece como atrasado.
        Emprestimo.objects.create(
            doacao=cadeira,
            quantidade=1,
            pessoa_nome=f"{PREFIXO}Dona Rita",
            emprestado_em=hoje - timedelta(days=120),
        )

        AtividadeAvulsa.objects.create(
            nome=f"{PREFIXO}Atendimento oftalmológico",
            tipo=AtividadeAvulsa.Tipo.SERVICO,
            dia_semana="QUI",
            horario_texto="Sob agendamento",
        )
        AtividadeAvulsa.objects.create(
            nome=f"{PREFIXO}Campanha do agasalho",
            tipo=AtividadeAvulsa.Tipo.CAMPANHA,
            data=hoje + timedelta(days=21),
            status=AtividadeAvulsa.Status.AGENDADO,
        )
        AtividadeAvulsa.objects.create(
            nome=f"{PREFIXO}Festival de encerramento",
            tipo=AtividadeAvulsa.Tipo.EVENTO,
            data=hoje - timedelta(days=30),
            status=AtividadeAvulsa.Status.ENCERRADO,
        )
        self.stdout.write(
            self.style.SUCCESS(
                "Seed criado: 5 turmas, 3 alunos, 2 professores, doações, empréstimos e eventos."
            )
        )
