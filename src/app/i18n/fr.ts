import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const fr: I18n = {
  // Sync - General
  'Successfully joined sync room':
    'Connexion à la salle de synchronisation réussie',
  Sync: 'Synchronisation',
  Syncing: 'Synchronisation',
  'Connecting...': 'Connexion...',
  Offline: 'Hors ligne',
  Connected: 'Connecté',
  Disabled: 'Désactivé',
  Disconnect: 'Déconnecter',
  Back: 'Retour',

  // Sync - Modes
  Create: 'Créer',
  Join: 'Rejoindre',
  Share: 'Partager à un autre appareil',
  'Start Sync': 'Démarrer la sync',
  'Join Room': 'Rejoindre',

  // Sync - Instructions
  'Synchronize with devices': 'Synchroniser avec les appareils',
  'Start synchronization': 'Démarrer la synchronisation',
  'Join with a code': 'Rejoindre avec un code',
  'Create a new sync room': 'Créer une nouvelle salle de sync',
  'Join an existing room': 'Rejoindre une salle existante',
  'Start sharing with other devices':
    "Commencez à partager avec d'autres appareils",
  'Connect to an existing device with a code':
    'Connectez-vous à un appareil existant avec un code',
  'Synchronize with other devices': "Synchroniser avec d'autres appareils",
  'Join a device': 'Rejoindre un appareil',
  'Enter the code from another device, or use a sync link.':
    "Entrez le code d'un autre appareil, ou utilisez un lien de synchronisation.",
  'Start syncing and invite others to join':
    "Démarrez la synchronisation et invitez d'autres à rejoindre",
  'All connected devices sync in real-time as equal peers. Any device can read and write data.':
    'Tous les appareils connectés se synchronisent en temps réel en tant que pairs égaux. Tout appareil peut lire et écrire des données.',
  'Your data syncs with all peers. Everyone has equal access - changes from any device are shared instantly.':
    "Vos données se synchronisent avec tous les pairs. Tout le monde a un accès égal - les modifications de n'importe quel appareil sont partagées instantanément.",
  'Syncing with all connected peers. All devices are equal.':
    'Synchronisation avec tous les pairs connectés. Tous les appareils sont égaux.',
  'Sync active! Share the link or QR code with other devices to connect.':
    "Synchronisation active ! Partagez le lien ou le QR code pour connecter d'autres appareils.",
  'Click "Synchronize with devices" to start syncing.':
    'Cliquez sur "Synchroniser avec les appareils" pour démarrer la synchronisation.',
  'Sync your data across devices in real-time.':
    'Synchronisez vos données entre appareils en temps réel.',
  'No server needed - data stays between your devices.':
    'Aucun serveur requis - les données restent entre vos appareils.',

  // Sync - Room/Code
  Code: 'Code',
  'Room Code': 'Code de la salle',
  'Enter room code': 'Entrez le code de la salle',
  'Enter or paste a code': 'Entrez ou collez un code',
  'Sync Link': 'Lien de synchronisation',
  'Copy Link': 'Copier le lien',
  'Copied!': 'Copié !',
  'Share this code or link with other devices:':
    'Partagez ce code ou lien avec vos autres appareils :',
  'Copy to clipboard': 'Copier dans le presse-papiers',
  'Sync Settings': 'Paramètres de sync',

  // Sync - QR Code
  'Or scan this QR Code:': 'Ou scannez ce QR Code :',
  'Generating QR Code...': 'Génération du QR Code...',
  'QR Code generation failed': 'Échec de la génération du QR Code',
  'Scan QR Code': 'Scanner un QR Code',
  'Scan a QR code to join': 'Scannez un QR code pour rejoindre',
  'Scan the QR Code': 'Scannez le QR Code',
  'Stop Scanner': 'Arrêter le scanner',
  'Point your camera at a sync QR code':
    'Pointez votre caméra vers un QR code de synchronisation',
  'Use another device to scan this QR code to connect instantly.':
    'Utilisez un autre appareil pour scanner ce QR code et vous connecter instantanément.',
  'Camera access denied': 'Accès à la caméra refusé',
  'Unable to access camera. Please grant camera permissions.':
    "Impossible d'accéder à la caméra. Veuillez autoriser l'accès à la caméra.",

  // Sync - Secret Link
  'Share the secret link': 'Partagez le lien secret',
  'Copy and share this unique link with your other device. Keep it private!':
    'Copiez et partagez ce lien unique avec votre autre appareil. Gardez-le privé !',

  // Sync - Peers
  'Status:': 'Statut :',
  '{count} peer': '{count} pair',
  '{count} peers': '{count} pairs',
  You: 'Vous',
  Peer: 'Pair',
  Device: 'Appareil',

  // Sync - Activity
  Sent: 'Envoyé',
  Received: 'Reçu',
  'Activity Details': "Détails de l'activité",
  'No activity': 'Aucune activité',
  'Data Activity': 'Activité des données',
  'Network Topology': 'Topologie du réseau',
  'Total synced': 'Total synchronisé',
  bytes: 'octets',
  KB: 'Ko',
  MB: 'Mo',
  'just now': "à l'instant",
  ago: 'il y a',
  second: 'seconde',
  seconds: 'secondes',

  // Sync - Privacy
  'Your Data Stays Local': 'Vos données restent locales',
  'Everything runs in your browser. Your conversations, agents, and data are stored locally on your device and never sent to any server.':
    'Tout fonctionne dans votre navigateur. Vos conversations, agents et données sont stockés localement sur votre appareil et jamais envoyés à aucun serveur.',
  'Complete Privacy': 'Confidentialité totale',
  'No accounts, no tracking, no cloud storage. You own your data.':
    'Pas de compte, pas de suivi, pas de stockage cloud. Vos données vous appartiennent.',
  'Work Offline': 'Travailler hors ligne',
  'Use the app without an internet connection. Your data is always available.':
    "Utilisez l'application sans connexion internet. Vos données sont toujours disponibles.",
  'Want to sync across devices?': 'Envie de synchroniser entre appareils ?',
  'Enable peer-to-peer sync to share data between your devices or with others. Data travels directly between devices.':
    "Activez la synchronisation pair-à-pair pour partager des données entre vos appareils ou avec d'autres personnes. Les données transitent directement entre appareils.",

  // Sync - Misc
  or: 'ou',
  'Local Backup': 'Sauvegarde locale',
  'Automatically backup your data to a folder on your device':
    'Sauvegardez automatiquement vos données dans un dossier sur votre appareil',
}
