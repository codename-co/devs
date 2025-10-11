import { useEffect, useCallback } from 'react'
import { useLLMModelStore } from '@/stores/llmModelStore'
import { type IconName } from '@/lib/types'

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
}

interface UseModelPickerOptions {
  lang?: string
}

interface UseModelPickerReturn {
  credentials: any
  selectedCredentialId: string | null
  selectedCredential: any
  setSelectedCredentialId: (id: string) => void
  getProviderIcon: (provider: string) => IconName
  displayModelName: (model: string | undefined) => string
}

export function useModelPicker({
  lang,
}: UseModelPickerOptions = {}): UseModelPickerReturn {
  const {
    credentials,
    selectedCredentialId,
    setSelectedCredentialId,
    getSelectedCredential,
    loadCredentials,
  } = useLLMModelStore()

  const selectedCredential = getSelectedCredential()

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

  return {
    credentials,
    selectedCredentialId,
    selectedCredential,
    setSelectedCredentialId,
    getProviderIcon,
    displayModelName,
  }
}
