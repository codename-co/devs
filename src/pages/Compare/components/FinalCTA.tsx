import { Container, Icon, Section } from '@/components'
import { Button, Card, Link } from '@heroui/react'
import { motionVariants } from '../motion'
import type { IconName } from '@/lib/types'
import { useI18n, useUrl } from '@/i18n'
import localI18n from '../i18n'
import { PRODUCT } from '@/config/product'

interface FinalCTAAction {
  label: string
  href: string
  variant?: 'solid' | 'ghost'
  icon?: IconName
  isExternal?: boolean
}

interface FinalCTAProps {
  icon?: IconName
}

const GITHUB_URL = 'https://github.com/codename-co/devs'

export const FinalCTA = ({ icon = 'Heart' }: FinalCTAProps) => {
  const { lang, t } = useI18n(localI18n)
  const url = useUrl(lang)

  const title = t('Ready to Take Control of Your AI Workflow?')
  const subtitle = t(
    'Start using {productName} for free \u2014 no account needed, no credit card, no server to set up.',
    { productName: PRODUCT.displayName },
  )

  const actions: FinalCTAAction[] = [
    {
      label: t('Try {productName} Free →', {
        productName: PRODUCT.displayName,
      }),
      href: url('/'),
    },
    {
      label: t('View on GitHub'),
      href: GITHUB_URL,
      variant: 'ghost',
      icon: 'GitHub',
      isExternal: true,
    },
  ]

  return (
    <Section>
      <Container size={6}>
        <div {...motionVariants.card}>
          <Card
            shadow="sm"
            className="bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-primary-900/15 dark:to-secondary-900/15 border border-default-100"
          >
            <Card.Content className="p-10 text-center">
              <Icon
                name={icon}
                size="2xl"
                className="text-primary-500 mx-auto mb-4"
              />
              <h2 className="text-2xl md:text-3xl font-bold mb-3">{title}</h2>
              <p className="text-default-600 max-w-xl mx-auto mb-6">
                {subtitle}
              </p>
              <div className="flex gap-3 justify-center flex-wrap">
                {actions.map((action) => (
                  <Button
                    key={action.label}
                    as={Link}
                    href={action.href}
                    color={action.variant === 'ghost' ? 'default' : 'primary'}
                    variant={action.variant === 'ghost' ? 'ghost' : 'solid'}
                    size="lg"
                    radius="full"
                    isExternal={action.isExternal}
                  >
                    {action.icon && <Icon name={action.icon} size="md" />}
                    {action.label}
                  </Button>
                ))}
              </div>
            </Card.Content>
          </Card>
        </div>
      </Container>
    </Section>
  )
}
