"""
Serializers de autenticação.

O ponto central do projeto: o ACCESS token volta no corpo da resposta (o axios
precisa ler para montar o header `Authorization: Bearer <token>`), mas o REFRESH
token nunca e exposto ao JavaScript — ele vai num cookie httpOnly, inacessivel
a `document.cookie`.

Se o refresh vazar (XSS, devtools de terceiro, extensao), o atacante ainda tem
so 15 minutos de acesso antes do token expirar.
"""

from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()


def tipo_de_conta(user) -> str:
    """Rótulo da conta mostrado no painel. Hoje todo acesso ao painel é de administrador."""
    return 'Administrador' if user.is_staff else 'Usuário'


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Inclui nome e papel do usuario na resposta do login.

    O React usa esses dados para exibir o nome no header e decidir o que renderizar,
    sem precisar de uma segunda chamada a /api/v1/auth/me/.
    """

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # Claims customizadas ficam disponiveis em `request.user.<claim>` no backend.
        # Nome completo pode ser Added Claim e acabar pesando no tamanho do token,
        # entao fica apenas o id e o papel.
        token['name'] = user.get_full_name() or user.username
        token['role'] = getattr(user, 'role', 'VOLUNTARIO')

        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = {
            'id': self.user.id,
            'username': self.user.username,
            'name': self.user.get_full_name() or self.user.username,
            'role': getattr(self.user, 'role', 'VOLUNTARIO'),
            'is_staff': self.user.is_staff,
            'tipo_conta': tipo_de_conta(self.user),
        }
        return data