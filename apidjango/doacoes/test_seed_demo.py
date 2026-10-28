"""Testes do comando seed_demo: cria, não duplica e só apaga o que é dele."""

from io import StringIO

import pytest
from django.core.management import call_command

from .fabricas import criar_turma
from .models import Aluno, AtividadeAvulsa, Emprestimo, Turma

pytestmark = pytest.mark.django_db


def seed(*args):
    call_command("seed_demo", *args, stdout=StringIO())


def test_cria_dados_de_exemplo():
    seed()

    assert Turma.objects.count() == 5
    assert Aluno.objects.count() == 3
    assert Emprestimo.objects.count() == 2
    assert AtividadeAvulsa.objects.count() == 3


def test_rodar_duas_vezes_nao_duplica():
    seed()
    seed()

    assert Turma.objects.count() == 5


def test_limpar_recria_sem_tocar_em_dado_real():
    real = criar_turma("Turma real da ONG")
    seed()

    seed("--limpar")

    assert Turma.objects.count() == 6
    assert Turma.objects.filter(pk=real.pk).exists()


def test_admin_so_com_debug(settings):
    from django.contrib.auth import get_user_model
    from django.core.management.base import CommandError

    settings.DEBUG = False
    with pytest.raises(CommandError):
        seed("--com-admin")

    settings.DEBUG = True
    seed("--com-admin")
    assert get_user_model().objects.filter(username="admin", is_staff=True).exists()
