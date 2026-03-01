import { ContextualPanel, Icon } from '@/components'
import { InspectorPanel } from '@/components/InspectorPanel'
import { AppDrawer } from '@/components/AppDrawer'
import { Tabbar } from '@/components/Tabbar'
import { languageDirection, useI18n } from '@/i18n'
import type { HeaderProps, IconName } from '@/lib/types'
import { useContextualPanelStore } from '@/stores/contextualPanelStore'
import { useInspectorPanelStore } from '@/stores/inspectorPanelStore'
import { userSettings } from '@/stores/userStore'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Avatar,
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Link,
  ScrollShadow,
  ToastProvider,
  Tooltip,
} from '@heroui/react'
import clsx from 'clsx'
import { useCallback, useEffect, useRef } from 'react'
import { PRODUCT } from '@/config/product'

export interface RunLayoutProps {
  /** Page title for the document <title> tag */
  title?: string
  /** Header configuration (icon, title, subtitle, cta, moreActions) */
  header?: HeaderProps
  /** Additional CSS classes for the content area */
  className?: string
  children: React.ReactNode
}

/**
 * A streamlined layout for the agent chat/run page.
 *
 * Differs from DefaultLayout:
 * - Compact inline top bar with agent icon, title, and action buttons
 * - No large header block or PageMenu — maximizes vertical space for conversation
 * - Full-height content area designed for chat UIs with sticky prompt areas
 */
export default function RunLayout({
  title,
  header,
  className,
  children,
}: RunLayoutProps) {
  const { lang, t } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()
  const clearBlocks = useContextualPanelStore((s) => s.clearBlocks)
  const closeInspector = useInspectorPanelStore((s) => s.close)

  const direction = languageDirection[lang]

  // Clear contextual panel and inspector when navigating to a new page
  useEffect(() => {
    clearBlocks()
    closeInspector()
  }, [location.pathname, clearBlocks, closeInspector])

  const isInspectorOpen = useInspectorPanelStore((s) => s.item !== null)

  // Ref for the conversation scroll container so adjacent panels can forward wheel events
  const conversationRef = useRef<HTMLElement>(null)

  const handlePanelWheel = useCallback((e: React.WheelEvent) => {
    const el = conversationRef.current
    if (!el) return
    el.scrollTop += e.deltaY
  }, [])

  const { platformName } = userSettings()

  const handleBack = () => {
    const currentPath = location.pathname
    const pathSegments = currentPath.split('/').filter(Boolean)
    pathSegments.pop()
    const parentPath = '/' + pathSegments.join('/')
    navigate(parentPath)
  }

  const metaTitle = [
    typeof header?.title === 'string' ? header.title : title,
    platformName || PRODUCT.displayName,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div
      className="flex-grow w-full bg-[var(--devs-bg)] dark:bg-default-50"
      dir={direction}
    >
      <title children={metaTitle} />
      <div className="flex relative h-screen overflow-hidden">
        <AppDrawer />
        <div
          className={clsx(
            'bg-background dark:bg-transparent md:m-4 md:rounded-xl flex flex-col-reverse relative transition-all duration-200 overflow-hidden',
            isInspectorOpen
              ? 'min-w-64 w-full md:w-1/3 md:max-w-256 shrink-0'
              : 'w-full',
          )}
        >
          <Tabbar className="md:hidden" />

          <main
            role="main"
            className="flex-1 flex flex-col w-full overflow-hidden @container/main"
          >
            <div className="flex-1 flex flex-col relative bg-transparent min-h-0">
              {/* Compact top bar */}
              {header && (
                <div className="sticky top-0 z-10 rounded-t-xl">
                  <div className="flex items-center gap-4 px-4 h-14 max-w-full">
                    {/* Back button */}
                    <Tooltip content={t('Back')}>
                      <Button
                        isIconOnly
                        variant="light"
                        size="sm"
                        onPress={handleBack}
                        className="shrink-0 dark:hover:bg-default-300 rtl:rotate-180"
                      >
                        <Icon
                          name="ArrowRight"
                          size="sm"
                          className="rotate-180"
                        />
                      </Button>
                    </Tooltip>

                    {/* Agent icon */}
                    {header.icon &&
                      (header.icon.isEditable && header.icon.onEdit ? (
                        <Tooltip content={t('Edit agent appearance')}>
                          <button
                            type="button"
                            onClick={header.icon.onEdit}
                            className="shrink-0 cursor-pointer hover:scale-105 transition-transform focus:outline-none focus:ring-2 focus:ring-primary rounded-full"
                          >
                            {header.icon.image ? (
                              <Avatar
                                radius="full"
                                src={`data:image/png;base64,${header.icon.image}`}
                                alt=""
                                className="w-7 h-7"
                              />
                            ) : (
                              <div className={clsx(header.icon.color)}>
                                <Icon size="md" name={header.icon.name} />
                              </div>
                            )}
                          </button>
                        </Tooltip>
                      ) : header.icon.image ? (
                        <Avatar
                          radius="full"
                          src={`data:image/png;base64,${header.icon.image}`}
                          alt=""
                          className="w-7 h-7 shrink-0"
                        />
                      ) : header.icon.name ? (
                        <div className={clsx(header.icon.color)}>
                          <Icon size="md" name={header.icon.name as any} />
                        </div>
                      ) : null)}

                    {/* Title + subtitle */}
                    <div className="flex-1 min-w-0">
                      <h1 className="text-sm font-semibold truncate leading-tight">
                        {header.title}
                      </h1>
                      {header.subtitle && (
                        <p className="text-xs text-default-500 truncate leading-tight">
                          {header.subtitle}
                        </p>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      {header.cta && (
                        <Tooltip content={header.cta.label}>
                          <Button
                            isIconOnly
                            variant="light"
                            size="sm"
                            as={Link}
                            href={header.cta.href ?? ''}
                            className="dark:hover:bg-default-300"
                          >
                            {header.cta.icon ? (
                              <Icon name={header.cta.icon} size="sm" />
                            ) : (
                              <span className="text-xs">
                                {header.cta.label}
                              </span>
                            )}
                          </Button>
                        </Tooltip>
                      )}
                      {header.moreActions && header.moreActions.length > 0 && (
                        <Dropdown>
                          <DropdownTrigger>
                            <Button
                              isIconOnly
                              variant="light"
                              size="sm"
                              className="dark:hover:bg-default-300"
                            >
                              <Icon name="MoreVert" size="sm" />
                            </Button>
                          </DropdownTrigger>
                          <DropdownMenu>
                            {header.moreActions.map((action) => (
                              <DropdownItem
                                key={action.label}
                                onClick={action.onClick}
                                startContent={
                                  <Icon name={action.icon as IconName} />
                                }
                                title={action.label}
                              />
                            ))}
                          </DropdownMenu>
                        </Dropdown>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <ToastProvider />

              {/* Full-height content area — no PageMenu or padded sections */}
              <ScrollShadow
                ref={conversationRef}
                role="main"
                hideScrollBar
                className={clsx(
                  'flex-1 flex flex-col pb-14 md:pb-0',
                  'w-full overflow-y-auto @container/main',
                  className,
                )}
              >
                {children}
              </ScrollShadow>
            </div>
          </main>
        </div>
        <div onWheel={handlePanelWheel}>
          <ContextualPanel />
        </div>
        <div onWheel={handlePanelWheel} className="flex-1 min-w-0">
          <InspectorPanel />
        </div>
      </div>
    </div>
  )
}
