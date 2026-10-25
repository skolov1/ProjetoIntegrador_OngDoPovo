"""
Views do painel: doações de itens, turmas, alunos, presenças e professores.

Tudo aqui é só para a equipe (`IsAdminUser`); não há rota pública de doação.
"""

from datetime import date

from django.db import transaction
from django.db.models import Sum
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response

from .faltas import eh_faltante, faltas_seguidas
from .models import Aluno, DoacaoItem, Presenca, Professor, Turma
from .serializers import (
    AlunoListSerializer,
    AlunoSerializer,
    ChamadaItemSerializer,
    DoacaoItemResumoSerializer,
    DoacaoItemSerializer,
    PresencaCreateSerializer,
    PresencaLoteSerializer,
    PresencaSerializer,
    ProfessorSerializer,
    TurmaListSerializer,
    TurmaSerializer,
)

# =============================================================================
# Doação de itens
# =============================================================================


class DoacaoItemViewSet(
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


# =============================================================================
# Turma
# =============================================================================


class TurmaViewSet(
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    mixins.ListModelMixin,
    viewsets.GenericViewSet,
):
    """CRUD de turmas (admin)."""

    queryset = Turma.objects.select_related().prefetch_related("alunos", "professores").all()
    permission_classes = [IsAdminUser]
    filterset_fields = ["ativo", "dia_semana"]
    search_fields = ["nome", "descricao"]
    ordering_fields = ["dia_semana", "horario_inicio", "nome"]
    ordering = ["dia_semana", "horario_inicio", "nome"]

    def get_serializer_class(self):
        if self.action == "list":
            return TurmaListSerializer
        return TurmaSerializer


# =============================================================================
# Aluno
# =============================================================================


class AlunoViewSet(
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


# =============================================================================
# Presença
# =============================================================================


class PresencaViewSet(
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
        with transaction.atomic():
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
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    mixins.ListModelMixin,
    viewsets.GenericViewSet,
):
    """CRUD de professores (admin)."""

    queryset = Professor.objects.prefetch_related("turmas").all()
    serializer_class = ProfessorSerializer
    permission_classes = [IsAdminUser]
    filterset_fields = ["ativo", "turmas"]
    search_fields = ["nome", "cpf", "email"]
    ordering_fields = ["nome", "criado_em"]
    ordering = ["nome"]