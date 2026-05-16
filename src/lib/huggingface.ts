/**
 * HuggingFace host configuration utilities.
 *
 * In enterprise environments, the official HuggingFace servers may not be
 * accessible. This module provides helpers to resolve the effective HuggingFace
 * host URL from user settings (e.g. a JFrog Artifactory proxy).
 *
 * The user-facing setting stores a base host such as
 * `https://hf-mirror.mycompany.com`. All consumers normalise it via
 * {@link getHuggingFaceHost} which strips any trailing slash.
 */

import { userSettings } from '@/stores/userStore'

/** Default official HuggingFace host */
export const DEFAULT_HUGGINGFACE_HOST = 'https://huggingface.co'

/** Default official HuggingFace router host (for inference API) */
export const DEFAULT_HUGGINGFACE_ROUTER_HOST = 'https://router.huggingface.co'

/**
 * Return the effective HuggingFace host URL.
 *
 * Resolution: user setting → default (`https://huggingface.co`).
 * Trailing slashes are stripped for safe concatenation.
 */
export function getHuggingFaceHost(): string {
  const custom = userSettings.getState().huggingfaceBaseUrl
  if (custom && custom.trim()) {
    return custom.trim().replace(/\/+$/, '')
  }
  return DEFAULT_HUGGINGFACE_HOST
}

/**
 * Return the effective HuggingFace router host URL (for inference API).
 *
 * When a custom host is configured the router is assumed to be the same host
 * (enterprise proxies typically expose the full API surface). When no custom
 * host is set the official router is used.
 */
export function getHuggingFaceRouterHost(): string {
  const custom = userSettings.getState().huggingfaceBaseUrl
  if (custom && custom.trim()) {
    return custom.trim().replace(/\/+$/, '')
  }
  return DEFAULT_HUGGINGFACE_ROUTER_HOST
}

/**
 * Configure the `@huggingface/transformers` library `env.remoteHost` to point
 * at the user-configured HuggingFace host. Call this before loading any
 * transformer model or pipeline.
 *
 * The function dynamically imports the transformers `env` object so it can be
 * tree-shaken when not used.
 */
export async function configureTransformersHost(): Promise<void> {
  const host = getHuggingFaceHost()
  // Ensure trailing slash — transformers.js appends path directly
  const hostWithSlash = host.endsWith('/') ? host : `${host}/`
  const { env } = await import('@huggingface/transformers')
  env.remoteHost = hostWithSlash
}
