"""
Serializers do painel: doações de itens, empréstimos, turmas (com horários), atividades
avulsas, alunos, presenças e professores.
"""

from datetime import date

from auditlog.models import LogEntry
from django.core.exceptions import FieldDoesNotExist
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone
from rest_framework import serializers

from .documentos import cpf_valido, mascarar_cpf, so_digitos, telefone_valido
from .grade import StatusGrade, status_da_turma
from .horarios import ORDEM_DIAS
from .models import (
    VERSAO_TERMO,
    Aluno,
    AtividadeAvulsa,
    Consentimento,
    DoacaoItem,
    Emprestimo,
    HorarioTurma,
    Presenca,
    Professor,
    Turma,
)

# =============================================================================
# Turma
# =============================================================================


class HorarioTurmaSerializer(serializers.ModelSerializer):
    """Um dia da semana e a faixa de horário em que a turma acontece."""

    class Meta:
        model = HorarioTurma
        fields = ["id", "dia_semana", "horario_inicio", "horario_fim"]
        read_only_fields = ["id"]

    def validate(self, attrs):
        if attrs["horario_fim"] <= attrs["horario_inicio"]:
            raise serializers.ValidationError(
                {"horario_fim": "O horário de fim precisa ser depois do início."}
            )
        return attrs


class TurmaSerializer(serializers.ModelSerializer):
    """Turma com seus dias e horários (um ou mais) e a visibilidade na grade pública."""

    horarios = HorarioTurmaSerializer(many=True)
    horario_formatado = serializers.CharField(read_only=True)
    total_alunos = serializers.IntegerField(read_only=True)

    class Meta:
        model = Turma
        fields = [
            "id",
            "nome",
            "descricao",
            "horarios",
            "horario_formatado",
            "data_inicio",
            "data_fim",
            "ativo",
            "visivel_na_grade",
            "nome_publico",
            "total_alunos",
            "criado_em",
        ]
        read_only_fields = ["criado_em", "horario_formatado", "total_alunos"]

    def validate_horarios(self, horarios):
        if not horarios:
            raise serializers.ValidationError("Informe ao menos um dia e horário.")
        chaves = [(h["dia_semana"], h["horario_inicio"]) for h in horarios]
        if len(set(chaves)) != len(chaves):
            raise serializers.ValidationError(
                "Há dois horários no mesmo dia começando na mesma hora."
            )
        return horarios

    def to_representation(self, instance):
        dados = super().to_representation(instance)
        # De segunda a domingo (ordenar pelo código "SEG", "TER"... sairia fora de ordem).
        dados["horarios"] = sorted(
            dados["horarios"],
            key=lambda h: (ORDEM_DIAS.index(h["dia_semana"]), h["horario_inicio"]),
        )
        return dados

    @transaction.atomic
    def create(self, validated_data):
        horarios = validated_data.pop("horarios")
        turma = super().create(validated_data)
        self._sincronizar_horarios(turma, horarios)
        return turma

    @transaction.atomic
    def update(self, instance, validated_data):
        horarios = validated_data.pop("horarios", None)
        turma = super().update(instance, validated_data)
        if horarios is not None:
            self._sincronizar_horarios(turma, horarios)
        return turma

    @staticmethod
    def _sincronizar_horarios(turma: Turma, desejados: list[dict]) -> None:
        """Deixa os horários da turma iguais à lista, mexendo só no que mudou.

        Quem continua igual não é apagado e recriado: o histórico de auditoria mostra
        só a diferença de verdade. A chave de um horário é (dia, hora de início).
        """
        existentes = {(h.dia_semana, h.horario_inicio): h for h in turma.horarios.all()}
        por_chave = {(d["dia_semana"], d["horario_inicio"]): d for d in desejados}
        for chave, horario in existentes.items():
            if chave not in por_chave:
                horario.delete()
        for chave, dados in por_chave.items():
            atual = existentes.get(chave)
            if atual is None:
                HorarioTurma.objects.create(
                    turma=turma,
                    dia_semana=dados["dia_semana"],
                    horario_inicio=dados["horario_inicio"],
                    horario_fim=dados["horario_fim"],
                )
            elif atual.horario_fim != dados["horario_fim"]:
                atual.horario_fim = dados["horario_fim"]
                atual.save(update_fields=["horario_fim"])


class TurmaListSerializer(TurmaSerializer):
    """Listagem leve para selects e cards.

    `total_alunos` (só ativos) e `total_presencas` vêm contados na consulta. O
    segundo avisa, antes de excluir a turma, quantas presenças seriam apagadas junto.
    `sem_professor` é a mesma regra da grade do site: turma ativa, já iniciada e sem
    nenhum professor ativo (ver `grade.py`).
    """

    total_presencas = serializers.IntegerField(read_only=True)
    sem_professor = serializers.SerializerMethodField()

    class Meta(TurmaSerializer.Meta):
        fields = [
            "id",
            "nome",
            "horario_formatado",
            "ativo",
            "visivel_na_grade",
            "total_alunos",
            "total_presencas",
            "sem_professor",
        ]

    def get_sem_professor(self, obj: Turma) -> bool:
        situacao = status_da_turma(
            ativo=obj.ativo,
            data_inicio=obj.data_inicio,
            data_fim=obj.data_fim,
            professores_ativos=obj.total_professores_ativos,
            hoje=timezone.localdate(),
        )
        return situacao == StatusGrade.FALTA_PROFESSOR

    def to_representation(self, instance):
        # A lista não traz os horários um a um, só o texto pronto.
        return serializers.ModelSerializer.to_representation(self, instance)


# =============================================================================
# Atividade avulsa (item da grade que não é turma: evento, serviço)
# =============================================================================


class AtividadeAvulsaSerializer(serializers.ModelSerializer):
    horario_exibido = serializers.CharField(read_only=True)
    quando = serializers.CharField(read_only=True)

    class Meta:
        model = AtividadeAvulsa
        fields = [
            "id",
            "nome",
            "tipo",
            "data",
            "dia_semana",
            "horario_inicio",
            "horario_fim",
            "horario_texto",
            "horario_exibido",
            "quando",
            "status",
            "visivel_na_grade",
            "criado_em",
        ]
        read_only_fields = ["criado_em", "horario_exibido", "quando"]

    def validate(self, attrs):
        atual = self.instance
        inicio = attrs.get("horario_inicio", getattr(atual, "horario_inicio", None))
        fim = attrs.get("horario_fim", getattr(atual, "horario_fim", None))
        data = attrs.get("data", getattr(atual, "data", None))
        dia = attrs.get("dia_semana", getattr(atual, "dia_semana", ""))
        if data is not None and dia:
            raise serializers.ValidationError(
                {"dia_semana": "Use a data ou o dia da semana, não os dois."}
            )
        if (inicio is None) != (fim is None):
            raise serializers.ValidationError(
                {"horario_fim": "Informe o início e o fim, ou deixe os dois vazios."}
            )
        if inicio is not None and fim <= inicio:
            raise serializers.ValidationError(
                {"horario_fim": "O horário de fim precisa ser depois do início."}
            )
        return attrs


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

        quantidade = attrs.get("quantidade")
        if self.instance and quantidade is not None:
            emprestada = self.instance.quantidade_emprestada
            if quantidade < emprestada:
                raise serializers.ValidationError(
                    {
                        "quantidade": (
                            f"{emprestada} unidade(s) estão emprestadas; "
                            "a quantidade não pode ser menor."
                        )
                    }
                )
        return attrs


class DoacaoItemResumoSerializer(serializers.Serializer):
    """Total recebido de cada item (soma das quantidades)."""

    item = serializers.CharField()
    item_rotulo = serializers.CharField()
    total = serializers.IntegerField()


class DoacaoItemEmprestavelSerializer(serializers.Serializer):
    """Doação que ainda tem unidades para emprestar (usada no seletor do painel)."""

    id = serializers.IntegerField()
    item_rotulo = serializers.CharField(source="item_exibido")
    quantidade = serializers.IntegerField()
    disponivel = serializers.IntegerField()
    doador_exibido = serializers.CharField()
    recebido_em = serializers.DateField()


# =============================================================================
# Empréstimo de itens (item de uma doação que saiu da ONG por um tempo)
# =============================================================================


class EmprestimoSerializer(serializers.ModelSerializer):
    item_rotulo = serializers.CharField(source="doacao.item_exibido", read_only=True)
    status = serializers.CharField(read_only=True)
    status_rotulo = serializers.CharField(read_only=True)
    devolver_ate = serializers.DateField(read_only=True)

    class Meta:
        model = Emprestimo
        fields = [
            "id",
            "doacao",
            "item_rotulo",
            "quantidade",
            "pessoa_nome",
            "emprestado_em",
            "devolvido_em",
            "devolver_ate",
            "status",
            "status_rotulo",
            "observacao",
            "criado_em",
        ]
        read_only_fields = [
            "criado_em",
            "item_rotulo",
            "status",
            "status_rotulo",
            "devolver_ate",
        ]

    def validate_pessoa_nome(self, valor: str) -> str:
        valor = valor.strip()
        if not valor:
            raise serializers.ValidationError("Informe quem pegou o item emprestado.")
        return valor

    def validate_doacao(self, doacao: DoacaoItem) -> DoacaoItem:
        # Alimento é consumido: não volta, então não é emprestado.
        if doacao.item == DoacaoItem.Item.ALIMENTOS:
            raise serializers.ValidationError("Alimentos não são emprestados.")
        return doacao

    def validate_emprestado_em(self, valor: date) -> date:
        if valor > timezone.localdate():
            raise serializers.ValidationError("A data do empréstimo não pode ser futura.")
        return valor

    def validate(self, attrs):
        atual = self.instance
        doacao = attrs.get("doacao", getattr(atual, "doacao", None))
        quantidade = attrs.get("quantidade", getattr(atual, "quantidade", 1))
        emprestado_em = attrs.get("emprestado_em", getattr(atual, "emprestado_em", None))
        devolvido_em = attrs.get("devolvido_em", getattr(atual, "devolvido_em", None))

        if devolvido_em:
            if emprestado_em and devolvido_em < emprestado_em:
                raise serializers.ValidationError(
                    {"devolvido_em": "A devolução não pode ser antes do empréstimo."}
                )
            if devolvido_em > timezone.localdate():
                raise serializers.ValidationError(
                    {"devolvido_em": "A data da devolução não pode ser futura."}
                )
        elif doacao is not None:
            # Só o que ainda está fora conta contra o que foi doado.
            em_aberto = doacao.emprestimos.filter(devolvido_em__isnull=True)
            if atual:
                em_aberto = em_aberto.exclude(pk=atual.pk)
            livre = doacao.quantidade - (
                em_aberto.aggregate(total=Sum("quantidade"))["total"] or 0
            )
            if quantidade > livre:
                raise serializers.ValidationError(
                    {
                        "quantidade": (
                            f"Só há {max(livre, 0)} unidade(s) disponível(is) "
                            "deste item para emprestar."
                        )
                    }
                )
        return attrs


# =============================================================================
# Auditoria (consulta ao histórico de quem criou, alterou ou excluiu)
# =============================================================================

# Ação do auditlog -> (código para filtro, rótulo mostrado na tela).
ACOES_AUDITORIA = {
    LogEntry.Action.CREATE: ("CRIOU", "Criou"),
    LogEntry.Action.UPDATE: ("ALTEROU", "Alterou"),
    LogEntry.Action.DELETE: ("EXCLUIU", "Excluiu"),
}


def _primeira_maiuscula(texto: str) -> str:
    return texto[:1].upper() + texto[1:]


class AuditoriaUsuarioSerializer(serializers.Serializer):
    """Pessoa da equipe, para o filtro "quem fez" da tela de auditoria."""

    id = serializers.IntegerField()
    nome = serializers.CharField()


class AuditoriaSerializer(serializers.ModelSerializer):
    quando = serializers.DateTimeField(source="timestamp", read_only=True)
    usuario_id = serializers.IntegerField(source="actor_id", read_only=True, allow_null=True)
    usuario_nome = serializers.SerializerMethodField()
    acao = serializers.SerializerMethodField()
    acao_rotulo = serializers.SerializerMethodField()
    tipo = serializers.SerializerMethodField()
    tipo_chave = serializers.CharField(source="content_type.model", read_only=True)
    objeto = serializers.CharField(source="object_repr", read_only=True)
    objeto_id = serializers.CharField(source="object_pk", read_only=True)
    mudancas = serializers.SerializerMethodField()

    class Meta:
        model = LogEntry
        fields = [
            "id",
            "quando",
            "usuario_id",
            "usuario_nome",
            "acao",
            "acao_rotulo",
            "tipo",
            "tipo_chave",
            "objeto",
            "objeto_id",
            "mudancas",
        ]

    def get_usuario_nome(self, obj: LogEntry) -> str:
        if obj.actor is None:
            return "Sistema"
        return obj.actor.get_full_name() or obj.actor.get_username()

    def get_acao(self, obj: LogEntry) -> str:
        return ACOES_AUDITORIA[obj.action][0]

    def get_acao_rotulo(self, obj: LogEntry) -> str:
        return ACOES_AUDITORIA[obj.action][1]

    def get_tipo(self, obj: LogEntry) -> str:
        modelo = obj.content_type.model_class()
        nome = modelo._meta.verbose_name if modelo else obj.content_type.model
        return _primeira_maiuscula(str(nome))

    @staticmethod
    def _campo(obj: LogEntry, nome: str):
        modelo = obj.content_type.model_class()
        try:
            return modelo._meta.get_field(nome)
        except (AttributeError, FieldDoesNotExist):
            return None

    @staticmethod
    def _texto(valor, campo=None) -> str:
        if valor in (None, "None"):
            return ""
        # Campo de escolha: mostra o rótulo ("Alimentos não perecíveis"), não o código.
        if campo is not None and getattr(campo, "flatchoices", None):
            return str(dict(campo.flatchoices).get(valor, valor))
        return str(valor)

    def get_mudancas(self, obj: LogEntry) -> dict:
        """Campo a campo: rótulo, valor antigo e valor novo. Na exclusão não há detalhe."""
        if obj.action == LogEntry.Action.DELETE:
            return {}
        saida = {}
        for nome, valor in obj.changes_dict.items():
            campo = self._campo(obj, nome)
            # O id e as relações inversas (ex.: empréstimos de uma doação) só fazem ruído.
            if nome == "id" or (campo is not None and campo.auto_created and not campo.concrete):
                continue
            rotulo = (
                _primeira_maiuscula(str(campo.verbose_name)) if campo is not None else nome
            )
            if isinstance(valor, dict):  # relação M2M (ex.: turmas do aluno)
                verbo = "adicionou" if valor.get("operation") == "add" else "removeu"
                itens = ", ".join(str(o) for o in valor.get("objects", []))
                saida[nome] = {"rotulo": rotulo, "de": "", "para": f"{verbo}: {itens}"}
                continue
            antigo, novo = valor
            de, para = self._texto(antigo, campo), self._texto(novo, campo)
            if de or para:  # campo que ficou vazio dos dois lados não conta
                saida[nome] = {"rotulo": rotulo, "de": de, "para": para}
        return saida


# =============================================================================
# Grade da semana (pública, sem dado pessoal)
# =============================================================================


class EventoServicoPublicoSerializer(serializers.Serializer):
    """Um evento, serviço ou campanha do bloco "Eventos e serviços" da landing.

    Público: só o que o visitante precisa, sem ids internos nem dado pessoal.
    """

    chave = serializers.CharField()
    nome = serializers.CharField()
    tipo = serializers.ChoiceField(choices=AtividadeAvulsa.Tipo.choices)
    tipo_rotulo = serializers.CharField()
    quando = serializers.CharField()
    horario = serializers.CharField(allow_blank=True)
    status = serializers.ChoiceField(choices=AtividadeAvulsa.Status.choices)
    status_rotulo = serializers.CharField()


class GradeItemSerializer(serializers.Serializer):
    """Uma linha da grade da landing: dia, nome, horário e situação.

    `chave` é única por linha (uma turma em dois dias vira duas linhas). `dia` e as horas
    vêm vazios quando a atividade é "a combinar". Sem dado pessoal e sem ids internos.
    """

    chave = serializers.CharField()
    nome = serializers.CharField()
    dia = serializers.CharField(allow_blank=True)
    dia_rotulo = serializers.CharField()
    horario_inicio = serializers.CharField(allow_blank=True)
    horario_fim = serializers.CharField(allow_blank=True)
    horario = serializers.CharField()
    status = serializers.ChoiceField(choices=StatusGrade.choices)
    status_rotulo = serializers.CharField()


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


class ProfessorListSerializer(ProfessorSerializer):
    """Listagem dos cards: só o CPF mascarado. O completo aparece ao abrir a edição."""

    cpf_mascarado = serializers.SerializerMethodField()

    class Meta(ProfessorSerializer.Meta):
        fields = [
            "id",
            "nome",
            "cpf_mascarado",
            "turmas_nomes",
            "ativo",
            "total_alunos",
        ]

    def get_cpf_mascarado(self, obj: Professor) -> str:
        return mascarar_cpf(obj.cpf)


class VisaoGeralTotaisSerializer(serializers.Serializer):
    alunos_ativos = serializers.IntegerField()
    turmas_ativas = serializers.IntegerField(help_text="Em andamento ou agendadas.")
    professores_ativos = serializers.IntegerField()
    eventos_servicos_ativos = serializers.IntegerField(help_text="Agendados ou abertos.")
    frequencia_mes = serializers.IntegerField(
        allow_null=True,
        help_text="% de presentes no mês (justificadas fora da conta); nulo sem chamadas.",
    )
    itens_emprestados = serializers.IntegerField(help_text="Quantidade ainda não devolvida.")


class VisaoGeralAlertasSerializer(serializers.Serializer):
    faltantes = serializers.IntegerField(help_text="Alunos com 3 faltas seguidas em alguma turma.")
    emprestimos_atrasados = serializers.IntegerField()
    turmas_sem_professor = serializers.IntegerField()
    alunos_sem_turma = serializers.IntegerField()


class VisaoGeralFrequenciaTurmaSerializer(serializers.Serializer):
    turma = serializers.CharField(help_text="Nome da turma.")
    percentual = serializers.IntegerField(help_text="% de presentes no mês.")
    registros = serializers.IntegerField(help_text="Presentes mais ausentes que entraram na conta.")


class VisaoGeralSerializer(serializers.Serializer):
    """Totais, alertas e frequência por turma: nunca traz nome de aluno ou de professor."""

    totais = VisaoGeralTotaisSerializer()
    alertas = VisaoGeralAlertasSerializer()
    frequencia_por_turma = VisaoGeralFrequenciaTurmaSerializer(
        many=True, help_text="Turmas ativas com chamada no mês, da menor frequência para a maior."
    )
