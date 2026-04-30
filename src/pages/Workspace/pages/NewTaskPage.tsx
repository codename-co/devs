import { useV2Shell } from '../context'
import { Sidebar, WorkspaceLayout } from '../components'
import type { ThreadFilter } from '../types'
import { NewTaskHero } from './NewTaskHero'

/**
 * New task creation page — the default V2 landing view.
 *
 * The hero (logo + title + PromptArea + use-case dropdowns) lives in
 * `NewTaskHero` so it can be reused by the product tour. This page is just
 * the WorkspaceLayout shell wrapping it.
 */
export function NewTaskPage() {
  const { filter, setFilter, openSettings } = useV2Shell()
  return (
    <WorkspaceLayout
      sidebar={
        <Sidebar
          activeFilter={filter}
          onFilterChange={(f) => setFilter(f as ThreadFilter)}
          onOpenSettings={openSettings}
        />
      }
      preview={<NewTaskHero />}
    />
  )
}
