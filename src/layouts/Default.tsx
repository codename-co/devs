import { Icon, Section, Title } from '@/components'
import type { HeaderProps } from '@/lib/types'
import { Button, Link } from '@heroui/react'
import clsx from 'clsx'

export default function DefaultLayout({
  // title,
  // description,
  // darkMode,
  header,
  children,
}: {
  title?: string
  description?: string
  darkMode?: boolean
  header?: HeaderProps
  children: React.ReactNode
}) {
  return (
    <main role="main" className="flex-grow w-full">
      <div className="flex min-h-screen">
        {/* <AppDrawer /> */}
        <div className="flex-1 flex flex-col h-screen overflow-y-auto">
          <div className="flex-1">
            <div className="h-full space-y space-y-8 view-transition-smooth">
              {header && (
                <div className={clsx('pb-2 mb-0', header.color)}>
                  <Section>
                    {header.icon?.name && (
                      <Icon
                        size="3xl"
                        name={header.icon.name as any}
                        className={clsx(
                          'mb-4 hidden xl:block',
                          header.icon.color,
                        )}
                      />
                    )}
                    <div className="flex justify-between items-center w-full">
                      <Title
                        id="title"
                        subtitleId="subtitle"
                        subtitle={header.subtitle}
                      >
                        {header.title}
                      </Title>

                      {header.cta && (
                        <Button
                          color="default"
                          variant="flat"
                          as={Link}
                          href={header.cta?.href ?? ''}
                          className="shrink-0"
                        >
                          {header.cta?.label}
                        </Button>
                      )}
                    </div>
                  </Section>
                </div>
              )}
              {children}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
