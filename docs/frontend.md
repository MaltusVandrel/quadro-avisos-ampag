# Documentação do frontend

## Responsabilidade

O frontend é a camada de interação com o usuário. Ele carrega a página inicial, inicializa o mapa, gerencia modais, formulários, autenticação e comunicação com a API REST.

## Tecnologias usadas

- Handlebars para renderização inicial da página.
- HTML/CSS para estrutura e estilos.
- JavaScript vanilla para toda a lógica dinâmica.
- Google Maps JavaScript API para mapa, marcadores e clusters.
- FontAwesome para ícones.
- Service Worker para comportamento de PWA.

## Arquivos principais

| Arquivo | Responsabilidade |
|---|---|
| `views/home.hbs` | Estrutura da página, modais e carregamento de assets. |
| `public/js/home.js` | Lógica do mapa, autenticação, formulários, filtros, upload, viewer, SW. |
| `public/css/home.css` | Estilos mobile-first, modais, botões, picker de criticidade, etc. |
| `public/sw.js` | Service worker network-only; limpa caches antigas. |
| `public/manifest.json` | Configuração da PWA. |

## Fluxos principais

### Criar ocorrência

1. Usuário toca em "Nova ocorrência".
2. Sistema entra no modo de seleção de ponto; o centro do mapa define a localização.
3. Ao confirmar, abre o modal de cadastro.
4. Usuário preenche título, descrição, criticidade, data/hora, BO e fotos.
5. Fotos são redimensionadas no cliente e enviadas para `/uploads`.
6. Ao salvar, envia `POST /incidents` com `fileIds`, localização e `citizenId`/`anonId`.

### Relato rápido por foto

1. Botão de câmera é exibido apenas quando há permissão de câmera e precisão de GPS ≤ 1000m.
2. Ao tocar, abre a câmera nativa (`capture="environment"`).
3. A foto é enviada para `/uploads`.
4. Com a localização atual, cria uma ocorrência automaticamente via `POST /incidents`.

### Visualizar ocorrência

1. Clique no marcador abre `incidentViewModal`.
2. Busca fotos em `GET /uploads?incidentId=`.
3. Exibe título, subtítulo (criticidade + data), carrossel de fotos e descrição.
4. Ações disponíveis dependem do perfil: aprovar (admin), editar (dono/admin), remover (dono/admin).
5. Anônimos donos veem uma mensagem informando que precisam se cadastrar para editar.

### Editar ocorrência

1. Ação "Editar" abre o modal de cadastro pré-preenchido.
2. Permite alterar título, descrição, criticidade, data/hora, BO, localização e fotos.
3. Envio via `PATCH /incidents/:id`.
4. Só é permitida antes da aprovação.

### Filtros do mapa

1. Botão de filtro abre modal com opções de período, criticidade, pendentes (admin) e minhas ocorrências.
2. Filtros são salvos em `localStorage`.
3. Ao aplicar, recarrega os marcadores via `GET /incidents/map`.

### Autenticação

1. Modal com modos login, cadastro e redefinição de senha.
2. CPF é formatado automaticamente.
3. JWT e dados do cidadão ficam em `localStorage`.
4. Após login ou logout a página é recarregada e os filtros do mapa são resetados.

## Armazenamento local

| Chave | Conteúdo |
|---|---|
| `quadro-avisos-session` | Token JWT e dados do cidadão. |
| `quadro-avisos-map-filters` | Período, criticidades, pendentes e minhas ocorrências. |
| `quadro-avisos-default-criticality` | Criticidade padrão para novas ocorrências. |
| `quadro-avisos-anonymous-profile` | Perfil anônimo com `anonId` e fingerprint. |

## Regras de validação no formulário

- É necessário ter **foto** OU **título + descrição**.
- Se não houver foto, título e descrição são obrigatórios.
- A data/hora é convertida para ISO UTC antes de enviar.

## PWA

- `manifest.json` permite instalação em standalone.
- `sw.js` adota estratégia network-only e limpa caches antigos para evitar stale content.
- Cache-busting dos assets via query string (`home.js?v=39`).

## Observações

- O arquivo `public/js/home.js` é monolítico; modularização é recomendada para evolução.
- Datas trafegam em UTC entre frontend e backend.
- O `mapId` do Google Maps está hardcoded no JavaScript.
