/**
 * PresetSelector Component
 *
 * Dropdown/popover for quick preset selection.
 */

import {
  Button,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  DropdownSection,
} from '@heroui/react'

import { Icon } from '@/components/Icon'
import { type Lang, useI18n } from '@/i18n'
import { ImagePreset } from '../types'

interface PresetSelectorProps {
  lang: Lang
  presets: ImagePreset[]
  activePreset: ImagePreset | null
  onSelectPreset: (presetId: string | null) => void
  onOpenPresetLibrary?: () => void
}

export function PresetSelector({
  lang,
  presets,
  activePreset,
  onSelectPreset,
  onOpenPresetLibrary,
}: PresetSelectorProps) {
  const { t } = useI18n(lang as any)

  // Group presets by category (using first tag)
  const groupedPresets = presets.reduce(
    (acc, preset) => {
      const category = preset.tags?.[0] || 'other'
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(preset)
      return acc
    },
    {} as Record<string, ImagePreset[]>,
  )

  // Show only first few of each category
  const popularPresets = Object.entries(groupedPresets)
    .slice(0, 4)
    .flatMap(([_, categoryPresets]) => categoryPresets.slice(0, 3))
    .slice(0, 8)

  return (
    <Dropdown
      placement="bottom-start"
      className="bg-white dark:bg-default-50 dark:text-white"
    >
      <DropdownTrigger>
        <Button
          radius="full"
          variant="light"
          size="sm"
          startContent={
            <Icon name="Sparks" size="sm" className="text-default-500" />
          }
        >
          <span className="text-xs truncate max-w-24">
            {activePreset
              ? `${activePreset.icon || ''} ${activePreset.name}`.trim()
              : t('Presets')}
          </span>
        </Button>
      </DropdownTrigger>
      <DropdownMenu
        aria-label="Image preset selection"
        selectionMode="single"
        selectedKeys={activePreset ? [activePreset.id] : []}
        onAction={(key) => {
          if (key === 'none') {
            onSelectPreset(null)
          } else if (key === 'library') {
            onOpenPresetLibrary?.()
          } else {
            onSelectPreset(key as string)
          }
        }}
        className="max-h-80 overflow-y-auto"
      >
        <DropdownSection title={t('Quick presets')} showDivider>
          {popularPresets.map((preset) => (
            <DropdownItem
              key={preset.id}
              startContent={
                <span className="text-lg">{preset.icon || '🎨'}</span>
              }
              description={preset.description}
              textValue={preset.name}
            >
              {preset.name}
            </DropdownItem>
          ))}
        </DropdownSection>

        <DropdownSection>
          <DropdownItem
            key="none"
            startContent={<Icon name="Xmark" size="sm" />}
            textValue={t('No preset')}
            className={!activePreset ? 'bg-default-100' : ''}
          >
            {t('No preset')}
          </DropdownItem>
          <DropdownItem
            key="library"
            startContent={<Icon name="Sparks" size="sm" />}
            textValue={t('Browse all presets')}
          >
            {t('Browse all presets')}
          </DropdownItem>
        </DropdownSection>
      </DropdownMenu>
    </Dropdown>
  )
}
