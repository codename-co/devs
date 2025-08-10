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
  'Let {productName} take it from here':
    'Laissez {productName} prendre le relais',
  'Delegate complex tasks to your own AI teams':
    'Déléguez vos tâches les plus complexes à vos propres équipes d’IA',
  'Failed to get response from LLM. Please try again later.':
    'Échec de la réponse du LLM. Veuillez réessayer plus tard.',

  // Page: /settings
  'Platform Settings': 'Paramètres de la plateforme',
  'Configure LLM providers, models and platform defaults for your organization':
    'Configurez les fournisseurs de LLM, les modèles et les paramètres par défaut de la plateforme pour votre organisation',
  'Language Settings': 'Paramètres de langue',
  'Choose your preferred language': 'Choisissez votre langue préférée',
  'Interface Language': 'Langue de l’interface',
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
  'Failed to add credential': "Échec de l'ajout des identifiants",
  'Credential deleted': 'Identifiants supprimés',
  'Failed to delete credential': 'Échec de la suppression des identifiants',
  'Database Management': 'Gestion de base de données',
  'Export, import, or clear your local database':
    'Exportez, importez ou effacez votre base de données locale',
  'Dump your entire database to a JSON file':
    'Sauvegardez toute votre base de données dans un fichier JSON',
  'Backup database': 'Sauvegarder la base de données',
  'Restore your database from a JSON file':
    "Restaurez votre base de données à partir d'un fichier JSON",
  'Restore database': 'Restaurer la base de données',
  'Clear all data from the database':
    'Effacer toutes les données de la base de données',
  'Clear database': 'Effacer la base de données',
  'Database exported successfully': 'Base de données exportée avec succès',
  'Failed to export database': "Échec de l'exportation de la base de données",
  'Database imported successfully ({count} items)':
    'Base de données importée avec succès ({count} éléments)',
  'Failed to import database - invalid file format':
    "Échec de l'importation de la base de données - format de fichier invalide",
  'Are you sure you want to clear all data? This action cannot be undone.':
    'Êtes-vous sûr de vouloir effacer toutes les données ? Cette action ne peut pas être annulée.',
  'Database cleared successfully': 'Base de données effacée avec succès',
  'Failed to clear database': "Échec de l'effacement de la base de données",
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
} as const
