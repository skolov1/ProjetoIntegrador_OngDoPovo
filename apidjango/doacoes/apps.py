from django.apps import AppConfig


class DoacoesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'doacoes'

    def ready(self):
        from .auditoria import registrar_modelos

        registrar_modelos()
