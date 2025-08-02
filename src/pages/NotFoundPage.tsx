import { Icon, Section } from '@/components'
import { useI18n } from '@/i18n'
import DefaultLayout from '@/layouts/Default'
import { useEffect } from 'react'

export const NotFoundPage = () => {
  const { t } = useI18n()

  useEffect(() => {
    // redirect the the parent path after a short delay
    setTimeout(() => {
      const parentPath = window.location.pathname
        .split('/')
        .slice(0, -1)
        .join('/')
      if (parentPath) {
        window.location.href = parentPath
      } else {
        window.location.href = '/'
      }
    }, 1000)
  }, [])

  return (
    <DefaultLayout>
      <Section
        mainClassName="flex items-center h-full"
        className="justify-items-center"
      >
        <Icon name="PageSearch" size="3xl" className="mb-8 opacity-50" />
        <p>{t('Page not found')}</p>
      </Section>
    </DefaultLayout>
  )
}
