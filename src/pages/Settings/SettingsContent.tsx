import { useEffect, useState } from 'react'
import {
  Button,
  Card,
  CardBody,
  Input,
  Tabs,
  Tab,
  Tooltip,
} from '@heroui/react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useI18n } from '@/i18n'
import { SecureStorage } from '@/lib/crypto'
import { Icon } from '@/components'
import { errorToast, successToast } from '@/lib/toast'
import { useHashHighlight } from '@/hooks/useHashHighlight'
import localI18n from './i18n'
import {
  AgentMemoriesSection,
  ConnectorsSection,
  DeviceSection,
  FeaturesSection,
  GeneralSection,
  LangfuseSection,
  PinnedMessagesSection,
  ProvidersSection,
  SecuritySection,
  SkillsSection,
  TracesSection,
} from './components'
import { FilesSection } from '@/pages/Knowledge/components'
import { IconName } from '@/lib/types'

type SectionKey =
  | 'general'
  | 'providers'
  | 'connectors'
  | 'features'
  | 'skills'
  | 'knowledge'
  | 'memories'
  | 'messages'
  | 'security'
  | 'computer'
  | 'langfuse'
  | 'traces'
  | 'database'

type SectionGroup = 'configure' | 'personalize' | 'extend' | 'observe'

interface SectionDef {
  key: SectionKey
  label: string
  icon: IconName
  group: SectionGroup
  navigateTo?: string
}

interface SectionGroupDef {
  key: SectionGroup
  label: string
}

interface SettingsContentProps {
  isModal?: boolean
}

export const SettingsContent = (_props: SettingsContentProps) => {
  const { t } = useI18n(localI18n)
  const navigate = useNavigate()
  const location = useLocation()

  const [masterPassword, setMasterPassword] = useState('')
  const [isUnlocking, setIsUnlocking] = useState(false)

  // All section keys for hash matching
  const allSectionKeys: SectionKey[] = [
    'general',
    'providers',
    'connectors',
    'features',
    'skills',
    'knowledge',
    'memories',
    'messages',
    'security',
    'computer',
    'langfuse',
    'traces',
    'database',
  ]

  // Use the hash highlight hook for element-level deep linking
  // Hash format: #page/section or #page/section/element
  const { activeSection, activeElement } = useHashHighlight()

  // Active section in the sidebar
  const [activeKey, setActiveKey] = useState<SectionKey>('general')

  // Sync active section with URL hash
  useEffect(() => {
    if (activeSection && allSectionKeys.includes(activeSection as SectionKey)) {
      setActiveKey(activeSection as SectionKey)
    }
  }, [activeSection])

  // Group definitions for the sidebar menu
  const groups: SectionGroupDef[] = [
    { key: 'configure', label: t('Configure') },
    { key: 'personalize', label: t('Personalize') },
    { key: 'extend', label: t('Extend') },
    { key: 'observe', label: t('Observe') },
  ]

  // Section definitions for the sidebar menu
  const sections: SectionDef[] = [
    {
      key: 'general',
      label: t('Settings'),
      icon: 'Settings',
      group: 'configure',
    },
    {
      key: 'providers',
      label: t('AI Providers'),
      icon: 'SparksSolid',
      group: 'configure',
    },
    { key: 'features', label: t('Features'), icon: 'Cube', group: 'configure' },
    {
      key: 'knowledge',
      label: t('Files'),
      icon: 'Document',
      group: 'personalize',
    },
    {
      key: 'memories',
      label: t('Memory'),
      icon: 'Brain',
      group: 'personalize',
    },
    {
      key: 'messages',
      label: t('Messages'),
      icon: 'Pin',
      group: 'personalize',
    },
    { key: 'skills', label: t('Skills'), icon: 'Puzzle', group: 'extend' },
    {
      key: 'connectors',
      label: t('Connectors'),
      icon: 'EvPlug',
      group: 'extend',
    },
    // { key: 'security', label: t('Secure Storage'), icon: 'Lock', group: 'configure' },
    { key: 'computer', label: t('Device'), icon: 'Computer', group: 'observe' },
    // { key: 'langfuse', label: 'Langfuse', icon: 'Langfuse', group: 'observe' },
    { key: 'traces', label: t('Traces'), icon: 'Activity', group: 'observe' },
  ]

  const handleSectionClick = (section: SectionDef) => {
    if (section.navigateTo) {
      navigate(section.navigateTo)
      return
    }
    setActiveKey(section.key)
    navigate(`${location.pathname}#settings/${section.key}`, { replace: true })
  }

  useEffect(() => {
    SecureStorage.init()
  }, [])

  const handleUnlock = async () => {
    if (!masterPassword) return

    setIsUnlocking(true)
    try {
      SecureStorage.unlock(masterPassword)
      setMasterPassword('')
      successToast(t('Storage unlocked'))
    } catch (error) {
      errorToast(t('Invalid password'))
    } finally {
      setIsUnlocking(false)
    }
  }

  // Render section content based on the active key
  const renderSectionContent = () => {
    switch (activeKey) {
      case 'general':
        return <GeneralSection />
      case 'providers':
        return <ProvidersSection />
      case 'connectors':
        return <ConnectorsSection />
      case 'features':
        return <FeaturesSection />
      case 'skills':
        return <SkillsSection />
      case 'knowledge':
        return <FilesSection />
      case 'memories':
        return <AgentMemoriesSection />
      case 'messages':
        return <PinnedMessagesSection />
      case 'security':
        return <SecuritySection />
      case 'computer':
        return (
          <div data-testid="computer-settings">
            <DeviceSection />
          </div>
        )
      case 'langfuse':
        return <LangfuseSection />
      case 'traces':
        return <TracesSection />
      default:
        return null
    }
  }

  // Find the current section definition
  const currentSection = sections.find((s) => s.key === activeKey)

  return (
    <div className="flex flex-col md:flex-row h-full min-h-0">
      {/* Horizontal scrollable tabs on narrow screens */}
      <div className="md:hidden shrink-0 border-b border-default-200 overflow-hidden px-2 pt-1">
        <Tabs
          selectedKey={activeKey}
          onSelectionChange={(key) => {
            const section = sections.find((s) => s.key === key)
            if (section) handleSectionClick(section)
          }}
          variant="underlined"
          size="sm"
          fullWidth
          classNames={{
            tabList: 'py-0 me-6',
            tab: 'px-1',
          }}
        >
          {sections.map((section) => (
            <Tab
              key={section.key}
              title={
                <div className="flex items-center gap-1.5">
                  <Tooltip
                    content={section.label}
                    placement="top"
                    classNames={{ base: 'text-xs' }}
                  >
                    <Icon
                      name={section.icon as any}
                      className="h-3.5 w-3.5 shrink-0"
                    />
                  </Tooltip>
                </div>
              }
            />
          ))}
        </Tabs>
      </div>

      {/* Left sidebar menu (hidden on narrow screens) */}
      <nav className="hidden md:block w-48 shrink-0 border-e border-default-200 overflow-y-auto bg-default-50">
        <h2 className="text-lg font-bold px-4 py-4">{t('Settings')}</h2>
        <div className="flex flex-col gap-4 px-2 pb-4">
          {groups.map((group) => {
            const groupSections = sections.filter((s) => s.group === group.key)
            if (groupSections.length === 0) return null
            return (
              <div key={group.key}>
                <h3 className="text-xs font-semibold text-default-400 uppercase tracking-wider px-3 mb-1">
                  {group.label}
                </h3>
                <ul className="flex flex-col gap-0.5">
                  {groupSections.map((section) => {
                    const isActive = activeKey === section.key
                    const isExternal = !!section.navigateTo
                    return (
                      <li key={section.key}>
                        <button
                          type="button"
                          onClick={() => handleSectionClick(section)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                            isActive
                              ? 'bg-primary/10 text-primary font-medium'
                              : 'text-default-600 hover:bg-default-100'
                          }`}
                        >
                          <Icon
                            name={section.icon as any}
                            className="h-4 w-4 shrink-0"
                          />
                          <span className="truncate">{section.label}</span>
                          {isExternal && (
                            <Icon
                              name="ArrowRight"
                              className="h-3 w-3 ml-auto shrink-0 text-default-400"
                            />
                          )}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </div>
      </nav>

      {/* Right content panel */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        {/* Locked banner */}
        {SecureStorage.isLocked() && (
          <div className="px-6 pt-4">
            <Card>
              <CardBody className="flex flex-row items-center gap-4">
                <Icon name="Lock" className="h-5 w-5 text-warning" />
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {t('Secure storage is locked')}
                  </p>
                  <p className="text-xs text-default-500">
                    {t('Enter your master password to unlock')}
                  </p>
                </div>
                <Input
                  type="password"
                  placeholder={t('Master password')}
                  value={masterPassword}
                  onChange={(e) => setMasterPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                  className="w-48"
                />
                <Button
                  color="primary"
                  size="sm"
                  onPress={handleUnlock}
                  isLoading={isUnlocking}
                >
                  {t('Unlock')}
                </Button>
              </CardBody>
            </Card>
          </div>
        )}

        {/* Section header + content */}
        {currentSection && !currentSection.navigateTo && (
          <div className="px-6 py-4">
            <div className="relative">
              <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
                {activeElement && (
                  <button
                    type="button"
                    onClick={() => {
                      // Navigate one level up: remove last segment from element
                      const segments = activeElement.split('/')
                      const parentElement =
                        segments.length > 1
                          ? segments.slice(0, -1).join('/')
                          : null
                      const parentHash = parentElement
                        ? `#settings/${currentSection.key}/${parentElement}`
                        : `#settings/${currentSection.key}`
                      navigate(`${location.pathname}${parentHash}`, {
                        replace: true,
                      })
                    }}
                    className="text-default-500 hover:text-default-800 transition-colors"
                  >
                    <Icon name="NavArrowLeft" className="h-5 w-5" />
                  </button>
                )}
                {currentSection.label}
              </h3>
              <div className="mt-4 h-full">{renderSectionContent()}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
