import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const fr: I18n = {
  // Page titles
  'Traces and Metrics': 'Traces et métriques',
  'Trace Details': 'Détails de la trace',
  Dashboard: 'Tableau de bord',
  'LLM Observability': 'Observabilité LLM',
  'Monitor and analyze all LLM calls':
    'Surveillez et analysez tous les appels LLM',

  // Tabs
  Logs: 'Journaux',
  Metrics: 'Métriques',

  // Filters
  All: 'Tout',
  Completed: 'Terminé',
  Error: 'Erreur',
  Running: 'En cours',
  Pending: 'En attente',
  'Filter by status': 'Filtrer par statut',
  'Filter by provider': 'Filtrer par fournisseur',
  'Filter by agent': 'Filtrer par agent',
  'Search traces...': 'Rechercher des traces...',

  // Time periods
  'Time Range': 'Période',
  'Last Hour': 'Dernière heure',
  'Last 24 Hours': 'Dernières 24 heures',
  'Last 7 Days': '7 derniers jours',
  'Last 30 Days': '30 derniers jours',
  'All Time': 'Tout le temps',

  // Metrics
  'Total Requests': 'Total des requêtes',
  'Success Rate': 'Taux de réussite',
  'Total Tokens': 'Total des tokens',
  'Total Cost': 'Coût total',
  'Avg Duration': 'Durée moyenne',
  'Error Rate': "Taux d'erreur",
  'Requests Over Time': 'Requêtes dans le temps',
  'Token Usage': 'Utilisation des tokens',
  'Cost Breakdown': 'Répartition des coûts',
  'Model Distribution': 'Distribution des modèles',
  'Provider Distribution': 'Distribution des fournisseurs',
  'Agent Usage': 'Utilisation des agents',

  // Trace details
  'Trace ID': 'ID de trace',
  Status: 'Statut',
  Duration: 'Durée',
  Started: 'Démarré',
  Ended: 'Terminé',
  Model: 'Modèle',
  Provider: 'Fournisseur',
  Tokens: 'Tokens',
  Cost: 'Coût',
  Input: 'Entrée',
  Output: 'Sortie',
  Spans: 'Spans',
  Metadata: 'Métadonnées',
  'No spans found': 'Aucun span trouvé',

  // Span types
  'LLM Call': 'Appel LLM',
  'Image Generation': "Génération d'image",
  'Video Generation': 'Génération de vidéo',
  Agent: 'Agent',
  Tool: 'Outil',
  Chain: 'Chaîne',
  Retrieval: 'Récupération',
  Embedding: 'Embedding',
  Custom: 'Personnalisé',

  // Actions
  'Clear All': 'Tout effacer',
  Export: 'Exporter',
  Refresh: 'Actualiser',
  Delete: 'Supprimer',
  Back: 'Retour',
  'View Details': 'Voir les détails',

  // Empty states
  'No traces yet': 'Aucune trace pour le moment',
  'Start chatting with agents to see LLM traces here':
    'Commencez à discuter avec les agents pour voir les traces LLM ici',
  'No data available': 'Aucune donnée disponible',

  // Settings
  'Tracing Settings': 'Paramètres de traçage',
  'Enable Tracing': 'Activer le traçage',
  'Capture Input': "Capturer l'entrée",
  'Capture Output': 'Capturer la sortie',
  'Retention Days': 'Jours de rétention',
  'Max Traces': 'Max traces',

  // Misc
  'Prompt Tokens': 'Tokens de prompt',
  'Completion Tokens': 'Tokens de complétion',
  requests: 'requêtes',
  tokens: 'tokens',
  ms: 'ms',
  'Are you sure you want to delete all traces?':
    'Êtes-vous sûr de vouloir supprimer toutes les traces ?',
  'This action cannot be undone.': 'Cette action est irréversible.',
  Cancel: 'Annuler',
  Confirm: 'Confirmer',

  // Additional page strings
  'Trace not found': 'Trace introuvable',
  'Failed to load trace': 'Échec du chargement de la trace',
  'Failed to load traces': 'Échec du chargement des traces',
  'Back to Traces': 'Retour aux traces',
  'Trace Detail': 'Détail de la trace',
  'Trace deleted successfully': 'Trace supprimée avec succès',
  'All traces deleted successfully': 'Toutes les traces ont été supprimées',
  'Failed to delete trace': 'Échec de la suppression de la trace',
  'Failed to clear traces': 'Échec de la suppression des traces',
  'Configuration saved successfully': 'Configuration enregistrée avec succès',
  'Failed to save configuration':
    "Échec de l'enregistrement de la configuration",
  'Monitor and analyze LLM requests':
    'Surveillance et analyse des requêtes LLM',
  'Capture all LLM requests': 'Capturer toutes les requêtes LLM',
  'How long to keep traces': 'Durée de conservation des traces',
  'Sampling Rate': "Taux d'échantillonnage",
  'Percentage of requests to trace': 'Pourcentage de requêtes à tracer',
  Save: 'Enregistrer',
  Deleted: 'Supprimé',
  Cleared: 'Effacé',
  Saved: 'Enregistré',
  'Clear All Traces': 'Effacer toutes les traces',
  'Are you sure you want to delete all traces? This action cannot be undone.':
    'Êtes-vous sûr de vouloir supprimer toutes les traces ? Cette action est irréversible.',
  'Delete All': 'Tout supprimer',
  Settings: 'Paramètres',
  'Current Session': 'Session actuelle',

  // Sessions view
  Sessions: 'Sessions',
  Session: 'Session',
  'Single Request': 'Requête unique',
  Conversation: 'Conversation',
  Task: 'Tâche',
  'Search sessions...': 'Rechercher des sessions...',
  'Search logs...': 'Rechercher des logs...',
  sessions: 'sessions',
  'No sessions found matching your search':
    'Aucune session ne correspond à votre recherche',
  'Just now': "À l'instant",
  Name: 'Nom',
}
