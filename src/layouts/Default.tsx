import { Container, Icon, Section, Title } from '@/components'
import { AppDrawer } from '@/components/AppDrawer'
import { useI18n } from '@/i18n'
import type { HeaderProps } from '@/lib/types'
import { userSettings } from '@/stores/userStore'
import { Button, Link, ToastProvider, Tooltip } from '@heroui/react'
import clsx from 'clsx'
import { useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'

export default function DefaultLayout({
  // title,
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
  const { t } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()

  const { theme } = userSettings()
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

  const isDark = theme === 'dark' || (theme === 'auto' && systemPrefersDark)

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
  return (
    <main role="main" className="flex-grow w-full">
      <div className="flex min-h-screen relative">
        <AppDrawer />

        <div className="flex-1 flex flex-col h-screen overflow-y-auto dark:bg-default-50 w-full">
          <div className="h-full space-y space-y-8 view-transition-smooth relative bg-transparent">
            {(header || showBackButton) && (
              <div
                className={clsx(
                  'pb-2 mb-0 bg-default-50 dark:bg-default-100',
                  header?.color,
                )}
              >
                <Section>
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
                        className="absolute hidden xl:inline-flex dark:hover:bg-default-300"
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
                            <Icon
                              name={header.cta.icon}
                              size="sm"
                              className="rotate-180"
                            />
                          )
                        }
                        className="absolute right-0 shrink-0 dark:hover:bg-default-300"
                      >
                        {header.cta?.label}
                      </Button>
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
        </div>
      </div>
    </main>
  )
}
