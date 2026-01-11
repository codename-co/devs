import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router'
import { Button, Spinner } from '@heroui/react'

import { useI18n } from '@/i18n'
import { Container, Icon, Section } from '@/components'
import { useTraceStore } from '@/stores/traceStore'
import { TraceDetail } from '../components'
import localI18n from '../i18n'
import DefaultLayout from '@/layouts/Default'
import { HeaderProps } from '@/lib/types'

export function TraceShowPage() {
  const { t } = useI18n(localI18n)
  const { traceId } = useParams<{ traceId: string }>()
  const navigate = useNavigate()
  const {
    currentTrace,
    currentSpans,
    isLoading,
    loadTrace,
    clearCurrentTrace,
  } = useTraceStore()

  useEffect(() => {
    if (traceId) {
      loadTrace(traceId)
    }

    return () => {
      clearCurrentTrace()
    }
  }, [traceId, loadTrace, clearCurrentTrace])

  const handleBack = () => {
    navigate('/traces')
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!currentTrace) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="flex flex-col items-center justify-center py-16">
          <Icon
            name="WarningTriangle"
            className="w-16 h-16 text-default-300 mb-4"
          />
          <h3 className="text-lg font-medium text-default-600 mb-4">
            {t('Trace not found')}
          </h3>
          <Button
            variant="flat"
            startContent={<Icon name="NavArrowLeft" className="w-4 h-4" />}
            onPress={handleBack}
          >
            {t('Back to Traces')}
          </Button>
        </div>
      </div>
    )
  }

  const header: HeaderProps = {
    icon: {
      name: 'Activity',
      color: 'text-success-500 dark:text-success-400',
    },
    title: t('Trace Details'),
    subtitle: currentTrace.id,
  }

  return (
    <DefaultLayout header={header}>
      <Section>
        <Container>
          <TraceDetail trace={currentTrace} spans={currentSpans} />
        </Container>
      </Section>
    </DefaultLayout>
  )
}
