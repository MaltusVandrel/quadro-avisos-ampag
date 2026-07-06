# Quadro de Avisos

Este projeto é uma aplicação web em NestJS para cadastro e visualização de ocorrências em um mapa. A ideia é permitir que usuários registrem pontos de interesse, riscos ou problemas em uma interface simples e interativa.

## Visão geral

O sistema combina:
- um backend em NestJS para estruturar o fluxo da aplicação;
- uma interface web renderizada com Handlebars;
- um mapa interativo com Google Maps;
- armazenamento local das ocorrências no navegador para o protótipo atual.

## Como executar

1. Instale as dependências:
   ```bash
   npm install
   ```
2. Inicie a aplicação em modo desenvolvimento:
   ```bash
   npm run start:dev
   ```
3. Acesse:
   ```text
   http://localhost:3000
   ```

## Estrutura principal

- src/: código do backend em NestJS
- public/: arquivos estáticos do frontend (CSS e JavaScript)
- views/: templates Handlebars
- docs/: documentação complementar

## Status atual

O projeto está em fase de protótipo, com foco em:
- renderização do mapa;
- criação de ocorrências pela interface;
- seleção de ponto no mapa;
- persistência local no navegador.
