"""
Views da doação e presença.

Três endpoints, três permissões. Não unificar: ver o comentário dos serializers
sobre o risco de um doador se auto-declarar CONFIRMADA.
"""

from datetime import date
from django.db import transaction
from django.utils import timezone
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.generics import CreateAPIView, ListAPIView
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Aluno, Doacao, Presenca, Professor, Turma
from .serializers import (
    AlunoListSerializer,
    AlunoPublicCreateSerializer,
    AlunoSerializer,
    DoacaoAdminSerializer,
    DoacaoCriadaSerializer,
    DoacaoPublicCreateSerializer,
    DoacaoPublicSerializer,
    PresencaCreateSerializer,
    PresencaLoteSerializer,
    PresencaSerializer,
    ProfessorSerializer,
    TurmaListSerializer,
    TurmaSerializer,
)

# Quantas doações confirmados aparecem no mural público.
LIMITE_MURAL = 12


# =============================================================================
# Doação
# =============================================================================


class DoacaoPublicCreateView(CreateAPIView):
    """POST /api/v1/doacoes/

    Formulário público. Qualquer pessoa registra a intenção de doar; o registro
    nasce PENDENTE e a equipe confere no extrato.
    """

    queryset = Doacao.objects.all()
    serializer_class = DoacaoPublicCreateSerializer
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_scope = "doacao"

    @extend_schema(
        summary="Registra uma doação",
        description=(
            "Público. Cria o registro sempre como PENDENTE — a equipe confirma "
            "no extrato. O campo `status` não é aceito no corpo da requisição."
        ),
        tags=["doacoes"],
        responses={
            201: DoacaoCriadaSerializer,
            400: OpenApiResponse(description="Dados inválidos"),
            429: OpenApiResponse(description="Limite de envios excedido"),
        },
    )
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        # Sem passar status: o default do model (PENDENTE) é o que vale.
        doacao = serializer.save()
        return Response(
            {
                "id": doacao.id,
                "status": doacao.status,
                "mensagem": (
                    "Recebemos o seu registro. A ONG do Povo vai conferir o "
                    "pagamento e confirmar em breve."
                ),
            },
            status=status.HTTP_201_CREATED,
        )


class DoacaoPublicListView(ListAPIView):
    """GET /api/v1/doacoes/publico/

    Mural de doações. Só CONFIRMADAS e sem nenhum dado pessoal.
    """

    serializer_class = DoacaoPublicSerializer
    permission_classes = [AllowAny]
    authentication_classes = []
    pagination_class = None

    @extend_schema(
        summary="Lista as doações confirmadas",
        description=(
            "Público. Apenas doações com status CONFIRMADA, sem nome, e-mail "
            "ou telefone. Usado pela seção de impacto da landing."
        ),
        tags=["doacoes"],
        responses={200: DoacaoPublicSerializer(many=True)},
    )
    def get_queryset(self):
        return Doacao.objects.filter(status=Doacao.Status.CONFIRMADA).order_by(
            "-criado_em"
        )[:LIMITE_MURAL]


class DoacaoResumoView(APIView):
    """GET /api/v1/doacoes/resumo/

    Total geral e por destinação, só do que está CONFIRMADO. É o número que a
    landing exibe — por isso também não tem dado pessoal.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(
        summary="Total arrecadado",
        description=(
            "Público. Soma das doações confirmadas, geral e por destinação. "
            "Não inclui registros pendentes ou cancelados."
        ),
        tags=["doacoes"],
        responses={200: OpenApiResponse(description="Totais da captação")},
    )
    def get(self, request):
        from django.db.models import Count, Sum

        confirmadas = Doacao.objects.filter(status=Doacao.Status.CONFIRMADA)

        agregado = confirmadas.aggregate(
            total=Sum("valor"), quantidade=Count("id")
        )
        por_destino = confirmadas.values("destinacao").annotate(
            total=Sum("valor"), quantidade=Count("id")
        )

        return Response(
            {
                "total": str(agregado["total"] or "0.00"),
                "quantidade": agregado["quantidade"],
                "pendentes": Doacao.objects.filter(status=Doacao.Status.PENDENTE).count(),
                "por_destino": [
                    {
                        "destinacao": linha["destinacao"],
                        "rotulo": Doacao.Destinacao(linha["destinacao"]).label,
                        "total": str(linha["total"] or "0.00"),
                        "quantidade": linha["quantidade"],
                    }
                    for linha in por_destino
                ],
            }
        )


class DoacaoAdminViewSet(
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    mixins.ListModelMixin,
    viewsets.GenericViewSet,
):
    """CRUD da equipe da ONG.

    Fica atrás de `IsAdminUser`. É o mesmo conjunto de dados que o Django admin
    usa — aqui para quando o painel em React entrar na Fase 3.
    """

    queryset = Doacao.objects.all()
    serializer_class = DoacaoAdminSerializer
    permission_classes = [IsAdminUser]
    filterset_fields = ["status", "forma_pagamento", "destinacao", "anonimo"]
    search_fields = ["nome", "email", "telefone"]
    ordering_fields = ["criado_em", "valor"]
    ordering = ["-criado_em"]

    @extend_schema(
        summary="Confirma doações em lote",
        tags=["doacoes"],
        request=None,
        responses={200: DoacaoAdminSerializer(many=True)},
    )
    @action(detail=False, methods=["post"], url_path="confirmar")
    def confirmar(self, request):
        """Marca as doações indicadas como CONFIRMADA e carimba a data."""
        ids = request.data.get("ids", [])
        atualizadas = []

        for doacao in Doacao.objects.filter(id__in=ids, status=Doacao.Status.PENDENTE):
            doacao.confirmar()
            atualizadas.append(doacao)

        return Response(self.get_serializer(atualizadas, many=True).data)

    @extend_schema(
        summary="Cancela doações em lote",
        tags=["doacoes"],
        request=None,
        responses={200: DoacaoAdminSerializer(many=True)},
    )
    @action(detail=False, methods=["post"], url_path="cancelar")
    def cancelar(self, request):
        ids = request.data.get("ids", [])
        atualizadas = []

        for doacao in Doacao.objects.filter(id__in=ids).exclude(
            status=Doacao.Status.CONFIRMADA
        ):
            doacao.cancelar()
            atualizadas.append(doacao)

        return Response(self.get_serializer(atualizadas, many=True).data)

    @action(detail=True, methods=["post"], url_path="confirmada")
    def marcar_confirmada(self, request, pk=None):
        """Ações em massa pelo painel: `/doacoes/admin/12/confirmada/`."""
        doacao = self.get_object()
        doacao.confirmar()
        return Response(self.get_serializer(doacao).data)

    def perform_create(self, serializer):
        """Criar pelo admin já nasce confirmada.

        A equipe só cadastra pelo painel o que já conferiu no extrato — não faz
        sentido criar um registro pendente por dentro da própria tela de gestão.
        """
        serializer.save(
            status=Doacao.Status.CONFIRMADA,
            confirmado_em=timezone.now(),
        )


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


class AlunoPublicCreateView(CreateAPIView):
    """POST /api/v1/alunos/pre-cadastro/

    Formulário público da landing page. Qualquer pessoa registra interesse;
    a equipe valida e ativa depois.
    """

    queryset = Aluno.objects.all()
    serializer_class = AlunoPublicCreateSerializer
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_scope = "aluno_pre_cadastro"

    @extend_schema(
        summary="Pré-cadastro de aluno (público)",
        description=(
            "Público. Cria o registro do aluno com status ativo=True. "
            "A equipe valida documentos depois."
        ),
        tags=["alunos"],
        responses={
            201: AlunoSerializer,
            400: OpenApiResponse(description="Dados inválidos"),
            429: OpenApiResponse(description="Limite de envios excedido"),
        },
    )
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        aluno = serializer.save()
        return Response(
            AlunoSerializer(aluno).data,
            status=status.HTTP_201_CREATED,
        )


class AlunoViewSet(
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    mixins.ListModelMixin,
    viewsets.GenericViewSet,
):
    """CRUD de alunos (admin)."""

    queryset = Aluno.objects.select_related("turma").all()
    permission_classes = [IsAdminUser]
    filterset_fields = ["ativo", "turma", "sexo"]
    search_fields = ["nome", "cpf", "rg"]
    ordering_fields = ["nome", "criado_em", "mensalidade"]
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
    search_fields = ["aluno__nome", "aluno__cpf", "turma__nome", "observacao"]
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
        summary="Lista presenças de uma turma em uma data",
        tags=["presencas"],
        responses={200: PresencaSerializer(many=True)},
    )
    @action(detail=False, methods=["get"], url_path="por-turma-data")
    def por_turma_data(self, request):
        """
        Query params: ?turma=1&data=2026-10-20
        Retorna todas as presenças da turma na data, incluindo alunos sem registro (como ausentes).
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

        # Presenças já registradas
        presencas_existentes = Presenca.objects.filter(turma=turma, data=data).select_related("aluno")
        presencas_dict = {p.aluno_id: p for p in presencas_existentes}

        # Alunos ativos da turma
        alunos = Aluno.objects.filter(turma=turma, ativo=True).order_by("nome")

        resultado = []
        for aluno in alunos:
            if aluno.id in presencas_dict:
                resultado.append(presencas_dict[aluno.id])
            else:
                # Cria objeto "virtual" para o serializer (ausente por padrão)
                resultado.append(
                    Presenca(
                        aluno=aluno,
                        turma=turma,
                        data=data,
                        situacao=Presenca.Situacao.AUSENTE,
                        observacao="Não registrada",
                    )
                )

        return Response(PresencaSerializer(resultado, many=True).data)


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