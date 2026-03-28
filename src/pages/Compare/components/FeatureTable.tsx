import { Container, Section, Title } from '@/components'
import { Chip } from '@heroui/react'
import { motionVariants } from '../motion'
import { PRODUCT } from '@/config/product'
import { StatusIcon, type ComparisonStatus } from './StatusIcon'
import { useI18n } from '@/i18n'
import localI18n from '../i18n'

export type FeatureRow = [
  name: string,
  devsVal: string,
  altVal: string,
  devsStatus: ComparisonStatus,
  altStatus: ComparisonStatus,
]

interface FeatureTableProps {
  features: readonly FeatureRow[]
  altName: string
}

export const FeatureTable = ({ features, altName }: FeatureTableProps) => {
  const { t } = useI18n(localI18n)

  return (
    <Section>
      <Container size={6} className="text-center">
        <div {...motionVariants.chip}>
          <Chip variant="soft" color="accent" className="mb-4">
            {t('Feature Comparison')}
          </Chip>
        </div>
        <div {...motionVariants.title}>
          <Title level={2} size="3xl" className="mb-8">
            {t('Head-to-Head Comparison')}
          </Title>
        </div>

        <div {...motionVariants.table}>
          <div className="overflow-hidden rounded-lg border border-default-200">
            <div className="grid grid-cols-3 bg-default-100 dark:bg-default-50/10 px-4 py-3 text-sm font-semibold text-left">
              <div>{t('Feature')}</div>
              <div>{PRODUCT.displayName}</div>
              <div>{altName}</div>
            </div>
            {features.map(
              ([name, devsVal, altVal, devsStatus, altStatus], i) => (
                <div
                  key={name}
                  className={`grid grid-cols-3 px-4 py-3 text-sm items-center ${i % 2 === 0 ? 'bg-default-50/50 dark:bg-default-50/5' : 'bg-transparent'}`}
                >
                  <div className="text-left text-default-700">{name}</div>
                  <div className="flex items-center gap-1.5">
                    <StatusIcon status={devsStatus} />
                    <span className="text-default-600 text-xs hidden sm:inline">
                      {devsVal}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <StatusIcon status={altStatus} />
                    <span className="text-default-600 text-xs hidden sm:inline">
                      {altVal}
                    </span>
                  </div>
                </div>
              ),
            )}
          </div>
        </div>
      </Container>
    </Section>
  )
}
