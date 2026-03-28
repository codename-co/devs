import { Button, Chip, Input, ListBox, Popover, Spinner } from '@heroui/react'
import { useCallback, useEffect, useMemo, useState } from 'react'

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
  const [knowledgeSearch, setKnowledgeSearch] = useState('')
  const [skillsSearch, setSkillsSearch] = useState('')
  const [knowledgeCount, setKnowledgeCount] = useState(0)
  const [skillsCount, setSkillsCount] = useState(0)

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

  // Load counts when popover opens, reset on close
  useEffect(() => {
    if (isOpen) {
      try {
        const items = getAllKnowledgeItems()
        setKnowledgeCount(items.filter((item) => item.type === 'file').length)
      } catch {
        setKnowledgeCount(0)
      }
      try {
        setSkillsCount(getEnabledSkills().length)
      } catch {
        setSkillsCount(0)
      }
    } else {
      setPanelView('main')
      setKnowledgeSearch('')
      setSkillsSearch('')
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
      setKnowledgeItems(fileItems.slice(0, 50))
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

  // Filtered lists for sub-views
  const filteredKnowledgeItems = useMemo(() => {
    if (!knowledgeSearch.trim()) return knowledgeItems
    const q = knowledgeSearch.toLowerCase()
    return knowledgeItems.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.path.toLowerCase().includes(q) ||
        (item.tags && item.tags.some((tag) => tag.toLowerCase().includes(q))),
    )
  }, [knowledgeItems, knowledgeSearch])

  const filteredSkillItems = useMemo(() => {
    if (!skillsSearch.trim()) return skillItems
    const q = skillsSearch.toLowerCase()
    return skillItems.filter(
      (skill) =>
        skill.name.toLowerCase().includes(q) ||
        skill.description.toLowerCase().includes(q),
    )
  }, [skillItems, skillsSearch])

  const renderKnowledgePreview = useCallback((item: KnowledgeItem) => {
    if (
      item.fileType === 'image' &&
      typeof item.content === 'string' &&
      item.content.startsWith('data:image/')
    ) {
      return (
        <img
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
        variant="ghost"
        size="sm"
        startContent={<Icon name="ArrowLeft" size="sm" />}
        onPress={() => setPanelView('main')}
        className="justify-start text-default-500 px-1"
      >
        <span className="font-medium">{t('Choose from knowledge base')}</span>
      </Button>

      {knowledgeItems.length > 5 && (
        <Input
          size="sm"
          placeholder={t('Filter files…')}
          value={knowledgeSearch}
          onValueChange={setKnowledgeSearch}
          startContent={
            <Icon name="Search" size="xs" className="text-default-400" />
          }
          isClearable
          onClear={() => setKnowledgeSearch('')}
          classNames={{ inputWrapper: 'h-8' }}
          autoFocus
        />
      )}

      <div className="max-h-60 overflow-y-auto -mx-1 px-1">
        {loadingKnowledge ? (
          <div className="flex items-center justify-center py-6">
            <Spinner size="sm" />
          </div>
        ) : filteredKnowledgeItems.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <Icon name="Folder" size="lg" className="text-default-300" />
            <span className="text-default-400 text-sm">
              {knowledgeSearch
                ? t('No matching files')
                : t('No files found in knowledge base')}
            </span>
            {!knowledgeSearch && (
              <Button
                size="sm"
                variant="secondary"
                onPress={() => {
                  navigate(`${location.pathname}#settings/knowledge`)
                  setIsOpen(false)
                }}
              >
                {t('Add files')}
              </Button>
            )}
          </div>
        ) : (
          <ListBox
            aria-label={t('Choose from knowledge base')}
            onAction={(key) => {
              const item = knowledgeItems.find((i) => i.id === key)
              if (item) {
                onKnowledgeFileSelect(item)
                setIsOpen(false)
              }
            }}
          >
            {filteredKnowledgeItems.slice(0, 20).map((item) => (
              <ListBox.Item
                id={item.id}
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
              </ListBox.Item>
            ))}
          </ListBox>
        )}
      </div>

      <Button
        variant="ghost"
        size="sm"
        startContent={<Icon name="Settings" size="sm" />}
        onPress={() => {
          navigate(`${location.pathname}#settings/knowledge`)
          setIsOpen(false)
        }}
        className="justify-start text-default-400 text-xs px-1 mt-1"
      >
        {t('Manage knowledge')}
      </Button>
    </div>
  )

  // --- Sub-views: Skills browser ---
  const renderSkillsBrowser = () => (
    <div className="flex flex-col gap-2">
      <Button
        variant="ghost"
        size="sm"
        startContent={<Icon name="ArrowLeft" size="sm" />}
        onPress={() => setPanelView('main')}
        className="justify-start text-default-500 px-1"
      >
        <span className="font-medium">{t('Choose from skills')}</span>
      </Button>

      {skillItems.length > 5 && (
        <Input
          size="sm"
          placeholder={t('Filter skills…')}
          value={skillsSearch}
          onValueChange={setSkillsSearch}
          startContent={
            <Icon name="Search" size="xs" className="text-default-400" />
          }
          isClearable
          onClear={() => setSkillsSearch('')}
          classNames={{ inputWrapper: 'h-8' }}
          autoFocus
        />
      )}

      <div className="max-h-60 overflow-y-auto -mx-1 px-1">
        {filteredSkillItems.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <Icon name="Puzzle" size="lg" className="text-default-300" />
            <span className="text-default-400 text-sm">
              {skillsSearch
                ? t('No matching skills')
                : t('No skills installed')}
            </span>
            {!skillsSearch && (
              <Button
                size="sm"
                variant="secondary"
                onPress={() => {
                  navigate(`${location.pathname}#settings/skills`)
                  setIsOpen(false)
                }}
              >
                {t('Browse skills')}
              </Button>
            )}
          </div>
        ) : (
          <ListBox
            aria-label={t('Choose from skills')}
            onAction={(key) => {
              const skill = skillItems.find((s) => s.id === key)
              if (skill) {
                onSkillSelect?.(skill)
                setIsOpen(false)
              }
            }}
          >
            {filteredSkillItems.map((skill) => (
              <ListBox.Item
                id={skill.id}
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
              </ListBox.Item>
            ))}
          </ListBox>
        )}
      </div>

      <Button
        variant="ghost"
        size="sm"
        startContent={<Icon name="Settings" size="sm" />}
        onPress={() => {
          navigate(`${location.pathname}#settings/skills`)
          setIsOpen(false)
        }}
        className="justify-start text-default-400 text-xs px-1 mt-1"
      >
        {t('Manage skills')}
      </Button>
    </div>
  )

  // --- Main panel ---
  const renderMainPanel = () => {
    const providers = getProviders()

    // Mode items for the Create section
    const modeItems: { key: PromptMode; icon: IconName; label: string }[] = [
      { key: 'studio', icon: 'MediaImagePlus', label: t('Media') },
      { key: 'app', icon: 'Code', label: t('Web') },
      { key: 'agent', icon: 'Sparks', label: t('Agent') },
    ]

    // Connectors avatar stack or icon
    const connectorsStart =
      providers.length > 0 ? (
        <div className="flex items-center">
          {providers.slice(0, 3).map((provider, index) => (
            <div
              key={provider.name}
              className="w-5 h-5 rounded-full bg-white dark:bg-default-100 flex items-center justify-center border border-default-200 dark:border-default-700 -ml-1 first:ml-0"
              style={{ zIndex: providers.length - index }}
            >
              <Icon name={provider.icon as IconName} size="xs" />
            </div>
          ))}
        </div>
      ) : (
        <Icon name="EvPlug" size="sm" className="text-default-400" />
      )

    return (
      <div className="flex flex-col">
        {/* CREATE section — mode radio group */}
        {onModeChange && (
          <ListBox
            aria-label={t('Create')}
            variant="flat"
            classNames={{ base: 'w-full', list: 'w-full' }}
            onAction={(key) => {
              const newMode = key as PromptMode
              onModeChange?.(mode === newMode ? 'chat' : newMode)
            }}
          >
            <ListBox.Section
              classNames={{
                heading: 'hidden',
                base: 'w-full',
                group: 'w-full grid grid-cols-3',
              }}
            >
              {modeItems.map((item) => (
                <ListBox.Item
                  id={item.key}
                  textValue={item.label}
                  classNames={{
                    base: `flex-col items-center justify-center gap-1 py-2.5 px-1 text-center ${mode === item.key ? 'bg-primary-50 dark:bg-primary-900/30' : ''}`,
                    title: `text-xs ${mode === item.key ? 'text-primary-600 dark:text-primary-400 font-semibold' : ''}`,
                  }}
                >
                  {item.label}
                </ListBox.Item>
              ))}
            </ListBox.Section>
          </ListBox>
        )}

        {/* ATTACH + EXTEND section */}
        <ListBox
          aria-label={t('Attach')}
          variant="flat"
          classNames={{ list: 'gap-0' }}
          onAction={(key) => {
            switch (key) {
              case 'upload':
                onFileUpload()
                setIsOpen(false)
                break
              case 'knowledge':
                loadKnowledgeItems()
                setPanelView('knowledge')
                break
              case 'screenshot':
                captureScreen()
                break
              case 'skills':
                loadSkillItems()
                setPanelView('skills')
                break
              case 'connectors':
                navigate(`${location.pathname}#settings/connectors`)
                setIsOpen(false)
                break
            }
          }}
        >
          <ListBox.Section classNames={{ heading: 'hidden' }}>
            <ListBox.Item
              id="upload"
              textValue={t('Upload new file')}
            >
              {t('Upload new file')}
            </ListBox.Item>
            {knowledgeCount > 0 ? (
              <ListBox.Item
                id="knowledge"
                textValue={t('Knowledge')}
              >
                {t('Knowledge')}
              </ListBox.Item>
            ) : (
              <ListBox.Item
                id="knowledge-empty"
                className="hidden"
                textValue=""
              >
                {''}
              </ListBox.Item>
            )}
            {isScreenCaptureSupported ? (
              <ListBox.Item
                id="screenshot"
                isDisabled={isCapturing}
                textValue={t('Capture screen')}
              >
                {t('Capture screen')}
              </ListBox.Item>
            ) : (
              <ListBox.Item
                id="screenshot-unsupported"
                className="hidden"
                textValue=""
              >
                {''}
              </ListBox.Item>
            )}
          </ListBox.Section>

          <ListBox.Section classNames={{ heading: 'hidden' }}>
            <ListBox.Item
              id="skills"
              textValue={t('Skills')}
            >
              {t('Skills')}
            </ListBox.Item>
            <ListBox.Item
              id="connectors"
              textValue={t('Connectors')}
            >
              {t('Connectors')}
            </ListBox.Item>
          </ListBox.Section>
        </ListBox>
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
      <Popover.Trigger>
        <Button isIconOnly radius="md" variant="outline" size="sm">
          <Icon name="Plus" />
        </Button>
      </Popover.Trigger>
      <Popover.Content className="p-1 w-64 bg-white dark:bg-default-50">
        {panelView === 'main' && renderMainPanel()}
        {panelView === 'knowledge' && renderKnowledgeBrowser()}
        {panelView === 'skills' && renderSkillsBrowser()}
      </Popover.Content>
    </Popover>
  )
}
