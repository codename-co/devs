import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ToastProvider } from '@heroui/react'
import { Sidebar } from './components/Sidebar'
import { WorkspaceLayout } from './components/WorkspaceLayout'
import { useThreadSelection } from './hooks/useThreadSelection'
import { GlobalSearch } from '@/features/search'
import { SettingsModal } from '@/components/SettingsModal'
import { userSettings } from '@/stores/userStore'
import { PRODUCT } from '@/config/product'
import type { ThreadFilter } from './types'

export interface WorkspaceShellProps {
  /** Page title for the document <title> tag */
  title?: string
  /** Content to render in the main area (fills the preview/content slot) */
  children: React.ReactNode
  /** Optional className for the content wrapper */
  className?: string
}

/**
 * Wraps any page content with the Workspace sidebar + layout shell.
 *
 * Use this instead of DefaultLayout for all pages that should share
 * the unified sidebar navigation.
 */
export function WorkspaceShell({
  title,
  children,
  className,
}: WorkspaceShellProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { filter, setFilter } = useThreadSelection()

  // Settings modal via URL hash
  const isSettingsOpen = location.hash.startsWith('#settings')
  const openSettings = useCallback(
    () =>
      navigate(`${location.pathname}${location.search}#settings`, {
        replace: true,
      }),
    [navigate, location.pathname, location.search],
  )
  const closeSettings = useCallback(
    () =>
      navigate(`${location.pathname}${location.search}`, { replace: true }),
    [navigate, location.pathname, location.search],
  )

  const platformName = userSettings((state) => state.platformName)
  const metaTitle = [title, platformName || PRODUCT.displayName]
    .filter(Boolean)
    .join(' · ')

  return (
    <>
      <title children={metaTitle} />
      <WorkspaceLayout
        sidebar={
          <Sidebar
            activeFilter={filter}
            onFilterChange={(f) => setFilter(f as ThreadFilter)}
            onOpenSettings={openSettings}
          />
        }
        preview={
          <div
            className={`min-h-0 h-full overflow-y-auto ${className ?? ''}`}
          >
            <ToastProvider />
            {children}
          </div>
        }
      />
      <GlobalSearch />
      <SettingsModal isOpen={isSettingsOpen} onClose={closeSettings} />
    </>
  )
}
