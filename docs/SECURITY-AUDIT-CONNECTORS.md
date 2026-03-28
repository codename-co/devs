# Security Audit — Connector Data Encryption

> **Audience:** Security audit team  
> **Scope:** Encryption of data originating from external connectors (OAuth apps such as Gmail, Google Drive, Google Calendar, Notion, Slack, Dropbox, etc.) — covering credential storage, data at rest, data in transit, and P2P sync.  
> **Date:** February 2026  
> **Status:** Evidence-based analysis with enhancement recommendations

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Credential Encryption (OAuth Tokens & API Keys)](#3-credential-encryption-oauth-tokens--api-keys)
4. [Data at Rest — Imported Connector Content](#4-data-at-rest--imported-connector-content)
5. [Data in Transit — P2P Sync Encryption](#5-data-in-transit--p2p-sync-encryption)
6. [Tool Usage — LLM Agent Access to Connector Data](#6-tool-usage--llm-agent-access-to-connector-data)
7. [OAuth 2.0 Security](#7-oauth-20-security)
8. [Cryptographic Inventory](#8-cryptographic-inventory)
9. [Identified Gaps & Risk Assessment](#9-identified-gaps--risk-assessment)
10. [Enhancement Recommendations](#10-enhancement-recommendations)
11. [Source Code References](#11-source-code-references)

---

## 1. Executive Summary

DEVS uses the **Web Crypto API** exclusively (no third-party cryptographic libraries) and employs industry-standard algorithms for credential protection:

| Area | Status | Algorithm | Notes |
|------|--------|-----------|-------|
| **OAuth tokens at rest** | ✅ Encrypted | AES-GCM-256 | Non-extractable CryptoKey in IndexedDB |
| **API keys at rest** | ✅ Encrypted | AES-GCM-256 | Same mechanism as tokens |
| **P2P sync (transit)** | ✅ E2E Encrypted | AES-GCM-256 via PBKDF2 | Per-message encryption, signaling server sees only ciphertext |
| **Imported content at rest** | ⚠️ **Not encrypted** | N/A | Emails, files, calendar events stored as plaintext in Yjs/IndexedDB |
| **Tool-mediated API calls** | ✅ Encrypted in transit | TLS (HTTPS) | Tokens decrypted in-memory only for the duration of the API call |

**Key finding:** Credentials (OAuth access/refresh tokens) are properly encrypted with AES-GCM-256 using non-extractable keys. However, the *content* imported from connectors (email bodies, Drive files, Calendar events, Notion pages) is stored as plaintext in IndexedDB. This is the primary gap.

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         BROWSER                                 │
│                                                                 │
│  ┌──────────────┐    ┌───────────────┐    ┌──────────────────┐  │
│  │  OAuth PKCE   │───▶│ SecureStorage  │───▶│  IndexedDB       │  │
│  │  Gateway      │    │ (AES-GCM-256) │    │  cryptoKeys      │  │
│  │              │    │               │    │  (non-extractable)│  │
│  └──────┬───────┘    └───────┬───────┘    └──────────────────┘  │
│         │                    │                                   │
│         │ code exchange      │ encrypted tokens                  │
│         ▼                    ▼                                   │
│  ┌──────────────┐    ┌───────────────┐    ┌──────────────────┐  │
│  │ Proxy Gateway │    │  Yjs Y.Map    │    │  localStorage    │  │
│  │ (HTTPS)       │    │ "connectors"  │    │  (IVs only)      │  │
│  └──────────────┘    │ encryptedToken │    └──────────────────┘  │
│                      │ encryptedRefr. │                          │
│                      └───────┬───────┘                          │
│                              │                                   │
│         ┌────────────────────┼────────────────────┐              │
│         ▼                    ▼                    ▼              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │ SyncEngine   │    │ Tool Service  │    │ fetchWithAuth│       │
│  │ (delta sync) │    │ (LLM agents)  │    │ (API calls)  │       │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘       │
│         │                   │                    │               │
│         ▼                   ▼                    ▼               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │            Yjs Y.Map "knowledge" — PLAINTEXT             │   │
│  │   (emails, files, calendar events, pages, etc.)          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼ (if P2P sync enabled)             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │        EncryptedWebSocket (AES-GCM-256 per message)      │   │
│  │   password + roomId → PBKDF2 (210K iter) → AES key       │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
└──────────────────────────────┼───────────────────────────────────┘
                               │ encrypted Yjs updates
                               ▼
                   ┌──────────────────────┐
                   │   Signaling Server    │
                   │  wss://signal.devs.new│
                   │  (sees ciphertext     │
                   │   only)               │
                   └──────────────────────┘
```

---

## 3. Credential Encryption (OAuth Tokens & API Keys)

### 3.1 Algorithm Details

| Parameter | Value |
|-----------|-------|
| Algorithm | AES-GCM |
| Key size | 256 bits |
| IV size | 96 bits (12 bytes), randomly generated per encryption |
| Key storage | IndexedDB `cryptoKeys` object store |
| Key extractability | **Non-extractable** (`crypto.subtle.exportKey()` throws `DOMException`) |
| Authentication tag | 128 bits (AES-GCM default) |

### 3.2 Encryption Flow (Token Storage)

```
OAuth flow completes
        │
        ▼
SecureStorage.encryptCredential(plaintext_token)
        │
        ├─ Get active CryptoKey (local mode: from IndexedDB, sync mode: PBKDF2-derived)
        ├─ Generate random 12-byte IV via crypto.getRandomValues()
        ├─ crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext)
        │
        ▼
Returns { encrypted: base64(ciphertext), iv: base64(iv), salt: '' }
        │
        ├─ encrypted → Yjs connectors map (connector.encryptedToken)
        ├─ iv → localStorage (connector-{id}-iv)
        └─ Refresh token encrypted separately with its own IV
```

**Source:** [`src/lib/crypto/index.ts`](../src/lib/crypto/index.ts) — `SecureStorage.encryptCredential()` (line ~545), `encryptWithCryptoKey()` (line ~460)

### 3.3 Decryption Flow (API Call)

```
Tool/SyncEngine needs to call external API
        │
        ▼
BaseAppConnectorProvider.getDecryptedToken(connector)
        │
        ├─ Read connector.encryptedToken from Yjs connectors map
        ├─ Read IV from localStorage (connector-{id}-iv)
        │
        ▼
SecureStorage.decryptCredential(encrypted, iv, salt='')
        │
        ├─ Get active CryptoKey
        ├─ crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
        │
        ▼
Plaintext token → used in Authorization: Bearer header → discarded after call
```

**Source:** [`src/features/connectors/connector-provider.ts`](../src/features/connectors/connector-provider.ts) — `getDecryptedToken()` (line ~225)

### 3.4 Key Lifecycle

#### Local Mode (default)
- **Generation:** `crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])`
- **Storage:** IndexedDB `cryptoKeys` store, key ID `'master'`
- **Extraction:** Impossible — `extractable: false` is enforced at generation
- **Rotation:** Not currently implemented (see [Recommendations](#10-enhancement-recommendations))

#### Sync Mode (P2P enabled)
- **Derivation:** PBKDF2 with SHA-256, 250,000 iterations
- **Salt:** Fixed 16-byte value `DEVS-SYNC-SALT-V` (see [Gap #2](#92-medium-severity))
- **Purpose:** Same password produces the same key on any device for credential portability
- **Storage:** In-memory only (derived on each session from the password)

**Source:** [`src/lib/crypto/index.ts`](../src/lib/crypto/index.ts) — `deriveSyncKey()` (line ~305), `SYNC_SALT` (line ~148)

### 3.5 Legacy Migration

Credentials encrypted with the old password-based scheme (PBKDF2 + random salt) are auto-migrated to non-extractable keys on first access. The legacy `CryptoService` class is retained for backward compatibility during migration.

**Source:** [`src/lib/crypto/index.ts`](../src/lib/crypto/index.ts) — `migrateFromLegacyMasterKey()` (line ~220)

---

## 4. Data at Rest — Imported Connector Content

### 4.1 Current State: NOT ENCRYPTED

When a connector syncs data (via `SyncEngine` or tool calls), the content is normalized into `KnowledgeItem` objects and written directly to the Yjs `knowledge` map **in plaintext**:

```typescript
// Normalized KnowledgeItem written to Yjs — no encryption layer
{
  id: "ki_abc123",
  name: "Q4 Budget Review — email from CFO",
  content: "Hi team, attached is the Q4 budget...",  // ← PLAINTEXT
  mimeType: "text/plain",
  syncSource: "connector",
  connectorId: "connector-xyz",
  path: "/Gmail/Inbox",
  // ...
}
```

**This applies to ALL connector types:**

| Connector | Data Type | Encrypted at Rest? |
|-----------|-----------|-------------------|
| Gmail | Email bodies, subjects, metadata | ❌ No |
| Google Drive | File contents (text extraction) | ❌ No |
| Google Calendar | Event titles, descriptions, attendees | ❌ No |
| Google Tasks | Task titles, descriptions | ❌ No |
| Notion | Page content, database records | ❌ No |
| Slack | Messages, channel history | ❌ No |
| Dropbox | File contents | ❌ No |
| OneDrive | File contents | ❌ No |
| Outlook | Email bodies | ❌ No |
| Figma | File metadata | ❌ No |
| Qonto | Transaction data, bank statements | ❌ No |
| GitHub | Repository data | ❌ No |

**Source:** [`src/features/connectors/normalizer.ts`](../src/features/connectors/normalizer.ts), [`src/features/connectors/sync-engine.ts`](../src/features/connectors/sync-engine.ts)

### 4.2 Storage Layer

Content resides in:
1. **Yjs Y.Map** (`knowledge`) — in memory while app is running
2. **IndexedDB** — persisted automatically by `y-indexeddb`

IndexedDB is accessible to:
- The origin's JavaScript context (same-origin policy)
- Browser extensions with appropriate permissions
- Physical device access (unencrypted on disk)
- Browser DevTools (when the device is unlocked)

### 4.3 Risk Assessment

| Threat | Impact | Likelihood |
|--------|--------|------------|
| Malicious browser extension reads IndexedDB | Confidential emails/files exposed | Medium |
| Physical device access (stolen/shared laptop) | All imported data readable | Medium |
| XSS vulnerability in the app | Data exfiltration possible | Low (CSP mitigates) |
| Forensic analysis of browser storage | Plaintext discoverable on disk | Low |

---

## 5. Data in Transit — P2P Sync Encryption

### 5.1 E2E Encryption: IMPLEMENTED

When P2P sync is enabled, **all Yjs document updates** (including connector data) are encrypted before transmission:

#### Key Derivation
```
password + roomId → PBKDF2(SHA-256, 100K iterations) → AES-GCM-256 key
Salt: "devs-e2e:{roomId.length}:{roomId}"
```

#### Wire Format
```
[version: 1 byte] [iv: 12 bytes] [ciphertext: N bytes]
```

- Version byte: `0x01`
- IV: 12 bytes, randomly generated per message via `crypto.getRandomValues()`
- Ciphertext: AES-GCM encrypted Yjs update with 128-bit authentication tag
- Minimum payload size: 29 bytes (1 + 12 + 16 auth tag)

#### Room Name Derivation (Prevents Discovery)
```
password + roomId → PBKDF2(SHA-256, 100K iterations) → 256-bit hash → hex string
Salt: "devs-sync:{roomId.length}:{roomId}"
```

The signaling server (`wss://signal.devs.new`) only sees:
- A derived room name (opaque hex string, no relation to the original room ID)
- Encrypted binary payloads (undecryptable without the password)

**Source:**
- [`src/lib/yjs/crypto.ts`](../src/lib/yjs/crypto.ts) — `deriveEncryptionKey()`, `encryptUpdate()`, `decryptUpdate()`
- [`src/lib/yjs/encrypted-ws.ts`](../src/lib/yjs/encrypted-ws.ts) — `createEncryptedWebSocketClass()`
- [`src/features/sync/lib/sync-manager.ts`](../src/features/sync/lib/sync-manager.ts) — `enableSync()` (line ~143)
- [`src/lib/yjs/sync.ts`](../src/lib/yjs/sync.ts) — `enableSync()` (line ~200)

### 5.2 Implementation Verification

Both sync code paths (`src/lib/yjs/sync.ts` and `src/features/sync/lib/sync-manager.ts`) use `EncryptedWebSocket`. The implementation wraps the native `WebSocket` class:

```typescript
// From sync-manager.ts (line ~160)
const [effectiveRoom, encryptionKey] = await Promise.all([
  deriveRoomName(config.roomId, config.password),
  deriveEncryptionKey(config.password, config.roomId),
])
const EncryptedWS = createEncryptedWebSocketClass(encryptionKey)
wsProvider = new WebsocketProvider(serverUrl, effectiveRoom, ydoc, {
  WebSocketPolyfill: EncryptedWS,
})
```

### 5.3 Test Coverage

E2E encryption is covered by tests in [`src/test/lib/yjs/crypto.test.ts`](../src/test/lib/yjs/crypto.test.ts):
- Round-trip encrypt/decrypt
- Wrong-key rejection
- Corrupted data detection
- Cross-room key isolation
- Minimum payload validation

---

## 6. Tool Usage — LLM Agent Access to Connector Data

### 6.1 How Tools Access Connector Data

LLM agents access connector data via registered tool plugins in [`src/tools/plugins/connectors/`](../src/tools/plugins/connectors/). Available tools:

| Tool Plugin | Operations |
|-------------|-----------|
| `gmail.ts` | Search emails, read email, list labels, create draft |
| `drive.ts` | Search files, read file, list files |
| `calendar.ts` | List events, get event, search events |
| `tasks.ts` | List tasks, get task, list task lists |
| `notion.ts` | Search pages, read page, query database |
| `slack.ts` | Search messages, list channels, read channel |
| `outlook.ts` | Search emails, read email, list folders |
| `onedrive.ts` | Search files, read file, list files |
| `dropbox.ts` | Search files, read file, list files |
| `figma.ts` | List projects, get file, search files |
| `qonto.ts` | List accounts, list/get transactions, list/get statements |
| `google-chat.ts` | List spaces, read messages |
| `google-meet.ts` | List meetings, get meeting details |

### 6.2 Data Flow Through Tools

```
LLM Agent invokes tool (e.g., gmail_search)
        │
        ▼
Tool Plugin (src/tools/plugins/connectors/gmail.ts)
        │
        ▼
ConnectorToolService (src/features/connectors/tools/service.ts)
        │
        ├─ Finds active connector in Yjs connectors map
        ├─ Gets provider instance from ProviderRegistry
        │
        ▼
BaseAppConnectorProvider.fetchWithAuth(url)
        │
        ├─ Calls getDecryptedToken() → decrypts token in memory
        ├─ Sets Authorization: Bearer header
        ├─ Makes HTTPS request to external API
        ├─ Token discarded after use (not cached in plaintext)
        │
        ▼
Response returned to LLM agent as tool result (plaintext in conversation)
```

### 6.3 Security Properties of Tool Usage

| Property | Status |
|----------|--------|
| Token decrypted only when needed | ✅ Yes — decrypted per-call in `fetchWithAuth()` |
| Token transmitted over HTTPS only | ✅ Yes — all provider APIs use TLS |
| Token cached in plaintext | ❌ No — decrypted value is not persisted |
| API response encrypted before storage | ❌ No — if response is saved to knowledge base |
| Tool results in conversation history | ⚠️ Plaintext — stored in `conversations` Yjs map |

**Source:** [`src/features/connectors/tools/service.ts`](../src/features/connectors/tools/service.ts), [`src/features/connectors/connector-provider.ts`](../src/features/connectors/connector-provider.ts) — `fetchWithAuth()` (line ~330)

---

## 7. OAuth 2.0 Security

### 7.1 PKCE Implementation

All OAuth connectors use **Authorization Code Flow with PKCE** (Proof Key for Code Exchange):

| Parameter | Value |
|-----------|-------|
| Code verifier | 128 random bytes → Base64url (86 characters) |
| Code challenge method | S256 (SHA-256 hash of verifier → Base64url) |
| State parameter | Random UUID for CSRF protection |
| Code verifier storage | In-memory `Map` (ephemeral, cleared after use) |

**Source:** [`src/features/connectors/oauth-gateway.ts`](../src/features/connectors/oauth-gateway.ts) — `generateCodeVerifier()`, `generateCodeChallenge()`, `startOAuthFlow()`

### 7.2 Token Exchange

Token exchange happens server-side via the proxy gateway (`BRIDGE_URL`) for providers that require a client secret. The browser never sees the client secret:

```
Browser                    Proxy Gateway              Provider
  │                            │                         │
  ├─ POST /oauth/callback ────▶│                         │
  │   { code, code_verifier }  ├─ POST /token ──────────▶│
  │                            │   { code, secret,       │
  │                            │     code_verifier }     │
  │                            │◀── { access_token,  ────┤
  │◀── { access_token,    ────┤       refresh_token }    │
  │      refresh_token }       │                         │
  │                            │                         │
  ├─ encrypt(access_token) ──▶ localStorage + Yjs        │
  └─ encrypt(refresh_token) ─▶ localStorage + Yjs        │
```

### 7.3 Scope Configuration

Connectors request **minimum necessary scopes** (principle of least privilege):

- Gmail: `gmail.readonly` + `gmail.compose` (read + draft creation only)
- Google Drive: `drive.readonly`
- Google Calendar: `calendar.readonly`
- Notion: Scopes configured in Notion OAuth integration settings

**Source:** [`src/features/connectors/connector-provider.ts`](../src/features/connectors/connector-provider.ts) — `PROVIDER_SCOPES` (line ~55)

---

## 8. Cryptographic Inventory

### 8.1 All Algorithms Used

| Algorithm | Usage | Standard | Key Size |
|-----------|-------|----------|----------|
| **AES-GCM** | Credential encryption, Yjs E2E, Easy Setup | NIST SP 800-38D | 256 bits |
| **PBKDF2-SHA-256** | Key derivation (sync mode, Yjs E2E, room names) | NIST SP 800-132 | N/A |
| **SHA-256** | PKCE code challenge, content deduplication hashing | FIPS 180-4 | N/A |
| **CSPRNG** | IV generation, PKCE verifier, state params | Web Crypto API | N/A |

### 8.2 IV/Nonce Management

| Context | IV Source | IV Size | Reuse Risk |
|---------|-----------|---------|------------|
| Credential encryption | `crypto.getRandomValues()` | 12 bytes | Negligible (96-bit random) |
| Yjs E2E sync | `crypto.getRandomValues()` per message | 12 bytes | Negligible |
| Easy Setup | `crypto.getRandomValues()` | 12 bytes | Negligible |

### 8.3 PBKDF2 Iteration Counts

| Context | Iterations | Meets OWASP 2023? |
|---------|------------|-------------------|
| Sync credential key derivation | 250,000 | ✅ Yes (OWASP recommends ≥210,000 for SHA-256) |
| Yjs E2E encryption key | 100,000 | ⚠️ Below OWASP recommendation |
| Room name derivation | 100,000 | ⚠️ Below OWASP recommendation |
| Easy Setup encryption | 100,000 | ⚠️ Below OWASP recommendation |

### 8.4 Key Storage Locations

| Key Material | Storage | Protection |
|-------------|---------|------------|
| Local encryption key | IndexedDB `cryptoKeys` store | Non-extractable CryptoKey object |
| Sync encryption key | In-memory only | Derived from password each session |
| Yjs E2E key | In-memory only | Derived from password + roomId |
| Encryption IVs | localStorage | Not sensitive (public by design) |
| OAuth tokens (encrypted) | Yjs `connectors` map → IndexedDB | AES-GCM-256 ciphertext |

---

## 9. Identified Gaps & Risk Assessment

### 9.1 ~~Critical Severity~~ — RESOLVED

#### GAP-1: Imported Connector Content Not Encrypted at Rest — ✅ RESOLVED

**Status:** **RESOLVED** — Field-level AES-GCM-256 encryption implemented across all data stores.

**Original description:** Emails, files, calendar events, and other content imported via connectors were stored as plaintext in IndexedDB (via Yjs maps).

**Resolution details:**

A field-level content encryption service (`src/lib/crypto/content-encryption.ts`) now encrypts sensitive fields before writing to Yjs maps and decrypts on read. The implementation uses the same AES-GCM-256 non-extractable `CryptoKey` from `SecureStorage` that protects connector credentials.

**Encrypted entity fields:**

| Entity | Encrypted Fields | Store |
|--------|-----------------|-------|
| KnowledgeItem | `content`, `transcript`, `description` | `knowledgeStore` |
| Message (in Conversation) | `content` | `conversationStore` |
| Conversation | `summary` | `conversationStore` |
| AgentMemoryEntry | `content`, `title` | `agentMemoryStore` |

**Encryption format per field:**

```typescript
interface EncryptedField {
  ct: string  // AES-GCM ciphertext (base64)
  iv: string  // Random 12-byte IV (base64)
}
// Objects carry `_encrypted: true` flag for identification
```

**Backward compatibility:** Unencrypted (legacy) data passes through `decryptFields()` unchanged. Data is encrypted on next write — no bulk migration required.

**Test coverage:** 23 unit tests covering round-trip encryption, Unicode, large payloads (100 KB), corruption handling, backward compatibility, and entity simulations.

**Residual risk:** Full-text search over encrypted content is not possible — `searchConversations` skips encrypted message content (title search still works). A future encrypted search index could address this.

**Files changed:**
- [`src/lib/crypto/content-encryption.ts`](../src/lib/crypto/content-encryption.ts) — Core service
- [`src/stores/knowledgeStore.ts`](../src/stores/knowledgeStore.ts) — Knowledge encryption
- [`src/stores/conversationStore.ts`](../src/stores/conversationStore.ts) — Conversation/message encryption
- [`src/stores/agentMemoryStore.ts`](../src/stores/agentMemoryStore.ts) — Memory encryption
- [`src/hooks/useLive.ts`](../src/hooks/useLive.ts) — Decrypted data hooks
- [`src/test/lib/crypto/content-encryption.test.ts`](../src/test/lib/crypto/content-encryption.test.ts) — Tests

### 9.2 Medium Severity

#### GAP-2: Fixed PBKDF2 Salt for Sync Credential Key — ✅ RESOLVED

**Description:** `SecureStorage.deriveSyncKey()` uses a hardcoded 16-byte salt (`DEVS-SYNC-SALT-V`). This means two users with the same sync password produce the same credential-encryption key, regardless of room ID.

**Impact:** If a common password is used, an attacker could precompute rainbow tables targeting the fixed salt. The Yjs E2E encryption is **not affected** (uses room-specific salts).

**Source:** [`src/lib/crypto/index.ts`](../src/lib/crypto/index.ts)

**Resolution:** Replaced the fixed `SYNC_SALT` with `getSyncSalt(roomId?)` which produces a room-specific salt: `devs-sync-cred:{roomId.length}:{roomId}`. The legacy salt is retained as `LEGACY_SYNC_SALT` for backward compatibility. `deriveSyncKey()`, `enableSyncMode()`, and `restoreSyncMode()` now accept an optional `roomId` parameter. The `syncStore.enableSync()` passes the `roomId` through to `SecureStorage`.

#### GAP-3: PBKDF2 Iterations Below OWASP 2023 Recommendation — ✅ RESOLVED

**Description:** Yjs E2E encryption and room name derivation use 100,000 PBKDF2 iterations. OWASP 2023 recommends ≥210,000 iterations for PBKDF2-HMAC-SHA-256.

**Impact:** Reduces brute-force cost by approximately half compared to the recommended parameter.

**Source:** [`src/lib/yjs/crypto.ts`](../src/lib/yjs/crypto.ts), [`src/lib/yjs/sync.ts`](../src/lib/yjs/sync.ts), [`src/features/sync/lib/sync-manager.ts`](../src/features/sync/lib/sync-manager.ts)

**Resolution:** Updated `PBKDF2_ITERATIONS` from `100_000` to `210_000` in all three files that derive keys via PBKDF2. Now meets OWASP 2023 recommendation.

#### GAP-4: Encryption IVs in localStorage vs. Yjs — ✅ RESOLVED

**Description:** Connector token encryption IVs are stored in `localStorage` (keyed as `connector-{id}-iv`). In sync mode, a second device receives the encrypted token via Yjs but may lack the corresponding IV in its localStorage, causing decryption failures.

**Impact:** Cross-device connector usage may fail silently, forcing re-authentication.

**Source:** [`src/features/connectors/connector-provider.ts`](../src/features/connectors/connector-provider.ts), [`src/features/connectors/types.ts`](../src/features/connectors/types.ts)

**Resolution:** Added `tokenIv` and `refreshTokenIv` optional fields to the `Connector` interface. Updated `storeEncryptionMetadata()` to write IVs to the Yjs connector object (with lazy import to avoid circular deps). Updated `getDecryptedToken()` and `getDecryptedRefreshToken()` to read `connector.tokenIv` first, falling back to `localStorage` for migration. Updated `validateConnectorTokens` and `reEncryptAllCredentials` to read/write IVs from Yjs.

### 9.3 Low Severity

#### GAP-5: No Key Rotation Mechanism — ✅ RESOLVED

**Description:** The local AES-GCM key is generated once and never rotated. A compromised key (e.g., via a browser vulnerability that bypasses non-extractable protection) would affect all past and future encrypted credentials.

**Resolution:** Added `SecureStorage.rotateEncryptionKey()` method that: (1) generates a new non-extractable CryptoKey, (2) re-encrypts all credentials with the new key, (3) atomically swaps keys in IndexedDB, (4) logs the operation via `CryptoAuditLog`.

#### GAP-6: No Password Strength Enforcement for Sync — ✅ RESOLVED

**Description:** Sync mode security depends entirely on user-chosen password strength. No minimum length, complexity, or entropy requirements are enforced.

**Resolution:** Created `src/lib/crypto/password-strength.ts` with `evaluatePasswordStrength()` function that scores passwords 0-4 based on length (min 12 chars), character diversity, entropy estimation, and pattern detection. Integrated into `SyncPanel.tsx` — the Share button is disabled until the password meets the minimum score (≥2, "good"). Visual feedback shows strength level and input color.

#### GAP-7: No Audit Logging of Crypto Operations — ✅ RESOLVED

**Description:** No logging of encryption/decryption operations, failed attempts, or key usage. Makes forensic analysis of potential breaches difficult.

**Resolution:** Created `src/lib/crypto/audit-log.ts` with `CryptoAuditLog` class — an in-memory circular buffer (500 entries max) that logs 13 operation types with timestamps and optional metadata. Integrated into `SecureStorage.encryptCredential()`, `decryptCredential()`, `enableSyncMode()`, `disableSyncMode()`, `restoreSyncMode()`, and `rotateEncryptionKey()`. Includes `getEntries()`, `getFailures()`, and `export()` methods for forensic analysis. 11 unit tests in `src/test/lib/crypto/audit-log.test.ts`.

#### GAP-8: Legacy CryptoService Retained — ⚠️ MITIGATED

**Description:** The deprecated `CryptoService` class remains in the codebase as a fallback for migration. It uses PBKDF2 with random salt — less secure than non-extractable keys since the derived key is extractable.

**Source:** [`src/lib/crypto/index.ts`](../src/lib/crypto/index.ts)

**Mitigation:** `CryptoService` is now marked with `@deprecated` JSDoc annotation. Its `hashPassword()` method is still used by `SecureStorage.enableSyncMode` for password validation — this is acceptable since only the hash is stored, not the key. Full removal is deferred until the migration period has passed.

---

## 10. Enhancement Recommendations

### 10.1 ~~Priority 1 — Content Encryption at Rest (Addresses GAP-1)~~ ✅ IMPLEMENTED

**Status:** **IMPLEMENTED** — See §9.1 for full details.

Field-level AES-GCM-256 encryption is now applied to all sensitive content fields across knowledge items, conversation messages/summaries, and agent memories. The implementation reuses the existing `SecureStorage` `CryptoKey` infrastructure, supports backward compatibility with unencrypted data, and includes 23 unit tests.

### 10.2 ~~Priority 2 — Room-Specific Sync Credential Salt (Addresses GAP-2)~~ ✅ IMPLEMENTED

**Status:** **IMPLEMENTED** — See §9.2 GAP-2 for full details.

`getSyncSalt(roomId?)` produces room-specific salts: `devs-sync-cred:{roomId.length}:{roomId}`. Legacy salt retained for backward compatibility.

### 10.3 ~~Priority 3 — Increase PBKDF2 Iterations (Addresses GAP-3)~~ ✅ IMPLEMENTED

**Status:** **IMPLEMENTED** — See §9.2 GAP-3 for full details.

Updated from 100,000 to 210,000 iterations in `src/lib/yjs/crypto.ts`, `src/lib/yjs/sync.ts`, and `src/features/sync/lib/sync-manager.ts`.

### 10.4 ~~Priority 4 — Store IVs in Yjs (Addresses GAP-4)~~ ✅ IMPLEMENTED

**Status:** **IMPLEMENTED** — See §9.2 GAP-4 for full details.

Added `tokenIv` and `refreshTokenIv` fields to the `Connector` interface. IVs are now written to Yjs connector objects and read with localStorage fallback for migration.

### 10.5 ~~Priority 5 — Key Rotation (Addresses GAP-5)~~ ✅ IMPLEMENTED

**Status:** **IMPLEMENTED** — See §9.3 GAP-5 for full details.

Added `SecureStorage.rotateEncryptionKey()` method with full credential re-encryption and audit logging.

### 10.6 ~~Priority 6 — Password Strength Enforcement (Addresses GAP-6)~~ ✅ IMPLEMENTED

**Status:** **IMPLEMENTED** — See §9.3 GAP-6 for full details.

Created `src/lib/crypto/password-strength.ts` with entropy-based scoring. Integrated in `SyncPanel.tsx` with visual feedback and disabled Share button below score threshold. 16 unit tests in `src/test/lib/crypto/password-strength.test.ts`.

### 10.7 Priority 7 — Remove Legacy CryptoService (Addresses GAP-8) — ⚠️ MITIGATED

**Status:** **MITIGATED** — `CryptoService` marked `@deprecated`. Full removal deferred until migration period ends. See §9.3 GAP-8.

---

## 11. Source Code References

| Component | File | Key Functions |
|-----------|------|---------------|
| Credential encryption | [`src/lib/crypto/index.ts`](../src/lib/crypto/index.ts) | `SecureStorage.encryptCredential()`, `decryptCredential()`, `deriveSyncKey()`, `rotateEncryptionKey()` |
| **Content encryption** | [`src/lib/crypto/content-encryption.ts`](../src/lib/crypto/content-encryption.ts) | `encryptField()`, `decryptField()`, `encryptFields()`, `decryptFields()`, `isEncryptedField()` |
| **Audit logging** | [`src/lib/crypto/audit-log.ts`](../src/lib/crypto/audit-log.ts) | `CryptoAuditLog.log()`, `getEntries()`, `getFailures()`, `export()` |
| **Password strength** | [`src/lib/crypto/password-strength.ts`](../src/lib/crypto/password-strength.ts) | `evaluatePasswordStrength()`, `estimateEntropy()` |
| Yjs E2E encryption | [`src/lib/yjs/crypto.ts`](../src/lib/yjs/crypto.ts) | `deriveEncryptionKey()`, `encryptUpdate()`, `decryptUpdate()` |
| Encrypted WebSocket | [`src/lib/yjs/encrypted-ws.ts`](../src/lib/yjs/encrypted-ws.ts) | `createEncryptedWebSocketClass()` |
| P2P sync (feature) | [`src/features/sync/lib/sync-manager.ts`](../src/features/sync/lib/sync-manager.ts) | `enableSync()`, `deriveRoomName()` |
| P2P sync (lib) | [`src/lib/yjs/sync.ts`](../src/lib/yjs/sync.ts) | `enableSync()`, `deriveRoomName()` |
| Connector base class | [`src/features/connectors/connector-provider.ts`](../src/features/connectors/connector-provider.ts) | `getDecryptedToken()`, `fetchWithAuth()`, `refreshAndSaveToken()` |
| OAuth PKCE | [`src/features/connectors/oauth-gateway.ts`](../src/features/connectors/oauth-gateway.ts) | `startOAuthFlow()`, `generateCodeVerifier()`, `generateCodeChallenge()` |
| Sync engine | [`src/features/connectors/sync-engine.ts`](../src/features/connectors/sync-engine.ts) | `sync()`, `processChanges()` |
| Content normalizer | [`src/features/connectors/normalizer.ts`](../src/features/connectors/normalizer.ts) | `normalizeToKnowledgeItem()` |
| Connector store | [`src/features/connectors/stores/connectorStore.ts`](../src/features/connectors/stores/connectorStore.ts) | `refreshToken()`, `validateTokens()` |
| Tool service | [`src/features/connectors/tools/service.ts`](../src/features/connectors/tools/service.ts) | All tool operation implementations |
| IndexedDB schema | [`src/lib/db/index.ts`](../src/lib/db/index.ts) | `cryptoKeys` object store definition |
| Crypto tests | [`src/test/lib/crypto.test.ts`](../src/test/lib/crypto.test.ts) | SecureStorage unit tests |
| Audit log tests | [`src/test/lib/crypto/audit-log.test.ts`](../src/test/lib/crypto/audit-log.test.ts) | CryptoAuditLog unit tests (11 tests) |
| Password strength tests | [`src/test/lib/crypto/password-strength.test.ts`](../src/test/lib/crypto/password-strength.test.ts) | Password strength unit tests (16 tests) |
| E2E crypto tests | [`src/test/lib/yjs/crypto.test.ts`](../src/test/lib/yjs/crypto.test.ts) | Yjs encryption unit tests |
| Content encryption tests | [`src/test/lib/crypto/content-encryption.test.ts`](../src/test/lib/crypto/content-encryption.test.ts) | Content-at-rest encryption unit tests (23 tests) |
| Security documentation | [`docs/SECURITY.md`](SECURITY.md) | Full security architecture documentation |

---

*Document generated for security audit purposes. All code references are relative to the repository root.*
