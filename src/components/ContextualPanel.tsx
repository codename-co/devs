import React, { useState, useEffect, memo } from 'react'
import {
  Accordion,
  AccordionItem,
  Button,
  ScrollShadow,
  Tooltip,
} from '@heroui/react'
import clsx from 'clsx'

import { Icon } from './Icon'
import { useContextualPanelStore } from '@/stores/contextualPanelStore'
import { userSettings } from '@/stores/userStore'
import { useI18n } from '@/i18n'

const BackDrop = () => (
  <div
    className="fixed inset-0 bg-black opacity-40 dark:opacity-70 -z-1 pointer-events-auto"
    onClick={userSettings.getState().toggleContextualPanel}
  />
)

export const ContextualPanel: React.FC = memo(() => {
  const isCollapsed = userSettings((s) => s.isContextualPanelCollapsed)
  const { hasBlocks } = useContextualPanelStore()

  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkViewport = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkViewport()
    window.addEventListener('resize', checkViewport)

    return () => window.removeEventListener('resize', checkViewport)
  }, [])

  useEffect(() => {
    if (isMobile && !userSettings.getState().isContextualPanelCollapsed) {
      userSettings.getState().toggleContextualPanel()
    }
  }, [isMobile])

  // Don't render if there are no blocks
  if (!hasBlocks()) {
    return null
  }

  return (
    <aside
      className={clsx(
        'pointer-events-none flex-0 h-full md:h-screen z-40 fixed md:relative end-0',
      )}
    >
      <div
        id="contextual-panel"
        data-testid="contextual-panel"
        className={clsx('h-full', isCollapsed && 'fixed end-0')}
        data-state={isCollapsed ? 'collapsed' : 'expanded'}
      >
        <CollapsedPanel className="panel-collapsed" />
        <ExpandedPanel className="panel-expanded" />
        {!isCollapsed && isMobile && <BackDrop />}

        <style>{
          /* CSS */ `
        #contextual-panel {
          transition: width 0.1s ease-in-out;
        }
        #contextual-panel[data-state="collapsed"] {
          width: 73px;
        }
        #contextual-panel[data-state="expanded"] {
          width: 384px;
        }
        #contextual-panel[data-state="collapsed"] .panel-expanded {
          display: none;
        }
        #contextual-panel[data-state="expanded"] .panel-collapsed {
          display: none;
        }
      `
        }</style>
      </div>
    </aside>
  )
})
ContextualPanel.displayName = 'ContextualPanel'

const CollapsedPanel = ({ className }: { className?: string }) => {
  const toggleCollapsed = userSettings((s) => s.toggleContextualPanel)
  const { t } = useI18n()

  return (
    <div
      className={`w-18 mt-24 p-4 h-full z-50 flex flex-col transition-all duration-200 ${className} pointer-events-none`}
    >
      <div className="flex flex-col items-center">
        <Tooltip content={t('Expand sidebar')} placement="left">
          <Button
            data-testid="panel-expand-button"
            isIconOnly
            variant="light"
            onPress={toggleCollapsed}
            className="backdrop-blur-xs backdrop-brightness-120 pointer-events-auto"
            aria-label={t('Expand sidebar')}
          >
            <Icon
              name="SidebarExpand"
              className="opacity-40 dark:opacity-60 rotate-180"
            />
          </Button>
        </Tooltip>
      </div>
    </div>
  )
}

const ExpandedPanel = ({ className }: { className?: string }) => {
  const { blocks } = useContextualPanelStore()
  const toggleCollapsed = userSettings((s) => s.toggleContextualPanel)
  const { t } = useI18n()

  return (
    <div
      className={`fixed w-96 bg-background dark:bg-content1 p-3 border-s border-default-200 dark:border-default-200 h-full flex flex-col overflow-y-auto ${className}`}
    >
      <ScrollShadow
        hideScrollBar
        className="pointer-events-auto flex flex-col overflow-y-auto flex-1 p-0.5"
      >
        <div className="sticky top-0 bg-background dark:bg-content1 z-10 pb-3 mb-2">
          <div className="flex items-center">
            <Tooltip content={t('Collapse sidebar')} placement="left">
              <Button
                data-testid="panel-collapse-button"
                isIconOnly
                variant="light"
                size="sm"
                onPress={toggleCollapsed}
                aria-label={t('Collapse sidebar')}
              >
                <Icon
                  name="SidebarCollapse"
                  className="opacity-40 dark:opacity-60 rotate-180"
                />
              </Button>
            </Tooltip>
          </div>
        </div>

        <Accordion
          // selectionMode="multiple"
          defaultExpandedKeys={blocks
            .filter((block) => block.defaultExpanded)
            .map((block) => block.id)}
          itemClasses={{
            base: 'py-0 w-full',
            title: 'text-sm font-medium',
            trigger: 'px-2 py-3 data-[hover=true]:bg-default-100 rounded-lg',
            indicator: 'text-default-400',
            content: 'px-2 pb-3 pt-0',
          }}
        >
          {blocks.map((block) => (
            <AccordionItem
              key={block.id}
              aria-label={block.title}
              title={
                <div className="flex items-center gap-2">
                  {block.icon && (
                    <Icon
                      name={block.icon}
                      className="w-4 h-4 text-default-600"
                    />
                  )}
                  <span>{block.title}</span>
                </div>
              }
            >
              <div className="mb-2" />
              {block.content}
            </AccordionItem>
          ))}
        </Accordion>
      </ScrollShadow>
    </div>
  )
}

// Legacy component for backwards compatibility - will be removed
interface ContextualPanelSectionProps {
  title: string
  children: React.ReactNode
  defaultExpanded?: boolean
}

export const ContextualPanelSection: React.FC<ContextualPanelSectionProps> = ({
  title,
  children,
  defaultExpanded = false,
}) => {
  return (
    <Accordion
      selectionMode="multiple"
      defaultExpandedKeys={defaultExpanded ? ['section'] : []}
      className="px-0"
      itemClasses={{
        base: 'py-0 w-full',
        title: 'text-md font-medium',
        trigger: 'px-2 py-3 data-[hover=true]:bg-default-100 rounded-lg',
        indicator: 'text-default-400',
        content: 'px-2 pb-3 pt-0',
      }}
    >
      <AccordionItem key="section" aria-label={title} title={title}>
        {children}
      </AccordionItem>
    </Accordion>
  )
}
