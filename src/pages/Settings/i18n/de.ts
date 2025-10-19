import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const de: I18n = {
  'Platform Settings': 'Plattformeinstellungen',
  'Configure LLM providers, models and platform defaults for your organization':
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
  'LLM Providers': 'LLM-Anbieter',
  'Choose your LLM provider, manage your API credentials':
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
  'Make the platform your own': 'Machen Sie die Plattform zu Ihrer eigenen',
  'Share the platform': 'Plattform teilen',
  'Export the platform settings to another device or share it with others':
    'Exportieren Sie die Plattformeinstellungen auf ein anderes Gerät oder teilen Sie sie mit anderen',
} as const
