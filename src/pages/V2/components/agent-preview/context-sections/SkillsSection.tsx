import { Chip } from '@heroui/react_3'
import { Icon } from '@/components'
import { useI18n } from '@/i18n'
import { useSkillsForAgent } from '@/stores/skillStore'
import { SectionCard, SectionEmpty } from '../shared/SectionCard'

interface SkillsSectionProps {
  agentId: string
}

export function SkillsSection({ agentId }: SkillsSectionProps) {
  const { t } = useI18n()
  const skills = useSkillsForAgent(agentId)

  return (
    <SectionCard
      icon="Puzzle"
      title={t('Skills') as string}
      count={skills.length}
    >
      {skills.length === 0 ? (
        <SectionEmpty
          icon="Puzzle"
          message="No skills assigned"
        />
      ) : (
        <div className="flex flex-col gap-1">
          {skills.map((skill) => (
            <div
              key={skill.id}
              className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-default-100"
            >
              <Icon
                name="Sparks"
                size="sm"
                className="text-muted shrink-0"
              />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-foreground truncate text-xs font-medium">
                  {skill.name}
                </span>
                {skill.description && (
                  <span className="text-muted line-clamp-1 text-xs">
                    {skill.description}
                  </span>
                )}
              </div>
              <Chip
                size="sm"
                variant="soft"
                className="shrink-0 text-xs"
              >
                {skill.enabled ? 'Active' : 'Inactive'}
              </Chip>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  )
}
