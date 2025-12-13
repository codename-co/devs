import { Container, ContextualPanel, Icon, Section, Title } from '@/components'
import { AppDrawer } from '@/components/AppDrawer'
import { Tabbar } from '@/components/Tabbar'
import { languageDirection, useI18n } from '@/i18n'
import type { HeaderProps, IconName } from '@/lib/types'
import { useContextualPanelStore } from '@/stores/contextualPanelStore'
import { userSettings } from '@/stores/userStore'
import {
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
import { useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { PRODUCT } from '@/config/product'

export default function DefaultLayout({
  title,
  // description,
  // darkMode,
  header,
  showBackButton = true,
  children,
}: {
  title?: string
  description?: string
  darkMode?: boolean
  header?: HeaderProps
  showBackButton?: boolean
  children: React.ReactNode
}) {
  const { lang, t } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()
  const clearBlocks = useContextualPanelStore((s) => s.clearBlocks)

  const direction = languageDirection[lang]

  // Clear contextual panel when navigating to a new page
  useEffect(() => {
    clearBlocks()
  }, [location.pathname, clearBlocks])

  const { platformName, theme } = userSettings()
  const [systemPrefersDark, setSystemPrefersDark] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    setSystemPrefersDark(mediaQuery.matches)

    const handleChange = (e: MediaQueryListEvent) => {
      setSystemPrefersDark(e.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  const isDark = theme === 'dark' || (theme === 'system' && systemPrefersDark)

  useEffect(() => {
    if (isDark) {
      document.body.classList.add('dark')
    } else {
      document.body.classList.remove('dark')
    }
  }, [isDark])

  const handleBack = () => {
    const currentPath = location.pathname
    const pathSegments = currentPath.split('/').filter(Boolean)

    if (pathSegments.length > 1) {
      pathSegments.pop()
      const parentPath = '/' + pathSegments.join('/')
      navigate(parentPath)
    } else {
      navigate('/')
    }
  }

  const metaTitle = [
    header?.title ?? title,
    platformName || PRODUCT.displayName,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="flex-grow w-full" dir={direction}>
      <title children={metaTitle} />
      <div className="flex relative min-h-screen">
        <AppDrawer />
        <div className="flex flex-col-reverse w-full relative">
          <Tabbar />

          <main
            role="main"
            className="flex-1 flex flex-col w-full @container/main"
          >
            <div className="space-y space-y-8 relative bg-transparent min-h-full">
              {(header || showBackButton) && (
                <div
                  className={clsx(
                    'pb-2 mb-0 bg-default-50 dark:bg-default-100',
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
                      {header?.icon?.name && (
                        <Icon
                          size="3xl"
                          name={header.icon.name as any}
                          className={clsx(
                            'mb-4 hidden xl:block',
                            header.icon.color,
                          )}
                        />
                      )}
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
                          className="absolute end-0 shrink-0 dark:hover:bg-default-300"
                        >
                          {header.cta?.label}
                        </Button>
                      )}
                      {header?.moreActions && (
                        <Dropdown>
                          <DropdownTrigger>
                            <Button
                              variant="light"
                              className="absolute end-0 shrink-0 dark:hover:bg-default-300"
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

              {children}
            </div>
          </main>
        </div>
        <ContextualPanel />
      </div>
    </div>
  )
}
