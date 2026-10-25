"""Aluno passa a ter várias turmas e a mensalidade vira cálculo (R$ 20 por turma).

A turma que cada aluno já tinha é copiada para a nova lista antes de a coluna
antiga sair. A mensalidade digitada deixa de existir: passa a ser calculada.
"""

from django.db import migrations, models


def copiar_turma_para_turmas(apps, schema_editor):
    Aluno = apps.get_model("doacoes", "Aluno")
    for aluno in Aluno.objects.exclude(turma__isnull=True):
        aluno.turmas.add(aluno.turma_id)


def copiar_turmas_para_turma(apps, schema_editor):
    """Reverso: volta a primeira turma de cada aluno."""
    Aluno = apps.get_model("doacoes", "Aluno")
    for aluno in Aluno.objects.all():
        primeira = aluno.turmas.order_by("id").first()
        if primeira:
            aluno.turma_id = primeira.id
            aluno.save(update_fields=["turma"])


class Migration(migrations.Migration):

    dependencies = [
        ("doacoes", "0003_lgpd_aluno_responsavel_consentimento"),
    ]

    operations = [
        # Libera o nome `alunos` para a nova relação enquanto a antiga ainda existe.
        migrations.AlterField(
            model_name="aluno",
            name="turma",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=models.deletion.SET_NULL,
                related_name="+",
                to="doacoes.turma",
                verbose_name="Turma",
            ),
        ),
        migrations.AddField(
            model_name="aluno",
            name="turmas",
            field=models.ManyToManyField(
                blank=True, related_name="alunos", to="doacoes.turma", verbose_name="Turmas"
            ),
        ),
        migrations.RunPython(copiar_turma_para_turmas, copiar_turmas_para_turma),
        migrations.RemoveIndex(
            model_name="aluno",
            name="aluno_ativo_turma_idx",
        ),
        migrations.RemoveField(
            model_name="aluno",
            name="mensalidade",
        ),
        migrations.RemoveField(
            model_name="aluno",
            name="turma",
        ),
        migrations.AddIndex(
            model_name="aluno",
            index=models.Index(fields=["ativo"], name="aluno_ativo_idx"),
        ),
    ]
