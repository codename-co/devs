import type { I18n } from '@/i18n/locales'

export const fr: I18n = {
  // AgentPicker
  'Available Agents': 'Agents disponibles',

  // PromptArea
  'Need something done?': 'Besoin de quelque chose ?',
  'More actions': 'Plus d’actions',
  'Attach a file or image': 'Joindre un fichier ou une image',
  'Drop files here…': 'Déposez des fichiers ici…',
  'Use microphone': 'Utiliser le microphone',

  // Page: /404
  'Page not found': 'Page non trouvée',

  // Page: /
  'Let AI agents take it from here': 'Vos agents IA prennent le relais',
  'Delegate to adaptive AI teams that form, collaborate, and deliver automatically':
    'Déléguez à des équipes d’IA adaptatives qui se forment, collaborent et livrent automatiquement',

  // Page: /settings
  Settings: 'Paramètres',
  'Platform Settings': 'Paramètres de la plateforme',
  'Configure LLM providers, models and platform defaults for your organization':
    'Configurez les fournisseurs de LLM, les modèles et les paramètres par défaut de la plateforme pour votre organisation',

  // LLM Integration
  'No LLM provider configured. Please configure one in Settings.':
    'Aucun fournisseur LLM configuré. Veuillez en configurer un dans les Paramètres.',
} as const
