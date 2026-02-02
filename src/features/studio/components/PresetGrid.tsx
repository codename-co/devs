/**
 * PresetGrid Component
 *
 * Full grid view of all available presets for browsing and selection.
 */

import {
  Button,
  Card,
  CardBody,
  CardFooter,
  Input,
  Chip,
  Tabs,
  Tab,
} from '@heroui/react'
import { useState, useMemo } from 'react'

import { Icon } from '@/components/Icon'
import { type Lang, useI18n } from '@/i18n'
import { ImagePreset, PresetCategory } from '../types'

interface PresetGridProps {
  lang: Lang
  presets: ImagePreset[]
  customPresets: ImagePreset[]
  activePreset: ImagePreset | null
  onSelectPreset: (preset: ImagePreset) => void
  onDeletePreset?: (presetId: string) => void
  onClose?: () => void
}

const CATEGORY_CONFIG: Record<PresetCategory, { label: string; icon: string }> =
  {
    style: { label: 'Styles', icon: '🎨' },
    photography: { label: 'Photography', icon: '📸' },
    illustration: { label: 'Illustration', icon: '✏️' },
    'concept-art': { label: 'Concept Art', icon: '⚔️' },
    marketing: { label: 'Marketing', icon: '📢' },
    'social-media': { label: 'Social Media', icon: '📱' },
    custom: { label: 'My Presets', icon: '⭐' },
  }

export function PresetGrid({
  lang,
  presets,
  customPresets,
  activePreset,
  onSelectPreset,
  onDeletePreset,
  onClose: _onClose,
}: PresetGridProps) {
  const { t } = useI18n(lang as any)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  // Filter presets based on search and category
  const filteredPresets = useMemo(() => {
    let filtered = selectedCategory === 'custom' ? customPresets : presets

    if (selectedCategory !== 'all' && selectedCategory !== 'custom') {
      filtered = filtered.filter((preset) =>
        preset.tags?.some(
          (tag) =>
            CATEGORY_CONFIG[selectedCategory as PresetCategory]?.label
              .toLowerCase()
              .includes(tag) || tag.includes(selectedCategory),
        ),
      )
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (preset) =>
          preset.name.toLowerCase().includes(query) ||
          preset.description?.toLowerCase().includes(query) ||
          preset.tags?.some((tag) => tag.toLowerCase().includes(query)),
      )
    }

    return filtered
  }, [presets, customPresets, selectedCategory, searchQuery])

  // Group by primary tag for "All" view
  const groupedPresets = useMemo(() => {
    if (selectedCategory !== 'all') {
      return { [selectedCategory]: filteredPresets }
    }

    return filteredPresets.reduce(
      (acc, preset) => {
        const primaryTag = preset.tags?.[0] || 'other'
        if (!acc[primaryTag]) {
          acc[primaryTag] = []
        }
        acc[primaryTag].push(preset)
        return acc
      },
      {} as Record<string, ImagePreset[]>,
    )
  }, [filteredPresets, selectedCategory])

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <Input
        type="search"
        placeholder={t('Search presets...')}
        value={searchQuery}
        onValueChange={setSearchQuery}
        startContent={
          <Icon name="Search" size="sm" className="text-default-400" />
        }
        className="mb-4"
        size="sm"
        isClearable
        onClear={() => setSearchQuery('')}
      />

      {/* Category tabs */}
      <Tabs
        selectedKey={selectedCategory}
        onSelectionChange={(key) => setSelectedCategory(key as string)}
        className="mb-4"
        size="sm"
        variant="underlined"
      >
        <Tab key="all" title={t('All')} />
        <Tab
          key="photography"
          title={
            <span className="flex items-center gap-1">
              <span>📸</span>
              <span className="hidden sm:inline">{t('Photo')}</span>
            </span>
          }
        />
        <Tab
          key="art"
          title={
            <span className="flex items-center gap-1">
              <span>🎨</span>
              <span className="hidden sm:inline">{t('Art')}</span>
            </span>
          }
        />
        <Tab
          key="concept"
          title={
            <span className="flex items-center gap-1">
              <span>⚔️</span>
              <span className="hidden sm:inline">{t('Concept')}</span>
            </span>
          }
        />
        <Tab
          key="social"
          title={
            <span className="flex items-center gap-1">
              <span>📱</span>
              <span className="hidden sm:inline">{t('Social')}</span>
            </span>
          }
        />
        {customPresets.length > 0 && (
          <Tab
            key="custom"
            title={
              <span className="flex items-center gap-1">
                <span>⭐</span>
                <span className="hidden sm:inline">{t('Custom')}</span>
              </span>
            }
          />
        )}
      </Tabs>

      {/* Preset grid */}
      <div className="flex-1 overflow-y-auto">
        {Object.entries(groupedPresets).map(([category, categoryPresets]) => (
          <div key={category} className="mb-6">
            {selectedCategory === 'all' && (
              <h3 className="text-sm font-medium text-default-500 mb-3 capitalize">
                {category}
              </h3>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {categoryPresets.map((preset) => (
                <PresetCard
                  key={preset.id}
                  preset={preset}
                  isActive={activePreset?.id === preset.id}
                  onSelect={() => onSelectPreset(preset)}
                  onDelete={
                    !preset.isBuiltIn && onDeletePreset
                      ? () => onDeletePreset(preset.id)
                      : undefined
                  }
                  lang={lang}
                />
              ))}
            </div>
          </div>
        ))}

        {filteredPresets.length === 0 && (
          <div className="text-center py-12 text-default-400">
            <Icon name="Search" size="lg" className="mx-auto mb-2 opacity-50" />
            <p>{t('No presets found')}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Individual preset card component
function PresetCard({
  preset,
  isActive,
  onSelect,
  onDelete,
  lang: _lang,
}: {
  preset: ImagePreset
  isActive: boolean
  onSelect: () => void
  onDelete?: () => void
  lang: Lang
}) {
  // Generate a visual preview of the settings
  const settingsPreview = useMemo(() => {
    const { settings } = preset
    const previews: string[] = []

    if (settings.style && settings.style !== 'none') {
      previews.push(settings.style)
    }
    if (settings.aspectRatio) {
      previews.push(settings.aspectRatio)
    }
    if (settings.quality && settings.quality !== 'standard') {
      previews.push(settings.quality)
    }

    return previews.slice(0, 3)
  }, [preset.settings])

  return (
    <Card
      isPressable
      isHoverable
      className={`transition-all ${isActive ? 'ring-2 ring-primary' : ''}`}
      onPress={onSelect}
    >
      <CardBody className="p-3">
        <div className="flex items-start justify-between">
          <span className="text-2xl">{preset.icon || '🎨'}</span>
          {onDelete && (
            <Button
              isIconOnly
              variant="light"
              size="sm"
              className="opacity-0 group-hover:opacity-100 -mt-1 -mr-1"
              onPress={() => {
                onDelete()
              }}
            >
              <Icon name="Trash" size="sm" className="text-danger" />
            </Button>
          )}
        </div>
        <h4 className="font-medium text-sm mt-2 line-clamp-1">{preset.name}</h4>
        {preset.description && (
          <p className="text-xs text-default-400 mt-1 line-clamp-2">
            {preset.description}
          </p>
        )}
      </CardBody>
      <CardFooter className="pt-0 px-3 pb-3">
        <div className="flex flex-wrap gap-1">
          {settingsPreview.map((setting, idx) => (
            <Chip key={idx} size="sm" variant="flat" className="text-[10px]">
              {setting}
            </Chip>
          ))}
        </div>
      </CardFooter>
    </Card>
  )
}
