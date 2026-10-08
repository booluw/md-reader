# syntax=docker/dockerfile:1
FROM node:24-alpine AS build
WORKDIR /app
ENV CI=true
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run generate

FROM nginxinc/nginx-unprivileged:alpine
COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/.output/csp-hashes.conf /etc/nginx/csp-hashes.conf
COPY --from=build /app/.output/public /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/ > /dev/null || exit 1
