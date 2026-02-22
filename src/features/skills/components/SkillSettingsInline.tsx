/**
 * SkillSettingsInline — Inline detail & settings view for an installed skill.
 *
 * Displayed within the Settings modal when navigating to
 * #settings/skills/:skillId. Replaces the modal-based SkillDetailModal
 * for a fully inline experience.
 */

import { useState, useCallback } from 'react'
import { Button, Chip, Divider, Switch, Tabs, Tab } from '@heroui/react'
import { addToast } from '@heroui/react'
import { Icon } from '@/components'
import { useI18n } from '@/i18n'
import {
  setSkillEnabled,
  uninstallSkill,
  updateSkill,
} from '@/stores/skillStore'
import { getSkillCompatibility } from '@/lib/skills/skill-prompt'
import { useSettingsLabel } from '@/pages/Settings/SettingsContext'
import { TrySkillRunner } from './TrySkillRunner'
import type { InstalledSkill } from '@/types'
import skillsI18n from '@/features/skills/pages/i18n'

interface SkillSettingsInlineProps {
  skill: InstalledSkill
  onClose: () => void
}

export function SkillSettingsInline({
  skill,
  onClose,
}: SkillSettingsInlineProps) {
  const { t } = useI18n(skillsI18n)
  const [activeTab, setActiveTab] = useState('instructions')
  const [showUninstallConfirm, setShowUninstallConfirm] = useState(false)

  // Push skill name into the Settings header breadcrumb
  useSettingsLabel(skill.name, 'Puzzle')

  const compat = getSkillCompatibility(skill)

  const handleToggleEnabled = useCallback(
    (enabled: boolean) => {
      setSkillEnabled(skill.id, enabled)
    },
    [skill.id],
  )

  const handleToggleAutoActivate = useCallback(
    (autoActivate: boolean) => {
      updateSkill(skill.id, { autoActivate })
    },
    [skill.id],
  )

  const handleUninstall = useCallback(() => {
    uninstallSkill(skill.id)
    addToast({
      title: t('Skill uninstalled'),
      color: 'success',
    })
    onClose()
  }, [skill.id, t, onClose])

  return (
    <div className="space-y-4">
      {/* Skill header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-default-500">{skill.description}</p>
          <div className="flex flex-wrap gap-3 mt-2 text-xs text-default-400">
            <span className="flex items-center gap-1">
              <Icon name="User" width={14} height={14} />
              {skill.author}
            </span>
            <span className="flex items-center gap-1">
              <Icon name="StarSolid" width={14} height={14} />
              {skill.stars.toLocaleString()}
            </span>
            {skill.license && (
              <span className="flex items-center gap-1">
                <Icon name="MenuScale" width={14} height={14} />
                {skill.license}
              </span>
            )}
            {skill.githubUrl && (
              <a
                href={skill.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-primary hover:underline"
              >
                <Icon name="GitHub" width={14} height={14} />
                {t('View on GitHub')}
              </a>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Switch
            size="sm"
            isSelected={skill.enabled}
            onValueChange={handleToggleEnabled}
            aria-label={skill.enabled ? t('Disable') : t('Enable')}
          />
        </div>
      </div>

      {/* Compatibility indicator */}
      <div className="flex items-center gap-2">
        {compat.canExecute ? (
          <>
            <Chip size="sm" color="success" variant="flat">
              {t('Compatible')}
            </Chip>
            <span className="text-xs text-default-500">
              {compat.bash > 0
                ? t(
                    "Some scripts require system tools that can't run in-browser",
                  )
                : t('Can execute Python and JavaScript scripts in-browser')}
            </span>
          </>
        ) : (
          <>
            <Chip size="sm" color="warning" variant="flat">
              {t('Instructions Only')}
            </Chip>
            <span className="text-xs text-default-500">
              {t(
                "Scripts are available for reference but can't execute in-browser",
              )}
            </span>
          </>
        )}
      </div>

      <Divider />

      {/* Tabs for content */}
      <Tabs
        selectedKey={activeTab}
        onSelectionChange={(key) => setActiveTab(key as string)}
        size="sm"
        variant="underlined"
      >
        <Tab key="instructions" title={t('Instructions')}>
          <div className="py-2">
            <pre className="whitespace-pre-wrap text-xs leading-relaxed bg-default-100 rounded-lg p-4 overflow-auto max-h-96">
              {skill.skillMdContent}
            </pre>
          </div>
        </Tab>

        <Tab key="files" title={t('Files')}>
          <div className="space-y-4 py-2">
            {/* Scripts */}
            <div>
              <h4 className="text-sm font-semibold mb-2">
                {t('Available Scripts')} ({skill.scripts.length})
              </h4>
              {skill.scripts.length === 0 ? (
                <p className="text-xs text-default-400">
                  {t('No scripts included')}
                </p>
              ) : (
                <div className="space-y-2">
                  {skill.scripts.map((script) => (
                    <div
                      key={script.path}
                      className="flex items-center justify-between bg-default-100 rounded-lg p-2"
                    >
                      <div className="flex items-center gap-2">
                        <Icon
                          name="Code"
                          width={14}
                          height={14}
                          className="text-default-500"
                        />
                        <span className="text-xs font-mono">{script.path}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Chip size="sm" variant="flat">
                          {script.language}
                        </Chip>
                        {script.requiredPackages &&
                          script.requiredPackages.length > 0 && (
                            <span className="text-xs text-default-400">
                              {script.requiredPackages.join(', ')}
                            </span>
                          )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* References */}
            {skill.references.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">
                  {t('Reference Documents')} ({skill.references.length})
                </h4>
                <div className="space-y-1">
                  {skill.references.map((ref) => (
                    <div
                      key={ref.path}
                      className="flex items-center gap-2 bg-default-100 rounded-lg p-2"
                    >
                      <Icon
                        name="Page"
                        width={14}
                        height={14}
                        className="text-default-500"
                      />
                      <span className="text-xs font-mono">{ref.path}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Assets */}
            {skill.assets.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">
                  {t('Asset Files')} ({skill.assets.length})
                </h4>
                <div className="space-y-1">
                  {skill.assets.map((asset) => (
                    <div
                      key={asset.path}
                      className="flex items-center gap-2 bg-default-100 rounded-lg p-2"
                    >
                      <Icon
                        name="Folder"
                        width={14}
                        height={14}
                        className="text-default-500"
                      />
                      <span className="text-xs font-mono">{asset.path}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Tab>

        {compat.canExecute && (
          <Tab
            key="try"
            title={
              <div className="flex items-center gap-2">
                <Icon name="Play" width={14} height={14} />
                <span>{t('Try it out')}</span>
              </div>
            }
          >
            <TrySkillRunner skill={skill} t={t} />
          </Tab>
        )}

        <Tab key="settings" title={t('Settings')}>
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{t('Enable')}</p>
                <p className="text-xs text-default-500">{t('Disable')}</p>
              </div>
              <Switch
                isSelected={skill.enabled}
                onValueChange={handleToggleEnabled}
                size="sm"
              />
            </div>

            <Divider />

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{t('Auto-activate')}</p>
                <p className="text-xs text-default-500">
                  {t('Always inject skill instructions')}
                </p>
              </div>
              <Switch
                isSelected={skill.autoActivate}
                onValueChange={handleToggleAutoActivate}
                size="sm"
              />
            </div>

            <Divider />

            <div>
              <p className="text-sm font-medium mb-1">{t('Installed on')}</p>
              <p className="text-xs text-default-500">
                {new Date(skill.installedAt).toLocaleDateString()}
              </p>
            </div>

            <Divider />

            {/* Uninstall */}
            {showUninstallConfirm ? (
              <div className="flex items-center gap-3 p-3 bg-danger-50 rounded-lg">
                <p className="text-sm text-danger flex-1">
                  {t('Are you sure you want to uninstall this skill?')}
                </p>
                <Button size="sm" color="danger" onPress={handleUninstall}>
                  {t('Uninstall')}
                </Button>
                <Button
                  size="sm"
                  variant="flat"
                  onPress={() => setShowUninstallConfirm(false)}
                >
                  {t('Cancel')}
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                color="danger"
                variant="flat"
                onPress={() => setShowUninstallConfirm(true)}
                startContent={<Icon name="Trash" width={14} height={14} />}
              >
                {t('Uninstall')}
              </Button>
            )}
          </div>
        </Tab>
      </Tabs>
    </div>
  )
}
