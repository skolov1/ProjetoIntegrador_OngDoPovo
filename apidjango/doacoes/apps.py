from django.apps import AppConfig


class DoacoesConfig(AppConfig):
    default_auto_field = 'django_mongodb_backend.fields.ObjectIdAutoField'
    name = 'doacoes'

    def ready(self):
        # Registra a extensao do OpenAPI que descreve ids do Mongo como texto.
        import setup.schema  # noqa: F401

        from .auditoria import registrar_modelos

        registrar_modelos()
