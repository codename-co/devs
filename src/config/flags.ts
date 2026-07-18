/**
 * DEVS feature-flag & config seam — the single typed source of truth for the
 * re-platform's "Always-Green Strangler" flags (REPORT §3.5) and the target of
 * the enterprise layered-settings model (REPORT §5B).
 *
 * Two jobs, one module:
 *  1. Expose every re-platform flag app-wide, all defaulting to `legacy`/`off`.
 *     Flipping a flag changes *no behaviour* until a new implementation is wired
 *     behind the corresponding facade — Phase 0 ships the seam, not the engines.
 *  2. Be the resolution target for the enterprise policy tiers, with an
 *     un-overridable Managed tier (precedence: Managed > override > Local >
 *     Project > User > default).
 *
 * This module is CORE and inert-for-individuals: with no policy present it is a
 * pure no-op that returns {@link DEFAULT_FLAGS}. It must never import an
 * optional/enterprise module (enforced by the core-boundary lint rule).
 */

// ─── Flag value types ───────────────────────────────────────────────────────

/**
 * LLM provider facade backend (Phase 3). Historical: standard providers are now
 * backed by the AI SDK unconditionally (the hand-rolled layer was deleted), so
 * this flag no longer selects a backend. Retained as part of the generic config
 * seam; `'fetch'` remains reserved for a possible minimal-adapter fallback.
 */
export type LlmEngine = 'legacy' | 'ai-sdk' | 'fetch'

/** Orchestration strategy (Phase 2). `simple` = enclave two-step. */
export type OrchestratorMode = 'legacy' | 'simple' | 'advanced'

/** Tool transport (Phase 4). MCP is an *optional* transport, never required. */
export type ToolTransport = 'builtin' | 'mcp'

/** DEVS Harness workspace backing store (Phase 5A). */
export type HarnessWorkspace = 'memory' | 'opfs'

/** Simple on/off toggle. */
export type Toggle = 'off' | 'on'

/** Budget & cost governance (Phase 5B). */
export type BudgetMode = 'off' | 'soft-cap' | 'hard-cap'

/**
 * The complete, typed set of re-platform flags. Every field is a string-literal
 * union (never a bare boolean) so a signed policy can lock it to an exact value.
 */
export interface FeatureFlags {
  engine: {
    /** Backend for the `LLMService` facade. */
    llm: LlmEngine
  }
  orchestrator: {
    /** Orchestration strategy. */
    mode: OrchestratorMode
  }
  tools: {
    /** Transport behind the tool facade. */
    transport: ToolTransport
  }
  harness: {
    /** Virtual-workspace backing store. */
    workspace: HarnessWorkspace
    /** Client-side old-turn compaction. */
    compaction: Toggle
  }
  governance: {
    /** Per-task/per-user token+cost ceiling behaviour. */
    budget: BudgetMode
  }
}

/**
 * Every flag defaults to the *legacy/off* path. The re-platform flips these one
 * unit at a time, each behind a proven parity gate. Do not change a default
 * until the corresponding phase's DELETE slice has landed and soaked.
 */
export const DEFAULT_FLAGS: FeatureFlags = {
  engine: { llm: 'legacy' },
  orchestrator: { mode: 'legacy' },
  tools: { transport: 'builtin' },
  harness: { workspace: 'memory', compaction: 'off' },
  governance: { budget: 'off' },
}

// ─── Enterprise tier resolution (REPORT §5B) ────────────────────────────────

/**
 * Policy tiers, highest precedence first. `managed` cannot be overridden by any
 * lower tier. `default` ({@link DEFAULT_FLAGS}) is the implicit lowest tier.
 */
export type FlagTier =
  | 'managed'
  | 'override'
  | 'local'
  | 'project'
  | 'user'
  | 'default'

/** Precedence order, highest → lowest (excluding the implicit `default`). */
export const TIER_PRECEDENCE: readonly FlagTier[] = [
  'managed',
  'override',
  'local',
  'project',
  'user',
] as const

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K]
}

/** A partial set of flag overrides supplied by one tier. */
export type FlagLayer = DeepPartial<FeatureFlags>

/** The winning tier for every resolved leaf, keyed by dotted path. */
export type FlagSources = Record<string, FlagTier>

export interface ResolvedFlags {
  /** Fully-resolved flags after tier precedence is applied. */
  flags: FeatureFlags
  /** For each dotted leaf path, the tier whose value won. */
  sources: FlagSources
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/**
 * Resolve flags by applying tiers in precedence order. Higher-precedence tiers
 * win per-leaf; the Managed tier therefore always wins because it is highest.
 * Leaves not set by any tier fall back to {@link DEFAULT_FLAGS} (tier
 * `default`). The returned {@link ResolvedFlags.sources} records the winning
 * tier for every leaf, so the UI can show *why* a flag is locked.
 *
 * Note: scalar resolution only. Permission-rule *merging* across tiers
 * (REPORT §5B) is a Phase-5B concern and intentionally out of scope here.
 */
export function resolveFlags(
  layers: Partial<Record<FlagTier, FlagLayer>>,
): ResolvedFlags {
  const sources: FlagSources = {}

  // Apply from lowest to highest precedence so the highest wins the assignment.
  const order: FlagTier[] = [
    'default',
    'user',
    'project',
    'local',
    'override',
    'managed',
  ]

  const merge = (
    target: Record<string, unknown>,
    source: Record<string, unknown>,
    tier: FlagTier,
    path: string,
  ): void => {
    for (const key of Object.keys(source)) {
      const value = source[key]
      const nextPath = path ? `${path}.${key}` : key
      if (isPlainObject(value)) {
        if (!isPlainObject(target[key])) target[key] = {}
        merge(target[key] as Record<string, unknown>, value, tier, nextPath)
      } else if (value !== undefined) {
        target[key] = value
        sources[nextPath] = tier
      }
    }
  }

  const flags = structuredCloneFlags(DEFAULT_FLAGS)
  for (const tier of order) {
    const layer = tier === 'default' ? DEFAULT_FLAGS : layers[tier]
    if (layer) merge(flags as unknown as Record<string, unknown>, layer, tier, '')
  }

  return { flags, sources }
}

function structuredCloneFlags(flags: FeatureFlags): FeatureFlags {
  return {
    engine: { ...flags.engine },
    orchestrator: { ...flags.orchestrator },
    tools: { ...flags.tools },
    harness: { ...flags.harness },
    governance: { ...flags.governance },
  }
}

// ─── App-wide accessor ──────────────────────────────────────────────────────

let current: ResolvedFlags = {
  flags: structuredCloneFlags(DEFAULT_FLAGS),
  sources: {},
}

/**
 * Install a resolved flag snapshot (e.g. after a signed boot policy is verified
 * and resolved via {@link resolveFlags}). Individuals never call this — they get
 * {@link DEFAULT_FLAGS}.
 */
export function configureFlags(resolved: ResolvedFlags): void {
  current = resolved
}

/** Read the current, fully-resolved flags. Never throws. */
export function getFlags(): FeatureFlags {
  return current.flags
}

/** Read the winning tier for a dotted leaf path (e.g. `engine.llm`). */
export function getFlagSource(path: string): FlagTier {
  return current.sources[path] ?? 'default'
}

/** True if a leaf is locked by the un-overridable Managed tier. */
export function isManaged(path: string): boolean {
  return getFlagSource(path) === 'managed'
}

/** Reset to defaults — test-only convenience. */
export function resetFlags(): void {
  current = { flags: structuredCloneFlags(DEFAULT_FLAGS), sources: {} }
}
