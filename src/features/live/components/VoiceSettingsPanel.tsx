/**
 * Voice Settings Panel Component
 *
 * Panel content for voice settings in Live mode.
 * Displays STT/TTS provider selection, auto-speak toggle, and voice selection.
 */
import { Button, Chip, Dropdown, Switch, Tooltip } from '@/components/heroui-compat'
import { useMemo } from 'react'

import { Icon } from '@/components/Icon'
import { PageMenuPanel } from '@/components/PageMenuPanel'
import { useI18n } from '@/i18n'
import localI18n from '../i18n'
import {
  getAvailableSTTProviders,
  getAvailableTTSProviders,
  KOKORO_VOICES,
} from '../lib'
import type { STTProviderType, TTSProviderType, TTSVoice } from '../lib/types'

// Group Kokoro voices by language for better UX
const KOKORO_VOICE_GROUPS = [
  { key: 'en-US', label: '🇺🇸 American English' },
  { key: 'en-GB', label: '🇬🇧 British English' },
  { key: 'ja-JP', label: '🇯🇵 Japanese' },
  { key: 'zh-CN', label: '🇨🇳 Mandarin Chinese' },
  { key: 'es-ES', label: '🇪🇸 Spanish' },
  { key: 'fr-FR', label: '🇫🇷 French' },
  { key: 'hi-IN', label: '🇮🇳 Hindi' },
  { key: 'it-IT', label: '🇮🇹 Italian' },
  { key: 'pt-BR', label: '🇧🇷 Portuguese' },
] as const

function getVoicesByLanguage(language: string): TTSVoice[] {
  return KOKORO_VOICES.filter((v) => v.language === language)
}

const panelI18n = {
  en: [
    'Voice Settings',
    'Configure speech-to-text and text-to-speech providers.',
    'Auto-speak',
    'Speak AI responses automatically',
    'Speech Input',
    'Speech Output',
    'Voice',
  ] as const,
  fr: {
    'Voice Settings': 'Paramètres vocaux',
    'Configure speech-to-text and text-to-speech providers.':
      'Configurez les fournisseurs de reconnaissance et synthèse vocale.',
    'Auto-speak': 'Auto-lecture',
    'Speak AI responses automatically':
      "Lire automatiquement les réponses de l'IA",
    'Speech Input': 'Entrée vocale',
    'Speech Output': 'Sortie vocale',
    Voice: 'Voix',
  },
  es: {
    'Voice Settings': 'Configuración de voz',
    'Configure speech-to-text and text-to-speech providers.':
      'Configura los proveedores de texto a voz y voz a texto.',
    'Auto-speak': 'Auto-lectura',
    'Speak AI responses automatically':
      'Leer automáticamente las respuestas de IA',
    'Speech Input': 'Entrada de voz',
    'Speech Output': 'Salida de voz',
    Voice: 'Voz',
  },
  de: {
    'Voice Settings': 'Spracheinstellungen',
    'Configure speech-to-text and text-to-speech providers.':
      'Konfigurieren Sie Sprache-zu-Text- und Text-zu-Sprache-Anbieter.',
    'Auto-speak': 'Auto-Sprechen',
    'Speak AI responses automatically': 'KI-Antworten automatisch vorlesen',
    'Speech Input': 'Spracheingabe',
    'Speech Output': 'Sprachausgabe',
    Voice: 'Stimme',
  },
  ar: {
    'Voice Settings': 'إعدادات الصوت',
    'Configure speech-to-text and text-to-speech providers.':
      'قم بتكوين مزودي تحويل الكلام إلى نص وتحويل النص إلى كلام.',
    'Auto-speak': 'تحدث تلقائيًا',
    'Speak AI responses automatically': 'قراءة ردود الذكاء الاصطناعي تلقائيًا',
    'Speech Input': 'إدخال صوتي',
    'Speech Output': 'إخراج صوتي',
    Voice: 'صوت',
  },
  ko: {
    'Voice Settings': '음성 설정',
    'Configure speech-to-text and text-to-speech providers.':
      '음성-텍스트 및 텍스트-음성 제공자를 구성합니다.',
    'Auto-speak': '자동 읽기',
    'Speak AI responses automatically': 'AI 응답 자동 읽기',
    'Speech Input': '음성 입력',
    'Speech Output': '음성 출력',
    Voice: '목소리',
  },
}

export interface VoiceSettingsPanelProps {
  /** Whether auto-speak is enabled */
  autoSpeak: boolean
  /** Callback when auto-speak changes */
  onAutoSpeakChange: (value: boolean) => void
  /** Current STT provider type */
  sttProviderType: STTProviderType
  /** Callback when STT provider changes */
  onSTTProviderChange: (type: STTProviderType) => void
  /** Current TTS provider type */
  ttsProviderType: TTSProviderType
  /** Callback when TTS provider changes */
  onTTSProviderChange: (type: TTSProviderType) => void
  /** Currently selected Kokoro voice ID */
  selectedVoiceId: string
  /** Callback when Kokoro voice changes */
  onVoiceChange: (voiceId: string) => void
  /** Callback to close the panel */
  onClose?: () => void
}

export function VoiceSettingsPanel({
  autoSpeak,
  onAutoSpeakChange,
  sttProviderType,
  onSTTProviderChange,
  ttsProviderType,
  onTTSProviderChange,
  selectedVoiceId,
  onVoiceChange,
}: VoiceSettingsPanelProps) {
  const { lang, t } = useI18n(localI18n)
  const { t: tp } = useI18n(panelI18n)

  // Available providers
  const sttProviders = useMemo(
    () => getAvailableSTTProviders(lang, (key: string) => t(key as any)),
    [lang, t],
  )
  const ttsProviders = useMemo(
    () => getAvailableTTSProviders((key: string) => t(key as any)),
    [t],
  )

  // Get current selected voice details
  const selectedVoice = useMemo(
    () =>
      KOKORO_VOICES.find((v) => v.id === selectedVoiceId) || KOKORO_VOICES[0],
    [selectedVoiceId],
  )

  // Get current provider names
  const currentSTTName =
    sttProviders.find((p) => p.type === sttProviderType)?.name || 'STT'
  const currentTTSName =
    ttsProviders.find((p) => p.type === ttsProviderType)?.name || 'TTS'

  return (
    <PageMenuPanel
      title={tp('Voice Settings')}
      description={tp('Configure speech-to-text and text-to-speech providers.')}
    >
      <div className="flex flex-col gap-4">
        {/* Auto-speak toggle */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col">
            <span className="text-sm font-medium">{tp('Auto-speak')}</span>
            <span className="text-xs text-default-400">
              {tp('Speak AI responses automatically')}
            </span>
          </div>
          <Switch
            size="sm"
            isSelected={autoSpeak}
            onValueChange={onAutoSpeakChange}
            thumbIcon={({ isSelected }: { isSelected: boolean }) =>
              isSelected ? (
                <Icon name="Voice" size="sm" />
              ) : (
                <Icon name="Pause" size="sm" />
              )
            }
          />
        </div>

        {/* Divider */}
        <div className="h-px bg-default-200" />

        {/* STT Provider */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-default-500">
            {tp('Speech Input')}
          </span>
          <Dropdown>
            <Dropdown.Trigger>
              <Button
                variant="outline"
                size="sm"
                startContent={<Icon name="Microphone" size="sm" />}
                endContent={<Icon name="NavArrowDown" size="sm" />}
                className="w-full justify-between"
              >
                {currentSTTName}
              </Button>
            </Dropdown.Trigger>
            <Dropdown.Menu
              aria-label="STT Provider"
              selectionMode="single"
              selectedKeys={new Set([sttProviderType])}
              disabledKeys={
                new Set(
                  sttProviders.filter((p) => p.isDisabled).map((p) => p.type),
                )
              }
              onSelectionChange={(keys: any) => {
                const selected = Array.from(keys)[0] as string
                if (selected) onSTTProviderChange(selected as STTProviderType)
              }}
            >
              {sttProviders.map((provider) => (
                <Dropdown.Item
                  id={provider.type}
                  description={
                    provider.isDisabled
                      ? provider.disabledReason
                      : provider.description
                  }
                  endContent={
                    provider.isLocal ? (
                      <Tooltip content={t('Local')}>
                        <Chip
                          size="sm"
                          color="accent"
                          variant="soft"
                          className="flex items-center"
                        >
                          <Icon name="OpenInBrowser" size="sm" />
                        </Chip>
                      </Tooltip>
                    ) : (
                      <Tooltip content={t('Cloud')}>
                        <Chip
                          size="sm"
                          color="default"
                          variant="soft"
                          className="flex items-center"
                        >
                          <Icon name="CloudCheck" size="sm" />
                        </Chip>
                      </Tooltip>
                    )
                  }
                >
                  {provider.name}
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown>
        </div>

        {/* TTS Provider */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-default-500">
            {tp('Speech Output')}
          </span>
          <Dropdown>
            <Dropdown.Trigger>
              <Button
                variant="outline"
                size="sm"
                startContent={<Icon name="Voice" size="sm" />}
                endContent={<Icon name="NavArrowDown" size="sm" />}
                className="w-full justify-between"
              >
                {currentTTSName}
              </Button>
            </Dropdown.Trigger>
            <Dropdown.Menu
              aria-label="TTS Provider"
              selectionMode="single"
              selectedKeys={new Set([ttsProviderType])}
              onSelectionChange={(keys: any) => {
                const selected = Array.from(keys)[0] as string
                if (selected) onTTSProviderChange(selected as TTSProviderType)
              }}
            >
              {ttsProviders.map((provider) => (
                <Dropdown.Item
                  id={provider.type}
                  description={provider.description}
                  endContent={
                    provider.isLocal ? (
                      <Tooltip content={t('Local')}>
                        <Chip
                          size="sm"
                          color="accent"
                          variant="soft"
                          className="flex items-center"
                        >
                          <Icon name="OpenInBrowser" size="sm" />
                        </Chip>
                      </Tooltip>
                    ) : (
                      <Tooltip content={t('Cloud')}>
                        <Chip
                          size="sm"
                          color="default"
                          variant="soft"
                          className="flex items-center"
                        >
                          <Icon name="CloudCheck" size="sm" />
                        </Chip>
                      </Tooltip>
                    )
                  }
                >
                  {provider.name}
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown>
        </div>

        {/* Kokoro Voice Selector (only shown when Kokoro TTS is selected) */}
        {ttsProviderType === 'kokoro' && (
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-default-500">
              {tp('Voice')}
            </span>
            <Dropdown>
              <Dropdown.Trigger>
                <Button
                  variant="outline"
                  size="sm"
                  startContent={
                    <Icon
                      name={
                        selectedVoice.gender === 'female' ? 'Female' : 'Male'
                      }
                      size="sm"
                    />
                  }
                  endContent={<Icon name="NavArrowDown" size="sm" />}
                  className="w-full justify-between"
                >
                  {selectedVoice.name}
                </Button>
              </Dropdown.Trigger>
              <Dropdown.Menu
                aria-label="Voice Selection"
                selectionMode="single"
                selectedKeys={new Set([selectedVoiceId])}
                onSelectionChange={(keys: any) => {
                  const selected = Array.from(keys)[0] as string
                  if (selected) onVoiceChange(selected)
                }}
                className="max-h-96 overflow-y-auto"
              >
                {KOKORO_VOICE_GROUPS.map((group) => {
                  const voices = getVoicesByLanguage(group.key)
                  if (voices.length === 0) return null
                  return (
                    <Dropdown.Section
                      key={group.key}
                      title={group.label}
                      showDivider
                    >
                      {voices.map((voice) => (
                        <Dropdown.Item
                          id={voice.id}
                        >
                          {voice.name}
                        </Dropdown.Item>
                      ))}
                    </Dropdown.Section>
                  )
                })}
              </Dropdown.Menu>
            </Dropdown>
          </div>
        )}
      </div>
    </PageMenuPanel>
  )
}
