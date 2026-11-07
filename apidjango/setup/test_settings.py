"""Testes da leitura da URI do MongoDB (MONGO_URI)."""

from .settings import _uri_com_senha_codificada


def test_uri_local_sem_credenciais_nao_muda():
    uri = "mongodb://localhost:27017/ongdb"

    assert _uri_com_senha_codificada(uri) == uri


def test_senha_com_caracteres_especiais_e_codificada():
    uri = _uri_com_senha_codificada("mongodb+srv://ong:p@ss/w:rd@cluster.mongodb.net/ongdb")

    assert uri == "mongodb+srv://ong:p%40ss%2Fw%3Ard@cluster.mongodb.net/ongdb"


def test_senha_ja_codificada_continua_igual():
    uri = "mongodb+srv://ong:p%40ss@cluster.mongodb.net/ongdb?retryWrites=true"

    assert _uri_com_senha_codificada(uri) == uri


def test_espaco_e_quebra_de_linha_no_fim_sao_ignorados():
    uri = _uri_com_senha_codificada("mongodb+srv://ong:senha@cluster.mongodb.net/ongdb?w=majority\n")

    assert uri == "mongodb+srv://ong:senha@cluster.mongodb.net/ongdb?w=majority"
