"""Validação e máscara de dados pessoais (CPF e telefone)."""

import re


def so_digitos(valor: str) -> str:
    return re.sub(r"\D", "", valor or "")


def cpf_valido(valor: str) -> bool:
    """Confere os dois dígitos verificadores. Rejeita sequências como 111.111.111-11."""
    cpf = so_digitos(valor)
    if len(cpf) != 11 or cpf == cpf[0] * 11:
        return False
    for tamanho in (9, 10):
        soma = sum(int(cpf[i]) * (tamanho + 1 - i) for i in range(tamanho))
        digito = (soma * 10) % 11 % 10
        if digito != int(cpf[tamanho]):
            return False
    return True


def mascarar_cpf(valor: str) -> str:
    """12345678900 -> 123.***.***-00."""
    cpf = so_digitos(valor)
    if len(cpf) != 11:
        return "***"
    return f"{cpf[:3]}.***.***-{cpf[9:]}"


def telefone_valido(valor: str) -> bool:
    """DDD + 8 ou 9 dígitos (fixo ou celular). O DDD não começa com 0."""
    numero = so_digitos(valor)
    return len(numero) in (10, 11) and numero[0] != "0"
