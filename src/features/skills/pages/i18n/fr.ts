import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const fr: I18n = {
  // Page
  'Agent Skills': 'Compétences d\u2019Agent',
  'Discover, install, and manage specialized skills for your agents':
    'Découvrez, installez et gérez des compétences spécialisées pour vos agents',
  'Browse the SkillsMP registry of 227k+ Agent Skills':
    'Parcourez le registre SkillsMP de plus de 227k compétences',

  // Tabs
  Discover: 'Découvrir',
  Installed: 'Installées',

  // Search
  'Search skills...': 'Rechercher des compétences...',
  'Search by keyword or describe what you need':
    'Rechercher par mot-clé ou décrivez ce dont vous avez besoin',
  Keyword: 'Mot-clé',
  'AI Search': 'Recherche IA',
  'No skills found': 'Aucune compétence trouvée',
  'Try a different search query': 'Essayez une requête différente',
  'Searching...': 'Recherche en cours...',

  // Skill Card
  'by {author}': 'par {author}',
  '{n} stars': '{n} étoiles',
  Install: 'Installer',
  'Installing...': 'Installation...',
  Uninstall: 'Désinstaller',
  Enable: 'Activer',
  Disable: 'Désactiver',
  'View Details': 'Voir les détails',
  Python: 'Python',
  Bash: 'Bash',
  JavaScript: 'JavaScript',
  Scripts: 'Scripts',
  References: 'Références',
  Assets: 'Ressources',
  Compatible: 'Compatible',
  Partial: 'Partiel',

  // Skill Detail Modal
  'Skill Details': 'Détails de la compétence',
  Instructions: 'Instructions',
  Files: 'Fichiers',
  Settings: 'Paramètres',
  Author: 'Auteur',
  License: 'Licence',
  Stars: 'Étoiles',
  Source: 'Source',
  'View on GitHub': 'Voir sur GitHub',
  'Installed on': 'Installée le',
  'Last updated': 'Dernière mise à jour',
  'Available Scripts': 'Scripts disponibles',
  'Reference Documents': 'Documents de référence',
  'Asset Files': 'Fichiers de ressources',
  'Required Packages': 'Paquets requis',
  Language: 'Langage',
  'No scripts included': 'Aucun script inclus',
  'This skill provides instructions only':
    'Cette compétence fournit uniquement des instructions',
  'Assigned Agents': 'Agents assignés',
  'All agents': 'Tous les agents',
  'Select specific agents': 'Sélectionner des agents spécifiques',
  'Auto-activate': 'Activation automatique',
  'Always inject skill instructions':
    'Toujours injecter les instructions de la compétence',
  'Confirm Uninstall': 'Confirmer la désinstallation',
  'Are you sure you want to uninstall this skill?':
    'Êtes-vous sûr de vouloir désinstaller cette compétence ?',
  Cancel: 'Annuler',
  'Skill installed successfully': 'Compétence installée avec succès',
  'Skill uninstalled': 'Compétence désinstallée',
  'Failed to install skill': 'Échec de l\u2019installation de la compétence',
  'Failed to fetch skill from GitHub':
    'Échec de la récupération de la compétence depuis GitHub',

  // Compatibility
  'Browser Compatible': 'Compatible navigateur',
  'Can execute Python and JavaScript scripts in-browser':
    'Peut exécuter des scripts Python et JavaScript dans le navigateur',
  'Partial Compatibility': 'Compatibilité partielle',
  'Some scripts require system tools that can\'t run in-browser':
    'Certains scripts nécessitent des outils système non disponibles dans le navigateur',
  'Instructions Only': 'Instructions uniquement',
  'Scripts are available for reference but can\'t execute in-browser':
    'Les scripts sont disponibles en référence mais ne peuvent pas s\u2019exécuter dans le navigateur',

  // Execution
  'Run Script': 'Exécuter le script',
  'Running script…': 'Exécution du script\u2026',
  'Initializing Python environment…': 'Initialisation de l\u2019environnement Python\u2026',
  'Installing packages…': 'Installation des paquets\u2026',
  'Script executed successfully': 'Script exécuté avec succès',
  'Script execution failed': 'Échec de l\u2019exécution du script',
  'Execution timed out': 'Délai d\u2019exécution dépassé',
  'Confirm Script Execution': 'Confirmer l\u2019exécution du script',
  'This script will run in a sandboxed Python environment.':
    'Ce script s\u2019exécutera dans un environnement Python isolé.',
  'Packages to install': 'Paquets à installer',
  'Input files': 'Fichiers d\u2019entrée',
  'Estimated execution time': 'Temps d\u2019exécution estimé',
  Run: 'Exécuter',
  'Python Environment': 'Environnement Python',
  Ready: 'Prêt',
  'Loading…': 'Chargement\u2026',
  'Not initialized': 'Non initialisé',
  'Pre-warm Python': 'Préchauffer Python',
  'Download and initialize the Python environment in the background':
    'Télécharger et initialiser l\u2019environnement Python en arrière-plan',
  'Incompatible package': 'Paquet incompatible',
  'This package may not work in the browser environment':
    'Ce paquet pourrait ne pas fonctionner dans l\u2019environnement navigateur',

  // Try it out
  'Try it out': 'Essayer',
  'Select script': 'Sélectionner un script',
  'Arguments (JSON)': 'Arguments (JSON)',
  'Arguments must be a JSON object': 'Les arguments doivent être un objet JSON',
  'Invalid JSON': 'JSON invalide',
  'No Python scripts available': 'Aucun script Python disponible',
  'Only Python scripts can be executed in the sandbox': 'Seuls les scripts Python peuvent être exécutés dans le bac à sable',
  'Pre-compiled in Pyodide': 'Précompilé dans Pyodide',
  'Will be installed via micropip': 'Sera installé via micropip',
  Done: 'Terminé',
  'Return value': 'Valeur de retour',
  Output: 'Sortie',
  Warnings: 'Avertissements',
  Error: 'Erreur',
  'Output files': 'Fichiers de sortie',
  'packages installed': 'paquets installés',

  // Empty states
  'No skills installed': 'Aucune compétence installée',
  'Search the SkillsMP registry to discover and install skills':
    'Recherchez dans le registre SkillsMP pour découvrir et installer des compétences',
  'Your installed skills will appear here':
    'Vos compétences installées apparaîtront ici',
  'API key required': 'Clé API requise',
  'Enter your SkillsMP API key in Settings to search for skills':
    'Entrez votre clé API SkillsMP dans les Paramètres pour rechercher des compétences',
  // Manual URL install
  'Install from GitHub URL': 'Installer depuis une URL GitHub',
  'Paste a GitHub URL to a skill directory or SKILL.md file':
    'Collez une URL GitHub vers un répertoire de compétence ou un fichier SKILL.md',
}
