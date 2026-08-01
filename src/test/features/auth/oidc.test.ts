/**
 * Tests for OIDC token parsing.
 */
import { describe, it, expect } from 'vitest'
import { parseIdToken } from '@/features/auth/oidc'

/** Helper to create a fake JWT with the given payload */
function fakeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const body = btoa(JSON.stringify(payload))
  const sig = 'fake-signature'
  return `${header}.${body}.${sig}`
}

describe('parseIdToken', () => {
  it('extracts basic user fields', () => {
    const token = fakeJwt({
      sub: 'user-123',
      email: 'alice@acme.com',
      name: 'Alice Smith',
      picture: 'https://cdn.acme.com/alice.jpg',
    })

    const user = parseIdToken(token)

    expect(user.id).toBe('user-123')
    expect(user.email).toBe('alice@acme.com')
    expect(user.name).toBe('Alice Smith')
    expect(user.avatar).toBe('https://cdn.acme.com/alice.jpg')
    expect(user.role).toBe('member') // no admin claim
  })

  it('detects admin from groups array claim', () => {
    const token = fakeJwt({
      sub: 'admin-1',
      email: 'cto@acme.com',
      name: 'CTO',
      groups: ['engineering', 'devs-admin'],
    })

    const user = parseIdToken(token, 'groups', 'devs-admin')

    expect(user.role).toBe('admin')
  })

  it('detects admin from string claim', () => {
    const token = fakeJwt({
      sub: 'admin-2',
      email: 'admin@acme.com',
      name: 'Admin',
      role: 'devs-admin',
    })

    const user = parseIdToken(token, 'role', 'devs-admin')

    expect(user.role).toBe('admin')
  })

  it('defaults to member when admin claim is absent', () => {
    const token = fakeJwt({
      sub: 'user-456',
      email: 'bob@acme.com',
      name: 'Bob',
    })

    const user = parseIdToken(token)

    expect(user.role).toBe('member')
  })

  it('defaults to member when admin value does not match', () => {
    const token = fakeJwt({
      sub: 'user-789',
      email: 'carol@acme.com',
      name: 'Carol',
      groups: ['engineering', 'design'],
    })

    const user = parseIdToken(token, 'groups', 'devs-admin')

    expect(user.role).toBe('member')
  })

  it('falls back to preferred_username for name', () => {
    const token = fakeJwt({
      sub: 'user-101',
      email: 'dave@acme.com',
      preferred_username: 'dave',
    })

    const user = parseIdToken(token)

    expect(user.name).toBe('dave')
  })

  it('falls back to email for name when no other field', () => {
    const token = fakeJwt({
      sub: 'user-102',
      email: 'eve@acme.com',
    })

    const user = parseIdToken(token)

    expect(user.name).toBe('eve@acme.com')
  })

  it('handles missing optional fields gracefully', () => {
    const token = fakeJwt({
      sub: 'user-103',
    })

    const user = parseIdToken(token)

    expect(user.id).toBe('user-103')
    expect(user.email).toBe('')
    expect(user.name).toBe('')
    expect(user.avatar).toBeUndefined()
    expect(user.role).toBe('member')
  })
})
