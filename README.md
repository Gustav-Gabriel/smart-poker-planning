# Smart Planning Poker

Planning poker em tempo real com IA, Jira e GitHub — monolito Next.js + Socket.io, sem banco de dados.

## Desenvolvimento local

```bash
npm install
cp .env.example .env
# Edite .env e defina KLIPY_API_KEY (obrigatório para GIFs no avatar)
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

### Chaves de IA, Jira e GitHub

As credenciais sensíveis **não** vão para variáveis de ambiente do servidor. O anfitrião cola tudo na tela **Criar sala** (`/create`):

- **Copiloto de IA** — provedor (OpenAI, Gemini ou Claude) e chave da API
- **Jira** — URL do site, e-mail e token de acesso (para importar histórias)
- **Token do GitHub** — opcional, PAT para repositórios privados no GitHub

O anfitrião também pode anexar **código local** (arquivo `.zip` ou pasta) na sala para análise profunda, sem token. O conteúdo fica só na memória do navegador do anfitrião até a análise.

Essas chaves ficam apenas na memória do processo, vinculadas à sala, e são descartadas quando a sala expira (~2 h sem atividade) ou o servidor reinicia.

## Deploy gratuito (Render ou Railway)

Este app precisa de **um processo Node.js contínuo** com WebSockets. Render e Railway oferecem tier gratuito adequado para MVP.

### Passos comuns

1. Conecte o repositório Git ao serviço.
2. **Build command:** `npm install && npm run build`
3. **Start command:** `npm start`
4. **Variáveis de ambiente:** defina pelo menos `KLIPY_API_KEY`. A plataforma costuma injetar `PORT` automaticamente.
5. Garanta que a instância **permaneça acordada** durante a sessão — WebSockets exigem conexão persistente; em planos gratuitos, o serviço pode hibernar após inatividade.

> `tsx`, `typescript` e os pacotes `@types/*` usados pelo `next build` e pelo `server.ts` ficam em `dependencies` (não em `devDependencies`) de propósito: Render e Railway definem `NODE_ENV=production` antes do `npm install`, e o npm ignora `devDependencies` nesse caso. Isso garante que `npm run build` e `npm start` funcionem sem passos extras.

### Render

- Tipo de serviço: **Web Service**
- Runtime: Node
- Build: `npm install && npm run build`
- Start: `npm start`
- Env: `KLIPY_API_KEY=<sua chave>`

### Railway

- Novo projeto → **Deploy from GitHub**
- Build: `npm install && npm run build`
- Start: `npm start`
- Variables: `KLIPY_API_KEY`

## Por que não Vercel-only no MVP?

A Vercel é otimizada para funções serverless e páginas estááticas. Este projeto roda **Next.js e Socket.io no mesmo processo** (`server.ts`), mantendo salas e conexões WebSocket em memória. Isso não se encaixa no modelo serverless da Vercel (sem processo long-lived, sem estado compartilhado entre invocações). Para o MVP, use Render, Railway ou outro host com processo persistente.

## Segurança

- Chaves de IA, Jira e GitHub existem **somente na memória do servidor**, por sala, durante a vida da sessão.
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
