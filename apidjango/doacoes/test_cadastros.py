"""
Testes das listas de turmas e professores do painel: CPF mascarado, busca só por
nome, contadores no card da turma e tamanho de página.

Rodar: pytest
"""

from datetime import date, time

import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient

from .models import Aluno, Presenca, Professor, Turma

pytestmark = pytest.mark.django_db

CPF_PROFESSOR = "52998224725"


@pytest.fixture
def staff():
    usuario = User.objects.create_user(username="gestor", password="SenhaForte@123", is_staff=True)
    cliente = APIClient()
    cliente.force_authenticate(usuario)
    return cliente


def nova_turma(nome="Futsal", **extra):
    dados = {
        "nome": nome,
        "dia_semana": "SEG",
        "horario_inicio": time(18, 0),
        "horario_fim": time(19, 0),
        "data_inicio": date(2026, 1, 1),
    }
    dados.update(extra)
    return Turma.objects.create(**dados)


class TestProfessores:
    URL = "/api/v1/professores/"

    def test_lista_traz_cpf_mascarado_e_nunca_o_completo(self, staff):
        Professor.objects.create(nome="Mestre João", cpf=CPF_PROFESSOR)

        linha = staff.get(self.URL).data["results"][0]

        assert linha["cpf_mascarado"] == "529.***.***-25"
        assert "cpf" not in linha
        assert CPF_PROFESSOR not in str(linha)

    def test_detalhe_continua_com_o_cpf_completo_para_a_edicao(self, staff):
        professor = Professor.objects.create(nome="Mestre João", cpf=CPF_PROFESSOR)

        assert staff.get(f"{self.URL}{professor.id}/").data["cpf"] == CPF_PROFESSOR

    def test_busca_e_so_por_nome(self, staff):
        Professor.objects.create(nome="Mestre João", cpf=CPF_PROFESSOR, email="joao@ong.org")

        por_nome = staff.get(self.URL, {"search": "Mestre"}).data["count"]
        por_cpf = staff.get(self.URL, {"search": CPF_PROFESSOR}).data["count"]
        por_email = staff.get(self.URL, {"search": "joao@ong.org"}).data["count"]

        assert (por_nome, por_cpf, por_email) == (1, 0, 0)

    def test_filtra_por_ativo(self, staff):
        Professor.objects.create(nome="Ativo", cpf=CPF_PROFESSOR)
        Professor.objects.create(nome="Inativo", cpf="11144477735", ativo=False)

        nomes = {r["nome"] for r in staff.get(self.URL, {"ativo": "false"}).data["results"]}

        assert nomes == {"Inativo"}


class TestTurmas:
    URL = "/api/v1/turmas/"

    def test_lista_traz_alunos_ativos_e_presencas_para_o_card(self, staff):
        turma = nova_turma()
        ativo = Aluno.objects.create(nome="Ana", data_nascimento=date(1990, 1, 1))
        inativo = Aluno.objects.create(
            nome="Bia", data_nascimento=date(1990, 1, 1), ativo=False
        )
        ativo.turmas.add(turma)
        inativo.turmas.add(turma)
        Presenca.objects.create(aluno=ativo, turma=turma, data=date(2026, 10, 1))
        Presenca.objects.create(aluno=ativo, turma=turma, data=date(2026, 10, 8))

        linha = staff.get(self.URL).data["results"][0]

        assert linha["total_alunos"] == 1
        assert linha["total_presencas"] == 2

    def test_turma_sem_nada_tem_zeros(self, staff):
        nova_turma()

        linha = staff.get(self.URL).data["results"][0]

        assert (linha["total_alunos"], linha["total_presencas"]) == (0, 0)

    def test_busca_por_nome(self, staff):
        nova_turma("Futsal")
        nova_turma("Muay Thai")

        assert staff.get(self.URL, {"search": "muay"}).data["count"] == 1


class TestTamanhoDePagina:
    def test_page_size_deixa_trazer_a_lista_toda(self, staff):
        for i in range(25):
            nova_turma(f"Turma {i:02d}")

        padrao = staff.get("/api/v1/turmas/").data
        tudo = staff.get("/api/v1/turmas/", {"page_size": 100}).data

        assert (padrao["count"], len(padrao["results"])) == (25, 20)
        assert len(tudo["results"]) == 25

    def test_page_size_tem_teto_de_100(self, staff):
        for i in range(3):
            nova_turma(f"Turma {i}")

        resposta = staff.get("/api/v1/turmas/", {"page_size": 100000})

        assert resposta.status_code == 200
        assert len(resposta.data["results"]) == 3

    def test_limite_do_teto_e_100(self):
        from setup.pagination import PaginacaoPadrao

        assert PaginacaoPadrao.max_page_size == 100
        assert PaginacaoPadrao.page_size == 20
