import { useEffect, useCallback, useMemo } from 'react'
import { useLLMModelStore } from '@/stores/llmModelStore'
import { type IconName } from '@/lib/types'
import type { LLMProvider, Credential } from '@/types'

// Provider icon mapping
const PROVIDER_ICONS: Record<string, IconName> = {
  local: 'OpenInBrowser',
  ollama: 'Ollama',
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
  'vertex-ai': 'GoogleCloud',
  mistral: 'MistralAI',
  openrouter: 'OpenRouter',
  deepseek: 'DeepSeek',
  grok: 'X',
  huggingface: 'HuggingFace',
  custom: 'Server',
  'openai-compatible': 'Internet',
  // Image generation providers
  stability: 'SparksSolid',
  together: 'Puzzle',
  fal: 'LightBulbOn',
  replicate: 'RefreshDouble',
}

interface UseModelPickerOptions {
  lang?: string
}

interface UseModelPickerReturn {
  /** Available provider credentials */
  credentials: Credential[]
  /** Currently selected provider ID */
  selectedProviderId: string | null
  /** Currently selected provider credential */
  selectedProvider: Credential | null
  /** Currently selected model for the active provider */
  selectedModel: string | null
  /** Set the selected provider */
  setSelectedProviderId: (id: string) => void
  /** Set the model for a provider */
  setSelectedModel: (provider: LLMProvider, model: string) => void
  /** Get icon for a provider */
  getProviderIcon: (provider: string) => IconName
  /** Format model name for display */
  displayModelName: (model: string | undefined) => string
  /** Get the selected model for a specific provider */
  getSelectedModelForProvider: (provider: LLMProvider) => string | null
  /** @deprecated use selectedProviderId */
  selectedCredentialId: string | null
  /** @deprecated use selectedProvider */
  selectedCredential: Credential | null
  /** @deprecated use setSelectedProviderId */
  setSelectedCredentialId: (id: string) => void
}

export function useModelPicker({
  lang,
}: UseModelPickerOptions = {}): UseModelPickerReturn {
  const {
    credentials,
    selectedProviderId,
    selectedModels,
    setSelectedProviderId,
    setSelectedModel,
    getSelectedProvider,
    getSelectedModel,
    loadCredentials,
    // Legacy
    selectedCredentialId,
    setSelectedCredentialId,
    getSelectedCredential,
  } = useLLMModelStore()

  const selectedProvider = useMemo(
    () => getSelectedProvider(),
    [credentials, selectedProviderId],
  )
  const selectedModel = useMemo(
    () => getSelectedModel(),
    [selectedModels, selectedProviderId, credentials],
  )
  const selectedCredential = useMemo(
    () => getSelectedCredential(),
    [credentials, selectedCredentialId],
  )

  // Load credentials on mount
  useEffect(() => {
    loadCredentials()
  }, [loadCredentials])

  const getProviderIcon = useCallback((provider: string): IconName => {
    return PROVIDER_ICONS[provider] || 'Server'
  }, [])

  const displayModelName = useCallback(
    (model: string | undefined): string => {
      if (!model) return ''

      // Handle common model name patterns and make them more readable
      // Remove provider prefixes and common separators
      return model
        .replace(/.*\//, '') // Remove everything before last slash
        .replace(/[_-]+/g, ' ') // Replace underscores and hyphens with space
        .replace(/\s+/g, ' ') // Collapse multiple spaces
        .replace(
          /(\d{4})(\d{2})(\d{2})(?!\w)/,
          (_, p1, p2, p3) =>
            `(${new Date(p1, p2, p3).toLocaleDateString(lang)})`,
        ) // Format dates like 20240115 to 2024-01-15
        .trim()
    },
    [lang],
  )

  const getSelectedModelForProvider = useCallback(
    (provider: LLMProvider): string | null => {
      return selectedModels[provider] || null
    },
    [selectedModels],
  )

  return {
    credentials,
    selectedProviderId,
    selectedProvider,
    selectedModel,
    setSelectedProviderId,
    setSelectedModel,
    getProviderIcon,
    displayModelName,
    getSelectedModelForProvider,
    // Legacy compatibility
    selectedCredentialId,
    selectedCredential,
    setSelectedCredentialId,
  }
}
