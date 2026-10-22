# Plano de Remodelagem — Sistema ONG do Povo

> **Status:** em execução — Fase 0 concluída (03/10/2026).
> **Escopo:** remodelagem técnica do monorepo `apidjango` (Django) + `frontend` (React/Vite).
> **Última atualização:** 04/10/2026

---

## 0. Decisões já tomadas

| Tema            | Decisão                                                            | Justificativa                                                                   |
| --------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| Backend         | **Django 5 + DRF** (Spring Boot removido)                          | Time mais forte em Python; sem exigência curricular; admin nativo e ORM simples |
| Frontend        | **React 19 + Vite + TypeScript + Tailwind v4**                     | Já em andamento, familiaridade do time                                          |
| Banco           | **PostgreSQL**                                                     | Já configurado no `docker-compose.yml`                                          |
| Arquitetura     | **Monólito em camadas**                                            | Microserviços em projeto de semestre é o que mais mata cronograma               |
| Contrato de API | **OpenAPI como fonte da verdade** → geração de tipos no front      | Quebra de contrato aparece em `tsc`, não em produção                            |
| Package manager | **pnpm 12.6.0** como padrão do time                                  | Mais rápido e econômico em disco; `packageManager` pinado no `package.json`      |
| Autenticação    | **JWT em httpOnly cookie** (`withCredentials`)                       | Impede exfração do token por XSS; exige `CORS_ALLOW_CREDENTIALS = True`         |
| Polish          | `Django admin` como back-office interno; React como frente pública | Economia de semanas em CRUD                                                     |

---

## 1. Estado atual do repositório

```
ProjetoIntegrador_OngDoPovo/
├── apidjango/              # Django 5.2.17 — funcional, porém sem domínio
│   ├── .env                # ✅ corretamente gitignored (.gitignore:135)
│   ├── core/               # app vazio gerado pelo startproject
│   ├── requirements.txt    # 5 dependências
│   ├── setup/settings.py   # 142 linhas, config incompleta
│   └── venv/               # ⚠️ versionado no path local, deve continuar ignorado
├── frontend/               # React 19 + Vite 8 — landing page estática
│   ├── src/App.tsx         # página única, 8 sections hardcoded
│   ├── src/components/     # 9 componentes de landing
│   ├── package.json        # 7 deps de runtime
│   └── package-lock.json + pnpm-lock.yaml   # ⚠️ dois lockfiles
├── docker-compose.yml      # ⚠️ só sobe o banco
├── anotamentamento do projeto.md   # ⚠️ obsoleto (menciona Spring Boot e MongoDB)
├── tutorial avançado.md            # ⚠️ obsoleto (menciona Java JDK 21 e Maven)
└── README.md                       # ✅ bom, é a fonte do escopo de domínio
```

**Verificações feitas e aprovadas:**
- `.env` **não** está rastreado pelo git — correto
- `apidjango/venv` com Django 5.2.17 **bate** com o `requirements.txt`
- `.obsidian/` ignorado corretamente
- `dist/` e `node_modules/` ignorados corretamente
- working tree limpa, branch `main` sincronizada com `origin/main`

---

## 2. Bugs encontrados (corrigir na Fase 0)

### 2.1 `CorsMiddleware` na posição errada — `apidjango/setup/settings.py:56`

Está na **última** posição da lista `MIDDLEWARE`, depois de `CommonMiddleware` e `XFrameOptionsMiddleware`.

A documentação do Django é explícita: o CORS deve ser aplicado **antes** de qualquer middleware que possa gerar resposta, para que os headers sejam inclusos mesmo em respostas de preflight `OPTIONS`.

**Correção:** mover para a segunda posição da lista.

```python
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',          # ← mover para cá
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'django.middleware.common.CommonMiddleware',     # ← descer
]
```

> Hoje não causa erro visível porque **nenhuma chamada real de API existe ainda** no frontend. Vai falhar no primeiro `fetch`.

---

### 2.2 `MAILERS` não é um setting do Django — `apidjango/setup/settings.py:134`

```python
# ATUAL (ignorado silenciosamente pelo Django)
MAILERS = {
    'default': {'BACKEND': 'django.core.mail.backends.console.EmailBackend'},
}
```

`MAILERS` foi removido do Django 1.8. O Django ignora a chave e usa o backend SMTP padrão. Vai morder no primeiro envio real (confirmação de contato, recuperação de senha).

```python
# CORRETO
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
```

---

### 2.3 `DEFAULT_AUTO_FIELD` ausente

Não está em `settings.py`. O primeiro model real criado vai disparar o aviso `models.W042` e usar `AutoField` (32 bits) no lugar de `BigAutoField`.

```python
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
```

---

### 2.4 Docstring com versão errada — `apidjango/setup/settings.py:4`

O cabeçalho diz `Generated by 'django-admin startproject' using Django 6.1.1`, mas o projeto usa Django 5.2.17. É lixo residual do template — apagar ou corrigir.

---

## 3. Configuração ausente no Django

### 3.1 Bloco `REST_FRAMEWORK` não existe

O DRF está instalado (`3.15.2`) e completamente inerte. Sem authentication, sem permission, sem paginação.

```python
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_FILTER_BACKENDS': (
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ),
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}
```

### 3.2 Segredos e ambiente

```python
# ATUAL — hardcoded
SECRET_KEY = 'django-insecure-ael%a@p5ux&69fmt&5asz%=7n=8)x9)1bgtv9e^=(e^d-8%8uy'
DEBUG = True
ALLOWED_HOSTS = []
```

```python
# PROPOSTO
import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")          # ← path explícito, não depende do CWD

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "dev-insecure-nao-usar-em-producao")
DEBUG = os.getenv("DJANGO_DEBUG", "True").lower() == "true"
ALLOWED_HOSTS = os.getenv("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")
```

`load_dotenv(BASE_DIR / ".env")` é mais robusto que `load_dotenv()` sem argumento: o `manage.py` funciona de qualquer diretório.

### 3.3 Localidade e fuso horário — `settings.py:116-118`

```python
# ATUAL — errado para uma ONG brasileira
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'

# CORRETO
LANGUAGE_CODE = 'pt-br'
TIME_ZONE = 'America/Sao_Paulo'
```

Sem isso, agenda de aulas, datas de doação e relatórios de captação saem com dia/horário errados.

### 3.4 Estáticos e uploads

```python
STATIC_URL = 'static/'
# ADICIONAR:
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = 'media/'
MEDIA_ROOT = BASE_DIR / "media"
```

Necessário já na Fase 2: o histórico do git mostra que já existe upload de logo, e programas/aulas vão precisar de imagem.

### 3.5 CORS — evoluir de lista para env

```python
# ATUAL
CORS_ALLOWED_ORIGINS = ["http://localhost:5173"]

# PROPOSTO
CORS_ALLOWED_ORIGINS = os.getenv(
    "CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
).split(",")
```

Somar `127.0.0.1:5173` ao lado de `localhost:5173` — o Vite pode abrir em qualquer um dos dois dependendo do SO e o navegador trata como origens diferentes.

---

## 4. Dependências Python

### 4.1 Instaladas (venv confere com o requirements) ✅

| Pacote | Versão |
|---|---|
| Django | 5.2.17 |
| djangorestframework | 3.15.2 |
| psycopg2-binary | 2.9.13 |
| django-cors-headers | 4.3.1 |
| python-dotenv | 1.0.1 |

### 4.2 A adicionar — runtime (`apidjango/requirements.txt`)

| Pacote | Prioridade | Motivo |
|---|---|---|
| `djangorestframework-simplejwt` | 🔴 alta | O README exige "Login Administrativo". Sem isso não há autenticação |
| `drf-spectacular` | 🔴 alta | Gera o `openapi.json` — é o contrato de integração com o front |
| `django-filter` | 🟡 média | Filtrar doações por período/valor, programas por categoria |
| `gunicorn` | 🟡 média | `runserver` não é para produção; necessário no container |
| `whitenoise` | 🟡 média | Servir estáticos atrás do container sem Nginx |

### 4.3 A adicionar — desenvolvimento (`apidjango/requirements-dev.txt`, arquivo novo)

| Pacote | Motivo |
|---|---|
| `pytest` + `pytest-django` | Suite de testes |
| `ruff` | Lint + format num comando só |

**Separar dev de runtime é importante** porque é o `requirements.txt` que vai pro container de produção.

### 4.4 notas

- `psycopg2-binary` está correto para desenvolvimento. Só trocar por `psycopg[binary]` se houver problema de build em alguma máquina do time.
- O `requirements.txt` usa `~=` (tilde). Com 5 devs e sem lockfile, cada um pode instalar um patch diferente. **Considerar** `pip-compile`/`pip-tools` ou `uv` para gerar um lockfile de Python. Não é bloqueante, mas reduz "funciona na minha máquina".

---

## 5. Dependências Frontend

### 5.1 Instaladas ✅

`react` 19.2.8 · `react-dom` 19.2.8 · `react-router-dom` 7.18.4 *(instalado, nunca usado)* · `axios` 1.20.0 · `lucide-react` · `tailwindcss` 4.3.3 + `@tailwindcss/vite` · `typescript` 6.0.2 · `vite` 8.3.0

### 5.2 A adicionar — runtime

| Pacote | Prioridade | Motivo |
|---|---|---|
| `@tanstack/react-query` | 🔴 alta | Cache, refetch, estados de loading/error. Sem isso cada requisição vira `useState` + `useEffect` manual |
| `zod` | 🔴 alta | Validação de payload e de formulário |
| `react-hook-form` | 🔴 alta | Formulários de aluno, voluntário, doação |
| `@hookform/resolvers` | 🔴 alta | Integra zod ao react-hook-form |
| `class-variance-authority`, `clsx`, `tailwind-merge` | 🟡 média | Dependências do shadcn/ui |
| `@radix-ui/react-dialog`, `-select`, `-label`, `-toast` (etc.) | 🟡 média | Primitivos acessíveis do shadcn/ui, sob demanda |

### 5.3 A adicionar — dev

| Pacote | Motivo |
|---|---|
| `orval` | 🔴 Gera o client TypeScript a partir do `openapi.json` do Django |
| `vitest` + `@testing-library/react` + `jsdom` | Não existe **nenhum** script de teste hoje |
| `prettier` | Padronização de formatação |

### 5.4 Scripts a adicionar no `package.json`

```jsonc
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "lint": "eslint .",
  "format": "prettier --write \"src/**/*.{ts,tsx,css}\"",
  "test": "vitest run",
  "test:watch": "vitest",
  "api:generate": "orval --config orval.config.ts"   // regenera client a partir do OpenAPI
}
```

### 5.5 Higiene

- `src/assets/react.svg` e `src/assets/vite.svg` — boilerplate do `npm create vite`, não usados. Remover.
- `src/components/header.tsx` — único arquivo em minúscula; todos os outros são `PascalCase.tsx`. Em filesystem Linux isso funciona, mas o import quebra entre Windows e macOS/Linux. Renomear para `Header.tsx`.

---

## 6. pnpm vs npm — decisão em aberto

### 6.1 O diagnóstico

Os **dois** lockfiles estão commitados:

```
frontend/package-lock.json   127 KB   23/set   ← rastreado
frontend/pnpm-lock.yaml       77 KB   22/set   ← rastreado
```

Duas fontes de verdade. E o modo de falha concreto: quando alguém roda `pnpm add <pacote>`, **só** o `pnpm-lock.yaml` é atualizado. O `package-lock.json` fica parado, e um colega rodando `npm ci` instala a versão antiga.

### 6.2 O que é compartilhável

O `package.json` com suas faixas `^19.2.8` **é** o padrão de dependências, e ele é único para todo mundo. O lockfile é só um cache de resolução. Divergências de *patch* dentro da faixa `^` são, na prática, inofensivas num projeto deste tamanho.

### 6.3 Opções

| | Opção A ⭐ | Opção B | Opção C |
|---|---|---|---|
| **Padrão do time** | pnpm | npm | nenhum |
| **Lockfile commitado** | só `pnpm-lock.yaml` | só `package-lock.json` | nenhum |
| **Seus comandos** | `pnpm install` | `pnpm install` local, mas o lock do git é o do npm | `npm install` / `pnpm install` |
| **Fora do git** | apagar `package-lock.json` | ignorar `pnpm-lock.yaml` via `.git/info/exclude` | os dois no `.gitignore` |
| **Custo** | os 5 precisam instalar pnpm | seu `node_modules` pode ter patch diferente dos outros | todo mundo resolve diferente — **não recomendado** |

### 6.4 Recomendação: Opção A

Cinco pessoas, um semestre, zero deploy de produção. pnpm é mais rápido e mais econômico em disco — que é o seu objetivo. E `pnpm run <script>` é idêntico a `npm run <script>`, então nada na documentação do time muda.

Dois cuidados se for de A:
- Adicionar `"packageManager": "pnpm@<versão>"` no `package.json` — o Corepack avisa quem tentar usar outra versão
- pnpm usa symlinks e não faz hoist plano. O Vite lida bem; se algum tooling reclamar, criar `frontend/.npmrc` com `node-linker=hoisted`

> **Aguardando decisão do time.**

---

## 7. Rotas — como funciona (referência para o time)

Existem **dois sistemas de rotas independentes**. Não são alternativa — as duas são necessárias.

| | Rotas do React | Rotas do Django |
|---|---|---|
| Onde vive | `react-router-dom`, no browser | `urls.py`, no servidor |
| Decide | qual **componente** aparece | qual **endpoint** existe e o que retorna |
| Quem usa | o usuário digita na barra | só o frontend chama, por dentro |
| Formato | `localhost:5173/alunos/123` | `localhost:8000/api/v1/alunos/123/` |

Fluxo de um clique:

```
usuário digita  localhost:5173/alunos/123
   ↓
React Router casa a rota → renderiza <AlunoDetalhe id="123" />
   ↓
o componente faz fetch   → GET http://localhost:8000/api/v1/alunos/123/
   ↓
Django urls.py casa      → AlunoDetailView.get()
   ↓
retorna JSON             → { "id": 123, "nome": "Ana", "turma": "Ballet" }
   ↓
React renderiza a tela
```

**Não há correspondência 1:1.** Pode haver 20 telas no React consumindo 4 endpoints. O React Router cuida da navegação; o `urls.py` cuida dos dados.

A única URL digitada por humano hoje é `/admin/` do Django — que já é um sistema de rotas funcionando.

### 7.1 Estrutura de URLs planejada

```python
# apidjango/setup/urls.py
urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/auth/token/",      TokenObtainPairView.as_view()),
    path("api/v1/auth/token/refresh/", TokenRefreshView.as_view()),
    path("api/schema/",  SpectacularAPIView.as_view()),
    path("api/docs/",    SpectacularSwaggerView.as_view(url_name="schema")),
    path("api/v1/", include("doacoes.urls")),
    # ... um include() por app de domínio
]
```

**Versionamento `/api/v1/` desde o dia 1** — quando o professor pedir mudança de contrato, não quebra ninguém.

---

## 8. Arquitetura do backend

### 8.1 Apps de domínio

Mapeamento a partir do README, reagrupado para não criar app demais:

| App | Cobre | Quando |
|---|---|---|
| `usuarios` | `User` customizado com `role` | Fase 3 |
| `programas` | Programas + Turmas (vínculo com professor e horário) | Fase 3 |
| `alunos` | Alunos + Responsáveis | Fase 3 |
| `voluntarios` | Professores e voluntários | Fase 3 |
| `agenda` | Aulas, mutirões, eventos | Fase 3 |
| **`doacoes`** | Doações + Campanhas | **Fase 2 — primeiro** |
| `impacto` | Indicadores e depoimentos | Fase 3 |
| `contato` | Mensagens do formulário | Fase 3 |

`core` (vazio, gerado pelo startproject) será removido na Fase 2.

### 8.2 Model — `doacoes` (primeiro slice)

Começar por aqui porque é o que prova o encanamento inteiro com o menor esforço.

```python
# apidjango/doacoes/models.py
from django.db import models


class Doacao(models.Model):
    class Status(models.TextChoices):
        PENDENTE   = "PENDENTE",   "Pendente"
        CONFIRMADA = "CONFIRMADA", "Confirmada"
        CANCELADA  = "CANCELADA",  "Cancelada"

    class FormaPagamento(models.TextChoices):
        PIX          = "PIX",          "Pix"
        DINHEIRO     = "DINHEIRO",     "Dinheiro"
        CARTAO       = "CARTAO",       "Cartão"
        TRANSFERENCIA = "TRANSFERENCIA", "Transferência"

    nome       = models.CharField(max_length=150)
    email      = models.EmailField()
    telefone   = models.CharField(max_length=20, blank=True)
    anonimo    = models.BooleanField(default=False)

    valor            = models.DecimalField(max_digits=10, decimal_places=2)
    forma_pagamento  = models.CharField(max_length=20, choices=FormaPagamento.choices)
    status           = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDENTE
    )

    mensagem  = models.TextField(blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-criado_em"]
        verbose_name = "Doação"
        verbose_name_plural = "Doações"

    def __str__(self) -> str:
        return f"{self.nome} — R$ {self.valor}"
```

**Três decisões que valem registro no documento (todas vão ser perguntadas):**

- **`anonimo`** — primeira questão de LGPD do projeto. Se marcado, o serializer pode expor um nome masked sem alterar o banco. Decisão a tomar com o professor.
- **`status` separado** — doação real sempre passa por confirmação humana. Já justifica a existência do painel administrativo.
- **`choices` com `TextChoices`** — legível no admin, gera validação automática no DRF, e é a diferença entre um admin usável e um CRUD cru.

### 8.3 Models dos demais apps (esboço, refinados na Fase 3)

**`programas/models.py`**
```python
class Programa(models.Model):
    class Categoria(models.TextChoices):
        ESPORTE = "ESPORTE", "Esporte"
        SAUDE   = "SAUDE",   "Saúde"
        CAPACITACAO = "CAPACITACAO", "Capacitação"
        COMUNIDADE = "COMUNIDADE", "Comunidade"

    nome       = models.CharField(max_length=150)
    categoria  = models.CharField(max_length=20, choices=Categoria.choices)
    descricao  = models.TextField(blank=True)
    imagem     = models.ImageField(upload_to="programas/", blank=True)
    vagas      = models.PositiveIntegerField(default=0)
    ativo      = models.BooleanField(default=True)
    criado_em  = models.DateTimeField(auto_now_add=True)

class Turma(models.Model):
    programa   = models.ForeignKey(Programa, on_delete=models.CASCADE, related_name="turmas")
    nome       = models.CharField(max_length=100)
    professor  = models.ForeignKey("voluntarios.Voluntario", on_delete=models.PROTECT, related_name="turmas")
    dia_semana = models.PositiveIntegerField()   # 0=segunda ... 6=domingo
    hora_inicio = models.TimeField()
    vagas_totais = models.PositiveIntegerField()
```

**`alunos/models.py`**
```python
class Responsavel(models.Model):
    nome      = models.CharField(max_length=150)
    cpf       = models.CharField(max_length=14, unique=True)
    telefone  = models.CharField(max_length=20)
    email     = models.EmailField(blank=True)
    parentesco = models.CharField(max_length=50)

class Aluno(models.Model):
    nome             = models.CharField(max_length=150)
    data_nascimento  = models.DateField()
    cpf              = models.CharField(max_length=14, unique=True)
    endereco         = models.TextField(blank=True)
    telefone         = models.CharField(max_length=20, blank=True)
    email            = models.EmailField(blank=True)
    responsaveis     = models.ManyToManyField(Responsavel, related_name="alunos")
    turmas           = models.ManyToManyField(Turma, related_name="alunos")
    ativo            = models.BooleanField(default=True)
    criado_em        = models.DateTimeField(auto_now_add=True)
```

**`voluntarios/models.py`**
```python
class Voluntario(models.Model):
    class Funcao(models.TextChoices):
        PROFESSOR   = "PROFESSOR",   "Professor"
        VOLUNTARIO  = "VOLUNTARIO",  "Voluntário"
        COORDENADOR = "COORDENADOR", "Coordenador"

    nome     = models.CharField(max_length=150)
    cpf      = models.CharField(max_length=14, unique=True)
    email    = models.EmailField()
    telefone = models.CharField(max_length=20)
    funcao   = models.CharField(max_length=20, choices=Funcao.choices)
    areas    = models.ManyToManyField(Programa, related_name="voluntarios")
    ativo    = models.BooleanField(default=True)
```

**`agenda/models.py`**
```python
class Evento(models.Model):
    class Tipo(models.TextChoices):
        AULA      = "AULA",      "Aula"
        MUTIRAO   = "MUTIRAO",   "Mutirão"
        EVENTO    = "EVENTO",    "Evento"

    titulo       = models.CharField(max_length=200)
    descricao    = models.TextField(blank=True)
    tipo         = models.CharField(max_length=20, choices=Tipo.choices)
    programa     = models.ForeignKey(Programa, on_delete=models.SET_NULL, null=True, blank=True)
    data_inicio  = models.DateTimeField()
    data_fim     = models.DateTimeField()
    local        = models.CharField(max_length=200)

    class Meta:
        ordering = ["data_inicio"]
```

**`impacto/models.py`**
```python
class Indicador(models.Model):
    nome      = models.CharField(max_length=100)
    valor     = models.CharField(max_length=50)   # string de propósito: "1.200+"
    unidade   = models.CharField(max_length=30, blank=True)
    icone     = models.CharField(max_length=50, blank=True)
    ordem     = models.PositiveIntegerField(default=0)
    ativo     = models.BooleanField(default=True)

class Depoimento(models.Model):
    autor  = models.CharField(max_length=150)
    cargo  = models.CharField(max_length=150, blank=True)
    texto  = models.TextField()
    foto   = models.ImageField(upload_to="depoimentos/", blank=True)
    ativo  = models.BooleanField(default=True)
```

**`contato/models.py`**
```python
class Mensagem(models.Model):
    nome      = models.CharField(max_length=150)
    email     = models.EmailField()
    telefone  = models.CharField(max_length=20, blank=True)
    assunto   = models.CharField(max_length=150)
    mensagem  = models.TextField()
    lida      = models.BooleanField(default=False)
    criado_em = models.DateTimeField(auto_now_add=True)
```

### 8.4 Esqueleto de um app (padrão a repetir)

```
apidjango/doacoes/
├── __init__.py
├── admin.py          # ModelAdmin com list_display, list_filter, search_fields
├── apps.py
├── models.py
├── serializers.py    # ModelSerializer
├── urls.py           # router.register("doacoes", DoacaoViewSet)
├── views.py          # ModelViewSet
├── tests.py
└── migrations/
```

**Regra de permissão, em todo app:**
- `list` / `retrieve` → público (permite `AllowAny` para a vitrine pública)
- `create` → `AllowAny` **apenas** no endpoint público de doação; exigir auth no admin
- `update` / `destroy` → `IsAdminUser`

---

## 9. Arquitetura do frontend

### 9.1 `App.tsx` hoje

Página única com 8 sections hardcoded (`HeroSection`, `AboutSection`, `CatalogSection`, `ImpactSection`, `ScheduleSection`, `DonationsSection`, `ContactSection`, `Footer`). Funciona como landing page, mas **não** suporta o que o README pede.

### 9.2 Estrutura alvo

```
frontend/src/
├── api/                 # gerado pelo Orval — NÃO editar à mão
│   └── generated/
├── components/          # UI genérica
│   ├── ui/              # shadcn/ui
│   └── layout/          # Header, Footer
├── features/            # uma pasta por domínio
│   ├── doacoes/
│   │   ├── DoacoesPage.tsx
│   │   ├── DoacaoForm.tsx
│   │   └── useDoacoes.ts
│   ├── programas/
│   └── agenda/
├── lib/                 # axios instance, queryClient, utils
├── routes/
│   └── index.tsx        # definição das rotas
├── App.tsx
└── main.tsx
```

**Migrar de `components/` para `features/` + `components/ui/`** é o que dá escala depois. Não é urgente na Fase 2 — pode acontecer junto com a Fase 3.

### 9.3 Configuração do axios

```ts
// frontend/src/lib/api.ts
import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,   // exigido se o token for httpOnly cookie
});

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    // refresh automático do token em 401
    return error;
  }
);
```

### 9.4 Variáveis de ambiente

```
# frontend/.env.example
VITE_API_URL=http://localhost:8000/api/v1
```

O `VITE_` prefix é obrigatório — o Vite só expõe ao browser o que começa com isso.

### 9.5 Orval

```ts
// frontend/orval.config.ts
export default {
  ong: {
    input: "http://localhost:8000/api/schema/",
    output: {
      mode: "tags-split",
      target: "src/api/generated",
      schemas: "src/api/generated/model",
      client: "axios",
      mock: false,
    },
  },
};
```

Fluxo: mudar um serializer no Django → rodar `npm run api:generate` → o front passa a usar o payload novo, com erro em `tsc` se o contrato quebrar.

---

## 10. Docker

### 10.1 Problemas atuais

- `version: '3.8'` — obsoleto; o Compose v2 emite warning e ignora
- Só o serviço `db` existe; backend e frontend rodam na mão
- Sem healthcheck no Postgres → `docker compose up` retorna antes do banco aceitar conexão
- Senha `123` hardcoded
- `postgres:15` (atualizar para 16)

### 10.2 Alvo

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: ${DB_NAME:-ongdb}
      POSTGRES_USER: ${DB_USER:-postgres}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    ports: ["5432:5432"]
    volumes: ["postgres_data:/var/lib/postgresql/data"]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-postgres}"]
      interval: 5s
      timeout: 5s
      retries: 10

  api:
    build: ./apidjango
    command: sh -c "python manage.py migrate && python manage.py runserver 0.0.0.0:8000"
    volumes: ["./apidjango:/app"]
    ports: ["8000:8000"]
    env_file: [.env]
    depends_on:
      db: {condition: service_healthy}

  web:
    image: node:22-alpine
    working_dir: /app
    command: sh -c "npm install && npm run dev -- --host"
    volumes: ["./frontend:/app"]
    ports: ["5173:5173"]
    depends_on: [api]
```

Ganho concreto: `docker compose up` sobe o ambiente inteiro, e o setup documentado no README passa a ser um comando.

### 10.3 `apidjango/Dockerfile` (novo)

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["gunicorn", "setup.wsgi:application", "--bind", "0.0.0.0:8000"]
```

---

## 11. Documentação a reescrever

### 11.1 `anotamentamento do projeto.md` — obsoleto

Problemas: título cita Spring Boot · linha 3 diz *"utilizando o MongoDB como banco de dados não-relacional"* (o projeto usa PostgreSQL) · cita a pasta `api-django`, que na verdade é `apidjango` · o plano de `/ping` com dois botões é específico da arquitetura polyglot abandonada.

**O que preservar:** o plano de CORS, a variável de ambiente, e a ideia do Sprint 0 (provar o encanamento) — é exatamente a Fase 1 deste plano.

### 11.2 `tutorial avançado.md` — obsoleto

Pré-requisitos ainda pedem **Java JDK 21 e Maven**. A introdução fala em "API de serviços (Java/Spring Boot)".

**Reescrever** como setup de um comando, substituindo o Spring Boot por comandos do Django.

### 11.3 `README.md` — bom, não mexer

É a fonte do escopo de domínio e está bem escrito. Apenas considerar linkar o `PLANO_REMODELAGEM.md` a partir dele.

---

## 12. Execução por fases

### Fase 0 — Corrigir o que está quebrado
**Risco: baixo. Não adiciona funcionalidade.**
**Status: ✅ executada em 03/10/2026 — validada com `manage.py check`, `tsc -b`, `vite build` e `eslint`.**

- [x] Mover `CorsMiddleware` para o topo do `MIDDLEWARE`
- [x] `MAILERS` → `EMAIL_BACKEND`
- [x] `DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'`
- [x] `LANGUAGE_CODE = 'pt-br'`, `TIME_ZONE = 'America/Sao_Paulo'`
- [x] `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS` via env
- [x] `load_dotenv(BASE_DIR / ".env")`
- [x] `STATIC_ROOT`, `MEDIA_URL`, `MEDIA_ROOT`
- [x] `CORS_ALLOWED_ORIGINS` via env (inclui `127.0.0.1:5173`)
- [x] Corrigir/apagar docstring da versão
- [x] Criar `apidjango/.env.example` e `frontend/.env.example`
- [x] Renomear `header.tsx` → `Header.tsx` (via `git mv`; import atualizado em `HeroSection.tsx:2`)
- [x] Remover `assets/react.svg` e `assets/vite.svg`
- [ ] Bloco `REST_FRAMEWORK` — **adiado para a Fase 1**, os imports de `simplejwt` ainda não existem
- [x] Decidir o lockfile e remover o perdedor — ✅ **pnpm escolhido (04/10)**; `package-lock.json` removido do git

**Extras feitos fora do plano original (flaggados para revisão):**
- `index.html`: `lang="en"` → `lang="pt-BR"`, `<title>frontend</title>` → `ONG do Povo`, e `<meta name="description">` com o texto da ONG
- `DEFAULT_FROM_EMAIL` configurado junto do `EMAIL_BACKEND`
- `CORS_ALLOW_CREDENTIALS = True` preparado para a decisão do token httpOnly (seção 13, decisão 3)

### Fase 1 — Auth e contrato de API
**Risco: baixo. É a fundação da integração.**
**Status: ✅ executada em 04/10/2026 — validada por curl, `pytest` (15 testes), `tsc`, `eslint`, `vite build`.**

- [x] Deps de runtime: simplejwt, drf-spectacular, django-filter, gunicorn, whitenoise
- [x] `requirements-dev.txt` + `pyproject.toml` (ruff e pytest configurados)
- [x] `SIMPLE_JWT` em `settings.py` com access 15min / refresh 7d e rotação
- [x] Refresh token em **cookie httpOnly**; access token no corpo
- [x] Rate limit de `10/minute` no login, ajustável por `DJANGO_AUTH_THROTTLE`
- [x] `api/schema/`, `api/docs/` (Swagger) e `api/redoc/`
- [x] Rotas de token, refresh, logout e me em `setup/urls.py`
- [x] `frontend/.env.local` + alias `@/` (tsconfig + vite.config)
- [x] `orval.config.ts` com mutator apontando para a instância do axios
- [x] `frontend/src/lib/api.ts` — interceptor de refresh transparente
- [x] `frontend/src/lib/queryClient.ts` + `QueryClientProvider`
- [x] **`Sprint 0`: `/api/v1/ping/`** + `<TestApiButton />` no React
- [x] `frontend/src/vite-env.d.ts` com tipagem das variáveis de env

> **Critério de pronto:** ✅ATINGIDO — `/api/v1/ping/` responde `{"servico":"django","status":"ok","banco":"ok"}` e o client gerado pelo Orval o consome com `baseURL` e `withCredentials` corretos.

#### Armadilhas encontradas e resolvidas na Fase 1

| Problema | Como foi resolvido |
|---|---|
| Orval gerava `axios.default.post()`, ignorando `baseURL` e `withCredentials` — o cookie httpOnly nunca chegaria | `output.override.mutator` apontando para a instância de `src/lib/api.ts` |
| `v1AuthTokenCreate` retornava `AxiosResponse<void>` | `@extend_schema` com `LoginResponseSerializer` explícito |
| Sem tags, o client inteiro caía num arquivo `v1/` | `tags=['auth']` e `tags=['sistema']` nas views |
| Schema servido como YAML por padrão | `?format=json` no `VITE_API_SCHEMA_URL` |
| Views sem serializer explícito sumiam do schema (não apareceriam no client) | `request=None` + serializers de resposta em `extend_schema` |
| Rate limit glob contaminava o `pytest` | Fixture autouse limpando o cache |
| `baseUrl` depreciado no TypeScript 6 | `paths` sem `baseUrl` (resolve relativo ao tsconfig) |
| pnpm 12 bloqueia build scripts; esbuild ficaria quebrado em install limpo | `pnpm.onlyBuiltDependencies: ["esbuild"]` |

#### Pendente (não bloqueia)

- [ ] Nomes das funções geradas ficaram `v1AuthTokenCreate`. O `output.operations` do Orval 8 ignorou o `operationName` custom. Cosmético; dá para renomear depois com um transformer ou aceitar.
- [ ] `src/api/generated/` **está sendo commitado** de propósito: quem só mexe no frontend consegue rodar `tsc` e `build` sem subir o Django. Reavaliar se o time preferir regenerar sempre.

### Fase 2 — Primeiro slice vertical: `doacoes`
**Risco: médio. Primeira funcionalidade real.**

- [ ] `python manage.py startapp doacoes`
- [ ] `models.py` com `Doacao` (seção 8.2)
- [ ] `serializers.py`, `views.py`, `urls.py`, `admin.py`
- [ ] Registrar em `setup/urls.py` sob `/api/v1/`
- [ ] `makemigrations` + `migrate`
- [ ] `requirements-dev.txt` + primeiro teste de API
- [ ] `frontend/src/features/doacoes/` com TanStack Query
- [ ] Formulário de doação com react-hook-form + zod
- [ ] Rodar `npm run api:generate` e consumir o client gerado
- [ ] Remover o app `core` vazio

> **Critério de pronto:** doador preenche o form no React → registro aparece no `/admin/` do Django.

### Fase 3 — Domínio completo
- [ ] `usuarios` com `User` customizado e `role`
- [ ] `voluntarios`, `programas`, `alunos`, `agenda`, `impacto`, `contato`
- [ ] Migrar `App.tsx` para `react-router-dom` com rotas reais
- [ ] Mover sections estáticas de `components/` para `features/`
- [ ] Decidir: dashboard próprio no React ou manter o Django admin
- [ ] Testes de API em todos os apps

### Fase 4 — Docker e documentação
- [ ] `apidjango/Dockerfile`
- [ ] `docker-compose.yml` com `db` + `api` + `web`, healthcheck, Postgres 16
- [ ] `.env` na raiz compartilhado pelos serviços
- [ ] Reescrever `anotamentamento do projeto.md`
- [ ] Reescrever `tutorial avançado.md`
- [ ] CI com `ruff` + `eslint` + `pytest`

### Fase 5 — Opcional: a segunda linguagem
Só se sobrar tempo. Worker assíncrono isolado em `relatorios/` para previsão de doações e relatório de captação. **Um** ponto de integração, **um** dono, **zero** impacto no núcleo. Não é requisito — registrar a decisão arquitetural no documento do projeto basta.

---

## 13. Decisões em aberto

| # | Pergunta | Recomendação | Quando decidir |
|---|---|---|---|
| 1 | pnpm ou npm como padrão do time? | ✅ **pnpm (Opção A)** | **Resolvido 04/10** |
| 2 | Começar pela Fase 0+1 ou pular pro slice de `doacoes`? | ✅ Fase 0+1 primeiro | **Resolvido 04/10** |
| 3 | Token em httpOnly cookie ou `localStorage`? | ✅ **httpOnly** | **Resolvido 04/10** |
| 4 | Dashboard admin: Django admin ou React próprio? | Django admin + React só para o público | Fase 3 |
| 5 | LGPD: como tratar `anonimo`? | Decidir com o professor | Fase 2 |
| 6 | O professor aceita o Django admin como entrega de interface? | **Perguntar antes** de investir | Ainda aberto |

### 13.1 Registro das decisões aplicadas

**Decisão 1 — pnpm (04/10/2026)**
- `frontend/package-lock.json` removido do git
- `frontend/pnpm-lock.yaml` é o único lockfile
- `package.json` recebeu `"packageManager": "pnpm@12.6.0"` e `"engines": {"node": ">=20"}`
- Docstring para a equipe: usar `pnpm install` (nunca `npm install`, que resolveria versões diferentes e poluiria o repo com um novo `package-lock.json`)

**Decisão 3 — httpOnly (04/10/2026)**
- Consequências já aplicadas na Fase 0: `CORS_ALLOW_CREDENTIALS = True` em `settings.py`
- O SimpleJWT precisa ser configurado para gravar o refresh token via cookie na Fase 1 (ver 12/Fase 1)
- No frontend: `axios.create({ withCredentials: true })` e interceptor de refresh em 401

---

## 14. Fora de escopo (decidido não fazer)

| Não fazer | Motivo |
|---|---|
| Migrar de ORM / microserviços | Monólito em camadas é o certo aqui |
| Manter Spring Boot em paralelo | Duas bases, dois deploys, contrato divergente |
| Second language obrigatória | Sem exigência curricular; só se sobrar tempo (Fase 5) |
| Lockfile gerado pelos dois package managers | Duas fontes de verdade |
| `localStorage` para token | Superfície de XSS desnecessária |
| Dashboard admin completo em React antes do domínio | Custo alto, valor demonstrável baixo nessa ordem |
| Testes E2E / Playwright | Custo alto demais pro escopo; testes de API bastam |

---

## 15. Perguntas a fazer ao professor

1. O **Django admin** conta como entrega de interface, ou é considerado atalho? *(define o tamanho real da Fase 3)*
2. A **LGPD** é requisito avaliado? *(define o tratamento de `anonimo` e dados de menores)*
3. **Prazo real** de cada fase e data da demonstração? *(define o corte de escopo)*
4. O escopo do backlog está **congelado**? *(escopo de ONG cresce infinitamente — cortar cedo é obrigatório)*
5. AVALIAÇÃO: o que pesa mais — funcionalidades, documentação ou arquitetura? *(muda onde investir o tempo)*

---

*Fim do plano. Nenhum arquivo do projeto foi alterado na elaboração deste documento.*
