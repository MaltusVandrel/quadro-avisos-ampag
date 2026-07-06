# Documentação do backend

## Responsabilidade

O backend é responsável por iniciar e organizar a aplicação NestJS, servindo a interface principal e estruturando os módulos de domínio.

## Tecnologias usadas

- NestJS
- Express
- Handlebars
- TypeScript

## Estrutura de módulos

- src/app.module.ts: módulo principal da aplicação
- src/app.controller.ts: rota inicial que renderiza a view principal
- src/occurrences/: módulo de ocorrências
- src/citizens/: módulo de cidadãos
- src/criticities/: módulo de criticidades

## Módulos atuais

### Ocorrências
- controla a criação, leitura e atualização de ocorrências;
- define a entidade principal do domínio.

### Cidadãos
- representa entidades relacionadas ao contexto do cadastro.

### Criticidades
- representa os tipos de criticidade utilizados nas ocorrências.

## Observação de implementação

Atualmente, o backend é uma base estrutural do projeto. A persistência real das ocorrências no protótipo ocorre no frontend por meio da API de armazenamento local do navegador, mas a arquitetura já está preparada para evoluir para uma persistência real no servidor.
