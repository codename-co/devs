import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const fr: I18n = {
  // Page titles
  Marketplace: 'Marketplace',
  'Expand your platform capabilities with community extensions':
    'Etendez les capacités de votre plateforme avec les extensions de la communauté',
  'Find and install apps, agents, connectors, and tools from the community':
    'Trouvez et installez des applications, agents, connecteurs et outils de la communauté',

  // Tabs
  All: 'Tous',
  Apps: 'Applications',
  Agents: 'Agents',
  Connectors: 'Connecteurs',
  Tools: 'Outils',
  Installed: 'Installés',
  Available: 'Disponibles',

  // Search
  'Search extensions...': 'Rechercher des extensions...',
  'No description found': 'Aucune description trouvée',
  'Try a different search term': 'Essayez un autre terme de recherche',

  // Categories
  Categories: 'Catégories',
  Productivity: 'Productivité',
  Development: 'Développement',
  Communication: 'Communication',
  'Data & Analytics': 'Données et Analytique',
  'AI & Machine Learning': 'IA et Machine Learning',
  Utilities: 'Utilitaires',

  // Filters
  Filter: 'Filtrer',
  'Sort by': 'Trier par',
  'Most popular': 'Plus populaires',
  'Recently updated': 'Récemment mis à jour',
  'Highest rated': 'Mieux notés',
  Newest: 'Plus récents',
  Alphabetical: 'Alphabétique',

  // Extension Card
  Install: 'Installer',
  'Update available': 'Mise à jour disponible',
  Update: 'Mettre à jour',
  Uninstall: 'Désinstaller',
  Configure: 'Configurer',
  Enable: 'Activer',
  Disable: 'Désactiver',
  Verified: 'Vérifié',
  Official: 'Officiel',
  Community: 'Communauté',
  '{n} downloads': '{n} téléchargements',
  '{n} reviews': '{n} avis',
  Free: 'Gratuit',
  Premium: 'Premium',

  // Extension Detail
  Overview: 'Aperçu',
  Reviews: 'Avis',
  Changelog: 'Changelog',
  Documentation: 'Documentation',
  'Version {v}': 'Version {v}',
  'Last updated': 'Dernière mise à jour',
  Author: 'Auteur',
  License: 'Licence',
  Website: 'Site web',
  'Report issue': 'Signaler un problème',
  'View source': 'Voir le code source',
  Permissions: 'Permissions',
  'This extension requires:': 'Cette extension nécessite :',
  Dependencies: 'Dépendances',
  'Requires these extensions:': 'Nécessite ces extensions :',
  Screenshots: 'Captures',
  'Similar extensions': 'Extensions similaires',

  // Reviews
  'Write a review': 'Écrire un avis',
  Rating: 'Note',
  'Your review': 'Votre avis',
  'Submit review': 'Soumettre l’avis',
  Helpful: 'Utile',
  '{n} people found this helpful': '{n} personnes ont trouvé ceci utile',
  'Report review': 'Signaler l’avis',

  // Install flow
  'Installing...': 'Installation en cours...',
  'Installation complete': 'Installation terminée',
  'Installation failed': 'Échec de l’installation',
  'This extension requires the following permissions:':
    'Cette extension nécessite les permissions suivantes :',
  Allow: 'Autoriser',
  Deny: 'Refuser',
  Cancel: 'Annuler',
  'Confirm installation': 'Confirmer l’installation',

  // Publish
  'Publish Extension': 'Publier une extension',
  'Share your extension with the community':
    'Partagez votre extension avec la communauté',
  'Create New Extension': 'Créer une nouvelle extension',
  'Upload Extension': 'Téléverser une extension',
  'Upload a .yaml or .devs file': 'Téléversez un fichier .yaml ou .devs',
  'Drop your extension file here': 'Déposez votre fichier d’extension ici',
  'Or browse files': 'Ou parcourir les fichiers',
  Validate: 'Valider',
  'Validating...': 'Validation en cours...',
  'Validation successful': 'Validation réussie',
  'Validation failed': 'Échec de la validation',
  'Fix the following issues:': 'Corrigez les problèmes suivants :',
  Publish: 'Publier',
  'Publishing...': 'Publication en cours...',
  'Published successfully': 'Publié avec succès',
  'Publish failed': 'Échec de la publication',
  Draft: 'Brouillon',
  Published: 'Publié',
  'Under review': "En cours d'examen",
  Rejected: 'Rejeté',
  Edit: 'Modifier',
  Delete: 'Supprimer',
  Unpublish: 'Dépublier',
  'View in marketplace': 'Voir dans le marketplace',

  // Empty states
  'No extensions found': 'Aucune extension trouvée',
  'Be the first to publish an extension!':
    'Soyez le premier à publier une extension !',
  'No installed extensions': 'Aucune extension installée',
  'Browse the marketplace to find useful extensions':
    'Parcourez le marketplace pour trouver des extensions utiles',
  'No apps available': 'Aucune application disponible',
  'No agents available': 'Aucun agent disponible',
  'No connectors available': 'Aucun connecteur disponible',
  'No tools available': 'Aucun outil disponible',

  // Coming soon placeholder
  'Coming Soon': 'Bientôt disponible',
  'The DEVS Marketplace is under development':
    'Le DEVS Marketplace est en cours de développement',
  "Soon you'll be able to discover and install community-built apps, agents, connectors, and tools.":
    'Bientôt, vous pourrez découvrir et installer des applications, agents, connecteurs et outils créés par la communauté.',
  "Want to be notified when it's ready?":
    'Vous voulez être notifié quand ce sera prêt ?',
  'Join the waitlist': "Rejoindre la liste d'attente",
  'Learn more about building extensions':
    "En savoir plus sur la création d'extensions",

  // Trust levels
  Unverified: 'Non vérifié',
  'This extension has been reviewed and verified by DEVS':
    'Cette extension a été vérifiée par DEVS',
  'This extension is developed by the DEVS team':
    "Cette extension est développée par l'équipe DEVS",
  'This extension has not been reviewed yet':
    "Cette extension n'a pas encore été examinée",
  'This extension is community-maintained':
    'Cette extension est maintenue par la communauté',

  // Hero Banner
  'Supercharge your AI workflows': 'Boostez vos workflows IA',
  'One-click install': 'Installation en un clic',
  'Community-driven': 'Porté par la communauté',
  '100% open source': '100% open source',
  'Build my own extension': 'Créer ma propre extension',

  // Translation Page
  Translation: 'Traduction',
  'Translate text using local AI': 'Traduire du texte avec une IA locale',
  'Source Language': 'Langue source',
  'Target Language': 'Langue cible',
  'Detected language: {lang}': 'Langue détectée : {lang}',
  'Type more text to detect language...':
    'Tapez plus de texte pour détecter la langue...',
  'Swap languages': 'Inverser les langues',
  'Enter text to translate': 'Entrez le texte à traduire',
  'Type or paste text here...': 'Tapez ou collez le texte ici...',
  'Translation will appear here...': 'La traduction apparaîtra ici...',
  'Copy translation': 'Copier la traduction',
  Translate: 'Traduire',
  'Translating...': 'Traduction en cours...',
  Clear: 'Effacer',
  'Translation failed. Please try again.':
    'La traduction a échoué. Veuillez réessayer.',

  // Extension Detail Modal
  'Extension type': 'Type d’extension',
  Copy: 'Copier',
  'Open in new tab': 'Ouvrir dans un nouvel onglet',
  'Privacy Policy': 'Politique de Confidentialité',
  // New Extension Page
  'Create Extension': 'Créer une extension',
  'Generate a custom extension using AI':
    "Générez une extension personnalisée avec l'IA",
  'Back to Marketplace': 'Retour au Marketplace',
  'Build with AI': "Construire avec l'IA",
  'Describe what you want to create and let AI generate a fully functional extension for you.':
    "Décrivez ce que vous voulez créer et laissez l'IA générer une extension entièrement fonctionnelle pour vous.",
  'Step 1': 'Étape 1',
  'Step 2': 'Étape 2',
  'Choose extension type': "Choisissez le type d'extension",
  'Describe your extension': 'Décrivez votre extension',
  App: 'Application',
  'Full UI applications with interactive pages':
    'Applications complètes avec pages interactives',
  'A pomodoro timer app, a habit tracker, a mood journal with charts':
    "Une application minuteur pomodoro, un suivi d'habitudes, un journal d'humeur avec graphiques",
  Agent: 'Agent',
  'AI agents with specialized instructions and personality':
    'Agents IA avec instructions spécialisées et personnalité',
  'A code reviewer agent, a writing coach, a data analysis specialist':
    "Un agent réviseur de code, un coach d'écriture, un spécialiste en analyse de données",
  Connector: 'Connecteur',
  'Integrations with external services and APIs':
    'Intégrations avec des services externes et des APIs',
  'A GitHub integration, a Slack connector, a weather data provider':
    'Une intégration GitHub, un connecteur Slack, un fournisseur de données météo',
  Tool: 'Outil',
  'Utility functions that agents can use':
    'Fonctions utilitaires que les agents peuvent utiliser',
  'A URL shortener, a JSON formatter, a unit converter, a calculator':
    "Un raccourcisseur d'URL, un formateur JSON, un convertisseur d'unités, une calculatrice",
  Examples: 'Exemples',
  'Describe what your extension should do, its features, and how it should look...':
    'Décrivez ce que votre extension doit faire, ses fonctionnalités et son apparence...',
  'Tips for better results': 'Conseils pour de meilleurs résultats',
  'Be specific about the features you want':
    'Soyez précis sur les fonctionnalités souhaitées',
  'Mention any UI preferences (colors, layout)':
    "Mentionnez vos préférences d'interface (couleurs, mise en page)",
  'Include example use cases': "Incluez des exemples de cas d'utilisation",
  'Describe the target users': 'Décrivez les utilisateurs cibles',
  'Please provide a description for your extension':
    'Veuillez fournir une description pour votre extension',
  'Failed to generate extension': "Échec de la génération de l'extension",
  'Extension created successfully!': 'Extension créée avec succès !',
  'Generate Extension': "Générer l'extension",
  'Generating...': 'Génération en cours...',
  'Creating your extension...': 'Création de votre extension...',
  'This may take a few seconds': 'Cela peut prendre quelques secondes',

  // Custom Extensions
  Custom: 'Personnalisée',
  'AI-generated': 'Générée par IA',
  'My extensions': 'Mes extensions',

  // Extension Editor Page
  'Edit and refine your extension': 'Modifier et améliorer votre extension',
  'Extension not found': 'Extension non trouvée',
  'Editor tabs': "Onglets de l'éditeur",
  Preview: 'Aperçu',
  Code: 'Code',
  Chat: 'Discussion',
  Save: 'Enregistrer',
  Done: 'Terminé',
  Unsaved: 'Non enregistré',
  'Extension saved': 'Extension enregistrée',
  'Failed to save extension': "Échec de l'enregistrement de l'extension",
  'Failed to load extension': "Échec du chargement de l'extension",
  'You have unsaved changes. Save before leaving?':
    'Vous avez des modifications non enregistrées. Enregistrer avant de partir ?',
  "Your extension has been created! You can preview it, edit the code directly, or describe changes you'd like me to make.":
    'Votre extension a été créée ! Vous pouvez la prévisualiser, modifier le code directement ou décrire les modifications que vous souhaitez que je fasse.',
  "Describe changes you'd like to make":
    'Décrivez les modifications que vous souhaitez apporter',
  'The AI will help you refine your extension':
    "L'IA vous aidera à améliorer votre extension",
  "Describe what you'd like to change...":
    'Décrivez ce que vous souhaitez modifier...',
  Send: 'Envoyer',
  'AI-suggested code changes are automatically applied':
    "Les modifications de code suggérées par l'IA sont appliquées automatiquement",
  'No LLM provider configured': 'Aucun fournisseur LLM configuré',
  'Unknown error': 'Erreur inconnue',
  'Sorry, I encountered an error: {error}':
    "Désolé, j'ai rencontré une erreur : {error}",
  'Code applied successfully!': 'Code appliqué avec succès !',
  'Code changes applied': 'Modifications du code appliquées',
  'Sorry, I encountered an error parsing the code changes.':
    "Désolé, j'ai rencontré une erreur lors de l'analyse des modifications de code.",

  // Delete extension
  'Delete extension': 'Supprimer l’extension',
  'Are you sure you want to delete this extension?':
    'Êtes-vous sûr de vouloir supprimer cette extension ?',
  'This action cannot be undone.': 'Cette action est irréversible.',
  // Duplicate extension
  'Duplicate & edit': 'Dupliquer et modifier',

  // Manual creation
  'or create manually': 'ou créer manuellement',
}
