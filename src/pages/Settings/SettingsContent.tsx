import { useEffect, useState } from 'react'
import { Button, Card, CardBody, Input, Tabs, Tab } from '@heroui/react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useI18n } from '@/i18n'
import { SecureStorage } from '@/lib/crypto'
import { Icon } from '@/components'
import { errorToast, successToast } from '@/lib/toast'
import { useHashHighlight } from '@/hooks/useHashHighlight'
import localI18n from './i18n'
import {
  ConnectorsSection,
  DeviceSection,
  FeaturesSection,
  GeneralSection,
  LangfuseSection,
  ProvidersSection,
  SecuritySection,
  TracesSection,
} from './components'

type SectionKey =
  | 'general'
  | 'providers'
  | 'connectors'
  | 'features'
  | 'security'
  | 'computer'
  | 'langfuse'
  | 'traces'
  | 'database'

interface SectionDef {
  key: SectionKey
  label: string
  icon: string
  navigateTo?: string
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
    'security',
    'computer',
    'langfuse',
    'traces',
    'database',
  ]

  // Use the hash highlight hook for element-level deep linking
  // Hash format: #page/section or #page/section/element
  const { activeSection } = useHashHighlight()

  // Active section in the sidebar
  const [activeKey, setActiveKey] = useState<SectionKey>('general')

  // Sync active section with URL hash
  useEffect(() => {
    if (activeSection && allSectionKeys.includes(activeSection as SectionKey)) {
      setActiveKey(activeSection as SectionKey)
    }
  }, [activeSection])

  // Section definitions for the sidebar menu
  const sections: SectionDef[] = [
    { key: 'general', label: t('Settings'), icon: 'Settings' },
    { key: 'providers', label: t('AI Providers'), icon: 'Brain' },
    { key: 'connectors', label: t('Connectors'), icon: 'Puzzle' },
    { key: 'features', label: t('Features'), icon: 'Cube' },
    // { key: 'security', label: t('Secure Storage'), icon: 'Lock' },
    { key: 'computer', label: t('Device'), icon: 'Computer' },
    // { key: 'langfuse', label: 'Langfuse', icon: 'Langfuse' },
    { key: 'traces', label: t('Traces'), icon: 'Activity' },
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
          classNames={{
            tabList: 'gap-2 overflow-x-auto scrollbar-hide flex-nowrap p-0',
            tab: 'whitespace-nowrap flex-none w-auto min-w-fit px-2',
          }}
        >
          {sections.map((section) => (
            <Tab
              key={section.key}
              title={
                <div className="flex items-center gap-1.5">
                  <Icon
                    name={section.icon as any}
                    className="h-3.5 w-3.5 shrink-0"
                  />
                  <span>{section.label}</span>
                </div>
              }
            />
          ))}
        </Tabs>
      </div>

      {/* Left sidebar menu (hidden on narrow screens) */}
      <nav className="hidden md:block w-48 shrink-0 border-e border-default-200 overflow-y-auto">
        <h2 className="text-lg font-bold px-4 py-4">{t('Settings')}</h2>
        <ul className="flex flex-col gap-0.5 px-2 pb-4">
          {sections.map((section) => {
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
            <h3 className="text-lg font-semibold mb-1">
              {currentSection.label}
            </h3>
            <div className="mt-4">{renderSectionContent()}</div>
          </div>
        )}
      </div>
    </div>
  )
}
