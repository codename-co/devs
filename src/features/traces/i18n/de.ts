import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const de: I18n = {
  // Page titles
  'Traces and Metrics': 'Traces und Metriken',
  'Trace Details': 'Trace-Details',
  Dashboard: 'Dashboard',
  'LLM Observability': 'LLM-Beobachtbarkeit',
  'Monitor and analyze all LLM calls':
    'Alle LLM-Aufrufe überwachen und analysieren',

  // Tabs
  Logs: 'Protokolle',
  Metrics: 'Metriken',

  // Filters
  All: 'Alle',
  Completed: 'Abgeschlossen',
  Error: 'Fehler',
  Running: 'Läuft',
  Pending: 'Ausstehend',
  'Filter by status': 'Nach Status filtern',
  'Filter by provider': 'Nach Anbieter filtern',
  'Filter by agent': 'Nach Agent filtern',
  'Search traces...': 'Traces durchsuchen...',

  // Time periods
  'Time Range': 'Zeitraum',
  'Last Hour': 'Letzte Stunde',
  'Last 24 Hours': 'Letzte 24 Stunden',
  'Last 7 Days': 'Letzte 7 Tage',
  'Last 30 Days': 'Letzte 30 Tage',
  'All Time': 'Gesamter Zeitraum',

  // Metrics
  'Total Requests': 'Gesamte Anfragen',
  'Success Rate': 'Erfolgsrate',
  'Total Tokens': 'Gesamte Tokens',
  'Total Cost': 'Gesamtkosten',
  'Avg Duration': 'Durchschn. Dauer',
  'Error Rate': 'Fehlerrate',
  'Requests Over Time': 'Anfragen im Zeitverlauf',
  'Token Usage': 'Token-Nutzung',
  'Cost Breakdown': 'Kostenaufschlüsselung',
  'Model Distribution': 'Modellverteilung',
  'Provider Distribution': 'Anbieterverteilung',
  'Agent Usage': 'Agent-Nutzung',

  // Trace details
  'Trace ID': 'Trace-ID',
  Status: 'Status',
  Duration: 'Dauer',
  Started: 'Gestartet',
  Ended: 'Beendet',
  Model: 'Modell',
  Provider: 'Anbieter',
  Tokens: 'Tokens',
  Cost: 'Kosten',
  Input: 'Eingabe',
  Output: 'Ausgabe',
  Spans: 'Spans',
  Metadata: 'Metadaten',
  'No spans found': 'Keine Spans gefunden',

  // Span types
  'LLM Call': 'LLM-Aufruf',
  'Image Generation': 'Bilderzeugung',
  Agent: 'Agent',
  Tool: 'Werkzeug',
  Chain: 'Kette',
  Retrieval: 'Abruf',
  Embedding: 'Embedding',
  Custom: 'Benutzerdefiniert',

  // Actions
  'Clear All': 'Alle löschen',
  Export: 'Exportieren',
  Refresh: 'Aktualisieren',
  Delete: 'Löschen',
  Back: 'Zurück',
  'View Details': 'Details anzeigen',

  // Empty states
  'No traces yet': 'Noch keine Traces',
  'Start chatting with agents to see LLM traces here':
    'Starten Sie einen Chat mit Agenten, um LLM-Traces hier zu sehen',
  'No data available': 'Keine Daten verfügbar',

  // Settings
  'Tracing Settings': 'Tracing-Einstellungen',
  'Enable Tracing': 'Tracing aktivieren',
  'Capture Input': 'Eingabe erfassen',
  'Capture Output': 'Ausgabe erfassen',
  'Retention Days': 'Aufbewahrungstage',
  'Max Traces': 'Max. Traces',

  // Misc
  'Prompt Tokens': 'Prompt-Tokens',
  'Completion Tokens': 'Completion-Tokens',
  requests: 'Anfragen',
  tokens: 'Tokens',
  ms: 'ms',
  'Are you sure you want to delete all traces?':
    'Sind Sie sicher, dass Sie alle Traces löschen möchten?',
  'This action cannot be undone.':
    'Diese Aktion kann nicht rückgängig gemacht werden.',
  Cancel: 'Abbrechen',
  Confirm: 'Bestätigen',

  // Additional page strings
  'Trace not found': 'Trace nicht gefunden',
  'Failed to load trace': 'Fehler beim Laden des Traces',
  'Failed to load traces': 'Fehler beim Laden der Traces',
  'Back to Traces': 'Zurück zu Traces',
  'Trace Detail': 'Trace-Detail',
  'Trace deleted successfully': 'Trace erfolgreich gelöscht',
  'All traces deleted successfully': 'Alle Traces erfolgreich gelöscht',
  'Failed to delete trace': 'Fehler beim Löschen des Traces',
  'Failed to clear traces': 'Fehler beim Löschen der Traces',
  'Configuration saved successfully': 'Konfiguration erfolgreich gespeichert',
  'Failed to save configuration': 'Fehler beim Speichern der Konfiguration',
  'Monitor and analyze LLM requests': 'LLM-Anfragen überwachen und analysieren',
  'Capture all LLM requests': 'Alle LLM-Anfragen erfassen',
  'How long to keep traces': 'Wie lange Traces aufbewahren',
  'Sampling Rate': 'Abtastrate',
  'Percentage of requests to trace': 'Prozentsatz der zu verfolgenden Anfragen',
  Save: 'Speichern',
  Deleted: 'Gelöscht',
  Cleared: 'Gelöscht',
  Saved: 'Gespeichert',
  'Clear All Traces': 'Alle Traces löschen',
  'Are you sure you want to delete all traces? This action cannot be undone.':
    'Sind Sie sicher, dass Sie alle Traces löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.',
  'Delete All': 'Alle löschen',
  Settings: 'Einstellungen',
  'Current Session': 'Aktuelle Sitzung',

  // Sessions view
  Sessions: 'Sitzungen',
  Session: 'Sitzung',
  'Single Request': 'Einzelne Anfrage',
  Conversation: 'Konversation',
  Task: 'Aufgabe',
  'Search sessions...': 'Sitzungen durchsuchen...',
  'Search logs...': 'Protokolle durchsuchen...',
  sessions: 'Sitzungen',
  'No sessions found matching your search':
    'Keine Sitzungen gefunden, die Ihrer Suche entsprechen',
  'Just now': 'Gerade eben',
  Name: 'Name',
}
