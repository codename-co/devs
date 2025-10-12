import { useEffect, useState } from 'react'
import { loadAllMethodologies } from '@/stores/methodologiesStore'
import { Methodology } from '@/types/methodology.types'

interface UseMethodologyNavigationResult {
  prevMethodology: Methodology | null
  nextMethodology: Methodology | null
  isLoading: boolean
}

export const useMethodologyNavigation = (
  currentMethodologyId: string | undefined,
): UseMethodologyNavigationResult => {
  const [prevMethodology, setPrevMethodology] = useState<Methodology | null>(
    null,
  )
  const [nextMethodology, setNextMethodology] = useState<Methodology | null>(
    null,
  )
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadNavigationData = async () => {
      if (!currentMethodologyId) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)

      try {
        // Load available methodologies for navigation
        const methodologies = await loadAllMethodologies()

        // Find current methodology index
        const currentIndex = methodologies.findIndex(
          (m) => m.metadata.id === currentMethodologyId,
        )
        if (currentIndex !== -1) {
          // Set previous methodology (or null if first)
          setPrevMethodology(
            currentIndex > 0 ? methodologies[currentIndex - 1] : null,
          )
          // Set next methodology (or null if last)
          setNextMethodology(
            currentIndex < methodologies.length - 1
              ? methodologies[currentIndex + 1]
              : null,
          )
        }
      } catch (error) {
        console.error('Failed to load methodology navigation:', error)
        setPrevMethodology(null)
        setNextMethodology(null)
      } finally {
        setIsLoading(false)
      }
    }

    loadNavigationData()
  }, [currentMethodologyId])

  return {
    prevMethodology,
    nextMethodology,
    isLoading,
  }
}
