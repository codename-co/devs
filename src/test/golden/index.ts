/**
 * Golden-fixture harness — the safety net that licenses deletion in the
 * "Always-Green Strangler" methodology (REPORT §3.3–§3.4).
 *
 * Before a subsystem is strangled, its *current* outputs — LLM stream parts,
 * tool-call sequences, UIMessage streams — are recorded here as golden
 * fixtures. Parity tests then replay them against the new implementation and
 * assert equivalence. The fixture is the contract:
 *
 *   Never edit a fixture to make a test pass. Regenerating a fixture is an
 *   explicit, reviewed decision (RECORD step), never a way to force GREEN.
 *
 * Recording is opt-in via the `UPDATE_GOLDEN=1` environment variable so a
 * normal `npm run test:run` can never silently overwrite the contract.
 *
 * Usage:
 *   // characterization: capture the current engine's output once
 *   //   UPDATE_GOLDEN=1 npm run test:run
 *   const parts = await collect(currentEngine.stream(prompt))
 *   await assertMatchesGolden('llm/openai-basic-stream', parts)
 */

import { promises as fs } from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect } from 'vitest'

const HERE = path.dirname(fileURLToPath(import.meta.url))

/** Root directory for recorded golden fixtures. */
export const GOLDEN_ROOT = path.resolve(HERE, '..', 'fixtures', 'golden')

/** True when the run is allowed to (re)record fixtures. */
export function isRecording(): boolean {
  return process.env.UPDATE_GOLDEN === '1'
}

function fixturePath(name: string): string {
  // `name` is a logical id like `llm/openai-basic-stream`; store as JSON.
  const safe = name.endsWith('.json') ? name : `${name}.json`
  return path.join(GOLDEN_ROOT, safe)
}

/**
 * Deterministic JSON serialisation: object keys are sorted so structurally
 * equal payloads produce byte-identical fixtures regardless of key order.
 */
export function stableStringify(value: unknown): string {
  const seen = new WeakSet<object>()
  const normalise = (v: unknown): unknown => {
    if (v === null || typeof v !== 'object') return v
    if (seen.has(v as object)) throw new Error('circular reference in fixture')
    seen.add(v as object)
    if (Array.isArray(v)) return v.map(normalise)
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(v as Record<string, unknown>).sort()) {
      out[key] = normalise((v as Record<string, unknown>)[key])
    }
    return out
  }
  return JSON.stringify(normalise(value), null, 2)
}

/** Read a recorded fixture, or `undefined` if it has never been recorded. */
export async function loadGolden<T = unknown>(
  name: string,
): Promise<T | undefined> {
  try {
    const raw = await fs.readFile(fixturePath(name), 'utf-8')
    return JSON.parse(raw) as T
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return undefined
    throw err
  }
}

/** Write (or overwrite) a fixture. Only callable while recording. */
export async function recordGolden(name: string, data: unknown): Promise<void> {
  if (!isRecording()) {
    throw new Error(
      `refusing to write golden "${name}" without UPDATE_GOLDEN=1 — ` +
        `fixtures are the contract, not test scratch space`,
    )
  }
  const file = fixturePath(name)
  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(file, `${stableStringify(data)}\n`, 'utf-8')
}

/**
 * Core parity assertion. In `UPDATE_GOLDEN=1` mode it records `actual` and
 * passes (characterization). Otherwise it asserts `actual` matches the recorded
 * fixture byte-for-byte after stable serialisation. A missing fixture in
 * non-recording mode is a hard failure with an actionable message.
 */
export async function assertMatchesGolden(
  name: string,
  actual: unknown,
): Promise<void> {
  if (isRecording()) {
    await recordGolden(name, actual)
    return
  }
  const expected = await loadGolden(name)
  if (expected === undefined) {
    throw new Error(
      `golden fixture "${name}" is missing. Record it first with ` +
        `UPDATE_GOLDEN=1 npm run test:run`,
    )
  }
  // Compare canonical forms so key ordering never causes false negatives.
  expect(stableStringify(actual)).toBe(stableStringify(expected))
}

/**
 * Drain an async iterable (e.g. an LLM stream) into an array — the usual way to
 * turn a live stream into a comparable fixture payload.
 */
export async function collect<T>(
  iter: AsyncIterable<T> | Iterable<T>,
): Promise<T[]> {
  const out: T[] = []
  for await (const item of iter as AsyncIterable<T>) out.push(item)
  return out
}
