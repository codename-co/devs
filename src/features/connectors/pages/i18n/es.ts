import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const es: I18n = {
  // Page
  Connectors: 'Conectores',
  'Connect external services to your knowledge base':
    'Conecta servicios externos a tu base de conocimientos',
  'Sync files and data from your favorite apps and services.':
    'Sincroniza archivos y datos de tus aplicaciones y servicios favoritos.',
  'Add Connector': 'Agregar conector',

  // Tabs
  Apps: 'Aplicaciones',
  APIs: 'APIs',
  MCPs: 'MCPs',
  'Coming soon': 'Próximamente',

  // ConnectorCard
  Connected: 'Conectado',
  Error: 'Error',
  Expired: 'Expirado',
  'Syncing...': 'Sincronizando...',
  'Never synced': 'Nunca sincronizado',
  'Just now': 'Ahora mismo',
  '{n} minutes ago': 'Hace {n} minutos',
  '{n} hours ago': 'Hace {n} horas',
  '{n} days ago': 'Hace {n} días',
  'Last sync:': 'Última sincronización:',
  '{n} folders syncing': '{n} carpetas sincronizando',
  '{n} tools': '{n} herramientas',
  'Sync Now': 'Sincronizar ahora',
  'More options': 'Más opciones',
  'Connector actions': 'Acciones del conector',
  Settings: 'Configuración',
  Disconnect: 'Desconectar',
  Sync: 'Sincronizar',
  'Sync disabled': 'Sincronización desactivada',

  // Empty state
  'No connectors yet': 'Aún no hay conectores',
  'No app connectors yet': 'Aún no hay conectores de aplicaciones',
  'Connect external services to give your agents powerful tools for searching, reading, and interacting with your data.':
    'Conecta servicios externos para dar a tus agentes herramientas poderosas para buscar, leer e interactuar con tus datos.',
  'No API connectors yet': 'Aún no hay conectores de API',
  'Connect custom REST or GraphQL APIs to extend agent capabilities.':
    'Conecta APIs REST o GraphQL personalizadas para ampliar las capacidades de los agentes.',
  'No MCP connectors yet': 'Aún no hay conectores MCP',
  'Connect Model Context Protocol servers to extend agent capabilities.':
    'Conecta servidores Model Context Protocol para ampliar las capacidades de los agentes.',
  'Add your first connector': 'Agrega tu primer conector',

  // Wizard - Provider Selection
  'Choose a service to connect to your knowledge base:':
    'Elige un servicio para conectar a tu base de conocimientos:',
  'Choose a service to connect to your knowledge base':
    'Elige un servicio para conectar a tu base de conocimientos',
  'Select a Service': 'Seleccionar un servicio',

  // Wizard - OAuth Step
  'Connecting...': 'Conectando...',
  'Connecting to {name}...': 'Conectando a {name}...',
  'Connect {name}': 'Conectar {name}',
  'Connect to {name}': 'Conectarse a {name}',
  'A new window will open for you to authorize access. Please complete the authorization to continue.':
    'Se abrirá una nueva ventana para autorizar el acceso. Por favor completa la autorización para continuar.',
  'You will be redirected to {name} to authorize DEVS to access your data. Your credentials are never stored on our servers.':
    'Serás redirigido a {name} para autorizar a DEVS a acceder a tus datos. Tus credenciales nunca se almacenan en nuestros servidores.',
  'This connector will be able to:': 'Este conector podrá:',
  'Read your files and content': 'Leer tus archivos y contenido',
  'Search your content': 'Buscar en tu contenido',
  'Sync changes automatically': 'Sincronizar cambios automáticamente',
  'Authenticating...': 'Autenticando...',
  'Connection Failed': 'Error de conexión',
  'Connection failed': 'Error de conexión',
  'Something went wrong while connecting. Please try again.':
    'Algo salió mal durante la conexión. Por favor intenta de nuevo.',
  'Successfully authenticated': 'Autenticación exitosa',
  'Authentication failed': 'Error de autenticación',
  'Authentication successful': 'Autenticación exitosa',
  Authenticate: 'Autenticar',

  // Wizard - Folder Selection
  'Select Folders': 'Seleccionar carpetas',
  'Select folders to sync': 'Seleccionar carpetas para sincronizar',
  'Add files to sync': 'Agregar archivos para sincronizar',
  'Paste file URLs or IDs from {name} to sync.':
    'Pega las URLs o IDs de archivos de {name} para sincronizar.',
  'Enter URLs or IDs (one per line)': 'Ingresa URLs o IDs (uno por línea)',
  'Enter file URLs or IDs, one per line':
    'Ingresa URLs o IDs de archivos, uno por línea',
  '{n} items to sync': '{n} elementos para sincronizar',
  'Choose which folders you want to sync from {name}, or sync everything.':
    'Elige qué carpetas quieres sincronizar de {name}, o sincroniza todo.',
  'Sync everything': 'Sincronizar todo',
  'All files and folders will be synced automatically':
    'Todos los archivos y carpetas se sincronizarán automáticamente',
  'Loading folders...': 'Cargando carpetas...',
  'No folders found': 'No se encontraron carpetas',
  '{n} folders selected': '{n} carpetas seleccionadas',
  Skip: 'Omitir',
  Continue: 'Continuar',

  // Wizard - Success
  'Connected!': '¡Conectado!',
  'Successfully connected!': '¡Conectado exitosamente!',
  '{name} has been connected to your knowledge base.':
    '{name} ha sido conectado a tu base de conocimientos.',
  '{name} has been connected.': '{name} ha sido conectado.',
  '{name} has been connected to your knowledge base. Files will begin syncing shortly.':
    '{name} ha sido conectado a tu base de conocimientos. Los archivos comenzarán a sincronizarse pronto.',
  '{name} has been successfully connected':
    '{name} ha sido conectado exitosamente',
  '{name} connected successfully': '{name} conectado exitosamente',
  'Connected and authorized': 'Conectado y autorizado',
  'Connected as {email}': 'Conectado como {email}',
  'Syncing all files': 'Sincronizando todos los archivos',
  'Auto-sync enabled': 'Sincronización automática activada',
  'Automatic sync will begin shortly':
    'La sincronización automática comenzará pronto',
  'Start Sync Now': 'Iniciar sincronización',
  'Connector Added': 'Conector agregado',

  // Wizard - Progress
  'Step {current} of {total}': 'Paso {current} de {total}',
  'Wizard progress': 'Progreso del asistente',

  // Sync Status
  'Sync completed': 'Sincronización completada',
  '{n} items synced': '{n} elementos sincronizados',
  'Sync failed': 'Error en la sincronización',
  'Unknown error': 'Error desconocido',

  // Settings Modal
  '{name} Settings': 'Configuración de {name}',
  'Connected Account': 'Cuenta conectada',
  'Available Tools': 'Herramientas disponibles',
  'Agent Tools': 'Herramientas de agentes',
  'These tools are available to your agents for searching, reading, and interacting with your data.':
    'Estas herramientas están disponibles para que tus agentes busquen, lean e interactúen con tus datos.',
  '{n} tools available for AI agents':
    '{n} herramientas disponibles para agentes IA',
  'Enable Sync': 'Activar sincronización',
  'Enable Automatic Sync': 'Activar sincronización automática',
  'Automatically sync content from this connector':
    'Sincronizar automáticamente el contenido de este conector',
  'Automatically sync new and updated content':
    'Sincronizar automáticamente contenido nuevo y actualizado',
  'Sync Settings': 'Configuración de sincronización',
  'Knowledge Base Sync': 'Sincronización de base de conocimientos',
  'Optionally sync content to your knowledge base':
    'Opcionalmente sincroniza contenido a tu base de conocimientos',
  Enabled: 'Activado',
  Disabled: 'Desactivado',
  'Sync Interval (minutes)': 'Intervalo de sincronización (minutos)',
  'How often to check for changes': 'Con qué frecuencia verificar cambios',
  'Choose which folders to sync or sync everything':
    'Elige qué carpetas sincronizar o sincroniza todo',
  'Settings saved': 'Configuración guardada',
  'Connector settings have been updated':
    'La configuración del conector ha sido actualizada',
  'Failed to load folders': 'Error al cargar carpetas',
  'Failed to save': 'Error al guardar',
  'Failed to save connector': 'Error al guardar el conector',
  Reconnect: 'Reconectar',
  Close: 'Cerrar',
  'Are you sure you want to disconnect this service? This will remove all synced data.':
    '¿Estás seguro de que quieres desconectar este servicio? Esto eliminará todos los datos sincronizados.',

  // Configuration
  'Configure Connector': 'Configurar conector',
  'Connector Name': 'Nombre del conector',
  'Give this connector a memorable name':
    'Dale un nombre memorable a este conector',
  'Complete Setup': 'Completar configuración',
  Complete: 'Completar',
  'Saving...': 'Guardando...',

  // Token refresh
  'Refreshing access token...': 'Actualizando token de acceso...',
  'Please wait': 'Por favor espera',
  'Token refreshed': 'Token actualizado',
  'Connection restored successfully': 'Conexión restaurada exitosamente',
  'Your access token has expired. Please reconnect.':
    'Tu token de acceso ha expirado. Por favor reconéctate.',

  // Missing refresh token warning
  'Limited session': 'Sesión limitada',
  'Google did not provide a refresh token. Your session will expire in about 1 hour. To enable automatic token refresh, go to myaccount.google.com/permissions, revoke access to DEVS, then reconnect.':
    'Google no proporcionó un token de actualización. Tu sesión expirará en aproximadamente 1 hora. Para habilitar la actualización automática del token, ve a myaccount.google.com/permissions, revoca el acceso a DEVS y vuelve a conectarte.',
  'Your session has expired. Please disconnect and reconnect this service. To avoid this in the future, revoke access at myaccount.google.com/permissions before reconnecting.':
    'Tu sesión ha expirado. Por favor desconecta y vuelve a conectar este servicio. Para evitar esto en el futuro, revoca el acceso en myaccount.google.com/permissions antes de reconectarte.',

  // Sub-route errors
  'Connector not found': 'Conector no encontrado',
  'Back to connectors': 'Volver a conectores',

  // Common
  Cancel: 'Cancelar',
  Done: 'Listo',
  'Try Again': 'Intentar de nuevo',
  Back: 'Atrás',
  Save: 'Guardar',
}
