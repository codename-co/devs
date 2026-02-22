/**
 * ProviderSelect — Grid for selecting which LLM provider to add.
 *
 * Route: #settings/providers/add
 */

import { useNavigate, useLocation } from 'react-router-dom'
import { Card, CardBody } from '@heroui/react'
import { Icon } from '@/components'
import { useI18n } from '@/i18n'
import type { LLMProvider } from '@/types'
import type { IconName } from '@/lib/types'
import localI18n from '../i18n'
import { PROVIDERS } from '../providers'

export function ProviderSelect() {
  const { lang, t } = useI18n(localI18n)
  const navigate = useNavigate()
  const location = useLocation()

  const handleSelectProvider = (provider: LLMProvider) => {
    navigate(`${location.pathname}#settings/providers/add/${provider}`, {
      replace: true,
    })
  }

  return (
    <div data-testid="llm-providers" className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {PROVIDERS(lang, t).map((provider) => (
          <Card
            key={provider.provider}
            className="h-20 hover:bg-primary-50"
            isPressable
            onPress={() =>
              handleSelectProvider(provider.provider as LLMProvider)
            }
          >
            <CardBody className="flex flex-col items-center justify-center gap-1.5 p-2">
              <Icon name={provider.icon as IconName} className="h-5 w-5" />
              <span className="text-xs text-center leading-tight">
                {provider.name}
              </span>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  )
}
