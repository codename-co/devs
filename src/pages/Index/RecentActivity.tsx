import { useMemo } from 'react'
import { Card, Link } from '@/components/heroui-compat'
import { Icon } from '@/components/Icon'
import { Container } from '@/components'
import { formatConversationDate } from '@/lib/format'
import { useRecentActivity } from '@/hooks/useRecentActivity'
import { useI18n, useUrl } from '@/i18n'
import { motionVariants } from './motion'
import localeI18n from './i18n'

export function RecentActivity() {
  const { lang, t } = useI18n(localeI18n)
  const url = useUrl(lang)

  const allItems = useRecentActivity(lang)

  const items = useMemo(
    () =>
      allItems
        .filter((i) => i.type === 'conversation' || i.type === 'task')
        .slice(0, 6),
    [allItems],
  )

  if (items.length === 0) return null

  return (
    <div {...motionVariants.recentActivity}>
      <Container size={5} className="!mt-0 !mb-0 !space-y-3">
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <h3 className="text-xs font-medium text-default-400 uppercase tracking-wider">
              {t('Recent activity')}
            </h3>
            <Link
              href={url('/history')}
              size="sm"
              className="text-xs text-default-400 cursor-pointer"
            >
              {t('View all')}
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {items.map((item) => (
              <Card
                key={item.id}
                as={Link}
                href={item.href}
                shadow="none"
                className="bg-default-50 dark:bg-default-100/50 border border-default-200/50 hover:border-default-300 transition-colors"
              >
                <Card.Content className="p-3 flex flex-row items-center gap-3">
                  <Icon
                    name={item.icon}
                    size="md"
                    className="text-default-400 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {item.subtitle && (
                        <>
                          <span className="text-xs text-default-400 truncate">
                            {item.subtitle}
                          </span>
                          <span className="text-default-300">·</span>
                        </>
                      )}
                      <span className="text-xs text-default-400 whitespace-nowrap">
                        {formatConversationDate(new Date(item.timestamp), lang)}
                      </span>
                    </div>
                  </div>
                  <Icon
                    name="NavArrowRight"
                    size="md"
                    className="text-default-300 flex-shrink-0"
                  />
                </Card.Content>
              </Card>
            ))}
          </div>
        </div>
      </Container>
    </div>
  )
}
