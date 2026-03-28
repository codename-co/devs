import { Container, Icon, Section } from '@/components'
import { Button, Chip, Link } from '@/components/heroui-compat'
import { motionVariants } from '../motion'
import { useI18n, useUrl } from '@/i18n'
import localI18n from '../i18n'
import { PRODUCT } from '@/config/product'

const GITHUB_URL = 'https://github.com/codename-co/devs'

interface ComparisonHeroProps {
  title: string
  subtitle: string
}

export const ComparisonHero = ({ title, subtitle }: ComparisonHeroProps) => {
  const { lang, t } = useI18n(localI18n)
  const url = useUrl(lang)

  return (
    <Section mainClassName="bg-gradient-to-b from-primary-50/50 via-transparent to-transparent dark:from-primary-900/10">
      <Container size={6} className="text-center py-16">
        <div {...motionVariants.chip}>
          <Chip variant="soft" color="accent" className="mb-6">
            {t('Comparison')}
          </Chip>
        </div>

        <div {...motionVariants.title}>
          <h1 className="text-5xl font-bold !leading-tight mb-4">{title}</h1>
        </div>

        <div {...motionVariants.subtitle}>
          <p className="max-w-2xl mx-auto text-lg text-default-600 mb-8">
            {subtitle}
          </p>
        </div>

        <div
          {...motionVariants.cta}
          className="flex gap-3 justify-center flex-wrap"
        >
          <Button
            as={Link}
            href={url('/')}
            color="primary"
            size="lg"
            radius="full"
          >
            {t('Try {productName} Free →', {
              productName: PRODUCT.displayName,
            })}
          </Button>
          <Button
            as={Link}
            href={GITHUB_URL}
            variant="ghost"
            size="lg"
            radius="full"
            isExternal
          >
            <Icon name="GitHub" size="md" />
            {t('View on GitHub')}
          </Button>
        </div>
      </Container>
    </Section>
  )
}
