# Arquitetura do projeto

## Visão geral da arquitetura

A aplicação segue uma arquitetura simples, com separação entre:
- camada de apresentação (frontend);
- camada de aplicação (backend NestJS);
- camada de domínio (módulos de ocorrências e cidadãos; criticidade é um enum);
- camada de dados (`src/database/`, com Drizzle ORM + NeonDB).

```mermaid
flowchart LR
    A[Usuário] --> B[Frontend: Handlebars + JS + CSS]
    B --> C[Backend NestJS]
    C --> D[Módulo de Ocorrências]
    C --> E[Módulo de Cidadãos]
    C --> F[Enum de Criticidade]
    C --> H[Camada de Dados: Drizzle + Neon]
    B --> G[Armazenamento local do navegador]
```

## Componentes principais

### Frontend
- Renderiza a página principal com Handlebars.
- Carrega o mapa via Google Maps JavaScript API.
- Gerencia os marcadores, seleção de pontos e formulário de criação.
- Usa arquivos estáticos em public/css e public/js.

### Backend
- Responsável por iniciar a aplicação e servir a view principal.
- Organiza o projeto em módulos.
- Expõe controladores para operações relacionadas a ocorrências e cidadãos.

## Observação importante

O fluxo atual do protótipo é principalmente frontend-driven. As ocorrências são criadas e persistidas no navegador por meio de localStorage, enquanto o backend permanece como estrutura base e lógica de domínio inicial.
