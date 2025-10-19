import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const de: I18n = {
  'Knowledge Base': 'Wissensdatenbank',
  'Upload files and synchronize local folders to build your knowledge base':
    'Laden Sie Dateien hoch und synchronisieren Sie lokale Ordner, um Ihre Wissensdatenbank aufzubauen',
  'Uploading files…': 'Dateien werden hochgeladen…',
  'Drag & drop files here, or click to select':
    'Dateien hierher ziehen und ablegen oder klicken, um auszuwählen',
  'Pick files': 'Dateien auswählen',
  'Sync a folder': 'Ordner synchronisieren',
  'Synced folders': 'Synchronisierte Ordner',
  'Last sync: {time}': 'Letzte Synchronisierung: {time}',
  Disconnected: 'Getrennt',
  'Stop syncing': 'Synchronisierung stoppen',
  Reconnect: 'Neu verbinden',
  'My Knowledge': 'Mein Wissen',
  'No knowledge items yet. Upload some files to get started!':
    'Noch keine Wissenselemente. Laden Sie Dateien hoch, um zu beginnen!',
  'Knowledge Item': 'Wissenselement',
  Reprocess: 'Neu verarbeiten',
} as const
