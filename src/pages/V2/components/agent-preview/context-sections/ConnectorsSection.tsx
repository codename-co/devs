import { Chip } from '@heroui/react_3'
import { Icon } from '@/components'
import { useI18n } from '@/i18n'
import { useConnectorStore } from '@/features/connectors/stores'
import { SectionCard, SectionEmpty } from '../shared/SectionCard'

const statusColors: Record<string, string> = {
  connected: 'text-success',
  error: 'text-danger',
  syncing: 'text-warning',
}

export function ConnectorsSection() {
  const { t } = useI18n()
  const connectors = useConnectorStore((s) => s.connectors)

  return (
    <SectionCard
      icon="EvPlug"
      title={t('Connectors') as string}
      count={connectors.length}
    >
      {connectors.length === 0 ? (
        <SectionEmpty
          icon="EvPlug"
          message="No connectors linked"
        />
      ) : (
        <div className="flex flex-col gap-1">
          {connectors.map((conn) => (
            <div
              key={conn.id}
              className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-default-100"
            >
              <Icon
                name="CloudCheck"
                size="sm"
                className="text-muted shrink-0"
              />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-foreground truncate text-xs font-medium">
                  {conn.name}
                </span>
                <span className="text-muted text-xs">
                  {conn.provider}
                </span>
              </div>
              <Chip
                size="sm"
                variant="soft"
                className={`shrink-0 text-xs ${statusColors[conn.status] ?? ''}`}
              >
                {conn.status}
              </Chip>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  )
}
