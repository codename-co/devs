import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const fr: I18n = {
  // Page
  Connectors: 'Connecteurs',
  'Connect external services to import content into your Knowledge Base':
    'Connectez des services externes pour importer du contenu dans votre base de connaissances',

  // Categories
  Apps: 'Applications',
  APIs: 'APIs',
  MCPs: 'MCPs',

  // Providers - Google Drive
  'Google Drive': 'Google Drive',
  'Import files and documents from Google Drive':
    'Importer des fichiers et documents depuis Google Drive',

  // Providers - Gmail
  Gmail: 'Gmail',
  'Import emails and conversations': 'Importer des emails et conversations',

  // Providers - Google Calendar
  'Google Calendar': 'Google Calendar',
  'Import events and schedules': 'Importer des événements et calendriers',

  // Providers - Google Meet
  'Google Meet': 'Google Meet',
  'Join meetings with AI agents': 'Rejoindre des réunions avec des agents IA',

  // Providers - Notion
  Notion: 'Notion',
  'Import pages and databases from Notion':
    'Importer des pages et bases de données depuis Notion',

  // Providers - Google Tasks
  'Google Tasks': 'Google Tasks',
  'Import tasks and to-do lists from Google Tasks':
    'Importer des tâches et listes de tâches depuis Google Tasks',

  // Status
  Connected: 'Connecté',
  'Syncing...': 'Synchronisation...',
  Error: 'Erreur',
  'Token Expired': 'Jeton expiré',

  // Actions
  Connect: 'Connecter',
  Disconnect: 'Déconnecter',
  'Sync Now': 'Synchroniser maintenant',
  Settings: 'Paramètres',
  Reconnect: 'Reconnecter',

  // Wizard
  'Connect a Service': 'Connecter un service',
  'Select a service to connect': 'Sélectionnez un service à connecter',
  'Connecting to {provider}...': 'Connexion à {provider}...',
  'Select folders to sync': 'Sélectionnez les dossiers à synchroniser',
  'Sync all content': 'Synchroniser tout le contenu',
  'Successfully connected!': 'Connexion réussie !',
  '{name} has been connected to your knowledge base.':
    '{name} a été connecté à votre base de connaissances.',
  '{name} has been connected.': '{name} a été connecté.',
  'Start Sync Now': 'Démarrer la synchronisation',
  Done: 'Terminé',
  'Try Again': 'Réessayer',

  // Sync
  'Last synced {time}': 'Dernière synchronisation {time}',
  'Never synced': 'Jamais synchronisé',
  '{count} items synced': '{count} éléments synchronisés',
  'Sync in progress...': 'Synchronisation en cours...',

  // Errors
  'Authentication failed': "Échec de l'authentification",
  'Your access token has expired. Please reconnect.':
    "Votre jeton d'accès a expiré. Veuillez vous reconnecter.",
  'Sync failed: {error}': 'Échec de la synchronisation : {error}',
  'Provider error: {error}': 'Erreur du fournisseur : {error}',
  'Failed to load folders': 'Échec du chargement des dossiers',
  'Failed to save': "Échec de l'enregistrement",

  // Empty states
  'No connectors': 'Aucun connecteur',
  'Connect external services to import content':
    'Connectez des services externes pour importer du contenu',
  'Add Connector': 'Ajouter un connecteur',

  // Confirmations
  'Are you sure you want to disconnect {provider}?':
    'Êtes-vous sûr de vouloir déconnecter {provider} ?',
  'This will remove the connection but keep synced content.':
    'Cela supprimera la connexion mais conservera le contenu synchronisé.',

  // Settings Modal
  '{name} Settings': 'Paramètres de {name}',
  'Connected Account': 'Compte connecté',
  'Enable Sync': 'Activer la synchronisation',
  'Automatically sync content from this connector':
    'Synchroniser automatiquement le contenu depuis ce connecteur',
  'Sync Settings': 'Paramètres de synchronisation',
  'Choose which folders to sync or sync everything':
    'Choisissez quels dossiers synchroniser ou synchronisez tout',
  'Settings saved': 'Paramètres enregistrés',
  'Connector settings have been updated':
    'Les paramètres du connecteur ont été mis à jour',
} as const
