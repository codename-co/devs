# devs-search

Self-hosted [SearXNG](https://github.com/searxng/searxng) instance powering the `web_search` tool in DEVS.

## Architecture

```
Browser → proxy.devs.new/api/search/search?q=...&format=json
                ↓ (CORS handled by devs-proxy)
         devs-proxy → http://devs-search:8080/search?q=...
                         (same Docker network, internal)
```

`devs-search` is the canonical Docker hostname: it is the SearXNG
`container_name` and the default `SEARXNG_URL` used by `devs-proxy`. The
`searxng` network alias is kept only for backwards-compatible older proxy
deployments.

In development:
```
Browser → localhost:3000/api/search/search?q=...&format=json
                ↓ (Vite proxy)
         localhost:8888/search?q=...
```

## Quick Start (local dev)

```bash
docker compose -f compose.yaml -f compose.local.yaml up -d
```

SearXNG runs on `http://localhost:8888`. The Vite dev server proxies `/api/search` to it.

`compose.local.yaml` is deliberately **not** named `compose.override.yaml`: Compose
auto-loads that filename, so a stale copy on the production host would silently
move SearXNG onto a local-only network. Requiring an explicit `-f` makes that
class of outage impossible. Plain `docker compose up -d` uses the production
network and will fail locally unless `external` exists.

## Production

Deploy on the same Docker network as `devs-proxy`:

```bash
make search-deploy
```

The proxy server (`proxy.devs.new`) rebuilds each request as
`http://devs-search:8080/search` from an allow-list of query parameters
(`q`, `format`, `language`, `pageno`, `time_range`, `categories`, `safesearch`)
and forces `format=json`. The incoming path is discarded, so the HTML UI is
never reachable from the internet and the endpoint cannot be pointed at another
host. Requests without an allowed `Origin` header are rejected with 403.

Set a real secret before the first deploy — create a `.env` next to
`compose.yaml`. It is git-ignored; `make search-sync` copies it to the server
when present and protects any existing server copy from `--delete`:

```bash
echo "SEARXNG_SECRET=$(openssl rand -hex 32)" > utils/devs-search/.env
```

`compose.local.yaml` is local-only and is excluded from `make search-sync`.

## Configuration in DEVS

The `web_search` tool defaults to `https://proxy.devs.new/api/search` in production, `/api/search` in dev. Users can override with `searxngInstanceUrl` in settings.

SearXNG is the primary source, and the DuckDuckGo Lite fallback through the existing CORS proxy (`/api/proxy`) is best-effort only. DuckDuckGo challenges automated requests from shared or datacenter IPs; in testing, every request through the shared proxy returned a challenge page with HTTP 202 instead of results. Public SearXNG instances and Mojeek were also all rate-limited or CAPTCHA-gated. A working self-hosted SearXNG is therefore the only dependable source, and the fallback must not be relied upon in production.

## Troubleshooting

If `https://proxy.devs.new/health` returns 200 but
`https://proxy.devs.new/api/search/search?q=test` returns HTTP 500
`{"error":"Search unavailable"}`, `devs-proxy` is running but cannot reach the
SearXNG backend.

Remediate in this order:

1. Run `make search-deploy` from the repo root to sync and start SearXNG.
2. Run `utils/devs-search/diagnose.sh` to inspect containers, shared-network
   membership, aliases, and DNS/HTTP reachability from the proxy container.
3. Run `utils/devs-search/smoke-test.sh` to verify the public endpoint.

Common causes, most likely first:

- **A stale `compose.override.yaml` on the server.** This is the cause of the
  outage observed on 2026-09-20. Compose auto-loads that filename, and older
  copies of it redefined `external` as `name: devs-search-local, external: false`.
  SearXNG then starts perfectly — healthy container, clean logs, listening on
  8080 — but on a *different, local-only* network, so `devs-proxy` gets
  `EAI_AGAIN` for every hostname. It is easy to miss because nothing looks
  broken on the SearXNG side. Worse, `rsync --exclude` also protects a file from
  `--delete`, so once the file landed on the server no amount of
  `make search-deploy` would remove it. The local file is now named
  `compose.local.yaml` (not auto-loaded) and `search-sync` actively deletes any
  legacy `compose.override.yaml` from the server. To fix an already-affected
  host:

  ```bash
  ssh minicloud "rm -f /apps/devs/search/compose.override.yaml"
  make search-deploy
  docker network inspect external --format '{{range .Containers}}{{.Name}}
  {{end}}' | grep devs-search   # must now list devs-search
  ```

- The shared Docker network `external` does not exist on the host. It is
  declared `external: true`, so `docker-compose up` fails outright if the host
  has not created it.
- The `devs-search` container has not joined the `external` network, so
  `http://devs-search:8080` cannot resolve from `devs-proxy`.
- `utils/devs-search/.env` is missing or does not define `SEARXNG_SECRET`.

Diagnostic tell: `diagnose.sh` section 2 lists the members of `external`. If
`devs-search` is absent from that list while section 1 shows it `Up`, the
container is running on the wrong network — go straight to the first cause
above. Section 4 will show `EAI_AGAIN` for both `devs-search` and `searxng`,
which is a DNS failure (wrong network), not a connection refusal (wrong port).

To verify DNS from inside the proxy container:

```bash
PROXY=$(docker ps --format '{{.Names}}' | grep -i proxy | head -1)
docker exec "$PROXY" node -e "require('node:dns').lookup('devs-search', (err, address) => { if (err) throw err; console.log(address) })"
docker exec "$PROXY" node -e "fetch('http://devs-search:8080/search?q=ping&format=json').then(r => console.log(r.status)).catch(e => { throw e })"
```

## Engine reliability

Public engines rate-limit and CAPTCHA a single self-hosted IP. In testing,
`startpage` and `brave` intermittently return CAPTCHA / "too many requests"
while the remaining engines still yield ~10 usable results. Check
`unresponsive_engines` in the JSON response when results degrade; the tool
surfaces a `Search engine error` when SearXNG returns no results at all.
