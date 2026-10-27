"""
Views do painel: doações de itens, empréstimos, turmas, alunos, presenças e professores.

Tudo aqui é só para a equipe (`IsAdminUser`); não há rota pública de doação.
"""

from datetime import date, time

import django_filters
from auditlog.context import set_actor
from auditlog.models import LogEntry
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Count, F, ProtectedError, Q, Sum
from django.db.models.functions import Coalesce
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_control
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from .auditoria import AuditoriaMixin, anonimizar_registros
from .faltas import eh_faltante, faltas_seguidas
from .grade import StatusGrade, status_da_turma
from .horarios import ORDEM_DIAS, faixa_horaria
from .models import (
    Aluno,
    AtividadeAvulsa,
    Consentimento,
    DiaSemana,
    DoacaoItem,
    Emprestimo,
    Presenca,
    Professor,
    Turma,
)
from .serializers import (
    ACOES_AUDITORIA,
    AlunoListSerializer,
    AlunoSerializer,
    AtividadeAvulsaSerializer,
    AuditoriaSerializer,
    AuditoriaUsuarioSerializer,
    ChamadaItemSerializer,
    DoacaoItemEmprestavelSerializer,
    DoacaoItemResumoSerializer,
    DoacaoItemSerializer,
    EmprestimoSerializer,
    GradeItemSerializer,
    PresencaCreateSerializer,
    PresencaLoteSerializer,
    PresencaSerializer,
    ProfessorListSerializer,
    ProfessorSerializer,
    TurmaListSerializer,
    TurmaSerializer,
)

# =============================================================================
# Doação de itens
# =============================================================================


class DoacaoItemViewSet(
    AuditoriaMixin,
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    mixins.ListModelMixin,
    viewsets.GenericViewSet,
):
    """Registro de doações de itens (alimentos, cadeiras, muletas), só da equipe."""

    queryset = DoacaoItem.objects.all()
    serializer_class = DoacaoItemSerializer
    permission_classes = [IsAdminUser]
    filterset_fields = ["item"]
    search_fields = ["doador_nome", "observacao"]
    ordering_fields = ["recebido_em", "quantidade"]
    ordering = ["-recebido_em", "-criado_em"]

    @extend_schema(
        summary="Total recebido de cada item",
        tags=["doacoes"],
        responses={200: DoacaoItemResumoSerializer(many=True)},
    )
    @action(detail=False, methods=["get"], url_path="resumo", pagination_class=None)
    def resumo(self, request):
        """Soma das quantidades por item, incluindo os que ainda estão em zero."""
        totais = dict(
            DoacaoItem.objects.values_list("item").annotate(total=Sum("quantidade"))
        )
        dados = [
            {"item": valor, "item_rotulo": rotulo, "total": totais.get(valor, 0)}
            for valor, rotulo in DoacaoItem.Item.choices
        ]
        return Response(DoacaoItemResumoSerializer(dados, many=True).data)

    @extend_schema(
        summary="Doações que ainda têm unidades para emprestar",
        tags=["doacoes"],
        responses={200: DoacaoItemEmprestavelSerializer(many=True)},
    )
    @action(detail=False, methods=["get"], url_path="emprestaveis", pagination_class=None)
    def emprestaveis(self, request):
        """Tudo que pode sair emprestado: sem alimentos e sem o que já está todo fora."""
        itens = (
            DoacaoItem.objects.exclude(item=DoacaoItem.Item.ALIMENTOS)
            .annotate(
                emprestada=Coalesce(
                    Sum(
                        "emprestimos__quantidade",
                        filter=Q(emprestimos__devolvido_em__isnull=True),
                    ),
                    0,
                )
            )
            .annotate(disponivel=F("quantidade") - F("emprestada"))
            .filter(disponivel__gt=0)
            .order_by("item", "-recebido_em")
        )
        return Response(DoacaoItemEmprestavelSerializer(itens, many=True).data)

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {"detail": "Este item tem empréstimos registrados e não pode ser excluído."},
                status=status.HTTP_409_CONFLICT,
            )


# =============================================================================
# Empréstimo de itens
# =============================================================================


class EmprestimoFilter(django_filters.FilterSet):
    status = django_filters.ChoiceFilter(
        choices=Emprestimo.Status.choices, method="filtrar_status"
    )

    class Meta:
        model = Emprestimo
        fields = ["doacao"]

    def filtrar_status(self, queryset, name, valor):
        limite = Emprestimo.limite_atraso()
        if valor == Emprestimo.Status.DEVOLVIDO:
            return queryset.filter(devolvido_em__isnull=False)
        em_aberto = queryset.filter(devolvido_em__isnull=True)
        if valor == Emprestimo.Status.ATRASADO:
            return em_aberto.filter(emprestado_em__lt=limite)
        return em_aberto.filter(emprestado_em__gte=limite)


class EmprestimoViewSet(
    AuditoriaMixin,
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    mixins.ListModelMixin,
    viewsets.GenericViewSet,
):
    """Empréstimos de itens doados. A devolução é um PATCH de `devolvido_em`."""

    queryset = Emprestimo.objects.select_related("doacao")
    serializer_class = EmprestimoSerializer
    permission_classes = [IsAdminUser]
    filterset_class = EmprestimoFilter
    search_fields = ["pessoa_nome", "observacao"]
    ordering_fields = ["emprestado_em", "devolvido_em"]
    ordering = ["-emprestado_em", "-criado_em"]


# =============================================================================
# Turma
# =============================================================================


class TurmaFilter(django_filters.FilterSet):
    # Turmas que acontecem naquele dia. `distinct`: uma turma com dois horários no mesmo
    # dia não deve aparecer duas vezes.
    dia_semana = django_filters.ChoiceFilter(
        field_name="horarios__dia_semana", choices=DiaSemana.choices, distinct=True
    )

    class Meta:
        model = Turma
        fields = ["ativo", "visivel_na_grade"]


class TurmaViewSet(
    AuditoriaMixin,
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    mixins.ListModelMixin,
    viewsets.GenericViewSet,
):
    """CRUD de turmas (admin)."""

    queryset = Turma.objects.prefetch_related("horarios").annotate(
        total_alunos=Count("alunos", filter=Q(alunos__ativo=True), distinct=True),
        total_presencas=Count("presencas", distinct=True),
    )
    permission_classes = [IsAdminUser]
    filterset_class = TurmaFilter
    search_fields = ["nome", "descricao"]
    ordering_fields = ["nome", "criado_em"]
    ordering = ["nome"]

    def get_serializer_class(self):
        if self.action == "list":
            return TurmaListSerializer
        return TurmaSerializer


class AtividadeAvulsaViewSet(
    AuditoriaMixin,
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    mixins.ListModelMixin,
    viewsets.GenericViewSet,
):
    """Atividades, eventos e serviços da grade que não são turma (só da equipe)."""

    queryset = AtividadeAvulsa.objects.all()
    serializer_class = AtividadeAvulsaSerializer
    permission_classes = [IsAdminUser]
    filterset_fields = ["status", "visivel_na_grade", "dia_semana"]
    search_fields = ["nome"]
    ordering_fields = ["nome", "criado_em"]
    ordering = ["nome"]


# =============================================================================
# Aluno
# =============================================================================


class AlunoViewSet(
    AuditoriaMixin,
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    mixins.ListModelMixin,
    viewsets.GenericViewSet,
):
    """CRUD de alunos (admin)."""

    queryset = Aluno.objects.prefetch_related("turmas").all()
    permission_classes = [IsAdminUser]
    filterset_fields = ["ativo", "turmas", "sexo"]
    search_fields = ["nome"]
    ordering_fields = ["nome", "criado_em"]
    ordering = ["nome"]

    def get_serializer_class(self):
        if self.action == "list":
            return AlunoListSerializer
        return AlunoSerializer

    def perform_destroy(self, instance):
        # Exclusão a pedido do titular: o nome some também do log de auditoria.
        pk = instance.pk
        presencas = list(instance.presencas.values_list("pk", flat=True))
        consentimentos = list(instance.consentimentos.values_list("pk", flat=True))
        with transaction.atomic():
            super().perform_destroy(instance)
            anonimizar_registros(Aluno, [pk])
            anonimizar_registros(Presenca, presencas)
            anonimizar_registros(Consentimento, consentimentos)


# =============================================================================
# Presença
# =============================================================================


class PresencaViewSet(
    AuditoriaMixin,
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    mixins.ListModelMixin,
    viewsets.GenericViewSet,
):
    """CRUD de presenças (recepcionista/admin)."""

    queryset = Presenca.objects.select_related("aluno", "turma").all()
    permission_classes = [IsAdminUser]
    filterset_fields = ["turma", "data", "situacao", "aluno"]
    search_fields = ["aluno__nome", "turma__nome", "observacao"]
    ordering_fields = ["data", "registrado_em"]
    ordering = ["-data", "aluno__nome"]

    def get_serializer_class(self):
        if self.action == "create":
            return PresencaCreateSerializer
        return PresencaSerializer

    @extend_schema(
        summary="Marca presença em lote para uma turma/data",
        tags=["presencas"],
        request=PresencaLoteSerializer,
        responses={201: PresencaSerializer(many=True)},
    )
    @action(detail=False, methods=["post"], url_path="lote")
    def lote(self, request):
        """
        Recebe: { turma: 1, data: "2026-10-20", presencas: [{aluno_id: 1, situacao: "PRESENTE"}, ...] }
        Cria/atualiza presenças em bulk.
        """
        serializer = PresencaLoteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        turma = serializer.validated_data["turma"]
        data = serializer.validated_data["data"]
        presencas_data = serializer.validated_data["presencas"]

        criadas = []
        with transaction.atomic(), set_actor(request.user):
            for p_data in presencas_data:
                aluno_id = p_data["aluno_id"]
                situacao = p_data["situacao"]
                observacao = p_data.get("observacao", "")

                presenca, created = Presenca.objects.update_or_create(
                    aluno_id=aluno_id,
                    turma=turma,
                    data=data,
                    defaults={
                        "situacao": situacao,
                        "observacao": observacao,
                        "registrado_por": getattr(request.user, "username", "recepcionista"),
                    },
                )
                criadas.append(presenca)

        return Response(
            PresencaSerializer(criadas, many=True).data,
            status=status.HTTP_201_CREATED,
        )

    @extend_schema(
        summary="Lista de chamada de uma turma em uma data",
        tags=["presencas"],
        parameters=[
            OpenApiParameter("turma", int, required=True),
            OpenApiParameter("data", str, required=True, description="AAAA-MM-DD"),
        ],
        responses={200: ChamadaItemSerializer(many=True)},
    )
    @action(detail=False, methods=["get"], url_path="chamada", pagination_class=None)
    def chamada(self, request):
        """Alunos ativos da turma, em ordem alfabética, com a situação já registrada.

        Aluno sem registro na data vem com `situacao` nula (não conta como falta).
        `faltante` é calculado na hora: 3 faltas seguidas até a data, sem contar as
        justificadas (ver `faltas.py`).
        """
        turma_id = request.query_params.get("turma")
        data_str = request.query_params.get("data")
        if not turma_id or not data_str:
            return Response(
                {"detail": "Parâmetros 'turma' e 'data' são obrigatórios."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            turma = Turma.objects.get(pk=turma_id, ativo=True)
            data = date.fromisoformat(data_str)
        except (Turma.DoesNotExist, ValueError):
            return Response(
                {"detail": "Turma ou data inválida."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        alunos = list(Aluno.objects.filter(turmas=turma, ativo=True).order_by("nome"))
        do_dia = {
            p.aluno_id: p for p in Presenca.objects.filter(turma=turma, data=data)
        }
        # Histórico até a data, do mais novo para o mais antigo, por aluno.
        historico: dict[int, list[str]] = {a.id: [] for a in alunos}
        for aluno_id, situacao in (
            Presenca.objects.filter(turma=turma, data__lte=data, aluno__in=alunos)
            .order_by("aluno_id", "-data")
            .values_list("aluno_id", "situacao")
        ):
            historico[aluno_id].append(situacao)

        itens = []
        for aluno in alunos:
            registro = do_dia.get(aluno.id)
            itens.append(
                {
                    "aluno_id": aluno.id,
                    "aluno_nome": aluno.nome,
                    "idade": aluno.idade,
                    "situacao": registro.situacao if registro else None,
                    "observacao": registro.observacao if registro else "",
                    "faltas_seguidas": faltas_seguidas(historico[aluno.id]),
                    "faltante": eh_faltante(historico[aluno.id]),
                }
            )
        return Response(ChamadaItemSerializer(itens, many=True).data)


# =============================================================================
# Professor
# =============================================================================


class ProfessorViewSet(
    AuditoriaMixin,
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    mixins.ListModelMixin,
    viewsets.GenericViewSet,
):
    """CRUD de professores (admin)."""

    queryset = Professor.objects.prefetch_related("turmas").all()
    permission_classes = [IsAdminUser]
    filterset_fields = ["ativo", "turmas"]
    # Só por nome: CPF e e-mail não vão em parâmetro de URL (ver docs/LGPD.md).
    search_fields = ["nome"]
    ordering_fields = ["nome", "criado_em"]
    ordering = ["nome"]

    def get_serializer_class(self):
        if self.action == "list":
            return ProfessorListSerializer
        return ProfessorSerializer


# =============================================================================
# Auditoria
# =============================================================================


class AuditoriaFilter(django_filters.FilterSet):
    usuario = django_filters.NumberFilter(field_name="actor_id")
    acao = django_filters.ChoiceFilter(
        choices=[(codigo, rotulo) for codigo, rotulo in ACOES_AUDITORIA.values()],
        method="filtrar_acao",
    )
    # Nome do modelo em minúsculas (ex.: "aluno", "doacaoitem").
    tipo = django_filters.CharFilter(field_name="content_type__model")
    de = django_filters.DateFilter(field_name="timestamp", lookup_expr="date__gte")
    ate = django_filters.DateFilter(field_name="timestamp", lookup_expr="date__lte")

    class Meta:
        model = LogEntry
        fields = []

    def filtrar_acao(self, queryset, name, valor):
        codigo = next(a for a, (c, _) in ACOES_AUDITORIA.items() if c == valor)
        return queryset.filter(action=codigo)


class AuditoriaViewSet(
    mixins.RetrieveModelMixin,
    mixins.ListModelMixin,
    viewsets.GenericViewSet,
):
    """Histórico de quem criou, alterou ou excluiu registros do painel (só leitura)."""

    queryset = (
        LogEntry.objects.filter(
            content_type__app_label="doacoes", action__in=list(ACOES_AUDITORIA)
        )
        .select_related("actor", "content_type")
        .order_by("-timestamp", "-id")
    )
    serializer_class = AuditoriaSerializer
    permission_classes = [IsAdminUser]
    filterset_class = AuditoriaFilter
    search_fields = ["object_repr"]

    @extend_schema(
        summary="Pessoas da equipe (para filtrar o histórico por quem fez)",
        tags=["auditoria"],
        responses={200: AuditoriaUsuarioSerializer(many=True)},
    )
    @action(detail=False, methods=["get"], url_path="usuarios", pagination_class=None)
    def usuarios(self, request):
        """Equipe atual e quem já aparece no histórico (mesmo que a conta tenha saído)."""
        no_historico = LogEntry.objects.exclude(actor=None).values("actor_id")
        pessoas = [
            {"id": u.id, "nome": u.get_full_name() or u.get_username()}
            for u in get_user_model().objects.filter(
                Q(is_staff=True) | Q(pk__in=no_historico)
            )
        ]
        pessoas.sort(key=lambda p: p["nome"].casefold())
        return Response(AuditoriaUsuarioSerializer(pessoas, many=True).data)


# =============================================================================
# Grade da semana (pública)
# =============================================================================

@method_decorator(cache_control(max_age=60, public=True), name="dispatch")
class GradeView(APIView):
    """GET /api/v1/grade/ - grade da semana para a landing.

    Público e só leitura. Não traz professor, aluno nem nada pessoal: só dia, nome,
    horário e situação. Entram:

    * turmas ativas, com `visivel_na_grade` ligado e ainda não encerradas, uma linha por
      dia da semana em que acontecem (ver `grade.py` para a situação de cada uma);
    * atividades avulsas (evento, serviço) com `visivel_na_grade` ligado.

    A resposta pode ficar 60 s em cache no navegador e em proxies.
    """

    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_scope = "publico"

    @extend_schema(
        summary="Grade da semana (pública)",
        tags=["grade"],
        responses={200: GradeItemSerializer(many=True)},
    )
    def get(self, request):
        hoje = timezone.localdate()
        turmas = (
            Turma.objects.filter(ativo=True, visivel_na_grade=True)
            .prefetch_related("horarios")
            .annotate(
                professores_ativos=Count(
                    "professores", filter=Q(professores__ativo=True), distinct=True
                )
            )
        )
        linhas = []
        for t in turmas:
            situacao = status_da_turma(
                ativo=t.ativo,
                data_inicio=t.data_inicio,
                data_fim=t.data_fim,
                professores_ativos=t.professores_ativos,
                hoje=hoje,
            )
            if situacao is None:
                continue
            for h in t.horarios.all():
                linhas.append(
                    {
                        "chave": f"turma-{t.id}-{h.id}",
                        "nome": t.nome_na_grade,
                        "dia": h.dia_semana,
                        "dia_rotulo": h.get_dia_semana_display(),
                        "horario_inicio": f"{h.horario_inicio:%H:%M}",
                        "horario_fim": f"{h.horario_fim:%H:%M}",
                        "horario": faixa_horaria(h.horario_inicio, h.horario_fim),
                        "status": situacao,
                        "status_rotulo": situacao.label,
                        "_ordem": (
                            ORDEM_DIAS.index(h.dia_semana),
                            h.horario_inicio,
                            t.nome_na_grade,
                        ),
                    }
                )
        for a in AtividadeAvulsa.objects.filter(visivel_na_grade=True):
            situacao = StatusGrade(a.status)
            linhas.append(
                {
                    "chave": f"avulsa-{a.id}",
                    "nome": a.nome,
                    "dia": a.dia_semana,
                    "dia_rotulo": a.get_dia_semana_display() or "A combinar",
                    "horario_inicio": f"{a.horario_inicio:%H:%M}" if a.horario_inicio else "",
                    "horario_fim": f"{a.horario_fim:%H:%M}" if a.horario_fim else "",
                    "horario": a.horario_exibido,
                    "status": situacao,
                    "status_rotulo": situacao.label,
                    "_ordem": (
                        ORDEM_DIAS.index(a.dia_semana) if a.dia_semana else len(ORDEM_DIAS),
                        a.horario_inicio or time.max,
                        a.nome,
                    ),
                }
            )
        linhas.sort(key=lambda linha: linha.pop("_ordem"))
        return Response(GradeItemSerializer(linhas, many=True).data)
