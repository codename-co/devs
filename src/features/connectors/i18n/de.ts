import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const de: I18n = {
  // Page
  Connectors: 'Verbindungen',
  'Connect external services to import content into your Knowledge Base':
    'Verbinden Sie externe Dienste, um Inhalte in Ihre Wissensdatenbank zu importieren',

  // Categories
  Apps: 'Apps',
  APIs: 'APIs',
  MCPs: 'MCPs',

  // Providers - Google Drive
  'Google Drive': 'Google Drive',
  'Import files and documents from Google Drive':
    'Dateien und Dokumente aus Google Drive importieren',

  // Providers - Gmail
  Gmail: 'Gmail',
  'Import emails and conversations': 'E-Mails und Konversationen importieren',

  // Providers - Google Calendar
  'Google Calendar': 'Google Kalender',
  'Import events and schedules': 'Termine und Zeitpläne importieren',

  // Providers - Notion
  Notion: 'Notion',
  'Import pages and databases from Notion':
    'Seiten und Datenbanken aus Notion importieren',

  // Status
  Connected: 'Verbunden',
  'Syncing...': 'Synchronisiere...',
  Error: 'Fehler',
  'Token Expired': 'Token abgelaufen',

  // Actions
  Connect: 'Verbinden',
  Disconnect: 'Trennen',
  'Sync Now': 'Jetzt synchronisieren',
  Settings: 'Einstellungen',
  Reconnect: 'Erneut verbinden',

  // Wizard
  'Connect a Service': 'Dienst verbinden',
  'Select a service to connect': 'Wählen Sie einen Dienst zum Verbinden',
  'Connecting to {provider}...': 'Verbinde mit {provider}...',
  'Select folders to sync': 'Ordner zum Synchronisieren auswählen',
  'Sync all content': 'Alle Inhalte synchronisieren',
  'Successfully connected!': 'Erfolgreich verbunden!',
  'Start Sync Now': 'Synchronisierung starten',
  Done: 'Fertig',
  'Try Again': 'Erneut versuchen',

  // Sync
  'Last synced {time}': 'Zuletzt synchronisiert {time}',
  'Never synced': 'Nie synchronisiert',
  '{count} items synced': '{count} Elemente synchronisiert',
  'Sync in progress...': 'Synchronisierung läuft...',

  // Errors
  'Authentication failed': 'Authentifizierung fehlgeschlagen',
  'Your access token has expired. Please reconnect.':
    'Ihr Zugriffstoken ist abgelaufen. Bitte erneut verbinden.',
  'Sync failed: {error}': 'Synchronisierung fehlgeschlagen: {error}',
  'Provider error: {error}': 'Anbieterfehler: {error}',
  'Failed to load folders': 'Ordner konnten nicht geladen werden',
  'Failed to save': 'Speichern fehlgeschlagen',

  // Empty states
  'No connectors': 'Keine Verbindungen',
  'Connect external services to import content':
    'Verbinden Sie externe Dienste, um Inhalte zu importieren',
  'Add Connector': 'Verbindung hinzufügen',

  // Confirmations
  'Are you sure you want to disconnect {provider}?':
    'Sind Sie sicher, dass Sie {provider} trennen möchten?',
  'This will remove the connection but keep synced content.':
    'Die Verbindung wird entfernt, aber synchronisierte Inhalte bleiben erhalten.',

  // Settings Modal
  '{name} Settings': '{name} Einstellungen',
  'Connected Account': 'Verbundenes Konto',
  'Enable Sync': 'Synchronisierung aktivieren',
  'Automatically sync content from this connector':
    'Inhalte automatisch von dieser Verbindung synchronisieren',
  'Sync Settings': 'Synchronisierungseinstellungen',
  'Choose which folders to sync or sync everything':
    'Wählen Sie Ordner zum Synchronisieren oder synchronisieren Sie alles',
  'Settings saved': 'Einstellungen gespeichert',
  'Connector settings have been updated':
    'Die Verbindungseinstellungen wurden aktualisiert',
} as const
