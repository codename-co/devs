import { Container, Icon, Section } from '@/components'
import { Card } from '@heroui/react'
import { motionVariants } from '../motion'
import { PRODUCT } from '@/config/product'
import type { IconName } from '@/lib/types'

export interface TLDRItem {
  icon: IconName
  title: string
  devs: string
  alt: string
}

interface TLDRCardsProps {
  items: TLDRItem[]
  altName: string
}

export const TLDRCards = ({ items, altName }: TLDRCardsProps) => (
  <Section>
    <Container size={6}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {items.map((item, i) => (
          <div key={i} {...motionVariants.card}>
            <Card shadow="sm" className="border border-default-100">
              <Card.Content className="p-5 text-center">
                <Icon
                  name={item.icon}
                  size="xl"
                  className="text-primary-500 mx-auto mb-3"
                />
                <h3 className="text-lg font-semibold mb-3">{item.title}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-default-500">
                      {PRODUCT.displayName}
                    </span>
                    <span className="font-medium text-success-600">
                      {item.devs}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-default-500">{altName}</span>
                    <span className="font-medium text-danger-500">
                      {item.alt}
                    </span>
                  </div>
                </div>
              </Card.Content>
            </Card>
          </div>
        ))}
      </div>
    </Container>
  </Section>
)
