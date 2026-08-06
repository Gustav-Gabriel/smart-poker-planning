# Smart Planning Poker

Planning poker em tempo real com IA, Jira e GitHub — monolito Next.js + Socket.io, sem banco de dados.

## Desenvolvimento local

```bash
npm install
cp .env.example .env
# Edite .env: KLIPY_API_KEY, GEMINI_API_KEY, JIRA_SITE, JIRA_EMAIL, JIRA_TOKEN
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

### Variáveis de ambiente (servidor)

Credenciais de **IA** e **Jira** vêm do ambiente do processo — não são pedidas no formulário de criar sala:

| Variável | Uso |
|----------|-----|
| `KLIPY_API_KEY` | Busca de GIFs no avatar |
| `GEMINI_API_KEY` | Copiloto Gemini (único provedor visível na UI) |
| `OPENAI_API_KEY` | Reservado (UI oculta) |
| `ANTHROPIC_API_KEY` | Reservado para Claude (UI oculta) |
| `JIRA_SITE` | URL do site Atlassian (ex.: `https://suaempresa.atlassian.net`) |
| `JIRA_EMAIL` | E-mail da conta Jira (Basic auth) |
| `JIRA_TOKEN` | Token de API do Jira |
| `PORT` | Porta HTTP (Render/Railway costumam injetar) |

Na tela **Criar sala** (`/create`) o anfitrião escolhe nome, baralho, provedor de IA (Gemini), token GitHub opcional e avatar. O servidor preenche as chaves de IA/Jira a partir do env na criação da sala.

O anfitrião também pode anexar **código local** (arquivo `.zip` ou pasta) na sala para análise profunda, sem token. O conteúdo fica só na memória do navegador do anfitrião até a análise.

Essas chaves ficam apenas na memória do processo, vinculadas à sala, e são descartadas quando a sala expira (~2 h sem atividade) ou o servidor reinicia.

## Deploy gratuito (Render ou Railway)

Este app precisa de **um processo Node.js contínuo** com WebSockets. Render e Railway oferecem tier gratuito adequado para MVP.

### Passos comuns

1. Conecte o repositório Git ao serviço.
2. **Build command:** `npm install && npm run build`
3. **Start command:** `npm start`
4. **Variáveis de ambiente:** defina pelo menos `KLIPY_API_KEY`, `GEMINI_API_KEY`, `JIRA_SITE`, `JIRA_EMAIL` e `JIRA_TOKEN`. A plataforma costuma injetar `PORT` automaticamente.
5. Garanta que a instância **permaneça acordada** durante a sessão — WebSockets exigem conexão persistente; em planos gratuitos, o serviço pode hibernar após inatividade.

> `tsx`, `typescript` e os pacotes `@types/*` usados pelo `next build` e pelo `server.ts` ficam em `dependencies` (não em `devDependencies`) de propósito: Render e Railway definem `NODE_ENV=production` antes do `npm install`, e o npm ignora `devDependencies` nesse caso. Isso garante que `npm run build` e `npm start` funcionem sem passos extras.

### Render

- Tipo de serviço: **Web Service**
- Runtime: Node
- Build: `npm install && npm run build`
- Start: `npm start`
- Env (Environment → Environment Variables):
  - `KLIPY_API_KEY`
  - `GEMINI_API_KEY`
  - `JIRA_SITE`
  - `JIRA_EMAIL`
  - `JIRA_TOKEN`
  - (opcional) `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` se reativar outros provedores na UI

### Railway

- Novo projeto → **Deploy from GitHub**
- Build: `npm install && npm run build`
- Start: `npm start`
- Variables: as mesmas do Render acima

## Por que não Vercel-only no MVP?

A Vercel é otimizada para funções serverless e páginas estááticas. Este projeto roda **Next.js e Socket.io no mesmo processo** (`server.ts`), mantendo salas e conexões WebSocket em memória. Isso não se encaixa no modelo serverless da Vercel (sem processo long-lived, sem estado compartilhado entre invocações). Para o MVP, use Render, Railway ou outro host com processo persistente.

## Segurança

- Chaves de IA e Jira vêm do **ambiente do servidor** e são copiadas para a memória da sala na criação.
- Token GitHub opcional (do formulário) existe **somente na memória do servidor**, por sala, durante a vida da sessão.
- Código local anexado não é persistido no servidor; só textos selecionados vão no POST de análise profunda (com caps de tamanho).
- Não há persistência em banco nem gravação em disco dessas credenciais.
- Participantes não recebem as chaves — apenas o servidor as usa nas rotas de API internas.
- Salas inativas por ~2 horas são removidas automaticamente (`purgeExpired`).

## Scripts

| Comando        | Descrição                          |
|----------------|------------------------------------|
| `npm run dev`  | Desenvolvimento (hot reload)       |
| `npm run build`| Build de produção (Next.js)        |
| `npm start`    | Servidor de produção               |
| `npm test`     | Testes (Vitest)                    |
