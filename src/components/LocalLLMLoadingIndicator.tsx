import { useEffect } from 'react'
import { Progress } from '@heroui/react'
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
        modelName: progress.modelName,
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
    <div className="flex items-center gap-3 px-2 py-3">
      <Icon name="Brain" className="h-5 w-5 text-secondary-foreground animate-pulse shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-muted text-sm">
          {t('Initializing Local AI Model…')}
        </p>
        <Progress
          size="sm"
          value={progressPercent}
          color="secondary"
          className="mt-1.5 w-full"
          aria-label="Model loading progress"
        />
      </div>
    </div>
  )
}
