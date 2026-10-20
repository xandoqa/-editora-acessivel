# syntax=docker/dockerfile:1
# -----------------------------------------------------------------------------
# Front-end Livrin — imagem multi-stage
#   dev     → servidor Vite com hot reload (docker-compose.dev.yml)
#   runtime → build estático servido pelo Nginx, que também faz proxy da API
# -----------------------------------------------------------------------------
FROM node:22-alpine AS deps
WORKDIR /app
ENV NPM_CONFIG_UPDATE_NOTIFIER=false NPM_CONFIG_FUND=false
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS dev
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

FROM deps AS build
COPY . .
ARG VITE_MAX_UPLOAD_MB=180
ENV VITE_MAX_UPLOAD_MB=$VITE_MAX_UPLOAD_MB
RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=10s --timeout=5s --retries=5 CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
