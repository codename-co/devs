import type { I18n } from '@/i18n/locales'

export const de: I18n = {
  // AgentPicker
  'Available Agents': 'Verfügbare Agenten',
  Scientists: 'Wissenschaftler',
  Advisors: 'Berater',
  Artists: 'Künstler',
  Philosophers: 'Philosophen',
  Musicians: 'Musiker',
  Developers: 'Entwickler',
  Writers: 'Schriftsteller',
  'Other Agents': 'Weitere Agenten',

  // AppDrawer
  'Expand sidebar': 'Seitenleiste erweitern',
  'Collapse sidebar': 'Seitenleiste einklappen',
  'New Task': 'Neue Aufgabe',
  'New Team': 'Neues Team',
  Tasks: 'Aufgaben',
  Teams: 'Teams',
  Settings: 'Einstellungen',
  Agents: 'Agenten',
  'Create and manage your AI specialists':
    'Erstellen und verwalten Sie Ihre KI-Spezialisten',
  Methodologies: 'Methodiken',
  Conversations: 'Unterhaltungen',
  'Conversations history': 'Verlauf der Unterhaltungen',
  'Search conversations': 'Unterhaltungen suchen',
  'Pin conversation': 'Unterhaltung anheften',
  'Unpin conversation': 'Unterhaltung lösen',
  'Summarize conversation': 'Unterhaltung zusammenfassen',
  'Pin it': 'Anheften',
  'Unpin it': 'Lösen',
  Pinned: 'Angeheftete',
  'Message description': 'Nachrichtenbeschreibung',
  'Edit description': 'Beschreibung bearbeiten',
  'View full conversation': 'Gesamte Unterhaltung anzeigen',
  'Generating description...': 'Beschreibung wird generiert...',
  'Generating summary...': 'Zusammenfassung wird generiert...',
  'No pinned messages yet': 'Noch keine angehefteten Nachrichten',
  'Show pinned only': 'Nur angeheftete anzeigen',
  'Pinned conversations': 'Angeheftete Unterhaltungen',
  Knowledge: 'Wissen',
  Connectors: 'Konnektoren',
  'New chat': 'Neuer Chat',
  AGENTS: 'AGENTEN',
  CONVERSATIONS: 'UNTERHALTUNGEN',
  'View all agents': 'Alle Agenten anzeigen',
  'View all history': 'Gesamten Verlauf anzeigen',
  Chat: 'Chat',
  'Main navigation': 'Hauptnavigation',
  'New Agent': 'Neuer Agent',
  'New Methodology': 'Neue Methodik',
  'Upgrade to Pro': 'Auf Pro upgraden',
  'Quick Actions': 'Schnellaktionen',
  'Toggle Theme': 'Design umschalten',
  Theme: 'Design',
  System: 'System',
  Light: 'Hell',
  Dark: 'Dunkel',
  About: 'Über',
  Language: 'Sprache',

  // PromptArea
  'Need something done?': 'Benötigen Sie etwas?',
  'More actions': 'Weitere Aktionen',
  'Attach a file or image': 'Datei oder Bild anhängen',
  'Upload new file': 'Neue Datei hochladen',
  'Choose from knowledge base': 'Aus Wissensdatenbank auswählen',
  'Drop files here…': 'Dateien hier ablegen…',
  'Speak to microphone': 'Ins Mikrofon sprechen',
  'Send prompt': 'Prompt senden',
  'Select an agent': 'Agent auswählen',
  'No agents found': 'Keine Agenten gefunden',
  'Select a model': 'Modell auswählen',
  'Add a model': 'Modell hinzufügen',

  // Service worker
  'New features are waiting': 'Neue Funktionen warten',
  '{product} v{version} is ready to be installed.':
    '{product} v{version} ist bereit zur Installation.',
  Upgrade: 'Aktualisieren',

  // Page: /404
  'Page not found': 'Seite nicht gefunden',

  // LLM Integration
  'No LLM provider configured. Please [configure one in Settings]({path}).':
    'Kein LLM-Anbieter konfiguriert. Bitte [konfigurieren Sie einen in den Einstellungen]({path}).',

  // MarkdownRenderer
  'Thinking…': 'Denkt nach…',
  Thoughts: 'Gedanken',

  // AgentsPage
  'My Agents': 'Meine Agenten',
  'Built-in Agents': 'Integrierte Agenten',
  'Built-in agents are pre-configured agents that come with the platform. They showcase various capabilities and can serve as inspiration for your own custom agents.':
    'Integrierte Agenten sind vorkonfigurierte Agenten, die mit der Plattform geliefert werden. Sie zeigen verschiedene Fähigkeiten und können als Inspiration für Ihre eigenen benutzerdefinierten Agenten dienen.',

  // AgentRunPage
  'Find your past conversations': 'Finden Sie Ihre vergangenen Unterhaltungen',
  'Loading agent and conversation…': 'Lade Agent und Unterhaltung…',
  Back: 'Zurück',
  'Conversation ID:': 'Unterhaltungs-ID:',
  You: 'Sie',
  'Continue the conversation…': 'Unterhaltung fortsetzen…',
  'Start chatting with {agentName}…':
    'Beginnen Sie mit {agentName} zu chatten…',
  'this agent': 'diesem Agenten',
  'System Prompt': 'System-Prompt',
  'No system prompt defined.': 'Kein System-Prompt definiert.',
  Memories: 'Erinnerungen',
  Global: 'Global',
  'No memories learned yet. Start conversations and use "Learn from conversation" to build agent memory.':
    'Noch keine Erinnerungen gelernt. Beginnen Sie Gespräche und verwenden Sie „Aus Gespräch lernen", um das Agentengedächtnis aufzubauen.',
  'Make Global': 'Global machen',
  'Remove Global': 'Global entfernen',
  'Agent Context': 'Agentenkontext',

  // Artifacts side panel
  Artifacts: 'Artefakte',
  'No artifacts created yet': 'Noch keine Artefakte erstellt',

  // Task
  Requirements: 'Anforderungen',
  'Task Timeline': 'Aufgaben-Zeitachse',
  'Active Agents': 'Aktive Agenten',

  // Background Image
  'Please select an image file': 'Bitte wählen Sie eine Bilddatei',
  'Image file is too large. Please select a file smaller than {size}MB.':
    'Bilddatei ist zu groß. Bitte wählen Sie eine Datei kleiner als {size} MB.',
  'Background image updated': 'Hintergrundbild aktualisiert',
  'Failed to process image file': 'Bilddatei konnte nicht verarbeitet werden',
  'Please drop an image file': 'Bitte legen Sie eine Bilddatei ab',
  'Drop your image here': 'Legen Sie Ihr Bild hier ab',
  'Release to set as background': 'Loslassen, um als Hintergrund festzulegen',
  'Background Image': 'Hintergrundbild',
  'Set a custom background image for the home page':
    'Ein benutzerdefiniertes Hintergrundbild für die Startseite festlegen',
  'Change Background': 'Hintergrund ändern',
  'Upload Background': 'Hintergrund hochladen',
  'Background image removed': 'Hintergrundbild entfernt',
  'Make the platform your own': 'Machen Sie die Plattform zu Ihrer eigenen',
  Undo: 'Rückgängig',
  'The URL does not point to a valid image':
    'Die URL verweist nicht auf ein gültiges Bild',
  'Failed to load image from URL. Please check the URL and try again.':
    'Bild konnte nicht von URL geladen werden. Bitte überprüfen Sie die URL und versuchen Sie es erneut.',
  'Please drop an image file or drag an image from a website':
    'Bitte legen Sie eine Bilddatei ab oder ziehen Sie ein Bild von einer Website',

  // About Page
  'AI Teams': 'KI-Teams',
  'Multiple AI agents working together on complex tasks.':
    'Mehrere KI-Agenten arbeiten gemeinsam an komplexen Aufgaben.',
  'LLM Independent': 'LLM-unabhängig',
  'Works with OpenAI, Anthropic, Google Gemini, and more':
    'Funktioniert mit OpenAI, Anthropic, Google Gemini und mehr',
  'Privacy First': 'Datenschutz zuerst',
  'All data stays on your device. No servers, no tracking.':
    'Alle Daten bleiben auf Ihrem Gerät. Keine Server, kein Tracking.',
  'Browser Native': 'Browser-nativ',
  'Works entirely in your browser. No installation required.':
    'Funktioniert vollständig in Ihrem Browser. Keine Installation erforderlich.',
  'Offline Ready': 'Offline-fähig',
  'Works without internet after initial load.':
    'Funktioniert nach dem ersten Laden ohne Internet.',
  'Open Source': 'Open Source',
  '{license} licensed. Built by the community, for the community.':
    'Unter {license}-Lizenz. Von der Community für die Community entwickelt.',
  'Configure your LLM provider': 'Konfigurieren Sie Ihren LLM-Anbieter',
  'Describe your task': 'Beschreiben Sie Ihre Aufgabe',
  'Be as detailed as possible to get the best results':
    'Seien Sie so detailliert wie möglich, um die besten Ergebnisse zu erzielen',
  'Watch AI agents collaborate':
    'Beobachten Sie KI-Agenten bei der Zusammenarbeit',
  'See how different agents work together to complete your task':
    'Sehen Sie, wie verschiedene Agenten zusammenarbeiten, um Ihre Aufgabe zu erledigen',
  'Guide when needed': 'Lenken Sie bei Bedarf',
  'Provide feedback and guidance to the agents as they work':
    'Geben Sie den Agenten während ihrer Arbeit Feedback und Anleitung',
  'Our Vision': 'Unsere Vision',
  "Democratize AI agent delegation with a universally accessible, privacy-conscious, open-source solution that runs entirely in the browser. AI augmentation isn't a luxury for the few, but a fundamental tool available to all.":
    'Demokratisierung der KI-Agenten-Delegation mit einer universell zugänglichen, datenschutzbewussten Open-Source-Lösung, die vollständig im Browser läuft. KI-Erweiterung ist kein Luxus für wenige, sondern ein grundlegendes Werkzeug für alle.',
  'Key Features': 'Hauptfunktionen',
  'Key Benefits': 'Hauptvorteile',
  'How It Works': 'Wie es funktioniert',
  FAQ: 'FAQ',
  'Is my data private?': 'Sind meine Daten privat?',
  'Yes! All data processing happens locally in your browser. We do not collect or store any of your data.':
    'Ja! Die gesamte Datenverarbeitung erfolgt lokal in Ihrem Browser. Wir sammeln oder speichern keine Ihrer Daten.',
  'Which LLM providers are supported?':
    'Welche LLM-Anbieter werden unterstützt?',
  'We support {llmList}, and any provider compatible with the OpenAI API spec.':
    'Wir unterstützen {llmList} und alle Anbieter, die mit der OpenAI-API-Spezifikation kompatibel sind.',
  'Do I need to install anything?': 'Muss ich etwas installieren?',
  'No installation is required. The app runs entirely in your web browser.':
    'Es ist keine Installation erforderlich. Die App läuft vollständig in Ihrem Webbrowser.',
  'Is this open source?': 'Ist dies Open Source?',
  'Yes! The project is open source and available on GitHub under the {license} license.':
    'Ja! Das Projekt ist Open Source und auf GitHub unter der {license}-Lizenz verfügbar.',
  'View on GitHub': 'Auf GitHub ansehen',

  // Tasks Page
  'Manage and monitor tasks for your organization':
    'Aufgaben für Ihre Organisation verwalten und überwachen',
  'Loading tasks…': 'Lade Aufgaben…',
  tasks: 'Aufgaben',
  'In Progress': 'In Bearbeitung',

  // Task Page
  'Task Details': 'Aufgabendetails',
  'Task Created': 'Aufgabe erstellt',
  'Agent Assigned': 'Agent zugewiesen',
  'Artifact Created': 'Artefakt erstellt',
  'User Message': 'Benutzernachricht',
  'Agent Response': 'Agenten-Antwort',
  'Requirement Satisfied': 'Anforderung erfüllt',
  'Task Completed': 'Aufgabe abgeschlossen',
  'Task Branched': 'Aufgabe verzweigt',
  'Sub-task Created': 'Unteraufgabe erstellt',
  'Sub-task Completed': 'Unteraufgabe abgeschlossen',
  'Requirement Detected': 'Anforderung erkannt',
  'Requirement Validated': 'Anforderung validiert',
  'Task Started': 'Aufgabe gestartet',
  'Methodology Selected': 'Methodik ausgewählt',
  'Phase Started': 'Phase gestartet',
  'Phase Completed': 'Phase abgeschlossen',
  'Team Built': 'Team zusammengestellt',
  'Role Assigned': 'Rolle zugewiesen',
  'All requirements satisfied': 'Alle Anforderungen erfüllt',
  'No task ID provided': 'Keine Aufgaben-ID angegeben',
  'Task not found': 'Aufgabe nicht gefunden',
  'Failed to load task data': 'Aufgabendaten konnten nicht geladen werden',
  'View Content': 'Inhalt anzeigen',
  'Loading task details…': 'Lade Aufgabendetails…',
  'Task Not Found': 'Aufgabe nicht gefunden',
  'The requested task could not be found.':
    'Die angeforderte Aufgabe konnte nicht gefunden werden.',
  'Task Steps': 'Aufgabenschritte',
  'Validation Criteria': 'Validierungskriterien',

  // SubTaskTree Component
  'Task Hierarchy': 'Aufgabenhierarchie',
  'Expand All': 'Alle erweitern',
  'Collapse All': 'Alle einklappen',
  'Parent Task': 'Übergeordnete Aufgabe',
  'Sibling Tasks': 'Geschwisteraufgaben',
  'Current Task & Sub-tasks': 'Aktuelle Aufgabe und Unteraufgaben',
  'Main Task & Sub-tasks': 'Hauptaufgabe und Unteraufgaben',
  'Task Dependencies': 'Aufgabenabhängigkeiten',
  'Total Sub-tasks': 'Unteraufgaben insgesamt',

  // Common actions
  Retry: 'Wiederholen',
  Refresh: 'Aktualisieren',
  Close: 'Schließen',
  Edit: 'Bearbeiten',
  Delete: 'Löschen',
  Save: 'Speichern',
  Remove: 'Entfernen',
  Cancel: 'Abbrechen',
  Export: 'Exportieren',
  'Copy to clipboard': 'In Zwischenablage kopieren',
  Download: 'Herunterladen',

  // Database Administration
  'Loading database information…': 'Lade Datenbankinformationen…',
  'Failed to load database information':
    'Datenbankinformationen konnten nicht geladen werden',
  'Database Administration': 'Datenbankverwaltung',
  'Reset Database': 'Datenbank zurücksetzen',
  '{n} records': '{n} Einträge',
  Records: 'Einträge',
  Indexes: 'Indizes',
  Size: 'Größe',
  'Search {store} by {categories}…': 'Suche {store} nach {categories}…',
  'All Records': 'Alle Einträge',
  'Filtered Records': 'Gefilterte Einträge',
  ID: 'ID',
  Preview: 'Vorschau',
  Actions: 'Aktionen',
  View: 'Anzeigen',
  'No data recorded': 'Keine Daten aufgezeichnet',
  'Record Details': 'Eintragsdetails',

  // Searchable collections & indexes
  agents: 'Agenten',
  conversations: 'Unterhaltungen',
  knowledgeItems: 'Wissenselemente',
  folderWatchers: 'synchronisierte Ordner',
  credentials: 'Anmeldedaten',
  artifacts: 'Artefakte',
  // tasks: 'Aufgaben',
  contexts: 'Kontexte',
  langfuse_config: 'Langfuse-Konfiguration',
  id: 'ID',
  name: 'Name',
  description: 'Beschreibung',
  role: 'Rolle',
  tags: 'Tags',
  size: 'Größe',
  type: 'Typ',
  createdAt: 'Erstellungsdatum',
  fileType: 'Dateityp',
  content: 'Inhalt',
  contentHash: 'Inhalts-Hash',
  path: 'Pfad',
  provider: 'Anbieter',
  model: 'Modell',
  encryptedApiKey: 'verschlüsselter API-Schlüssel',
  baseUrl: 'Basis-URL',
  timestamp: 'Zeitstempel',
  order: 'Reihenfolge',
  mimeType: 'MIME-Typ',
  lastModified: 'Zuletzt geändert',
  syncSource: 'Synchronisationsquelle',
  lastSyncCheck: 'Letzte Synchronisierung',

  // Sharing
  'Share the platform': 'Plattform teilen',
  'Export the platform settings to another device or share it with others':
    'Exportieren Sie die Plattformeinstellungen auf ein anderes Gerät oder teilen Sie sie mit anderen',
  'Export your current agents and LLM provider settings and share it via URL or QR code.':
    'Exportieren Sie Ihre aktuellen Agenten und LLM-Anbietereinstellungen und teilen Sie sie über URL oder QR-Code.',
  'Include my {n} agents': 'Meine {n} Agenten einbeziehen',
  'Now you can share the platform configuration…':
    'Jetzt können Sie die Plattformkonfiguration teilen…',
  'Either with this URL:': 'Entweder mit dieser URL:',
  'Or this QR Code:': 'Oder diesem QR-Code:',
  'QR code generation failed. You can still use the URL above.':
    'QR-Code-Generierung fehlgeschlagen. Sie können weiterhin die obige URL verwenden.',
  'Platform Preparation': 'Plattformvorbereitung',
  'Password (optional)': 'Passwort (optional)',
  Password: 'Passwort',
  Continue: 'Fortfahren',
  'Setting the platform up…': 'Richte Plattform ein…',

  // Local LLM Loading Indicator
  'Initializing Local AI Model…': 'Initialisiere lokales KI-Modell…',

  // Agent Memory System
  'Agent Memory': 'Agentengedächtnis',
  'Review and manage what agents have learned':
    'Überprüfen und verwalten Sie, was Agenten gelernt haben',
  'Select Agent': 'Agent auswählen',
  'All agents': 'Alle Agenten',
  'Create Memory': 'Erinnerung erstellen',
  'Generate Synthesis': 'Synthese generieren',
  'Total Memories': 'Gesamte Erinnerungen',
  'Pending Review': 'Ausstehende Überprüfung',
  'High Confidence': 'Hohe Konfidenz',
  'Low Confidence': 'Niedrige Konfidenz',
  Approved: 'Genehmigt',
  Synthesis: 'Synthese',
  'No memories pending review': 'Keine Erinnerungen zur Überprüfung ausstehend',
  'No memories pending review for this agent':
    'Keine Erinnerungen zur Überprüfung für diesen Agenten ausstehend',
  'No approved memories yet': 'Noch keine genehmigten Erinnerungen',
  'Select an agent to view their memory synthesis':
    'Wählen Sie einen Agenten aus, um dessen Gedächtnissynthese anzuzeigen',
  'Memory Synthesis for {agent}': 'Gedächtnissynthese für {agent}',
  'Last updated: {date}': 'Zuletzt aktualisiert: {date}',
  'No synthesis generated yet': 'Noch keine Synthese generiert',
  'Delete Memory': 'Erinnerung löschen',
  'Are you sure you want to delete this memory? This action cannot be undone.':
    'Sind Sie sicher, dass Sie diese Erinnerung löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.',
  Facts: 'Fakten',
  Preferences: 'Präferenzen',
  Behaviors: 'Verhaltensweisen',
  'Domain Knowledge': 'Domänenwissen',
  Relationships: 'Beziehungen',
  Procedures: 'Verfahren',
  Corrections: 'Korrekturen',
  'All Categories': 'Alle Kategorien',
  'Filter by category': 'Nach Kategorie filtern',
  high: 'hoch',
  medium: 'mittel',
  low: 'niedrig',
  High: 'Hoch',
  Medium: 'Mittel',
  Low: 'Niedrig',
  'Confidence level: {level}': 'Konfidenzniveau: {level}',
  'Auto-approved': 'Automatisch genehmigt',
  'Review notes (optional)': 'Überprüfungsnotizen (optional)',
  'Add notes about this memory...':
    'Notizen zu dieser Erinnerung hinzufügen...',
  Forget: 'Vergessen',
  Memorize: 'Merken',
  'Edit Memory': 'Erinnerung bearbeiten',
  'Memory content': 'Erinnerungsinhalt',
  'Explain your changes...': 'Erklären Sie Ihre Änderungen...',
  'Save & Approve': 'Speichern & Genehmigen',
  'Select All': 'Alle auswählen',
  'Deselect All': 'Alle abwählen',
  '{count} selected': '{count} ausgewählt',
  'Reject Selected': 'Ausgewählte ablehnen',
  'Approve Selected': 'Ausgewählte genehmigen',
  'Learned: {date}': 'Gelernt: {date}',
  'Used {count} times': '{count} mal verwendet',
  'Memory approved': 'Erinnerung genehmigt',
  'Memory rejected': 'Erinnerung abgelehnt',
  'Memory edited and approved': 'Erinnerung bearbeitet und genehmigt',
  'Memory deleted': 'Erinnerung gelöscht',
  'Learn from conversation': 'Aus Unterhaltung lernen',
  'Learning...': 'Lernen...',
  'Memory learning failed': 'Gedächtnislernen fehlgeschlagen',
  'New memories learned': 'Neue Erinnerungen gelernt',
  Insight: 'Erkenntnis',
  'Review and approve to save': 'Überprüfen und genehmigen zum Speichern',
  Dismiss: 'Verwerfen',
  Fact: 'Fakt',
  Preference: 'Präferenz',
  Behavior: 'Verhalten',
  Relationship: 'Beziehung',
  Procedure: 'Verfahren',
  Correction: 'Korrektur',
  Title: 'Titel',
  Content: 'Inhalt',
  Category: 'Kategorie',
  Confidence: 'Konfidenz',
  Keywords: 'Schlüsselwörter',
  'Comma-separated list of keywords':
    'Kommagetrennte Liste von Schlüsselwörtern',

  // Pinned Messages
  'Pin message': 'Nachricht anheften',
  'Unpin message': 'Nachricht lösen',
  'Message pinned successfully': 'Nachricht erfolgreich angeheftet',
  'Add a description to help you remember why this message is important.':
    'Fügen Sie eine Beschreibung hinzu, um sich daran zu erinnern, warum diese Nachricht wichtig ist.',
  Description: 'Beschreibung',
  'Brief description of why this is important...':
    'Kurze Beschreibung, warum dies wichtig ist...',
  'Pinned Messages': 'Angeheftete Nachrichten',
  'No pinned messages': 'Keine angehefteten Nachrichten',
  'Messages you pin will appear here for quick reference.':
    'Die Nachrichten, die Sie anheften, werden hier zur schnellen Referenz angezeigt.',
  'View conversation': 'Konversation anzeigen',
  'From conversation with {agentName}': 'Aus der Konversation mit {agentName}',
  'Filter by agent': 'Nach Agent filtern',
  'No pinned conversations': 'Keine angehefteten Konversationen',
  'No conversations found': 'Keine Konversationen gefunden',
  'View summary': 'Zusammenfassung anzeigen',
  'No summary available': 'Keine Zusammenfassung verfügbar',
  'No pinned messages yet. Pin important messages from conversations to make them available here.':
    'Noch keine angehefteten Nachrichten. Heften Sie wichtige Nachrichten aus Konversationen an, um sie hier verfügbar zu machen.',

  // Memory Learning
  'Learn from this message': 'Aus dieser Nachricht lernen',
  '{count} insights extracted': '{count} Erkenntnisse extrahiert',
  'No new insights found in this message':
    'Keine neuen Erkenntnisse in dieser Nachricht gefunden',

  // Agent Management
  'Edit Knowledge': 'Wissen bearbeiten',
  'Edit Knowledge for {name}': 'Wissen bearbeiten für {name}',
  'Save Changes': 'Änderungen speichern',
  'Delete Agent': 'Agent löschen',
  'Are you sure you want to delete "{name}"? This action cannot be undone.':
    'Sind Sie sicher, dass Sie "{name}" löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.',
} as const
