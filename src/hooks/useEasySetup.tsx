import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { EasySetupData, decodeSetupData } from '@/lib/easy-setup'

interface UseEasySetupResult {
  hasSetupData: boolean
  setupData: EasySetupData | null
  isProcessing: boolean
  error: string | null
  clearSetupData: () => void
}

/**
 * Hook to detect and handle easy setup data from URL parameters
 */
export function useEasySetup(): UseEasySetupResult {
  const [searchParams, setSearchParams] = useSearchParams()
  const [setupData, setSetupData] = useState<EasySetupData | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const setupParam = searchParams.get('s')

    if (setupParam) {
      setIsProcessing(true)
      setError(null)

      try {
        const decodedData = decodeSetupData(setupParam)
        setSetupData(decodedData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Invalid setup data')
        console.error('Failed to decode setup data:', err)
      } finally {
        setIsProcessing(false)
      }
    } else {
      setSetupData(null)
      setError(null)
      setIsProcessing(false)
    }
  }, [searchParams])

  const clearSetupData = () => {
    // Remove the setup parameter from URL
    const newSearchParams = new URLSearchParams(searchParams)
    newSearchParams.delete('s')

    // Update URL without the setup parameter
    setSearchParams(newSearchParams, { replace: true })

    // Clear local state
    setSetupData(null)
    setError(null)
  }

  return {
    hasSetupData: !!setupData,
    setupData,
    isProcessing,
    error,
    clearSetupData,
  }
}
