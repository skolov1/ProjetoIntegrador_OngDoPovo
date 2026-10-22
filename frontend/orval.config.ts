/**
 * Orval — gera o client TypeScript a partir do OpenAPI do Django.
 *
 * O schema em /api/schema/ e a fonte da verdade da API. Quando um serializer
 * muda no backend, rode `pnpm api:generate` e o frontend inteiro se atualiza:
 * campo novo aparece, campo removido vira erro de compilacao.
 *
 * O backend precisa estar rodando (docker compose up -d + manage.py runserver).
 * Para gerar offline, baixe o schema com curl e aponte `input` para o arquivo.
 */
import { defineConfig } from 'orval'

const schemaUrl =
  process.env.VITE_API_SCHEMA_URL ?? 'http://127.0.0.1:8000/api/schema/?format=json'

export default defineConfig({
  ong: {
    input: schemaUrl,
    output: {
      mode: 'tags-split',
      // Um arquivo por tag (auth, sistema, doacoes, ...).
      target: 'src/api/generated',
      schemas: 'src/api/generated/model',
      prettier: true,
      barrelType: 'none',
      override: {
        mutator: {
          /**
           * CRITICO: sem isto o Orval emite `axios.default.post(...)`, que ignora
           * a baseURL e o withCredentials configurados em src/lib/api.ts — o
           * client chamaria o Vite em :5173 em vez do Django em :8000, e o
           * cookie httpOnly do refresh nunca seria enviado.
           *
           * O caminho e relativo ao arquivo gerado (src/api/generated/<tag>/).
           */
          path: './src/lib/api.ts',
          // Nome do export em src/lib/api.ts
          name: 'api',
        },
      },
    },
  },
})