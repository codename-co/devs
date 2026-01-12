import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const es: I18n = {
  // Sync - General
  'Successfully joined sync room':
    'Te has unido a la sala de sincronización con éxito',
  Sync: 'Sincronizar',
  Syncing: 'Sincronizando',
  'Connecting...': 'Conectando...',
  Offline: 'Sin conexión',
  Connected: 'Conectado',
  Disabled: 'Deshabilitado',
  Disconnect: 'Desconectar',
  Back: 'Volver',

  // Sync - Modes
  Create: 'Crear',
  Join: 'Unirse',
  Share: 'Compartir',
  'Start Sync': 'Iniciar sync',
  'Join Room': 'Unirse',

  // Sync - Instructions
  'Synchronize with devices': 'Sincronizar con dispositivos',
  'Start synchronization': 'Iniciar sincronización',
  'Join with a code': 'Unirse con un código',
  'Create a new sync room': 'Crear una nueva sala de sync',
  'Join an existing room': 'Unirse a una sala existante',
  'Start sharing with other devices':
    'Comienza a compartir con otros dispositivos',
  'Connect to an existing device with a code':
    'Conéctate a un dispositivo existente con un código',
  'Synchronize with other devices': 'Sincronizar con otros dispositivos',
  'Join a device': 'Unirse a un dispositivo',
  'Enter the code from another device, or use a sync link.':
    'Ingresa el código de otro dispositivo o usa un enlace de sincronización.',
  'Start syncing and invite others to join':
    'Inicia la sincronización e invita a otros a unirse',
  'All connected devices sync in real-time as equal peers. Any device can read and write data.':
    'Todos los dispositivos conectados se sincronizan en tiempo real como pares iguales. Cualquier dispositivo puede leer y escribir datos.',
  'Your data syncs with all peers. Everyone has equal access - changes from any device are shared instantly.':
    'Tus datos se sincronizan con todos los pares. Todos tienen acceso igual - los cambios de cualquier dispositivo se comparten instantáneamente.',
  'Syncing with all connected peers. All devices are equal.':
    'Sincronizando con todos los pares conectados. Todos los dispositivos son iguales.',
  'Sync active! Share the link or QR code with other devices to connect.':
    '¡Sincronización activa! Comparte el enlace o código QR con otros dispositivos.',
  'Click "Synchronize with devices" to start syncing.':
    'Haz clic en "Sincronizar con dispositivos" para iniciar la sincronización.',
  'Sync your data across devices in real-time.':
    'Sincroniza tus datos entre dispositivos en tiempo real.',
  'No server needed - data stays between your devices.':
    'No se necesita servidor - los datos se quedan entre tus dispositivos.',

  // Sync - Room/Code
  Code: 'Código',
  'Room Code': 'Código de sala',
  'Enter room code': 'Ingrese el código de la sala',
  'Enter or paste a code': 'Ingresa o pega un código',
  'Sync Link': 'Enlace de sincronización',
  'Copy Link': 'Copiar enlace',
  'Copied!': '¡Copiado!',
  'Share this code or link with other devices:':
    'Comparte este código o enlace con otros dispositivos:',
  'Copy to clipboard': 'Copiar al portapapeles',
  'Sync Settings': 'Configuración de sync',

  // Sync - QR Code
  'Or scan this QR Code:': 'O escanea este código QR:',
  'Generating QR Code...': 'Generando código QR...',
  'QR Code generation failed': 'Error al generar el código QR',
  'Scan QR Code': 'Escanear código QR',
  'Scan a QR code to join': 'Escanea un código QR para unirte',
  'Scan the QR Code': 'Escanea el código QR',
  'Stop Scanner': 'Detener escáner',
  'Point your camera at a sync QR code':
    'Apunta tu cámara a un código QR de sincronización',
  'Use another device to scan this QR code to connect instantly.':
    'Usa otro dispositivo para escanear este código QR y conectarte al instante.',
  'Camera access denied': 'Acceso a la cámara denegado',
  'Unable to access camera. Please grant camera permissions.':
    'No se puede acceder a la cámara. Por favor, otorga permisos de cámara.',

  // Sync - Secret Link
  'Share the secret link': 'Comparte el enlace secreto',
  'Copy and share this unique link with your other device. Keep it private!':
    '¡Copia y comparte este enlace único con tu otro dispositivo. Mantenlo privado!',

  // Sync - Peers
  'Status:': 'Estado:',
  '{count} peer': '{count} par',
  '{count} peers': '{count} pares',
  You: 'Tú',
  Peer: 'Par',
  Device: 'Dispositivo',

  // Sync - Activity
  Sent: 'Enviado',
  Received: 'Recibido',
  'Activity Details': 'Detalles de actividad',
  'No activity': 'Sin actividad',
  'Data Activity': 'Actividad de datos',
  'Network Topology': 'Topología de red',
  'Total synced': 'Total sincronizado',
  bytes: 'bytes',
  KB: 'KB',
  MB: 'MB',
  'just now': 'ahora mismo',
  ago: 'hace',
  second: 'segundo',
  seconds: 'segundos',

  // Sync - Privacy
  'Your Data Stays Local': 'Tus datos se quedan locales',
  'Everything runs in your browser. Your conversations, agents, and data are stored locally on your device and never sent to any server.':
    'Todo funciona en tu navegador. Tus conversaciones, agentes y datos se almacenan localmente en tu dispositivo y nunca se envían a ningún servidor.',
  'Complete Privacy': 'Privacidad completa',
  'No accounts, no tracking, no cloud storage. You own your data.':
    'Sin cuentas, sin seguimiento, sin almacenamiento en la nube. Tus datos son tuyos.',
  'Work Offline': 'Trabaja sin conexión',
  'Use the app without an internet connection. Your data is always available.':
    'Usa la aplicación sin conexión a internet. Tus datos siempre están disponibles.',
  'Want to sync across devices?': '¿Quieres sincronizar entre dispositivos?',
  'Enable peer-to-peer sync to share data between your devices or with others. Data travels directly between devices.':
    'Activa la sincronización entre pares para compartir datos entre tus dispositivos o con otros. Los datos viajan directamente entre dispositivos.',

  // Sync - Misc
  or: 'o',
  'Local Backup': 'Copia de seguridad local',
  'Automatically backup your data to a folder on your device':
    'Guarda automáticamente tus datos en una carpeta de tu dispositivo',
}
