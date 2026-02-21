/**
 * SkillsPage — Main Skills page combining discovery and installed skill management.
 *
 * Features two tabs:
 * - Discover: Search the SkillsMP registry for new skills
 * - Installed: Manage already-installed skills (enable/disable, uninstall)
 */

import { useState, useCallback } from 'react'
import { Tabs, Tab, Chip, Input, Button } from '@heroui/react'
import { Icon, Section } from '@/components'
import { useI18n } from '@/i18n'
import { SkillSearch } from '../components/SkillSearch'
import { InstalledSkills } from '../components/InstalledSkills'
import { SkillDetailModal } from '../components/SkillDetailModal'
import {
  installSkill,
  uninstallSkill,
  setSkillEnabled,
  useSkills,
  getSkillByGitHubUrl,
} from '@/stores/skillStore'
import { fetchSkillFromGitHub } from '@/lib/skills/github-fetcher'
import type { SkillSearchResult } from '@/lib/skills/skillsmp-client'
import type { InstalledSkill } from '@/types'
import { addToast } from '@heroui/react'
import localI18n from './i18n'
import DefaultLayout from '@/layouts/Default'
import { HeaderProps } from '@/lib/types'

/**
 * The SkillsMP API key. Per the SKILLS.md spec, this is a platform-level
 * credential embedded via Vite env var. Falls back to empty string so the
 * search UI can show an "API key required" message.
 */
const SKILLSMP_API_KEY = import.meta.env.VITE_SKILLSMP_API_KEY ?? ''

export function SkillsPage() {
  const { t } = useI18n(localI18n)

  const installedSkills = useSkills()

  // Active tab
  const [activeTab, setActiveTab] = useState<'discover' | 'installed'>(
    'discover',
  )

  // Detail modal state
  const [selectedInstalled, setSelectedInstalled] =
    useState<InstalledSkill | null>(null)
  const [selectedSearchResult, setSelectedSearchResult] =
    useState<SkillSearchResult | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  // Installing state
  const [installingIds, setInstallingIds] = useState<Set<string>>(new Set())

  // Manual URL install state
  const [manualUrl, setManualUrl] = useState('')
  const [isInstallingFromUrl, setIsInstallingFromUrl] = useState(false)

  // ── Install handler ──

  const handleInstall = useCallback(
    async (result: SkillSearchResult) => {
      setInstallingIds((prev) => new Set(prev).add(result.id))
      try {
        const fetched = await fetchSkillFromGitHub(result.githubUrl)
        installSkill({
          name: result.name,
          description: result.description,
          author: result.author,
          skillMdContent: fetched.rawSkillMd,
          scripts: fetched.scripts,
          references: fetched.references,
          assets: fetched.assets,
          githubUrl: result.githubUrl,
          stars: result.stars,
        })
        addToast({
          title: t('Skill installed successfully'),
          color: 'success',
        })
      } catch (error) {
        console.error('Failed to install skill:', error)
        addToast({
          title: t('Failed to install skill'),
          description:
            error instanceof Error
              ? error.message
              : t('Failed to fetch skill from GitHub'),
          color: 'danger',
        })
      } finally {
        setInstallingIds((prev) => {
          const next = new Set(prev)
          next.delete(result.id)
          return next
        })
      }
    },
    [t],
  )

  const handleInstallFromUrl = useCallback(async () => {
    const trimmedUrl = manualUrl.trim()
    if (!trimmedUrl) return

    setIsInstallingFromUrl(true)
    try {
      const fetched = await fetchSkillFromGitHub(trimmedUrl)
      installSkill({
        name: fetched.manifest.name,
        description: fetched.manifest.description,
        author: trimmedUrl.split('/')[3] ?? 'unknown',
        skillMdContent: fetched.rawSkillMd,
        scripts: fetched.scripts,
        references: fetched.references,
        assets: fetched.assets,
        githubUrl: fetched.githubUrl,
        stars: 0,
      })
      addToast({
        title: t('Skill installed successfully'),
        color: 'success',
      })
      setManualUrl('')
    } catch (error) {
      console.error('Failed to install skill from URL:', error)
      addToast({
        title: t('Failed to install skill'),
        description:
          error instanceof Error
            ? error.message
            : t('Failed to fetch skill from GitHub'),
        color: 'danger',
      })
    } finally {
      setIsInstallingFromUrl(false)
    }
  }, [manualUrl, t])

  // ── Detail handlers ──

  const openSearchDetail = useCallback((result: SkillSearchResult) => {
    setSelectedSearchResult(result)
    setSelectedInstalled(getSkillByGitHubUrl(result.githubUrl) ?? null)
    setIsDetailOpen(true)
  }, [])

  const openInstalledDetail = useCallback((skill: InstalledSkill) => {
    setSelectedInstalled(skill)
    setSelectedSearchResult(null)
    setIsDetailOpen(true)
  }, [])

  const closeDetail = useCallback(() => {
    setIsDetailOpen(false)
    setSelectedInstalled(null)
    setSelectedSearchResult(null)
  }, [])

  const handleUninstall = useCallback(() => {
    if (selectedInstalled) {
      uninstallSkill(selectedInstalled.id)
      addToast({
        title: t('Skill uninstalled'),
        color: 'success',
      })
      closeDetail()
    }
  }, [selectedInstalled, t, closeDetail])

  const handleToggleEnabled = useCallback(
    (enabled: boolean) => {
      if (selectedInstalled) {
        setSkillEnabled(selectedInstalled.id, enabled)
      }
    },
    [selectedInstalled],
  )

  const isSelectedInstalled = !!(
    selectedSearchResult && getSkillByGitHubUrl(selectedSearchResult.githubUrl)
  )

  const header: HeaderProps = {
    color: 'bg-secondary-50',
    icon: {
      name: 'OpenBook',
      color: 'text-secondary-300',
    },
    title: (
      <>
        {t('Agent Skills')}
        <Chip size="sm" variant="flat" className="ml-2 align-middle">
          Beta
        </Chip>
      </>
    ),
    subtitle: t(
      'Discover, install, and manage specialized skills for your agents',
    ),
  }

  return (
    <DefaultLayout header={header}>
      <Section>
        <Tabs
          selectedKey={activeTab}
          onSelectionChange={(key) =>
            setActiveTab(key as 'discover' | 'installed')
          }
          className="mb-4"
          variant="underlined"
        >
          <Tab
            key="discover"
            title={
              <div className="flex items-center gap-2">
                <Icon name="Search" width={16} height={16} />
                <span>{t('Discover')}</span>
              </div>
            }
          >
            {SKILLSMP_API_KEY ? (
              <SkillSearch
                apiKey={SKILLSMP_API_KEY}
                t={t}
                onSelect={openSearchDetail}
                onInstall={handleInstall}
                installingIds={installingIds}
              />
            ) : (
              <div className="text-center py-12 text-default-400">
                <Icon
                  name="Key"
                  width={40}
                  height={40}
                  className="mx-auto mb-3"
                />
                <p className="text-sm font-medium">{t('API key required')}</p>
                <p className="text-xs mt-1">
                  {t(
                    'Enter your SkillsMP API key in Settings to search for skills',
                  )}
                </p>
              </div>
            )}

            {/* Manual URL install */}
            <div className="mt-6 pt-4 border-t border-default-200">
              <p className="text-sm font-medium mb-2">
                {t('Install from GitHub URL')}
              </p>
              <div className="flex gap-2">
                <Input
                  value={manualUrl}
                  onValueChange={setManualUrl}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleInstallFromUrl()
                  }}
                  placeholder="https://github.com/owner/repo/tree/main/skills/skill-name"
                  size="sm"
                  className="flex-1"
                  startContent={
                    <Icon
                      name="Link"
                      width={16}
                      height={16}
                      className="text-default-400"
                    />
                  }
                />
                <Button
                  size="sm"
                  color="primary"
                  isLoading={isInstallingFromUrl}
                  isDisabled={!manualUrl.trim()}
                  onPress={handleInstallFromUrl}
                >
                  {t('Install')}
                </Button>
              </div>
              <p className="text-xs text-default-400 mt-1">
                {t('Paste a GitHub URL to a skill directory or SKILL.md file')}
              </p>
            </div>
          </Tab>

          <Tab
            key="installed"
            title={
              <div className="flex items-center gap-2">
                <Icon name="OpenBook" width={16} height={16} />
                <span>{t('Installed')}</span>
                {installedSkills.length > 0 && (
                  <Chip size="sm" variant="flat">
                    {installedSkills.length}
                  </Chip>
                )}
              </div>
            }
          >
            <InstalledSkills t={t} onSelect={openInstalledDetail} />
          </Tab>
        </Tabs>

        {/* Detail modal */}
        <SkillDetailModal
          isOpen={isDetailOpen}
          onClose={closeDetail}
          installedSkill={selectedInstalled ?? undefined}
          searchResult={selectedSearchResult ?? undefined}
          isInstalled={!!selectedInstalled || isSelectedInstalled}
          isInstalling={
            selectedSearchResult
              ? installingIds.has(selectedSearchResult.id)
              : false
          }
          t={t}
          onInstall={
            selectedSearchResult
              ? () => handleInstall(selectedSearchResult)
              : undefined
          }
          onUninstall={handleUninstall}
          onToggleEnabled={handleToggleEnabled}
        />
      </Section>
    </DefaultLayout>
  )
}
