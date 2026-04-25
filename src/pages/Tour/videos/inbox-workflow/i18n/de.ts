/**
 * Tour-local i18n — German translations.
 *
 * Keys are the literal English strings from `./en.ts`. Every new string added
 * to the English source must be translated here.
 */
import type { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const de: I18n = {
  // Scene 1 — hook
  [`AI that reports back to you.`]: `KI, die dir Bericht erstattet.`,

  // Scene 2 — inbox full
  [`Q1 Expense Audit`]: `Q1-Kostenprüfung`,
  [`Blog post draft`]: `Blogbeitrag-Entwurf`,
  [`API documentation`]: `API-Dokumentation`,
  [`Market research`]: `Marktforschung`,
  [`Code review: auth`]: `Code-Review: auth`,
  [`Weekly summary`]: `Wochenzusammenfassung`,
  [`Auditor`]: `Auditor`,
  [`Scribe`]: `Scribe`,
  [`DocBot`]: `DocBot`,
  [`Scout`]: `Scout`,
  [`Reviewer`]: `Reviewer`,
  [`Digest`]: `Digest`,
  [`2m ago`]: `vor 2 Min.`,
  [`15m ago`]: `vor 15 Min.`,
  [`1h ago`]: `vor 1 Std.`,
  [`3h ago`]: `vor 3 Std.`,
  [`5h ago`]: `vor 5 Std.`,
  [`1d ago`]: `vor 1 Tag`,
  [`Found 3 anomalies in Q1 data…`]: `3 Anomalien in Q1-Daten gefunden…`,
  [`Here\u2019s a draft covering key topics…`]: `Hier ist ein Entwurf zu den wichtigsten Themen…`,
  [`Endpoints documented with examples…`]: `Endpunkte mit Beispielen dokumentiert…`,
  [`Audit Q1 expenses and flag anomalies`]: `Q1-Ausgaben prüfen und Anomalien markieren`,
  [`Analyzing expense data across departments…`]: `Ausgabendaten über Abteilungen hinweg analysieren…`,
  [`Found 3 anomalies totaling $12,400. Two duplicate vendor payments and one misclassified expense in Marketing.`]: `3 Anomalien im Gesamtwert von 12.400 $ gefunden. Zwei doppelte Lieferantenzahlungen und eine falsch zugeordnete Ausgabe im Marketing.`,

  // Scene 3 — transcript
  [`Audit Q1 expenses...`]: `Q1-Ausgaben prüfen…`,
  [`Analyzing expense data...`]: `Ausgabendaten analysieren…`,
  [`calculate — 247 transactions`]: `calculate — 247 Transaktionen`,
  [`search_knowledge — Q1 reports`]: `search_knowledge — Q1-Berichte`,
  [`Found 3 anomalies...`]: `3 Anomalien gefunden…`,
  [`1.2s`]: `1.2s`,
  [`0.8s`]: `0.8s`,
  [`2.1s`]: `2.1s`,
  [`1.5s`]: `1.5s`,
  [`0.9s`]: `0.9s`,
  [`340 tok`]: `340 tok`,
  [`—`]: `—`,
  [`580 tok`]: `580 tok`,
  [`120 tok`]: `120 tok`,
  [`410 tok`]: `410 tok`,
  [`User input`]: `Benutzereingabe`,
  [`Thinking`]: `Denken`,
  [`Tool call`]: `Toolaufruf`,
  [`Response`]: `Antwort`,

  // Scene 4 — tags & search
  [`#research`]: `#research`,
  [`Search. Tag. Organize.`]: `Suchen. Taggen. Organisieren.`,

  // Scene 5 — CTA
  [`Now you can.`]: `Jetzt kannst du es.`,
  [`Open devs.new →`]: `devs.new öffnen →`,
  [`No signup · No install · Free`]: `Keine Anmeldung · Keine Installation · Kostenlos`,

  // Playback bar — settings menu
  [`Speed`]: `Geschwindigkeit`,
  [`Normal`]: `Normal`,
  [`Language`]: `Sprache`,
  [`Keyboard shortcuts`]: `Tastenkürzel`,

  // Playback bar — control titles
  [`Pause`]: `Pause`,
  [`Play`]: `Wiedergabe`,
  [`Unmute`]: `Ton einschalten`,
  [`Mute`]: `Stummschalten`,
  [`Exit full screen`]: `Vollbild beenden`,
  [`Full screen`]: `Vollbild`,
  [`Settings`]: `Einstellungen`,

  // Keyboard shortcut overlay — descriptions
  [`Play / Pause`]: `Wiedergabe / Pause`,
  [`Seek back 0.1 s`]: `0,1 s zurückspulen`,
  [`Seek forward 0.1 s`]: `0,1 s vorspulen`,
  [`Seek back 1 s`]: `1 s zurückspulen`,
  [`Seek forward 1 s`]: `1 s vorspulen`,
  [`Go to start`]: `Zum Anfang`,
  [`Toggle mute`]: `Stummschaltung umschalten`,
  [`Toggle full screen`]: `Vollbild umschalten`,
  [`Show shortcuts`]: `Tastenkürzel anzeigen`,
  [`Close this overlay`]: `Schließen`,
}
