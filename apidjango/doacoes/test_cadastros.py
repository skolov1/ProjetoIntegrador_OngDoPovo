"""
Testes das listas de turmas e professores do painel: CPF mascarado, busca só por
nome, contadores no card da turma e tamanho de página.

Rodar: pytest
"""

from datetime import date, timedelta

import pytest
from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APIClient

from .fabricas import criar_turma
from .models import Aluno, Presenca, Professor

pytestmark = pytest.mark.django_db

CPF_PROFESSOR = "52998224725"


@pytest.fixture
def staff():
    usuario = User.objects.create_user(username="gestor", password="SenhaForte@123", is_staff=True)
    cliente = APIClient()
    cliente.force_authenticate(usuario)
    return cliente


def nova_turma(nome="Futsal", **extra):
    return criar_turma(nome, **extra)


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


class TestTurmaSemProfessor:
    """O card da turma avisa quando ela já começou e não tem professor ativo.

    É a mesma regra da grade do site e do alerta da Visão geral (ver `grade.py`).
    """

    URL = "/api/v1/turmas/"

    @staticmethod
    def hoje() -> date:
        return timezone.localdate()

    def sem_professor(self, staff, turma) -> bool:
        linhas = staff.get(self.URL, {"page_size": 100}).data["results"]
        return next(linha for linha in linhas if linha["id"] == turma.id)["sem_professor"]

    def test_turma_em_andamento_sem_professor_e_sinalizada(self, staff):
        turma = nova_turma("Futsal", data_inicio=self.hoje() - timedelta(days=5))

        assert self.sem_professor(staff, turma) is True

    def test_com_professor_ativo_nao_e_sinalizada(self, staff):
        turma = nova_turma("Futsal", data_inicio=self.hoje() - timedelta(days=5))
        Professor.objects.create(nome="Mestre", cpf=CPF_PROFESSOR).turmas.add(turma)

        assert self.sem_professor(staff, turma) is False

    def test_professor_inativo_nao_conta(self, staff):
        turma = nova_turma("Futsal", data_inicio=self.hoje() - timedelta(days=5))
        inativo = Professor.objects.create(nome="Mestre", cpf=CPF_PROFESSOR, ativo=False)
        inativo.turmas.add(turma)

        assert self.sem_professor(staff, turma) is True

    def test_turma_inativa_ou_que_ainda_nao_comecou_nao_e_sinalizada(self, staff):
        inativa = nova_turma("Parada", ativo=False, data_inicio=self.hoje() - timedelta(days=5))
        futura = nova_turma("Futura", data_inicio=self.hoje() + timedelta(days=5))

        assert self.sem_professor(staff, inativa) is False
        assert self.sem_professor(staff, futura) is False

    def test_lista_de_turmas_nao_faz_consulta_por_turma(
        self, staff, django_assert_max_num_queries
    ):
        for i in range(6):
            nova_turma(f"Turma {i}", data_inicio=self.hoje() - timedelta(days=5))

        # Número de consultas fixo, não cresce com a quantidade de turmas (sem N+1).
        with django_assert_max_num_queries(8):
            staff.get(self.URL, {"page_size": 100})


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
