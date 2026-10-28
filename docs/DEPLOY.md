# Deploy gratuito — Vercel (site) + Render (API) + banco

Como colocar o **Sistema ONG do Povo** no ar sem pagar. O repositório já vem preparado: `render.yaml` (API) e `frontend/vercel.json` (site).

```
Navegador ──► Vercel (site React)
                 │  /api/*  (rewrite: o navegador continua falando só com a Vercel)
                 ▼
              Render (API Django) ──► Banco (PostgreSQL hoje; MongoDB Atlas depois da migração)
```

**Por que o `/api/*` passa pela Vercel:** o login guarda o *refresh token* em cookie httpOnly. Se o site e a API ficassem em endereços diferentes, o cookie viraria "de terceiros" e Safari/Chrome podem bloquear. Com o *rewrite*, o navegador só enxerga o endereço da Vercel e o cookie funciona normalmente.

> Os planos gratuitos mudam. Confira os limites atuais de cada serviço antes de começar.

---

## 0. Antes de começar

- Repositório no GitHub (os três serviços leem de lá).
- Contas gratuitas em **Render**, **Vercel** e no provedor do banco.
- Tenha em mãos: nada de senha no Git. Tudo que é segredo vai em variáveis de ambiente nos painéis.

## 1. Banco de dados

O código **ainda usa PostgreSQL** (a migração para MongoDB Atlas é o Bloco 3, depende da decisão do time). Enquanto isso, use um PostgreSQL gratuito na nuvem (por exemplo Neon ou Supabase) e copie a **string de conexão**:

```
postgres://usuario:senha@host:5432/banco?sslmode=require
```

> O Postgres gratuito do próprio Render expira depois de um tempo; prefira outro provedor.

**Quando migrar para o Atlas:** o bloco `DATABASES` de `apidjango/setup/settings.py` e a variável `DATABASE_URL` mudam para `MONGO_URI`. Libere no Atlas o acesso de rede `0.0.0.0/0` (o Render gratuito não tem IP fixo) e use senha forte. Ver a prova de conceito nas anotações do projeto.

## 2. API no Render

1. No Render: **New ▸ Blueprint** e escolha o repositório (ele lê o `render.yaml` da raiz).
2. Preencha as variáveis que o Render perguntar:

| Variável | Valor |
|---|---|
| `DATABASE_URL` | a string de conexão do passo 1 |
| `DJANGO_CSRF_TRUSTED_ORIGINS` | endereço do site na Vercel, com `https://` e sem barra no fim (preencha depois do passo 3) |
| `CORS_ALLOWED_ORIGINS` | o mesmo endereço |
| `DJANGO_SUPERUSER_USERNAME` / `_EMAIL` / `_PASSWORD` | a primeira conta de administrador (o plano gratuito não tem terminal) |

   `DJANGO_SECRET_KEY` o Render gera sozinho, e `DJANGO_DEBUG` já vai como `False`.
3. Aguarde o deploy. A cada subida o Render roda `migrate`, e o *health check* é `/api/v1/ping/`.
4. Teste: `https://ong-do-povo-api.onrender.com/api/v1/ping/` deve responder `{"servico":"django","status":"ok","banco":"ok"}`.

> Se o nome `ong-do-povo-api` já estiver ocupado, o Render dá outro endereço. Nesse caso, ajuste o `destination` em `frontend/vercel.json` (passo 3).

**Plano gratuito dorme:** depois de uns 15 minutos sem acesso, o primeiro pedido demora de 30 a 60 segundos. Para a apresentação, use um monitor gratuito (UptimeRobot) chamando `/api/v1/ping/` a cada 10 minutos.

## 3. Site na Vercel

1. Na Vercel: **Add New ▸ Project**, escolha o repositório e defina **Root Directory = `frontend`**. O restante (Vite, `pnpm build`, pasta `dist`) já vem do `vercel.json`.
2. Confira em `frontend/vercel.json` se o `destination` do *rewrite* é o endereço real da sua API no Render.
3. A variável `VITE_API_URL=/api/v1` já está em `frontend/.env.production`; não precisa configurar nada na Vercel.
4. Faça o deploy, volte ao Render e preencha `DJANGO_CSRF_TRUSTED_ORIGINS` e `CORS_ALLOWED_ORIGINS` com o endereço da Vercel (o Render reinicia sozinho).

## 4. Depois de publicar (checklist)

- [ ] O site abre e a **grade da semana** carrega (se demorar, a API está acordando).
- [ ] `/login.html` ▸ entrar com a conta criada pelo `DJANGO_SUPERUSER_*` ▸ o painel abre.
- [ ] Recarregar o painel **não** pede login de novo (cookie de refresh funcionando).
- [ ] No endereço da API, `/admin/` abre com o visual do Django (arquivos estáticos ok).
- [ ] Criar **uma conta por pessoa** da equipe em `/admin/` (com nome e sobrenome), para a auditoria.
- [ ] Trocar a senha da conta criada no deploy e **apagar** as variáveis `DJANGO_SUPERUSER_*` do Render.
- [ ] Os dados reais substituem os de teste. **Não rode** `seed_demo` em produção: ele cria `admin`/`admin` só com `DEBUG` ligado e dados fictícios.

## 5. O que o servidor faz por padrão (produção)

- `DJANGO_DEBUG` desligado por padrão; sem `DJANGO_SECRET_KEY` de verdade o Django **recusa subir**.
- HTTPS obrigatório (redireciona HTTP), cookies `Secure`, arquivos estáticos via WhiteNoise.
- HSTS desligado até haver domínio definitivo: depois, defina `DJANGO_HSTS_SECONDS=31536000`.
- Para desenvolver, copie `apidjango/.env.example` para `apidjango/.env` (ele liga o `DJANGO_DEBUG`).

## 6. Domínio próprio (opcional)

Na Vercel, **Settings ▸ Domains** liga o domínio ao site. Depois, atualize `DJANGO_CSRF_TRUSTED_ORIGINS` e `CORS_ALLOWED_ORIGINS` no Render e, então, o HSTS.

## 7. Problemas comuns

| Sintoma | Causa provável |
|---|---|
| Site abre, grade vazia ou "indisponível" | API dormindo (aguarde) ou `destination` do *rewrite* errado |
| Login funciona e some ao recarregar | o site está chamando a API direto, sem passar pelo `/api` da Vercel |
| Render não sobe: `Defina DJANGO_SECRET_KEY` | `DJANGO_DEBUG` não é `False`, ou a chave sumiu das variáveis |
| `/admin/` sem visual | `collectstatic` não rodou: veja o *build command* no Render |
| `ping` responde `"banco":"erro"` | `DATABASE_URL` errada, ou o banco bloqueia o IP do Render |
