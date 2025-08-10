import type { I18n } from '@/i18n/locales'

export const fr: I18n = {
  // AgentPicker
  'Available Agents': 'Agents disponibles',
  Scientists: 'Scientifiques',
  Advisors: 'Conseillers',
  Artists: 'Artistes',
  Philosophers: 'Philosophes',
  Musicians: 'Musiciens',
  Writers: 'Écrivains',
  'Other Agents': 'Autres agents',

  // AppDrawer
  'Expand sidebar': 'Agrandir la barre latérale',
  'Collapse sidebar': 'Réduire la barre latérale',
  'New Mission': 'Nouvelle mission',
  'New Team': 'Nouvelle équipe',
  Missions: 'Missions',
  Teams: 'Équipes',
  Settings: 'Paramètres',
  Agents: 'Agents',
  'Conversations history': 'Historique des conversations',
  Knowledge: 'Connaissances',
  Connectors: 'Connecteurs',
  'New Chat': 'Nouveau chat',
  'Chat with AI': 'Discuter avec l’IA',
  AGENTS: 'AGENTS',
  CONVERSATIONS: 'CONVERSATIONS',
  'View all agents': 'Voir tous les agents',
  'View all history': 'Voir tout l’historique',
  Chat: 'Chat',
  'Main navigation': 'Navigation principale',
  'New Agent': 'Nouvel agent',
  'Upgrade to Pro': 'Passer à la version Pro',

  // PromptArea
  'Need something done?': 'Besoin de quelque chose ?',
  'More actions': 'Plus d’actions',
  'Attach a file or image': 'Joindre un fichier ou une image',
  'Drop files here…': 'Déposez des fichiers ici…',
  'Use microphone': 'Utiliser le microphone',
  'Send prompt': 'Envoyer le prompt',

  // Page: /404
  'Page not found': 'Page non trouvée',

  // Page: /
  'Let AI agents take it from here': 'Vos agents IA prennent le relais',
  'Delegate to adaptive AI teams that form, collaborate, and deliver automatically':
    'Déléguez à des équipes d’IA adaptatives qui se forment, collaborent et livrent automatiquement',
  'Failed to get response from LLM. Please try again later.':
    'Échec de la réponse du LLM. Veuillez réessayer plus tard.',

  // Page: /settings
  'Platform Settings': 'Paramètres de la plateforme',
  'Configure LLM providers, models and platform defaults for your organization':
    'Configurez les fournisseurs de LLM, les modèles et les paramètres par défaut de la plateforme pour votre organisation',

  // LLM Integration
  'No LLM provider configured. Please [configure one in Settings]({path}).':
    'Aucun fournisseur LLM configuré. Veuillez [en configurer un dans les Paramètres]({path}).',

  // MarkdownRenderer
  'Thinking…': 'Réflexion en cours…',
  Thoughts: 'Réflexions',

  // AgentsPage
  'My Agents ({count})': 'Mes agents ({count})',
  'Built-in Agents ({count})': 'Agents intégrés ({count})',

  // AgentRunPage
  'View and manage your past conversations':
    'Voir et gérer vos conversations passées',
  'Loading agent and conversation…':
    'Chargement de l’agent et de la conversation…',
  Back: 'Retour',
  'Conversation ID:': 'ID de conversation :',
  You: 'Vous',
  'Continue the conversation…': 'Continuer la conversation…',
  'Start chatting with {agentName}…': 'Commencer à discuter avec {agentName}…',
  'this agent': 'cet agent',
} as const
