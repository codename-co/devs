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
