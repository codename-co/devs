import { useEffect } from 'react'
import { Card, CardBody, Progress } from '@heroui/react'
import { useLocalLLMStore } from '@/stores/localLLMStore'
import { LocalLLMProvider } from '@/lib/llm/providers/local'
import { Icon } from '@/components'
import { useI18n } from '@/i18n'

export const LocalLLMLoadingIndicator = () => {
  const { loadingProgress, setLoadingProgress } = useLocalLLMStore()
  const { t } = useI18n()

  useEffect(() => {
    // Set up the progress callback when component mounts
    LocalLLMProvider.setProgressCallback((progress) => {
      setLoadingProgress({
        status: progress.status as any,
        message: progress.status,
        progress: progress.progress,
        loaded: progress.loaded,
        total: progress.total,
      })
    })

    return () => {
      // Clean up
      LocalLLMProvider.setProgressCallback(() => {})
    }
  }, [setLoadingProgress])

  // Don't show anything if not loading
  if (loadingProgress.status === 'idle' || loadingProgress.status === 'ready') {
    return null
  }

  const progressPercent = loadingProgress.progress || 0

  return (
    <div className="fixed bottom-4 end-4 z-50 w-96">
      <Card className="bg-background/95 backdrop-blur-md shadow-lg">
        <CardBody className="gap-3">
          <div className="flex items-center gap-3">
            <Icon name="Brain" className="h-6 w-6 text-primary animate-pulse" />
            <div className="flex-1">
              <p className="text-sm font-medium">
                {t('Initializing Local AI Model…')}
              </p>
            </div>
          </div>

          <Progress
            size="sm"
            value={progressPercent}
            color="primary"
            className="w-full"
            aria-label="Model loading progress"
          />

          {/* {loadingProgress.loaded && loadingProgress.total && (
            <div className="flex justify-between text-xs text-default-500">
              <span>{formatBytes(loadingProgress.loaded)}</span>
              <span>{formatBytes(loadingProgress.total)}</span>
            </div>
          )} */}
        </CardBody>
      </Card>
    </div>
  )
}
