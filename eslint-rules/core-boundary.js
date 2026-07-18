/**
 * Custom ESLint plugin: core-boundary
 *
 * Guards the core/optional and facade boundaries of the "Always-Green
 * Strangler" re-platform (REPORT §2.2, §3.2, Phase 0 task "Identify & harden
 * the facades + the core/optional boundary").
 *
 * Two rules:
 *
 *  1. `no-enterprise-in-core` — the core browser bundle must never import
 *     enterprise (`ee/`) control-plane code. Enterprise is a seam that lives on
 *     the far side of a signed policy, never in core (REPORT §2.2 hard rule).
 *
 *  2. `no-facade-bypass` — callers must reach a strangled subsystem only through
 *     its stable facade, never by importing an implementation directly. Today
 *     this forbids importing concrete LLM providers (`@/lib/llm/providers/*`)
 *     from anywhere except the `LLMService` facade itself. A small, explicit
 *     `allow` list grandfathers pre-existing debt so `main` stays green while
 *     new violations are blocked.
 *
 * The broader core→optional *feature* boundary (connectors, marketplace) carries
 * substantial pre-existing coupling and is enforced by the deterministic
 * `scripts/check-boundaries.mjs` burn-down gate instead, so this lint rule can
 * stay at `error` with zero false positives.
 */

// ─── helpers ────────────────────────────────────────────────────────────────

/** Normalise a filename to forward slashes for stable matching. */
function normalise(filename) {
  return String(filename).replace(/\\/g, '/')
}

/** True when the current file is test/spec/fixture code (exempt from bans). */
function isTestFile(filename) {
  const f = normalise(filename)
  return (
    f.includes('/src/test/') ||
    /\.(test|spec)\.(ts|tsx)$/.test(f) ||
    f.includes('/__tests__/')
  )
}

function importSource(node) {
  return node.source && typeof node.source.value === 'string'
    ? node.source.value
    : null
}

// ─── rule: no-enterprise-in-core ────────────────────────────────────────────

const noEnterpriseInCore = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Core must not import enterprise (ee/) control-plane modules.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          patterns: { type: 'array', items: { type: 'string' } },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      forbidden:
        'Core must not import enterprise module "{{source}}". Enterprise code lives in ee/ behind a signed policy, never in the core bundle (REPORT §2.2).',
    },
  },
  create(context) {
    const opts = context.options[0] || {}
    const patterns = (opts.patterns || ['@/ee', '@ee', 'ee']).map(String)
    // Match only as a module prefix (`p` or `p/...`), never as a substring,
    // so paths like "coffee/" never false-positive on the "ee" pattern.
    const matches = (src) =>
      patterns.some((p) => src === p || src.startsWith(`${p}/`))
    return {
      ImportDeclaration(node) {
        const src = importSource(node)
        if (!src) return
        if (matches(src)) {
          context.report({
            node: node.source,
            messageId: 'forbidden',
            data: { source: src },
          })
        }
      },
    }
  },
}

// ─── rule: no-facade-bypass ─────────────────────────────────────────────────

const noFacadeBypass = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Reach strangled subsystems through their facade, not a concrete implementation.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          facades: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                forbidden: { type: 'string' },
                via: { type: 'string' },
                ownerDir: { type: 'string' },
              },
              required: ['forbidden', 'via'],
              additionalProperties: false,
            },
          },
          allow: { type: 'array', items: { type: 'string' } },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      bypass:
        'Import "{{source}}" bypasses the {{via}} facade. Use {{via}} instead (REPORT §3.2). If this is grandfathered debt, add it to the rule allow-list.',
    },
  },
  create(context) {
    const opts = context.options[0] || {}
    const facades = opts.facades || []
    const allow = (opts.allow || []).map(normalise)
    const filename = normalise(context.getFilename())

    if (isTestFile(filename)) return {}
    if (allow.some((a) => filename.endsWith(a))) return {}

    return {
      ImportDeclaration(node) {
        const src = importSource(node)
        if (!src) return
        for (const facade of facades) {
          const owner = facade.ownerDir ? normalise(facade.ownerDir) : null
          // The facade's own implementation files may import implementations.
          if (owner && filename.includes(owner)) continue
          if (src === facade.forbidden || src.startsWith(`${facade.forbidden}/`)) {
            context.report({
              node: node.source,
              messageId: 'bypass',
              data: { source: src, via: facade.via },
            })
          }
        }
      },
    }
  },
}

// ─── plugin export ──────────────────────────────────────────────────────────

export default {
  meta: {
    name: 'eslint-plugin-core-boundary',
    version: '1.0.0',
  },
  rules: {
    'no-enterprise-in-core': noEnterpriseInCore,
    'no-facade-bypass': noFacadeBypass,
  },
}
