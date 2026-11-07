from django.apps import AppConfig


class DoacoesConfig(AppConfig):
    default_auto_field = 'django_mongodb_backend.fields.ObjectIdAutoField'
    name = 'doacoes'

    def ready(self):
        from .auditoria import registrar_modelos

        registrar_modelos()
