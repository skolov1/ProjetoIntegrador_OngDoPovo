"""Ajustes do OpenAPI (drf-spectacular) para ids `ObjectId`, que a API entrega como texto."""

from drf_spectacular.extensions import OpenApiSerializerFieldExtension


class IdRelatedFieldExtension(OpenApiSerializerFieldExtension):
    target_class = "setup.mongo.IdRelatedField"

    def map_serializer_field(self, auto_schema, direction):
        return {"type": "string", "description": "Id (24 caracteres hexadecimais)."}


def ids_como_texto(result, generator, request, public):
    """Parametros de caminho/consulta chamados `id`, `*_id` ou nomes de relacao viram texto.

    O spectacular nao conhece `ObjectIdAutoField` e cai em inteiro; o front precisa de string.
    """
    for operacoes in result.get("paths", {}).values():
        for operacao in operacoes.values():
            if not isinstance(operacao, dict):
                continue
            for parametro in operacao.get("parameters", []):
                esquema = parametro.get("schema", {})
                nome = parametro.get("name", "")
                if esquema.get("type") == "integer" and (
                    nome == "id" or nome.endswith("_id") or nome in {"turma", "turmas", "usuario"}
                ):
                    esquema["type"] = "string"
                    esquema.pop("format", None)
                elif (
                    esquema.get("type") == "array"
                    and esquema.get("items", {}).get("type") == "integer"
                    and nome in {"turmas"}
                ):
                    esquema["items"] = {"type": "string"}
    return result
