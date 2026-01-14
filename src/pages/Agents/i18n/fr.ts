import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const fr: I18n = {
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
  Model: 'Modèle',
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
  Current: 'Actuelle', // current conversation
  'No conversation history yet. Start chatting with this agent to build history.':
    "Pas d'historique de conversation pour le moment. Commencez à discuter avec cet agent pour créer un historique.",
  'No instructions defined.': 'Aucune instruction définie.',
  '{count} messages': '{count} messages',
  Edit: 'Modifier',
  Save: 'Enregistrer',
  Cancel: 'Annuler',
  'Edit System Prompt': 'Modifier le prompt système',
  'System prompt updated successfully': 'Prompt système mis à jour avec succès',
  'Enter agent role...': "Entrez le rôle de l'agent...",
  'Enter agent instructions...': "Entrez les instructions de l'agent...",
  // Agent Context panel (unified Knowledge, Memories, Pinned)
  'Agent Context': "Contexte de l'agent",
  Files: 'Fichiers',
  Memories: 'Mémoires',
  Messages: 'Messages',
  'Knowledge items updated successfully':
    'Éléments de connaissances mis à jour avec succès',
  'Failed to update knowledge items':
    'Échec de la mise à jour des éléments de connaissances',
  'Search knowledge items…': 'Rechercher des éléments de connaissances…',
  'No knowledge items found.': 'Aucun élément de connaissance trouvé.',
  'Add files to your knowledge base':
    'Ajouter des fichiers à votre base de connaissances',
  '{count} selected': '{count} sélectionné(s)',
  'No knowledge items associated with this agent.':
    'Aucun élément de connaissance associé à cet agent.',
  'Add knowledge': 'Ajouter des connaissances',
  'No memories learned yet. Start conversations and use "Learn from conversation" to build agent memory.':
    'Aucune mémoire apprise. Commencez des conversations et utilisez "Apprendre de la conversation" pour construire la mémoire de l\'agent.',
  'No pinned messages yet. Pin important messages from conversations to make them available here.':
    'Épinglez des messages importants des conversations pour les rendre disponibles ici.',
  'Start Live Conversation': 'Démarrer une conversation live',
  // Meta-prompting
  'Creation mode': 'Mode de création',
  'Describe Your Agent': 'Décrivez votre agent',
  'Manual Configuration': 'Configuration manuelle',
  "Tell us what kind of agent you want, and we'll create it for you.":
    "Dites-nous quel type d'agent vous souhaitez, et nous le créerons pour vous.",
  'What agent do you need?': 'De quel agent avez-vous besoin ?',
  'e.g., A friendly cooking assistant who specializes in Italian cuisine and can suggest wine pairings...':
    'ex., Un assistant culinaire sympathique spécialisé dans la cuisine italienne qui peut suggérer des accords mets-vins...',
  'Describe the agent you want to create. Be as specific as you like!':
    "Décrivez l'agent que vous souhaitez créer. Soyez aussi précis que vous le souhaitez !",
  'Generating agent...': "Génération de l'agent...",
  'Generate Agent': "Générer l'agent",
  'Generating...': 'Génération...',
  'Or configure manually': 'Ou configurer manuellement',
  'No LLM provider configured. Please configure one in Settings.':
    'Aucun fournisseur LLM configuré. Veuillez en configurer un dans les Paramètres.',
  'Failed to generate agent configuration. Please try again.':
    "Échec de la génération de la configuration de l'agent. Veuillez réessayer.",
  'Generated configuration is missing required fields.':
    'La configuration générée est incomplète.',
  Tools: 'Outils',
  'No tools enabled for this agent.': 'Aucun outil activé pour cet agent.',
  'Knowledge search': 'Recherche de connaissances',
  // Trace/Tool display
  Duration: 'Durée',
  Tokens: 'Tokens',
  'Loading…': 'Chargement…',
  'Processing step': 'Étape de traitement',
  'Processing Details': 'Détails du traitement',
  Status: 'Statut',
  Cost: 'Coût',
  Input: 'Entrée',
  Output: 'Sortie',
  Steps: 'Étapes',
  'Trace not found': 'Trace non trouvée',
  Close: 'Fermer',
  'View details': 'Voir les détails',
  'View trace details': 'Voir les détails de la trace',
  Error: 'Erreur',
  'View document': 'Voir le document',
  // Tool display names
  'Searching knowledge base': 'Recherche dans la base de connaissances',
  'Reading document': 'Lecture du document',
  'Browsing documents': 'Parcours des documents',
  'Summarizing document': 'Résumé du document',
  Calculating: 'Calcul',
  'Code interpreter': 'Interpréteur de code',
  'Failed to generate agent. Please try again.':
    "Échec de la génération de l'agent. Veuillez réessayer.",
  // Tool labels
  'Search Knowledge': 'Rechercher',
  'Read Document': 'Lire un document',
  'List Documents': 'Lister les documents',
  'Get Document Summary': 'Résumer un document',
  Calculate: 'Calculer',
  // Search results
  result: 'résultat',
  results: 'résultats',
} as const
