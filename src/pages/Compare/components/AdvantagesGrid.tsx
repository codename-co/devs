import { Container, Icon, Section, Title } from '@/components'
import { Card, Chip } from '@/components/heroui-compat'
import { motionVariants } from '../motion'
import type { IconName } from '@/lib/types'

export interface Advantage {
  icon: IconName
  title: string
  desc: string
  gradient: string
}

interface AdvantagesGridProps {
  chipLabel: string
  title: string
  advantages: readonly Advantage[]
}

export const AdvantagesGrid = ({
  chipLabel,
  title,
  advantages,
}: AdvantagesGridProps) => (
  <Section>
    <Container size={6} className="text-center">
      <div {...motionVariants.chip}>
        <Chip variant="soft" color="accent" className="mb-4">
          {chipLabel}
        </Chip>
      </div>
      <div {...motionVariants.title}>
        <Title level={2} size="3xl" className="mb-8">
          {title}
        </Title>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {advantages.map((adv) => (
          <div key={adv.title} {...motionVariants.card}>
            <Card
              shadow="sm"
              className={`border border-default-100 bg-gradient-to-br ${adv.gradient}`}
            >
              <Card.Content className="p-6 text-left">
                <Icon
                  name={adv.icon}
                  size="lg"
                  className="text-primary-500 mb-3"
                />
                <h3 className="text-lg font-semibold mb-2">{adv.title}</h3>
                <p className="text-default-600 text-sm">{adv.desc}</p>
              </Card.Content>
            </Card>
          </div>
        ))}
      </div>
    </Container>
  </Section>
)
