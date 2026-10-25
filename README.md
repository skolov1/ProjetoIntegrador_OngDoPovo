# Sistema ONG do Povo

**Projeto Integrador — 3º Semestre**  
**Acompanhamento do Projeto:** [Board no Trello](https://trello.com/b/CyzIAPWw/projeto-integrador-3s)  
**Referência:** ONG do Povo ([@ongdopovo_](https://www.instagram.com/ongdopovo_))

---

## 📌 Sobre o Projeto

O **Sistema ONG do Povo** é uma solução full‑stack desenvolvida no âmbito do **Projeto Integrador (3º Semestre)** do curso de Desenvolvimento de Software Multiplataforma. O projeto visa atender às necessidades de gestão, divulgação e engajamento da **ONG do Povo**, promovendo o acesso da comunidade aos programas esportivos, de saúde, educacionais e eventos oferecidos pela organização.

A arquitetura adotada é **Django + Django REST Framework** no backend (pasta `apidjango`) e **React + Vite + TypeScript** no frontend (pasta `frontend`). O gerenciador de pacotes é **pnpm**. A autenticação utiliza **JWT em cookies httpOnly** e o contrato da API é definido em **OpenAPI (drf‑spectacular)**, consumido pelo cliente Orval no frontend.

---

## 🏅 Programas e Projetos da ONG

A ONG do Povo oferece atividades e programas divididos nas seguintes áreas:

* **Esportes:** Ballet, Basquete, Futsal, Muay Thai, Karatê, Capoeira, Kung Fu, Futebol de Campo, Funcional, Jazz
* **Saúde:** Exames de vista e distribuição de óculos
* **Capacitação:** Cursos professionalizantes (Barbearia, Tranças, Manicure, Sobrancelhas)
* **Comunidade:** Eventos comunitários e festivais

---

## 📋 Funcionalidades do Sistema

### 🗺️ Requisitos do Backlog Principal

* **Apresentação da ONG:** Informações sobre a história, missão e atuação da ONG (seção "Quem Somos" na landing page).
* **Catálogo de Programas / Modalidades:** Exibição das modalidades esportivas, cursos e ações de saúde. Possui duas abas: **"Modalidades"** (esportes, sem vagas) e **"Outros"** (exames de vista, cursos e capacitações, eventos).
* **Cadastro de Alunos/Atletas:** Registro de alunos com campos diferenciados por idade (maior/de menor). Campos obrigatórios: RG, CPF, comprovante de residência; para maiores: título de eleitor; para menores: RG do responsável, certidão de nascimento, atestado médico. Cada aluno pode estar vinculado a uma Turma.
* **Cadastro de Professores e Voluntários:** Registro da equipe de apoio e instrutores (nome, CPF, e-mail, telefone, turmas ministradas).
* **Agenda de Aulas e Eventos:** Calendário de atividades e horários das aulas por turma.
* **Fale Conosco / Contato:** Canal direto para dúvidas e atendimento (WhatsApp: (13) 98806-6437).
* **Página de Doações:** Canal de apoio financeiro e arrecadação. Aceita pagamentos via PIX, dinheiro, cartão ou transferência. Também aceita doações de **alimentos não perecíveis, cadeiras de rodas, muletas e cadeiras de banho**. Possui QR Code para pagamento via PIX.
* **Área de Impacto:** Exibição de resultados e métricas de alcance social da ONG (total de alunos, presenças, doações confirmadas).
* **Login Administrativo:** Painel restrito para gestão de dados e conteúdos do sistema. Acesso apenas para o coordenador/administrador do sistema (autenticação via JWT em cookie httpOnly). O restante do contato com a ONG é via WhatsApp.

### 🌟 Sugestões & Futuras Implementações

* [x] Sistema de gestão de presença nas aulas.
* [x] Painel de administração com dashboard React (sidebar + telas de presença, alunos, doações, formulários).
* [ ] Cadastro de patrocinadores e parceiros.
* [ ] Seção/Página para agendamento e divulgação de mutirões de saúde (exames de vista).
* [ ] Página detalhada para cursos professionalizantes.
* [ ] Sistema de agendamento/inscrição para eventos.
* [ ] Integração com WhatsAPI para envio de mensagens automáticas.
* [ ] Aplicativo móvel para registro de presença pelo celular da recepção.

---

## 👥 Stakeholders & Equipe de Desenvolvimento

* **Equipe do Projeto:** Ryan de Andrade, Gabriel Rodrigues, Isabella Aparecida, Matheus Gonzaga, Pedro Brinkmann
* **ONG Beneficiária:** ONG do Povo (Responsáveis e Coordenadores)
* **Usuários Finais:** Professores, voluntários, alunos/atletas e comunidade atendida.

---

## 🛠️ Tecnologias Utilizadas

### Backend (Django)

* **Django 5.x** — framework Python
* **DRF (Django REST Framework)** — API
* **drf‑spectacular** — geração do schema OpenAPI
* **djang‑filters** — filtros e busca na API
* **SimpleJWT** — autenticação JWT em cookies httpOnly
* **CORS headers** — compartilhamento entre frontend e backend
* **PostgreSQL** — banco de dados
* **Pillow** — processamento de imagens (comprovantes, certidões)

### Frontend (React)

* **React 18** + **TypeScript**
* **Vite** — build tool e dev server
* **pnpm** — gerenciador de pacotes
* **TanStack Query** — busca, cache e gerenciamento de estado remoto
* **Orval** — geração automática de cliente TypeScript a partir do OpenAPI
* **Tailwind CSS** — estilização (design system da landing page)
* **lucide-react** — ícones
* **React Router DOM** — navegação entre páginas

---

## 📁 Estrutura de Pastas

```
/
├── apidjango/          # Backend Django + DRF
│   └── doacoes/        # App que agora também contém: Aluno, Turma, Presenca, Professor
├── frontend/           # Frontend React + Vite
│   └── src/
│       ├── features/home/    # Componentes da landing page
│       ├── features/dashboard/ # Dashboard de administração
│       ├── api/            # Clients Orval gerados
│       ├── components/     # Componentes UI reutilizáveis
│       └── lib/            # utilitários (useReveal, useAuth, api.ts)
├── refs/               # Referências visuais e documentos de decisão
└── docker-compose.yml  # Containers Django + PostgreSQL
```

---

## 🚀 Como Rodar em Desenvolvimento

1. **Backend**

```bash
cd apidjango
python -m venv .venv        # ou usar o venv já existente
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # preencher as variáveis de ambiente (DB, SECRET_KEY, etc.)
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

2. **Frontend**

```bash
cd frontend
pnpm install
cp .env.example .env      # VITE_API_SCHEMA_URL=http://127.0.0.1:8000/api/schema/?format=json
pnpm dev                  # roda em http://localhost:5173
```

3. **Acessos**

* Landing page: <http://localhost:5173>
* API schema: <http://localhost:8000/api/schema/>
* Swagger UI: <http://localhost:8000/api/docs/>
* Dashboard admin: <http://localhost:5173/dashboard> (login com JWT cookie)

---

## 📦 Scripts Disponíveis (Frontend)

| Comando | Descrição |
|---------|-----------|
| `pnpm dev` | Inicia o servidor de desenvolvimento Vite (port 5173) |
| `pnpm build` | Gera build de produção |
| `pnpm api:generate` | Atualiza os clients TypeScript a partir do schema OpenAPI |
| `pnpm lint` | Executa ESLint |
| `pnpm typecheck` | Verifica tipos TypeScript |

---

## 📜 Decisões Técnicas Importantes

1. **Autenticação:** Acesso ao dashboard admin é feito via JWT em cookie httpOnly (`ong_refresh_token`). O access token viaja no header `Authorization: Bearer`. O refresh token é renovado automaticamente ao expirar (7 dias). O login, refresh e logout são fornecidos pelos endpoints `/api/v1/auth/token/`, `/api/v1/auth/token/refresh/` e `/api/v1/auth/logout/`.

2. **CORS:** O frontend em `localhost:5173` está liberado em `CORS_ALLOWED_ORIGINS`. Requisições com credenciais (cookie) são feitas com `withCredentials: true` no axios do `src/lib/api.ts`.

3. **API versãoada:** O prefixo `/api/v1/` está definido em `SCHEMA_PATH_PREFIX` e `SERVERS` do drf‑spectacular. O Orval gera clients com esse prefixo consistente.

4. **Modelagem:** Os novos modelos (`Aluno`, `Turma`, `Presenca`, `Professor`) foram integrados ao app `doacoes` para manter tudo em um único app Django, simplificando migrações e instalação.

5. **Documentação:** O schema OpenAPI em `/api/schema/` é a "fonte da verdade" que alimenta o cliente Orval no frontend. Qualquer mudança no backend (novos campos, serializers, endpoints) deve ser seguida de `pnpm api:generate` no frontend.

---

## 📸 Prints e Referências

* Landing page redesign: confira `refs/site-ong-do-povo (1).png`.
* Decisões de arquitetura: `ALTERACOES_FASE0_E_LANDING.md` e `PLANO_REMODELAGEM.md`.
* Documentação detalhada de anotações: `refs/AnotacoesFormatadas08-10.md`.
