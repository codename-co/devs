/**
 * ProvidersSection — Settings section for managing LLM provider credentials.
 *
 * Acts as a hash-based nested router:
 *  - #settings/providers          → ProvidersList (configured providers + cache)
 *  - #settings/providers/add      → ProviderSelect (grid selection)
 *  - #settings/providers/add/:id  → ProviderForm (credential form)
 */

import { useHashHighlight } from '@/hooks/useHashHighlight'
import { ProvidersList } from './ProvidersList'
import { ProviderSelect } from './ProviderSelect'
import { ProviderForm } from './ProviderForm'

export function ProvidersSection() {
  const { activeElement } = useHashHighlight()

  // Route based on the element segment of #settings/providers/{element}
  if (!activeElement) {
    return <ProvidersList />
  }

  if (activeElement === 'add') {
    return <ProviderSelect />
  }

  if (activeElement.startsWith('add/')) {
    const provider = activeElement.slice(4) // Remove "add/"
    return <ProviderForm provider={provider} />
  }

  // Fallback to list for unknown sub-routes
  return <ProvidersList />
}
