"""
Serializers da doação e presença.

**Três serializers separados porque são três públicos com permissões diferentes.**
Misturar em um só é como se faz o erro clássico: um ViewSet único com
`IsAuthenticatedOrReadOnly` deixa qualquer visitante mandar
`{"valor": 1000, "status": "CONFIRMADA"}` e fabricar a própria doação.
"""

from rest_framework import serializers

from .models import Aluno, Doacao, Presenca, Professor, Turma


# =============================================================================
# Doação
# =============================================================================


class DoacaoPublicCreateSerializer(serializers.ModelSerializer):
    """Entrada do formulário público.

    Note que `status`, `confirmado_em` e `criado_em` **nao estao** em `fields`.
    Nao e que sejam `read_only`: eles simplesmente nao existem para o cliente.
    Assim nao existe caminho para o doador se auto-declarar confirmado.
    """

    class Meta:
        model = Doacao
        fields = [
            "nome",
            "email",
            "telefone",
            "anonimo",
            "valor",
            "forma_pagamento",
            "destinacao",
            "mensagem",
        ]
        extra_kwargs = {
            "nome": {"label": "Nome"},
            "email": {"label": "E-mail"},
            "telefone": {"label": "Telefone"},
            "anonimo": {"label": "Doação anônima"},
            "valor": {"label": "Valor", "help_text": "Em reais. Mínimo R$ 1,00."},
            "forma_pagamento": {"label": "Forma de pagamento"},
            "destinacao": {"label": "Destinação"},
            "mensagem": {"label": "Mensagem", "required": False},
        }

    def validate_nome(self, valor: str) -> str:
        if len(valor.strip()) < 3:
            raise serializers.ValidationError("Informe o nome completo.")
        return valor.strip()


class DoacaoPublicSerializer(serializers.ModelSerializer):
    """Leitura pública — **zero dado pessoal**.

    Nem doador anônimo, nem identificado: este serializer não tem acesso a
    nome, email ou telefone, então nenhum endpoint que o use pode vazar nada.
    Serve para a seção de impacto e, no futuro, o painel da Fase 3.
    """

    class Meta:
        model = Doacao
        fields = ["id", "valor", "destinacao", "criado_em"]
        read_only_fields = fields


class DoacaoAdminSerializer(serializers.ModelSerializer):
    """CRUD da equipe — único serializer com dado pessoal.

    Protegido por IsAdminUser na view. É o mesmo serializer que gera o client do
    Orval para o painel da Fase 3, então quando ele existir o contrato já está
    definido aqui.
    """

    nome_exibido = serializers.CharField(read_only=True)

    class Meta:
        model = Doacao
        fields = [
            "id",
            "nome",
            "nome_exibido",
            "email",
            "telefone",
            "anonimo",
            "valor",
            "forma_pagamento",
            "destinacao",
            "status",
            "mensagem",
            "criado_em",
            "confirmado_em",
        ]
        read_only_fields = ["criado_em", "confirmado_em", "nome_exibido"]


class DoacaoCriadaSerializer(serializers.Serializer):
    """Resposta do POST público.

    Declarada como serializer (e não `OpenApiResponse(description=...)`) para que
    o Orval gere o tipo no frontend. Sem isso o client sai como `api<void>` e o
    React perde a verificação de tipo do retorno.
    """

    id = serializers.IntegerField(read_only=True)
    status = serializers.CharField(read_only=True)
    mensagem = serializers.CharField(read_only=True)


# =============================================================================
# Turma
# =============================================================================


class TurmaSerializer(serializers.ModelSerializer):
    """Serializer base da turma."""

    horario_formatado = serializers.CharField(read_only=True)
    total_alunos = serializers.IntegerField(read_only=True)

    class Meta:
        model = Turma
        fields = [
            "id",
            "nome",
            "descricao",
            "dia_semana",
            "horario_inicio",
            "horario_fim",
            "horario_formatado",
            "data_inicio",
            "data_fim",
            "ativo",
            "total_alunos",
            "criado_em",
        ]
        read_only_fields = ["criado_em", "horario_formatado", "total_alunos"]


class TurmaListSerializer(TurmaSerializer):
    """Listagem leve para selects/lookups."""

    class Meta(TurmaSerializer.Meta):
        fields = ["id", "nome", "horario_formatado", "ativo"]


# =============================================================================
# Aluno
# =============================================================================


class AlunoSerializer(serializers.ModelSerializer):
    """Serializer completo do aluno (admin)."""

    idade = serializers.IntegerField(read_only=True)
    eh_maior_de_idade = serializers.BooleanField(read_only=True)
    campos_obrigatorios_faltando = serializers.ListField(
        child=serializers.CharField(), read_only=True
    )
    turma_nome = serializers.CharField(source="turma.nome", read_only=True)

    class Meta:
        model = Aluno
        fields = [
            "id",
            "nome",
            "data_nascimento",
            "sexo",
            "rg",
            "cpf",
            "comprovante_residencia",
            "titulo_eleitor",
            "rg_responsavel",
            "certificado_nascimento",
            "atestado_medico",
            "mensalidade",
            "turma",
            "turma_nome",
            "ativo",
            "idade",
            "eh_maior_de_idade",
            "campos_obrigatorios_faltando",
            "criado_em",
            "atualizado_em",
        ]
        read_only_fields = [
            "criado_em",
            "atualizado_em",
            "idade",
            "eh_maior_de_idade",
            "campos_obrigatorios_faltando",
            "turma_nome",
        ]


class AlunoListSerializer(serializers.ModelSerializer):
    """Listagem leve para tabelas."""

    idade = serializers.IntegerField(read_only=True)
    turma_nome = serializers.CharField(source="turma.nome", read_only=True)

    class Meta:
        model = Aluno
        fields = [
            "id",
            "nome",
            "cpf",
            "idade",
            "turma",
            "turma_nome",
            "mensalidade",
            "ativo",
        ]


class AlunoPublicCreateSerializer(serializers.ModelSerializer):
    """Entrada do formulário público de pré-cadastro (landing page)."""

    class Meta:
        model = Aluno
        fields = [
            "nome",
            "data_nascimento",
            "sexo",
            "rg",
            "cpf",
            "comprovante_residencia",
            "titulo_eleitor",
            "rg_responsavel",
            "certificado_nascimento",
            "atestado_medico",
            "mensalidade",
            "turma",
        ]
        extra_kwargs = {
            "comprovante_residencia": {"required": False},
            "titulo_eleitor": {"required": False},
            "rg_responsavel": {"required": False},
            "certificado_nascimento": {"required": False},
            "atestado_medico": {"required": False},
            "turma": {"required": False},
        }


# =============================================================================
# Presença
# =============================================================================


class PresencaSerializer(serializers.ModelSerializer):
    """Serializer completo da presença."""

    aluno_nome = serializers.CharField(source="aluno.nome", read_only=True)
    turma_nome = serializers.CharField(source="turma.nome", read_only=True)

    class Meta:
        model = Presenca
        fields = [
            "id",
            "aluno",
            "aluno_nome",
            "turma",
            "turma_nome",
            "data",
            "situacao",
            "observacao",
            "registrado_em",
            "registrado_por",
        ]
        read_only_fields = ["registrado_em", "aluno_nome", "turma_nome"]


class PresencaCreateSerializer(serializers.ModelSerializer):
    """Para marcar presença (recepcionista)."""

    class Meta:
        model = Presenca
        fields = ["aluno", "turma", "data", "situacao", "observacao"]


class PresencaLoteSerializer(serializers.Serializer):
    """Marcação em lote: lista de presenças para uma turma/data."""

    turma = serializers.PrimaryKeyRelatedField(queryset=Turma.objects.filter(ativo=True))
    data = serializers.DateField()
    presencas = serializers.ListField(
        child=serializers.DictField(
            child=serializers.CharField(),
        )
    )

    def validate_presencas(self, value):
        for item in value:
            if "aluno_id" not in item:
                raise serializers.ValidationError("Cada item deve conter 'aluno_id'.")
            if "situacao" not in item:
                raise serializers.ValidationError("Cada item deve conter 'situacao'.")
        return value


# =============================================================================
# Professor
# =============================================================================


class ProfessorSerializer(serializers.ModelSerializer):
    total_alunos = serializers.IntegerField(read_only=True)
    turmas_nomes = serializers.SerializerMethodField()

    class Meta:
        model = Professor
        fields = [
            "id",
            "nome",
            "cpf",
            "email",
            "telefone",
            "turmas",
            "turmas_nomes",
            "ativo",
            "total_alunos",
            "criado_em",
        ]
        read_only_fields = ["criado_em", "total_alunos", "turmas_nomes"]

    def get_turmas_nomes(self, obj: Professor) -> list[str]:
        return list(obj.turmas.values_list("nome", flat=True))
