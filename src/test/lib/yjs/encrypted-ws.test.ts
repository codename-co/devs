import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest'
import { createEncryptedWebSocketClass } from '@/lib/yjs/encrypted-ws'
import {
  deriveEncryptionKey,
  decryptUpdate,
  ENCRYPTION_VERSION,
} from '@/lib/yjs/crypto'

// ---------------------------------------------------------------------------
// Mock WebSocket — simulates the browser WebSocket API in jsdom
// ---------------------------------------------------------------------------

class MockWebSocket {
  static readonly CONNECTING = 0
  static readonly OPEN = 1
  static readonly CLOSING = 2
  static readonly CLOSED = 3
  readonly CONNECTING = 0
  readonly OPEN = 1
  readonly CLOSING = 2
  readonly CLOSED = 3

  binaryType: BinaryType = 'blob'
  readyState = MockWebSocket.CONNECTING
  url: string
  protocol = ''
  bufferedAmount = 0
  extensions = ''

  onmessage: ((event: MessageEvent) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null
  onopen: ((event: Event) => void) | null = null
  onerror: ((event: Event) => void) | null = null

  /** Captured outgoing messages (after encryption). */
  sentMessages: Uint8Array[] = []
  closed = false

  constructor(url: string | URL) {
    this.url = String(url)
    // Simulate async connection
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN
      this.onopen?.(new Event('open'))
    }, 5)
  }

  send(data: ArrayBuffer | Uint8Array | string): void {
    if (data instanceof ArrayBuffer) {
      this.sentMessages.push(new Uint8Array(data))
    } else if (data instanceof Uint8Array) {
      this.sentMessages.push(new Uint8Array(data))
    }
  }

  close(_code?: number, _reason?: string): void {
    this.closed = true
    this.readyState = MockWebSocket.CLOSED
    this.onclose?.(new CloseEvent('close'))
  }

  // -- test helper ----------------------------------------------------------

  /** Simulate receiving a message from the server. */
  simulateMessage(data: ArrayBuffer): void {
    this.onmessage?.(new MessageEvent('message', { data }))
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('EncryptedWebSocket', () => {
  let key: CryptoKey
  let EncryptedWS: ReturnType<typeof createEncryptedWebSocketClass>
  beforeAll(async () => {
    key = await deriveEncryptionKey('test-password', 'test-room')
    EncryptedWS = createEncryptedWebSocketClass(key)

    // Stub with mock
    vi.stubGlobal('WebSocket', MockWebSocket)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.stubGlobal('WebSocket', MockWebSocket) // re-stub after restore
  })

  /** Wait for the MockWebSocket to "connect". */
  async function waitForOpen(
    ws: InstanceType<typeof EncryptedWS>,
  ): Promise<void> {
    if (ws.readyState === 1) return
    return new Promise((resolve) => {
      ws.onopen = () => resolve()
    })
  }

  /** Small delay to let async queues flush. */
  const tick = (ms = 20) => new Promise((r) => setTimeout(r, ms))

  // -----------------------------------------------------------------------
  // Construction
  // -----------------------------------------------------------------------

  it('should create an instance and connect', async () => {
    const ws = new EncryptedWS('ws://localhost:4444')
    await waitForOpen(ws)

    expect(ws.readyState).toBe(1) // OPEN
    expect(ws.url).toBe('ws://localhost:4444')
  })

  it('should set binaryType to arraybuffer on the inner WebSocket', () => {
    const ws = new EncryptedWS('ws://localhost:4444')
    // Access inner WS via the wrapper's binaryType getter
    expect(ws.binaryType).toBe('arraybuffer')
  })

  // -----------------------------------------------------------------------
  // Sending (encrypt)
  // -----------------------------------------------------------------------

  it('should encrypt outgoing messages', async () => {
    const ws = new EncryptedWS('ws://localhost:4444')
    await waitForOpen(ws)

    const plaintext = new Uint8Array([10, 20, 30, 40, 50])
    ws.send(plaintext)

    await tick()

    const inner = (ws as unknown as { ws: MockWebSocket }).ws
    expect(inner.sentMessages.length).toBe(1)

    const sent = inner.sentMessages[0]
    // Must start with ENCRYPTION_VERSION
    expect(sent[0]).toBe(ENCRYPTION_VERSION)
    // Must be longer than plaintext (version + IV + ciphertext + tag)
    expect(sent.length).toBeGreaterThan(plaintext.length)

    // Should round-trip through decryptUpdate
    const decrypted = await decryptUpdate(sent, key)
    expect(decrypted).toEqual(plaintext)
  })

  it('should preserve send order for multiple messages', async () => {
    const ws = new EncryptedWS('ws://localhost:4444')
    await waitForOpen(ws)

    const msg1 = new Uint8Array([1])
    const msg2 = new Uint8Array([2])
    const msg3 = new Uint8Array([3])

    ws.send(msg1)
    ws.send(msg2)
    ws.send(msg3)

    await tick(50)

    const inner = (ws as unknown as { ws: MockWebSocket }).ws
    expect(inner.sentMessages.length).toBe(3)

    // Verify order by decrypting
    const d1 = await decryptUpdate(inner.sentMessages[0], key)
    const d2 = await decryptUpdate(inner.sentMessages[1], key)
    const d3 = await decryptUpdate(inner.sentMessages[2], key)

    expect(d1).toEqual(msg1)
    expect(d2).toEqual(msg2)
    expect(d3).toEqual(msg3)
  })

  it('should handle ArrayBuffer input', async () => {
    const ws = new EncryptedWS('ws://localhost:4444')
    await waitForOpen(ws)

    const data = new Uint8Array([5, 6, 7]).buffer
    ws.send(data)

    await tick()

    const inner = (ws as unknown as { ws: MockWebSocket }).ws
    expect(inner.sentMessages.length).toBe(1)

    const decrypted = await decryptUpdate(inner.sentMessages[0], key)
    expect(decrypted).toEqual(new Uint8Array([5, 6, 7]))
  })

  // -----------------------------------------------------------------------
  // Receiving (decrypt)
  // -----------------------------------------------------------------------

  it('should decrypt incoming messages', async () => {
    const ws = new EncryptedWS('ws://localhost:4444')
    await waitForOpen(ws)

    const plaintext = new Uint8Array([42, 43, 44])
    const { encryptUpdate } = await import('@/lib/yjs/crypto')
    const encrypted = await encryptUpdate(plaintext, key)

    const received: Uint8Array[] = []
    ws.onmessage = (event: MessageEvent) => {
      received.push(new Uint8Array(event.data as ArrayBuffer))
    }

    const inner = (ws as unknown as { ws: MockWebSocket }).ws
    inner.simulateMessage(encrypted.buffer as ArrayBuffer)

    await tick()

    expect(received.length).toBe(1)
    expect(received[0]).toEqual(plaintext)
  })

  it('should silently drop undecryptable messages', async () => {
    const ws = new EncryptedWS('ws://localhost:4444')
    await waitForOpen(ws)

    const received: Uint8Array[] = []
    ws.onmessage = (event: MessageEvent) => {
      received.push(new Uint8Array(event.data as ArrayBuffer))
    }

    // Send garbage data (unencrypted)
    const inner = (ws as unknown as { ws: MockWebSocket }).ws
    const garbage = new Uint8Array(50)
    garbage[0] = ENCRYPTION_VERSION // correct version but garbage content
    crypto.getRandomValues(garbage.subarray(1))
    inner.simulateMessage(garbage.buffer as ArrayBuffer)

    await tick()

    // Message should be dropped, not forwarded
    expect(received.length).toBe(0)
  })

  it('should perform full send-receive round-trip', async () => {
    const ws = new EncryptedWS('ws://localhost:4444')
    await waitForOpen(ws)

    const original = new Uint8Array([100, 200, 255, 0, 1])

    const received: Uint8Array[] = []
    ws.onmessage = (event: MessageEvent) => {
      received.push(new Uint8Array(event.data as ArrayBuffer))
    }

    // Send — gets encrypted
    ws.send(original)
    await tick()

    // Take the encrypted message and simulate receiving it
    const inner = (ws as unknown as { ws: MockWebSocket }).ws
    expect(inner.sentMessages.length).toBe(1)
    const encrypted = inner.sentMessages[0]

    inner.simulateMessage(encrypted.buffer as ArrayBuffer)
    await tick()

    // Should decrypt back to original
    expect(received.length).toBe(1)
    expect(received[0]).toEqual(original)
  })

  // -----------------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------------

  it('should forward close events', async () => {
    const ws = new EncryptedWS('ws://localhost:4444')
    await waitForOpen(ws)

    let closed = false
    ws.onclose = () => {
      closed = true
    }

    ws.close()

    expect(closed).toBe(true)
    expect(ws.readyState).toBe(3) // CLOSED
  })

  it('should expose WebSocket constants', () => {
    expect(EncryptedWS.CONNECTING).toBe(0)
    expect(EncryptedWS.OPEN).toBe(1)
    expect(EncryptedWS.CLOSING).toBe(2)
    expect(EncryptedWS.CLOSED).toBe(3)
  })

  // -----------------------------------------------------------------------
  // Cross-key isolation
  // -----------------------------------------------------------------------

  it('should not decrypt messages encrypted with a different key', async () => {
    const otherKey = await deriveEncryptionKey('other-password', 'test-room')
    createEncryptedWebSocketClass(otherKey) // verify it can be created with another key

    const ws = new EncryptedWS('ws://localhost:4444')
    await waitForOpen(ws)

    // Encrypt with the OTHER key
    const { encryptUpdate } = await import('@/lib/yjs/crypto')
    const encrypted = await encryptUpdate(new Uint8Array([1, 2, 3]), otherKey)

    const received: Uint8Array[] = []
    ws.onmessage = (event: MessageEvent) => {
      received.push(new Uint8Array(event.data as ArrayBuffer))
    }

    const inner = (ws as unknown as { ws: MockWebSocket }).ws
    inner.simulateMessage(encrypted.buffer as ArrayBuffer)

    await tick()

    // Should be dropped — wrong key
    expect(received.length).toBe(0)
  })
})
