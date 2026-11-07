"""Ajustes do DRF para chaves primarias `ObjectId` (MongoDB).

O `ModelSerializer` do DRF mapeia a chave primaria como inteiro e quebra na saida com
`ObjectId`. Aqui o `ObjectIdAutoField` vira texto (string de 24 caracteres) e as relacoes
devolvem `str(pk)`. Validado na prova de conceito (ver memoria `project-poc-mongodb`).
"""

from bson import ObjectId
from bson.errors import InvalidId
from django_mongodb_backend.fields import ObjectIdAutoField, ObjectIdField
from rest_framework import renderers, serializers
from rest_framework.utils import encoders


class IdField(serializers.CharField):
    """Id do MongoDB na API: texto de 24 caracteres hexadecimais."""

    default_error_messages = {"invalid": "Id inválido."}

    def to_internal_value(self, data):
        texto = str(super().to_internal_value(data))
        try:
            ObjectId(texto)
        except (InvalidId, TypeError):
            self.fail("invalid")
        return texto

    def to_representation(self, value):
        return str(value)


class IdRelatedField(serializers.PrimaryKeyRelatedField):
    """Relacao por id (ObjectId) que entra e sai como texto."""

    def to_internal_value(self, data):
        try:
            data = ObjectId(str(data))
        except (InvalidId, TypeError):
            self.fail("incorrect_type", data_type=type(data).__name__)
        return super().to_internal_value(data)

    def to_representation(self, value):
        return str(value.pk)

    def use_pk_only_optimization(self):
        return True


class MongoModelSerializer(serializers.ModelSerializer):
    serializer_field_mapping = {
        **serializers.ModelSerializer.serializer_field_mapping,
        ObjectIdAutoField: IdField,
        ObjectIdField: IdField,
    }
    serializer_related_field = IdRelatedField


class ObjectIdEncoder(encoders.JSONEncoder):
    """Rede de seguranca: um `ObjectId` que escapar vira texto em vez de derrubar a resposta."""

    def default(self, obj):
        if isinstance(obj, ObjectId):
            return str(obj)
        return super().default(obj)


class JSONRenderer(renderers.JSONRenderer):
    encoder_class = ObjectIdEncoder
