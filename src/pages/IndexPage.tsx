import { useI18n } from '@/i18n'
import { Icon, PromptArea, Section, Title } from '@/components'
import DefaultLayout from '@/layouts/Default'

export const IndexPage = () => {
  const { t, lang } = useI18n()

  const onSubmit = (prompt: string) => {
    // Handle the prompt submission logic here
    console.log(`Prompt submitted: ${prompt}`)
  }

  return (
    <DefaultLayout>
      <Section mainClassName="text-center">
        <div className="flex flex-col items-center">
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

        <PromptArea
          lang={lang}
          autoFocus
          className="my-16"
          onSend={() => onSubmit('assaas')}
        />
      </Section>
    </DefaultLayout>
  )
}
