import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const de: I18n = {
  // Page titles
  Marketplace: 'Marketplace',
  'Expand your platform capabilities with community extensions':
    'Erweitern Sie die Funktionen Ihrer Plattform mit Community-Erweiterungen',
  'Find and install apps, agents, connectors, and tools from the community':
    'Finden und installieren Sie Apps, Agenten, Konnektoren und Tools aus der Community',

  // Tabs
  All: 'Alle',
  Apps: 'Apps',
  Agents: 'Agenten',
  Connectors: 'Konnektoren',
  Tools: 'Tools',
  Installed: 'Installiert',
  Available: 'Verfügbar',

  // Search
  'Search extensions...': 'Erweiterungen suchen...',
  'No description found': 'Keine Beschreibung gefunden',
  'Try a different search term': 'Versuchen Sie einen anderen Suchbegriff',

  // Categories
  Categories: 'Kategorien',
  Productivity: 'Produktivität',
  Development: 'Entwicklung',
  Communication: 'Kommunikation',
  'Data & Analytics': 'Daten & Analytik',
  'AI & Machine Learning': 'KI & Machine Learning',
  Utilities: 'Dienstprogramme',

  // Filters
  Filter: 'Filtern',
  'Sort by': 'Sortieren nach',
  'Most popular': 'Beliebteste',
  'Recently updated': 'Kürzlich aktualisiert',
  'Highest rated': 'Am besten bewertet',
  Newest: 'Neueste',
  Alphabetical: 'Alphabetisch',

  // Extension Card
  Install: 'Installieren',
  'Update available': 'Update verfügbar',
  Update: 'Aktualisieren',
  Uninstall: 'Deinstallieren',
  Configure: 'Konfigurieren',
  Enable: 'Aktivieren',
  Disable: 'Deaktivieren',
  Verified: 'Verifiziert',
  Official: 'Offiziell',
  Community: 'Community',
  '{n} downloads': '{n} Downloads',
  '{n} reviews': '{n} Bewertungen',
  Free: 'Kostenlos',
  Premium: 'Premium',

  // Extension Detail
  Overview: 'Übersicht',
  Reviews: 'Bewertungen',
  Changelog: 'Änderungsprotokoll',
  Documentation: 'Dokumentation',
  'Version {v}': 'Version {v}',
  'Last updated': 'Zuletzt aktualisiert',
  Author: 'Autor',
  License: 'Lizenz',
  Website: 'Website',
  'Report issue': 'Problem melden',
  'View source': 'Quellcode anzeigen',
  Permissions: 'Berechtigungen',
  'This extension requires:': 'Diese Erweiterung benötigt:',
  Dependencies: 'Abhängigkeiten',
  'Requires these extensions:': 'Benötigt diese Erweiterungen:',
  Screenshots: 'Screenshots',
  'Similar extensions': 'Ähnliche Erweiterungen',

  // Reviews
  'Write a review': 'Bewertung schreiben',
  Rating: 'Bewertung',
  'Your review': 'Ihre Bewertung',
  'Submit review': 'Bewertung absenden',
  Helpful: 'Hilfreich',
  '{n} people found this helpful': '{n} Personen fanden dies hilfreich',
  'Report review': 'Bewertung melden',

  // Install flow
  'Installing...': 'Wird installiert...',
  'Installation complete': 'Installation abgeschlossen',
  'Installation failed': 'Installation fehlgeschlagen',
  'This extension requires the following permissions:':
    'Diese Erweiterung benötigt folgende Berechtigungen:',
  Allow: 'Erlauben',
  Deny: 'Ablehnen',
  Cancel: 'Abbrechen',
  'Confirm installation': 'Installation bestätigen',

  // Publish
  'Publish Extension': 'Erweiterung veröffentlichen',
  'Share your extension with the community':
    'Teilen Sie Ihre Erweiterung mit der Community',
  'Create New Extension': 'Neue Erweiterung erstellen',
  'Upload Extension': 'Erweiterung hochladen',
  'Upload a .yaml or .devs file': 'Laden Sie eine .yaml oder .devs Datei hoch',
  'Drop your extension file here': 'Erweiterungsdatei hier ablegen',
  'Or browse files': 'Oder Dateien durchsuchen',
  Validate: 'Validieren',
  'Validating...': 'Wird validiert...',
  'Validation successful': 'Validierung erfolgreich',
  'Validation failed': 'Validierung fehlgeschlagen',
  'Fix the following issues:': 'Beheben Sie folgende Probleme:',
  Publish: 'Veröffentlichen',
  'Publishing...': 'Wird veröffentlicht...',
  'Published successfully': 'Erfolgreich veröffentlicht',
  'Publish failed': 'Veröffentlichung fehlgeschlagen',
  Draft: 'Entwurf',
  Published: 'Veröffentlicht',
  'Under review': 'In Prüfung',
  Rejected: 'Abgelehnt',
  Edit: 'Bearbeiten',
  Delete: 'Löschen',
  Unpublish: 'Veröffentlichung zurückziehen',
  'View in marketplace': 'Im Marketplace anzeigen',

  // Empty states
  'No extensions found': 'Keine Erweiterungen gefunden',
  'Be the first to publish an extension!':
    'Seien Sie der Erste, der eine Erweiterung veröffentlicht!',
  'No installed extensions': 'Keine installierten Erweiterungen',
  'Browse the marketplace to find useful extensions':
    'Durchsuchen Sie den Marketplace nach nützlichen Erweiterungen',
  'No apps available': 'Keine Apps verfügbar',
  'No agents available': 'Keine Agenten verfügbar',
  'No connectors available': 'Keine Konnektoren verfügbar',
  'No tools available': 'Keine Tools verfügbar',

  // Coming soon placeholder
  'Coming Soon': 'Demnächst verfügbar',
  'The DEVS Marketplace is under development':
    'Der DEVS Marketplace befindet sich in Entwicklung',
  "Soon you'll be able to discover and install community-built apps, agents, connectors, and tools.":
    'Bald können Sie von der Community erstellte Apps, Agenten, Konnektoren und Tools entdecken und installieren.',
  "Want to be notified when it's ready?":
    'Möchten Sie benachrichtigt werden, wenn es fertig ist?',
  'Join the waitlist': 'Warteliste beitreten',
  'Learn more about building extensions':
    'Mehr über das Erstellen von Erweiterungen erfahren',

  // Trust levels
  Unverified: 'Nicht verifiziert',
  'This extension has been reviewed and verified by DEVS':
    'Diese Erweiterung wurde von DEVS überprüft und verifiziert',
  'This extension is developed by the DEVS team':
    'Diese Erweiterung wird vom DEVS-Team entwickelt',
  'This extension has not been reviewed yet':
    'Diese Erweiterung wurde noch nicht überprüft',
  'This extension is community-maintained':
    'Diese Erweiterung wird von der Community gepflegt',

  // Translation Page
  Translation: 'Übersetzung',
  'Translate text using local AI': 'Text mit lokaler KI übersetzen',
  'Source Language': 'Ausgangssprache',
  'Target Language': 'Zielsprache',
  'Detected language: {lang}': 'Erkannte Sprache: {lang}',
  'Type more text to detect language...':
    'Geben Sie mehr Text ein, um die Sprache zu erkennen...',
  'Swap languages': 'Sprachen tauschen',
  'Enter text to translate': 'Text zum Übersetzen eingeben',
  'Type or paste text here...': 'Text hier eingeben oder einfügen...',
  'Translation will appear here...': 'Die Übersetzung erscheint hier...',
  'Copy translation': 'Übersetzung kopieren',
  Translate: 'Übersetzen',
  'Translating...': 'Übersetzung läuft...',
  Clear: 'Löschen',
  'Translation failed. Please try again.':
    'Übersetzung fehlgeschlagen. Bitte versuchen Sie es erneut.',

  // Extension Detail Modal
  'Extension type': 'Erweiterungstyp',
  Copy: 'Kopieren',
  'Open in new tab': 'In neuem Tab öffnen',
  'Privacy Policy': 'Datenschutzrichtlinie',

  // Hero Banner
  'Supercharge your AI workflows': 'Optimieren Sie Ihre KI-Workflows',
  'One-click install': 'Ein-Klick-Installation',
  'Community-driven': 'Von der Community betrieben',
  '100% open source': '100% Open Source',
  'Build my own extension': 'Erstellen Sie Ihre eigene Erweiterung',

  // New Extension Page
  'Create Extension': 'Erweiterung erstellen',
  'Generate a custom extension using AI':
    'Erstellen Sie eine benutzerdefinierte Erweiterung mit KI',
  'Back to Marketplace': 'Zurück zum Marketplace',
  'Build with AI': 'Mit KI erstellen',
  'Describe what you want to create and let AI generate a fully functional extension for you.':
    'Beschreiben Sie, was Sie erstellen möchten, und lassen Sie die KI eine voll funktionsfähige Erweiterung für Sie generieren.',
  'Step 1': 'Schritt 1',
  'Step 2': 'Schritt 2',
  'Choose extension type': 'Erweiterungstyp wählen',
  'Describe your extension': 'Beschreiben Sie Ihre Erweiterung',
  App: 'App',
  'Full UI applications with interactive pages':
    'Vollständige UI-Anwendungen mit interaktiven Seiten',
  'A pomodoro timer app, a habit tracker, a mood journal with charts':
    'Eine Pomodoro-Timer-App, ein Gewohnheitstracker, ein Stimmungstagebuch mit Diagrammen',
  Agent: 'Agent',
  'AI agents with specialized instructions and personality':
    'KI-Agenten mit spezialisierten Anweisungen und Persönlichkeit',
  'A code reviewer agent, a writing coach, a data analysis specialist':
    'Ein Code-Review-Agent, ein Schreibcoach, ein Datenanalyse-Spezialist',
  Connector: 'Konnektor',
  'Integrations with external services and APIs':
    'Integrationen mit externen Diensten und APIs',
  'A GitHub integration, a Slack connector, a weather data provider':
    'Eine GitHub-Integration, ein Slack-Konnektor, ein Wetterdatenanbieter',
  Tool: 'Tool',
  'Utility functions that agents can use':
    'Hilfsfunktionen, die Agenten nutzen können',
  'A URL shortener, a JSON formatter, a unit converter, a calculator':
    'Ein URL-Verkürzer, ein JSON-Formatierer, ein Einheitenkonverter, ein Taschenrechner',
  Examples: 'Beispiele',
  'Describe what your extension should do, its features, and how it should look...':
    'Beschreiben Sie, was Ihre Erweiterung tun soll, ihre Funktionen und wie sie aussehen soll...',
  'Tips for better results': 'Tipps für bessere Ergebnisse',
  'Be specific about the features you want':
    'Seien Sie spezifisch bei den gewünschten Funktionen',
  'Mention any UI preferences (colors, layout)':
    'Erwähnen Sie UI-Präferenzen (Farben, Layout)',
  'Include example use cases': 'Fügen Sie Beispielanwendungsfälle hinzu',
  'Describe the target users': 'Beschreiben Sie die Zielbenutzer',
  'Please provide a description for your extension':
    'Bitte geben Sie eine Beschreibung für Ihre Erweiterung an',
  'Failed to generate extension': 'Erweiterung konnte nicht generiert werden',
  'Extension created successfully!': 'Erweiterung erfolgreich erstellt!',
  'Generate Extension': 'Erweiterung generieren',
  'Generating...': 'Wird generiert...',
  'Creating your extension...': 'Ihre Erweiterung wird erstellt...',
  'This may take a few seconds': 'Dies kann einige Sekunden dauern',

  // Custom Extensions
  Custom: 'Benutzerdefiniert',
  'AI-generated': 'KI-generiert',
  'My extensions': 'Meine Erweiterungen',

  // Extension Editor Page
  'Edit and refine your extension':
    'Ihre Erweiterung bearbeiten und verfeinern',
  'Extension not found': 'Erweiterung nicht gefunden',
  'Editor tabs': 'Editor-Tabs',
  Preview: 'Vorschau',
  Code: 'Code',
  Chat: 'Chat',
  Save: 'Speichern',
  Done: 'Fertig',
  Unsaved: 'Nicht gespeichert',
  'Extension saved': 'Erweiterung gespeichert',
  'Failed to save extension': 'Erweiterung konnte nicht gespeichert werden',
  'Failed to load extension': 'Erweiterung konnte nicht geladen werden',
  'You have unsaved changes. Save before leaving?':
    'Sie haben nicht gespeicherte Änderungen. Vor dem Verlassen speichern?',
  "Your extension has been created! You can preview it, edit the code directly, or describe changes you'd like me to make.":
    'Ihre Erweiterung wurde erstellt! Sie können sie in der Vorschau anzeigen, den Code direkt bearbeiten oder Änderungen beschreiben, die ich vornehmen soll.',
  "Describe changes you'd like to make":
    'Beschreiben Sie die gewünschten Änderungen',
  'The AI will help you refine your extension':
    'Die KI hilft Ihnen, Ihre Erweiterung zu verfeinern',
  "Describe what you'd like to change...":
    'Beschreiben Sie, was Sie ändern möchten...',
  Send: 'Senden',
  'AI-suggested code changes are automatically applied':
    'KI-vorgeschlagene Code-Änderungen werden automatisch angewendet',
  'No LLM provider configured': 'Kein LLM-Anbieter konfiguriert',
  'Unknown error': 'Unbekannter Fehler',
  'Sorry, I encountered an error: {error}':
    'Entschuldigung, ein Fehler ist aufgetreten: {error}',
  'Code applied successfully!': 'Code erfolgreich angewendet!',
  'Code changes applied': 'Codeänderungen angewendet',
  'Sorry, I encountered an error parsing the code changes.':
    'Entschuldigung, beim Parsen der Codeänderungen ist ein Fehler aufgetreten.',

  // Delete extension
  'Delete extension': 'Erweiterung löschen',
  'Are you sure you want to delete this extension?':
    'Sind Sie sicher, dass Sie diese Erweiterung löschen möchten?',
  'This action cannot be undone.':
    'Diese Aktion kann nicht rückgängig gemacht werden.',

  // Duplicate extension
  'Duplicate & edit': 'Duplizieren und bearbeiten',

  // Manual creation
  'or create manually': 'oder manuell erstellen',
}
