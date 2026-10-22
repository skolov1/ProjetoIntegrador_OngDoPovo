/// <reference types="vite/client" />

/**
 * Tipagem das variaveis de ambiente do frontend.
 * Sem isso o TypeScript aceitaria `import.meta.env.QWERTY` sem reclamar.
 *
 * Para adicionar uma variavel: declara aqui e adiciona em `.env.example`.
 */
interface ImportMetaEnv {
  /** Base URL da API, ex: http://127.0.0.1:8000/api/v1 */
  readonly VITE_API_URL: string
  /** Schema OpenAPI, usado pelo Orval em orval.config.ts */
  readonly VITE_API_SCHEMA_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}