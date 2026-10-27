"""
Rotas do painel (todas só para a equipe): doações de itens, empréstimos, auditoria, turmas, alunos,
presenças e professores.
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("doacoes/itens", views.DoacaoItemViewSet, basename="doacao-item")
router.register(
    "doacoes/emprestimos", views.EmprestimoViewSet, basename="emprestimo"
)
router.register("auditoria", views.AuditoriaViewSet, basename="auditoria")
router.register("turmas", views.TurmaViewSet, basename="turma")
router.register("alunos", views.AlunoViewSet, basename="aluno")
router.register("presencas", views.PresencaViewSet, basename="presenca")
router.register("professores", views.ProfessorViewSet, basename="professor")

app_name = "doacoes"

urlpatterns = [
    # Grade da semana (pública, só leitura)
    path("grade/", views.GradeView.as_view(), name="grade"),
    # Router (admin)
    path("", include(router.urls)),
]