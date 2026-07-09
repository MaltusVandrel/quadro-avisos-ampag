# Documentação do backend

## Responsabilidade

O backend é responsável por:

- Servir a página inicial (`GET /`) e os arquivos estáticos do frontend.
- Expor uma API REST para autenticação, gestão de cidadãos, ocorrências e upload de fotos.
- Aplicar autenticação JWT e autorização baseada em roles (`user`/`admin`) e propriedade de recursos.
- Persistir dados no PostgreSQL via Drizzle ORM.

## Tecnologias usadas

- NestJS
- Express
- TypeScript
- Handlebars (view engine)
- Drizzle ORM
- PostgreSQL (NeonDB)
- Uploadcare (CDN de imagens)
- `jose` (JWT)
- PBKDF2 (hash de senha)

## Estrutura de módulos

| Módulo | Pasta | Responsabilidade |
|---|---|---|
| App | `src/app.*` | Bootstrap, módulo raiz, rota inicial, APP_GUARD. |
| Auth | `src/auth/` | Login, registro, logout, reset de senha, `/auth/me`. |
| Citizens | `src/citizens/` | CRUD de cidadãos e perfil do usuário logado. |
| Incidents | `src/incidents/` | CRUD de ocorrências, aprovação, desativação e filtros de mapa. |
| Uploadcare | `src/uploadcare/` | Envio de arquivos para Uploadcare e listagem por ocorrência. |
| Common | `src/common/` | Guards, decorators, helpers de JWT, senha e criticidade. |
| Database | `src/database/` | Schema Drizzle, conexão Neon e migrations. |

## Endpoints

### Auth (`/auth`)

| Método | Rota | Descrição | Público |
|---|---|---|---|
| POST | `/auth/login` | Autentica e retorna JWT + cidadão | Sim |
| POST | `/auth/register` | Cria conta; opcionalmente vincula `anonId` | Sim |
| POST | `/auth/logout` | Endpoint protegido de logout | Não |
| POST | `/auth/reset-password` | Redefine senha via CPF + data de nascimento | Sim |
| GET | `/auth/me` | Retorna cidadão logado | Não |

### Citizens (`/citizens`)

| Método | Rota | Descrição |
|---|---|---|
| POST | `/citizens` | Cria cidadão (público) |
| GET | `/citizens` | Lista cidadãos |
| GET | `/citizens/me` | Perfil do logado |
| PATCH | `/citizens/me` | Atualiza perfil do logado |
| GET | `/citizens/:id` | Busca cidadão por ID |

### Incidents (`/incidents`)

| Método | Rota | Descrição | Público |
|---|---|---|---|
| POST | `/incidents` | Cria ocorrência | Sim |
| GET | `/incidents?includeUnreviewed=true` | Lista geral | Não |
| GET | `/incidents/map` | Busca espacial com filtros | Sim |
| GET | `/incidents/:id` | Detalhe | Sim |
| PATCH | `/incidents/:id` | Atualiza ocorrência | Sim (valida permissão) |
| PATCH | `/incidents/:id/approve` | Aprova ocorrência | Não (admin) |
| PATCH | `/incidents/:id/deactivate` | Desativa ocorrência | Sim (valida permissão) |

### Uploads (`/uploads`)

| Método | Rota | Descrição | Público |
|---|---|---|---|
| POST | `/uploads?incidentId=` | Envia arquivo para Uploadcare | Sim |
| GET | `/uploads?incidentId=` | Lista fotos de uma ocorrência | Sim |

## Regras de negócio principais

- Uma ocorrência precisa ter `citizenId` **ou** `anonId`.
- Uma ocorrência precisa ter **pelo menos uma foto** OU **título e descrição** preenchidos.
- `criticality` é um enum (`Relato`, `Transtorno`, `Risco`, `Perigo`), não uma entidade de banco.
- Edição só é permitida enquanto a ocorrência não estiver aprovada (`reviewed === false`).
- Apenas admin pode aprovar.
- Desativação é permitida para admin ou para o autor enquanto a ocorrência estiver pendente.
- No mapa, não-admin vê apenas ocorrências aprovadas + as próprias (`citizenId`/`anonId`).
- Datas são convertidas e armazenadas em UTC.

## Autenticação e autorização

- `AuthGuard` global protege todas as rotas, exceto uma lista de paths públicos.
- JWT é assinado com HS256 e expira em 2 semanas.
- O decorator `@CurrentUser()` extrai `sub`, `login` e `role` do token.
- Anônimos são identificados pelo `anonId` enviado no corpo das requisições.

## Variáveis de ambiente

```env
AMPAG_DATABASE_URL=
JWT_SECRET=
GOOGLE_MAPS_API_KEY_DEV=
GOOGLE_MAPS_API_KEY_PROD=
UPLOADCARE_PUBLIC_KEY=
UPLOADCARE_CDN_SUBDOMAIN=
NODE_ENV=
```
