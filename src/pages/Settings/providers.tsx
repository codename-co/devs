import { Alert } from '@heroui/react'
import type { Lang } from '@/i18n'
import type { IconName } from '@/lib/types'
import type { LLMModel, LLMProvider } from '@/types'
import { LocalLLMProvider } from '@/lib/llm'
import { getModelsForProviderAsync } from '@/lib/llm/models'
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
  /** Models can be LLMModel[], string[], or a Promise resolving to either */
  models: LLMModel[] | string[] | Promise<LLMModel[] | string[]>
  icon: IconName
  requiresBaseUrl?: boolean
  apiKeyFormat?: string
  apiKeyPlaceholder?: string
  apiKeyPage?: string
  noApiKey?: boolean
  optionalApiKey?: boolean
  noServerUrl?: boolean
  fetchModelsFromServer?: boolean
  /** Use multiline textarea for API key input (e.g., for JSON keys) */
  multilineApiKey?: boolean
  moreDetails?: () => React.ReactNode
}

/**
 * Get model IDs from a models array (handles both LLMModel[] and string[])
 */
export function getModelIds(models: LLMModel[] | string[]): string[] {
  if (models.length === 0) return []
  if (typeof models[0] === 'string') {
    return models as string[]
  }
  return (models as LLMModel[]).map((m) => m.id)
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
    models: getModelsForProviderAsync('ollama'),
    icon: 'Ollama',
    noApiKey: true,
    apiKeyPlaceholder: 'http://localhost:11434',
  },
  {
    provider: 'openai',
    name: 'OpenAI',
    models: getModelsForProviderAsync('openai'),
    icon: 'OpenAI',
    apiKeyPage: 'https://platform.openai.com/api-keys',
  },
  {
    provider: 'anthropic',
    name: 'Anthropic',
    models: getModelsForProviderAsync('anthropic'),
    icon: 'Anthropic',
    apiKeyPage: 'https://console.anthropic.com/settings/keys',
  },
  {
    provider: 'google',
    name: 'Google Gemini',
    models: getModelsForProviderAsync('google'),
    icon: 'Gemini',
    apiKeyPage: 'https://aistudio.google.com/apikey',
  },
  {
    provider: 'vertex-ai',
    name: 'Vertex AI',
    models: getModelsForProviderAsync('vertex-ai'),
    icon: 'GoogleCloud',
    apiKeyPlaceholder:
      'Paste JSON service account key or LOCATION:PROJECT_ID:ACCESS_TOKEN',
    apiKeyPage: 'https://console.cloud.google.com/iam-admin/serviceaccounts',
    multilineApiKey: true,
    moreDetails: () => (
      <Alert variant="faded">
        <div className="flex flex-col gap-2">
          <p className="font-medium">Authentication Options</p>
          <p className="text-sm text-default-600">
            <strong>Option 1 (Recommended):</strong> Paste the entire JSON
            content from a Service Account key file.
            <br />
            <strong>Option 2:</strong> Use format{' '}
            <code>LOCATION:PROJECT_ID:ACCESS_TOKEN</code>
          </p>
        </div>
      </Alert>
    ),
  },
  {
    provider: 'mistral',
    name: 'Mistral AI',
    models: getModelsForProviderAsync('mistral'),
    icon: 'MistralAI',
    apiKeyPage: 'https://console.mistral.ai/api-keys',
  },
  {
    provider: 'openrouter',
    name: 'OpenRouter',
    models: getModelsForProviderAsync('openrouter'),
    icon: 'OpenRouter',
    apiKeyPage: 'https://openrouter.ai/settings/keys',
  },
  {
    provider: 'huggingface',
    name: 'Hugging Face',
    models: getModelsForProviderAsync('huggingface'),
    icon: 'HuggingFace',
    apiKeyPage: 'https://huggingface.co/settings/tokens',
    fetchModelsFromServer: true,
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
    provider: 'claude-code',
    name: 'Claude Code API',
    models: [
      'claude-sonnet-4-5-20250929',
      'claude-opus-4-5-20251101',
      'claude-haiku-4-5-20251001',
      'claude-sonnet-4-20250514',
      'claude-opus-4-20250514',
    ],
    icon: 'Claude',
    requiresBaseUrl: true,
    optionalApiKey: true,
    fetchModelsFromServer: true,
    apiKeyPlaceholder: 'API key (optional for local servers)',
    moreDetails: () => (
      <Alert variant="faded">
        <div className="flex flex-col gap-2">
          <p className="font-medium">Connect to a Claude Code API Server</p>
          <p className="text-sm text-default-600">
            Claude Code API servers wrap the Claude Agent SDK and provide an
            OpenAI-compatible endpoint. Supports session continuity and Claude
            Code tools (Read, Write, Bash, etc.).
            <br />
            <br />
            Servers:{' '}
            <a
              href="https://github.com/RichardAtCT/claude-code-openai-wrapper"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              claude-code-openai-wrapper
            </a>{' '}
            (Python) |{' '}
            <a
              href="https://github.com/zhanghandong/claude-code-api-rs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              claude-code-api-rs
            </a>{' '}
            (Rust)
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
  // Image generation providers
  {
    provider: 'stability',
    name: 'Stability AI',
    models: [
      'stable-image-ultra',
      'stable-image-core',
      'stable-diffusion-xl-1024-v1-0',
      'stable-diffusion-v1-6',
    ],
    icon: 'SparksSolid',
    apiKeyPage: 'https://platform.stability.ai/account/keys',
    moreDetails: () => (
      <Alert variant="faded">
        <div className="flex flex-col gap-2">
          <p className="font-medium">Image Generation Provider</p>
          <p className="text-sm text-default-600">
            Stability AI provides Stable Diffusion models for high-quality image
            generation.
          </p>
        </div>
      </Alert>
    ),
  },
  {
    provider: 'together',
    name: 'Together AI',
    models: [
      'black-forest-labs/FLUX.1.1-pro',
      'black-forest-labs/FLUX.1-dev',
      'black-forest-labs/FLUX.1-schnell',
      'stabilityai/stable-diffusion-xl-base-1.0',
    ],
    icon: 'Puzzle',
    apiKeyPage: 'https://api.together.xyz/settings/api-keys',
    moreDetails: () => (
      <Alert variant="faded">
        <div className="flex flex-col gap-2">
          <p className="font-medium">Image Generation Provider</p>
          <p className="text-sm text-default-600">
            Together AI provides FLUX and Stable Diffusion models for image
            generation.
          </p>
        </div>
      </Alert>
    ),
  },
  {
    provider: 'fal',
    name: 'Fal.ai',
    models: ['fal-ai/flux-pro', 'fal-ai/flux/dev', 'fal-ai/flux/schnell'],
    icon: 'LightBulbOn',
    apiKeyPage: 'https://fal.ai/dashboard/keys',
    moreDetails: () => (
      <Alert variant="faded">
        <div className="flex flex-col gap-2">
          <p className="font-medium">Image Generation Provider</p>
          <p className="text-sm text-default-600">
            Fal.ai provides fast FLUX models for image generation.
          </p>
        </div>
      </Alert>
    ),
  },
  {
    provider: 'replicate',
    name: 'Replicate',
    models: ['stability-ai/sdxl', 'bytedance/sdxl-lightning-4step'],
    icon: 'RefreshDouble',
    apiKeyPage: 'https://replicate.com/account/api-tokens',
    moreDetails: () => (
      <Alert variant="faded">
        <div className="flex flex-col gap-2">
          <p className="font-medium">Image Generation Provider</p>
          <p className="text-sm text-default-600">
            Replicate provides various image generation models including SDXL.
          </p>
        </div>
      </Alert>
    ),
  },
]
