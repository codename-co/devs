# CORS Proxy

DEVS includes a privacy-first CORS proxy that enables fetching external resources that don't support cross-origin requests from the browser.

## Overview

Many external APIs (like arXiv) don't include CORS headers, making them inaccessible directly from browser-based applications. The CORS proxy acts as a pass-through service that:

1. Receives requests from the DEVS application
2. Fetches the requested resource server-side
3. Returns the response with appropriate CORS headers

## Privacy Policy

**The proxy is designed with strict privacy requirements:**

| Requirement    | Description                                         |
| -------------- | --------------------------------------------------- |
| ❌ No logging  | No request URLs, origins, or user data are recorded |
| ❌ No metrics  | No analytics that could identify user behavior      |
| ❌ No storage  | No persistent storage of any request data           |
| ❌ No tracking | No third-party services or monitoring               |

The proxy operates as a **pure pass-through with zero knowledge** of:

- What URLs users are fetching
- Who is making requests
- When requests are made
- How often resources are accessed

### Enforcement

Privacy is enforced through automated checks:

```bash
cd utils/devs-proxy
npm run lint:privacy
```

This command fails if any logging statements are detected in the code.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  DEVS Browser   │────▶│   CORS Proxy    │────▶│  External API   │
│   Application   │◀────│    Service      │◀────│   (e.g. arXiv)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Development

In development, the Vite dev server includes a built-in proxy plugin:

- **Endpoint**: `/api/proxy?url=...`
- **Plugin**: [src/lib/cors-proxy-plugin.ts](../src/lib/cors-proxy-plugin.ts)

### Production

In production, requests are routed to a dedicated proxy service:

- **Endpoint**: `https://proxy.devs.new/api/proxy?url=...`
- **Service**: [utils/devs-proxy/](../utils/devs-proxy/)

## Usage

### Client-Side API

Use the `fetchViaCorsProxy` helper from `@/lib/url`:

```typescript
import { fetchViaCorsProxy } from '@/lib/url'

// Fetch an external resource through the proxy
const response = await fetchViaCorsProxy(
  'https://export.arxiv.org/api/query?id=2301.07041',
)
const data = await response.text()
```

The helper automatically:

- Detects the environment (development vs production)
- Routes to the appropriate proxy endpoint
- Handles errors appropriately

### Direct API

```bash
# Development
curl "http://localhost:3000/api/proxy?url=https://example.com"

# Production
curl "https://proxy.devs.new/api/proxy?url=https://example.com"
```

**Parameters:**

| Parameter | Required | Description                            |
| --------- | -------- | -------------------------------------- |
| `url`     | Yes      | The URL to fetch (must be URL-encoded) |

**Response:** The proxied content with CORS headers added.

## Security

### Origin Validation

The proxy only accepts requests from allowed origins:

| Origin               | Environment |
| -------------------- | ----------- |
| `https://devs.new`   | Production  |
| `http://localhost:*` | Development |
| `http://127.0.0.1:*` | Development |

Requests from other origins receive a `403 Forbidden` response.

### No Credential Forwarding

The proxy does not forward:

- Cookies
- Authorization headers
- Any user credentials

This ensures it can only access publicly available resources.

## Deployment

### Docker

```bash
cd utils/devs-proxy
docker build -t devs-proxy .
docker run -p 3001:3001 devs-proxy
```

### Environment Variables

| Variable | Default   | Description  |
| -------- | --------- | ------------ |
| `HOST`   | `0.0.0.0` | Bind address |
| `PORT`   | `3001`    | Listen port  |

## Current Integrations

The following DEVS features use the CORS proxy:

| Feature        | Use Case                                   |
| -------------- | ------------------------------------------ |
| **arXiv Tool** | Fetching paper metadata and search results |

## Adding New Integrations

To use the proxy for a new external API:

```typescript
import { fetchViaCorsProxy } from '@/lib/url'

async function fetchExternalData(url: string) {
  const response = await fetchViaCorsProxy(url)
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`)
  }
  return response.json()
}
```

## Limitations

1. **GET requests only** - The proxy currently only supports GET requests
2. **Public resources** - Cannot access authenticated endpoints
3. **Size limits** - Large responses may timeout (30 second limit)
4. **Rate limiting** - No built-in rate limiting (relies on origin validation)
