FROM node:24-alpine AS builder

ARG VERSION
ARG REVISION
ARG BUILDTIME

WORKDIR /build

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build


FROM joseluisq/static-web-server:2 AS runner

LABEL org.opencontainers.image.title="DEVS" \
      org.opencontainers.image.description="Browser-native AI agent orchestration platform" \
      org.opencontainers.image.url="https://github.com/codename-co/devs" \
      org.opencontainers.image.source="https://github.com/codename-co/devs" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.revision="${REVISION}" \
      org.opencontainers.image.created="${BUILDTIME}" \
      org.opencontainers.image.licenses="MIT"

COPY --from=builder /build/dist ./public

ENV SERVER_LOG_LEVEL=info
ENV SERVER_LOG_WITH_ANSI=true
