"""Testes da leitura do banco por DATABASE_URL (usada no deploy)."""

from .settings import _banco_da_url


def test_le_usuario_senha_host_porta_e_banco():
    config = _banco_da_url("postgres://ong:segredo@db.exemplo.com:6543/ongdb")

    assert config["NAME"] == "ongdb"
    assert config["USER"] == "ong"
    assert config["PASSWORD"] == "segredo"
    assert config["HOST"] == "db.exemplo.com"
    assert config["PORT"] == "6543"
    assert "OPTIONS" not in config


def test_porta_padrao_e_sslmode_da_query():
    config = _banco_da_url("postgresql://ong:x@db.exemplo.com/ongdb?sslmode=require")

    assert config["PORT"] == "5432"
    assert config["OPTIONS"] == {"sslmode": "require"}


def test_senha_com_caracteres_especiais_e_decodificada():
    config = _banco_da_url("postgres://ong:p%40ss%2Fw%3Ard@db.exemplo.com/ongdb")

    assert config["PASSWORD"] == "p@ss/w:rd"
