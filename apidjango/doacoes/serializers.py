"""
Serializers do painel: doações de itens, turmas, alunos, presenças e professores.
"""

from datetime import date

from django.db import transaction
from rest_framework import serializers

from .documentos import cpf_valido, so_digitos, telefone_valido
from .models import (
    VERSAO_TERMO,
    Aluno,
    Consentimento,
    DoacaoItem,
    Presenca,
    Professor,
    Turma,
)

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
# Doação de itens (registro da equipe no painel)
# =============================================================================


class DoacaoItemSerializer(serializers.ModelSerializer):
    item_rotulo = serializers.CharField(source="item_exibido", read_only=True)
    doador_exibido = serializers.CharField(read_only=True)

    class Meta:
        model = DoacaoItem
        fields = [
            "id",
            "item",
            "item_descricao",
            "item_rotulo",
            "quantidade",
            "doador_nome",
            "doador_exibido",
            "recebido_em",
            "observacao",
            "criado_em",
        ]
        read_only_fields = ["criado_em", "item_rotulo", "doador_exibido"]

    # Dinheiro não se registra aqui: o PIX a ONG confere no extrato do banco.
    PALAVRAS_PROIBIDAS = ("dinheiro", "pix", "r$", "reais")

    def validate(self, attrs):
        item = attrs.get("item", getattr(self.instance, "item", None))
        descricao = attrs.get(
            "item_descricao", getattr(self.instance, "item_descricao", "")
        ).strip()
        if item == DoacaoItem.Item.OUTRO:
            if not descricao:
                raise serializers.ValidationError(
                    {"item_descricao": "Escreva qual item foi doado."}
                )
            if any(p in descricao.lower() for p in self.PALAVRAS_PROIBIDAS):
                raise serializers.ValidationError(
                    {"item_descricao": "Dinheiro não é registrado aqui, só itens."}
                )
        else:
            descricao = ""
        attrs["item_descricao"] = descricao
        return attrs


class DoacaoItemResumoSerializer(serializers.Serializer):
    """Total recebido de cada item (soma das quantidades)."""

    item = serializers.CharField()
    item_rotulo = serializers.CharField()
    total = serializers.IntegerField()


# =============================================================================
# Aluno
# =============================================================================


class AlunoSerializer(serializers.ModelSerializer):
    """Serializer completo do aluno (admin).

    Regras de LGPD: menor de 18 anos não tem CPF próprio (o CPF fica no
    responsável) e só salva com a autorização do responsável, que vira um
    registro de `Consentimento`.
    """

    idade = serializers.IntegerField(read_only=True)
    eh_maior_de_idade = serializers.BooleanField(read_only=True)
    campos_obrigatorios_faltando = serializers.ListField(
        child=serializers.CharField(), read_only=True
    )
    turmas_nomes = serializers.SerializerMethodField()
    mensalidade = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    mensalidade_calculada = serializers.DecimalField(
        max_digits=10, decimal_places=2, read_only=True
    )
    exame_situacao = serializers.CharField(read_only=True, allow_null=True)
    # Entrada: o checkbox "Responsável autorizou o tratamento dos dados do menor".
    consentimento_responsavel = serializers.BooleanField(write_only=True, required=False)
    # Saída: já existe consentimento gravado para este aluno?
    consentimento_registrado = serializers.SerializerMethodField()

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
            "nome_responsavel",
            "cpf_responsavel",
            "rg_responsavel",
            "telefone_responsavel",
            "endereco_responsavel",
            "exame_aptidao",
            "exame_validade",
            "exame_situacao",
            "consentimento_responsavel",
            "consentimento_registrado",
            "turmas",
            "turmas_nomes",
            "mensalidade_personalizada",
            "mensalidade_calculada",
            "mensalidade",
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
            "turmas_nomes",
            "mensalidade_calculada",
            "mensalidade",
        ]

    def get_turmas_nomes(self, obj: Aluno) -> list[str]:
        return [t.nome for t in obj.turmas.all()]

    def get_consentimento_registrado(self, obj: Aluno) -> bool:
        return obj.consentimentos.exists()

    @staticmethod
    def _limpar_cpf(valor: str | None, campo: str) -> str:
        """Guarda só os dígitos e confere os dígitos verificadores."""
        digitos = so_digitos(valor)
        if digitos and not cpf_valido(digitos):
            raise serializers.ValidationError({campo: "CPF inválido."})
        return digitos

    def validate_telefone_responsavel(self, valor: str) -> str:
        if valor and not telefone_valido(valor):
            raise serializers.ValidationError("Telefone inválido. Use DDD + número.")
        return so_digitos(valor)

    def validate(self, attrs):
        atual = self.instance

        # Valor enviado agora ou, se não veio (PATCH), o que já está gravado.
        def valor(campo, padrao=""):
            if campo in attrs:
                return attrs[campo]
            return getattr(atual, campo, padrao) if atual else padrao

        nascimento = valor("data_nascimento", None)
        hoje = date.today()
        menor = bool(nascimento) and (
            hoje.year
            - nascimento.year
            - ((hoje.month, hoje.day) < (nascimento.month, nascimento.day))
        ) < 18
        erros = {}

        cpf_resp = self._limpar_cpf(valor("cpf_responsavel"), "cpf_responsavel")

        if menor:
            # O CPF do menor não é guardado: fica só o do responsável.
            attrs["cpf"] = None
            for campo, rotulo in (
                ("nome_responsavel", "Informe o nome do responsável."),
                ("telefone_responsavel", "Informe o telefone do responsável."),
            ):
                if not valor(campo):
                    erros[campo] = rotulo
            if not cpf_resp:
                erros["cpf_responsavel"] = "Informe o CPF do responsável."
            ja_autorizou = bool(atual and atual.consentimentos.exists())
            if not (attrs.get("consentimento_responsavel") or ja_autorizou):
                erros["consentimento_responsavel"] = (
                    "É preciso marcar que o responsável autorizou o tratamento dos dados do menor."
                )
        else:
            attrs["cpf"] = self._limpar_cpf(valor("cpf", None), "cpf") or None
        if "cpf_responsavel" in attrs:
            attrs["cpf_responsavel"] = cpf_resp

        if erros:
            raise serializers.ValidationError(erros)
        return attrs

    def _registrar_consentimento(self, aluno: Aluno, autorizou: bool) -> None:
        if autorizou and not aluno.eh_maior_de_idade and not aluno.consentimentos.exists():
            Consentimento.objects.create(
                aluno=aluno,
                responsavel_nome=aluno.nome_responsavel,
                versao_termo=VERSAO_TERMO,
            )

    @transaction.atomic
    def create(self, validated_data):
        autorizou = validated_data.pop("consentimento_responsavel", False)
        aluno = super().create(validated_data)
        self._registrar_consentimento(aluno, autorizou)
        return aluno

    @transaction.atomic
    def update(self, instance, validated_data):
        autorizou = validated_data.pop("consentimento_responsavel", False)
        aluno = super().update(instance, validated_data)
        self._registrar_consentimento(aluno, autorizou)
        return aluno


class AlunoListSerializer(serializers.ModelSerializer):
    """Listagem leve para tabelas.

    Não traz o CPF completo (só mascarado, e só para maior de idade) nem dados do
    responsável: o cadastro completo aparece ao abrir a edição.
    """

    idade = serializers.IntegerField(read_only=True)
    eh_maior_de_idade = serializers.BooleanField(read_only=True)
    cpf_mascarado = serializers.CharField(read_only=True, allow_null=True)
    exame_situacao = serializers.CharField(read_only=True, allow_null=True)
    documentos_pendentes = serializers.ListField(child=serializers.CharField(), read_only=True)
    turmas_nomes = serializers.SerializerMethodField()
    mensalidade = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = Aluno
        fields = [
            "id",
            "nome",
            "cpf_mascarado",
            "idade",
            "eh_maior_de_idade",
            "exame_situacao",
            "documentos_pendentes",
            "turmas_nomes",
            "mensalidade",
            "ativo",
        ]

    def get_turmas_nomes(self, obj: Aluno) -> list[str]:
        return [t.nome for t in obj.turmas.all()]


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


class PresencaLoteItemSerializer(serializers.Serializer):
    aluno_id = serializers.IntegerField()
    situacao = serializers.ChoiceField(choices=Presenca.Situacao.choices)
    observacao = serializers.CharField(max_length=255, required=False, allow_blank=True)


class PresencaLoteSerializer(serializers.Serializer):
    """Marcação em lote: lista de presenças para uma turma/data."""

    turma = serializers.PrimaryKeyRelatedField(queryset=Turma.objects.filter(ativo=True))
    data = serializers.DateField()
    presencas = PresencaLoteItemSerializer(many=True, allow_empty=False)

    def validate(self, attrs):
        # Só alunos ativos da turma entram na chamada dela.
        validos = set(
            Aluno.objects.filter(turmas=attrs["turma"], ativo=True).values_list("id", flat=True)
        )
        ids = [p["aluno_id"] for p in attrs["presencas"]]
        if len(ids) != len(set(ids)):
            raise serializers.ValidationError({"presencas": "Aluno repetido na chamada."})
        fora = sorted(set(ids) - validos)
        if fora:
            raise serializers.ValidationError(
                {"presencas": f"Aluno(s) {fora} não estão ativos nesta turma."}
            )
        return attrs


class ChamadaItemSerializer(serializers.Serializer):
    """Um aluno na lista de chamada de uma turma em uma data."""

    aluno_id = serializers.IntegerField()
    aluno_nome = serializers.CharField()
    idade = serializers.IntegerField()
    # None = ainda não registrada nessa data (não conta como falta).
    situacao = serializers.ChoiceField(
        choices=Presenca.Situacao.choices, allow_null=True
    )
    observacao = serializers.CharField(allow_blank=True)
    faltas_seguidas = serializers.IntegerField()
    faltante = serializers.BooleanField()


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
