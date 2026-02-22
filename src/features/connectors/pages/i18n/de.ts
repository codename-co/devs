import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const de: I18n = {
  // Page
  Connectors: 'Konnektoren',
  'Connect external services to your knowledge base':
    'Verbinden Sie externe Dienste mit Ihrer Wissensdatenbank',
  'Sync files and data from your favorite apps and services.':
    'Synchronisieren Sie Dateien und Daten von Ihren Lieblings-Apps und -Diensten.',
  'Add Connector': 'Konnektor hinzufügen',

  // Tabs
  Apps: 'Apps',
  APIs: 'APIs',
  MCPs: 'MCPs',
  'Coming soon': 'Demnächst verfügbar',

  // ConnectorCard
  Connected: 'Verbunden',
  Error: 'Fehler',
  Expired: 'Abgelaufen',
  'Syncing...': 'Synchronisierung...',
  'Never synced': 'Nie synchronisiert',
  'Just now': 'Gerade eben',
  '{n} minutes ago': 'Vor {n} Minuten',
  '{n} hours ago': 'Vor {n} Stunden',
  '{n} days ago': 'Vor {n} Tagen',
  'Last sync:': 'Letzte Synchronisierung:',
  '{n} folders syncing': '{n} Ordner werden synchronisiert',
  '{n} tools': '{n} Werkzeuge',
  'Sync Now': 'Jetzt synchronisieren',
  'More options': 'Weitere Optionen',
  'Connector actions': 'Konnektor-Aktionen',
  Settings: 'Einstellungen',
  Disconnect: 'Trennen',
  Sync: 'Synchronisieren',
  'Sync disabled': 'Synchronisierung deaktiviert',

  // Empty state
  'No connectors yet': 'Noch keine Konnektoren',
  'No app connectors yet': 'Noch keine App-Konnektoren',
  'Connect external services to give your agents powerful tools for searching, reading, and interacting with your data.':
    'Verbinden Sie externe Dienste, um Ihren Agenten leistungsstarke Werkzeuge zum Suchen, Lesen und Interagieren mit Ihren Daten zu geben.',
  'No API connectors yet': 'Noch keine API-Konnektoren',
  'Connect custom REST or GraphQL APIs to extend agent capabilities.':
    'Verbinden Sie benutzerdefinierte REST- oder GraphQL-APIs, um die Fähigkeiten der Agenten zu erweitern.',
  'No MCP connectors yet': 'Noch keine MCP-Konnektoren',
  'Connect Model Context Protocol servers to extend agent capabilities.':
    'Verbinden Sie Model Context Protocol-Server, um die Fähigkeiten der Agenten zu erweitern.',
  'Add your first connector': 'Fügen Sie Ihren ersten Konnektor hinzu',

  // Wizard - Provider Selection
  'Choose a service to connect to your knowledge base:':
    'Wählen Sie einen Dienst, den Sie mit Ihrer Wissensdatenbank verbinden möchten:',
  'Choose a service to connect to your knowledge base':
    'Wählen Sie einen Dienst, den Sie mit Ihrer Wissensdatenbank verbinden möchten',
  'Select a Service': 'Dienst auswählen',

  // Wizard - OAuth Step
  'Connecting...': 'Verbindung wird hergestellt...',
  'Connecting to {name}...': 'Verbindung zu {name} wird hergestellt...',
  'Connect {name}': '{name} verbinden',
  'Connect to {name}': 'Mit {name} verbinden',
  'A new window will open for you to authorize access. Please complete the authorization to continue.':
    'Ein neues Fenster wird geöffnet, um den Zugriff zu autorisieren. Bitte schließen Sie die Autorisierung ab, um fortzufahren.',
  'You will be redirected to {name} to authorize DEVS to access your data. Your credentials are never stored on our servers.':
    'Sie werden zu {name} weitergeleitet, um DEVS den Zugriff auf Ihre Daten zu genehmigen. Ihre Anmeldedaten werden niemals auf unseren Servern gespeichert.',
  'This connector will be able to:': 'Dieser Konnektor kann:',
  'Read your files and content': 'Ihre Dateien und Inhalte lesen',
  'Search your content': 'Ihre Inhalte durchsuchen',
  'Sync changes automatically': 'Änderungen automatisch synchronisieren',
  'Authenticating...': 'Authentifizierung läuft...',
  'Connection Failed': 'Verbindung fehlgeschlagen',
  'Connection failed': 'Verbindung fehlgeschlagen',
  'Something went wrong while connecting. Please try again.':
    'Beim Verbinden ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.',
  'Successfully authenticated': 'Erfolgreich authentifiziert',
  'Authentication failed': 'Authentifizierung fehlgeschlagen',
  'Authentication successful': 'Authentifizierung erfolgreich',
  Authenticate: 'Authentifizieren',

  // Wizard - Folder Selection
  'Select Folders': 'Ordner auswählen',
  'Select folders to sync': 'Ordner zum Synchronisieren auswählen',
  'Add files to sync': 'Dateien zum Synchronisieren hinzufügen',
  'Paste file URLs or IDs from {name} to sync.':
    'Fügen Sie Datei-URLs oder IDs von {name} zum Synchronisieren ein.',
  'Enter URLs or IDs (one per line)': 'URLs oder IDs eingeben (eine pro Zeile)',
  'Enter file URLs or IDs, one per line':
    'Datei-URLs oder IDs eingeben, eine pro Zeile',
  '{n} items to sync': '{n} Elemente zum Synchronisieren',
  'Choose which folders you want to sync from {name}, or sync everything.':
    'Wählen Sie, welche Ordner Sie von {name} synchronisieren möchten, oder synchronisieren Sie alles.',
  'Sync everything': 'Alles synchronisieren',
  'All files and folders will be synced automatically':
    'Alle Dateien und Ordner werden automatisch synchronisiert',
  'Loading folders...': 'Ordner werden geladen...',
  'No folders found': 'Keine Ordner gefunden',
  '{n} folders selected': '{n} Ordner ausgewählt',
  Skip: 'Überspringen',
  Continue: 'Weiter',

  // Wizard - Success
  'Connected!': 'Verbunden!',
  'Successfully connected!': 'Erfolgreich verbunden!',
  '{name} has been connected to your knowledge base.':
    '{name} wurde mit Ihrer Wissensdatenbank verbunden.',
  '{name} has been connected.': '{name} wurde verbunden.',
  '{name} has been connected to your knowledge base. Files will begin syncing shortly.':
    '{name} wurde mit Ihrer Wissensdatenbank verbunden. Die Dateisynchronisierung beginnt in Kürze.',
  '{name} has been successfully connected':
    '{name} wurde erfolgreich verbunden',
  '{name} connected successfully': '{name} erfolgreich verbunden',
  'Connected and authorized': 'Verbunden und autorisiert',
  'Connected as {email}': 'Verbunden als {email}',
  'Syncing all files': 'Alle Dateien werden synchronisiert',
  'Auto-sync enabled': 'Automatische Synchronisierung aktiviert',
  'Automatic sync will begin shortly':
    'Die automatische Synchronisierung beginnt in Kürze',
  'Start Sync Now': 'Synchronisierung starten',
  'Connector Added': 'Konnektor hinzugefügt',

  // Wizard - Progress
  'Step {current} of {total}': 'Schritt {current} von {total}',
  'Wizard progress': 'Assistenten-Fortschritt',

  // Sync Status
  'Sync completed': 'Synchronisierung abgeschlossen',
  '{n} items synced': '{n} Elemente synchronisiert',
  'Sync failed': 'Synchronisierung fehlgeschlagen',
  'Unknown error': 'Unbekannter Fehler',

  // Settings Modal
  '{name} Settings': '{name}-Einstellungen',
  'Connected Account': 'Verbundenes Konto',
  'Available Tools': 'Verfügbare Werkzeuge',
  'Agent Tools': 'Agenten-Werkzeuge',
  'These tools are available to your agents for searching, reading, and interacting with your data.':
    'Diese Werkzeuge stehen Ihren Agenten zum Suchen, Lesen und Interagieren mit Ihren Daten zur Verfügung.',
  '{n} tools available for AI agents': '{n} Werkzeuge für KI-Agenten verfügbar',
  'Enable Sync': 'Synchronisierung aktivieren',
  'Enable Automatic Sync': 'Automatische Synchronisierung aktivieren',
  'Automatically sync content from this connector':
    'Inhalte von diesem Konnektor automatisch synchronisieren',
  'Automatically sync new and updated content':
    'Neue und aktualisierte Inhalte automatisch synchronisieren',
  'Sync Settings': 'Synchronisierungseinstellungen',
  'Knowledge Base Sync': 'Wissensdatenbank-Synchronisierung',
  'Optionally sync content to your knowledge base':
    'Synchronisieren Sie optional Inhalte mit Ihrer Wissensdatenbank',
  Enabled: 'Aktiviert',
  Disabled: 'Deaktiviert',
  'Sync Interval (minutes)': 'Synchronisierungsintervall (Minuten)',
  'How often to check for changes': 'Wie oft auf Änderungen prüfen',
  'Choose which folders to sync or sync everything':
    'Wählen Sie, welche Ordner synchronisiert werden sollen, oder synchronisieren Sie alles',
  'Settings saved': 'Einstellungen gespeichert',
  'Connector settings have been updated':
    'Die Konnektor-Einstellungen wurden aktualisiert',
  'Failed to load folders': 'Ordner konnten nicht geladen werden',
  'Failed to save': 'Speichern fehlgeschlagen',
  'Failed to save connector': 'Konnektor konnte nicht gespeichert werden',
  Reconnect: 'Neu verbinden',
  Close: 'Schließen',
  'Are you sure you want to disconnect this service? This will remove all synced data.':
    'Möchten Sie diese Verbindung wirklich trennen? Dadurch werden alle synchronisierten Daten entfernt.',

  // Configuration
  'Configure Connector': 'Konnektor konfigurieren',
  'Connector Name': 'Konnektor-Name',
  'Give this connector a memorable name':
    'Geben Sie diesem Konnektor einen einprägsamen Namen',
  'Complete Setup': 'Einrichtung abschließen',
  Complete: 'Abschließen',
  'Saving...': 'Wird gespeichert...',

  // Token refresh
  'Refreshing access token...': 'Zugriffstoken wird aktualisiert...',
  'Please wait': 'Bitte warten',
  'Token refreshed': 'Token aktualisiert',
  'Connection restored successfully':
    'Verbindung erfolgreich wiederhergestellt',
  'Your access token has expired. Please reconnect.':
    'Ihr Zugriffstoken ist abgelaufen. Bitte verbinden Sie sich erneut.',

  // Missing refresh token warning
  'Limited session': 'Begrenzte Sitzung',
  'Google did not provide a refresh token. Your session will expire in about 1 hour. To enable automatic token refresh, go to myaccount.google.com/permissions, revoke access to DEVS, then reconnect.':
    'Google hat kein Aktualisierungstoken bereitgestellt. Ihre Sitzung läuft in etwa 1 Stunde ab. Um die automatische Token-Aktualisierung zu aktivieren, gehen Sie zu myaccount.google.com/permissions, widerrufen Sie den Zugriff auf DEVS und verbinden Sie sich erneut.',
  'Your session has expired. Please disconnect and reconnect this service. To avoid this in the future, revoke access at myaccount.google.com/permissions before reconnecting.':
    'Ihre Sitzung ist abgelaufen. Bitte trennen Sie diesen Dienst und verbinden Sie ihn erneut. Um dies in Zukunft zu vermeiden, widerrufen Sie den Zugriff unter myaccount.google.com/permissions, bevor Sie sich erneut verbinden.',

  // Sub-route errors
  'Connector not found': 'Konnektor nicht gefunden',
  'Back to connectors': 'Zurück zu Konnektoren',

  // Common
  Cancel: 'Abbrechen',
  Done: 'Fertig',
  'Try Again': 'Erneut versuchen',
  Back: 'Zurück',
  Save: 'Speichern',
}
