FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY server.mjs ./

ENV HOST=0.0.0.0
ENV PORT=4444

EXPOSE 4444

CMD ["node", "server.mjs"]
