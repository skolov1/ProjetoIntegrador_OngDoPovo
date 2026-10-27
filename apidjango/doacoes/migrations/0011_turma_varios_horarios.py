"""Turma em um ou mais dias da semana, visibilidade na grade e atividades avulsas.

Ordem importa: primeiro nascem as tabelas novas, depois os horários das turmas
existentes são COPIADOS (dia_semana, horario_inicio, horario_fim -> HorarioTurma) e só
então os campos antigos saem da turma. Dá para desfazer: a volta recoloca os campos
(com um valor padrão) e copia de volta o primeiro horário de cada turma.

As turmas que já estavam ativas continuam visíveis na grade (era o comportamento até
aqui, e o site não deve esvaziar de uma hora para outra). Turmas novas começam ocultas.

Se alguma turma antiga tiver o horário de fim igual ou anterior ao de início, a
restrição nova recusa a migração: corrija o horário dessa turma antes de migrar.
"""

import datetime

import django.db.models.deletion
from django.db import migrations, models

DIAS = [
    ("SEG", "Segunda"),
    ("TER", "Terça"),
    ("QUA", "Quarta"),
    ("QUI", "Quinta"),
    ("SEX", "Sexta"),
    ("SAB", "Sábado"),
    ("DOM", "Domingo"),
]


def copiar_para_horarios(apps, schema_editor):
    Turma = apps.get_model("doacoes", "Turma")
    Horario = apps.get_model("doacoes", "HorarioTurma")
    for turma in Turma.objects.all():
        Horario.objects.create(
            turma=turma,
            dia_semana=turma.dia_semana,
            horario_inicio=turma.horario_inicio,
            horario_fim=turma.horario_fim,
        )
        if turma.ativo:
            turma.visivel_na_grade = True
            turma.save(update_fields=["visivel_na_grade"])


def copiar_de_volta(apps, schema_editor):
    Turma = apps.get_model("doacoes", "Turma")
    Horario = apps.get_model("doacoes", "HorarioTurma")
    for turma in Turma.objects.all():
        primeiro = Horario.objects.filter(turma=turma).order_by("id").first()
        if primeiro is not None:
            turma.dia_semana = primeiro.dia_semana
            turma.horario_inicio = primeiro.horario_inicio
            turma.horario_fim = primeiro.horario_fim
            turma.save(update_fields=["dia_semana", "horario_inicio", "horario_fim"])


class Migration(migrations.Migration):

    dependencies = [
        ("doacoes", "0010_emprestimo"),
    ]

    operations = [
        migrations.CreateModel(
            name="AtividadeAvulsa",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("nome", models.CharField(max_length=120, verbose_name="Nome")),
                ("dia_semana", models.CharField(blank=True, choices=DIAS, max_length=3, verbose_name="Dia da semana")),
                ("horario_inicio", models.TimeField(blank=True, null=True, verbose_name="Horário de início")),
                ("horario_fim", models.TimeField(blank=True, null=True, verbose_name="Horário de fim")),
                ("horario_texto", models.CharField(blank=True, help_text='Usado quando não há faixa de horário. Ex.: "Sob agendamento".', max_length=60, verbose_name="Texto do horário")),
                ("status", models.CharField(choices=[("ATIVO", "Ativo"), ("AGENDADO", "Agendado")], default="ATIVO", max_length=10, verbose_name="Situação")),
                ("visivel_na_grade", models.BooleanField(default=True, verbose_name="Mostrar na grade da landing")),
                ("criado_em", models.DateTimeField(auto_now_add=True, verbose_name="Criado em")),
            ],
            options={
                "verbose_name": "Atividade avulsa",
                "verbose_name_plural": "Atividades avulsas",
                "ordering": ["nome"],
            },
        ),
        migrations.CreateModel(
            name="HorarioTurma",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("dia_semana", models.CharField(choices=DIAS, max_length=3, verbose_name="Dia da semana")),
                ("horario_inicio", models.TimeField(verbose_name="Horário de início")),
                ("horario_fim", models.TimeField(verbose_name="Horário de fim")),
                ("turma", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="horarios", to="doacoes.turma", verbose_name="Turma")),
            ],
            options={
                "verbose_name": "Horário da turma",
                "verbose_name_plural": "Horários da turma",
                "ordering": ["turma", "id"],
            },
        ),
        migrations.AddField(
            model_name="turma",
            name="nome_publico",
            field=models.CharField(blank=True, help_text="Como o visitante vê a turma no site. Vazio = usa o nome da turma.", max_length=100, verbose_name="Nome na grade"),
        ),
        migrations.AddField(
            model_name="turma",
            name="visivel_na_grade",
            field=models.BooleanField(default=False, help_text="Desligado por padrão: turma interna não aparece no site.", verbose_name="Mostrar na grade da landing"),
        ),
        # Copia os horários antigos ANTES de tirar os campos da turma.
        migrations.RunPython(copiar_para_horarios, copiar_de_volta),
        # Valores padrão só para a migração poder ser desfeita (recoloca os campos).
        migrations.AlterField(
            model_name="turma",
            name="dia_semana",
            field=models.CharField(choices=DIAS, default="SEG", max_length=3, verbose_name="Dia da semana"),
        ),
        migrations.AlterField(
            model_name="turma",
            name="horario_inicio",
            field=models.TimeField(default=datetime.time(8, 0), verbose_name="Horário de início"),
        ),
        migrations.AlterField(
            model_name="turma",
            name="horario_fim",
            field=models.TimeField(default=datetime.time(9, 0), verbose_name="Horário de fim"),
        ),
        migrations.RemoveIndex(model_name="turma", name="turma_ativo_dia_idx"),
        migrations.RemoveField(model_name="turma", name="dia_semana"),
        migrations.RemoveField(model_name="turma", name="horario_fim"),
        migrations.RemoveField(model_name="turma", name="horario_inicio"),
        migrations.AlterModelOptions(
            name="turma",
            options={"ordering": ["nome"], "verbose_name": "Turma", "verbose_name_plural": "Turmas"},
        ),
        migrations.AddIndex(
            model_name="turma",
            index=models.Index(fields=["ativo", "visivel_na_grade"], name="turma_ativo_grade_idx"),
        ),
        migrations.AddConstraint(
            model_name="horarioturma",
            constraint=models.UniqueConstraint(fields=("turma", "dia_semana", "horario_inicio"), name="horario_turma_unico"),
        ),
        migrations.AddConstraint(
            model_name="horarioturma",
            constraint=models.CheckConstraint(condition=models.Q(("horario_fim__gt", models.F("horario_inicio"))), name="horario_turma_fim_depois_do_inicio"),
        ),
        migrations.AddConstraint(
            model_name="atividadeavulsa",
            constraint=models.CheckConstraint(condition=models.Q(("horario_inicio__isnull", True), ("horario_fim__isnull", True), ("horario_fim__gt", models.F("horario_inicio")), _connector="OR"), name="atividade_avulsa_fim_depois_do_inicio"),
        ),
    ]
