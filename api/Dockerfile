# syntax=docker/dockerfile:1
# -----------------------------------------------------------------------------
# API Livrin — imagem multi-stage
#   dev     → hot reload com tsx (usado por docker-compose.dev.yml)
#   runtime → imagem de produção enxuta (padrão do docker-compose.yml)
# -----------------------------------------------------------------------------
FROM node:22-alpine AS base
WORKDIR /app
ENV NPM_CONFIG_UPDATE_NOTIFIER=false NPM_CONFIG_FUND=false

# Dependências completas (inclui devDependencies para compilar/rodar em dev)
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# Ambiente de desenvolvimento (o código é montado como volume pelo compose dev)
FROM deps AS dev
ENV NODE_ENV=development
COPY . .
EXPOSE 3000
CMD ["sh", "-c", "npm run db:migrate && npm run db:seed && npm run db:verify && npm run dev"]

# Compilação TypeScript → JavaScript
FROM deps AS build
COPY . .
RUN npm run build

# Imagem final de produção: somente dependências de runtime + build
FROM base AS runtime
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY drizzle ./drizzle
COPY seed-assets ./seed-assets
# Diretório de uploads (montado como volume) pertencente ao usuário sem privilégios
RUN mkdir -p /app/uploads && chown -R node:node /app/uploads
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3000/health || exit 1
# Aplica migrations, executa o seed idempotente, confere a integridade dos
# arquivos do volume de uploads e só então inicia o servidor
CMD ["npm", "run", "start:prod"]
