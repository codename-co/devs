import DefaultLayout from '@/layouts/Default'
import { Icon, PromptArea, Section, Title } from '@/components'
import { useI18n } from '@/i18n'

export const HomePage = () => {
  const { t, lang } = useI18n()

  return (
    <DefaultLayout>
      <div className="space-y-20 w-full">
        <Section mainClassName="text-center">
          <div className="flex flex-col items-center mb-16">
            <Icon
              size="4xl"
              name="SparksSolid"
              className="mb-6 text-primary-200 dark:text-primary-700"
            />
            <Title
              subtitle={t(
                'Delegate to adaptive AI teams that form, collaborate, and deliver automatically',
              )}
            >
              {t('Let AI agents take it from here')}
            </Title>
          </div>

          <PromptArea lang={lang} autoFocus className="my-16" />
        </Section>
      </div>
    </DefaultLayout>
  )
}
