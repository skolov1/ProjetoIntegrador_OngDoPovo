# 🔗 Plano de Integração: React (Vite/TS) + Django + Spring Boot

Arquivozinho resenha que define o fluxo de trabalho para conectar a interface de usuário às duas APIs (Python e Java). O ambiente de desenvolvimento será padronizado e orquestrado para rodar perfeitamente em qualquer sistema operacional (supostamente), utilizando o MongoDB como banco de dados não-relacional.

## 1. Estrutura do Repositório (Monorepo)
Manteremos todos os serviços no mesmo repositório Git. Isso garante que a equipe utilize sempre o código mais atualizado do front e do back simultaneamente.

- `/frontend` (React + Vite + TypeScript)
- `/api-django` (Python + Django REST Framework)
- `/api-java` (Java + Spring Boot)
- `docker-compose.yml` (Orquestração do PostgreSQL e serviços)

## 2. Preparação do Back-end (Liberando o Acesso)
Por padrão, os navegadores bloqueiam requisições de portas diferentes (CORS, uma das maiores resenhas ja inventadas). Precisamos autorizar o front-end (que rodará na porta `5173`) a consumir nossos dados.

### No Django (`/api-django`):
1. Instalar a biblioteca: `pip install django-cors-headers`
2. No arquivo `settings.py`, adicionar ao `INSTALLED_APPS` e `MIDDLEWARE`.
3. Configurar a permissão para o Vite:
```python
   CORS_ALLOWED_ORIGINS = [
       "http://localhost:5173",
   ]
```

### No Spring Boot (`/api-java`):

1. Na classe principal ou no controlador (Controller), adicionar a anotação para liberar o CORS:
2. 
```Java
    @CrossOrigin(origins = "http://localhost:5173")
    @RestController
    @RequestMapping("/api/java-endpoint")
    public class ExemploController { ... }
```

## 3. Preparação do Front-end (Consumindo as APIs)

O React precisa saber com qual API está falando. Para não misturarmos as URLs no meio do código, usaremos variáveis de ambiente e o Axios (ou Fetch nativo).

1. Na raiz da pasta `/frontend`, crie um arquivo `.env.local`:
```ts
    VITE_API_DJANGO_URL=http://localhost:8000/api
    VITE_API_JAVA_URL=http://localhost:8080/api
```
    
2. Crie uma pasta `src/services` para centralizar as requisições. Exemplo de chamada para o Django:
```ts
    export const fetchDjangoData = async () => {
      const response = await fetch(`${import.meta.env.VITE_API_DJANGO_URL}/endpoint`);
      return response.json();
    };
```

## 4. Orquestração e Banco de Dados

Para evitar que cada membro da equipe tenha que instalar e configurar o PostgreSQL manualmente, usaremos o Docker. O arquivo `docker-compose.yml` na raiz subirá o banco de dados e preparará a rede para as APIs.

- **Comando de inicialização diária da equipe:** `docker compose up -d`
    
- **Editor recomendado:** Usem a IDE de preferência de vocês (como o Zed para navegação rápida ou outro editor de escolha da equipe) para editar os três ambientes de forma fluida.
    

## 5. Teste de Validação Inicial

A primeira "tarefa" técnica (Sprint 0) da equipe será garantir que o encanamento funciona:

1. Subir o banco de dados via Docker.
    
2. Criar um endpoint `/ping` no Django que retorne `{"servico": "django", "status": "ok"}`.
    
3. Criar um endpoint `/ping` no Spring Boot que retorne `{"servico": "java", "status": "ok"}`.
    
4. Criar uma tela simples no React com dois botões ("Testar Django" e "Testar Java") que exibam o JSON recebido na tela.