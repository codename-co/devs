import { Container, Icon, Section, Title } from '@/components'
import { Card, Chip } from '@heroui/react'
import { motionVariants } from '../motion'
import { useI18n } from '@/i18n'
import localI18n from '../i18n'
import { PRODUCT } from '@/config/product'

interface HonestTakeSide {
  title: string
  items: string[]
  variant: 'positive' | 'warning'
}

interface HonestTakeProps {
  warningSide: Omit<HonestTakeSide, 'variant'>
}

export const HonestTake = ({ warningSide }: HonestTakeProps) => {
  const { t } = useI18n(localI18n)

  const sides: [HonestTakeSide, HonestTakeSide] = [
    {
      title: t('Choose {productName} if you\u2026', {
        productName: PRODUCT.displayName,
      }),
      variant: 'positive',
      items: [
        t('Care about data privacy and sovereignty'),
        t('Want full control over LLM providers and costs'),
        t('Need multi-agent orchestration with team coordination'),
        t('Prefer open-source, self-hosted solutions'),
        t('Want to work offline or in air-gapped environments'),
      ],
    },
    { ...warningSide, variant: 'warning' },
  ]

  return (
    <Section>
      <Container size={6}>
        <div className="text-center mb-8">
          <div {...motionVariants.chip}>
            <Chip variant="soft" color="accent" className="mb-4">
              {t('Honest Take')}
            </Chip>
          </div>
          <div {...motionVariants.title}>
            <Title level={2} size="3xl">
              {t('Who Should Choose What')}
            </Title>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sides.map((side) => {
            const isPositive = side.variant === 'positive'
            return (
              <div key={side.title} {...motionVariants.card}>
                <Card
                  shadow="sm"
                  className={`border h-full ${isPositive ? 'border-success-200' : 'border-warning-200'}`}
                >
                  <Card.Content className="p-6">
                    <h3
                      className={`text-lg font-semibold mb-4 flex items-start gap-2 ${isPositive ? 'text-success-600' : 'text-warning-600'}`}
                    >
                      <Icon
                        name={isPositive ? 'CheckCircle' : 'WarningTriangle'}
                        size="lg"
                      />
                      {side.title}
                    </h3>
                    <ul className="space-y-2">
                      {side.items.map((text) => (
                        <li
                          key={text}
                          className="flex items-start gap-2 text-sm text-default-700"
                        >
                          <span className="mt-0.5">•</span>
                          {text}
                        </li>
                      ))}
                    </ul>
                  </Card.Content>
                </Card>
              </div>
            )
          })}
        </div>
      </Container>
    </Section>
  )
}
