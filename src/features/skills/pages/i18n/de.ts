import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const de: I18n = {
  // Page
  'Agent Skills': 'Agent-Fähigkeiten',
  'Discover, install, and manage specialized skills for your agents':
    'Entdecken, installieren und verwalten Sie spezialisierte Fähigkeiten für Ihre Agenten',
  'Browse the SkillsMP registry of 227k+ Agent Skills':
    'Durchsuchen Sie das SkillsMP-Register mit über 227k Agent-Fähigkeiten',

  // Tabs
  Discover: 'Entdecken',
  Installed: 'Installiert',

  // Search
  'Search skills...': 'Fähigkeiten suchen...',
  'Search by keyword or describe what you need':
    'Nach Stichwort suchen oder beschreiben Sie, was Sie benötigen',
  Keyword: 'Stichwort',
  'AI Search': 'KI-Suche',
  'No skills found': 'Keine Fähigkeiten gefunden',
  'Try a different search query': 'Versuchen Sie eine andere Suchanfrage',
  'Searching...': 'Suche läuft...',

  // Skill Card
  'by {author}': 'von {author}',
  '{n} stars': '{n} Sterne',
  Install: 'Installieren',
  'Installing...': 'Wird installiert...',
  Uninstall: 'Deinstallieren',
  Enable: 'Aktivieren',
  Disable: 'Deaktivieren',
  'View Details': 'Details anzeigen',
  Python: 'Python',
  Bash: 'Bash',
  JavaScript: 'JavaScript',
  Scripts: 'Skripte',
  References: 'Referenzen',
  Assets: 'Ressourcen',
  Compatible: 'Kompatibel',
  Partial: 'Teilweise',

  // Skill Detail Modal
  'Skill Details': 'Fähigkeitsdetails',
  Instructions: 'Anweisungen',
  Files: 'Dateien',
  Settings: 'Einstellungen',
  Author: 'Autor',
  License: 'Lizenz',
  Stars: 'Sterne',
  Source: 'Quelle',
  'View on GitHub': 'Auf GitHub ansehen',
  'Installed on': 'Installiert am',
  'Last updated': 'Zuletzt aktualisiert',
  'Available Scripts': 'Verfügbare Skripte',
  'Reference Documents': 'Referenzdokumente',
  'Asset Files': 'Ressourcendateien',
  'Required Packages': 'Erforderliche Pakete',
  Language: 'Sprache',
  'No scripts included': 'Keine Skripte enthalten',
  'This skill provides instructions only':
    'Diese Fähigkeit bietet nur Anweisungen',
  'Assigned Agents': 'Zugewiesene Agenten',
  'All agents': 'Alle Agenten',
  'Select specific agents': 'Bestimmte Agenten auswählen',
  'Auto-activate': 'Automatische Aktivierung',
  'Always inject skill instructions':
    'Fähigkeitsanweisungen immer einfügen',
  'Confirm Uninstall': 'Deinstallation bestätigen',
  'Are you sure you want to uninstall this skill?':
    'Sind Sie sicher, dass Sie diese Fähigkeit deinstallieren möchten?',
  Cancel: 'Abbrechen',
  'Skill installed successfully': 'Fähigkeit erfolgreich installiert',
  'Skill uninstalled': 'Fähigkeit deinstalliert',
  'Failed to install skill': 'Fähigkeit konnte nicht installiert werden',
  'Failed to fetch skill from GitHub':
    'Fähigkeit konnte nicht von GitHub abgerufen werden',

  // Compatibility
  'Browser Compatible': 'Browser-kompatibel',
  'Can execute Python and JavaScript scripts in-browser':
    'Kann Python- und JavaScript-Skripte im Browser ausführen',
  'Partial Compatibility': 'Teilweise Kompatibilität',
  'Some scripts require system tools that can\'t run in-browser':
    'Einige Skripte erfordern Systemwerkzeuge, die im Browser nicht verfügbar sind',
  'Instructions Only': 'Nur Anweisungen',
  'Scripts are available for reference but can\'t execute in-browser':
    'Skripte sind als Referenz verfügbar, können aber nicht im Browser ausgeführt werden',

  // Execution
  'Run Script': 'Skript ausführen',
  'Running script…': 'Skript wird ausgeführt\u2026',
  'Initializing Python environment…': 'Python-Umgebung wird initialisiert\u2026',
  'Installing packages…': 'Pakete werden installiert\u2026',
  'Script executed successfully': 'Skript erfolgreich ausgeführt',
  'Script execution failed': 'Skriptausführung fehlgeschlagen',
  'Execution timed out': 'Ausführungs-Zeitlimit überschritten',
  'Confirm Script Execution': 'Skriptausführung bestätigen',
  'This script will run in a sandboxed Python environment.':
    'Dieses Skript wird in einer isolierten Python-Umgebung ausgeführt.',
  'Packages to install': 'Zu installierende Pakete',
  'Input files': 'Eingabedateien',
  'Estimated execution time': 'Geschätzte Ausführungszeit',
  Run: 'Ausführen',
  'Python Environment': 'Python-Umgebung',
  Ready: 'Bereit',
  'Loading…': 'Laden\u2026',
  'Not initialized': 'Nicht initialisiert',
  'Pre-warm Python': 'Python vorwärmen',
  'Download and initialize the Python environment in the background':
    'Python-Umgebung im Hintergrund herunterladen und initialisieren',
  'Incompatible package': 'Inkompatibles Paket',
  'This package may not work in the browser environment':
    'Dieses Paket funktioniert möglicherweise nicht in der Browser-Umgebung',

  // Try it out
  'Try it out': 'Ausprobieren',
  'Select script': 'Skript auswählen',
  'Arguments (JSON)': 'Argumente (JSON)',
  'Arguments must be a JSON object': 'Argumente müssen ein JSON-Objekt sein',
  'Invalid JSON': 'Ungültiges JSON',
  'No Python scripts available': 'Keine Python-Skripte verfügbar',
  'Only Python scripts can be executed in the sandbox': 'Nur Python-Skripte können in der Sandbox ausgeführt werden',
  'Pre-compiled in Pyodide': 'In Pyodide vorkompiliert',
  'Will be installed via micropip': 'Wird über micropip installiert',
  Done: 'Fertig',
  'Return value': 'Rückgabewert',
  Output: 'Ausgabe',
  Warnings: 'Warnungen',
  Error: 'Fehler',
  'Output files': 'Ausgabedateien',
  'packages installed': 'Pakete installiert',

  // Empty states
  'No skills installed': 'Keine Fähigkeiten installiert',
  'Search the SkillsMP registry to discover and install skills':
    'Durchsuchen Sie das SkillsMP-Register, um Fähigkeiten zu entdecken und zu installieren',
  'Your installed skills will appear here':
    'Ihre installierten Fähigkeiten werden hier angezeigt',
  'API key required': 'API-Schlüssel erforderlich',
  'Enter your SkillsMP API key in Settings to search for skills':
    'Geben Sie Ihren SkillsMP-API-Schlüssel in den Einstellungen ein, um nach Fähigkeiten zu suchen',
  // Manual URL install
  'Install from GitHub URL': 'Von GitHub-URL installieren',
  'Paste a GitHub URL to a skill directory or SKILL.md file':
    'Fügen Sie eine GitHub-URL zu einem Skill-Verzeichnis oder einer SKILL.md-Datei ein',
}
