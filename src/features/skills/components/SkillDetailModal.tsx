/**
 * SkillDetailModal — Full detail view for an installed or installable skill.
 */

import { useState } from 'react'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Chip,
  Tabs,
  Tab,
  Divider,
  Switch,
  Spinner,
} from '@heroui/react'
import { Icon } from '@/components'
import type { InstalledSkill } from '@/types'
import type { SkillSearchResult } from '@/lib/skills/skillsmp-client'
import { getSkillCompatibility } from '@/lib/skills/skill-prompt'
import { TrySkillRunner } from './TrySkillRunner'

interface SkillDetailModalProps {
  isOpen: boolean
  onClose: () => void
  /** Installed skill data (for installed skills) */
  installedSkill?: InstalledSkill
  /** Search result (for discovery) */
  searchResult?: SkillSearchResult
  /** Whether this skill is installed */
  isInstalled: boolean
  /** Whether an install is in progress */
  isInstalling?: boolean
  /** Translate function */
  t: (key: string) => string
  /** Called when install is clicked */
  onInstall?: () => void
  /** Called when uninstall is clicked */
  onUninstall?: () => void
  /** Called when enable/disable is toggled */
  onToggleEnabled?: (enabled: boolean) => void
  /** Called when auto-activate is toggled */
  onToggleAutoActivate?: (autoActivate: boolean) => void
}

export function SkillDetailModal({
  isOpen,
  onClose,
  installedSkill,
  searchResult,
  isInstalled,
  isInstalling,
  t,
  onInstall,
  onUninstall,
  onToggleEnabled,
  onToggleAutoActivate,
}: SkillDetailModalProps) {
  const [activeTab, setActiveTab] = useState('instructions')

  const name = installedSkill?.name ?? searchResult?.name ?? 'Unknown'
  const description =
    installedSkill?.description ?? searchResult?.description ?? ''
  const author = installedSkill?.author ?? searchResult?.author ?? ''
  const stars = installedSkill?.stars ?? searchResult?.stars ?? 0
  const githubUrl =
    installedSkill?.githubUrl ?? searchResult?.githubUrl ?? ''
  const license = installedSkill?.license

  const compat = installedSkill ? getSkillCompatibility(installedSkill) : null

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="3xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Icon name="OpenBook" width={20} height={20} />
            <span>{name}</span>
          </div>
          <p className="text-sm text-default-500 font-normal">{description}</p>
        </ModalHeader>

        <ModalBody>
          {/* Metadata bar */}
          <div className="flex flex-wrap gap-3 text-xs text-default-500">
            <div className="flex items-center gap-1">
              <Icon name="User" width={14} height={14} />
              <span>{author}</span>
            </div>
            <div className="flex items-center gap-1">
              <Icon name="StarSolid" width={14} height={14} />
              <span>{stars.toLocaleString()}</span>
            </div>
            {license && (
              <div className="flex items-center gap-1">
                <Icon name="MenuScale" width={14} height={14} />
                <span>{license}</span>
              </div>
            )}
            {githubUrl && (
              <a
                href={githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-primary hover:underline"
              >
                <Icon name="GitHub" width={14} height={14} />
                <span>{t('View on GitHub')}</span>
              </a>
            )}
          </div>

          {/* Compatibility indicator */}
          {compat && (
            <>
              <Divider />
              <div className="flex items-center gap-2">
                {compat.canExecute ? (
                  <>
                    <Chip size="sm" color="success" variant="flat">
                      {t('Compatible')}
                    </Chip>
                    <span className="text-xs text-default-500">
                      {compat.bash > 0
                        ? t(
                            'Some scripts require system tools that can\'t run in-browser',
                          )
                        : t(
                            'Can execute Python and JavaScript scripts in-browser',
                          )}
                    </span>
                  </>
                ) : (
                  <>
                    <Chip size="sm" color="warning" variant="flat">
                      {t('Instructions Only')}
                    </Chip>
                    <span className="text-xs text-default-500">
                      {t(
                        'Scripts are available for reference but can\'t execute in-browser',
                      )}
                    </span>
                  </>
                )}
              </div>
            </>
          )}

          <Divider />

          {/* Tabs */}
          {isInstalled && installedSkill ? (
            <Tabs
              selectedKey={activeTab}
              onSelectionChange={(key) => setActiveTab(key as string)}
              size="sm"
            >
              <Tab key="instructions" title={t('Instructions')}>
                <div className="prose prose-sm dark:prose-invert max-w-none py-2">
                  <pre className="whitespace-pre-wrap text-xs leading-relaxed bg-default-100 rounded-lg p-4 overflow-auto max-h-96">
                    {installedSkill.skillMdContent}
                  </pre>
                </div>
              </Tab>

              <Tab key="files" title={t('Files')}>
                <div className="space-y-4 py-2">
                  {/* Scripts */}
                  <div>
                    <h4 className="text-sm font-semibold mb-2">
                      {t('Available Scripts')} ({installedSkill.scripts.length})
                    </h4>
                    {installedSkill.scripts.length === 0 ? (
                      <p className="text-xs text-default-400">
                        {t('No scripts included')}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {installedSkill.scripts.map((script) => (
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
                              <span className="text-xs font-mono">
                                {script.path}
                              </span>
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
                  {installedSkill.references.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">
                        {t('Reference Documents')} (
                        {installedSkill.references.length})
                      </h4>
                      <div className="space-y-1">
                        {installedSkill.references.map((ref) => (
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
                            <span className="text-xs font-mono">
                              {ref.path}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Assets */}
                  {installedSkill.assets.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">
                        {t('Asset Files')} ({installedSkill.assets.length})
                      </h4>
                      <div className="space-y-1">
                        {installedSkill.assets.map((asset) => (
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
                            <span className="text-xs font-mono">
                              {asset.path}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Tab>

              {compat?.canExecute && (
                <Tab
                  key="try"
                  title={
                    <div className="flex items-center gap-2">
                      <Icon name="Play" width={14} height={14} />
                      <span>{t('Try it out')}</span>
                    </div>
                  }
                >
                  <TrySkillRunner skill={installedSkill} t={t} />
                </Tab>
              )}

              <Tab key="settings" title={t('Settings')}>
                <div className="space-y-4 py-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{t('Enable')}</p>
                      <p className="text-xs text-default-500">
                        {t('Disable')}
                      </p>
                    </div>
                    <Switch
                      isSelected={installedSkill.enabled}
                      onValueChange={onToggleEnabled}
                      size="sm"
                    />
                  </div>

                  <Divider />

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        {t('Auto-activate')}
                      </p>
                      <p className="text-xs text-default-500">
                        {t('Always inject skill instructions')}
                      </p>
                    </div>
                    <Switch
                      isSelected={installedSkill.autoActivate}
                      onValueChange={onToggleAutoActivate}
                      size="sm"
                    />
                  </div>

                  <Divider />

                  <div>
                    <p className="text-sm font-medium mb-1">
                      {t('Installed on')}
                    </p>
                    <p className="text-xs text-default-500">
                      {new Date(installedSkill.installedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </Tab>
            </Tabs>
          ) : (
            <div className="py-2">
              <p className="text-sm text-default-600">{description}</p>
              {githubUrl && (
                <p className="text-xs text-default-400 mt-2">
                  {t('Source')}: {githubUrl}
                </p>
              )}
            </div>
          )}
        </ModalBody>

        <ModalFooter>
          {isInstalled ? (
            <Button
              size="sm"
              color="danger"
              variant="flat"
              onPress={onUninstall}
              startContent={<Icon name="Trash" width={14} height={14} />}
            >
              {t('Uninstall')}
            </Button>
          ) : (
            <Button
              size="sm"
              color="primary"
              isDisabled={isInstalling}
              onPress={onInstall}
              startContent={
                isInstalling ? (
                  <Spinner size="sm" />
                ) : (
                  <Icon name="Download" width={14} height={14} />
                )
              }
            >
              {isInstalling ? t('Installing...') : t('Install')}
            </Button>
          )}
          <Button size="sm" variant="flat" onPress={onClose}>
            {t('Cancel')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
