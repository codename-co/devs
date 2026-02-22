/**
 * ProvidersSection — Settings section for managing LLM provider credentials.
 *
 * Acts as a hash-based nested router:
 *  - #settings/providers          → ProvidersList (configured providers + cache)
 *  - #settings/providers/add      → ProviderSelect (grid selection)
 *  - #settings/providers/add/:id  → ProviderForm (credential form)
 */

import { useI18n } from '@/i18n'
import { useHashHighlight } from '@/hooks/useHashHighlight'
import { useSettingsLabel } from '../SettingsContext'
import { PROVIDERS } from '../providers'
import { ProvidersList } from './ProvidersList'
import { ProviderSelect } from './ProviderSelect'
import { ProviderForm } from './ProviderForm'
import localI18n from '../i18n'

export function ProvidersSection() {
  const { lang, t } = useI18n(localI18n)
  const { activeElement } = useHashHighlight()

  // Resolve provider config when on the form sub-route
  const providerKey = activeElement?.startsWith('add/')
    ? activeElement.slice(4)
    : null
  const providerConfig = providerKey
    ? PROVIDERS(lang, t).find((p) => p.provider === providerKey)
    : null

  // Push provider name + icon into the Settings header breadcrumb
  useSettingsLabel(providerConfig?.name ?? null, providerConfig?.icon)

  // Route based on the element segment of #settings/providers/{element}
  if (!activeElement) {
    return <ProvidersList />
  }

  if (activeElement === 'add') {
    return <ProviderSelect />
  }

  if (providerKey) {
    return <ProviderForm provider={providerKey} />
  }

  // Fallback to list for unknown sub-routes
  return <ProvidersList />
}
