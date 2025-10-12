import { errorToast } from '@/lib/toast'
import type { Methodology } from '@/types/methodology.types'

const methodologyCache = new Map<string, Methodology>()
let methodologiesList: string[] | null = null

async function loadMethodology(
  methodologyId: string,
): Promise<Methodology | null> {
  if (!methodologyId) return null

  if (methodologyCache.has(methodologyId)) {
    return methodologyCache.get(methodologyId)!
  }

  try {
    const response = await fetch(
      `/methodologies/${methodologyId}.methodology.json`,
    )
    if (!response.ok) {
      errorToast(
        'Failed to load methodology',
        `${methodologyId}: ${response.status}`,
      )
      return null
    }

    const methodology: Methodology = await response.json()
    methodologyCache.set(methodologyId, methodology)
    return methodology
  } catch (error) {
    console.error(`Error loading methodology ${methodologyId}:`, error)
    return null
  }
}

export async function getAvailableMethodologies(): Promise<string[]> {
  if (methodologiesList !== null) {
    return methodologiesList
  }

  try {
    const response = await fetch('/methodologies/manifest.json')
    if (!response.ok) {
      throw new Error(`Failed to fetch manifest: ${response.status}`)
    }

    const manifest = await response.json()
    methodologiesList = manifest.methodologies || []
    return methodologiesList as string[]
  } catch (error) {
    console.error('Error fetching methodologies manifest:', error)
    return []
  }
}

export async function loadAllMethodologies(): Promise<Methodology[]> {
  const methodologyIds = await getAvailableMethodologies()
  const methodologies = await Promise.all(
    methodologyIds.map((id) => loadMethodology(id)),
  )
  return methodologies.filter(
    (methodology): methodology is Methodology => methodology !== null,
  )
}

export async function getMethodologyById(
  id: string,
): Promise<Methodology | null> {
  if (methodologyCache.has(id)) {
    return methodologyCache.get(id)!
  }

  return loadMethodology(id)
}
