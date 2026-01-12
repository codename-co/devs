import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const de: I18n = {
  // Sync - General
  'Successfully joined sync room': 'Erfolgreich dem Sync-Raum beigetreten',
  Sync: 'Synchronisierung',
  Syncing: 'Synchronisierung',
  'Connecting...': 'Verbinden...',
  Offline: 'Offline',
  Connected: 'Verbunden',
  Disabled: 'Deaktiviert',
  Disconnect: 'Trennen',
  Back: 'Zurück',

  // Sync - Modes
  Create: 'Erstellen',
  Join: 'Beitreten',
  Share: 'Teilen',
  'Start Sync': 'Sync starten',
  'Join Room': 'Beitreten',

  // Sync - Instructions
  'Synchronize with devices': 'Mit Geräten synchronisieren',
  'Start synchronization': 'Synchronisation starten',
  'Join with a code': 'Mit einem Code beitreten',
  'Create a new sync room': 'Einen neuen Sync-Raum erstellen',
  'Join an existing room': 'Einem bestehenden Raum beitreten',
  'Start sharing with other devices':
    'Beginnen Sie mit dem Teilen mit anderen Geräten',
  'Connect to an existing device with a code':
    'Mit einem bestehenden Gerät über einen Code verbinden',
  'Synchronize with other devices': 'Mit anderen Geräten synchronisieren',
  'Join a device': 'Einem Gerät beitreten',
  'Enter the code from another device, or use a sync link.':
    'Geben Sie den Code von einem anderen Gerät ein oder verwenden Sie einen Sync-Link.',
  'Start syncing and invite others to join':
    'Starten Sie die Synchronisierung und laden Sie andere ein',
  'All connected devices sync in real-time as equal peers. Any device can read and write data.':
    'Alle verbundenen Geräte synchronisieren in Echtzeit als gleichberechtigte Peers. Jedes Gerät kann Daten lesen und schreiben.',
  'Your data syncs with all peers. Everyone has equal access - changes from any device are shared instantly.':
    'Ihre Daten synchronisieren sich mit allen Peers. Alle haben gleichen Zugriff - Änderungen von jedem Gerät werden sofort geteilt.',
  'Syncing with all connected peers. All devices are equal.':
    'Synchronisierung mit allen verbundenen Peers. Alle Geräte sind gleichberechtigt.',
  'Sync active! Share the link or QR code with other devices to connect.':
    'Sync aktiv! Teilen Sie den Link oder QR-Code mit anderen Geräten.',
  'Click "Synchronize with devices" to start syncing.':
    'Klicken Sie auf "Mit Geräten synchronisieren", um die Synchronisierung zu starten.',
  'Sync your data across devices in real-time.':
    'Synchronisieren Sie Ihre Daten zwischen Geräten in Echtzeit.',
  'No server needed - data stays between your devices.':
    'Kein Server erforderlich - Daten bleiben zwischen Ihren Geräten.',

  // Sync - Room/Code
  Code: 'Code',
  'Room Code': 'Raumcode',
  'Enter room code': 'Raumcode eingeben',
  'Enter or paste a code': 'Geben Sie einen Code ein oder fügen Sie ihn ein',
  'Sync Link': 'Sync-Link',
  'Copy Link': 'Link kopieren',
  'Copied!': 'Kopiert!',
  'Share this code or link with other devices:':
    'Teilen Sie diesen Code oder Link mit anderen Geräten:',
  'Copy to clipboard': 'In die Zwischenablage kopieren',
  'Sync Settings': 'Sync-Einstellungen',

  // Sync - QR Code
  'Or scan this QR Code:': 'Oder scannen Sie diesen QR-Code:',
  'Generating QR Code...': 'QR-Code wird generiert...',
  'QR Code generation failed': 'QR-Code-Generierung fehlgeschlagen',
  'Scan QR Code': 'QR-Code scannen',
  'Scan a QR code to join': 'Scannen Sie einen QR-Code zum Beitreten',
  'Scan the QR Code': 'QR-Code scannen',
  'Stop Scanner': 'Scanner stoppen',
  'Point your camera at a sync QR code':
    'Richten Sie Ihre Kamera auf einen Sync-QR-Code',
  'Use another device to scan this QR code to connect instantly.':
    'Verwenden Sie ein anderes Gerät, um diesen QR-Code zu scannen und sich sofort zu verbinden.',
  'Camera access denied': 'Kamerazugriff verweigert',
  'Unable to access camera. Please grant camera permissions.':
    'Kamera nicht zugänglich. Bitte erteilen Sie Kameraberechtigungen.',

  // Sync - Secret Link
  'Share the secret link': 'Geheimen Link teilen',
  'Copy and share this unique link with your other device. Keep it private!':
    'Kopieren und teilen Sie diesen einzigartigen Link mit Ihrem anderen Gerät. Halten Sie ihn geheim!',

  // Sync - Peers
  'Status:': 'Status:',
  '{count} peer': '{count} Peer',
  '{count} peers': '{count} Peers',
  You: 'Sie',
  Peer: 'Peer',
  Device: 'Gerät',

  // Sync - Activity
  Sent: 'Gesendet',
  Received: 'Empfangen',
  'Activity Details': 'Aktivitätsdetails',
  'No activity': 'Keine Aktivität',
  'Data Activity': 'Datenaktivität',
  'Network Topology': 'Netzwerktopologie',
  'Total synced': 'Gesamt synchronisiert',
  bytes: 'Bytes',
  KB: 'KB',
  MB: 'MB',
  'just now': 'gerade eben',
  ago: 'vor',
  second: 'Sekunde',
  seconds: 'Sekunden',

  // Sync - Privacy
  'Your Data Stays Local': 'Ihre Daten bleiben lokal',
  'Everything runs in your browser. Your conversations, agents, and data are stored locally on your device and never sent to any server.':
    'Alles läuft in Ihrem Browser. Ihre Gespräche, Agenten und Daten werden lokal auf Ihrem Gerät gespeichert und niemals an einen Server gesendet.',
  'Complete Privacy': 'Vollständige Privatsphäre',
  'No accounts, no tracking, no cloud storage. You own your data.':
    'Keine Konten, kein Tracking, kein Cloud-Speicher. Ihre Daten gehören Ihnen.',
  'Work Offline': 'Offline arbeiten',
  'Use the app without an internet connection. Your data is always available.':
    'Nutzen Sie die App ohne Internetverbindung. Ihre Daten sind immer verfügbar.',
  'Want to sync across devices?':
    'Möchten Sie zwischen Geräten synchronisieren?',
  'Enable peer-to-peer sync to share data between your devices or with others. Data travels directly between devices.':
    'Aktivieren Sie die Peer-to-Peer-Synchronisierung, um Daten zwischen Ihren Geräten oder mit anderen zu teilen. Daten werden direkt zwischen den Geräten übertragen.',

  // Sync - Misc
  or: 'oder',
  'Local Backup': 'Lokale Sicherung',
  'Automatically backup your data to a folder on your device':
    'Sichern Sie Ihre Daten automatisch in einem Ordner auf Ihrem Gerät',
}
