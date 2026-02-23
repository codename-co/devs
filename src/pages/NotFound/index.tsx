import { Icon, Section } from '@/components'
import { useI18n } from '@/i18n'
import DefaultLayout from '@/layouts/Default'
import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

export const NotFoundPage = () => {
  const { t } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    // Redirect to the parent path after a short delay using SPA navigation so
    // the full page is not reloaded (which could cause an infinite loop when the
    // parent path also renders NotFoundPage and keeps reloading to '/').
    const segments = location.pathname.split('/').filter(Boolean)
    // If already at root or only one segment deep, go home – avoids looping.
    if (segments.length <= 1) {
      navigate('/', { replace: true })
      return
    }

    const timer = setTimeout(() => {
      const parentPath =
        '/' +
        location.pathname.split('/').filter(Boolean).slice(0, -1).join('/')
      navigate(parentPath, { replace: true })
    }, 300)

    return () => clearTimeout(timer)
  }, [location.pathname, navigate])

  return (
    <DefaultLayout showBackButton={false}>
      <Section
        mainClassName="flex items-center"
        className="justify-items-center"
      >
        <Icon name="PageSearch" size="3xl" className="mb-8 opacity-50" />
        <p>{t('Page not found')}</p>
      </Section>
    </DefaultLayout>
  )
}
