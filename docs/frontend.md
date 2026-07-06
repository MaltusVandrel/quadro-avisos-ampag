# Documentação do frontend

## Responsabilidade

O frontend é a camada responsável pela interação com o usuário. Ele concentra a experiência de mapa, formulário de ocorrência e lógica visual.

## Tecnologias usadas

- Handlebars para renderização da view principal
- HTML/CSS para layout e estilos
- JavaScript para controle do mapa e da interface
- Google Maps JavaScript API para exibição de marcadores e clusters

## Arquivos principais

- views/home.hbs: estrutura da página inicial
- public/css/home.css: estilos da interface
- public/js/home.js: lógica do mapa, seleção de ponto, modal e persistência local

## Fluxo principal

1. A página é carregada pelo backend.
2. O mapa é inicializado com a API do Google Maps.
3. O usuário clica em “Nova ocorrência”.
4. O sistema entra no modo de seleção de ponto.
5. O ponto escolhido é usado para preencher o formulário.
6. A ocorrência é salva localmente no navegador.

## Características atuais

- exibição de marcadores no mapa;
- agrupamento de marcadores;
- modal para cadastro;
- seleção de ponto no centro do mapa;
- armazenamento local das ocorrências.
