import { Container, Icon, Section, Title } from '@/components'
import { Button, Card, Chip, Link } from '@/components/heroui-compat'
import { motionVariants } from '../motion'
import { useI18n, useUrl } from '@/i18n'
import localI18n from '../i18n'
import { PRODUCT } from '@/config/product'

interface PricingFeature {
  text: string
  included: boolean
}

interface AltPricingTier {
  name: string
  price: string
  features: PricingFeature[]
}

interface PricingComparisonProps {
  altTier: AltPricingTier
}

export const PricingComparison = ({ altTier }: PricingComparisonProps) => {
  const { lang, t } = useI18n(localI18n)
  const url = useUrl(lang)

  const devsTier = {
    name: PRODUCT.displayName,
    price: t('$0/mo'),
    highlighted: true,
    features: [
      { text: t('Unlimited agents'), included: true },
      { text: t('All features included'), included: true },
      { text: t('Full data privacy'), included: true },
      { text: t('BYOK \u2014 any LLM provider'), included: true },
    ],
    cta: {
      label: t('Try {productName} Free →', {
        productName: PRODUCT.displayName,
      }),
      href: url('/'),
    },
  }

  const tiers = [
    {
      ...devsTier,
      cta: devsTier.cta as { label: string; href: string } | undefined,
    },
    {
      ...altTier,
      highlighted: false,
      cta: undefined as { label: string; href: string } | undefined,
    },
  ]

  return (
    <Section>
      <Container size={6} className="text-center">
        <div {...motionVariants.chip}>
          <Chip variant="soft" color="accent" className="mb-4">
            {t('Pricing')}
          </Chip>
        </div>
        <div {...motionVariants.title}>
          <Title level={2} size="3xl" className="mb-8">
            {t('Stop Paying for the Platform')}
          </Title>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tiers.map((tier) => (
            <div key={tier.name} {...motionVariants.card}>
              <Card
                shadow="sm"
                className={
                  tier.highlighted
                    ? 'border-2 border-primary-200 dark:border-primary-800/30 bg-gradient-to-br from-primary-50/50 to-transparent dark:from-primary-900/10'
                    : 'border border-default-200'
                }
              >
                <Card.Content className="p-6">
                  <h3 className="text-xl font-semibold mb-2">{tier.name}</h3>
                  <p
                    className={`text-4xl font-bold mb-4 ${tier.highlighted ? 'text-primary-600' : 'text-default-400'}`}
                  >
                    {tier.price}
                  </p>
                  <ul className="space-y-3 text-left mb-6">
                    {tier.features.map((feat) => (
                      <li
                        key={feat.text}
                        className="flex items-center gap-2 text-sm"
                      >
                        <Icon
                          name={feat.included ? 'CheckCircle' : 'Xmark'}
                          size="sm"
                          className={`shrink-0 ${feat.included ? 'text-success-600' : 'text-danger-500'}`}
                        />
                        <span
                          className={feat.included ? '' : 'text-default-500'}
                        >
                          {feat.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {tier.cta && (
                    <Button
                      as={Link}
                      href={tier.cta.href}
                      color="primary"
                      size="md"
                      radius="full"
                      fullWidth
                    >
                      {tier.cta.label}
                    </Button>
                  )}
                </Card.Content>
              </Card>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  )
}
