"""
Testes do bloco "Eventos e serviços": endpoint público da landing e CRUD do painel.

Encerrado e oculto não aparecem no site; o painel enxerga tudo.

Rodar: pytest
"""

from datetime import date, time

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from .models import AtividadeAvulsa

pytestmark = pytest.mark.django_db

URL = "/api/v1/eventos-servicos/"
URL_PAINEL = "/api/v1/atividades-avulsas/"


def criar(**dados):
    base = {"nome": "Atendimento oftalmológico", "dia_semana": "QUI"}
    base.update(dados)
    return AtividadeAvulsa.objects.create(**base)


@pytest.fixture
def painel():
    admin = get_user_model().objects.create_user("equipe", password="x", is_staff=True)
    cliente = APIClient()
    cliente.force_authenticate(admin)
    return cliente


class TestEndpointPublico:
    def test_e_publico_e_so_leitura(self):
        assert APIClient().get(URL).status_code == 200
        assert APIClient().post(URL, {}, format="json").status_code == 405

    def test_traz_titulo_tipo_quando_horario_e_situacao(self):
        criar(tipo="SERVICO", horario_texto="Sob agendamento", status="ABERTO")

        linha = APIClient().get(URL).data[0]

        assert linha["nome"] == "Atendimento oftalmológico"
        assert linha["tipo"] == "SERVICO"
        assert linha["tipo_rotulo"] == "Serviço"
        assert linha["quando"] == "Toda quinta"
        assert linha["horario"] == "Sob agendamento"
        assert linha["status"] == "ABERTO"
        assert linha["status_rotulo"] == "Aberto"
        assert linha["chave"].startswith("evento-servico-")

    def test_data_especifica_aparece_em_formato_brasileiro(self):
        criar(nome="Feira", tipo="EVENTO", dia_semana="", data=date(2026, 12, 5))

        assert APIClient().get(URL).data[0]["quando"] == "05/12/2026"

    def test_sem_data_nem_dia_e_sob_agendamento(self):
        criar(nome="Consulta", dia_semana="")

        assert APIClient().get(URL).data[0]["quando"] == "Sob agendamento"

    def test_faixa_de_horario_e_mostrada(self):
        criar(horario_inicio=time(9, 0), horario_fim=time(11, 0))

        assert APIClient().get(URL).data[0]["horario"] == f"09:00{chr(0x2013)}11:00"

    def test_sem_horario_nenhum_fica_vazio(self):
        criar()

        assert APIClient().get(URL).data[0]["horario"] == ""

    def test_encerrado_some_do_site(self):
        criar(nome="Antigo", status="ENCERRADO")
        criar(nome="Agendado", status="AGENDADO")
        criar(nome="Aberto", status="ABERTO")

        nomes = {r["nome"] for r in APIClient().get(URL).data}

        assert nomes == {"Agendado", "Aberto"}

    def test_oculto_nao_aparece(self):
        criar(visivel_na_grade=False)

        assert APIClient().get(URL).data == []

    def test_ordem_datas_depois_recorrentes_depois_sob_agendamento(self):
        criar(nome="Sob agendamento", dia_semana="")
        criar(nome="Sexta", dia_semana="SEX")
        criar(nome="Segunda", dia_semana="SEG")
        criar(nome="Dezembro", dia_semana="", data=date(2026, 12, 5))
        criar(nome="Novembro", dia_semana="", data=date(2026, 11, 5))

        nomes = [r["nome"] for r in APIClient().get(URL).data]

        assert nomes == ["Novembro", "Dezembro", "Segunda", "Sexta", "Sob agendamento"]

    def test_nao_expoe_ids_internos(self):
        criar()

        assert set(APIClient().get(URL).data[0]) == {
            "chave",
            "nome",
            "tipo",
            "tipo_rotulo",
            "quando",
            "horario",
            "status",
            "status_rotulo",
        }

    def test_pode_ficar_um_minuto_em_cache(self):
        controle = APIClient().get(URL)["Cache-Control"]

        assert "max-age=60" in controle


class TestPainel:
    def test_exige_login_de_equipe(self):
        assert APIClient().get(URL_PAINEL).status_code in (401, 403)

    def test_painel_ve_tambem_encerrado_e_oculto(self, painel):
        criar(nome="A", status="ENCERRADO")
        criar(nome="B", visivel_na_grade=False)

        assert painel.get(URL_PAINEL).data["count"] == 2

    def test_cria_com_tipo_e_data(self, painel):
        resposta = painel.post(
            URL_PAINEL,
            {"nome": "Feira", "tipo": "EVENTO", "data": "2026-12-05", "status": "AGENDADO"},
            format="json",
        )

        assert resposta.status_code == 201
        assert resposta.data["quando"] == "05/12/2026"

    def test_padroes_sao_servico_e_aberto(self, painel):
        resposta = painel.post(URL_PAINEL, {"nome": "Consulta"}, format="json")

        assert resposta.data["tipo"] == "SERVICO"
        assert resposta.data["status"] == "ABERTO"

    def test_recusa_data_junto_com_dia_da_semana(self, painel):
        resposta = painel.post(
            URL_PAINEL,
            {"nome": "X", "data": "2026-12-05", "dia_semana": "QUI"},
            format="json",
        )

        assert resposta.status_code == 400
        assert "dia_semana" in resposta.data

    def test_recusa_a_situacao_antiga_ativo(self, painel):
        resposta = painel.post(URL_PAINEL, {"nome": "X", "status": "ATIVO"}, format="json")

        assert resposta.status_code == 400

    def test_trocar_para_data_exige_limpar_o_dia(self, painel):
        a = criar()

        resposta = painel.patch(URL_PAINEL + f"{a.id}/", {"data": "2026-12-05"}, format="json")

        assert resposta.status_code == 400
