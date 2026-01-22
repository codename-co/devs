# DEVS CORS Proxy Server

A lightweight, **zero-logging** CORS proxy service for fetching external resources from the DEVS platform.

## Privacy Policy

**This service is designed with strict privacy requirements:**

- ❌ NO logging of any kind
- ❌ NO request URLs, origins, or user data recorded
- ❌ NO metrics that could identify user behavior
- ❌ NO third-party analytics or monitoring
- ❌ NO persistent storage of request data

The proxy operates as a pure pass-through with zero knowledge of user activity.

### Enforcement

Run the privacy lint check before deploying:

```bash
npm run lint:privacy
```

This will fail if any logging statements are found in the code.

## Features

- **Origin validation**: Only accepts requests from `devs.new` (production) or `localhost` (development)
- **Zero dependencies**: Uses only Node.js built-in modules
- **Docker-ready**: Includes Dockerfile for easy deployment

## Usage

### Development

```bash
npm install
npm start
```

### Docker

```bash
docker build -t devs-proxy .
docker run -p 3001:3001 devs-proxy
```

### API

**Endpoint**: `GET /api/proxy`

**Parameters**:

- `url` (required): The URL to fetch

**Example**:

```bash
curl "http://localhost:3001/api/proxy?url=https://example.com"
```

**Response**: The proxied content with appropriate CORS headers.

## Environment Variables

| Variable | Default   | Description  |
| -------- | --------- | ------------ |
| `HOST`   | `0.0.0.0` | Bind address |
| `PORT`   | `3001`    | Listen port  |

## Security

The proxy validates the `Origin` header and only allows requests from:

- `https://devs.new` (production)
- `http://localhost:*` (development)
- `http://127.0.0.1:*` (development)

Requests without an `Origin` header are allowed (for health checks, curl, etc.).
