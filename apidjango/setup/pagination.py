"""
Paginação padrão da API.

20 por página, como sempre foi. `?page_size=N` deixa o front pedir mais de uma vez
(ex.: lista de turmas para um select), com teto de 100 para ninguém pedir a tabela
inteira de uma vez.
"""

from rest_framework.pagination import PageNumberPagination


class PaginacaoPadrao(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100
