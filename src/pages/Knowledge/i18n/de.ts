import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const de: I18n = {
  'Knowledge Base': 'Wissensdatenbank',
  'Manage your files and agents memories':
    'Verwalten Sie Ihre Dateien und Agentenerinnerungen',
  'Manage your files, sync sources, and agent memories':
    'Verwalten Sie Ihre Dateien, Synchronisierungsquellen und Agentenerinnerungen',
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
  'Knowledge Item': 'Wissenselement',
  Preview: 'Vorschau',
  Reprocess: 'Neu verarbeiten',
  Files: 'Dateien',
  'My Files': 'Meine Dateien',
  'Agent Memory': 'Agenten-Gedächtnis',
  // Sources tab
  'Sync Sources': 'Synchronisierungsquellen',
  Saved: 'Gespeichert',
  'Local Folders': 'Lokale Ordner',
  'Connected Apps': 'Verbundene Apps',
  'Add Folder': 'Ordner hinzufügen',
  'Add App': 'App hinzufügen',
  'No local folders synced yet.': 'Noch keine lokalen Ordner synchronisiert.',
  'No apps connected yet.': 'Noch keine Apps verbunden.',
  'Connect an app': 'App verbinden',
  'No sync sources yet': 'Noch keine Synchronisierungsquellen',
  'Add local folders or connect apps like Google Drive and Notion to automatically sync content to your knowledge base.':
    'Fügen Sie lokale Ordner hinzu oder verbinden Sie Apps wie Google Drive und Notion, um Inhalte automatisch mit Ihrer Wissensdatenbank zu synchronisieren.',
  'Manage synced folders and connected apps that import content into your knowledge base.':
    'Verwalten Sie synchronisierte Ordner und verbundene Apps, die Inhalte in Ihre Wissensdatenbank importieren.',
  'Folder "{name}" is now being synced.':
    'Ordner "{name}" wird jetzt synchronisiert.',
  'Folder sync stopped': 'Ordnersynchronisierung gestoppt',
  'Failed to stop watching folder':
    'Ordnerüberwachung konnte nicht gestoppt werden',
  'Folder reconnected': 'Ordner erneut verbunden',
  'Failed to reconnect folder': 'Ordner konnte nicht erneut verbunden werden',
  'Connector disconnected': 'Verbindung getrennt',
  'Synced {n} files': '{n} Dateien synchronisiert',
  'Sync error: {error}': 'Synchronisierungsfehler: {error}',
  'Syncing…': 'Synchronisierung…',
  'Sync Error': 'Synchronisierungsfehler',
  'Sync completed': 'Synchronisierung abgeschlossen',
  '{n} items synced': '{n} Elemente synchronisiert',
  'Sync failed': 'Synchronisierung fehlgeschlagen',
  'Unknown error': 'Unbekannter Fehler',
  'Directory picker is not supported in this browser. Please use a modern browser like Chrome or Edge.':
    'Die Verzeichnisauswahl wird in diesem Browser nicht unterstützt. Bitte verwenden Sie einen modernen Browser wie Chrome oder Edge.',
  Cancel: 'Abbrechen',
  // Connector integration
  'All Sources': 'Alle Quellen',
  'Local Files': 'Lokale Dateien',
  'Filter by source': 'Nach Quelle filtern',
  'Open in {provider}': 'In {provider} öffnen',
  'Synced from {provider}': 'Synchronisiert von {provider}',
  'Synced {time}': 'Synchronisiert {time}',
  'View original': 'Original anzeigen',
  'Select Agent': 'Agent auswählen',
  'All agents': 'Alle Agenten',
  'Generate Synthesis': 'Synthese generieren',
  'Total Memories': 'Gesamte Erinnerungen',
  'Pending Review': 'Überprüfung',
  'High Confidence': 'Hohe Zuversicht',
  'Low Confidence': 'Geringe Zuversicht',
  Facts: 'Fakten',
  Preferences: 'Präferenzen',
  Behaviors: 'Verhaltensweisen',
  'Domain Knowledge': 'Fachwissen',
  Relationships: 'Beziehungen',
  Procedures: 'Verfahren',
  Corrections: 'Korrekturen',
  'No memories pending review for this agent':
    'Keine Erinnerungen zur Überprüfung für diesen Agenten ausstehend',
  'No memories pending review': 'Keine Erinnerungen zur Überprüfung ausstehend',
  Approved: 'Genehmigt',
  'Filter by category': 'Nach Kategorie filtern',
  'All Categories': 'Alle Kategorien',
  'No approved memories yet': 'Noch keine genehmigten Erinnerungen',
  Synthesis: 'Synthese',
  'Select an agent to view their memory synthesis':
    'Wählen Sie einen Agenten, um seine Gedächtnissynthese anzuzeigen',
  'Memory Synthesis for {agent}': 'Gedächtnissynthese für {agent}',
  'Last updated: {date}': 'Zuletzt aktualisiert: {date}',
  Export: 'Exportieren',
  'No synthesis generated yet': 'Noch keine Synthese generiert',
  'Delete Memory': 'Erinnerung löschen',
  'Are you sure you want to delete this memory? This action cannot be undone.':
    'Sind Sie sicher, dass Sie diese Erinnerung löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.',
  'Edit Memory': 'Erinnerung bearbeiten',
  Title: 'Titel',
  Content: 'Inhalt',
  Category: 'Kategorie',
  Confidence: 'Zuversicht',
  Keywords: 'Schlüsselwörter',
  'Comma-separated list of keywords':
    'Kommagetrennte Liste von Schlüsselwörtern',
  High: 'Hoch',
  Medium: 'Mittel',
  Low: 'Niedrig',
  Global: 'Global',
  'Auto-approved': 'Automatisch genehmigt',
  'Learned: {date}': 'Gelernt: {date}',
  'Used {count} times': '{count} Mal verwendet',
  'Remove Global': 'Global entfernen',
  'Make Global': 'Global machen',
  'Stop Syncing Folder': 'Ordnersynchronisierung stoppen',
  'Do you want to keep the synced files in your knowledge base?':
    'Möchten Sie die synchronisierten Dateien in Ihrer Wissensdatenbank behalten?',
  'Keep Files': 'Dateien behalten',
  'Delete Files': 'Dateien löschen',
  'Grant Access': 'Zugriff gewähren',
  Remove: 'Entfernen',
  'Pinned Messages': 'Angepinnte Nachrichten',
  // Connectors tab
  Connectors: 'Konnektoren',
  'No connectors yet': 'Noch keine Konnektoren',
  'Connect external services like Google Drive, Gmail, or Notion to import content into your knowledge base.':
    'Verbinden Sie externe Dienste wie Google Drive, Gmail oder Notion, um Inhalte in Ihre Wissensdatenbank zu importieren.',
  'Connect external services to give your agents powerful tools for searching, reading, and interacting with your data.':
    'Verbinden Sie externe Dienste, um Ihren Agenten leistungsstarke Werkzeuge zum Suchen, Lesen und Interagieren mit Ihren Daten zu bieten.',
  'Add Connector': 'Konnektor hinzufügen',
  'Manage your connected external services':
    'Verwalten Sie Ihre verbundenen externen Dienste',
  'Connector removed': 'Konnektor entfernt',
  'Failed to remove connector': 'Konnektor konnte nicht entfernt werden',
  'API Connectors': 'API-Konnektoren',
  'Connect to custom REST or GraphQL APIs':
    'Verbinden Sie sich mit benutzerdefinierten REST- oder GraphQL-APIs',
  'MCP Servers': 'MCP-Server',
  'Connect to Model Context Protocol servers':
    'Verbinden Sie sich mit Model Context Protocol-Servern',
  'Coming soon': 'Demnächst verfügbar',
  // Filter options
  'All Types': 'Alle Typen',
  Documents: 'Dokumente',
  Images: 'Bilder',
  'Text Files': 'Textdateien',
  Other: 'Andere',
  'Manual Upload': 'Manueller Upload',
  'Synced Folders': 'Synchronisierte Ordner',
  'File Type': 'Dateityp',
  Source: 'Quelle',
  Filters: 'Filter',
  'No items match the selected filters':
    'Keine Elemente entsprechen den ausgewählten Filtern',
  // Bulk selection
  '{count} item(s) deleted': '{count} Element(e) gelöscht',
  'Failed to delete some items':
    'Einige Elemente konnten nicht gelöscht werden',
  '{count} item(s) queued for processing':
    '{count} Element(e) zur Verarbeitung eingereiht',
  'Failed to reprocess some items':
    'Einige Elemente konnten nicht erneut verarbeitet werden',
  'Select all': 'Alle auswählen',
  'Unselect all': 'Auswahl aufheben',
  'Delete selected': 'Ausgewählte löschen',
  'Select {name}': '{name} auswählen',
  'Delete Selected Items': 'Ausgewählte Elemente löschen',
  'Are you sure you want to delete {count} item(s)? This action cannot be undone.':
    'Möchten Sie wirklich {count} Element(e) löschen? Diese Aktion kann nicht rückgängig gemacht werden.',
} as const
