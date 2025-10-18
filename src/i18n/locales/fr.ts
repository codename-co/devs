import type { I18n } from '@/i18n/locales'

export const fr: I18n = {
  // AgentPicker
  'Available Agents': 'Agents disponibles',
  Scientists: 'Scientifiques',
  Advisors: 'Conseillers',
  Artists: 'Artistes',
  Philosophers: 'Philosophes',
  Musicians: 'Musiciens',
  Developers: 'Développeurs',
  Writers: 'Écrivains',
  'Other Agents': 'Autres agents',

  // AppDrawer
  'Expand sidebar': 'Agrandir la barre latérale',
  'Collapse sidebar': 'Réduire la barre latérale',
  'New Task': 'Nouvelle tâche',
  'New Team': 'Nouvelle équipe',
  Tasks: 'Tâches',
  Teams: 'Équipes',
  Settings: 'Paramètres',
  Agents: 'Agents',
  Methodologies: 'Méthodologies',
  Conversations: 'Conversations',
  'Conversations history': 'Historique des conversations',
  Knowledge: 'Connaissances',
  Connectors: 'Connecteurs',
  'New chat': 'Nouvel échange',
  AGENTS: 'AGENTS',
  CONVERSATIONS: 'CONVERSATIONS',
  'View all agents': 'Voir tous les agents',
  'View all history': 'Voir tout l’historique',
  Chat: 'Chat',
  'Main navigation': 'Navigation principale',
  'New Agent': 'Nouvel agent',
  'New Methodology': 'Nouvelle méthodologie',
  'Upgrade to Pro': 'Passer à la version Pro',
  'Quick Actions': 'Actions rapides',
  'Toggle Theme': 'Basculer le thème',
  Theme: 'Thème',
  System: 'Système',
  Light: 'Clair',
  Dark: 'Sombre',
  About: 'À propos',
  Language: 'Langue',

  // PromptArea
  'Need something done?': 'Besoin de quelque chose ?',
  'More actions': 'Plus d’actions',
  'Attach a file or image': 'Joindre un fichier ou une image',
  'Upload new file': 'Télécharger un nouveau fichier',
  'Choose from knowledge base': 'Choisir dans la base de connaissances',
  'Drop files here…': 'Déposez des fichiers ici…',
  'Speak to microphone': 'Dicter au microphone',
  'Send prompt': 'Envoyer le prompt',
  'Select an agent': 'Sélectionner un agent',
  'Select a model': 'Sélectionner un modèle',
  'Add a model': 'Ajouter un modèle',

  // Service worker
  'New features are waiting': 'De nouvelles fonctionnalités vous attendent',
  '{product} v{version} is ready to be installed.':
    '{product} v{version} est prêt à être installé.',
  Upgrade: 'Mettre à jour',

  // Page: /404
  'Page not found': 'Page non trouvée',

  // LLM Integration
  'No LLM provider configured. Please [configure one in Settings]({path}).':
    'Aucun fournisseur LLM configuré. Veuillez [en configurer un dans les Paramètres]({path}).',

  // MarkdownRenderer
  'Thinking…': 'Réflexion en cours…',
  Thoughts: 'Réflexions',

  // AgentsPage
  'My Agents ({count})': 'Mes agents ({count})',
  'Built-in Agents ({count})': 'Agents intégrés ({count})',
  'Built-in agents are pre-configured agents that come with the platform. They showcase various capabilities and can serve as inspiration for your own custom agents.':
    'Les agents intégrés sont des agents préconfigurés qui accompagnent la plateforme. Ils démontrent diverses capacités et peuvent servir d’inspiration pour vos propres agents personnalisés.',

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
  'System Prompt': 'Prompt système',
  'No system prompt defined.': 'Aucune invite système définie.',

  // Artifacts side panel
  Artifacts: 'Artefacts',
  'No artifacts created yet': 'Aucun artefact créé pour le moment',

  // Task
  Requirements: 'Exigences',
  'Task Timeline': 'Chronologie de la tâche',
  'Active Agents': 'Agents actifs',

  // Background Image
  'Please select an image file': 'Veuillez sélectionner un fichier image',
  'Image file is too large. Please select a file smaller than {size}MB.':
    'Le fichier image est trop volumineux. Veuillez sélectionner un fichier de moins de {size} Mo.',
  'Background image updated': 'Image de fond mise à jour',
  'Failed to process image file': 'Échec du traitement du fichier image',
  'Please drop an image file': 'Veuillez déposer un fichier image',
  'Drop your image here': 'Déposez votre image ici',
  'Release to set as background': 'Relâchez pour définir comme arrière-plan',
  'Background Image': 'Image de fond',
  'Set a custom background image for the home page':
    'Définir une image de fond personnalisée pour la page d’accueil',
  'Change Background': 'Changer l’arrière-plan',
  'Upload Background': 'Télécharger l’arrière-plan',
  'Background image removed': 'Image de fond supprimée',
  'Make the platform your own': 'Personnalisez la plateforme à votre image',
  Undo: 'Annuler',
  'The URL does not point to a valid image':
    'L’URL ne pointe pas vers une image valide',
  'Failed to load image from URL. Please check the URL and try again.':
    'Échec du chargement de l’image depuis l’URL. Veuillez vérifier l’URL et réessayer.',
  'Please drop an image file or drag an image from a website':
    'Veuillez déposer un fichier image ou faire glisser une image depuis un site web',

  // About Page
  'AI Teams': 'Équipes IA',
  'Multiple AI agents working together on complex tasks.':
    'Plusieurs agents IA travaillant ensemble sur des tâches complexes.',
  'LLM Independent': 'Indépendant du LLM',
  'Works with OpenAI, Anthropic, Google Gemini, and more':
    'Fonctionne avec OpenAI, Anthropic, Google Gemini et bien d’autres',
  'Privacy First': 'Confidentialité d’abord',
  'All data stays on your device. No servers, no tracking.':
    'Toutes les données restent sur votre appareil. Pas de serveurs, pas de suivi.',
  'Browser Native': 'Natif au navigateur',
  'Works entirely in your browser. No installation required.':
    'Fonctionne entièrement dans votre navigateur. Aucune installation requise.',
  'Offline Ready': 'Prêt hors ligne',
  'Works without internet after initial load.':
    'Fonctionne sans internet après le chargement initial.',
  'Open Source': 'Open Source',
  '{license} licensed. Built by the community, for the community.':
    'Sous licence {license}. Construit par la communauté, pour la communauté.',
  'Configure your LLM provider': 'Configurez votre fournisseur LLM',
  'Describe your task': 'Décrivez votre tâche',
  'Be as detailed as possible to get the best results':
    'Soyez aussi détaillé que possible pour obtenir les meilleurs résultats',
  'Watch AI agents collaborate': 'Regardez les agents IA collaborer',
  'See how different agents work together to complete your task':
    'Voyez comment différents agents travaillent ensemble pour accomplir votre tâche',
  'Guide when needed': 'Guidez si nécessaire',
  'Provide feedback and guidance to the agents as they work':
    'Fournissez des commentaires et des conseils aux agents pendant qu’ils travaillent',
  'Our Vision': 'Notre vision',
  "Democratize AI agent delegation with a universally accessible, privacy-conscious, open-source solution that runs entirely in the browser. AI augmentation isn't a luxury for the few, but a fundamental tool available to all.":
    'Démocratiser la délégation d’agents IA avec une solution universellement accessible, soucieuse de la confidentialité et open source qui fonctionne entièrement dans le navigateur. L’augmentation par l’IA n’est pas un luxe pour quelques-uns, mais un outil fondamental disponible pour tous.',
  'Key Features': 'Fonctionnalités clés',
  'Key Benefits': 'Avantages clés',
  'How It Works': 'Comment ça fonctionne',
  FAQ: 'FAQ',
  'Is my data private?': 'Mes données sont-elles privées ?',
  'Yes! All data processing happens locally in your browser. We do not collect or store any of your data.':
    'Oui ! Tout le traitement des données se fait localement dans votre navigateur. Nous ne collectons ni ne stockons aucune de vos données.',
  'Which LLM providers are supported?':
    'Quels fournisseurs LLM sont pris en charge ?',
  'We support {llmList}, and any provider compatible with the OpenAI API spec.':
    'Nous prenons en charge {llmList}, et tout fournisseur compatible avec la spécification API OpenAI.',
  'Do I need to install anything?': 'Dois-je installer quelque chose ?',
  'No installation is required. The app runs entirely in your web browser.':
    'Aucune installation n’est requise. L’application fonctionne entièrement dans votre navigateur web.',
  'Is this open source?': 'Est-ce open source ?',
  'Yes! The project is open source and available on GitHub under the {license} license.':
    'Oui ! Le projet est open source et disponible sur GitHub sous la licence {license}.',
  'View on GitHub': 'Voir sur GitHub',

  // Tasks Page
  'Manage and monitor tasks for your organization':
    'Gérez et surveillez les tâches de votre organisation',
  'Loading tasks…': 'Chargement des tâches…',
  tasks: 'tâches',
  'In Progress': 'En cours',

  // Task Page
  'Task Details': 'Détails de la tâche',
  'Task Created': 'Tâche créée',
  'Agent Assigned': 'Agent assigné',
  'Artifact Created': 'Artefact créé',
  'User Message': 'Message utilisateur',
  'Agent Response': 'Réponse de l’agent',
  'Requirement Satisfied': 'Exigence satisfaite',
  'Task Completed': 'Tâche terminée',
  'Task Branched': 'Tâche divisée',
  'Sub-task Created': 'Sous-tâche créée',
  'Sub-task Completed': 'Sous-tâche terminée',
  'Requirement Detected': 'Exigence détectée',
  'Requirement Validated': 'Exigence validée',
  'Task Started': 'Tâche démarrée',
  'Methodology Selected': 'Méthodologie sélectionnée',
  'Phase Started': 'Phase démarrée',
  'Phase Completed': 'Phase terminée',
  'Team Built': 'Équipe formée',
  'Role Assigned': 'Rôle assigné',
  'All requirements satisfied': 'Toutes les exigences satisfaites',
  'No task ID provided': 'Aucun ID de tâche fourni',
  'Task not found': 'Tâche non trouvée',
  'Failed to load task data': 'Échec du chargement des données de la tâche',
  'View Content': 'Voir le contenu',
  'Loading task details…': 'Chargement des détails de la tâche…',
  'Task Not Found': 'Tâche non trouvée',
  'The requested task could not be found.':
    'La tâche demandée n’a pas pu être trouvée.',
  'Task Steps': 'Étapes de la tâche',
  'Validation Criteria': 'Critères de validation',

  // SubTaskTree Component
  'Task Hierarchy': 'Hiérarchie des tâches',
  'Expand All': 'Tout développer',
  'Collapse All': 'Tout réduire',
  'Parent Task': 'Tâche parent',
  'Sibling Tasks': 'Tâches sœurs',
  'Current Task & Sub-tasks': 'Tâche actuelle et sous-tâches',
  'Main Task & Sub-tasks': 'Tâche principale et sous-tâches',
  'Task Dependencies': 'Dépendances de la tâche',
  'Total Sub-tasks': 'Total des sous-tâches',

  // Common actions
  Retry: 'Réessayer',
  Refresh: 'Actualiser',
  Close: 'Fermer',
  Edit: 'Modifier',
  Delete: 'Supprimer',
  Save: 'Enregistrer',
  Remove: 'Retirer',
  Cancel: 'Annuler',
  Export: 'Exporter',
  'Copy to clipboard': 'Copier dans le presse-papiers',
  Download: 'Télécharger',

  // Database Administration
  'Loading database information…':
    'Chargement des informations de la base de données…',
  'Failed to load database information':
    'Échec du chargement des informations de la base de données',
  'Database Administration': 'Administration de la base de données',
  'Reset Database': 'Réinitialiser la base de données',
  '{n} records': '{n} enregistrements',
  Records: 'Enregistrements',
  Indexes: 'Index',
  Size: 'Taille',
  'Search {store} by {categories}…': 'Rechercher {store} par {categories}…',
  'All Records': 'Tous les enregistrements',
  'Filtered Records': 'Enregistrements filtrés',
  ID: 'ID',
  Preview: 'Aperçu',
  Actions: 'Actions',
  View: 'Voir',
  'No data recorded': 'Aucune donnée enregistrée',
  'Record Details': 'Détails de l’enregistrement',

  // Searchable collections & indexes
  agents: 'agents',
  conversations: 'conversations',
  knowledgeItems: 'connaissances',
  folderWatchers: 'dossiers synchronisés',
  credentials: 'identifiants',
  artifacts: 'artefacts',
  // tasks: 'tâches',
  contexts: 'contextes',
  langfuse_config: 'config langfuse',
  id: 'ID',
  name: 'nom',
  description: 'description',
  role: 'rôle',
  tags: 'tags',
  size: 'taille',
  type: 'type',
  createdAt: 'date de création',
  fileType: 'type de fichier',
  content: 'contenu',
  contentHash: 'hash du contenu',
  path: 'chemin',
  provider: 'fournisseur',
  model: 'modèle',
  encryptedApiKey: 'clé API chiffrée',
  baseUrl: 'URL de base',
  timestamp: 'horodatage',
  order: 'ordre',
  mimeType: 'type MIME',
  lastModified: 'dernière modification',
  syncSource: 'source de synchronisation',
  lastSyncCheck: 'dernière synchronisation',

  // Sharing
  'Share the platform': 'Partager la plateforme',
  'Export the platform settings to another device or share it with others':
    'Exporter les paramètres de la plateforme vers un autre appareil ou les partager avec d’autres',
  'Export your current agents and LLM provider settings and share it via URL or QR code.':
    'Exporter vos agents actuels et les paramètres du fournisseur LLM et les partager via URL ou QR Code.',
  'Include my {n} agents': 'Inclure mes {n} agents',
  'Now you can share the platform configuration…':
    'Vous pouvez maintenant partager la configuration de la plateforme…',
  'Either with this URL:': 'Avec cette URL :',
  'Or this QR Code:': 'Ou ce QR Code :',
  'QR code generation failed. You can still use the URL above.':
    'Échec de la génération du QR Code. Vous pouvez toujours utiliser l’URL ci-dessus.',
  'Platform Preparation': 'Préparation de la plateforme',
  'Password (optional)': 'Mot de passe (facultatif)',
  Password: 'Mot de passe',
  Continue: 'Continuer',
  'Setting the platform up…': 'Configuration de la plateforme en cours…',

  // Local LLM Loading Indicator
  'Initializing Local AI Model…': 'Initialisation du modèle IA local…',
} as const
