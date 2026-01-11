# DEVS Meeting Bot - Playwright-based Google Meet agent
FROM mcr.microsoft.com/playwright:v1.40.0-jammy

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copy application files
COPY server.mjs meet-bot.mjs ./

# Environment variables
ENV HOST=0.0.0.0
ENV PORT=4445
ENV LOG_LEVEL=info

# Expose WebSocket port
EXPOSE 4445

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:4445/health || exit 1

# Run the server
CMD ["node", "server.mjs"]
