import {
  Button,
  Chip,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  DropdownSection,
  Image,
  Spinner,
} from '@heroui/react'
import { useCallback, useState } from 'react'

import { Icon } from '../Icon'
import { useScreenCapture } from './useScreenCapture'

import { type LanguageCode } from '@/i18n/locales'
import { type KnowledgeItem, type InstalledSkill } from '@/types'
import { getAllKnowledgeItems } from '@/stores/knowledgeStore'
import { getEnabledSkills } from '@/stores/skillStore'
import { getFileIcon } from '@/lib/utils'
import { formatBytes } from '@/lib/format'
import { useI18n } from '@/i18n'
import { getProviders } from '@/features/connectors'
import { useNavigate } from 'react-router-dom'

type ViewMode = 'main' | 'knowledge' | 'skills'

interface AttachmentSelectorProps {
  lang: LanguageCode
  onFileUpload: () => void
  onKnowledgeFileSelect: (item: KnowledgeItem) => void
  onSkillSelect?: (skill: InstalledSkill) => void
  onScreenCapture?: (file: File) => void
}

export function AttachmentSelector({
  lang,
  onFileUpload,
  onKnowledgeFileSelect,
  onSkillSelect,
  onScreenCapture,
}: AttachmentSelectorProps) {
  const { t } = useI18n(lang as any)
  const navigate = useNavigate()

  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([])
  const [loadingKnowledge, setLoadingKnowledge] = useState(false)
  const [isMainDropdownOpen, setIsMainDropdownOpen] = useState(false)
  const [skillItems, setSkillItems] = useState<InstalledSkill[]>([])
  // View mode: 'main' shows attachment options, 'knowledge' shows files, 'skills' shows skills
  const [viewMode, setViewMode] = useState<ViewMode>('main')

  // Screen capture hook
  const {
    isCapturing,
    isSupported: isScreenCaptureSupported,
    captureScreen,
  } = useScreenCapture({
    onCapture: (file) => {
      onScreenCapture?.(file)
      setIsMainDropdownOpen(false)
    },
  })

  const loadKnowledgeItems = useCallback(() => {
    setLoadingKnowledge(true)
    try {
      const items = getAllKnowledgeItems()
      // Only show files, not folders
      const fileItems = items.filter((item) => item.type === 'file')
      // Sort by most recently modified
      fileItems.sort(
        (a, b) =>
          new Date(b.lastModified).getTime() -
          new Date(a.lastModified).getTime(),
      )
      setKnowledgeItems(fileItems.slice(0, 20)) // Limit to 20 items for performance
    } catch (error) {
      console.error('Error loading knowledge items:', error)
      setKnowledgeItems([])
    } finally {
      setLoadingKnowledge(false)
    }
  }, [])

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

  const loadSkillItems = useCallback(() => {
    try {
      const items = getEnabledSkills()
      // Sort by name
      items.sort((a, b) => a.name.localeCompare(b.name))
      setSkillItems(items)
    } catch (error) {
      console.error('Error loading skills:', error)
      setSkillItems([])
    }
  }, [])

  const handleKnowledgeItemSelect = useCallback(
    (item: KnowledgeItem) => {
      onKnowledgeFileSelect(item)
      setIsMainDropdownOpen(false)
    },
    [onKnowledgeFileSelect],
  )

  const handleSkillSelect = useCallback(
    (skill: InstalledSkill) => {
      onSkillSelect?.(skill)
      setIsMainDropdownOpen(false)
    },
    [onSkillSelect],
  )

  const handleUpload = useCallback(() => {
    onFileUpload()
    setIsMainDropdownOpen(false)
  }, [onFileUpload])

  // Reset view mode when dropdown closes
  const handleDropdownOpenChange = useCallback((isOpen: boolean) => {
    setIsMainDropdownOpen(isOpen)
    if (!isOpen) {
      setViewMode('main')
    }
  }, [])

  // Render knowledge items for the drill-down view
  const renderKnowledgeItems = () => {
    if (loadingKnowledge) {
      return (
        <DropdownItem
          key="loading"
          isReadOnly
          textValue="Loading"
          className="cursor-default"
        >
          <div className="flex items-center gap-2 py-2">
            <Spinner size="sm" />
            <span className="text-default-500">
              {t('Loading agent and conversation…')}
            </span>
          </div>
        </DropdownItem>
      )
    }

    if (knowledgeItems.length === 0) {
      return (
        <DropdownItem
          key="empty"
          isReadOnly
          textValue="No files"
          className="cursor-default"
        >
          <div className="flex items-center gap-2 py-2 text-default-500 text-sm">
            <Icon name="QuestionMark" size="sm" />
            {t('No files found in knowledge base')}
          </div>
        </DropdownItem>
      )
    }

    return (
      <>
        {knowledgeItems.slice(0, 10).map((item) => (
          <DropdownItem
            key={item.id}
            startContent={renderKnowledgePreview(item)}
            endContent={
              <Chip size="sm" variant="flat" className="text-xs">
                {formatBytes(item.size || 0, lang)}
              </Chip>
            }
            textValue={item.name}
            closeOnSelect
            onPress={() => handleKnowledgeItemSelect(item)}
          >
            <div className="flex flex-col gap-0.5">
              <span className="font-medium truncate max-w-40">{item.name}</span>
              <span className="text-xs text-default-500 truncate max-w-40">
                {item.path.replace(/^\//, '')}
              </span>
            </div>
          </DropdownItem>
        ))}
      </>
    )
  }

  // Render the "Manage knowledge" footer item
  const renderManageKnowledge = () => (
    <DropdownItem
      key="manage-knowledge"
      startContent={<Icon name="Settings" size="sm" />}
      textValue={t('Manage knowledge')}
      closeOnSelect
      onPress={() => {
        navigate(`${location.pathname}#settings/knowledge`)
        setIsMainDropdownOpen(false)
      }}
    >
      {t('Manage knowledge')}
    </DropdownItem>
  )

  // Render skill items for the drill-down view
  const renderSkillItems = () => {
    if (skillItems.length === 0) {
      return (
        <DropdownItem
          key="empty"
          isReadOnly
          textValue="No skills"
          className="cursor-default"
        >
          <div className="flex items-center gap-2 py-2 text-default-500 text-sm">
            <Icon name="QuestionMark" size="sm" />
            {t('No skills installed')}
          </div>
        </DropdownItem>
      )
    }

    return (
      <>
        {skillItems.map((skill) => (
          <DropdownItem
            key={skill.id}
            startContent={<Icon name="Puzzle" size="sm" />}
            textValue={skill.name}
            closeOnSelect
            onPress={() => handleSkillSelect(skill)}
          >
            <div className="flex flex-col gap-0.5">
              <span className="font-medium truncate max-w-48">
                {skill.name}
              </span>
              <span className="text-xs text-default-500 truncate max-w-48">
                {skill.description}
              </span>
            </div>
          </DropdownItem>
        ))}
      </>
    )
  }

  // Render the "Manage skills" footer item
  const renderManageSkills = () => (
    <DropdownItem
      key="manage-skills"
      startContent={<Icon name="Settings" size="sm" />}
      textValue={t('Manage skills')}
      closeOnSelect
      onPress={() => {
        navigate(`${location.pathname}#settings/skills`)
        setIsMainDropdownOpen(false)
      }}
    >
      {t('Manage skills')}
    </DropdownItem>
  )

  return (
    <>
      <Dropdown
        placement="bottom-start"
        className="bg-white dark:bg-default-50 dark:text-white"
        isOpen={isMainDropdownOpen}
        onOpenChange={handleDropdownOpenChange}
      >
        <DropdownTrigger>
          <Button isIconOnly radius="md" variant="bordered" size="sm">
            <Icon name="Plus" />
          </Button>
        </DropdownTrigger>
        <DropdownMenu
          aria-label="File attachment options"
          selectionMode="none"
          closeOnSelect={false}
          className="max-h-80 overflow-y-auto w-64"
        >
          {viewMode === 'main' ? (
            <>
              <DropdownSection>
                <DropdownItem
                  key="upload"
                  startContent={<Icon name="Attachment" size="sm" />}
                  onPress={handleUpload}
                  closeOnSelect
                >
                  {t('Upload new file')}
                </DropdownItem>
                <DropdownItem
                  key="knowledge"
                  startContent={<Icon name="Folder" size="sm" />}
                  endContent={
                    <Icon
                      name="NavArrowRight"
                      size="sm"
                      className="text-default-400"
                    />
                  }
                  textValue={t('Choose from knowledge base')}
                  closeOnSelect={false}
                  onPress={() => {
                    loadKnowledgeItems()
                    setViewMode('knowledge')
                  }}
                >
                  {t('Choose from knowledge base')}
                </DropdownItem>
                <DropdownItem
                  key="skills"
                  startContent={<Icon name="Puzzle" size="sm" />}
                  endContent={
                    <Icon
                      name="NavArrowRight"
                      size="sm"
                      className="text-default-400"
                    />
                  }
                  textValue={t('Choose from skills')}
                  closeOnSelect={false}
                  onPress={() => {
                    loadSkillItems()
                    setViewMode('skills')
                  }}
                >
                  {t('Choose from skills')}
                </DropdownItem>
                {isScreenCaptureSupported ? (
                  <DropdownItem
                    key="screenshot"
                    startContent={
                      isCapturing ? (
                        <Spinner size="sm" />
                      ) : (
                        <Icon name="Screenshot" size="sm" />
                      )
                    }
                    isDisabled={isCapturing}
                    onPress={captureScreen}
                    closeOnSelect
                  >
                    {isCapturing ? t('Capturing…') : t('Capture screen')}
                  </DropdownItem>
                ) : null}
                <DropdownItem
                  key="connectors"
                  startContent={<Icon name="Plus" size="sm" />}
                  endContent={
                    <div className="flex items-center -space-x-0.5">
                      {getProviders()
                        .slice(0, 4)
                        .map((provider, index) => (
                          <div
                            key={provider.name}
                            className="w-5 h-5 rounded-full bg-white dark:bg-default-100 flex items-center justify-center border border-default-200 -ml-1.5"
                            style={{
                              zIndex: getProviders().length - index,
                            }}
                          >
                            <Icon
                              name={provider.icon as any}
                              className="w-3 h-3"
                            />
                          </div>
                        ))}
                    </div>
                  }
                  textValue={t('Add connectors')}
                  closeOnSelect
                  onPress={() => {
                    navigate(`${location.pathname}#settings/connectors/add`)
                    setIsMainDropdownOpen(false)
                  }}
                >
                  {t('Add connectors')}
                </DropdownItem>
              </DropdownSection>
            </>
          ) : (
            <>
              <DropdownSection showDivider>
                <DropdownItem
                  key="back"
                  startContent={<Icon name="ArrowLeft" size="sm" />}
                  textValue={t('Back')}
                  closeOnSelect={false}
                  onPress={() => setViewMode('main')}
                >
                  <span className="font-medium">
                    {viewMode === 'knowledge'
                      ? t('Choose from knowledge base')
                      : t('Choose from skills')}
                  </span>
                </DropdownItem>
              </DropdownSection>
              <DropdownSection showDivider>
                {viewMode === 'knowledge'
                  ? renderKnowledgeItems()
                  : renderSkillItems()}
              </DropdownSection>
              <DropdownSection>
                {viewMode === 'knowledge'
                  ? renderManageKnowledge()
                  : renderManageSkills()}
              </DropdownSection>
            </>
          )}
        </DropdownMenu>
      </Dropdown>
    </>
  )
}
