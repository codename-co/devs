/**
 * Device Identity Management
 * Tracks which devices belong to a user
 */

import type { DeviceIdentity } from '@/types'

const DEVICE_KEY_ALGORITHM = { name: 'ECDSA', namedCurve: 'P-256' }

/**
 * Generate a new device identity
 */
export async function generateDeviceIdentity(
  userId: string,
  deviceName?: string,
): Promise<{ device: DeviceIdentity; privateKey: CryptoKey }> {
  // Generate device-specific keypair
  const keyPair = await crypto.subtle.generateKey(DEVICE_KEY_ALGORITHM, true, [
    'sign',
    'verify',
  ])

  // Export public key
  const publicKeyBuffer = await crypto.subtle.exportKey(
    'spki',
    keyPair.publicKey,
  )
  const publicKeyBase64 = bufferToBase64(publicKeyBuffer)

  // Generate device ID from public key hash
  const hashBuffer = await crypto.subtle.digest('SHA-256', publicKeyBuffer)
  const deviceId = bufferToHex(hashBuffer).slice(0, 16)

  // Auto-detect device name if not provided
  const name = deviceName || detectDeviceName()

  return {
    device: {
      id: deviceId,
      userId,
      name,
      lastSeen: new Date(),
      publicKey: publicKeyBase64,
    },
    privateKey: keyPair.privateKey,
  }
}

/**
 * Update device last seen timestamp
 */
export function updateDeviceLastSeen(device: DeviceIdentity): DeviceIdentity {
  return {
    ...device,
    lastSeen: new Date(),
  }
}

/**
 * Auto-detect device name from browser/OS info
 */
function detectDeviceName(): string {
  const ua = navigator.userAgent

  // Check for mobile devices
  if (/iPhone/.test(ua)) return 'iPhone'
  if (/iPad/.test(ua)) return 'iPad'
  if (/Android/.test(ua)) {
    if (/Mobile/.test(ua)) return 'Android Phone'
    return 'Android Tablet'
  }

  // Check for desktop OS
  if (/Macintosh/.test(ua)) return 'Mac'
  if (/Windows/.test(ua)) return 'Windows PC'
  if (/Linux/.test(ua)) return 'Linux PC'
  if (/CrOS/.test(ua)) return 'Chromebook'

  return 'Unknown Device'
}

// Helper functions
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
