# Quadro de Avisos

Aplicação web para cadastro, moderação e visualização de ocorrências em mapa. Usuários podem registrar pontos de interesse, riscos ou problemas com fotos, descrição e localização; administradores aprovam e gerenciam os registros.

## Visão geral

- **Backend:** NestJS + Express + TypeScript.
- **Frontend:** Handlebars + JavaScript vanilla + CSS.
- **Mapa:** Google Maps JavaScript API.
- **Banco de dados:** PostgreSQL via NeonDB.
- **ORM:** Drizzle ORM.
- **Upload de imagens:** Uploadcare.
- **Autenticação:** JWT com `jose`.
- **Deploy:** Vercel serverless.

## Funcionalidades principais

- Cadastro de ocorrências com título, descrição, criticidade, data/hora, BO e fotos.
- Relato rápido por foto usando a câmera do dispositivo.
- Edição e remoção de ocorrências antes da aprovação.
- Moderação por administradores (aprovação e remoção).
- Filtros de mapa por período, criticidade, pendentes (admin) e minhas ocorrências.
- Visualização de ocorrências com carrossel de fotos e zoom em tela cheia.
- Autenticação de cidadãos e suporte a usuários anônimos (`anonId`).
- PWA instalável.

## Como executar

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Configure as variáveis de ambiente no arquivo `.env`:

   ```env
   AMPAG_DATABASE_URL=
   JWT_SECRET=
   GOOGLE_MAPS_API_KEY_DEV=
   GOOGLE_MAPS_API_KEY_PROD=
   UPLOADCARE_PUBLIC_KEY=
   UPLOADCARE_CDN_SUBDOMAIN=
   NODE_ENV=
   ```

3. Gere as migrations do banco (se necessário):

   ```bash
   npm run db:generate
   ```

4. Compile e teste:

   ```bash
   npm run build
   npm test
   ```

5. Inicie em modo desenvolvimento:

   ```bash
   npm run start:dev
   ```

6. Acesse:

   ```text
   http://localhost:3000
   ```

## Estrutura principal

```
src/            # Backend NestJS
public/         # Arquivos estáticos do frontend
views/          # Templates Handlebars
docs/           # Documentação
src/database/   # Schemas Drizzle e migrations
```

## Scripts úteis

| Script | Descrição |
|---|---|
| `npm run start:dev` | Servidor com watch |
| `npm run build` | Compilação TypeScript |
| `npm test` | Testes com Jest |
| `npm run db:generate` | Gera migrations do Drizzle |

## Documentação complementar

- [Arquitetura](docs/arquitetura.md)
- [Backend](docs/backend.md)
- [Frontend](docs/frontend.md)
- [Análise da primeira versão](docs/primeira-versao.md)

## Status atual

Primeira versão funcional com persistência real em banco de dados, autenticação JWT, moderação de ocorrências e PWA. Veja [docs/primeira-versao.md](docs/primeira-versao.md) para análise completa, débitos técnicos e próximos passos.
