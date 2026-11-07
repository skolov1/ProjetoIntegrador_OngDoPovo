"""Apps do Django e de terceiros com chave primaria `ObjectId` (MongoDB).

Os apps nativos nascem com AutoField (inteiro); no MongoDB a chave primaria e o
ObjectId. Estas subclasses so trocam `default_auto_field` (padrao do template oficial
`mongodb-labs/django-mongodb-project`).
"""

# Importados como modulo (e nao as classes): o Django enxerga como "app padrao" toda
# AppConfig que aparece no namespace deste arquivo.
from auditlog import apps as auditlog_apps
from django.contrib.admin import apps as admin_apps
from django.contrib.auth import apps as auth_apps
from django.contrib.contenttypes import apps as contenttypes_apps

OBJECT_ID = "django_mongodb_backend.fields.ObjectIdAutoField"


class MongoAdminConfig(admin_apps.AdminConfig):
    default_auto_field = OBJECT_ID


class MongoAuthConfig(auth_apps.AuthConfig):
    default_auto_field = OBJECT_ID


class MongoContentTypesConfig(contenttypes_apps.ContentTypesConfig):
    default_auto_field = OBJECT_ID


class AuditlogMongoConfig(auditlog_apps.AuditlogConfig):
    default_auto_field = OBJECT_ID
