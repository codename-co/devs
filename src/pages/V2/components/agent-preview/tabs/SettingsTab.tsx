import { useCallback } from 'react'
import { Chip, Label, Slider } from '@heroui/react_3'
import { Icon } from '@/components'
import { useI18n } from '@/i18n'
import { updateAgent } from '@/stores/agentStore'
import type { Agent } from '@/types'

interface SettingsTabProps {
  agent: Agent
  isCustom: boolean
}

function getTemperatureLabel(temp: number): string {
  if (temp <= 0.3) return 'Precise'
  if (temp <= 0.7) return 'Balanced'
  if (temp <= 1.2) return 'Creative'
  return 'Experimental'
}

function getTemperatureColor(temp: number): string {
  if (temp <= 0.3) return 'text-primary'
  if (temp <= 0.7) return 'text-success'
  if (temp <= 1.2) return 'text-warning'
  return 'text-danger'
}

export function SettingsTab({ agent, isCustom }: SettingsTabProps) {
  const { t } = useI18n()

  const temperature = agent.temperature ?? 0.7

  const handleTemperatureChange = useCallback(
    (value: number | number[]) => {
      if (!isCustom) return
      const temp = Array.isArray(value) ? value[0] : value
      updateAgent(agent.id, { temperature: temp })
    },
    [agent.id, isCustom],
  )

  return (
    <div className="flex flex-col gap-6 py-1">
      {/* Temperature */}
      <div className="flex flex-col gap-3">
        {isCustom ? (
          <Slider
            aria-label="Temperature"
            className="w-full max-w-lg"
            minValue={0}
            maxValue={2}
            step={0.1}
            defaultValue={temperature}
            onChangeEnd={handleTemperatureChange}
          >
            <Label className="flex items-center gap-2">
              Temperature
              <Chip
                size="sm"
                variant="soft"
                className={`text-xs ${getTemperatureColor(temperature)}`}
              >
                {getTemperatureLabel(temperature)}
              </Chip>
            </Label>
            <Slider.Output />
            <Slider.Track>
              <Slider.Fill />
              <Slider.Thumb />
            </Slider.Track>
          </Slider>
        ) : (
          <div className="bg-default-100 h-2 rounded-full">
            <div className="bg-primary h-full rounded-full transition-all" />
          </div>
        )}
        <p className="text-muted text-xs">
          Lower values produce focused and deterministic output. Higher values
          increase creativity and variation.
        </p>
      </div>

      {/* Agent stats */}
      <div className="border-separator border-t pt-4">
        <h3 className="text-muted mb-3 text-xs font-medium uppercase tracking-wide">
          Agent info
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-default-50 dark:bg-default-100/50 rounded-xl p-3">
            <div className="flex items-center gap-1.5">
              <Icon name="Tools" size="sm" className="text-muted" />
              <span className="text-muted text-xs">{t('Tools') as string}</span>
            </div>
            <p className="text-foreground mt-1 text-lg font-semibold">
              {agent.tools?.length ?? 0}
            </p>
          </div>
          <div className="bg-default-50 dark:bg-default-100/50 rounded-xl p-3">
            <div className="flex items-center gap-1.5">
              <Icon name="Book" size="sm" className="text-muted" />
              <span className="text-muted text-xs">
                {t('Knowledge') as string}
              </span>
            </div>
            <p className="text-foreground mt-1 text-lg font-semibold">
              {agent.knowledgeItemIds?.length ?? 0}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
