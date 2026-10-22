# Registro de Alterações — Fase 0 e Reformulação da Landing Page

> **Escopo deste documento:** duas ações executadas em sequência.
> 1. **Fase 0** — correção da configuração quebrada do Django
> 2. **Reformulação da Landing Page** — reconstrução visual a partir do manual de marca
>
> **Datas:** 04/10/2026 (Fase 0) · 04/10/2026 (Landing)
> **Estado:** ambas concluídas e validadas. Nada pendente bloqueando a Fase 2.

---

## Índice

- [Parte 1 — Fase 0: correção do Django](#parte-1)
- [Parte 2 — Reformulação da Landing Page](#parte-2)
- [Validação](#validação)
- [Decisões que valem registro](#decisões)
- [Pendências conhecidas](#pendências)

---
---

# Parte 1 — Fase 0: correção do Django {#parte-1}

## Contexto

O projeto tinha a arquitetura certa (Django + React/Vite) mas a configuração do
back-end nunca tinha sido ajustada. A análise encontrou **4 bugs que só apareceriam
quando existisse a primeira chamada real de API** — ou seja, todos estavam um
passo à frente do trabalho.

## Bugs corrigidos

| # | Arquivo | Problema | Correção |
|---|---|---|---|
| 1 | `setup/settings.py:56` | `CorsMiddleware` era a **última** entrada do `MIDDLEWARE`, depois de `CommonMiddleware`. O preflight `OPTIONS` saía sem headers de CORS | Movido para a 2ª posição, logo após `SecurityMiddleware` |
| 2 | `setup/settings.py:134` | `MAILERS` — setting do Django 1.8, removido há anos. O Django ignorava e usava SMTP real | Trocado por `EMAIL_BACKEND` |
| 3 | `setup/settings.py` | `DEFAULT_AUTO_FIELD` ausente → aviso `models.W042` e chaves de 32 bits | `BigAutoField` definido |
| 4 | `setup/settings.py:4` | Docstring dizia "Django 6.1.1" com o projeto em 5.2 | Corrigido |

### Por que o bug 1 era o mais perigoso

Nada parecia errado. Não havia nenhuma chamada de API, então o CORS nunca era
exercitado. O primeiro `fetch` do React teria falhado com um erro de CORS que
apontaria para o frontend — quando a causa estava no `settings.py`. É o tipo de
erro que consome meio dia de depuração.

## Configuração corrigida

**Variáveis de ambiente** (antes fixas no código)

```python
# ANTES
SECRET_KEY = 'django-insecure-ael%a@p5ux&69fmt&5asz%=7n=8)x9)1bgtv9e^=(e^d-8%8uy'
DEBUG = True
ALLOWED_HOSTS = []
load_dotenv()                      # sem caminho: depende do diretório atual

# DEPOIS
load_dotenv(BASE_DIR / ".env")     # path explícito
SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "dev-only-...")
DEBUG = env_bool("DJANGO_DEBUG", True)
ALLOWED_HOSTS = os.getenv("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1,[::1]").split(",")
```

Adicionado o helper `env_bool()`, que aceita `true`/`1`/`yes` em qualquer caixa.

**Localidade** — a ONG é brasileira; `en-us` e `UTC` fariam datas de aulas e
relatórios de doação saírem erradas.

```python
LANGUAGE_CODE = 'pt-br'            # era 'en-us'
TIME_ZONE     = 'America/Sao_Paulo' # era 'UTC'
```

**Estáticos e uploads** — `STATIC_ROOT`, `MEDIA_URL` e `MEDIA_ROOT`. O histórico
do git já mostrava upload de logo; as fotos de programas vêm na Fase 3.

**CORS por env** — e `127.0.0.1:5173` foi adicionado ao lado de `localhost:5173`,
porque o navegador trata os dois como origens diferentes e o Vite pode abrir em
qualquer um dos dois dependendo do sistema.

## Arquivos criados

| Arquivo | Propósito |
|---|---|
| `apidjango/.env.example` | Template das variáveis de ambiente. O `.env` real está gitignored |
| `frontend/.env.example` | Idem para o Vite |

Sem isso, nenhum dos 5 membros do time sabia o que colocar no `.env` ao clonar o repo.

## Arquivos alterados

- `apidjango/setup/settings.py` — +66 / −30 linhas
- `frontend/index.html` — `lang="en"` → `pt-BR`, título, meta description
- `frontend/src/components/HeroSection.tsx` — import do header corrigido
- `.gitignore` — pasta `refs/` adicionada (7,5 MB de PNG de origem)

## Mudanças fora do plano original

Três itens que fiz e não estavam na lista — **revisar se não quiser**:

1. **`index.html`**: estava com `lang="en"` e `<title>frontend</title>`. Num site
   público de ONG isso aparece na aba do navegador e no leitor de tela.
2. **`DEFAULT_FROM_EMAIL`**: veio junto com a correção do `EMAIL_BACKEND`, senão o
   email ficaria sem remetente.
3. **`CORS_ALLOW_CREDENTIALS = True`**: antecipado para a decisão do token httpOnly.

## Higiene do frontend (Fase 0)

- `header.tsx` → `Header.tsx` via `git mv` (único arquivo em minúscula entre
  `PascalCase`; quebrava import entre Windows e Linux). Import atualizado em
  `HeroSection.tsx`.
- `assets/react.svg` e `assets/vite.svg` removidos — boilerplate do `npm create vite`, não usados.
- `package-lock.json` removido, **pnpm 12.6.0 definido como padrão** com
  `"packageManager"` pinado e `pnpm-workspace.yaml` com `allowBuilds` para o esbuild.
  Instalação limpa foi testada: o binário nativo do esbuild instala corretamente.

---
---

# Parte 2 — Reformulação da Landing Page {#parte-2}

## Contexto

A landing page existente era uma página única e estática. Duas questões:

1. **A identidade visual estava errada.** A paleta em código (`#0F523A`, `#F59E0B`,
   `#EBF5ED`) não bate com o manual de marca. As cores laranja, vermelho, roxo e
   azul da marca não existiam no projeto.
2. **O layout não segui a referência.** Faltavam a faixa de pré-cadastro, a seção
   de voluntariado e o seletor de valores de doação.

## Referências usadas

Analisadas as 5 imagens de `refs/`:

| Arquivo | Conteúdo |
|---|---|
| `imagem.png` | **Manual de marca** — paleta com hex exatos, tipografia, padrão gráfico, aplicações |
| `site-ong-do-povo (1).png` | **Mockup da landing** — seções, textos, hierarquia, ordem |
| `ChatGPT ... 15_39_14.png` | Logo isolada limpa |
| `ChatGPT ... 15_47_45 1.png` | Logo recortada — **era a que estava em `public/`** |
| `ChatGPT ... 15_05_17.png` | Composto da identidade (aplicações em NÃO e materiais) |

## Identidade visual extraída

**Paleta** — hex exatos do manual, agora em `frontend/src/index.css` como tokens:

```css
@theme {
  --color-verde:       #00a651;  /* Verde Principal */
  --color-verde-escuro:#083d2e;  /* Verde Escuro    */
  --color-grafite:     #1f2937;
  --color-amarelo:     #ffc107;
  --color-laranja:     #ff6b00;  /* não existia no projeto */
  --color-vermelho:    #e53935;  /* não existia no projeto */
  --color-roxo:        #6a3ec8;  /* não existia no projeto */
  --color-azul:        #2563eb;  /* não existia no projeto */

  /* Derivados — o manual não define os tons de fundo */
  --color-mist-50/100/200/300
  --color-verde-900
}
```

**Tipografia:** Montserrat (o manual especifica). Carregada via Google Fonts com
`preconnect`. Antes o projeto não declarava fonte nenhuma e caía no default do sistema.

**Padrão gráfico:** "raios de movimento, energia e união" — o mesmo padrão de raios
radiais atrás do mascote na logo. Reproduzido como `<Sunburst />` em SVG
(24–32 raios, disco central, rotação lenta de 60s), não recortado da logo.

**Asset da logo:** a versão em `public/` era a recortada (1254 px, 1.085 KB). Substituída
pela versão limpa de `refs/`, redimensionada e convertida:

| Arquivo | Antes | Depois |
|---|---|---|
| `logo-ong-do-povo.webp` | — | 63 KB (512 px) |
| `logo-ong-do-povo.png` (fallback) | 1.085 KB | 34 KB (512 px, 128 cores) |
| `logo-icone.webp` / `.png` | — | 10 KB / 5,9 KB (128 px) |
| `favicon-ong.webp` / `.png` | — | 4,2 KB / 2,6 KB (64 px) |

**Redução: 1.085 KB → 63 KB no WebP (17× menor)**, com fallback PNG para navegadores antigos.

## Estrutura: antes e depois

**Antes:** 8 componentes em `src/components/`, todos hardcoded no `App.tsx`, sem separação entre conteúdo e apresentação.

**Depois:**

```
src/
├── index.css                      # tokens de marca, animações, prefers-reduced-motion
├── lib/
│   ├── api.ts                     # (Fase 1) axios + interceptor de refresh
│   ├── queryClient.ts             # (Fase 1)
│   └── useReveal.ts               # 🆕 primitivas de animação
├── components/
│   ├── ui/                        # 🆕 primitivas reutilizáveis
│   │   ├── Button.tsx             #   CTA verde / amarelo / contorno
│   │   ├── Section.tsx            #   Section, Eyebrow, SectionTitle, SectionLead
│   │   ├── Reveal.tsx             #   wrapper de animação
│   │   ├── Sunburst.tsx           #   padrão gráfico da marca
│   │   └── BrandIcons.tsx         #   Instagram e Facebook em SVG
│   └── layout/
│       ├── Header.tsx             #   menu mobile + scroll-spy
│       └── Footer.tsx
└── features/
    ├── home/
    │   ├── data.ts                # 🆕 TODO o conteúdo da página
    │   ├── icons.ts               #   nome-do-ícone → componente
    │   ├── HeroSection.tsx
    │   ├── AboutSection.tsx
    │   ├── ImpactSection.tsx
    │   ├── ProgramsSection.tsx
    │   ├── SpaceSection.tsx       # 🆕 agenda da sede
    │   ├── PreRegisterSection.tsx # 🆕 pré-cadastro
    │   ├── ValuesStrip.tsx        # 🆕 marquee dos 5 valores
    │   ├── VolunteerSection.tsx   # 🆕 voluntariado
    │   ├── DonationSection.tsx    # 🆕 seletor de valor + PIX/cartão
    │   └── ContactSection.tsx
    └── api-test/
        └── ApiTestPanel.tsx       # Sprint 0 (movido)
```

### Seções novas (não existiam antes)

| Seção | Origem na referência |
|---|---|
| **Nosso Espaço** — endereço + grade da semana | Bloco "Nosso Espaço" do mockup |
| **Faça Parte** — pré-cadastro de aluno | Bloco "Faça parte" do mockup |
| **Nós Ajudamos** — voluntariado | Bloco "Nós ajudamos com você" |
| **Valores** — marquee contínuo | Bloco "Nossa essência" (5 valores do manual) |
| **Doação com seletor** — R$ 50/100/150 + PIX/cartão | Bloco "Onde nossa missão toca" |

### Conteúdo separado da apresentação

**A decisão mais importante desta refatoração.** Todo o texto, programas, agenda e
valores de doação estão em `features/home/data.ts` como dados puros.

Na Fase 3 esses mesmos arrays viram `useQuery` sobre `GET /api/v1/programas/`,
`/api/v1/agenda/` etc. **A troca é substituir o array por uma query — o JSX não muda.**
Se o conteúdo estivesse dentro dos componentes (como estava antes), essa migração
seria uma reescrita de 9 arquivos.

## Animações

**Decisão: sem framer-motion.** Tudo em `src/lib/useReveal.ts`, ~120 linhas:

| Primitiva | O que faz |
|---|---|
| `useReveal` | Dispara uma vez quando o elemento entra na viewport (IntersectionObserver) |
| `useCountUp` | Conta de 0 até o valor com easing exponencial (`easeOutExpo`) |
| `usePrefersReducedMotion` | Lê a preferência de movimento do sistema |
| `useScrollY` | Distância do topo, com `requestAnimationFrame` |

**Por que não usar uma lib:** a alternativa custaria ~50 KB de bundle para
mantiver reveal, stagger e contagem — que é tudo que esta página precisa. Se um
dia o escopo pedir drag, gestos ou layout animation, aí compensa.

**Efeitos:**
- Reveal em cascata (`transitionDelay`) nos grids — os cards entram um atrás do outro
- Contagem animada nos números de impacto (450+, 1.200+, 15+, 150+)
- Padrão de raios girando lentamente a 60s
- Marquee contínuo na faixa de valores (pausa no hover)
- Flutuação suave na foto principal do hero
- Header que encolhe e ganha blur ao rolar, com scroll-spy marcando a seção atual
- Menu mobile com entrada escalonada dos links

### Acessibilidade

**`prefers-reduced-motion` é respeitado.** Com a preferência ligada no sistema:
a transição de entrada, o marquee, a flutuação e o scroll suave são desligados, e
`.reveal` volta a `opacity: 1` — **o conteúdo fica 100% visível**, não some.

Também implementado: link "pular para o conteúdo", `aria-live` no painel de teste,
`aria-label` em todos os controles de ícone, `focus-visible` com contorno de 3px,
navegação por teclado nos menus, e `aria-hidden` na cópia duplicada do marquee
(leitor de tela anuncia os 5 valores uma vez só).

## Bugs encontrados durante a implementação

Documentados porque são armadilhas que qualquer um do time pode repetir:

| # | Problema | Causa | Correção |
|---|---|---|---|
| 1 | **Fotos do hero e do "Quem somos" invisíveis** | `h-full` dentro de linha de grid com altura automática colapsa para 0 | Altura explícita no container do grid |
| 2 | **Grade do "Quem somos" desalinhada** | Auto-placement do CSS Grid: um item 1×1 ocupava a célula (1,1) antes do item 2×2, que era empurrado para fora | Item `col-span-2 row-span-2` passa a vir primeiro no array |
| 3 | **Painel de teste mostrava "requisição em andamento"** sem ninguém ter clicado | No React Query v5, `isPending` é `true` também para query **desabilitada** | Usar `fetchStatus === 'fetching'` para carregamento e `data !== undefined` para sucesso |
| 4 | **Ícones do Instagram e Facebook não compilavam** | O lucide-react **removeu os ícones de marca** na v1 | `BrandIcons.tsx` com os glifos oficiais em SVG inline |
| 5 | **3 erros de lint** (`react-hooks/set-state-in-effect`) | Regra nova do React 19; `setState` dentro de `useEffect` | `useSyncExternalStore` para a media query + derivação durante o render na contagem |
| 6 | **Padrão de raios atrás do texto no mobile** | O raio decorativo ficava sobre o parágrafo, reduzindo a legibilidade | Decorações `hidden` abaixo de `sm`/`lg` |
| 7 | **`baseUrl` depreciado** | TypeScript 6 depreciou a opção | `paths` sem `baseUrl` (resolve relativo ao tsconfig) |

Os bugs 1, 2 e 6 só apareceram na **verificação visual com screenshot**. TypeScript,
ESLint e o build passavam em todos os casos.

## Verificação visual

Renderizado com Firefox headless em três larguras (1440 px, 390 px e viewport alto)
e inspecionado por imagem. Achou os bugs 1, 2, 3 e 6.

> **Ressalva honesta:** não há como testar interação real (scroll, hover, menu
> mobile) por screenshot estático. O clique no botão "Testar API" e a abertura do
> menu mobile **ainda não foram validados num browser real**.

## Formulários

Os formulários de pré-cadastro e contato **mostram confirmação local, não enviam
para a API**. Ligá-los ao Django (`POST /api/v1/alunos/` e `/api/v1/contato/`)
depende dos apps de domínio, que são Fase 3.

O botão de doação abre o WhatsApp com a mensagem montada. Gateway de pagamento real
(Mercado Pago, Pix estático) também é Fase 3.

---
---

# Correção posterior — 404 na comunicação com a API {#correcao-404}

## O sintoma

Ao clicar em "Testar API", o painel mostrava:

```
falhou: Request failed with status code 404
```

## A causa

**Prefixo de versão duplicado.** O Django expõe a API em `/api/v1/...` e o axios
tinha `baseURL = http://127.0.0.1:8000/api/v1`. Mas o Orval gerava o client com o
path **completo**, vindo do schema:

```ts
// src/api/generated/sistema/sistema.ts (errado)
{ url: '/api/v1/ping/', method: 'GET' }

// composição final
http://127.0.0.1:8000/api/v1  +  /api/v1/ping/
→ http://127.0.0.1:8000/api/v1/api/v1/ping/   → 404
```

Confirmado com `curl`: a URL duplicada dá 404, a correta dá 200.

## Por que ninguém pegou antes

A Fase 1 validou o encanamento com `curl` (que acerta a URL na mão) e conferiu que
o client gerado importava a instância certa do axios. Mas **nunca testou a
composição das duas Together**. O `tsc` passava — a string existe, só estava errada.
Só apareceu quando alguém clicou de verdade.

## A correção

O prefixo passa a ser declarado em **um lugar só**, no `settings.py`:

```python
SPECTACULAR_SETTINGS = {
    # Remove /api/v1 dos paths do schema. Sem TRIM, o schema emite os paths
    # completos E o SERVERS acrescenta o prefixo de novo.
    'SCHEMA_PATH_PREFIX': r'/api/v1',
    'SCHEMA_PATH_PREFIX_TRIM': True,
    'SERVERS': [
        {'url': 'http://localhost:8000/api/v1', 'description': 'Desenvolvimento local'},
    ],
}
```

Detalhe que custou uma tentativa: **`SCHEMA_PATH_PREFIX` sozinho não faz nada.**
Ele é usado só para estimar a tag. Quem remove o prefixo dos paths é
`SCHEMA_PATH_PREFIX_TRIM`, e quem o declara para o cliente é `SERVERS`.

Resultado — o schema passou a devolver paths relativos:

```
/ping/  ·  /auth/token/  ·  /auth/token/refresh/  ·  /auth/logout/  ·  /auth/me/
```

e o client gerado, com a mesma baseURL, monta `http://127.0.0.1:8000/api/v1/ping/` → 200.

### Efeito colateral positivo

Os nomes das funções geradas melhoraram, porque vinham do path:

| Antes | Agora |
|---|---|
| `v1PingRetrieve` | `pingRetrieve` |
| `v1AuthTokenCreate` | `authTokenCreate` |
| `v1AuthTokenRefreshCreate` | `authTokenRefreshCreate` |

Isso **resolve a pendência** que estava registrada na seção
[Pendências conhecidas](#pendências) — o `output.operations` do Orval ignorava o
`operationName` custom, mas agora os nomes saem bons de fábrica.

## Guarda de regressão

**3 testes novos** em `apidjango/setup/tests.py` (`TestContratoDaAPI`, 18 no total):

| Test | O que protege |
|---|---|
| `test_schema_nao_repete_o_prefixo` | Nenhum path do schema começa com `/api/v1` |
| `test_servers_declara_o_prefixo` | `SERVERS` existe e termina em `/api/v1` |
| `test_url_final_responde` | A URL montada como o front monta responde 200 |

**Verificado que o teste pega o bug:** desligando `SCHEMA_PATH_PREFIX_TRIM` de
propósito, `test_schema_nao_repete_o_prefixo` falha com a mensagem explicando
qual arquivo ajustar.

## Arquivos alterados

- `apidjango/setup/settings.py` — `SCHEMA_PATH_PREFIX_TRIM` + `SERVERS`
- `apidjango/setup/tests.py` — 3 testes de contrato
- `frontend/src/api/generated/**` — regenerado (paths relativos)
- `frontend/src/lib/api.ts` — comentário documentando a regra do prefixo
- `frontend/src/features/api-test/ApiTestPanel.tsx` — import renomeado
- `frontend/.env.example` — comentário sobre o prefixo

---

# Parte 3 — Fase 2: app de doações {#parte-3}

## Contexto

Primeira funcionalidade real de ponta a ponta. O formulário de doação da landing,
que era decorativo (o botão só abria o WhatsApp), vira um formulário que grava no
banco — e a equipe ganha um back-office para conferir.

## Correção de dados (regressão introduzida na Parte 2)

Duas coisas que eu tinha errado e foram corrigidas antes de seguir:

| Dado | Valor errado | Valor correto |
|---|---|---|
| WhatsApp | `+55 11 98268-7879` (do manual de marca) | **+55 13 98806-6437** |
| Chave PIX | `12.345.678/0001-99` (placeholder) | **`53.289.941/0001-53`** |

O DDD 11 estava no manual de marca, mas o código original do projeto já tinha o
`(13) 98806-6437` — eu substituí pelo do manual ao reescrever o `data.ts` e
introduzi a divergência. DDD 13 é o de Praia Grande/SP, coerente com o endereço.

**CNPJ validado por cálculo dos dígitos verificadores: 53.289.941/0001-53 → DV1=5,
DV2=3, ambos conferem.** Chave PIX no formato aceito pelo Banco Central: somente
 dígitos (`53289941000153`).

**Também corrigida a inconsistência do rodapé:** ele dizia "Sede Caieiras"
(`Footer.tsx:127`) com o endereço hardcoded em outro lugar. Adicionado
`ONG.cidade` e o rodapé deriva dele — não diverge de novo.

## Modelagem

Três decisões de modelagem feitas **para a Fase 3**, mesmo com o painel ainda
existindo só como plano:

| Campo | Por quê |
|---|---|
| `destinacao` (TextChoices) | Habilita o agrupamento do painel por causa. A referência de design tem "Escolha uma causa para apoiar", então o conceito já existia |
| `confirmado_em` | O painel vai querer medir quanto tempo leva da criação à confirmação |
| `index(status, -criado_em)` | É **exatamente** a query que o dashboard vai rodar. Sem índice, o painel degrada com alguns milhares de registros |

## A decisão de segurança central

**Três serializers e três endpoints separados, porque são três públicos.**

| Endpoint | Permissão | Comportamento |
|---|---|---|
| `POST /api/v1/doacoes/` | `AllowAny` | Cria **sempre** como PENDENTE |
| `GET /api/v1/doacoes/publico/` | `AllowAny` | Só CONFIRMADAS, sem dado pessoal |
| `GET /api/v1/doacoes/resumo/` | `AllowAny` | Totais, só CONFIRMADOS |
| `/api/v1/doacoes/admin/**` | `IsAdminUser` | CRUD completo |

O ponto que motivou a separação: num ViewSet único com
`IsAuthenticatedOrReadOnly`, qualquer visitante poderia mandar
`{"valor": 1000, "status": "CONFIRMADA"}` e fabricar a própria doação na página de
impacto.

A defesa é estrutural, não por filtro: **`status` não está na lista de `fields`
do serializer público.** Não é `read_only` — é inexistente. O DRF não enxerga o
campo, então não há valor que passe.

**Verificado na prática:** POST com `"status": "CONFIRMADA"` retorna 201 e o
registro nasce PENDENTE.

### Doação anônima

Decisão do time: grava o dado, não expõe. Implementado em três lugares:

- `DoacaoPublicSerializer` não tem `nome`/`email`/`telefone` — nenhum endpoint
  público alcança dado pessoal, de ninguém
- `Doacao.nome_exibido` devolve "Anônimo" quando a flag está marcada
- O admin usa essa property na listagem (e a busca ainda acha pelo nome real)

**Consequência a registrar:** o campo `anonimo` não tem efeito público hoje,
porque o mural não mostra nome de ninguém. Ele ganha sentido quando existir uma
lista de doadores na Fase 3.

**Risco assumido:** guarda-se dado pessoal sem necessidade de exibição. É decisão
consciente (a ONG precisa emitir recibo), mas é exposição de LGPD e deve estar
escrito no documento do projeto.

## Back-office (Django admin)

`list_display` com valor, forma, destinação e status · `list_filter` em todos os
eixos · `search_fields` por nome/e-mail/telefone · `date_hierarchy` por data ·
**ações em massa** confirmar, cancelar e carimbar registros confirmedos sem data.

## Frontend

`DonationSection` reescrito com `react-hook-form` + `zod` (v3.89 / v4.6).
O seletor de R$ 50/100/150 deixou de ser decorativo: o valor escolhido alimenta o
campo `valor` do POST.

A tela de sucesso diz explicitamente que a doação está **pendente de conferência**.
Dizer "doação confirmada" seria informação errada — o sistema ainda nem olhou o
extrato.

### Três erros que o client gerado pegou

| Erro | Como apareceu |
|---|---|
| `valor` é **string**, não número | O `DecimalField` do Django vira string no OpenAPI, com padrão `^-?\d{0,8}(\.\d{0,2})?$`. O `tsc` apontou antes de qualquer requisição |
| `formaPagamento` × `forma_pagamento` | O form é camelCase (idiomático React), a API snake_case (idiomático Django) |
| `mensagem` é opcional | Não enviar string vazia |

Resolvido com a função `paraRequisicao()`, que faz o mapeamento **explícito** —
se o backend renomear um campo, o erro aponta aquela linha em vez de se espalhar
pelo JSX.

### Dois erros de biblioteca

- **`z.coerce.number()` quebra o Resolver do react-hook-form.** O `z.coerce` deixa
  o tipo de entrada como `unknown`, incompatível com `Resolver<TFieldValues>`.
  Solução: `z.number()` no schema + `valueAsNumber: true` no `register`.
- **`watch()` da própria lib sinaliza warning** de que não é seguro para rerender.
  Trocado por `useWatch`, que isola a assinatura.

### Bug de URL que os testes pegaram

`path('api/v1/', include('doacoes.urls'))` sem o prefixo `doacoes/` — as rotas
ficaram em `/api/v1/` e os 31 testes novos falharam com 404. Corrigido para
`path('api/v1/doacoes/', include(...))`.

Vale notar o padrão: **erro de URL só aparece quando alguém pede a URL.** Os testes
de escrita do arquivo não pegaram nada disso.

## Validação da Fase 2

| Checagem | Resultado |
|---|---|
| `pytest` | **49 passed** (18 auth + 3 contrato + 28 doações) |
| `ruff` / `manage.py check` | limpos |
| `tsc` / `eslint` / `vite build` | limpos |
| POST público | 201, nasce PENDENTE |
| POST com `status=CONFIRMADA` | 201, **ignorado**, nasce PENDENTE |
| Mural público | sem `nome`/`email`/`telefone` |
| Admin sem token / com token de não-staff | 401 / 403 |
| Confirmar em lote | carimba `confirmado_em` |
| Resumo por destinação | agrega corretamente |

Renderização verificada com Firefox headless. **Ressalva:** o formulário só pôde ser
confirmado visualmente com a animação de reveal desabilitada — em screenshot
estático ele nunca sai de `opacity: 0` porque nunca entra na viewport. O clique
real no botão de envio ainda não foi testado em browser.

## Pendências que sobraram desta fase

- [ ] **Como a ONG recebe doação hoje ainda não foi confirmado.** O sistema só
      enxerga o que passa pelo formulário. Se hoje é PIX direto no celular, o total
      do painel será menor que o extrato. Precisa estar escrito no documento.
- [ ] **Usuário `admin_teste` criado** para desenvolvimento, com senha fraca.
      É só para a máquina local — nunca criar em ambiente real.
- [ ] **A chave PIX é de pessoa física ou da ONG?** Com CNPJ preenchido, presume-se
     PJ. Confirmar antes de publicar.

---

# Validação {#validacao}

## Estado final

| Checagem | Comando | Resultado |
|---|---|---|
| Django | `manage.py check` | 0 issues |
| Django | `ruff check setup/ core/` | All checks passed |
| Django | `pytest` | **49 passed** |
| Frontend | `tsc -b` | sem erros |
| Frontend | `eslint .` | sem erros |
| Frontend | `vite build` | ✓ 495 KB JS / 51 KB CSS (gzip: 155 KB / 8,9 KB) |
| Integração | `curl /api/v1/ping/` | `{"servico":"django","status":"ok","banco":"ok"}` |
| Instalação | `pnpm install` do zero | esbuild nativo OK |

## Comandos para subir o ambiente

```bash
# 1. Banco
docker compose up -d

# 2. Back-end (outro terminal)
cd apidjango
./venv/bin/python manage.py runserver

# 3. Front-end (outro terminal)
cd frontend
pnpm install
pnpm dev

# 4. Se mudar um serializer no Django, regerar o client do front:
pnpm api:generate
```

URLs: landing em `http://localhost:5173` · Swagger em `http://localhost:8000/api/docs/` ·
Django admin em `http://localhost:8000/admin/`

---
---

# Decisões que valem registro {#decisões}

## Conteúdo em módulo separado

`features/home/data.ts` concentra todo o texto e dado. **É o que torna a Fase 3
barata.** Documentar isto no projeto porque parece detalhe e não é.

## Cores em tokens, nunca literais

Nenhum hex no JSX. Um `#00a651` espalhado em 20 arquivos é impossível de manter
contra um manual de marca. Trocar a cor da ONG inteira é editar um lugar.

## Ícones de marca em SVG próprio

O lucide removeu os ícones de Instagram e Facebook por política de marca. Usar um
ícone genérico (`Camera` para o Instagram) quebraria a identidade institucional.
Recriar os glifos oficiais em `BrandIcons.tsx`.

## Sem lib de animação

Ver justificativa na [Parte 2](#parte-2). Decisão reversível se o escopo mudar.

## pnpm como padrão do time

Commitado `packageManager` e `pnpm-workspace.yaml`. **Instrução para o time:
usar `pnpm install`, nunca `npm install`** — o npm resolveria versões diferentes e
recriaria o `package-lock.json`, que é o problema que a decisão resolveu.

---
---

# Pendências conhecidas {#pendências}

Nada bloqueia a Fase 2, mas registrado para não ser esquecido:

### Frontend

- [ ] **Fotos do Unsplash são de banco genérico.** Precisam ser substituídas por
      fotos reais da ONG. Não é detalhe: fotos de crianças de banco em um site de
      ONG real levantam questão de consentimento e de veracidade do trabalho.
      Também é o tipo de coisa que o professor percebe.
- [ ] **`Política de Privacidade` no rodapé é texto morto** — não é link, não tem
      página. A referência tem o link; precisa existir antes de publicar.
- [x] ~~Chave PIX placeholder~~ — **resolvido**: `53.289.941/0001-53` (CNPJ validado)
- [ ] **Mapa do contato** é um link para o Google Maps, não um embed. Um embed real
      exige chave de API.
- [ ] **WhatsApp e telefone duplicados em dois lugares** (`data.ts` tem URL e texto
      formatado). Ao corrigir, lembrar dos dois — foi assim que o DDD divergiu.
- [ ] **Formulários de pré-cadastro e contato ainda não enviam para a API** —
      dependem dos apps `alunos` e `contato` (Fase 3). Hoje mostram confirmação local.
- [x] ~~Nomes das funções geradas ficaram `v1PingRetrieve`~~ — **resolvido** pela
      correção do prefixo (ver [Correção 404](#correcao-404))
- [ ] **Teste de interação real pendente** — o botão "Testar API" foi corrigido por
      análise da composição da URL e por requisição direta, mas **ainda não foi
      clicado num browser de verdade**. Menu mobile e hover também.

### Conteúdo

- [ ] Textos de `data.ts` foram escritos a partir da referência e do manual.
      **Precisam de revisão da ONG** — especialmente endereço, telefone e os
      números de impacto (450+ / 1.200+ / 15+ / 150+ came da referência, não de
      dados auditados).
- [ ] Confirmar se a ONG tem sede em Caieiras **e** Praia Grande (o manual cita
      ambas; o texto usa só Caieiras).

### Processo

- [ ] `refs/` foi adicionada ao `.gitignore` (7,5 MB de PNG). As referências
      continuam no disco — só não vão para o git. Decidir se o time quer outra
      estratégia de armazenamento.