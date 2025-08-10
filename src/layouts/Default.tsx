import { Container, Icon, Section, Title } from '@/components'
import { AppDrawer } from '@/components/AppDrawer'
import { useI18n } from '@/i18n'
import type { HeaderProps } from '@/lib/types'
import { Button, Link, Tooltip } from '@heroui/react'
import clsx from 'clsx'
import { useNavigate, useLocation } from 'react-router-dom'

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
      <div className="flex min-h-screen">
        <AppDrawer />
        <div className="flex-1 flex flex-col h-screen overflow-y-auto">
          <div className="h-full space-y space-y-8 view-transition-smooth relative">
            {(header || showBackButton) && (
              <div className={clsx('pb-2 mb-0', header?.color)}>
                <Section>
                  {showBackButton && (
                    <Tooltip content={t('Back')} placement="right">
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
                        className="absolute hidden xl:inline-flex"
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
                        variant="ghost"
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
                        className="absolute right-0 shrink-0"
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
            {children}
          </div>
        </div>
      </div>
    </main>
  )
}
