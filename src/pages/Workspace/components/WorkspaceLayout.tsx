import type { ReactNode } from 'react'
import { userSettings } from '@/stores/userStore'

interface WorkspaceLayoutProps {
  sidebar?: ReactNode
  collection?: ReactNode
  preview?: ReactNode
  auxiliary?: ReactNode
  children?: ReactNode
  className?: string
}

/**
 * Generic shell for sidebar | collection | preview | optional auxiliary view.
 *
 * It centralizes responsive grid behavior so different V2 entities can reuse
 * one layout contract (threads, conversations, agents, ...).
 */
export function WorkspaceLayout({
  sidebar,
  collection,
  preview,
  auxiliary,
  children,
  className,
}: WorkspaceLayoutProps) {
  const hasSidebar = Boolean(sidebar)
  const hasCollection = Boolean(collection)
  const hasPreview = Boolean(preview)
  const hasAuxiliary = Boolean(auxiliary)
  const isCollapsed = userSettings((state) => state.isV2SidebarCollapsed)

  const sidebarCol = isCollapsed ? '56px' : 'minmax(180px,224px)'

  // Build responsive grid-template-columns via inline style for lg breakpoint
  // (Tailwind can't handle dynamic grid column values)
  const lgColumns = hasSidebar
    ? hasCollection && hasPreview && hasAuxiliary
      ? `${sidebarCol} minmax(280px,360px) minmax(400px,1fr) minmax(400px,45%)`
      : hasCollection && hasPreview
        ? `${sidebarCol} minmax(280px,360px) minmax(400px,1fr)`
        : `${sidebarCol} 1fr`
    : hasCollection && hasPreview && hasAuxiliary
      ? 'minmax(280px,360px) minmax(400px,1fr) minmax(400px,45%)'
      : hasCollection && hasPreview
        ? 'minmax(280px,360px) minmax(400px,1fr)'
        : '1fr'

  const mdColumns = hasSidebar
    ? hasCollection && hasPreview && hasAuxiliary
      ? 'minmax(280px,360px) minmax(400px,1fr) minmax(400px,45%)'
      : hasCollection && hasPreview
        ? 'minmax(280px,360px) minmax(400px,1fr)'
        : '1fr'
    : hasCollection && hasPreview && hasAuxiliary
      ? 'minmax(280px,360px) minmax(400px,1fr) minmax(400px,45%)'
      : hasCollection && hasPreview
        ? 'minmax(280px,360px) minmax(400px,1fr)'
        : '1fr'

  return (
    <div
      className={`bg-background grid-workspace grid h-dvh overflow-hidden ${className ?? ''}`}
      style={
        {
          gridAutoFlow: 'column',
          '--ws-md-cols': mdColumns,
          '--ws-lg-cols': lgColumns,
        } as React.CSSProperties
      }
    >
      {sidebar}
      {collection}
      {preview}
      {auxiliary}
      {children}
    </div>
  )
}
