/**
 * @module lib/llm/ai-sdk
 *
 * The AI SDK backing for the `LLMService` facade (REPORT §4 Phase 3). Every
 * standard provider is now an {@link AiSdkProvider} driven by a thin
 * {@link AiSdkBinding}; the hand-rolled `providers/*.ts` layer for these is
 * deleted. `aiSdkProvider(name)` builds the provider for registration; bindings
 * (and the `ai`/`@ai-sdk/*` packages) load lazily on first request, so nothing
 * is added to the boot graph.
 *
 * Irreducibly-special providers that the AI SDK cannot host in-browser stay as
 * their own implementations: **local** (WebGPU/transformers.js in-tab),
 * **claude-code** (local CLI bridge), **vertex-ai** (browser OAuth /
 * service-account auth the SDK's Node provider can't do).
 */
import type { LLMProvider } from '@/types'
import type { LLMProviderInterface } from '../index'
import { AiSdkProvider, type AiSdkBinding } from './adapter'

/** Lazy binding loaders, keyed by provider. */
const BINDINGS: Partial<Record<LLMProvider, () => Promise<AiSdkBinding>>> = {
  openai: () => import('./bindings').then((m) => m.openAiBinding),
  anthropic: () => import('./bindings').then((m) => m.anthropicBinding),
  google: () => import('./bindings').then((m) => m.googleBinding),
  mistral: () => import('./bindings').then((m) => m.mistralBinding),
  openrouter: () => import('./bindings').then((m) => m.openRouterBinding),
  ollama: () => import('./bindings').then((m) => m.ollamaBinding),
  'lm-studio': () => import('./bindings').then((m) => m.lmStudioBinding),
  'openai-compatible': () =>
    import('./bindings').then((m) => m.openAiCompatibleBinding),
  custom: () => import('./bindings').then((m) => m.customBinding),
  huggingface: () => import('./bindings').then((m) => m.huggingFaceBinding),
  // ChatJimmy is bespoke (not OpenAI-compatible): a custom `LanguageModelV4`.
  chatjimmy: () => import('./chatjimmy').then((m) => m.chatJimmyBinding),
}

/** True if the provider is backed by the AI SDK (has a binding). */
export function hasAiSdkBinding(provider: LLMProvider): boolean {
  return provider in BINDINGS
}

/**
 * Build the AI SDK-backed `LLMProviderInterface` for a provider. Throws if the
 * provider has no binding (it must be one of the special legacy providers).
 */
export function aiSdkProvider(provider: LLMProvider): LLMProviderInterface {
  const load = BINDINGS[provider]
  if (!load) throw new Error(`No AI SDK binding for provider "${provider}"`)
  return new AiSdkProvider(load)
}

export { AiSdkProvider } from './adapter'
export type { AiSdkBinding, AiSdkModelConfig } from './adapter'
