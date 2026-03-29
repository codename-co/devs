/**
 * SkillCard — Compact card for displaying a skill search result or installed skill.
 */

import { Card, Chip, Button, Spinner } from '@/components/heroui-compat'
import { Icon } from '@/components'
import type { SkillSearchResult } from '@/lib/skills/skillsmp-client'
import type { InstalledSkill } from '@/types'

interface SkillCardProps {
  /** Search result from SkillsMP */
  searchResult?: SkillSearchResult
  /** Installed skill data (if already installed) */
  installedSkill?: InstalledSkill
  /** Whether this skill is already installed */
  isInstalled?: boolean
  /** Whether an install operation is in progress */
  isInstalling?: boolean
  /** Translate function */
  t: (key: string) => string
  /** Called when install is clicked */
  onInstall?: () => void
  /** Called when the card is clicked (to show detail modal) */
  onSelect?: () => void
}

export function SkillCard({
  searchResult,
  installedSkill,
  isInstalled,
  isInstalling,
  t,
  onInstall,
  onSelect,
}: SkillCardProps) {
  const name = installedSkill?.name ?? searchResult?.name ?? 'Unknown'
  const description =
    installedSkill?.description ?? searchResult?.description ?? ''
  const author = installedSkill?.author ?? searchResult?.author ?? ''
  const stars = installedSkill?.stars ?? searchResult?.stars ?? 0

  const scripts = installedSkill?.scripts ?? []
  const pythonCount = scripts.filter((s) => s.language === 'python').length
  const bashCount = scripts.filter((s) => s.language === 'bash').length

  return (
    <Card
      onPress={onSelect}
      className="w-full"
      shadow="sm"
    >
      <Card.Content className="gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold truncate">{name}</h3>
            <p className="text-xs text-default-500 truncate">
              {t('by {author}').replace('{author}', author)}
            </p>
          </div>
          <div className="flex items-center gap-1 text-default-400 text-xs shrink-0">
            <Icon name="StarSolid" width={12} height={12} />
            <span>{stars.toLocaleString()}</span>
          </div>
        </div>

        <p className="text-xs text-default-600 line-clamp-2">{description}</p>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 flex-wrap">
            {pythonCount > 0 && (
              <Chip size="sm" variant="soft" color="success">
                {t('Python')}
              </Chip>
            )}
            {bashCount > 0 && (
              <Chip size="sm" variant="soft" color="warning">
                {t('Bash')}
              </Chip>
            )}
            {scripts.length === 0 && !searchResult && (
              <Chip size="sm" variant="soft" color="default">
                {t('Instructions')}
              </Chip>
            )}
          </div>

          {!isInstalled && onInstall && (
            <Button
              size="sm"
              color="primary"
              variant="secondary"
              isDisabled={isInstalling}
              onPress={(e: any) => {
                e.continuePropagation?.()
                onInstall()
              }}
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

          {isInstalled && (
            <Chip size="sm" variant="soft" color="success">
              {t('Installed')}
            </Chip>
          )}
        </div>
      </Card.Content>
    </Card>
  )
}
