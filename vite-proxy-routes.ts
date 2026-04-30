/**
 * Vite Proxy Routes Configuration
 *
 * Static proxy route definitions for the Vite dev server.
 * This file is imported by vite.config.ts and must NOT use @/ path aliases
 * since those aren't available when the Vite config is being processed.
 *
 * These routes enable OAuth token exchange and API proxying during development.
 * The production build uses the bridge server directly.
 */

import type { ProxyRoute } from './src/lib/oauth-proxy-plugin'

/**
 * Get all proxy routes for the OAuth proxy plugin.
 * Each route defines how to proxy API requests and inject credentials.
 *
 * @param env - Environment variables from loadEnv()
 */
export function getProxyRoutes(env: Record<string, string>): ProxyRoute[] {
  return [
    // Google OAuth (shared by all Google providers: Drive, Gmail, Calendar, Meet, Tasks, Chat)
    {
      pathPrefix: '/api/google',
      pathMatch: '/token',
      target: 'https://oauth2.googleapis.com',
      credentials: {
        type: 'body',
        clientId: env.VITE_GOOGLE_CLIENT_ID || '',
        clientSecret: env.VITE_GOOGLE_CLIENT_SECRET || '',
      },
    },
    // Notion OAuth
    {
      pathPrefix: '/api/notion',
      pathMatch: '/oauth/token',
      target: 'https://api.notion.com',
      targetPathPrefix: '/v1',
      credentials: {
        type: 'basic-auth',
        clientId: env.VITE_NOTION_CLIENT_ID || '',
        clientSecret: env.VITE_NOTION_CLIENT_SECRET || '',
      },
    },
    // Microsoft OAuth (Outlook, OneDrive)
    {
      pathPrefix: '/api/microsoft',
      pathMatch: '/token',
      target: 'https://login.microsoftonline.com/common',
      credentials: {
        type: 'body',
        clientId: env.VITE_MICROSOFT_CLIENT_ID || '',
        clientSecret: env.VITE_MICROSOFT_CLIENT_SECRET || '',
      },
    },
    // Dropbox OAuth
    {
      pathPrefix: '/api/dropbox',
      pathMatch: '/token',
      target: 'https://api.dropboxapi.com',
      credentials: {
        type: 'body',
        clientId: env.VITE_DROPBOX_CLIENT_ID || '',
        clientSecret: env.VITE_DROPBOX_CLIENT_SECRET || '',
      },
    },
    // Qonto OAuth
    {
      pathPrefix: '/api/qonto/oauth',
      pathMatch: '/oauth2/token',
      target: 'https://oauth.qonto.com',
      credentials: {
        type: 'body',
        clientId: env.VITE_QONTO_CLIENT_ID || '',
        clientSecret: env.VITE_QONTO_CLIENT_SECRET || '',
      },
    },
    // Qonto API
    {
      pathPrefix: '/api/qonto/v2',
      target: 'https://thirdparty.qonto.com',
      targetPathPrefix: '/v2',
      credentials: { type: 'none' },
    },
    // Slack OAuth
    {
      pathPrefix: '/api/slack',
      pathMatch: '/oauth.v2.access',
      target: 'https://slack.com/api',
      credentials: {
        type: 'body',
        clientId: env.VITE_SLACK_CLIENT_ID || '',
        clientSecret: env.VITE_SLACK_CLIENT_SECRET || '',
      },
    },
    // Figma OAuth
    {
      pathPrefix: '/api/figma',
      pathMatch: '/token',
      target: 'https://api.figma.com',
      credentials: {
        type: 'body',
        clientId: env.VITE_FIGMA_CLIENT_ID || '',
        clientSecret: env.VITE_FIGMA_CLIENT_SECRET || '',
      },
    },
    // Skills.sh API (unauthenticated, CORS proxy only)
    {
      pathPrefix: '/api/skills',
      target: 'https://skills.sh',
      targetPathPrefix: '/api',
      credentials: { type: 'none' },
    },
    // ChatJimmy API (unauthenticated, CORS proxy only)
    {
      pathPrefix: '/api/chatjimmy',
      target: 'https://chatjimmy.ai',
      targetPathPrefix: '/api',
      credentials: { type: 'none' },
    },
    // GitHub Models catalog API (CORS proxy) — must be before /api/github
    {
      pathPrefix: '/api/github-models',
      target: 'https://models.github.ai',
      credentials: { type: 'none' },
    },
    // GitHub API (token exchange for Copilot) — must be before /api/github
    {
      pathPrefix: '/api/github-api',
      target: 'https://api.github.com',
      credentials: { type: 'none' },
    },
    // GitHub Copilot API (chat completions, models) — must be before /api/github
    {
      pathPrefix: '/api/github-copilot-api',
      target: 'https://api.githubcopilot.com',
      credentials: { type: 'none' },
      extraHeaders: {
        'Editor-Version': 'vscode/1.99.0',
        'Editor-Plugin-Version': 'copilot/1.999.0',
        'User-Agent': 'GithubCopilot/1.999.0',
      },
    },
    // GitHub OAuth device flow (CORS proxy, no secret needed for public clients)
    {
      pathPrefix: '/api/github',
      target: 'https://github.com',
      credentials: { type: 'none' },
    },
  ]
}
