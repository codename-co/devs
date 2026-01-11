/**
 * Battle Feature i18n
 *
 * Translations for the Battle Arena feature
 */
export const battleI18n = {
  en: [
    // Page title
    'Arena',
    'Battle Arena',
    'Agent vs Agent Competition',

    // General
    'agents',
    'Available Agents',
    'No available agents',

    // BattleSetup
    'Battle Setup',
    'Configure your agent battle',
    'Battle Topic',
    'Enter the topic for the debate...',
    'Enter the subject for debate...',
    'What should the agents debate about?',
    'Team A',
    'Team B',
    'Add Agent',
    'Remove',
    'Judge',
    'Select Judge',
    'Select Agent',
    'Teams must have the same number of agents',
    'Teams must have equal number of agents',
    'Select at least one agent per team',
    'Select a judge agent',
    'Enter a battle topic',
    'Judge Agent',
    'This agent will evaluate debates and determine winners',
    'Advanced settings',
    'Turns per Conversation',
    'Turns per conversation',
    'Number of message exchanges per match',
    'Custom Judging Criteria',
    'Custom judging criteria',
    'Optional: Add custom criteria for the judge...',
    'Additional instructions for the judge when evaluating debates',
    'Start Battle',

    // Battle progress
    'Round {n}',
    'Match {n}',
    'Turn {current} of {total}',
    'Waiting for response...',
    'Waiting for matches...',
    'Judging...',
    'In Progress',
    'Pending',
    'Completed',
    'Cancelled',
    'Match in progress...',
    'matches completed',
    'Next Round',

    // BattleBracket
    'No matches yet',
    'Champion',
    'Finals',
    'Round',

    // BattleMatch
    'Winner',
    'Turn',
    'of',
    'vs',
    'Conversation',
    'Match has not started yet',
    'No messages yet',
    'Judgment Scores',
    'Argument Quality',
    'Persuasiveness',
    'Creativity',
    'Responsiveness',
    'Total',
    'Total Score',
    "Judge's Reasoning",
    'Highlights',

    // BattleResults
    'Battle Complete',
    'Topic',
    'Final Standings',
    'Position',
    'Agent',
    'Wins',
    'Losses',
    'Match History',
    'View Conversation',
    'No completed matches',
    'View',
    'Share Results',
    'New Battle',
    'Finalist',
    'Semi-finalist',

    // Actions
    'Cancel Battle',
    'Continue',
    'Run Match',
    'Run All Matches',
    'Next Round',

    // Errors
    'Failed to create battle',
    'Failed to start battle',
    'Failed to run match',
    'Battle not found',

    // Status
    'pending',
    'in_progress',
    'judging',
    'completed',
  ] as const,

  fr: {
    // Page title
    Arena: 'Arène',
    'Battle Arena': 'Arène de Combat',
    'Agent vs Agent Competition': 'Compétition Agent contre Agent',

    // General
    agents: 'agents',
    'Available Agents': 'Agents disponibles',
    'No available agents': 'Aucun agent disponible',

    // BattleSetup
    'Battle Setup': 'Configuration du combat',
    'Configure your agent battle': "Configurez votre combat d'agents",
    'Battle Topic': 'Sujet du Combat',
    'Enter the topic for the debate...': 'Entrez le sujet du débat...',
    'Enter the subject for debate...': 'Entrez le sujet du débat...',
    'What should the agents debate about?':
      'De quoi les agents doivent-ils débattre ?',
    'Team A': 'Équipe A',
    'Team B': 'Équipe B',
    'Add Agent': 'Ajouter un Agent',
    Remove: 'Supprimer',
    Judge: 'Juge',
    'Select Judge': 'Sélectionner le Juge',
    'Select Agent': 'Sélectionner un Agent',
    'Teams must have the same number of agents':
      "Les équipes doivent avoir le même nombre d'agents",
    'Teams must have equal number of agents':
      "Les équipes doivent avoir le même nombre d'agents",
    'Select at least one agent per team':
      'Sélectionnez au moins un agent par équipe',
    'Select a judge agent': 'Sélectionnez un agent juge',
    'Enter a battle topic': 'Entrez un sujet de combat',
    'Judge Agent': 'Agent Juge',
    'This agent will evaluate debates and determine winners':
      'Cet agent évaluera les débats et déterminera les gagnants',
    'Advanced settings': 'Paramètres avancés',
    'Turns per Conversation': 'Tours par conversation',
    'Turns per conversation': 'Tours par conversation',
    'Number of message exchanges per match':
      "Nombre d'échanges de messages par match",
    'Custom Judging Criteria': 'Critères de jugement personnalisés',
    'Custom judging criteria': 'Critères de jugement personnalisés',
    'Optional: Add custom criteria for the judge...':
      'Optionnel: Ajoutez des critères personnalisés pour le juge...',
    'Additional instructions for the judge when evaluating debates':
      "Instructions supplémentaires pour le juge lors de l'évaluation des débats",
    'Start Battle': 'Démarrer le Combat',

    // Battle progress
    'Round {n}': 'Manche {n}',
    'Match {n}': 'Match {n}',
    'Turn {current} of {total}': 'Tour {current} sur {total}',
    'Waiting for matches...': 'En attente des matchs...',
    'Waiting for response...': 'En attente de réponse...',
    'Judging...': 'Jugement en cours...',
    'In Progress': 'En Cours',
    Pending: 'En Attente',
    Completed: 'Terminé',
    Cancelled: 'Annulé',
    'Match in progress...': 'Match en cours...',
    'matches completed': 'matchs terminés',

    // BattleBracket
    'No matches yet': 'Pas encore de matchs',
    Champion: 'Champion',
    Finals: 'Finale',
    Round: 'Tour',

    // BattleMatch
    Winner: 'Vainqueur',
    Turn: 'Tour',
    of: 'sur',
    vs: 'vs',
    Conversation: 'Conversation',
    'Match has not started yet': "Le match n'a pas encore commencé",
    'No messages yet': 'Pas encore de messages',
    'Judgment Scores': 'Scores du jugement',
    'Argument Quality': 'Qualité des Arguments',
    Persuasiveness: 'Persuasion',
    Creativity: 'Créativité',
    Responsiveness: 'Réactivité',
    Total: 'Total',
    'Total Score': 'Score Total',
    "Judge's Reasoning": 'Raisonnement du Juge',
    Highlights: 'Points Forts',

    // BattleResults
    'Battle Complete': 'Combat Terminé',
    Topic: 'Sujet',
    'Final Standings': 'Classement Final',
    Position: 'Position',
    Agent: 'Agent',
    Wins: 'Victoires',
    Losses: 'Défaites',
    'Match History': 'Historique des Matchs',
    'View Conversation': 'Voir la Conversation',
    'No completed matches': 'Aucun match terminé',
    View: 'Voir',
    'Share Results': 'Partager les Résultats',
    'New Battle': 'Nouveau Combat',
    Finalist: 'Finaliste',
    'Semi-finalist': 'Demi-finaliste',

    // Actions
    'Cancel Battle': 'Annuler le Combat',
    Continue: 'Continuer',
    'Run Match': 'Lancer le Match',
    'Run All Matches': 'Lancer Tous les Matchs',
    'Next Round': 'Prochaine Manche',

    // Errors
    'Failed to create battle': 'Échec de création du combat',
    'Failed to start battle': 'Échec du démarrage du combat',
    'Failed to run match': 'Échec du lancement du match',
    'Battle not found': 'Combat non trouvé',

    // Status
    pending: 'en attente',
    in_progress: 'en cours',
    judging: 'jugement',
    completed: 'terminé',
  },
} as const
