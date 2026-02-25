import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const de: I18n = {
  'Platform Settings': 'Plattformeinstellungen',
  'Configure AI providers, models and platform defaults for your organization':
    'Konfigurieren Sie LLM-Anbieter, Modelle und Plattform-Standardeinstellungen für Ihre Organisation',
  Appearance: 'Erscheinungsbild',
  'Choose your preferred language': 'Wählen Sie Ihre bevorzugte Sprache',
  'Interface Language': 'Oberflächensprache',
  'Platform Name': 'Plattformname',
  'Secure Storage': 'Sicherer Speicher',
  'Manage your encryption keys and secure storage':
    'Verwalten Sie Ihre Verschlüsselungsschlüssel und sicheren Speicher',
  'Master Key': 'Hauptschlüssel',
  'Master key copied to clipboard': 'Hauptschlüssel in Zwischenablage kopiert',
  'Failed to copy master key': 'Hauptschlüssel konnte nicht kopiert werden',
  'Regenerate Master Key': 'Hauptschlüssel neu generieren',
  'Are you sure you want to regenerate the master key? This will invalidate all existing encrypted data.':
    'Sind Sie sicher, dass Sie den Hauptschlüssel neu generieren möchten? Dies macht alle vorhandenen verschlüsselten Daten ungültig.',
  'Master key regenerated successfully':
    'Hauptschlüssel erfolgreich neu generiert',
  'Failed to regenerate master key':
    'Hauptschlüssel konnte nicht neu generiert werden',
  'Your master key is used to encrypt all sensitive data stored locally. Keep it safe and secure.':
    'Ihr Hauptschlüssel wird verwendet, um alle lokal gespeicherten sensiblen Daten zu verschlüsseln. Bewahren Sie ihn sicher auf.',
  'AI Providers': 'LLM-Anbieter',
  'Choose your AI provider, manage your API credentials':
    'Wählen Sie Ihren LLM-Anbieter, verwalten Sie Ihre API-Anmeldedaten',
  'Add Provider': 'Anbieter hinzufügen',
  'No providers configured. Add one to get started.':
    'Keine Anbieter konfiguriert. Fügen Sie einen hinzu, um zu beginnen.',
  'Set as Default': 'Als Standard festlegen',
  'Secure storage is locked': 'Sicherer Speicher ist gesperrt',
  'Enter your master password to unlock':
    'Geben Sie Ihr Hauptpasswort ein, um zu entsperren',
  'Master password': 'Hauptpasswort',
  Unlock: 'Entsperren',
  'Storage unlocked': 'Speicher entsperrt',
  'Invalid password': 'Ungültiges Passwort',
  'Please fill in all required fields':
    'Bitte füllen Sie alle erforderlichen Felder aus',
  'Invalid API key': 'Ungültiger API-Schlüssel',
  'Credential added successfully': 'Anmeldedaten erfolgreich hinzugefügt',
  'Failed to add credential': 'Anmeldedaten konnten nicht hinzugefügt werden',
  'Credential deleted': 'Anmeldedaten gelöscht',
  'Failed to delete credential': 'Anmeldedaten konnten nicht gelöscht werden',
  'Database Management': 'Datenbankverwaltung',
  'Export, import, or clear your local database':
    'Exportieren, importieren oder löschen Sie Ihre lokale Datenbank',
  'Clear database': 'Datenbank löschen',
  'Are you sure you want to clear all data? This action cannot be undone.':
    'Sind Sie sicher, dass Sie alle Daten löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.',
  'Database cleared successfully': 'Datenbank erfolgreich gelöscht',
  'Failed to clear database': 'Datenbank konnte nicht gelöscht werden',
  'Database repaired successfully': 'Datenbank erfolgreich repariert',
  'Failed to repair database': 'Datenbank konnte nicht repariert werden',
  Created: 'Erstellt',
  Updated: 'Aktualisiert',
  'Add LLM Provider': 'LLM-Anbieter hinzufügen',
  'Select Provider': 'Anbieter auswählen',
  'Server URL (Optional)': 'Server-URL (Optional)',
  'API Key': 'API-Schlüssel',
  'Enter your API key': 'Geben Sie Ihren API-Schlüssel ein',
  'Format:': 'Format:',
  'Base URL': 'Basis-URL',
  Model: 'Modell',
  'Select a model': 'Modell auswählen',
  'Custom Model Name': 'Benutzerdefinierter Modellname',
  'Enter model name': 'Modellnamen eingeben',
  'Validate & Add': 'Validieren und hinzufügen',
  'Fetch Available Models': 'Verfügbare Modelle abrufen',
  'Use Fetched Models': 'Abgerufene Modelle verwenden',
  'Manual Input': 'Manuelle Eingabe',
  'Model Name': 'Modellname',
  'Enter the exact name of the model you want to use':
    'Geben Sie den genauen Namen des Modells ein, das Sie verwenden möchten',
  'Available Models': 'Verfügbare Modelle',
  'Default Provider': 'Standardanbieter',
  'Provider set as default': 'Anbieter als Standard festgelegt',
  'Advanced Settings': 'Erweiterte Einstellungen',
  '{files} files cached ({size})': '{files} Dateien im Cache ({size})',
  'Local models cache': 'Lokaler Modell-Cache',
  'Clear cache': 'Cache leeren',
  'Downloaded models are cached for 1 year to avoid re-downloading.':
    'Heruntergeladene Modelle werden 1 Jahr lang zwischengespeichert, um erneutes Herunterladen zu vermeiden.',
  'Local LLMs run entirely in your browser':
    'Lokale LLMs laufen vollständig in Ihrem Browser',
  'No data is sent to external servers. Download happens at first use.':
    'Keine Daten werden an externe Server gesendet. Download erfolgt bei erster Verwendung.',
  'Requirements:': 'Anforderungen:',
  'WebGPU support': 'WebGPU-Unterstützung',
  'At least 8GB of RAM': 'Mindestens 8 GB RAM',
  'Storage space for model files (2-4GB)':
    'Speicherplatz für Modelldateien (2-4 GB)',
  'Your device:': 'Ihr Gerät:',
  'WebGPU:': 'WebGPU:',
  'Brand: {brand}': 'Marke: {brand}',
  'Model: {model}': 'Modell: {model}',
  'Memory: {memory} or more (imprecise)':
    'Speicher: {memory} oder mehr (ungenau)',
  'Vendor: {vendor}': 'Hersteller: {vendor}',
  'Browser: {browser}': 'Browser: {browser}',
  'Enable Speech-to-Text': 'Sprache-zu-Text aktivieren',
  'Allow voice input using your device microphone in the prompt area':
    'Spracheingabe über das Mikrofon Ihres Geräts im Prompt-Bereich zulassen',
  'Hide Default Agents': 'Standard-Agenten ausblenden',
  'Only show your custom agents in the agent picker and agents page':
    'Nur Ihre benutzerdefinierten Agenten im Agenten-Auswahl und auf der Agentenseite anzeigen',
  Features: 'Funktionen',
  Voice: 'Sprache',
  'Configure how you interact with agents':
    'Konfigurieren Sie, wie Sie mit Agenten interagieren',
  'Auto Memory Learning': 'Automatisches Gedächtnislernen',
  'Automatically extract learnable information from conversations to build agent memory':
    'Automatisch lernbare Informationen aus Gesprächen extrahieren, um das Agentengedächtnis aufzubauen',
  'Quick Reply Suggestions': 'Schnellantwort-Vorschläge',
  'Show AI-generated follow-up suggestions after each assistant response':
    'KI-generierte Folgevorschläge nach jeder Assistentenantwort anzeigen',
  'Web Search Grounding': 'Web-Suchverankerung',
  'Allow AI models to search the web for up-to-date information (supported by Google Gemini and Anthropic Claude)':
    'KI-Modellen erlauben, das Web nach aktuellen Informationen zu durchsuchen (unterstützt von Google Gemini und Anthropic Claude)',
  'Global System Instructions': 'Globale Systemanweisungen',
  "These instructions will be prepended to every agent's instructions":
    'Diese Anweisungen werden den Anweisungen jedes Agenten vorangestellt',
  'Enter global instructions that apply to all agents...':
    'Geben Sie globale Anweisungen ein, die für alle Agenten gelten...',
  'Show Context Panel': 'Kontextfenster anzeigen',
  'Display the contextual information panel on the right side of the screen':
    'Das kontextbezogene Informationsfenster auf der rechten Seite des Bildschirms anzeigen',
  'Make the platform your own': 'Machen Sie die Plattform zu Ihrer eigenen',
  'Share the platform': 'Plattform teilen',
  'Export the platform settings to another device or share it with others':
    'Exportieren Sie die Plattformeinstellungen auf ein anderes Gerät oder teilen Sie sie mit anderen',
  'Sync your data across devices using peer-to-peer connection':
    'Synchronisieren Sie Ihre Daten über Peer-to-Peer-Verbindung zwischen Geräten',
  'Server URL': 'Server-URL',
  'URL of your Ollama server': 'URL Ihres Ollama-Servers',
  'Get your API key from': 'Holen Sie Ihren API-Schlüssel von',
  'Enter model name manually': 'Modellnamen manuell eingeben',
  'Fetching available models...': 'Verfügbare Modelle werden abgerufen...',
  'Enter the model name manually': 'Geben Sie den Modellnamen manuell ein',
  'models available': 'Modelle verfügbar',
  'This provider is already configured':
    'Dieser Anbieter ist bereits konfiguriert',
  Computer: 'Computer',
  'Sandbox runtimes and system resources':
    'Sandbox-Laufzeiten und Systemressourcen',
  'Sandbox Runtimes': 'Sandbox-Laufzeiten',
  Running: 'Läuft',
  Executing: 'Wird ausgeführt',
  Loading: 'Wird geladen',
  Idle: 'Inaktiv',
  Error: 'Fehler',
  Start: 'Starten',
  Stop: 'Stoppen',
  'Pre-load the {runtime} runtime': '{runtime}-Laufzeit vorladen',
  'Terminate the {runtime} runtime': '{runtime}-Laufzeit beenden',
  'Run a test snippet in the {runtime} sandbox':
    'Testschnipsel in der {runtime}-Sandbox ausführen',
  Try: 'Testen',
  'Isolated code execution environments running entirely in WebAssembly. Python uses a Web Worker; JavaScript runs in a lightweight QuickJS VM.':
    'Isolierte Code-Ausführungsumgebungen, die vollständig in WebAssembly laufen. Python nutzt einen Web Worker; JavaScript läuft in einer leichtgewichtigen QuickJS-VM.',
  CPU: 'CPU',
  '{used} / {total} cores': '{used} / {total} Kerne',
  'CPU usage': 'CPU-Auslastung',
  Memory: 'Speicher',
  'Memory usage': 'Speicherauslastung',
  Storage: 'Speicherplatz',
  'Storage usage': 'Speicherplatzauslastung',
  'Device Information': 'Geräteinformationen',
  Device: 'Gerät',
  'GPU Vendor': 'GPU-Hersteller',
  'GPU Renderer': 'GPU-Renderer',
  WebGPU: 'WebGPU',
  Supported: 'Unterstützt',
  'Not Supported': 'Nicht unterstützt',
  'Local LLM (Browser)': 'Lokales LLM (Browser)',
  'Runs AI models entirely in your browser using WebGPU. No data is sent to external servers.':
    'Führt KI-Modelle vollständig in Ihrem Browser mit WebGPU aus. Es werden keine Daten an externe Server gesendet.',
  'Default Model': 'Standardmodell',
  'Loaded Model': 'Geladenes Modell',
  'No model loaded': 'Kein Modell geladen',
  Unload: 'Entladen',
  'Unload model to free memory': 'Modell entladen, um Speicher freizugeben',
  'WebGPU is not supported on this device. Local LLM inference requires a WebGPU-compatible browser.':
    'WebGPU wird auf diesem Gerät nicht unterstützt. Lokale LLM-Inferenz erfordert einen WebGPU-kompatiblen Browser.',
  'Your device has less than 8GB of RAM. Local inference may be slow or unavailable for larger models.':
    'Ihr Gerät hat weniger als 8 GB RAM. Lokale Inferenz kann langsam sein oder für größere Modelle nicht verfügbar.',

  'System Resources': 'Systemressourcen',
  Skills: 'Fähigkeiten',
  'Discover, install, and manage specialized skills for your agents':
    'Entdecken, installieren und verwalten Sie spezialisierte Fähigkeiten für Ihre Agenten',
  'Agent Memory': 'Agenten-Gedächtnis',
  'Pinned Messages': 'Angeheftete Nachrichten',
  General: 'Allgemein',
  Extend: 'Erweitern',
  Monitor: 'Überwachen',
  Configure: 'Konfigurieren',
  Personalize: 'Personalisieren',
  Observe: 'Beobachten',
  'How to connect': 'So verbinden Sie sich',
  'Open {provider}': '{provider} öffnen',
  "Sign in or create an account on the provider's website.":
    'Melden Sie sich an oder erstellen Sie ein Konto auf der Website des Anbieters.',
  'Create a new API key in your account dashboard.':
    'Erstellen Sie einen neuen API-Schlüssel in Ihrem Konto-Dashboard.',
  'Copy the key and come back here to paste it below.':
    'Kopieren Sie den Schlüssel und fügen Sie ihn unten ein.',
  'Enter your credentials': 'Anmeldedaten eingeben',
  'Your key is stored locally and encrypted. It never leaves your device.':
    'Ihr Schlüssel wird lokal gespeichert und verschlüsselt. Er verlässt niemals Ihr Gerät.',
  Preserve: 'Bewahren',
  'Local Backup': 'Lokale Sicherung',
  Sync: 'Synchronisation',
  'Color Scheme': 'Farbschema',
  'Choose a color scheme for the interface':
    'Wählen Sie ein Farbschema für die Oberfläche',
} as const
