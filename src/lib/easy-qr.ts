/**
 * QR Code utilities for easy configuration sharing
 *
 * This module provides utilities to generate QR codes containing encrypted easy setup data.
 * The QR codes can be shared with team members to quickly configure their local environment.
 */

import { Lang } from '@/i18n'
import { exportEasySetup } from './easy-setup-db'

/**
 * Generate a QR code-ready URL for easy setup
 *
 * @param password - Password to encrypt sensitive data
 * @param options - Export options for selecting what to include
 * @returns Promise<string> - URL with encoded setup data
 */
export async function generateSetupQRData(
  password: string,
  options?: {
    includeAllAgents?: boolean
    selectedAgentIds?: string[]
    language?: Lang
    baseUrl?: string // Custom base URL, defaults to current origin
  },
): Promise<string> {
  // Export the current easy setup
  const encodedSetup = await exportEasySetup(password, {
    includeAllAgents: options?.includeAllAgents,
    selectedAgentIds: options?.selectedAgentIds,
  })

  // Get base URL
  const baseUrl = options?.baseUrl ?? window.location.origin

  // Return the setup URL
  return `${baseUrl}${options?.language ? `/${options.language}` : ''}?s=${encodedSetup}`
}

/**
 * Create a QR code data URL for the setup
 * Note: This function requires a QR code library to be installed
 * Example usage with qrcode library:
 *
 * ```bash
 * npm install qrcode @types/qrcode
 * ```
 *
 * ```typescript
 * import QRCode from 'qrcode'
 * import { generateSetupQRCode } from '@/lib/easy-qr'
 *
 * const qrCodeDataUrl = await generateSetupQRCode(password, options)
 * ```
 */
export async function generateSetupQRCode(url: string): Promise<string> {
  // Dynamic import to avoid bundling QR code library if not used
  try {
    // @ts-ignore - qrcode is an optional dependency
    const QRCodeModule = await import('qrcode')
    const QRCode = QRCodeModule.default || QRCodeModule
    // @ts-ignore - QR code types are complex and this is optional functionality
    return await QRCode.toDataURL(url, {
      errorCorrectionLevel: 'M',
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
      width: 256,
    })
  } catch (error) {
    console.warn(
      'QR code generation failed. Install "qrcode" package for QR code support:',
      error,
    )
    throw new Error(
      'QR code library not available. Install "qrcode" package to generate QR codes.',
    )
  }
}

/**
 * Example usage and documentation
 */
export const SETUP_EXAMPLES = {
  /**
   * Basic easy setup export
   */
  basicExport: `
// Export current configuration for QR sharing
import { generateSetupQRData, generateSetupQRCode } from '@/lib/easy-qr'

const password = 'team-secret-2024'
const setupUrl = await generateSetupQRData(password, {
  includeAllAgents: true,
})

console.log('Share this URL:', setupUrl)

// Or generate QR code
const qrCodeDataUrl = await generateSetupQRCode(password)
// Display qrCodeDataUrl in an <img> tag
`,

  /**
   * Selective export
   */
  selectiveExport: `
// Export only specific agents
const setupUrl = await generateSetupQRData('team-secret-2024', {
  selectedAgentIds: ['agent-1', 'agent-2'],
})
`,

  /**
   * Team member receiving setup
   */
  receivingSetup: `
// Team member visits URL like:
// https://devs.local/?setup=eyJ2ZXJzaW9uIjoiMS4wLjAiLCJlbmNyeXB0ZWQi...

// The application automatically detects the setup parameter and shows a modal
// 1. User enters the shared password
// 2. System decrypts and previews the setup
// 3. User confirms and initializes their configuration
// 4. Success toast shown, URL parameter cleaned up
`,
}
