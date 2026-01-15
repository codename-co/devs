import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const de: I18n = {
  'Agent Builder': 'Agenten-Builder',
  'Design and configure your custom specialized AI agent':
    'Entwerfen und konfigurieren Sie Ihren benutzerdefinierten spezialisierten KI-Agenten',
  'Agent Profile': 'Agentenprofil',
  "Define your agent's personality and capabilities":
    'Definieren Sie die Persönlichkeit und Fähigkeiten Ihres Agenten',
  'Agent created successfully! Redirecting to agents list...':
    'Agent erfolgreich erstellt! Weiterleitung zur Agentenliste...',
  Name: 'Name',
  'e.g., Mike the Magician': 'z.B. Mike der Zauberer',
  'A friendly name for your agent': 'Ein freundlicher Name für Ihren Agenten',
  Role: 'Rolle',
  'e.g., Performs magic tricks and illusions':
    'z.B. Führt Zaubertricks und Illusionen auf',
  'What does your agent do?': 'Was macht Ihr Agent?',
  Instructions: 'Anweisungen',
  "Detailed instructions for the agent's personality, skills, constraints, and goals…":
    'Detaillierte Anweisungen für Persönlichkeit, Fähigkeiten, Einschränkungen und Ziele des Agenten…',
  "Detailed instructions for the agent's behavior":
    'Detaillierte Anweisungen für das Verhalten des Agenten',
  'Advanced Configuration': 'Erweiterte Konfiguration',
  'Configure advanced settings for your agent':
    'Erweiterte Einstellungen für Ihren Agenten konfigurieren',
  Provider: 'Anbieter',
  Model: 'Modell',
  Temperature: 'Temperatur',
  'Lower values = more focused, Higher values = more creative':
    'Niedrigere Werte = fokussierter, Höhere Werte = kreativer',
  'Creating...': 'Wird erstellt...',
  'Create Agent': 'Agent erstellen',
  'Reset Form': 'Formular zurücksetzen',
  'Live Preview': 'Live-Vorschau',
  Clear: 'Löschen',
  'Start a conversation to test your agent':
    'Starten Sie eine Unterhaltung, um Ihren Agenten zu testen',
  'The chat will use your current form configuration':
    'Der Chat verwendet Ihre aktuelle Formularkonfiguration',
  'Ask {agentName} something…': 'Fragen Sie {agentName} etwas…',
  Send: 'Senden',
  Current: 'Aktuell', // current conversation
  'No conversation history yet. Start chatting with this agent to build history.':
    'Noch kein Gesprächsverlauf. Beginnen Sie ein Gespräch mit diesem Agenten, um einen Verlauf aufzubauen.',
  'No instructions defined.': 'Keine Anweisungen definiert.',
  '{count} messages': '{count} Nachrichten',
  Edit: 'Bearbeiten',
  Save: 'Speichern',
  Cancel: 'Abbrechen',
  'Edit System Prompt': 'System-Prompt bearbeiten',
  'System prompt updated successfully':
    'System-Prompt erfolgreich aktualisiert',
  'Enter agent role...': 'Agentenrolle eingeben...',
  'Enter agent instructions...': 'Agentenanweisungen eingeben...',
  // Agent Context panel (unified Knowledge, Memories, Pinned)
  'Agent Context': 'Agentenkontext',
  Files: 'Dateien',
  Memories: 'Erinnerungen',
  Messages: 'Nachrichten',
  'Knowledge items updated successfully':
    'Wissenselemente erfolgreich aktualisiert',
  'Failed to update knowledge items':
    'Fehler beim Aktualisieren der Wissenselemente',
  'Search knowledge items…': 'Wissenselemente suchen…',
  'No knowledge items found.': 'Keine Wissenselemente gefunden.',
  'Add files to your knowledge base':
    'Dateien zu Ihrer Wissensdatenbank hinzufügen',
  '{count} selected': '{count} ausgewählt',
  'No knowledge items associated with this agent.':
    'Keine Wissenselemente mit diesem Agenten verknüpft.',
  'Add knowledge': 'Wissen hinzufügen',
  'No memories learned yet. Start conversations and use "Learn from conversation" to build agent memory.':
    'Noch keine Erinnerungen gelernt. Starten Sie Gespräche und nutzen Sie "Aus Gespräch lernen" um das Agentenwissen aufzubauen.',
  'No pinned messages yet. Pin important messages from conversations to make them available here.':
    'Noch keine angepinnten Nachrichten. Pinnen Sie wichtige Nachrichten aus Gesprächen an, um sie hier verfügbar zu machen.',
  'Start Live Conversation': 'Live-Gespräch starten',
  // Meta-prompting
  'Creation mode': 'Erstellungsmodus',
  'Describe Your Agent': 'Beschreiben Sie Ihren Agenten',
  'Manual Configuration': 'Manuelle Konfiguration',
  "Tell us what kind of agent you want, and we'll create it for you.":
    'Sagen Sie uns, welche Art von Agent Sie wollen, und wir erstellen ihn für Sie.',
  'What agent do you need?': 'Welchen Agenten brauchen Sie?',
  'e.g., A friendly cooking assistant who specializes in Italian cuisine and can suggest wine pairings...':
    'z.B. Ein freundlicher Kochassistent, der sich auf italienische Küche spezialisiert hat und Weinempfehlungen geben kann...',
  'Describe the agent you want to create. Be as specific as you like!':
    'Beschreiben Sie den Agenten, den Sie erstellen möchten. Seien Sie so spezifisch wie Sie möchten!',
  'Generating agent...': 'Agent wird generiert...',
  'Generate Agent': 'Agent generieren',
  'Generating...': 'Generierung...',
  'Or configure manually': 'Oder manuell konfigurieren',
  'No LLM provider configured. Please configure one in Settings.':
    'Kein LLM-Anbieter konfiguriert. Bitte konfigurieren Sie einen in den Einstellungen.',
  'Failed to generate agent configuration. Please try again.':
    'Agentenkonfiguration konnte nicht generiert werden. Bitte versuchen Sie es erneut.',
  'Generated configuration is missing required fields.':
    'Der generierten Konfiguration fehlen erforderliche Felder.',
  Tools: 'Werkzeuge',
  'No tools enabled for this agent.':
    'Keine Werkzeuge für diesen Agenten aktiviert.',
  'Knowledge search': 'Wissenssuche',
  // Trace/Tool display
  Duration: 'Dauer',
  Tokens: 'Tokens',
  'Loading…': 'Laden…',
  'Processing step': 'Verarbeitungsschritt',
  'Processing Details': 'Verarbeitungsdetails',
  Status: 'Status',
  Cost: 'Kosten',
  Input: 'Eingabe',
  Output: 'Ausgabe',
  Steps: 'Schritte',
  'Trace not found': 'Trace nicht gefunden',
  Close: 'Schließen',
  'View details': 'Details anzeigen',
  'View trace details': 'Trace-Details anzeigen',
  Error: 'Fehler',
  'View document': 'Dokument anzeigen',
  // Tool display names
  'Searching knowledge base': 'Wissensdatenbank durchsuchen',
  'Reading document': 'Dokument lesen',
  'Browsing documents': 'Dokumente durchsuchen',
  'Summarizing document': 'Dokument zusammenfassen',
  Calculating: 'Berechnen',
  'Code interpreter': 'Code-Interpreter',
  'Running code': 'Code ausführen',
  // Gmail tools
  'Searching Gmail': 'Gmail durchsuchen',
  'Reading email': 'E-Mail lesen',
  'Listing Gmail labels': 'Gmail-Labels auflisten',
  // Google Drive tools
  'Searching Google Drive': 'Google Drive durchsuchen',
  'Reading file from Drive': 'Datei von Drive lesen',
  'Listing Drive files': 'Drive-Dateien auflisten',
  // Google Calendar tools
  'Listing calendar events': 'Kalendertermine auflisten',
  'Getting calendar event': 'Kalendertermin abrufen',
  'Searching calendar': 'Kalender durchsuchen',
  // Google Tasks tools
  'Listing tasks': 'Aufgaben auflisten',
  'Getting task details': 'Aufgabendetails abrufen',
  'Listing task lists': 'Aufgabenlisten auflisten',
  // Notion tools
  'Searching Notion': 'Notion durchsuchen',
  'Reading Notion page': 'Notion-Seite lesen',
  'Querying Notion database': 'Notion-Datenbank abfragen',
  // Generic tool messages
  'Using tool': 'Werkzeug verwenden',
  'Using tools': 'Werkzeuge verwenden',
  'Failed to generate agent. Please try again.':
    'Agent konnte nicht generiert werden. Bitte versuchen Sie es erneut.',
  // Tool labels
  'Search Knowledge': 'Wissen durchsuchen',
  'Read Document': 'Dokument lesen',
  'List Documents': 'Dokumente auflisten',
  'Get Document Summary': 'Dokumentzusammenfassung',
  Calculate: 'Berechnen',
  // Search results
  result: 'Ergebnis',
  results: 'Ergebnisse',
  // Sources
  Sources: 'Quellen',
  'View in Knowledge Base': 'In Wissensbasis anzeigen',
  // Quick replies
  'Generating suggestions…': 'Vorschläge werden generiert…',
} as const
