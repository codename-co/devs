import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const es: I18n = {
  'Knowledge Base': 'Base de conocimientos',
  'Upload files and synchronize local folders to build your knowledge base':
    'Sube archivos y sincroniza carpetas locales para construir tu base de conocimientos',
  'Uploading files…': 'Subiendo archivos…',
  'Drag & drop files here, or click to select':
    'Arrastra y suelta archivos aquí, o haz clic para seleccionar',
  'Pick files': 'Seleccionar archivos',
  'Sync a folder': 'Sincronizar una carpeta',
  'Synced folders': 'Carpetas sincronizadas',
  'Last sync: {time}': 'Última sincronización: {time}',
  Disconnected: 'DDesconectado',
  'Stop syncing': 'Detener sincronización',
  Reconnect: 'Reconectar',
  'My Knowledge': 'Mis conocimientos',
  'No knowledge items yet. Upload some files to get started!':
    'No hay elementos de conocimiento por el momento. ¡Sube algunos archivos para comenzar!',
  'Knowledge Item': 'Elemento de conocimiento',
} as const
