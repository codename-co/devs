/**
 * usePrivacyMode — Reactive hook for checking privacy mode state.
 *
 * Returns whether the current space has privacy mode enabled,
 * plus helpers for trust classification.
 *
 * @module hooks/usePrivacyMode
 */

import { useEffectiveSettings } from '@/stores/userStore'
import {
  isProviderAllowedInPrivacyMode,
  isCredentialTrusted,
  getProviderTrustLevel,
  type TrustLevel,
} from '@/lib/privacy'
import type { LLMProvider, Credential } from '@/types'

export interface PrivacyModeState {
  /** Whether privacy mode is active for the current space */
  isActive: boolean
  /** Check if a provider type is allowed */
  isProviderAllowed: (provider: LLMProvider) => boolean
  /** Check if a specific credential is trusted */
  isCredentialTrusted: (credential: Credential) => boolean
  /** Get trust level for a provider */
  getTrustLevel: (provider: LLMProvider) => TrustLevel
}

/**
 * Reactive hook that returns the privacy mode state for the active space.
 */
export function usePrivacyMode(): PrivacyModeState {
  const settings = useEffectiveSettings()
  const isActive = settings.privacyMode === true

  return {
    isActive,
    isProviderAllowed: (provider: LLMProvider) =>
      !isActive || isProviderAllowedInPrivacyMode(provider),
    isCredentialTrusted: (credential: Credential) =>
      !isActive || isCredentialTrusted(credential),
    getTrustLevel: getProviderTrustLevel,
  }
}
