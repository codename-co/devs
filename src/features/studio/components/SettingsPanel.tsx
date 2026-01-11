/**
 * SettingsPanel Component
 *
 * Panel for configuring image generation settings (style, aspect ratio, quality, etc.)
 */

import {
  Button,
  Select,
  SelectItem,
  Slider,
  Input,
  Accordion,
  AccordionItem,
  Chip,
  Divider,
} from '@heroui/react'
import { useMemo } from 'react'

import { Icon } from '@/components/Icon'
import { type Lang, useI18n } from '@/i18n'
import {
  ImageGenerationSettings,
  AspectRatio,
  ImageQuality,
  ImageStyle,
  LightingPreset,
  ColorPalette,
  CompositionPreset,
  DEFAULT_IMAGE_SETTINGS,
} from '../types'

interface SettingsPanelProps {
  lang: Lang
  settings: ImageGenerationSettings
  onSettingsChange: (settings: Partial<ImageGenerationSettings>) => void
  onReset?: () => void
  onSaveAsPreset?: () => void
  onClose?: () => void
  compact?: boolean
}

// Option configurations
const ASPECT_RATIOS: { value: AspectRatio; label: string; icon: string }[] = [
  { value: '1:1', label: 'Square', icon: '⬜' },
  { value: '16:9', label: 'Landscape', icon: '🖼️' },
  { value: '9:16', label: 'Portrait', icon: '📱' },
  { value: '4:3', label: 'Classic', icon: '🖥️' },
  { value: '3:4', label: 'Classic Portrait', icon: '📷' },
  { value: '3:2', label: 'Photo', icon: '📸' },
  { value: '2:3', label: 'Photo Portrait', icon: '🎞️' },
  { value: '21:9', label: 'Ultrawide', icon: '🎬' },
]

const QUALITIES: { value: ImageQuality; label: string; description: string }[] = [
  { value: 'draft', label: 'Draft', description: 'Fast, lower quality' },
  { value: 'standard', label: 'Standard', description: 'Balanced quality' },
  { value: 'hd', label: 'HD', description: 'High detail' },
  { value: 'ultra', label: 'Ultra', description: 'Maximum quality' },
]

const STYLES: { value: ImageStyle; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'natural', label: 'Natural / Photo' },
  { value: 'vivid', label: 'Vivid' },
  { value: 'artistic', label: 'Artistic' },
  { value: 'anime', label: 'Anime' },
  { value: 'digital-art', label: 'Digital Art' },
  { value: 'cinematic', label: 'Cinematic' },
  { value: 'fantasy', label: 'Fantasy' },
  { value: 'minimalist', label: 'Minimalist' },
  { value: 'vintage', label: 'Vintage' },
  { value: '3d-render', label: '3D Render' },
  { value: 'watercolor', label: 'Watercolor' },
  { value: 'oil-painting', label: 'Oil Painting' },
  { value: 'sketch', label: 'Sketch' },
  { value: 'pixel-art', label: 'Pixel Art' },
  { value: 'comic', label: 'Comic Book' },
  { value: 'abstract', label: 'Abstract' },
]

const LIGHTING_PRESETS: { value: LightingPreset; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'natural', label: 'Natural' },
  { value: 'studio', label: 'Studio' },
  { value: 'dramatic', label: 'Dramatic' },
  { value: 'soft', label: 'Soft' },
  { value: 'golden-hour', label: 'Golden Hour' },
  { value: 'neon', label: 'Neon' },
  { value: 'moody', label: 'Moody' },
  { value: 'backlit', label: 'Backlit' },
]

const COLOR_PALETTES: { value: ColorPalette; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'vibrant', label: 'Vibrant' },
  { value: 'pastel', label: 'Pastel' },
  { value: 'monochrome', label: 'Monochrome' },
  { value: 'sepia', label: 'Sepia' },
  { value: 'cool', label: 'Cool Tones' },
  { value: 'warm', label: 'Warm Tones' },
  { value: 'earth', label: 'Earth Tones' },
  { value: 'neon', label: 'Neon' },
  { value: 'muted', label: 'Muted' },
]

const COMPOSITIONS: { value: CompositionPreset; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'portrait', label: 'Portrait' },
  { value: 'landscape', label: 'Landscape' },
  { value: 'close-up', label: 'Close-up' },
  { value: 'wide-angle', label: 'Wide Angle' },
  { value: 'aerial', label: 'Aerial' },
  { value: 'low-angle', label: 'Low Angle' },
  { value: 'dutch-angle', label: 'Dutch Angle' },
  { value: 'symmetrical', label: 'Symmetrical' },
  { value: 'rule-of-thirds', label: 'Rule of Thirds' },
]

export function SettingsPanel({
  lang,
  settings,
  onSettingsChange,
  onReset,
  onSaveAsPreset,
  onClose,
  compact = false,
}: SettingsPanelProps) {
  const { t } = useI18n(lang as any)

  // Check if settings differ from defaults
  const hasChanges = useMemo(() => {
    return JSON.stringify(settings) !== JSON.stringify(DEFAULT_IMAGE_SETTINGS)
  }, [settings])

  // Active settings summary
  const activeSummary = useMemo(() => {
    const active: string[] = []
    if (settings.style !== 'none') active.push(settings.style)
    if (settings.lighting !== 'none') active.push(settings.lighting)
    if (settings.colorPalette !== 'none') active.push(settings.colorPalette)
    if (settings.composition !== 'none') active.push(settings.composition)
    return active
  }, [settings])

  return (
    <div className={`flex flex-col ${compact ? 'gap-3' : 'gap-4'}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{t('Image Settings')}</h3>
        <div className="flex items-center gap-2">
          {onSaveAsPreset && hasChanges && (
            <Button
              size="sm"
              variant="flat"
              startContent={<Icon name="FloppyDisk" size="sm" />}
              onPress={onSaveAsPreset}
            >
              {t('Save as Preset')}
            </Button>
          )}
          {onReset && hasChanges && (
            <Button
              size="sm"
              variant="light"
              startContent={<Icon name="RefreshDouble" size="sm" />}
              onPress={onReset}
            >
              {t('Reset')}
            </Button>
          )}
          {onClose && (
            <Button isIconOnly size="sm" variant="light" onPress={onClose}>
              <Icon name="Xmark" size="sm" />
            </Button>
          )}
        </div>
      </div>

      {/* Active settings chips */}
      {activeSummary.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {activeSummary.map((setting) => (
            <Chip key={setting} size="sm" variant="flat" className="capitalize">
              {setting.replace('-', ' ')}
            </Chip>
          ))}
        </div>
      )}

      <Divider />

      {/* Basic Settings */}
      <div className="space-y-4">
        {/* Aspect Ratio */}
        <div>
          <label className="text-sm font-medium mb-2 block">
            {t('Aspect Ratio')}
          </label>
          <div className="grid grid-cols-4 gap-2">
            {ASPECT_RATIOS.map((ratio) => (
              <Button
                key={ratio.value}
                size="sm"
                variant={settings.aspectRatio === ratio.value ? 'solid' : 'flat'}
                color={settings.aspectRatio === ratio.value ? 'primary' : 'default'}
                onPress={() => onSettingsChange({ aspectRatio: ratio.value })}
                className="flex-col h-auto py-2"
              >
                <span className="text-lg">{ratio.icon}</span>
                <span className="text-xs">{ratio.value}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Quality */}
        <div>
          <label className="text-sm font-medium mb-2 block">{t('Quality')}</label>
          <div className="grid grid-cols-4 gap-2">
            {QUALITIES.map((quality) => (
              <Button
                key={quality.value}
                size="sm"
                variant={settings.quality === quality.value ? 'solid' : 'flat'}
                color={settings.quality === quality.value ? 'primary' : 'default'}
                onPress={() => onSettingsChange({ quality: quality.value })}
              >
                {quality.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Style */}
        <Select
          label={t('Style')}
          selectedKeys={[settings.style]}
          onSelectionChange={(keys) => {
            const value = Array.from(keys)[0] as ImageStyle
            onSettingsChange({ style: value })
          }}
          size="sm"
        >
          {STYLES.map((style) => (
            <SelectItem key={style.value}>{style.label}</SelectItem>
          ))}
        </Select>

        {/* Image Count */}
        <div>
          <label className="text-sm font-medium mb-2 block">
            {t('Number of Images')}: {settings.count}
          </label>
          <Slider
            size="sm"
            step={1}
            minValue={1}
            maxValue={4}
            value={settings.count}
            onChange={(value) =>
              onSettingsChange({ count: value as number })
            }
            className="max-w-full"
          />
        </div>
      </div>

      {/* Advanced Settings in Accordion */}
      <Accordion isCompact>
        <AccordionItem
          key="advanced"
          aria-label="Advanced settings"
          title={
            <span className="text-sm font-medium">{t('Advanced Settings')}</span>
          }
        >
          <div className="space-y-4 pt-2">
            {/* Lighting */}
            <Select
              label={t('Lighting')}
              selectedKeys={[settings.lighting]}
              onSelectionChange={(keys) => {
                const value = Array.from(keys)[0] as LightingPreset
                onSettingsChange({ lighting: value })
              }}
              size="sm"
            >
              {LIGHTING_PRESETS.map((preset) => (
                <SelectItem key={preset.value}>{preset.label}</SelectItem>
              ))}
            </Select>

            {/* Color Palette */}
            <Select
              label={t('Color Palette')}
              selectedKeys={[settings.colorPalette]}
              onSelectionChange={(keys) => {
                const value = Array.from(keys)[0] as ColorPalette
                onSettingsChange({ colorPalette: value })
              }}
              size="sm"
            >
              {COLOR_PALETTES.map((palette) => (
                <SelectItem key={palette.value}>{palette.label}</SelectItem>
              ))}
            </Select>

            {/* Composition */}
            <Select
              label={t('Composition')}
              selectedKeys={[settings.composition]}
              onSelectionChange={(keys) => {
                const value = Array.from(keys)[0] as CompositionPreset
                onSettingsChange({ composition: value })
              }}
              size="sm"
            >
              {COMPOSITIONS.map((comp) => (
                <SelectItem key={comp.value}>{comp.label}</SelectItem>
              ))}
            </Select>

            {/* Negative Prompt */}
            <Input
              label={t('Negative Prompt')}
              placeholder={t('What to avoid in the image...')}
              value={settings.negativePrompt || ''}
              onValueChange={(value) =>
                onSettingsChange({ negativePrompt: value || undefined })
              }
              size="sm"
            />

            {/* Guidance Scale */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                {t('Guidance Scale')}: {settings.guidanceScale || 7}
              </label>
              <Slider
                size="sm"
                step={0.5}
                minValue={1}
                maxValue={20}
                value={settings.guidanceScale || 7}
                onChange={(value) =>
                  onSettingsChange({ guidanceScale: value as number })
                }
                className="max-w-full"
              />
              <p className="text-xs text-default-400 mt-1">
                {t('Higher values follow prompt more closely')}
              </p>
            </div>

            {/* Seed */}
            <Input
              type="number"
              label={t('Seed (optional)')}
              placeholder={t('Random')}
              value={settings.seed?.toString() || ''}
              onValueChange={(value) =>
                onSettingsChange({
                  seed: value ? parseInt(value) : undefined,
                })
              }
              size="sm"
              description={t('Use same seed to reproduce results')}
            />
          </div>
        </AccordionItem>
      </Accordion>
    </div>
  )
}
