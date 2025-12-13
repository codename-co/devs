import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const fr: I18n = {
  'Platform Settings': 'Paramètres de la plateforme',
  'Configure LLM providers, models and platform defaults for your organization':
    'Configurez les fournisseurs de LLM, les modèles et les paramètres par défaut de la plateforme pour votre organisation',
  Appearance: 'Apparence',
  'Choose your preferred language': 'Choisissez votre langue préférée',
  'Interface Language': 'Langue de l’interface',
  'Platform Name': 'Nom de la plateforme',
  'Secure Storage': 'Stockage sécurisé',
  'Manage your encryption keys and secure storage':
    'Gérez vos clés de chiffrement et votre stockage sécurisé',
  'Master Key': 'Clé maîtresse',
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
  'Choose your LLM provider, manage your API credentials':
    'Choisissez votre fournisseur LLM, gérez vos identifiants API',
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
  'Clear database': 'Effacer la base de données',
  'Are you sure you want to clear all data? This action cannot be undone.':
    'Êtes-vous sûr de vouloir effacer toutes les données ? Cette action ne peut pas être annulée.',
  'Database cleared successfully': 'Base de données effacée avec succès',
  'Failed to clear database': 'Échec de l’effacement de la base de données',
  'Database repaired successfully': 'Base de données réparée avec succès',
  'Failed to repair database': 'Échec de la réparation de la base de données',
  Created: 'Créé',
  Updated: 'Mis à jour',
  'Add LLM Provider': 'Ajouter un fournisseur LLM',
  'Select Provider': 'Sélectionner un fournisseur',
  'Server URL (Optional)': 'URL du serveur (Optionnel)',
  'API Key': 'Clé API',
  'Enter your API key': 'Entrez votre clé API',
  'Format:': 'Format :',
  'Base URL': 'URL de base',
  Model: 'Modèle',
  'Select a model': 'Sélectionnez un modèle',
  'Custom Model Name': 'Nom de modèle personnalisé',
  'Enter model name': 'Entrez le nom du modèle',
  'Validate & Add': 'Valider et ajouter',
  'Fetch Available Models': 'Récupérer les modèles disponibles',
  'Use Fetched Models': 'Utiliser les modèles récupérés',
  'Manual Input': 'Saisie manuelle',
  'Model Name': 'Nom du modèle',
  'Enter the exact name of the model you want to use':
    'Entrez le nom exact du modèle que vous souhaitez utiliser',
  'Available Models': 'Modèles disponibles',
  'Default Provider': 'Fournisseur par défaut',
  'Provider set as default': 'Fournisseur défini par défaut',
  'Advanced Settings': 'Paramètres avancés',
  '{files} files cached ({size})': '{files} fichiers mis en cache ({size})',
  'Local models cache': 'Cache de modèles locaux',
  'Clear cache': 'Vider le cache',
  'Downloaded models are cached for 1 year to avoid re-downloading.':
    'Les modèles téléchargés sont mis en cache pendant 1 an pour éviter le re-téléchargement.',
  'Local LLMs run entirely in your browser':
    'Les LLM locaux s’exécutent entièrement dans votre navigateur.',
  'No data is sent to external servers. Download happens at first use.':
    'Aucune donnée n’est envoyée à des serveurs tiers. Le téléchargement a lieu à la première utilisation.',
  'Requirements:': 'Exigences :',
  'WebGPU support': 'Support WebGPU',
  'At least 8GB of RAM': 'Au moins 8 Go de RAM',
  'Storage space for model files (2-4GB)':
    'Espace de stockage pour les fichiers de modèle (2-4 Go)',
  'Your device:': 'Votre appareil :',
  'WebGPU:': 'WebGPU :',
  'Brand: {brand}': 'Marque : {brand}',
  'Model: {model}': 'Modèle : {model}',
  'Memory: {memory} or more (imprecise)':
    'Mémoire : {memory} ou plus (imprécis)',
  'Vendor: {vendor}': 'Fournisseur : {vendor}',
  'Browser: {browser}': 'Navigateur : {browser}',
  'Enable Speech-to-Text': 'Activer la synthèse vocale',
  'Allow voice input using your device microphone in the prompt area':
    'Autoriser la saisie vocale en utilisant le microphone de votre appareil dans la zone de prompt',
  'Show Context Panel': 'Afficher le panneau contextuel',
  'Display the contextual information panel on the right side of the screen':
    'Afficher le panneau d\'informations contextuelles sur le côté droit de l\'écran',
  'Make the platform your own': 'Personnalisez la plateforme',
  'Share the platform': 'Partager la plateforme',
  'Export the platform settings to another device or share it with others':
    'Exportez les paramètres de la plateforme vers un autre appareil ou partagez-les avec d’autres',
} as const
