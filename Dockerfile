FROM node:24-alpine AS builder

WORKDIR /build

COPY . .

RUN npm ci
RUN npm run build


FROM joseluisq/static-web-server:2 AS runner

COPY --from=builder /build/dist /public

ENV SERVER_LOG_LEVEL=info
ENV SERVER_LOG_WITH_ANSI=true
