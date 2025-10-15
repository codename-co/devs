import { Container, MonacoEditor, Section } from '@/components'
import DefaultLayout from '@/layouts/Default'
import { useI18n } from '@/i18n'
import { HeaderProps } from '@/lib/types'
import localI18n from './i18n'
import yolo from '../../../public/methodologies/yolo.methodology.yaml?raw'

const DEFAULT_VALUE = `# yaml-language-server: $schema=/schemas/methodology.schema.json
${yolo}`

export const MethodologyNewPage = () => {
  const { t } = useI18n(localI18n)

  const header: HeaderProps = {
    color: 'bg-success-50',
    icon: {
      name: 'Strategy',
      color: 'text-success-300',
    },
    title: t('New Methodology'),
  }

  return (
    <DefaultLayout title={t('New Methodology')} header={header}>
      <Section>
        <Container>
          <MonacoEditor defaultLanguage="yaml" defaultValue={DEFAULT_VALUE} />
        </Container>
      </Section>
    </DefaultLayout>
  )
}
