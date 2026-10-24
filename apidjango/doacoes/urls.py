"""
Rotas do app de doações e presença.

A ordem importa: rotas específicas vêm antes do router para não serem
capturadas pelo lookup `<pk>`.
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("doacoes/admin", views.DoacaoAdminViewSet, basename="doacao-admin")
router.register("turmas", views.TurmaViewSet, basename="turma")
router.register("alunos", views.AlunoViewSet, basename="aluno")
router.register("presencas", views.PresencaViewSet, basename="presenca")
router.register("professores", views.ProfessorViewSet, basename="professor")

app_name = "doacoes"

urlpatterns = [
    # Doações públicas
    path("doacoes/", views.DoacaoPublicCreateView.as_view(), name="doacao-criar"),
    path("doacoes/publico/", views.DoacaoPublicListView.as_view(), name="doacao-publico"),
    path("doacoes/resumo/", views.DoacaoResumoView.as_view(), name="doacao-resumo"),
    # Router (admin)
    path("", include(router.urls)),
]