"""
Auditoria: quem criou, alterou ou excluiu cada registro do painel.

Usa a biblioteca `django-auditlog`, que grava uma entrada a cada save/delete dos
modelos registrados em `registrar_modelos()`. Três cuidados deste projeto:

* **Autor da ação.** O login é por JWT e o DRF só autentica dentro da view, depois
  dos middlewares; por isso a biblioteca não consegue descobrir o usuário sozinha.
  `AuditoriaMixin` informa o autor (`set_actor`) em cada criar/alterar/excluir.
* **Dado pessoal fora do log.** CPF, RG, telefone, e-mail e endereço têm o valor
  oculto: o log mostra que o campo mudou, mas não o que estava escrito.
* **Exclusão a pedido do titular.** Ao excluir um aluno, o nome e os dados dele são
  apagados também do log. Fica só quem excluiu, quando e que foi um aluno.
"""

from auditlog.context import set_actor
from auditlog.models import LogEntry
from auditlog.registry import auditlog
from django.contrib.contenttypes.models import ContentType

MASCARA = "doacoes.auditoria.ocultar"

# Campos com dado pessoal sensível: o log só diz que mudaram.
CAMPOS_ALUNO_OCULTOS = [
    "rg",
    "cpf",
    "rg_responsavel",
    "cpf_responsavel",
    "telefone_responsavel",
    "endereco_responsavel",
]
CAMPOS_PROFESSOR_OCULTOS = ["cpf", "email", "telefone"]

# Datas de criação são geradas pelo sistema e só fazem barulho no histórico.
CAMPOS_AUTOMATICOS = ["criado_em", "registrado_em"]


def ocultar(valor: str) -> str:
    """Máscara total: o log não guarda nem parte do dado pessoal."""
    return "(oculto)"


def registrar_modelos() -> None:
    """Liga a auditoria nos modelos do painel (chamado em `DoacoesConfig.ready`)."""
    from .models import (
        Aluno,
        Consentimento,
        DoacaoItem,
        Emprestimo,
        Presenca,
        Professor,
        Turma,
    )

    comum = {"exclude_fields": CAMPOS_AUTOMATICOS}
    auditlog.register(
        Aluno,
        m2m_fields={"turmas"},
        mask_fields=CAMPOS_ALUNO_OCULTOS,
        mask_callable=MASCARA,
        **comum,
    )
    auditlog.register(
        Professor,
        m2m_fields={"turmas"},
        mask_fields=CAMPOS_PROFESSOR_OCULTOS,
        mask_callable=MASCARA,
        **comum,
    )
    for modelo in (Turma, Presenca, Consentimento, DoacaoItem, Emprestimo):
        auditlog.register(modelo, **comum)


def anonimizar_registros(modelo: type, pks: list[int]) -> None:
    """Tira nome e dados dos registros de auditoria de objetos excluídos.

    Mantém o que a auditoria precisa (quem fez, quando, que tipo de ação) e troca o
    texto do objeto, que traz o nome da pessoa.
    """
    if not pks:
        return
    tipo = ContentType.objects.get_for_model(modelo)
    rotulo = modelo._meta.verbose_name.capitalize()
    entradas = LogEntry.objects.filter(content_type=tipo, object_pk__in=[str(pk) for pk in pks])
    for pk_entrada, pk_objeto in entradas.values_list("pk", "object_pk"):
        # `update` direto: o log não deve ser regravado por `save`.
        LogEntry.objects.filter(pk=pk_entrada).update(
            object_repr=f"{rotulo} #{pk_objeto} (excluído)",
            changes=None,
            changes_text="",
            serialized_data=None,
        )


class AuditoriaMixin:
    """Para viewsets do DRF: grava quem fez cada criar, alterar e excluir.

    Precisa vir antes dos mixins do DRF na lista de herança.
    """

    def _autor(self):
        usuario = self.request.user
        return usuario if usuario.is_authenticated else None

    def perform_create(self, serializer):
        with set_actor(self._autor()):
            super().perform_create(serializer)

    def perform_update(self, serializer):
        with set_actor(self._autor()):
            super().perform_update(serializer)

    def perform_destroy(self, instance):
        with set_actor(self._autor()):
            super().perform_destroy(instance)
