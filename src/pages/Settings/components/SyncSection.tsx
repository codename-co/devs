/**
 * SyncSection — Settings section for P2P cross-device synchronization.
 *
 * Wraps the SyncPanel component from the sync feature
 * to integrate it into the Settings page.
 */

import { useEffect } from 'react'
import { useSyncStore } from '@/features/sync/stores/syncStore'
import { SyncPanel } from '@/features/sync/components/SyncPanel'

export function SyncSection() {
  const { initialize } = useSyncStore()

  // Initialize sync store on mount
  useEffect(() => {
    initialize()
  }, [initialize])

  return <SyncPanel />
}
