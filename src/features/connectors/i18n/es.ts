import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const es: I18n = {
  // Page
  Connectors: 'Conectores',
  'Connect external services to import content into your Knowledge Base':
    'Conecta servicios externos para importar contenido a tu Base de Conocimiento',

  // Categories
  Apps: 'Aplicaciones',
  APIs: 'APIs',
  MCPs: 'MCPs',

  // Providers - Google Drive
  'Google Drive': 'Google Drive',
  'Import files and documents from Google Drive':
    'Importar archivos y documentos desde Google Drive',

  // Providers - Gmail
  Gmail: 'Gmail',
  'Import emails and conversations': 'Importar correos y conversaciones',

  // Providers - Google Calendar
  'Google Calendar': 'Google Calendar',
  'Import events and schedules': 'Importar eventos y horarios',

  // Providers - Notion
  Notion: 'Notion',
  'Import pages and databases from Notion':
    'Importar páginas y bases de datos desde Notion',

  // Status
  Connected: 'Conectado',
  'Syncing...': 'Sincronizando...',
  Error: 'Error',
  'Token Expired': 'Token expirado',

  // Actions
  Connect: 'Conectar',
  Disconnect: 'Desconectar',
  'Sync Now': 'Sincronizar ahora',
  Settings: 'Configuración',
  Reconnect: 'Reconectar',

  // Wizard
  'Connect a Service': 'Conectar un servicio',
  'Select a service to connect': 'Selecciona un servicio para conectar',
  'Connecting to {provider}...': 'Conectando a {provider}...',
  'Select folders to sync': 'Seleccionar carpetas para sincronizar',
  'Sync all content': 'Sincronizar todo el contenido',
  'Successfully connected!': '¡Conectado exitosamente!',
  'Start Sync Now': 'Iniciar sincronización',
  Done: 'Hecho',
  'Try Again': 'Intentar de nuevo',

  // Sync
  'Last synced {time}': 'Última sincronización {time}',
  'Never synced': 'Nunca sincronizado',
  '{count} items synced': '{count} elementos sincronizados',
  'Sync in progress...': 'Sincronización en progreso...',

  // Errors
  'Authentication failed': 'Autenticación fallida',
  'Your access token has expired. Please reconnect.':
    'Tu token de acceso ha expirado. Por favor, reconecta.',
  'Sync failed: {error}': 'Sincronización fallida: {error}',
  'Provider error: {error}': 'Error del proveedor: {error}',
  'Failed to load folders': 'Error al cargar las carpetas',
  'Failed to save': 'Error al guardar',

  // Empty states
  'No connectors': 'Sin conectores',
  'Connect external services to import content':
    'Conecta servicios externos para importar contenido',
  'Add Connector': 'Agregar conector',

  // Confirmations
  'Are you sure you want to disconnect {provider}?':
    '¿Estás seguro de que quieres desconectar {provider}?',
  'This will remove the connection but keep synced content.':
    'Esto eliminará la conexión pero conservará el contenido sincronizado.',

  // Settings Modal
  '{name} Settings': 'Configuración de {name}',
  'Connected Account': 'Cuenta conectada',
  'Enable Sync': 'Activar sincronización',
  'Automatically sync content from this connector':
    'Sincronizar contenido automáticamente desde este conector',
  'Sync Settings': 'Configuración de sincronización',
  'Choose which folders to sync or sync everything':
    'Elige qué carpetas sincronizar o sincroniza todo',
  'Settings saved': 'Configuración guardada',
  'Connector settings have been updated':
    'La configuración del conector ha sido actualizada',
} as const
