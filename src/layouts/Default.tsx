import { Container, ContextualPanel, Icon, Section, Title } from '@/components'
import { AppDrawer } from '@/components/AppDrawer'
import { PageMenu, type PageMenuProps } from '@/components/PageMenu'
import { Tabbar } from '@/components/Tabbar'
import { languageDirection, useI18n } from '@/i18n'
import type { HeaderProps, IconName } from '@/lib/types'
import { useContextualPanelStore } from '@/stores/contextualPanelStore'
import { userSettings } from '@/stores/userStore'
import { useNavigate } from 'react-router-dom'
import {
  Avatar,
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Link,
  ToastProvider,
  Tooltip,
} from '@heroui/react'
import clsx from 'clsx'
import { useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { PRODUCT } from '@/config/product'

export interface DefaultLayoutProps {
  title?: string
  description?: string
  darkMode?: boolean
  header?: HeaderProps
  showBackButton?: boolean
  /**
   * Optional supplemental action items to be rendered in the PageMenu.
   * These will appear before the default menu items (Sync, Local Backup, etc.).
   */
  pageMenuActions?: PageMenuProps['supplementalActions']
  className?: string
  children: React.ReactNode
}

export default function DefaultLayout({
  title,
  // description,
  // darkMode,
  header,
  showBackButton = true,
  pageMenuActions,
  className,
  children,
}: DefaultLayoutProps) {
  const { lang, t } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()
  const clearBlocks = useContextualPanelStore((s) => s.clearBlocks)

  const direction = languageDirection[lang]

  // Clear contextual panel when navigating to a new page
  useEffect(() => {
    clearBlocks()
  }, [location.pathname, clearBlocks])

  const { platformName } = userSettings()

  const handleBack = () => {
    const currentPath = location.pathname
    const pathSegments = currentPath.split('/').filter(Boolean)

    pathSegments.pop()
    const parentPath = '/' + pathSegments.join('/')
    navigate(parentPath)
  }

  const metaTitle = [
    header?.title ?? title,
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
      <div className="flex relative min-h-screen">
        <AppDrawer />
        <div className="bg-background dark:bg-transparent md:m-4 md:rounded-xl flex flex-col-reverse w-full relative">
          <Tabbar className="md:hidden" />

          <main
            role="main"
            className="flex-1 flex flex-col w-full @container/main"
          >
            <div className="flex flex-col relative bg-transparent min-h-full">
              {(header || showBackButton) && (
                <div
                  className={clsx(
                    'pb-2 mb-0 bg-default-50 dark:bg-default-100 rounded-t-xl',
                    header?.color,
                  )}
                >
                  <Section mainClassName="section-blank">
                    {showBackButton && (
                      <Tooltip content={t('Back')}>
                        <Button
                          variant="light"
                          onPress={handleBack}
                          startContent={
                            <Icon
                              name="ArrowRight"
                              size="sm"
                              className="rotate-180"
                            />
                          }
                          className="absolute -ms-20 2xl:-ml-32 hidden xl:inline-flex dark:hover:bg-default-300 transition-[margin-left] duration-300 rtl:rotate-180"
                        />
                      </Tooltip>
                    )}
                    <Container className="relative">
                      {header?.icon &&
                        (header.icon.isEditable && header.icon.onEdit ? (
                          <Tooltip content={t('Edit agent appearance')}>
                            <button
                              type="button"
                              onClick={header.icon.onEdit}
                              className="mb-4 hidden xl:block cursor-pointer hover:scale-105 transition-transform focus:outline-none focus:ring-2 focus:ring-primary rounded-lg"
                            >
                              {header.icon.image ? (
                                <Avatar
                                  radius="full"
                                  src={`data:image/png;base64,${header.icon.image}`}
                                  alt=""
                                  className="w-12 h-12"
                                />
                              ) : (
                                <Icon
                                  size="3xl"
                                  name={header.icon.name as any}
                                  className={clsx(header.icon.color)}
                                />
                              )}
                            </button>
                          </Tooltip>
                        ) : header.icon.image ? (
                          <Avatar
                            radius="full"
                            src={`data:image/png;base64,${header.icon.image}`}
                            alt=""
                            className={clsx(
                              'w-12 h-12 rounded-xl object-cover mb-4 hidden xl:block',
                            )}
                          />
                        ) : header.icon.name ? (
                          <Icon
                            size="3xl"
                            name={header.icon.name as any}
                            className={clsx(
                              'mb-4 hidden xl:block',
                              header.icon.color,
                            )}
                          />
                        ) : null)}
                      {/* Header action buttons */}
                      <div className="absolute end-0 flex items-center gap-1 z-1">
                        {header?.cta && (
                          <Button
                            variant="light"
                            as={Link}
                            href={header.cta?.href ?? ''}
                            startContent={
                              header.cta.icon && (
                                <Icon name={header.cta.icon} size="sm" />
                              )
                            }
                            className="shrink-0 dark:hover:bg-default-300"
                          >
                            {header.cta?.label}
                          </Button>
                        )}
                        {header?.moreActions && (
                          <Dropdown>
                            <DropdownTrigger>
                              <Button
                                variant="light"
                                className="shrink-0 dark:hover:bg-default-300"
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
                      {header && (
                        <Title
                          id="title"
                          subtitleId="subtitle"
                          subtitle={header.subtitle}
                        >
                          {header.title}
                        </Title>
                      )}
                    </Container>
                  </Section>
                </div>
              )}
              <ToastProvider />
              <PageMenu supplementalActions={pageMenuActions} />

              <div
                className={`flex-1 flex flex-col pb-14 md:pb-0 [&>*:last-child]:flex-1 ${className ?? ''}`}
              >
                {children}
              </div>
            </div>
          </main>
        </div>
        <ContextualPanel />
      </div>
    </div>
  )
}
