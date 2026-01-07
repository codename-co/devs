import { Alert } from '@heroui/react'
import type { Lang } from '@/i18n'
import type { IconName } from '@/lib/types'
import { LLMProvider } from '@/types'
import {
  AnthropicProvider,
  LocalLLMProvider,
  OpenAIProvider,
  VertexAIProvider,
} from '@/lib/llm'
import { Icon } from '@/components'
import {
  availableMemory,
  deviceName,
  getVideoCardInfo,
  isWebGPUSupported,
} from '@/lib/device'
import { formatBytes } from '@/lib/format'

export interface ProviderConfig {
  provider: LLMProvider
  name: string
  models: string[] | Promise<string[]>
  icon: IconName
  requiresBaseUrl?: boolean
  apiKeyFormat?: string
  apiKeyPlaceholder?: string
  apiKeyPage?: string
  noApiKey?: boolean
  optionalApiKey?: boolean
  noServerUrl?: boolean
  fetchModelsFromServer?: boolean
  moreDetails?: () => React.ReactNode
}

export const PROVIDERS = (lang: Lang, t: any): ProviderConfig[] => [
  {
    provider: 'local',
    name: 'Local (Browser)',
    models: new LocalLLMProvider().getAvailableModels(),
    icon: 'OpenInBrowser',
    noApiKey: true,
    noServerUrl: true,
    moreDetails: () => (
      <Alert variant="faded">
        <div className="flex flex-col gap-2">
          <p className="font-medium">
            {t('Local LLMs run entirely in your browser')}
          </p>
          <p className="text-sm text-default-600">
            {t(
              'No data is sent to external servers. Download happens at first use.',
            )}
            <br />
            <details>
              <summary>
                {t('Requirements:')}
                <Icon
                  name={
                    isWebGPUSupported() && Number(availableMemory) >= 8
                      ? 'CheckCircle'
                      : 'PcNoEntry'
                  }
                  color={
                    isWebGPUSupported() && Number(availableMemory) >= 8
                      ? 'green'
                      : 'red'
                  }
                  className="inline h-4 w-4 ml-1"
                />
              </summary>
              <ul>
                <li>
                  <Icon
                    name={isWebGPUSupported() ? 'CheckCircle' : 'PcNoEntry'}
                    color={isWebGPUSupported() ? 'green' : 'red'}
                    className="inline h-4 w-4 mr-1"
                  />
                  {t('WebGPU support')}
                </li>
                <li>
                  <Icon
                    name={
                      Number(availableMemory) >= 8 ? 'CheckCircle' : 'PcNoEntry'
                    }
                    color={Number(availableMemory) >= 8 ? 'green' : 'red'}
                    className="inline h-4 w-4 mr-1"
                  />
                  {t('At least 8GB of RAM')}
                </li>
                <li>
                  <Icon name="QuestionMark" className="inline h-4 w-4 mr-1" />
                  {t('Storage space for model files (2-4GB)')}
                </li>
              </ul>
            </details>
            <details>
              <summary>
                {t('Your device:')} {deviceName()},{' '}
                {formatBytes(Number(availableMemory) * 1_000_000_000, lang)}＋
              </summary>

              <ul>
                {getVideoCardInfo()?.brand && (
                  <li>
                    {t('Brand: {brand}', {
                      brand: getVideoCardInfo()?.brand,
                    })}
                  </li>
                )}
                {getVideoCardInfo()?.model && (
                  <li>
                    {t('Model: {model}', {
                      model: getVideoCardInfo()?.model,
                    })}
                  </li>
                )}
                <li>
                  {t('Memory: {memory} or more (imprecise)', {
                    memory: formatBytes(
                      Number(availableMemory) * 1_000_000_000,
                      lang,
                    ),
                  })}
                </li>
                <li>
                  {t('Vendor: {vendor}', {
                    vendor: getVideoCardInfo()?.vendor,
                  })}
                </li>
              </ul>
            </details>
          </p>
        </div>
      </Alert>
    ),
  },
  {
    provider: 'ollama',
    name: 'Ollama',
    models: [
      'gpt-oss:20b',
      'gpt-oss:120b',
      'deepseek-r1:8b',
      'gemma3:4b',
      'qwen3:8b',
      'llama2',
      'mistral',
      'codellama',
      'vicuna',
      'orca-mini',
    ],
    icon: 'Ollama',
    noApiKey: true,
    apiKeyPlaceholder: 'http://localhost:11434',
  },
  {
    provider: 'openai',
    name: 'OpenAI',
    models: [
      OpenAIProvider.DEFAULT_MODEL,
      'gpt-5.2',
      'gpt-5-mini',
      'gpt-5-nano',
      'gpt-5.2-pro',
      'gpt-5',
      'gpt-4.1',
      'gpt-4-turbo',
      'gpt-3.5-turbo',
    ],
    icon: 'OpenAI',
    apiKeyPage: 'https://platform.openai.com/api-keys',
  },
  {
    provider: 'anthropic',
    name: 'Anthropic',
    models: [
      AnthropicProvider.DEFAULT_MODEL,
      'claude-sonnet-4-20250514',
      'claude-opus-4-5-20251101',
      'claude-opus-4-20250514',
      'claude-haiku-4-5-20251001',
    ],
    icon: 'Anthropic',
    apiKeyPage: 'https://console.anthropic.com/settings/keys',
  },
  {
    provider: 'google',
    name: 'Google Gemini',
    models: [
      'gemini-3-pro-preview',
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
      'gemini-2.5-pro',
      'gemini-2.5-flash-image-preview',
    ],
    icon: 'Google',
  },
  {
    provider: 'vertex-ai',
    name: 'Vertex AI',
    models: [
      VertexAIProvider.DEFAULT_MODEL,
      'claude-sonnet-4-5@20250929',
      'google/gemini-2.5-flash-image-preview',
      'google/gemini-live-2.5-flash-preview-native-audio',
      'google/gemini-2.5-pro',
      'google/gemini-2.5-flash-lite',
      'google/veo-3.0-generate-001',
      'google/veo-3.0-fast-generate-001',
      'google/gemini-2.0-flash-001',
      'google/gemini-2.0-flash-lite-001',
    ],
    icon: 'GoogleCloud',
    apiKeyFormat: 'LOCATION:PROJECT_ID:API_KEY',
    apiKeyPlaceholder: 'us-central1:my-project:your-api-key',
  },
  {
    provider: 'mistral',
    name: 'Mistral AI',
    models: ['mistral-medium', 'mistral-small', 'mistral-tiny'],
    icon: 'MistralAI',
  },
  {
    provider: 'openrouter',
    name: 'OpenRouter',
    models: [
      'openai/gpt-4',
      'anthropic/claude-3-opus',
      'google/gemini-pro',
      'meta-llama/llama-3-70b',
    ],
    icon: 'OpenRouter',
  },
  {
    provider: 'deepseek',
    name: 'DeepSeek',
    models: ['deepseek-chat', 'deepseek-coder'],
    icon: 'DeepSeek',
  },
  {
    provider: 'grok',
    name: 'Grok (X.AI)',
    models: ['grok-beta'],
    icon: 'X',
  },
  {
    provider: 'huggingface',
    name: 'Hugging Face',
    models: [
      'meta-llama/Llama-2-7b-chat-hf',
      'mistralai/Mistral-7B-Instruct-v0.1',
      'google/flan-t5-xxl',
    ],
    icon: 'HuggingFace',
  },
  {
    provider: 'openai-compatible',
    name: 'OpenAI Compatible',
    models: [],
    icon: 'Internet',
    requiresBaseUrl: true,
    optionalApiKey: true,
    fetchModelsFromServer: true,
    apiKeyPlaceholder: 'sk-... (optional)',
    moreDetails: () => (
      <Alert variant="faded">
        <div className="flex flex-col gap-2">
          <p className="font-medium">Connect to any OpenAI-compatible API</p>
          <p className="text-sm text-default-600">
            Works with LM Studio, LocalAI, vLLM, Text Generation WebUI, Together
            AI, Fireworks AI, and more.
            <br />
            API key is optional for local servers.
          </p>
        </div>
      </Alert>
    ),
  },
  {
    provider: 'custom',
    name: 'Custom',
    models: [],
    icon: 'Server',
    requiresBaseUrl: true,
  },
]
