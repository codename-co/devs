/**
 * Tests for yjs/sync — room derivation and password enforcement
 *
 * Ensures that the P2P sync room name is cryptographically derived
 * from both the room ID and the password, so that different passwords
 * always map to different rooms on the signalling server.
 */
import { describe, it, expect } from 'vitest'

import { deriveRoomName } from '@/lib/yjs/sync'

describe('deriveRoomName', () => {
  it('should return a hex string', async () => {
    const room = await deriveRoomName('my-room', 'password123')
    expect(room).toMatch(/^[0-9a-f]{64}$/) // SHA-256 = 64 hex chars
  })

  it('should be deterministic — same inputs always produce same output', async () => {
    const a = await deriveRoomName('room-1', 'secret')
    const b = await deriveRoomName('room-1', 'secret')
    expect(a).toBe(b)
  })

  it('should produce different rooms for different passwords', async () => {
    const correct = await deriveRoomName('my-room', 'correct-password')
    const wrong = await deriveRoomName('my-room', 'wrong-password')
    expect(correct).not.toBe(wrong)
  })

  it('should produce different rooms for different room IDs', async () => {
    const room1 = await deriveRoomName('room-a', 'same-password')
    const room2 = await deriveRoomName('room-b', 'same-password')
    expect(room1).not.toBe(room2)
  })

  it('should produce different rooms even for similar inputs', async () => {
    // Ensure the separator prevents collisions like
    // roomId="a:b" password="c" vs roomId="a" password="b:c"
    const a = await deriveRoomName('a:b', 'c')
    const b = await deriveRoomName('a', 'b:c')
    expect(a).not.toBe(b)
  })

  it('should handle empty room ID gracefully', async () => {
    const room = await deriveRoomName('', 'password')
    expect(room).toMatch(/^[0-9a-f]{64}$/)
  })

  it('should handle unicode characters', async () => {
    const room = await deriveRoomName('salle-réunion', 'mot-de-passe-🔐')
    expect(room).toMatch(/^[0-9a-f]{64}$/)
  })

  it('should NOT match a plain SHA-256 hash (PBKDF2 is used)', async () => {
    // Verify that deriveRoomName does NOT produce a plain SHA-256 of
    // the concatenated inputs — i.e. a slow KDF is actually in use.
    const room = await deriveRoomName('room', 'pass')

    // Compute what plain SHA-256 would give for the same input
    const encoder = new TextEncoder()
    const data = encoder.encode('room:pass')
    const sha256Buf = await crypto.subtle.digest('SHA-256', data)
    const sha256Hex = Array.from(new Uint8Array(sha256Buf), (b) =>
      b.toString(16).padStart(2, '0'),
    ).join('')

    expect(room).not.toBe(sha256Hex)
  })

  it('should take meaningful time due to PBKDF2 iterations', async () => {
    const start = performance.now()
    await deriveRoomName('bench-room', 'bench-password')
    const elapsed = performance.now() - start
    // PBKDF2 with 100k iterations should take at least a few ms
    // (plain SHA-256 would be < 1ms)
    expect(elapsed).toBeGreaterThan(1)
  })
})
