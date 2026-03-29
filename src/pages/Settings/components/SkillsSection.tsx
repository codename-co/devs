/**
 * SkillsSection — Settings section for managing agent skills.
 *
 * Uses hash-based sub-routing:
 *   #settings/skills       → list view (installed skills)
 *   #settings/skills/add   → search & install (keyword search + GitHub URL)
 *   #settings/skills/:id   → skill detail & settings
 *
 * No tabs on the main screen, no AI search — everything inline within settings.
 */

import { useState, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Button, Card, Chip, Input, Spinner } from '@/components/heroui-compat'
import { toast } from '@/components/heroui-compat'
import { Icon } from '@/components'
import { useI18n } from '@/i18n'
import { useHashHighlight } from '@/hooks/useHashHighlight'
import { useSettingsLabel } from '@/pages/Settings/SettingsContext'
import { SkillSettingsInline } from '@/features/skills/components/SkillSettingsInline'
import {
  installSkill,
  createCustomSkill,
  isSkillInstalled,
  useSkills,
  getSkillById,
} from '@/stores/skillStore'
import { fetchSkillFromGitHub } from '@/lib/skills/github-fetcher'
import { searchSkills } from '@/lib/skills/skillsmp-client'
import type { SkillSearchResult } from '@/lib/skills/skillsmp-client'
import {
  searchSkillsSh,
  toUnifiedSkillResult,
} from '@/lib/skills/skillssh-client'
import type { InstalledSkill } from '@/types'
import skillsI18n from '@/features/skills/pages/i18n'

const SKILLSMP_API_KEY = import.meta.env.VITE_SKILLSMP_API_KEY ?? ''

export function SkillsSection() {
  const { t } = useI18n(skillsI18n)
  const navigate = useNavigate()
  const location = useLocation()
  const { activeElement } = useHashHighlight()

  const installedSkills = useSkills()

  // --- Sub-route helpers ------------------------------------------------
  const navigateToList = useCallback(() => {
    navigate(`${location.pathname}#settings/skills`, { replace: true })
  }, [navigate, location.pathname])

  const navigateToAdd = useCallback(() => {
    navigate(`${location.pathname}#settings/skills/add`, { replace: true })
  }, [navigate, location.pathname])

  const navigateToCreate = useCallback(() => {
    navigate(`${location.pathname}#settings/skills/create`, { replace: true })
  }, [navigate, location.pathname])

  const navigateToSkill = useCallback(
    (skillId: string) => {
      navigate(`${location.pathname}#settings/skills/${skillId}`, {
        replace: true,
      })
    },
    [navigate, location.pathname],
  )

  // --- Sub-route: /create (custom skill form) ----------------------------
  if (activeElement === 'create') {
    return (
      <div data-testid="skills-settings">
        <CreateSkillView
          onCreated={(skillId) => navigateToSkill(skillId)}
          onCancel={navigateToList}
        />
      </div>
    )
  }

  // --- Sub-route: /add (search & install) --------------------------------
  if (activeElement === 'add') {
    return (
      <div data-testid="skills-settings">
        <AddSkillView onInstalled={(skillId) => navigateToSkill(skillId)} />
      </div>
    )
  }

  // --- Sub-route: /:skillId (settings) ----------------------------------
  if (activeElement) {
    const skill = getSkillById(activeElement)

    if (!skill) {
      return (
        <div data-testid="skills-settings">
          <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
            <Icon name="WarningTriangle" className="w-8 h-8 text-warning" />
            <p className="text-default-500 text-sm">
              {t('No skills installed')}
            </p>
            <Button size="sm" variant="secondary" onPress={navigateToList}>
              {t('Cancel')}
            </Button>
          </div>
        </div>
      )
    }

    return (
      <div data-testid="skills-settings">
        <SkillSettingsInline skill={skill} onClose={navigateToList} />
      </div>
    )
  }

  // --- Default sub-route: list view ------------------------------------
  return (
    <div data-testid="skills-settings">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <p className="text-default-500 text-sm">
          {t(
            'Discover, install, and manage specialized skills for your agents',
          )}
        </p>
      </div>

      {/* Content */}
      <div className="mt-6">
        {installedSkills.length === 0 ? (
          <EmptyState onAdd={navigateToAdd} onCreate={navigateToCreate} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            {installedSkills.map((skill) => (
              <SkillListCard
                key={skill.id}
                skill={skill}
                onClick={() => navigateToSkill(skill.id)}
              />
            ))}

            <div className="flex gap-2">
              <Button
                color="primary"
                size="sm"
                variant="secondary"
                startContent={<Icon name="Plus" className="w-4 h-4" />}
                onPress={navigateToAdd}
              >
                {t('Install')}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                startContent={<Icon name="Plus" className="w-4 h-4" />}
                onPress={navigateToCreate}
              >
                {t('Create')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// SkillListCard — compact card for the list view
// ============================================================================

function SkillListCard({
  skill,
  onClick,
}: {
  skill: InstalledSkill
  onClick: () => void
}) {
  const { t } = useI18n(skillsI18n)

  return (
    <Card onPress={onClick} shadow="sm">
      <Card.Content className="flex flex-row items-center gap-4 p-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="flex gap-2 items-center text-sm font-semibold truncate">
              <Icon name="Puzzle" size="sm" className="text-success-600" />
              {skill.name}
            </h3>
            {/* {compat.canExecute ? (
              <Chip size="sm" variant="soft" color="success">
                {t('Compatible')}
              </Chip>
            ) : (
              <Chip size="sm" variant="soft" color="warning">
                {t('Partial')}
              </Chip>
            )} */}
          </div>
          <p className="text-xs text-default-500 line-clamp-2 mt-0.5">
            {skill.description}
          </p>
          <div className="flex items-center gap-2 mt-1 text-xs text-default-400">
            <span>{t('by {author}').replace('{author}', skill.author)}</span>
            {/* {skill.scripts.length > 0 && (
              <>
                <span>·</span>
                <span>
                  {skill.scripts.length} {t('Scripts')}
                </span>
              </>
            )} */}
          </div>
        </div>

        {/* <div className="flex items-center gap-3 shrink-0">
          <Switch
            size="sm"
            isSelected={skill.enabled}
            onValueChange={(enabled) => {
              // Stop navigation when toggling the switch
              setSkillEnabled(skill.id, enabled)
            }}
            aria-label={skill.enabled ? t('Disable') : t('Enable')}
            onClick={(e) => e.stopPropagation()}
          />
          <Button
            size="sm"
            variant="secondary"
            color="danger"
            isIconOnly
            onPress={() => uninstallSkill(skill.id)}
            aria-label={t('Uninstall')}
          >
            <Icon name="Trash" width={14} height={14} />
          </Button>
        </div> */}
      </Card.Content>
    </Card>
  )
}

// ============================================================================
// AddSkillView — search registry + install from GitHub URL
// ============================================================================

function AddSkillView({
  onInstalled,
}: {
  onInstalled: (skillId: string) => void
}) {
  const { t } = useI18n(skillsI18n)

  // Search state
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SkillSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [installingIds, setInstallingIds] = useState<Set<string>>(new Set())

  // GitHub URL fallback state
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [url, setUrl] = useState('')
  const [isInstallingFromUrl, setIsInstallingFromUrl] = useState(false)

  // Push label into breadcrumb
  useSettingsLabel(t('Discover'))

  // --- Keyword search (Skills.sh + SkillsMP in parallel) ----------------
  const handleSearch = useCallback(async () => {
    const trimmed = query.trim()
    if (!trimmed) return

    setIsSearching(true)
    setHasSearched(true)

    try {
      // Search both registries in parallel
      const [skillsShResults, skillsMpResults] = await Promise.all([
        searchSkillsSh(trimmed)
          .then((r) => r.skills.map(toUnifiedSkillResult))
          .catch(() => [] as SkillSearchResult[]),
        SKILLSMP_API_KEY
          ? searchSkills(trimmed, SKILLSMP_API_KEY, {
              limit: 20,
              sortBy: 'stars',
            })
              .then((r) => r.data.skills)
              .catch(() => [] as SkillSearchResult[])
          : Promise.resolve([] as SkillSearchResult[]),
      ])

      // Merge results, dedup by githubUrl (prefer SkillsMP which has descriptions)
      const seen = new Set<string>()
      const merged: SkillSearchResult[] = []
      for (const r of [...skillsMpResults, ...skillsShResults]) {
        if (!seen.has(r.githubUrl)) {
          seen.add(r.githubUrl)
          merged.push(r)
        }
      }

      // Sort by popularity descending
      merged.sort((a, b) => b.stars - a.stars)
      setResults(merged)
    } catch (error) {
      console.error('Skill search failed:', error)
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }, [query])

  // --- Install from search result ---------------------------------------
  const handleInstallResult = useCallback(
    async (result: SkillSearchResult) => {
      setInstallingIds((prev) => new Set(prev).add(result.id))
      try {
        const fetched = await fetchSkillFromGitHub(result.githubUrl)
        const skill = installSkill({
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
        toast({
          title: t('Skill installed successfully'),
          color: 'success',
        })
        onInstalled(skill.id)
      } catch (error) {
        console.error('Failed to install skill:', error)
        toast({
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
    [t, onInstalled],
  )

  // --- Install from URL -------------------------------------------------
  const handleInstallFromUrl = useCallback(async () => {
    const trimmedUrl = url.trim()
    if (!trimmedUrl) return

    setIsInstallingFromUrl(true)
    try {
      const fetched = await fetchSkillFromGitHub(trimmedUrl)
      const skill = installSkill({
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
      toast({
        title: t('Skill installed successfully'),
        color: 'success',
      })
      onInstalled(skill.id)
    } catch (error) {
      console.error('Failed to install skill from URL:', error)
      toast({
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
  }, [url, t, onInstalled])

  return (
    <div className="space-y-6">
      {/* Keyword search (Skills.sh always available, SkillsMP when API key set) */}
      <>
        <div className="flex gap-2">
          <Input
            value={query}
            onValueChange={setQuery}
            onKeyDown={(e: any) => {
              if (e.key === 'Enter') handleSearch()
            }}
            placeholder={t('Search skills...')}
            size="sm"
            className="flex-1"
            autoFocus
            startContent={
              <Icon
                name="Search"
                width={16}
                height={16}
                className="text-default-400"
              />
            }
          />
          <Button
            size="sm"
            color="primary"
            onPress={handleSearch}
            isDisabled={!query.trim() || isSearching}
          >
            {isSearching ? <Spinner size="sm" /> : t('Discover')}
          </Button>
        </div>

        {/* Search results */}
        {isSearching && (
          <div className="flex items-center justify-center py-8">
            <Spinner size="lg" label={t('Searching...')} />
          </div>
        )}

        {!isSearching && hasSearched && results.length === 0 && (
          <div className="text-center py-8 text-default-400">
            <Icon
              name="Search"
              width={32}
              height={32}
              className="mx-auto mb-2"
            />
            <p className="text-sm">{t('No skills found')}</p>
            <p className="text-xs">{t('Try a different search query')}</p>
          </div>
        )}

        {!isSearching && results.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {results.map((result) => {
              const installed = isSkillInstalled(result.githubUrl)
              const installing = installingIds.has(result.id)
              return (
                <Card key={result.id} shadow="sm">
                  <Card.Content className="gap-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold truncate">
                          {result.name}
                        </h3>
                        <p className="text-xs text-default-500 truncate">
                          {t('by {author}').replace('{author}', result.author)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-default-400 text-xs shrink-0">
                        <Icon name="StarSolid" width={12} height={12} />
                        <span>{result.stars.toLocaleString()}</span>
                      </div>
                    </div>
                    <p className="text-xs text-default-600 line-clamp-2">
                      {result.description}
                    </p>
                    <div className="flex items-center justify-end gap-2 mt-1">
                      {installed ? (
                        <Chip size="sm" variant="soft" color="success">
                          {t('Installed')}
                        </Chip>
                      ) : (
                        <Button
                          size="sm"
                          color="primary"
                          variant="secondary"
                          isDisabled={installing}
                          onPress={() => handleInstallResult(result)}
                          startContent={
                            installing ? (
                              <Spinner size="sm" />
                            ) : (
                              <Icon name="Download" width={14} height={14} />
                            )
                          }
                        >
                          {installing ? t('Installing...') : t('Install')}
                        </Button>
                      )}
                    </div>
                  </Card.Content>
                </Card>
              )
            })}
          </div>
        )}
      </>

      {/* GitHub URL fallback — collapsible */}
      <div>
        <button
          type="button"
          className="flex items-center gap-2 text-sm text-default-500 hover:text-default-700 transition-colors w-full"
          onClick={() => setShowUrlInput((v) => !v)}
        >
          <Icon
            name={showUrlInput ? 'NavArrowDown' : 'NavArrowRight'}
            width={14}
            height={14}
          />
          <Icon name="GitHub" width={14} height={14} />
          <span>{t('Install from GitHub URL')}</span>
        </button>

        {showUrlInput && (
          <div className="mt-3 space-y-2">
            <div className="flex gap-2">
              <Input
                value={url}
                onValueChange={setUrl}
                onKeyDown={(e: any) => {
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
                isDisabled={!url.trim()}
                onPress={handleInstallFromUrl}
              >
                {t('Install')}
              </Button>
            </div>
            <p className="text-xs text-default-400">
              {t('Paste a GitHub URL to a skill directory or SKILL.md file')}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// CreateSkillView — simple form to create a custom skill
// ============================================================================

function CreateSkillView({
  onCreated,
  onCancel,
}: {
  onCreated: (skillId: string) => void
  onCancel: () => void
}) {
  const { t } = useI18n(skillsI18n)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [prompt, setPrompt] = useState('')
  const [nameError, setNameError] = useState('')
  const [promptError, setPromptError] = useState('')

  // Push label into breadcrumb
  useSettingsLabel(t('Create Custom Skill'))

  const handleCreate = useCallback(() => {
    let valid = true
    const trimmedName = name.trim().replace(/\s+/g, '-')
    if (!trimmedName) {
      setNameError(t('Name is required'))
      valid = false
    } else if (/\s/.test(name.trim())) {
      setNameError(t('Name must not contain spaces'))
      valid = false
    } else {
      setNameError('')
    }
    if (!prompt.trim()) {
      setPromptError(t('Prompt is required'))
      valid = false
    } else {
      setPromptError('')
    }
    if (!valid) return

    const skill = createCustomSkill({
      name: trimmedName,
      description: description.trim(),
      skillMdContent: prompt.trim(),
    })

    toast({
      title: t('Custom skill created successfully'),
      color: 'success',
    })
    onCreated(skill.id)
  }, [name, description, prompt, t, onCreated])

  return (
    <div className="space-y-6">
      <Input
        label={t('Skill Name')}
        placeholder={t('my-custom-skill')}
        description={t('No spaces allowed — use hyphens instead')}
        value={name}
        onValueChange={(v: any) => {
          setName(v)
          if (v.trim()) setNameError('')
        }}
        isInvalid={!!nameError}
        errorMessage={nameError}
        size="sm"
        autoFocus
      />

      <Input
        label={t('Description')}
        placeholder={t('A short description of what this skill does')}
        value={description}
        onValueChange={setDescription}
        size="sm"
      />

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">
          {t('Prompt')}
        </label>
        <textarea
          value={prompt}
          onChange={(e: any) => {
            setPrompt(e.target.value)
            if (e.target.value.trim()) setPromptError('')
          }}
          placeholder={t('Write the skill instructions in Markdown...')}
          rows={12}
          className={`w-full rounded-lg border bg-default-100 px-3 py-2 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-primary ${
            promptError
              ? 'border-danger focus:ring-danger'
              : 'border-default-200'
          }`}
        />
        {promptError && <p className="text-xs text-danger">{promptError}</p>}
      </div>

      <div className="flex justify-end gap-2">
        <Button size="sm" variant="secondary" onPress={onCancel}>
          {t('Cancel')}
        </Button>
        <Button size="sm" color="primary" onPress={handleCreate}>
          {t('Create')}
        </Button>
      </div>
    </div>
  )
}

// ============================================================================
// EmptyState
// ============================================================================

function EmptyState({
  onAdd,
  onCreate,
}: {
  onAdd: () => void
  onCreate: () => void
}) {
  const { t } = useI18n(skillsI18n)

  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <h3 className="text-md font-medium mb-2">{t('No skills installed')}</h3>
      <p className="text-sm text-default-500 max-w-md mb-6">
        {t('Discover, install, and manage specialized skills for your agents')}
      </p>
      <div className="flex gap-3">
        <Button color="primary" onPress={onAdd} size="sm">
          {t('Discover')}
        </Button>
        <Button variant="secondary" onPress={onCreate} size="sm">
          {t('Create')}
        </Button>
      </div>
      <p className="text-xs text-default-400 mt-3">{t('or create your own')}</p>
    </div>
  )
}
