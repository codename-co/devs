/**
 * SpaceSection — Settings section for editing the current space.
 *
 * Displays (only for non-default spaces):
 *  - Space name
 *  - Space icon picker
 *  - Global system instructions (space-scoped)
 *  - Delete space action
 */

import { useState, useMemo, useCallback, useEffect, memo } from 'react'
import {
  Button,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ScrollShadow,
  Textarea,
  Tooltip,
} from '@heroui/react'
import { Icon, Icons } from '@/components/Icon'
import { useI18n } from '@/i18n'
import { useActiveSpace, updateSpace, deleteSpace } from '@/stores/spaceStore'
import { userSettings } from '@/stores/userStore'
import { useSpaceScopedSetting } from '../useSpaceScopedSetting'
import { useSetSettingsScope } from '../SettingsContext'
import { useHashHighlight } from '@/hooks/useHashHighlight'
import localI18n from '../i18n'
import type { IconName } from '@/lib/types'

// Popular icons for quick selection (space-relevant)
const POPULAR_ICONS: IconName[] = [
  'Cube',
  'Folder',
  'Book',
  'Code',
  'Brain',
  'Sparks',
  'LightBulbOn',
  'Rocket',
  'Star',
  'Heart',
  'Shield',
  'Strategy',
  'Crown',
  'Puzzle',
  'Palette',
  'Globe',
  'Database',
  'Server',
  'Terminal',
  'Calendar',
  'Camera',
  'Trophy',
  'User',
  'Mail',
]

const ALL_ICON_NAMES = Object.keys(Icons) as IconName[]

const IconButton = memo(
  ({
    iconName,
    isSelected,
    onSelect,
  }: {
    iconName: IconName
    isSelected: boolean
    onSelect: (name: IconName) => void
  }) => (
    <Tooltip content={iconName} delay={500} closeDelay={0}>
      <Button
        isIconOnly
        size="sm"
        variant={isSelected ? 'solid' : 'light'}
        color={isSelected ? 'primary' : 'default'}
        onPress={() => onSelect(iconName)}
        aria-label={iconName}
      >
        <Icon name={iconName} className="w-4 h-4" />
      </Button>
    </Tooltip>
  ),
)
IconButton.displayName = 'SpaceIconButton'

export function SpaceSection() {
  const { t } = useI18n(localI18n)
  const { getHighlightClasses } = useHashHighlight()
  const space = useActiveSpace()
  const setScope = useSetSettingsScope()

  // Force space scope while this section is active
  useEffect(() => {
    setScope('space')
    return () => setScope('global')
  }, [setScope])

  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false)
  const [iconSearch, setIconSearch] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Global system instructions — space-scopable
  const _globalSystemInstructions = userSettings(
    (state) => state.globalSystemInstructions ?? '',
  )
  const _setGlobalSystemInstructions = userSettings(
    (state) => state.setGlobalSystemInstructions,
  )
  const [globalSystemInstructions, setGlobalSystemInstructions] =
    useSpaceScopedSetting(
      'globalSystemInstructions',
      _globalSystemInstructions,
      _setGlobalSystemInstructions as (v: string | undefined) => void,
    )

  // Filter icons based on search
  const filteredIcons = useMemo(() => {
    if (!iconSearch.trim()) {
      const popularSet = new Set(POPULAR_ICONS)
      const others = ALL_ICON_NAMES.filter((name) => !popularSet.has(name))
      return [
        ...POPULAR_ICONS.filter((name) => ALL_ICON_NAMES.includes(name)),
        ...others,
      ]
    }
    const searchLower = iconSearch.toLowerCase()
    return ALL_ICON_NAMES.filter((name) =>
      name.toLowerCase().includes(searchLower),
    )
  }, [iconSearch])

  const displayedIcons = useMemo(() => {
    return filteredIcons.slice(0, 120)
  }, [filteredIcons])

  const handleIconSelect = useCallback(
    (iconName: IconName) => {
      updateSpace(space.id, { icon: iconName })
      setIsIconPickerOpen(false)
      setIconSearch('')
    },
    [space.id],
  )

  const handleNameChange = useCallback(
    (name: string) => {
      updateSpace(space.id, { name })
    },
    [space.id],
  )

  const handleDeleteSpace = useCallback(() => {
    deleteSpace(space.id)
    setShowDeleteConfirm(false)
  }, [space.id])

  return (
    <div data-testid="space-settings" className="space-y-8">
      {/* Space Identity */}
      <div>
        <h4 className="text-sm font-medium text-default-700 mb-4">
          {t('Space Identity')}
        </h4>

        <div className="flex items-start gap-4">
          {/* Icon picker */}
          <div
            id="space-icon"
            className={getHighlightClasses('space-icon')}
          >
            <Popover
              isOpen={isIconPickerOpen}
              onOpenChange={(open) => {
                setIsIconPickerOpen(open)
                if (!open) setIconSearch('')
              }}
              placement="bottom-start"
            >
              <PopoverTrigger>
                <Button
                  isIconOnly
                  variant="bordered"
                  size="lg"
                  aria-label={t('Space Icon')}
                  className="w-14 h-14"
                >
                  <Icon
                    name={space.icon ?? 'Cube'}
                    className="w-6 h-6"
                  />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="p-2 space-y-2">
                  <Input
                    size="sm"
                    placeholder={t('Search icons…')}
                    value={iconSearch}
                    onValueChange={setIconSearch}
                    startContent={
                      <Icon
                        name="Search"
                        className="w-4 h-4 text-default-400"
                      />
                    }
                    isClearable
                    onClear={() => setIconSearch('')}
                    autoFocus
                  />
                  <ScrollShadow className="max-h-64">
                    {displayedIcons.length > 0 ? (
                      <div className="grid grid-cols-8 gap-1">
                        {displayedIcons.map((iconName) => (
                          <IconButton
                            key={iconName}
                            iconName={iconName}
                            isSelected={space.icon === iconName}
                            onSelect={handleIconSelect}
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-default-400 text-center py-4">
                        {t('No icons found')}
                      </p>
                    )}
                  </ScrollShadow>
                  {iconSearch && filteredIcons.length > 120 && (
                    <p className="text-xs text-default-400 text-center">
                      Showing 120 of {filteredIcons.length} icons
                    </p>
                  )}
                  {space.icon && (
                    <Button
                      size="sm"
                      variant="light"
                      className="w-full"
                      onPress={() => {
                        updateSpace(space.id, { icon: undefined })
                        setIsIconPickerOpen(false)
                        setIconSearch('')
                      }}
                    >
                      {t('Reset to Default')}
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Space name */}
          <div className="flex-1">
            <Input
              id="space-name"
              label={t('Space Name')}
              placeholder={t('Enter a name for this space')}
              value={space.name}
              onChange={(e) => handleNameChange(e.target.value)}
              maxLength={60}
              className={getHighlightClasses('space-name', 'max-w-sm')}
            />
          </div>
        </div>
      </div>

      {/* Space Instructions */}
      <div>
        <h4 className="text-sm font-medium text-default-700 mb-3">
          {t('Instructions')}
        </h4>
        <div
          id="space-system-instructions"
          className={getHighlightClasses('space-system-instructions')}
        >
          <label className="text-sm font-medium text-default-600">
            {t('Global System Instructions')}
          </label>
          <p className="text-xs text-default-500 mb-2">
            {t(
              "These instructions will be prepended to every agent's instructions in this space",
            )}
          </p>
          <Textarea
            placeholder={t(
              'Enter global instructions that apply to all agents...',
            )}
            value={globalSystemInstructions}
            onChange={(e) =>
              setGlobalSystemInstructions(e.target.value || undefined)
            }
            minRows={3}
            maxRows={10}
          />
        </div>
      </div>

      {/* Danger Zone */}
      <div>
        <h4 className="text-sm font-medium text-danger mb-3">
          {t('Danger Zone')}
        </h4>
        <div className="border border-danger/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{t('Delete Space')}</p>
              <p className="text-xs text-default-500">
                {t(
                  'Permanently delete this space. Conversations and data will be moved to the default space.',
                )}
              </p>
            </div>
            {showDeleteConfirm ? (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="flat"
                  onPress={() => setShowDeleteConfirm(false)}
                >
                  {t('Cancel')}
                </Button>
                <Button
                  size="sm"
                  color="danger"
                  onPress={handleDeleteSpace}
                >
                  {t('Confirm Delete')}
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                color="danger"
                variant="flat"
                onPress={() => setShowDeleteConfirm(true)}
              >
                {t('Delete Space')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
