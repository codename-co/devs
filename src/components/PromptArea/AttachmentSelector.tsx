import {
  Button,
  Card,
  CardBody,
  Chip,
  Image,
  Listbox,
  ListboxItem,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Spinner,
} from '@heroui/react'
import { useCallback, useEffect, useState } from 'react'

import { Icon } from '../Icon'
import type { IconName } from '@/lib/types'
import { useScreenCapture } from './useScreenCapture'
import type { PromptMode } from './index'

import { type LanguageCode } from '@/i18n/locales'
import { type KnowledgeItem, type InstalledSkill } from '@/types'
import { getAllKnowledgeItems } from '@/stores/knowledgeStore'
import { getEnabledSkills } from '@/stores/skillStore'
import { getFileIcon } from '@/lib/utils'
import { formatBytes } from '@/lib/format'
import { useI18n } from '@/i18n'
import { getProviders } from '@/features/connectors'
import { useNavigate } from 'react-router-dom'

type PanelView = 'main' | 'knowledge' | 'skills'

interface AttachmentSelectorProps {
  lang: LanguageCode
  mode?: PromptMode
  onModeChange?: (mode: PromptMode) => void
  onFileUpload: () => void
  onKnowledgeFileSelect: (item: KnowledgeItem) => void
  onSkillSelect?: (skill: InstalledSkill) => void
  onScreenCapture?: (file: File) => void
}

// Grid tile component for consistent styling
function GridTile({
  icon,
  label,
  onPress,
  isActive,
  color,
  isDisabled,
  isLoading,
}: {
  icon: IconName
  label: string
  onPress: () => void
  isActive?: boolean
  color?: 'secondary' | 'warning' | 'success' | 'primary' | 'default'
  isDisabled?: boolean
  isLoading?: boolean
}) {
  const activeColors: Record<string, string> = {
    secondary:
      'bg-secondary-50 dark:bg-secondary-900/30 border-secondary-200 dark:border-secondary-700 text-secondary-600 dark:text-secondary-400',
    warning:
      'bg-warning-50 dark:bg-warning-900/30 border-warning-200 dark:border-warning-700 text-warning-600 dark:text-warning-400',
    success:
      'bg-success-50 dark:bg-success-900/30 border-success-200 dark:border-success-700 text-success-600 dark:text-success-400',
    primary:
      'bg-primary-50 dark:bg-primary-900/30 border-primary-200 dark:border-primary-700 text-primary-600 dark:text-primary-400',
  }

  return (
    <Card
      isPressable
      isDisabled={isDisabled}
      onPress={onPress}
      className={`
        border transition-all duration-150 select-none
        ${isActive && color ? activeColors[color] : 'border-default-200'}
        ${isDisabled ? 'opacity-40' : ''}
      `}
      shadow="none"
    >
      <CardBody className="flex flex-col items-center justify-center gap-1.5 p-3 overflow-hidden">
        {isLoading ? (
          <Spinner size="sm" />
        ) : (
          <Icon
            name={icon}
            size="md"
            color={color}
            className={`text-${color}-500 dark:text-${color}-400 -mb-1 opacity-30`}
            // className={!isActive ? 'text-default-500' : ''}
          />
        )}
        <span
          className={`text-xs font-medium leading-tight text-center ${!isActive ? 'text-default-600 dark:text-default-400' : ''}`}
        >
          {label}
        </span>
      </CardBody>
    </Card>
  )
}

export function AttachmentSelector({
  lang,
  mode,
  onModeChange,
  onFileUpload,
  onKnowledgeFileSelect,
  onSkillSelect,
  onScreenCapture,
}: AttachmentSelectorProps) {
  const { t } = useI18n(lang as any)
  const navigate = useNavigate()

  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([])
  const [loadingKnowledge, setLoadingKnowledge] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [skillItems, setSkillItems] = useState<InstalledSkill[]>([])
  const [panelView, setPanelView] = useState<PanelView>('main')

  // Screen capture hook
  const {
    isCapturing,
    isSupported: isScreenCaptureSupported,
    captureScreen,
  } = useScreenCapture({
    onCapture: (file) => {
      onScreenCapture?.(file)
      setIsOpen(false)
    },
  })

  // Reset view when popover closes
  useEffect(() => {
    if (!isOpen) {
      setPanelView('main')
    }
  }, [isOpen])

  const loadKnowledgeItems = useCallback(() => {
    setLoadingKnowledge(true)
    try {
      const items = getAllKnowledgeItems()
      const fileItems = items.filter((item) => item.type === 'file')
      fileItems.sort(
        (a, b) =>
          new Date(b.lastModified).getTime() -
          new Date(a.lastModified).getTime(),
      )
      setKnowledgeItems(fileItems.slice(0, 20))
    } catch (error) {
      console.error('Error loading knowledge items:', error)
      setKnowledgeItems([])
    } finally {
      setLoadingKnowledge(false)
    }
  }, [])

  const loadSkillItems = useCallback(() => {
    try {
      const items = getEnabledSkills()
      items.sort((a, b) => a.name.localeCompare(b.name))
      setSkillItems(items)
    } catch (error) {
      console.error('Error loading skills:', error)
      setSkillItems([])
    }
  }, [])

  const handleModeToggle = useCallback(
    (newMode: PromptMode) => {
      onModeChange?.(mode === newMode ? 'chat' : newMode)
    },
    [mode, onModeChange],
  )

  const renderKnowledgePreview = useCallback((item: KnowledgeItem) => {
    if (
      item.fileType === 'image' &&
      typeof item.content === 'string' &&
      item.content.startsWith('data:image/')
    ) {
      return (
        <Image
          src={item.content}
          alt={item.name}
          className="w-6 h-6 rounded object-cover"
          loading="lazy"
        />
      )
    }
    return <Icon name={getFileIcon(item.mimeType || '') as any} size="sm" />
  }, [])

  // --- Sub-views: Knowledge browser ---
  const renderKnowledgeBrowser = () => (
    <div className="flex flex-col gap-2">
      <Button
        variant="light"
        size="sm"
        startContent={<Icon name="ArrowLeft" size="sm" />}
        onPress={() => setPanelView('main')}
        className="justify-start text-default-500 px-1"
      >
        <span className="font-medium">{t('Choose from knowledge base')}</span>
      </Button>

      <div className="max-h-52 overflow-y-auto -mx-1 px-1">
        {loadingKnowledge ? (
          <div className="flex items-center justify-center py-6">
            <Spinner size="sm" />
          </div>
        ) : knowledgeItems.length === 0 ? (
          <div className="flex items-center gap-2 py-4 text-default-400 text-sm justify-center">
            <Icon name="QuestionMark" size="sm" />
            {t('No files found in knowledge base')}
          </div>
        ) : (
          <Listbox
            aria-label={t('Choose from knowledge base')}
            onAction={(key) => {
              const item = knowledgeItems.find((i) => i.id === key)
              if (item) {
                onKnowledgeFileSelect(item)
                setIsOpen(false)
              }
            }}
          >
            {knowledgeItems.slice(0, 10).map((item) => (
              <ListboxItem
                key={item.id}
                startContent={renderKnowledgePreview(item)}
                endContent={
                  <Chip size="sm" variant="flat" className="text-xs shrink-0">
                    {formatBytes(item.size || 0, lang)}
                  </Chip>
                }
                textValue={item.name}
              >
                <div className="flex flex-col gap-0 min-w-0">
                  <span className="text-sm font-medium truncate">
                    {item.name}
                  </span>
                  <span className="text-xs text-default-400 truncate">
                    {item.path.replace(/^\//, '')}
                  </span>
                </div>
              </ListboxItem>
            ))}
          </Listbox>
        )}
      </div>

      <Button
        variant="light"
        size="sm"
        startContent={<Icon name="Settings" size="sm" />}
        onPress={() => {
          navigate(`${location.pathname}#settings/knowledge`)
          setIsOpen(false)
        }}
        className="justify-start text-default-400 text-xs px-1 border-t border-default-100 dark:border-default-800 rounded-none pt-2"
      >
        {t('Manage knowledge')}
      </Button>
    </div>
  )

  // --- Sub-views: Skills browser ---
  const renderSkillsBrowser = () => (
    <div className="flex flex-col gap-2">
      <Button
        variant="light"
        size="sm"
        startContent={<Icon name="ArrowLeft" size="sm" />}
        onPress={() => setPanelView('main')}
        className="justify-start text-default-500 px-1"
      >
        <span className="font-medium">{t('Choose from skills')}</span>
      </Button>

      <div className="max-h-52 overflow-y-auto -mx-1 px-1">
        {skillItems.length === 0 ? (
          <div className="flex items-center gap-2 py-4 text-default-400 text-sm justify-center">
            <Icon name="QuestionMark" size="sm" />
            {t('No skills installed')}
          </div>
        ) : (
          <Listbox
            aria-label={t('Choose from skills')}
            onAction={(key) => {
              const skill = skillItems.find((s) => s.id === key)
              if (skill) {
                onSkillSelect?.(skill)
                setIsOpen(false)
              }
            }}
          >
            {skillItems.map((skill) => (
              <ListboxItem
                key={skill.id}
                startContent={
                  <Icon
                    name="Puzzle"
                    size="sm"
                    className="text-default-500 shrink-0"
                  />
                }
                textValue={skill.name}
              >
                <div className="flex flex-col gap-0 min-w-0">
                  <span className="text-sm font-medium truncate">
                    {skill.name}
                  </span>
                  <span className="text-xs text-default-400 truncate">
                    {skill.description}
                  </span>
                </div>
              </ListboxItem>
            ))}
          </Listbox>
        )}
      </div>

      <Button
        variant="light"
        size="sm"
        startContent={<Icon name="Settings" size="sm" />}
        onPress={() => {
          navigate(`${location.pathname}#settings/skills`)
          setIsOpen(false)
        }}
        className="justify-start text-default-400 text-xs px-1 border-t border-default-100 dark:border-default-800 rounded-none pt-2"
      >
        {t('Manage skills')}
      </Button>
    </div>
  )

  // --- Main grid panel ---
  const renderMainPanel = () => {
    const providers = getProviders()

    return (
      <div className="flex flex-col gap-3">
        {/* CREATE section — mode selectors in a 3-col grid */}
        {onModeChange && (
          <div className="flex flex-col gap-1.5">
            {/* <span className="text-[10px] font-semibold uppercase tracking-wider text-default-400 px-0.5">
              {t('Create')}
            </span> */}
            <div className="grid grid-cols-3 gap-1.5">
              <GridTile
                icon="MediaImagePlus"
                label={t('Media')}
                onPress={() => handleModeToggle('studio')}
                isActive={mode === 'studio'}
                // color="secondary"
              />
              <GridTile
                icon="Code"
                label={t('Web')}
                onPress={() => handleModeToggle('app')}
                isActive={mode === 'app'}
                // color="warning"
              />
              <GridTile
                icon="Sparks"
                label={t('Agent')}
                onPress={() => handleModeToggle('agent')}
                isActive={mode === 'agent'}
                // color="success"
              />
            </div>
          </div>
        )}

        {/* ATTACH section — file sources in a row */}
        <div className="flex flex-col gap-1.5">
          {/* <span className="text-[10px] font-semibold uppercase tracking-wider text-default-400 px-0.5">
            {t('Attach a file or image')}
          </span> */}
          <div
            className={`grid gap-1.5 ${isScreenCaptureSupported ? 'grid-cols-3' : 'grid-cols-2'}`}
          >
            <GridTile
              icon="Attachment"
              label={t('Upload new file')}
              onPress={() => {
                onFileUpload()
                setIsOpen(false)
              }}
            />
            <GridTile
              icon="Folder"
              label={t('Knowledge')}
              onPress={() => {
                loadKnowledgeItems()
                setPanelView('knowledge')
              }}
            />
            {isScreenCaptureSupported && (
              <GridTile
                icon="Screenshot"
                label={t('Capture screen')}
                onPress={captureScreen}
                isDisabled={isCapturing}
                isLoading={isCapturing}
              />
            )}
          </div>
        </div>

        {/* SKILLS + CONNECTORS section — compact row */}
        <div className="flex flex-col gap-1.5">
          {/* <span className="text-[10px] font-semibold uppercase tracking-wider text-default-400 px-0.5">
            {t('Skills')} & {t('Connectors')}
          </span> */}
          <div className="grid grid-cols-2 gap-1.5">
            <GridTile
              icon="Puzzle"
              label={t('Skills')}
              onPress={() => {
                loadSkillItems()
                setPanelView('skills')
              }}
            />
            <Card
              isPressable
              onPress={() => {
                navigate(`${location.pathname}#settings/connectors/add`)
                setIsOpen(false)
              }}
              className="border border-default-200 dark:border-default-700 transition-all duration-150 select-none"
              shadow="none"
            >
              <CardBody className="flex flex-col items-center justify-center gap-1.5 p-3">
                {providers.length > 0 ? (
                  <div className="flex items-center justify-center">
                    {providers.slice(0, 4).map((provider, index) => (
                      <div
                        key={provider.name}
                        className="w-6 h-6 rounded-full bg-white dark:bg-default-100 flex items-center justify-center border border-default-200 dark:border-default-700 -ml-1.5 first:ml-0"
                        style={{ zIndex: providers.length - index }}
                      >
                        <Icon name={provider.icon as IconName} size="xs" />
                      </div>
                    ))}
                    <div
                      className="w-6 h-6 rounded-full bg-default-100 dark:bg-default-800 flex items-center justify-center border border-default-200 dark:border-default-700 -ml-1.5"
                      style={{ zIndex: 0 }}
                    >
                      <Icon
                        name="Plus"
                        size="sm"
                        className="text-default-400"
                      />
                    </div>
                  </div>
                ) : (
                  <Icon name="EvPlug" size="lg" className="text-default-500" />
                )}
                <span className="text-xs font-medium text-default-600 dark:text-default-400">
                  {t('Connectors')}
                </span>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Popover
      placement="bottom-start"
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      shouldBlockScroll={false}
    >
      <PopoverTrigger>
        <Button isIconOnly radius="md" variant="bordered" size="sm">
          <Icon name="Plus" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-3 w-72 bg-white dark:bg-default-50">
        {panelView === 'main' && renderMainPanel()}
        {panelView === 'knowledge' && renderKnowledgeBrowser()}
        {panelView === 'skills' && renderSkillsBrowser()}
      </PopoverContent>
    </Popover>
  )
}
