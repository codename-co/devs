import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const fr: I18n = {
  // Page
  Connectors: 'Connecteurs',
  'Connect external services to your knowledge base':
    'Connectez des services externes à votre base de connaissances',
  'Sync files and data from your favorite apps and services.':
    'Synchronisez des fichiers et des données depuis vos applications et services préférés.',
  'Add Connector': 'Ajouter un connecteur',

  // Tabs
  Apps: 'Applications',
  APIs: 'APIs',
  MCPs: 'MCPs',
  'Coming soon': 'Bientôt disponible',

  // ConnectorCard
  Connected: 'Connecté',
  Error: 'Erreur',
  Expired: 'Expiré',
  'Syncing...': 'Synchronisation...',
  'Never synced': 'Jamais synchronisé',
  'Just now': "À l'instant",
  '{n} minutes ago': 'Il y a {n} minutes',
  '{n} hours ago': 'Il y a {n} heures',
  '{n} days ago': 'Il y a {n} jours',
  'Last sync:': 'Dernière synchro :',
  '{n} folders syncing': '{n} dossiers en synchronisation',
  'Sync Now': 'Synchroniser',
  'More options': "Plus d'options",
  'Connector actions': 'Actions du connecteur',
  Settings: 'Paramètres',
  Disconnect: 'Déconnecter',

  // Empty state
  'No app connectors yet': "Aucun connecteur d'application pour le moment",
  'Connect your Google Drive, Notion, Gmail and more to sync files to your knowledge base.':
    'Connectez votre Google Drive, Notion, Gmail et plus pour synchroniser les fichiers vers votre base de connaissances.',
  'No API connectors yet': "Aucun connecteur d'API pour le moment",
  'Connect custom REST or GraphQL APIs to integrate external data sources.':
    'Connectez des APIs REST ou GraphQL personnalisées pour intégrer des sources de données externes.',
  'No MCP connectors yet': 'Aucun connecteur MCP pour le moment',
  'Connect Model Context Protocol servers to extend agent capabilities.':
    'Connectez des serveurs Model Context Protocol pour étendre les capacités des agents.',
  'Add your first connector': 'Ajoutez votre premier connecteur',

  // Wizard - Provider Selection
  'Choose a service to connect to your knowledge base:':
    'Choisissez un service à connecter à votre base de connaissances :',
  'Choose a service to connect to your knowledge base':
    'Choisissez un service à connecter à votre base de connaissances',
  'Select a Service': 'Sélectionner un service',
  'OAuth not configured for this provider':
    'OAuth non configuré pour ce fournisseur',
  'This provider is not ready': 'Ce fournisseur n’est pas prêt',

  // Wizard - OAuth Step
  'Connecting...': 'Connexion en cours...',
  'Connecting to {name}...': 'Connexion à {name}...',
  'Connect {name}': 'Connecter {name}',
  'Connect to {name}': 'Se connecter à {name}',
  'A new window will open for you to authorize access. Please complete the authorization to continue.':
    "Une nouvelle fenêtre s'ouvrira pour autoriser l'accès. Veuillez compléter l'autorisation pour continuer.",
  'You will be redirected to {name} to authorize DEVS to access your data. Your credentials are never stored on our servers.':
    'Vous serez redirigé vers {name} pour autoriser DEVS à accéder à vos données. Vos identifiants ne sont jamais stockés sur nos serveurs.',
  'This connector will be able to:': 'Ce connecteur pourra :',
  'Read your files and content': 'Lire vos fichiers et contenus',
  'Search your content': 'Rechercher dans votre contenu',
  'Sync changes automatically':
    'Synchroniser les modifications automatiquement',
  'Authenticating...': 'Authentification en cours...',
  'Connection Failed': 'Échec de la connexion',
  'Connection failed': 'Échec de la connexion',
  'Something went wrong while connecting. Please try again.':
    "Une erreur s'est produite lors de la connexion. Veuillez réessayer.",
  'Successfully authenticated': 'Authentification réussie',
  'Authentication failed': "Échec de l'authentification",
  'Authentication successful': 'Authentification réussie',
  Authenticate: 'Authentifier',

  // Wizard - Folder Selection
  'Select Folders': 'Sélectionner les dossiers',
  'Select folders to sync': 'Sélectionner les dossiers à synchroniser',
  'Choose which folders you want to sync from {name}, or sync everything.':
    'Choisissez quels dossiers vous souhaitez synchroniser depuis {name}, ou synchronisez tout.',
  'Sync everything': 'Tout synchroniser',
  'All files and folders will be synced automatically':
    'Tous les fichiers et dossiers seront synchronisés automatiquement',
  'Loading folders...': 'Chargement des dossiers...',
  'No folders found': 'Aucun dossier trouvé',
  '{n} folders selected': '{n} dossiers sélectionnés',
  Skip: 'Passer',
  Continue: 'Continuer',

  // Wizard - Success
  'Connected!': 'Connecté !',
  'Successfully connected!': 'Connecté avec succès !',
  '{name} has been connected to your knowledge base.':
    '{name} a été connecté à votre base de connaissances.',
  '{name} has been connected.': '{name} a été connecté.',
  '{name} has been connected to your knowledge base. Files will begin syncing shortly.':
    '{name} a été connecté à votre base de connaissances. La synchronisation des fichiers commencera bientôt.',
  '{name} has been successfully connected': '{name} a été connecté avec succès',
  '{name} connected successfully': '{name} connecté avec succès',
  'Connected and authorized': 'Connecté et autorisé',
  'Connected as {email}': 'Connecté en tant que {email}',
  'Syncing all files': 'Synchronisation de tous les fichiers',
  'Auto-sync enabled': 'Synchronisation automatique activée',
  'Automatic sync will begin shortly':
    'La synchronisation automatique commencera bientôt',
  'Start Sync Now': 'Démarrer la synchronisation',
  'Connector Added': 'Connecteur ajouté',

  // Wizard - Progress
  'Step {current} of {total}': 'Étape {current} sur {total}',
  'Wizard progress': "Progression de l'assistant",

  // Sync Status
  'Sync completed': 'Synchronisation terminée',
  '{n} items synced': '{n} éléments synchronisés',
  'Sync failed': 'Échec de la synchronisation',
  'Unknown error': 'Erreur inconnue',

  // Settings Modal
  '{name} Settings': 'Paramètres de {name}',
  'Connected Account': 'Compte connecté',
  'Enable Sync': 'Activer la synchronisation',
  'Enable Automatic Sync': 'Activer la synchronisation automatique',
  'Automatically sync content from this connector':
    'Synchroniser automatiquement le contenu de ce connecteur',
  'Automatically sync new and updated content':
    'Synchroniser automatiquement le contenu nouveau et mis à jour',
  'Sync Settings': 'Paramètres de synchronisation',
  'Sync Interval (minutes)': 'Intervalle de synchronisation (minutes)',
  'How often to check for changes':
    'Fréquence de vérification des modifications',
  'Choose which folders to sync or sync everything':
    'Choisissez quels dossiers synchroniser ou synchronisez tout',
  'Settings saved': 'Paramètres enregistrés',
  'Connector settings have been updated':
    'Les paramètres du connecteur ont été mis à jour',
  'Failed to load folders': 'Échec du chargement des dossiers',
  'Failed to save': "Échec de l'enregistrement",
  'Failed to save connector': "Échec de l'enregistrement du connecteur",

  // Configuration
  'Configure Connector': 'Configurer le connecteur',
  'Connector Name': 'Nom du connecteur',
  'Give this connector a memorable name':
    'Donnez un nom mémorable à ce connecteur',
  'Complete Setup': 'Terminer la configuration',
  Complete: 'Terminer',
  'Saving...': 'Enregistrement...',

  // Token refresh
  'Refreshing access token...': "Actualisation du jeton d'accès...",
  'Please wait': 'Veuillez patienter',
  'Token refreshed': 'Jeton actualisé',
  'Connection restored successfully': 'Connexion restaurée avec succès',
  'Your access token has expired. Please reconnect.':
    "Votre jeton d'accès a expiré. Veuillez vous reconnecter.",

  // Missing refresh token warning
  'Limited session': 'Session limitée',
  'Google did not provide a refresh token. Your session will expire in about 1 hour. To enable automatic token refresh, go to myaccount.google.com/permissions, revoke access to DEVS, then reconnect.':
    "Google n'a pas fourni de jeton de rafraîchissement. Votre session expirera dans environ 1 heure. Pour activer le rafraîchissement automatique, allez sur myaccount.google.com/permissions, révoquez l'accès à DEVS, puis reconnectez-vous.",
  'Your session has expired. Please disconnect and reconnect this service. To avoid this in the future, revoke access at myaccount.google.com/permissions before reconnecting.':
    "Votre session a expiré. Veuillez déconnecter et reconnecter ce service. Pour éviter cela à l'avenir, révoquez l'accès sur myaccount.google.com/permissions avant de vous reconnecter.",

  // Common
  Cancel: 'Annuler',
  Done: 'Terminé',
  'Try Again': 'Réessayer',
  Back: 'Retour',
  Save: 'Enregistrer',
}
