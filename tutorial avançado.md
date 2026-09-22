# 🌟 ONG do Povo 

Sistema de gestão e portal público para a ONG do Povo (Caieiras, Praia Grande - SP). Este monorepo contém o front-end (React/Vite), o painel administrativo (Django/Python) e a API de serviços (Java/Spring Boot).

## 🛠️ Pré-requisitos

Antes de iniciar, certifique-se de ter as seguintes ferramentas instaladas em sua máquina:

- **Docker** e **Docker Compose** (Para rodar o PostgreSQL)
- **Node.js** (Versão 20 ou superior)
- **Python** (Versão 3.12 ou superior)
- **Java JDK 21** e **Maven**

---

## Passo a Passo de Inicialização

A ordem de inicialização é importante. Siga os passos abaixo para rodar o projeto localmente.

### 1. Subindo o Banco de Dados (PostgreSQL)

O banco de dados de todo o ecossistema é gerenciado via Docker.

1. Abra o terminal na raiz do projeto.
2. Execute o comando para subir o contêiner em segundo plano:
   ```bash
   docker compose up -d
   ```

3. Configurando o Back-end Admin (Django)
O Django é o responsável pelas migrações do banco de dados e pelo painel administrativo.
 * Entre na pasta do projeto Python:
  ```bash
  cd api-django
  ```

 * Crie e ative o ambiente virtual:
   * Linux (ZSH/Bash):
```bash
python -m venv venv
source venv/bin/activate
```
   
   * Windows:
```bash
python -m venv venv
venv\Scripts\activate
```
 * Instale as dependências:
```bash
   pip install -r requirements.txt
```
 
 * Configure as variáveis de ambiente:
   * Copie o arquivo .env.example e renomeie para .env.
   * As credenciais padrão do Docker já devem estar preenchidas.
 * Crie as tabelas no banco e crie seu usuário admin:
```bash
python manage.py migrate
python manage.py createsuperuser
```
 
 * Inicie o servidor:
```bash
   python manage.py runserver
```
   *(Acesse http://localhost:8000/admin para testar).*
   
3. Configurando a API de Serviços (Spring Boot)
O Java consumirá as tabelas criadas pelo Django para processar agendamentos e transações.
 * Abra uma nova aba no terminal e entre na pasta do projeto Java:
```bash
   cd api-java
```

 * Configure as variáveis de ambiente:
   * Verifique o arquivo src/main/resources/application.yml para garantir que as portas e credenciais batem com o seu .env.
 * Inicie o servidor via Maven:
```
   mvn spring-boot:run
```
   *(A API rodará em http://localhost:8080).*

4. Configurando o Front-end (React + Vite)
A interface do usuário consome ambas as APIs de forma desacoplada.
 * Abra uma terceira aba no terminal e entre na pasta do front-end:
```bash   
cd frontend
```

 * Instale os pacotes do Node:
```bash
  npm install
```

 * Configure as rotas das APIs:
   * Copie o arquivo .env.example para .env.local e confirme se as URLs apontam para localhost:8000 (Django) e localhost:8080 (Java).
 * Inicie o servidor de desenvolvimento:
 ```bash
 * npm run dev
 ```

   (Acesse http://localhost:5173 no seu navegador).