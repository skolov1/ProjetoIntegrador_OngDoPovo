# Sistema ONG do Povo

**Projeto Integrador — 3º Semestre**  
**Acompanhamento do Projeto:** [Board no Trello](https://trello.com/b/CyzIAPWw/projeto-integrador-3s)  
**Referência:** ONG do Povo ([@ongdopovo_](https://www.instagram.com/ongdopovo_))

---

## 📌 Sobre o Projeto

O **Sistema ONG do Povo** é uma solução full‑stack desenvolvida no **Projeto Integrador (3º Semestre)** do curso de Desenvolvimento de Software Multiplataforma. Atende a gestão, a divulgação e o engajamento da **ONG do Povo**, de Caieiras (Praia Grande/SP): um **site público** (landing page) e um **painel de administração** para a equipe.

- **Back-end:** Django 5.2 + Django REST Framework (`apidjango/`), PostgreSQL, JWT em cookie httpOnly e contrato OpenAPI (drf‑spectacular).
- **Front-end:** React + Vite + TypeScript (`frontend/`), com o cliente da API gerado pelo Orval a partir do OpenAPI.

> **Guia completo, passo a passo, com problemas comuns:** [`tutorial avançado.md`](tutorial%20avançado.md).

---

## 📋 O que o sistema faz

### Site público

* **Quem somos, Impacto, Programas, Doe, Contato** e **Voluntariado**, com carrossel de fotos.
* **Grade da semana:** turmas marcadas para aparecer, com dia, horário e situação (Ativo, Agendado, "Procuramos professor").
* **Eventos e serviços:** bloco abaixo da grade, para eventos, serviços e campanhas (ex.: atendimento oftalmológico), com botão "Como participar" por WhatsApp. Encerrados e ocultos não aparecem.
* **Pré-inscrição por WhatsApp:** o formulário monta a mensagem e abre o WhatsApp da ONG. Nada é gravado no servidor.
* **Doação:** só de itens (alimentos não perecíveis, cadeira de rodas, muletas, cadeira de banho). O site não recebe dinheiro.
* **Acessibilidade:** VLibras e UserWay.

### Painel de administração (acesso restrito)

* **Presenças:** lista de chamada por turma e data; quem não é marcado fica ausente. Regra de **faltante**: 3 faltas seguidas na mesma turma (falta justificada é ignorada).
* **Alunos:** cadastro por idade (menor tem responsável), turmas, mensalidade (R$ 20 por modalidade) e **só a situação** dos documentos (pendente/entregue) e do exame de aptidão. O sistema **não guarda arquivo nem número de documento**.
* **Turmas e professores:** turmas com um ou mais dias e horários, visibilidade na grade pública e nome público.
* **Doações e empréstimos de itens:** registro do que a ONG recebe e de quem pegou emprestado (prazo de 3 meses, com aviso de atraso).
* **Grade:** eventos, serviços e campanhas (tipo, data ou dia da semana, situação, "Mostrar no site") e prévia do que está no ar.
* **Auditoria:** quem criou, alterou ou excluiu cada registro (dados pessoais são ocultados no log).
* Privacidade e LGPD: página pública `privacidade.html` e [`docs/LGPD.md`](docs/LGPD.md).

---

## 🛠️ Tecnologias

**Back-end:** Django 5.2, DRF, drf‑spectacular, django‑filter, SimpleJWT, django‑cors‑headers, django‑auditlog, WhiteNoise, gunicorn, PostgreSQL 15, pytest + ruff.

**Front-end:** React, TypeScript, Vite, Tailwind CSS, TanStack Query, Orval, React Hook Form, Embla Carousel, lucide-react, vitest, eslint. Gerenciador de pacotes: **pnpm**.

---

## 📁 Estrutura de pastas

```
/
├── apidjango/            # Back-end Django + DRF
│   ├── setup/            # settings, urls
│   └── doacoes/          # app único: turmas, alunos, presenças, doações, grade, auditoria
├── frontend/
│   └── src/
│       ├── features/     # home (landing), dashboard (painel), auth, privacy
│       ├── assets/fotos/ # fotos do site, já otimizadas (WebP)
│       ├── api/generated # cliente da API gerado pelo Orval (não editar à mão)
│       ├── components/   # UI reutilizável
│       └── lib/          # api.ts, regras puras (horarios, grade, whatsapp...)
├── docs/                 # LGPD
├── refs/                 # referências visuais e anotações de reunião
└── docker-compose.yml    # PostgreSQL
```

---

## 🚀 Como rodar em desenvolvimento

Pré-requisitos: **Docker**, **Node 20+**, **pnpm 12.6.0** (ou `npx pnpm@12.6.0`) e **Python 3.12+**.

```bash
# 1. Banco (PostgreSQL no Docker, porta 5432)
docker compose up -d db

# 2. Back-end (http://localhost:8000)
cd apidjango
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements-dev.txt
cp .env.example .env              # obrigatório em dev: liga o DJANGO_DEBUG (sem ele o Django roda como produção)
python manage.py migrate
python manage.py seed_demo --com-admin   # dados de exemplo + usuário admin/admin (só dev)
python manage.py runserver 8000

# 3. Front-end (http://localhost:5173), em outro terminal
cd frontend
cp .env.example .env.local        # define VITE_API_URL (obrigatório)
pnpm install
pnpm dev
```

* **Site:** <http://localhost:5173>
* **Painel:** <http://localhost:5173/login.html> (com o seed: `admin` / `admin`, **só no seu computador**)
* **Swagger da API:** <http://localhost:8000/api/docs/>

### Dados de exemplo (`seed_demo`)

`python manage.py seed_demo` cria turmas, alunos, professores, doações, empréstimos e eventos **fictícios**, todos com o prefixo `[Demo]`. Rodar de novo não duplica; `--limpar` apaga só o que o seed criou, sem tocar em dado real. `--com-admin` cria `admin`/`admin` e só funciona com `DJANGO_DEBUG` ligado.

### Testes e qualidade

| Onde | Comando |
|---|---|
| Back-end (testes) | `cd apidjango && python -m pytest` |
| Back-end (estilo) | `cd apidjango && ruff check .` |
| Front-end (testes) | `cd frontend && pnpm test` |
| Front-end (lint e tipos) | `pnpm lint` e `pnpm build` |
| Regenerar o cliente da API | `pnpm api:generate` (com o back-end no ar) |

---

## ☁️ Deploy gratuito

O repositório está pronto para **Vercel (site) + Render (API) + banco gratuito**: `render.yaml` e `frontend/vercel.json` já vêm configurados. Passo a passo, variáveis e checklist em [`docs/DEPLOY.md`](docs/DEPLOY.md).

---

## 📜 Decisões técnicas importantes

1. **Autenticação:** JWT. O *access token* fica só em memória no navegador (header `Authorization`); o *refresh token* vai em cookie httpOnly (`/api/v1/auth/token/`, `.../refresh/`, `.../logout/`). Cada pessoa da equipe deve ter a **própria conta** (criada em `/admin/`), para a auditoria identificar o autor.
2. **Contrato da API:** o schema OpenAPI em `/api/schema/` é a fonte da verdade. Mudou um serializer? Rode `pnpm api:generate` no front.
3. **Sem upload de documentos (LGPD):** só a situação dos documentos é guardada, nunca o arquivo nem o número.
4. **Rotas públicas** (`/api/v1/grade/` e `/api/v1/eventos-servicos/`) não expõem dado pessoal nem id interno e podem ficar 60 s em cache.
5. **Fotos:** ficam em `frontend/src/assets/fotos/` em WebP (máx. 1920 px). Os originais pesados não vão para o Git.

---

## 👥 Equipe e stakeholders

* **Equipe do Projeto:** Ryan de Andrade, Gabriel Rodrigues, Isabella Aparecida, Matheus Gonzaga, Pedro Brinkmann
* **ONG beneficiária:** ONG do Povo (responsáveis e coordenadores)
* **Usuários finais:** professores, voluntários, alunos/atletas e comunidade atendida

---

## 🗺️ Próximos passos

* [ ] Dados reais da ONG (modalidades, instrutores, alunos, doações) e indicadores de Impacto reais.
* [ ] Painel responsivo e estatísticas públicas (presenças, alunos, modalidades).
* [x] Endurecimento para produção (`DEBUG`/`SECRET_KEY`, HTTPS, WhiteNoise, ruff) e arquivos de deploy.
* [ ] Decisão sobre o MongoDB (prova de conceito já feita).
* [ ] Cadastro de patrocinadores e painel de evolução do aluno (sugestões).

---

## 📸 Referências

* Decisões de arquitetura: `ALTERACOES_FASE0_E_LANDING.md` e `PLANO_REMODELAGEM.md`.
* Anotações de reunião: `refs/AnotacoesFormatadas08-10.md`.
* Landing page (print): [confira aqui](https://github.com/skolov1/ProjetoIntegrador_OngDoPovo/blob/voloki/refs/site_ongdopovo_print.png).
