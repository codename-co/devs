FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY server.mjs ./

ENV HOST=0.0.0.0
ENV PORT=3001

EXPOSE 3001

CMD ["node", "server.mjs"]
