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
} as const
