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
  'New Task': 'Nouvelle tâche',
  'New Team': 'Nouvelle équipe',
  Tasks: 'Tâches',
  Teams: 'Équipes',
  Settings: 'Paramètres',
  Agents: 'Agents',
  Conversations: 'Conversations',
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
  'More actions': "Plus d'actions",
  'Attach a file or image': 'Joindre un fichier ou une image',
  'Upload new file': 'Télécharger un nouveau fichier',
  'Choose from knowledge base': 'Choisir dans la base de connaissances',
  'Drop files here…': 'Déposez des fichiers ici…',
  'Use microphone': 'Utiliser le microphone',
  'Send prompt': 'Envoyer le prompt',

  // Page: /404
  'Page not found': 'Page non trouvée',

  // Page: /
  'Let your agents take it from here': 'Laissez vos agents prendre le relais',
  'Delegate complex tasks to your own AI teams':
    'Déléguez vos tâches les plus complexes à vos propres équipes IA',
  'Failed to get response from LLM. Please try again later.':
    'Échec de la réponse du LLM. Veuillez réessayer plus tard.',

  // Page: /settings
  'Platform Settings': 'Paramètres de la plateforme',
  'Configure LLM providers, models and platform defaults for your organization':
    'Configurez les fournisseurs de LLM, les modèles et les paramètres par défaut de la plateforme pour votre organisation',
  'General Settings': 'Paramètres généraux',
  'Choose your preferred language': 'Choisissez votre langue préférée',
  'Interface Language': 'Langue de l’interface',
  'Platform Name': 'Nom de la plateforme',
  'Theme Mode': 'Mode de thème',
  System: 'Système',
  Light: 'Clair',
  Dark: 'Sombre',
  'Secure Storage': 'Stockage sécurisé',
  'Manage your encryption keys and secure storage':
    'Gérez vos clés de chiffrement et votre stockage sécurisé',
  'Master Key': 'Clé maîtresse',
  'Copy Master Key': 'Copier la clé maîtresse',
  'Master key copied to clipboard':
    'Clé maîtresse copiée dans le presse-papiers',
  'Failed to copy master key': 'Échec de la copie de la clé maîtresse',
  'Regenerate Master Key': 'Régénérer la clé maîtresse',
  'Are you sure you want to regenerate the master key? This will invalidate all existing encrypted data.':
    'Êtes-vous sûr de vouloir régénérer la clé maîtresse ? Cela invalidera toutes les données chiffrées existantes.',
  'Master key regenerated successfully': 'Clé maîtresse régénérée avec succès',
  'Failed to regenerate master key':
    'Échec de la régénération de la clé maîtresse',
  'Your master key is used to encrypt all sensitive data stored locally. Keep it safe and secure.':
    'Votre clé maîtresse est utilisée pour chiffrer toutes les données sensibles stockées localement. Gardez-la en sécurité.',
  'LLM Providers': 'Fournisseurs LLM',
  'Manage your API credentials': 'Gérez vos identifiants API',
  'Add Provider': 'Ajouter un fournisseur',
  'No providers configured. Add one to get started.':
    'Aucun fournisseur configuré. Ajoutez-en un pour commencer.',
  'Set as Default': 'Définir par défaut',
  'Secure storage is locked': 'Le stockage sécurisé est verrouillé',
  'Enter your master password to unlock':
    'Entrez votre mot de passe maître pour déverrouiller',
  'Master password': 'Mot de passe maître',
  Unlock: 'Déverrouiller',
  'Storage unlocked': 'Stockage déverrouillé',
  'Invalid password': 'Mot de passe invalide',
  'Please fill in all required fields':
    'Veuillez remplir tous les champs obligatoires',
  'Invalid API key': 'Clé API invalide',
  'Credential added successfully': 'Identifiants ajoutés avec succès',
  'Failed to add credential': 'Échec de l’ajout des identifiants',
  'Credential deleted': 'Identifiants supprimés',
  'Failed to delete credential': 'Échec de la suppression des identifiants',
  'Database Management': 'Gestion de base de données',
  'Export, import, or clear your local database':
    'Exportez, importez ou effacez votre base de données locale',
  'Backup database': 'Exporter la base de données',
  'Restore database': 'Restaurer la base de données',
  'Clear database': 'Effacer la base de données',
  'Database exported successfully': 'Base de données exportée avec succès',
  'Failed to export database': 'Échec de l’exportation de la base de données',
  'Database imported successfully ({count} items)':
    'Base de données importée avec succès ({count} éléments)',
  'Failed to import database - invalid file format':
    'Échec de l’importation de la base de données - format de fichier invalide',
  'Are you sure you want to clear all data? This action cannot be undone.':
    'Êtes-vous sûr de vouloir effacer toutes les données ? Cette action ne peut pas être annulée.',
  'Database cleared successfully': 'Base de données effacée avec succès',
  'Failed to clear database': 'Échec de l’effacement de la base de données',
  'Database repaired successfully': 'Base de données réparée avec succès',
  'Failed to repair database': 'Échec de la réparation de la base de données',
  'Expand artifacts panel': 'Agrandir le panneau d’artefacts',
  'Minimize artifacts panel': 'Réduire le panneau d’artefacts',
  'Previous artifact': 'Artefact précédent',
  'Next artifact': 'Artefact suivant',
  Dependencies: 'Dépendances',
  'Validates Requirements': 'Valide les exigences',
  'No artifact selected': 'Aucun artefact sélectionné',
  All: 'Tous',
  Running: 'En cours',
  Completed: 'Terminé',
  Pending: 'En attente',
  Failed: 'Échoué',
  'No tasks found': 'Aucune tâche trouvée',
  'No {status} tasks found': 'Aucune tâche {status} trouvée',
  Due: 'Échéance',
  simple: 'simple',
  complex: 'complexe',
  requirements: 'exigences',
  Created: 'Créé',
  Updated: 'Mis à jour',
  'Add LLM Provider': 'Ajouter un fournisseur LLM',
  'Select Provider': 'Sélectionner un fournisseur',
  'Server URL (Optional)': 'URL du serveur (Optionnel)',
  'API Key': 'Clé API',
  'Enter your API key': 'Entrez votre clé API',
  'Format:': 'Format :',
  'Base URL': 'URL de base',
  'https://api.example.com/v1': 'https://api.exemple.com/v1',
  Model: 'Modèle',
  'Select a model': 'Sélectionnez un modèle',
  'Custom Model Name': 'Nom de modèle personnalisé',
  'Enter model name': 'Entrez le nom du modèle',
  Cancel: 'Annuler',
  'Validate & Add': 'Valider et ajouter',
  'Fetch Available Models': 'Récupérer les modèles disponibles',
  'Use Fetched Models': 'Utiliser les modèles récupérés',
  'Manual Input': 'Saisie manuelle',
  'Model Name': 'Nom du modèle',
  'Enter model name (e.g., llama2, mistral)':
    'Entrez le nom du modèle (ex: llama2, mistral)',
  'Enter the exact name of the model you want to use':
    'Entrez le nom exact du modèle que vous souhaitez utiliser',
  'Available Models': 'Modèles disponibles',
  'Default Provider': 'Fournisseur par défaut',
  'Provider set as default': 'Fournisseur défini par défaut',

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
  'System Prompt': 'Prompt système',
  'No system prompt defined.': 'Aucune invite système définie.',

  // AgentsNewPage
  'Agent Builder': 'Constructeur d’agent',
  'Design and configure your custom specialized AI agent':
    'Concevez et configurez votre agent IA spécialisé personnalisé',
  'Agent Profile': 'Profil de l’agent',
  "Define your agent's personality and capabilities":
    'Définissez la personnalité et les capacités de votre agent',
  'Agent created successfully! Redirecting to agents list...':
    'Agent créé avec succès ! Redirection vers la liste des agents...',
  Name: 'Nom',
  'e.g., Mike the Magician': 'ex., Mike le Magicien',
  'A friendly name for your agent': 'Un nom amical pour votre agent',
  Role: 'Rôle',
  'e.g., Performs magic tricks and illusions':
    'ex., Effectue des tours de magie et des illusions',
  'What does your agent do?': 'Que fait votre agent ?',
  Instructions: 'Instructions',
  "Detailed instructions for the agent's personality, skills, constraints, and goals…":
    'Instructions détaillées pour la personnalité, les compétences, les contraintes et les objectifs de l’agent…',
  "Detailed instructions for the agent's behavior":
    'Instructions détaillées pour le comportement de l’agent',
  'Advanced Configuration': 'Configuration avancée',
  'Configure advanced settings for your agent':
    'Configurez les paramètres avancés de votre agent',
  Provider: 'Fournisseur',
  Temperature: 'Température',
  'Lower values = more focused, Higher values = more creative':
    'Valeurs plus basses = plus ciblé, Valeurs plus élevées = plus créatif',
  'Creating...': 'Création en cours...',
  'Create Agent': 'Créer l’agent',
  'Reset Form': 'Réinitialiser le formulaire',
  'Live Preview': 'Aperçu en direct',
  Clear: 'Effacer',
  'Start a conversation to test your agent':
    'Commencez une conversation pour tester votre agent',
  'The chat will use your current form configuration':
    'Le chat utilisera votre configuration de formulaire actuelle',
  'Ask {agentName} something…': 'Demandez quelque chose à {agentName}…',
  Send: 'Envoyer',

  // Artifacts side panel
  Artifacts: 'Artefacts',
  'No artifacts created yet': 'Aucun artefact créé pour le moment',

  // Task
  Requirements: 'Exigences',
  'Task Timeline': 'Chronologie de la tâche',

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
  Remove: 'Supprimer',
  'Configure your platform preferences':
    'Configurez vos préférences de plateforme',
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
  'Works with OpenAI, Anthropic, Google AI, and more':
    'Fonctionne avec OpenAI, Anthropic, Google AI et bien d’autres',
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

  // Knowledge Page
  'Knowledge Base': 'Base de connaissances',
  'Add Knowledge': 'Ajouter des connaissances',

  // Common actions
  Retry: 'Réessayer',
  Refresh: 'Actualiser',
  Close: 'Fermer',

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
} as const
