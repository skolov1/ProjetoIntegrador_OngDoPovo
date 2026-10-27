# ONG do Povo — Tutorial avançado

Como subir, usar e manter o **Sistema ONG do Povo** na sua máquina. Este guia reflete o estado do projeto em **28/10/2026**.

O sistema tem três partes:

| Parte | O que é | Pasta | Porta |
|---|---|---|---|
| **Banco de dados** | PostgreSQL 15 no Docker | raiz (`docker-compose.yml`) | 5432 |
| **API + painel Django** | Django 5.2 + Django REST Framework, JWT em cookie httpOnly | `apidjango/` | 8000 |
| **Site e painel (front)** | React 19 + Vite + TypeScript, cliente da API gerado pelo Orval | `frontend/` | 5173 |

> **A API em Java (Spring Boot) não faz mais parte do projeto.** Versões antigas deste tutorial mandavam subir `api-java`. A pasta `apijava/` hoje só guarda artefatos de build ignorados pelo Git, e o front não chama nenhuma API na porta 8080.

---

## 1. Pré-requisitos

- **Docker** e **Docker Compose** (para o PostgreSQL).
- **Node.js 20 ou superior.**
- **pnpm 12.6.0** (o `package.json` fixa essa versão). Se o `pnpm` não estiver no seu PATH, use `corepack enable` ou prefixe os comandos com `npx pnpm@12.6.0`.
- **Python 3.12 ou superior** (o projeto roda em 3.14).
- **Git.**

---

## 2. Subir o projeto do zero

A ordem importa: banco, depois back-end, depois front-end. Use um terminal para cada.

### 2.1 Banco de dados (PostgreSQL)

Na raiz do projeto:

```bash
docker compose up -d db
```

O contêiner se chama `ong_postgres` e usa banco `ongdb`, usuário `postgres`, senha `123`, porta `5432`.

> **Windows:** se você tiver o PostgreSQL instalado como serviço do Windows, ele pode ocupar a porta 5432 e o Django vai dar "autenticação falhou". Pare o serviço (`postgresql-x64-NN`) ou mude a porta do contêiner no `docker-compose.yml` (e o `DB_PORT` do back-end).

### 2.2 Back-end (Django)

```bash
cd apidjango
python -m venv venv
```

Ative o ambiente virtual:

- **Windows (PowerShell):** `venv\Scripts\activate`
- **Windows (Git Bash):** `source venv/Scripts/activate`
- **Linux / macOS:** `source venv/bin/activate`

Instale as dependências (o arquivo de desenvolvimento já inclui as de produção, mais `pytest` e `ruff`):

```bash
pip install -r requirements-dev.txt
```

Configure o ambiente. **O `.env` é opcional em desenvolvimento**: os padrões do `settings.py` já batem com o `docker-compose.yml`. Se quiser personalizar:

```bash
cp .env.example .env
```

Crie as tabelas e a primeira conta:

```bash
python manage.py migrate
python manage.py createsuperuser
```

Inicie o servidor:

```bash
python manage.py runserver 8000
```

Confira:

- http://localhost:8000/admin/ — back-office do Django
- http://localhost:8000/api/docs/ — Swagger da API
- http://localhost:8000/api/v1/ping/ — health check (diz se o banco responde)

### 2.3 Front-end (React + Vite)

```bash
cd frontend
pnpm install
cp .env.example .env.local
```

O `.env.local` precisa ter `VITE_API_URL=http://localhost:8000/api/v1` (já vem preenchido no exemplo). Sem essa variável, o **painel e o login** quebram ao carregar. A landing abre, mas a grade da semana mostra "não foi possível carregar".

```bash
pnpm dev
```

Acesse:

- http://localhost:5173/ — site público
- http://localhost:5173/login.html — login da equipe
- http://localhost:5173/dashboard.html — painel (exige login)

---

## 3. Contas da equipe

**Cada pessoa usa a própria conta.** A auditoria só vale se ninguém compartilhar login: ela registra quem criou, alterou ou excluiu cada coisa.

1. Entre em `/admin/` com o superusuário.
2. Em **Usuários → Adicionar usuário**, crie um usuário por pessoa.
3. Preencha **nome** e **sobrenome** (é o que aparece no canto inferior esquerdo do painel e na auditoria) e marque **Membro da equipe** (`is_staff`). Sem isso a pessoa não acessa o painel.

O cartão do usuário mostra o tipo de conta como "Administrador" para quem tem `is_staff`.

---

## 4. Usando o painel (visão rápida)

| Aba | Para que serve |
|---|---|
| **Presenças** | Chamada por turma e data. Quem não foi marcado fica ausente. "Faltante" = 3 faltas seguidas na mesma turma (justificada não conta). |
| **Alunos** | Cadastro com regras de LGPD: menor de 18 anos só salva com a autorização do responsável; CPF do menor não é guardado. |
| **Turmas** | Uma turma pode acontecer em **um ou mais dias da semana** ("Adicionar dia"). Cada turma pode ou não aparecer na grade do site. |
| **Professores** | CPF aparece mascarado nas listas; completo só na edição. Busca só por nome. |
| **Doações** | Doação de itens (sem dinheiro), com **empréstimos** de itens logo abaixo: depois de 3 meses sem devolução o empréstimo fica "Atrasado". |
| **Grade** | Atividades avulsas (evento ou serviço que não é turma) e a prévia de como a grade está no site. |
| **Auditoria** | Quem criou, alterou ou excluiu cada registro, com filtros por pessoa, ação, tipo e período. |

### Como a grade da semana do site funciona

O site mostra `GET /api/v1/grade/`, que é público e não traz nenhum dado pessoal.

- Só entra **turma marcada como "Mostrar na grade"** (desligado por padrão; turma nova nunca vai para o site sozinha) e **atividade avulsa visível**.
- Turma **inativa** ou já **encerrada** (data de fim no passado) não aparece.
- A situação é calculada: **Agendado** (ainda não começou), **Falta professor** (começou e não tem professor ativo vinculado; o visitante vê "Procuramos professor") e **Ativo**.
- Uma turma em dois dias vira duas linhas na grade.

---

## 5. Comandos do dia a dia

### Testes e qualidade

```bash
# Back-end (dentro de apidjango, com o venv ativo)
python -m pytest
python -m ruff check .

# Front-end (dentro de frontend)
pnpm test        # vitest
pnpm lint        # eslint
npx tsc -b       # checagem de tipos
pnpm build       # tsc + build de produção
```

### Banco de dados

```bash
python manage.py makemigrations
python manage.py migrate
python manage.py makemigrations --check --dry-run   # confirma que não falta migração
```

> **Migração `0011` (turmas em vários dias):** ela copia o dia e o horário que cada turma já tinha para a nova tabela de horários antes de remover os campos antigos, e dá para desfazer (`migrate doacoes 0010`). Se alguma turma antiga tiver horário de fim igual ou anterior ao de início, a migração recusa: corrija o horário dessa turma antes.

### Cliente da API do front (Orval)

Sempre que um serializer ou rota do Django mudar, regenere os tipos e funções do front **com o back-end rodando**:

```bash
cd frontend
pnpm api:generate
```

Isso reescreve `frontend/src/api/generated/`. No Windows o gerador pode deixar vários arquivos "modificados" só por fim de linha (CRLF/LF); o que importa é o diff de verdade (`git diff -w`).

---

## 6. Variáveis de ambiente

### Back-end (`apidjango/.env`, opcional em desenvolvimento)

| Variável | Padrão | Para que serve |
|---|---|---|
| `DB_NAME`, `DB_USER`, `DB_PASSWORD` | `ongdb`, `postgres`, `123` | Banco (alinhado ao `docker-compose.yml`) |
| `DB_HOST`, `DB_PORT` | `localhost`, `5432` | Onde está o banco |
| `DJANGO_SECRET_KEY` | chave de desenvolvimento | **Troque em produção** |
| `DJANGO_DEBUG` | `True` | **Desligue em produção** |
| `DJANGO_ALLOWED_HOSTS` | `localhost,127.0.0.1,[::1]` | Hosts aceitos |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173,...` | Origens do front autorizadas |
| `DJANGO_AUTH_THROTTLE` | `10/minute` | Limite de tentativas de login |
| `DJANGO_PUBLIC_THROTTLE` | `120/minute` | Limite da grade pública |

### Front-end (`frontend/.env.local`)

| Variável | Valor de desenvolvimento |
|---|---|
| `VITE_API_URL` | `http://localhost:8000/api/v1` |
| `VITE_API_SCHEMA_URL` | `http://localhost:8000/api/schema/?format=json` (usada só pelo `api:generate`) |

---

## 7. Estrutura do repositório

```
apidjango/          Back-end Django
  doacoes/          App principal: modelos, API, auditoria, grade, testes
  setup/            Configurações, autenticação JWT, paginação
frontend/           Site e painel (React + Vite)
  src/features/     home (landing), dashboard (painel), auth (login), privacy
  src/api/generated Cliente da API gerado pelo Orval (não edite à mão)
  public/           Imagens e o script dos widgets de acessibilidade
docs/LGPD.md        Dados guardados, finalidade e direitos do titular
refs/               Imagens e referências visuais da ONG
```

Páginas HTML do front: `index.html` (site), `privacidade.html`, `login.html` e `dashboard.html`.

---

## 8. Problemas comuns

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| Django: "autenticação por senha falhou" para `postgres` | O Postgres do Windows está na porta 5432 em vez do Docker | Pare o serviço do Windows ou troque a porta do contêiner |
| Painel ou login em branco, erro `VITE_API_URL não está configurada` | Falta o `frontend/.env.local` | `cp .env.example .env.local` e reinicie o `pnpm dev` |
| `ModuleNotFoundError: auditlog` | Dependência nova não instalada | `pip install -r requirements-dev.txt` |
| Front: `Failed to resolve import "embla-carousel-..."` | Pacotes novos não instalados | `pnpm install` e reinicie o Vite (`pnpm dev --force` limpa o cache) |
| Grade da landing diz "Não foi possível carregar" | Back-end fora do ar ou `VITE_API_URL` errada | Suba o Django na porta 8000 e confira o `.env.local` |
| Turma nova não aparece na grade do site | "Mostrar na grade" vem desligado por padrão | Edite a turma e marque a opção |
| Prévia da aba Grade parece defasada | A API deixa a grade 60 s em cache para a landing | A prévia já ignora o cache; recarregue a página |
| `curl` com `next=/admin/` vira caminho do Windows (Git Bash) | Conversão automática de caminhos | Use `MSYS_NO_PATHCONV=1` antes do comando |
| Mudei o schema da API e o front não achou o campo | Cliente Orval desatualizado | Suba o back-end e rode `pnpm api:generate` |

---

## 9. Antes de publicar (produção)

Ainda **não** está pronto para produção. Itens conhecidos para fechar antes:

- `DJANGO_DEBUG=False` e uma `DJANGO_SECRET_KEY` real, definidos por ambiente (hoje os padrões são de desenvolvimento).
- Servir os arquivos estáticos (WhiteNoise já está nas dependências, falta ligar no `MIDDLEWARE`) e rodar com `gunicorn`.
- Cookie de refresh com `Secure` (já é automático quando `DEBUG=False`) e `CORS_ALLOWED_ORIGINS` com o domínio real.
- Definir o prazo de guarda dos cadastros inativos e do histórico de auditoria, e fechar as pendências do `docs/LGPD.md` (controlador, encarregado, base legal, texto do termo).
- Decidir se o CPF/RG do responsável deve ser criptografado no banco.
- Corrigir os avisos de estilo antigos do `ruff` e fazer o front responsivo (a barra lateral do painel tem largura fixa).

---

## 10. Para saber mais

- `README.md` — visão geral do projeto, programas da ONG e backlog.
- `docs/LGPD.md` — quais dados pessoais o painel guarda e por quê.
- `PLANO_REMODELAGEM.md` — plano e decisões de arquitetura.
- Trello do projeto: https://trello.com/b/CyzIAPWw/projeto-integrador-3s
