/**
 * @module db/export
 *
 * Database export utility.
 *
 * Exports all Yjs maps to a compressed JSON file (.json.gz) that users
 * can download as a full backup of their DEVS data.
 */

import * as yjsMaps from '@/lib/yjs/maps'

/**
 * All Yjs map names that are exported.
 *
 * This list should stay in sync with the maps defined in
 * `src/lib/yjs/maps.ts`.
 */
export const EXPORT_MAP_NAMES = [
  'agents',
  'conversations',
  'knowledge',
  'tasks',
  'artifacts',
  'memories',
  'preferences',
  'credentials',
  'studioEntries',
  'workflows',
  'battles',
  'pinnedMessages',
  'traces',
  'spans',
  'tracingConfig',
  'connectors',
  'connectorSyncStates',
  'notifications',
  'memoryLearningEvents',
  'agentMemoryDocuments',
  'sharedContexts',
  'installedExtensions',
  'customExtensions',
  'langfuseConfig',
  'skills',
] as const

export type ExportMapName = (typeof EXPORT_MAP_NAMES)[number]

export interface ExportMeta {
  exportedAt: string
  source: 'yjs'
  version: number
  maps: number
  compressed: boolean
}

export interface ExportData {
  _meta: ExportMeta
  [mapName: string]: unknown[] | Record<string, unknown> | ExportMeta
}

/**
 * Collect all Yjs map data into a plain JSON-serialisable object.
 *
 * Each map is converted to an array of its values for backward
 * compatibility with the existing import/restore flow.
 */
export function collectExportData(): ExportData {
  const exportData: Record<string, unknown[] | Record<string, unknown>> = {}

  for (const mapName of EXPORT_MAP_NAMES) {
    try {
      const map = yjsMaps[mapName as keyof typeof yjsMaps]
      if (map && typeof map.toJSON === 'function') {
        const mapData = map.toJSON()
        exportData[mapName] = Object.values(mapData)
      }
    } catch (error) {
      console.warn(`Failed to export map ${mapName}:`, error)
      exportData[mapName] = []
    }
  }

  return {
    _meta: {
      exportedAt: new Date().toISOString(),
      source: 'yjs',
      version: 1,
      maps: EXPORT_MAP_NAMES.length,
      compressed: true,
    },
    ...exportData,
  }
}

/**
 * Compress a JSON string using the native `CompressionStream` (gzip).
 *
 * Returns a `Blob` containing the gzip-compressed data.
 */
export async function compressToGzip(jsonString: string): Promise<Blob> {
  const stream = new Blob([jsonString]).stream()
  const compressedStream = stream.pipeThrough(new CompressionStream('gzip'))
  return new Response(compressedStream).blob()
}

/**
 * Trigger a browser file download for the given blob.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Export the full DEVS database as a compressed `.json.gz` file.
 *
 * This is the main entry-point for one-click database export. It:
 * 1. Collects all Yjs map data
 * 2. Serialises to JSON
 * 3. Compresses with gzip
 * 4. Triggers a browser download
 *
 * @returns The export metadata for confirmation messaging.
 */
export async function exportDatabase(): Promise<ExportMeta> {
  const data = collectExportData()
  const jsonString = JSON.stringify(data)
  const compressedBlob = await compressToGzip(jsonString)
  const filename = `devs-database-export-${new Date().toISOString().split('T')[0]}.json.gz`
  downloadBlob(compressedBlob, filename)
  return data._meta
}
