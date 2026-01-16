# Connector Implementation Checklist

Use this checklist when adding a new connector to DEVS.

## Pre-Implementation

- [ ] Review provider's OAuth documentation
- [ ] Note OAuth flow type (Authorization Code + PKCE, Basic Auth, etc.)
- [ ] Check if provider supports refresh tokens
- [ ] Identify required scopes
- [ ] Review API rate limits
- [ ] Check if provider has a delta sync/changes API

## Implementation Steps

### 1. Type Definitions (`src/features/connectors/types.ts`)

- [ ] Add provider to `AppConnectorProvider` type union
- [ ] Add config entry to `APP_CONNECTOR_CONFIGS`

### 2. Provider Class (`src/features/connectors/providers/apps/{provider}.ts`)

- [ ] Create provider file from template
- [ ] Implement OAuth methods:
  - [ ] `getAuthUrl()`
  - [ ] `exchangeCode()`
  - [ ] `refreshToken()`
  - [ ] `validateToken()`
  - [ ] `revokeAccess()`
  - [ ] `getAccountInfo()`
- [ ] Implement content operations:
  - [ ] `list()`
  - [ ] `listWithToken()`
  - [ ] `read()`
  - [ ] `search()` (optional)
  - [ ] `getChanges()`
- [ ] Implement `normalizeItem()`
- [ ] Export default instance

### 3. Provider Registry (`src/features/connectors/provider-registry.ts`)

- [ ] Add to `APP_PROVIDERS` array
- [ ] Add lazy loader in `initializeDefaults()`

### 4. Provider Index (`src/features/connectors/providers/apps/index.ts`)

- [ ] Add to `PROVIDER_CONFIG` with name, icon, color, description
- [ ] Add to `AVAILABLE_PROVIDERS` array
- [ ] Add lazy export function

### 5. OAuth Gateway (`src/features/connectors/oauth-gateway.ts`)

- [ ] Add OAuth config with authUrl, tokenUrl, scopes, etc.

### 6. Connector Provider (`src/features/connectors/connector-provider.ts`)

- [ ] Add provider scopes to `PROVIDER_SCOPES`
- [ ] Add to `SHARED_ACCOUNT_GROUPS` if related to other providers

### 7. Normalizer (`src/features/connectors/normalizer.ts`)

- [ ] Add provider file type mappings if needed

### 8. Bridge Server (`utils/devs-bridge/server.mjs`)

- [ ] Add environment variable declarations
- [ ] Add route handler for OAuth token endpoint
- [ ] Add route handler for API proxy (if needed)
- [ ] Update `.env.example`

### 9. Vite Config (`vite.config.ts`)

- [ ] Add dev proxy for OAuth endpoints
- [ ] Add dev proxy for API endpoints (if needed)

### 10. UI

- [ ] Add icon to `src/components/Icon.tsx` (if new)
- [ ] Verify icon name matches config

### 11. Environment

- [ ] Add `VITE_{PROVIDER}_CLIENT_ID` to `.env.local`
- [ ] Add `VITE_{PROVIDER}_CLIENT_SECRET` to `.env.local`
- [ ] Register OAuth app with provider to get credentials
- [ ] Configure redirect URI: `https://localhost:3000/oauth/callback` (dev)
- [ ] Configure redirect URI: `https://devs.new/oauth/callback` (prod)

## Testing

- [ ] Start dev server: `npm run dev`
- [ ] Navigate to `/connectors`
- [ ] Click "Add Connector" and select new provider
- [ ] Complete OAuth flow successfully
- [ ] Verify account info displays correctly
- [ ] Test content listing
- [ ] Test content reading
- [ ] Test search (if supported)
- [ ] Test sync functionality
- [ ] Test token refresh (if applicable)
- [ ] Test disconnect/revoke

## Production Deployment

- [ ] Add secrets to production bridge server environment
- [ ] Verify production redirect URI in OAuth app settings
- [ ] Test OAuth flow in production
