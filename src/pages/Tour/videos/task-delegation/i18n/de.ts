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
  [`Stop chatting. Start delegating.`]: `Schluss mit Chatten. Jetzt delegieren.`,

  // Scene 2 — prompt submit
  [`Audit Q1 expenses, flag anomalies, draft a CFO memo`]: `Q1-Ausgaben prüfen, Anomalien markieren, CFO-Memo entwerfen`,

  // Scene 3 — board view (task titles)
  [`Parse invoices`]: `Rechnungen auswerten`,
  [`Flag anomalies`]: `Anomalien markieren`,
  [`Cross-check budgets`]: `Budgets abgleichen`,
  [`Summarize findings`]: `Ergebnisse zusammenfassen`,
  [`Draft CFO memo`]: `CFO-Memo entwerfen`,
  // Scene 3 — board view (task snippets)
  [`Extract line items from 247 invoices`]: `Einzelposten aus 247 Rechnungen extrahieren`,
  [`Identify outliers above 2σ threshold`]: `Ausreißer über dem 2σ-Schwellenwert identifizieren`,
  [`Compare against Q4 budget allocations`]: `Mit Q4-Budgetzuweisungen vergleichen`,
  [`Aggregate findings into executive bullets`]: `Ergebnisse in Stichpunkte zusammenfassen`,
  [`Compose formal memo for CFO review`]: `Formelles Memo zur CFO-Prüfung verfassen`,
  // Scene 3 — agent roles
  [`Analysis`]: `Analyse`,
  [`Auditing`]: `Prüfung`,
  [`Writing`]: `Schreiben`,

  // Scene 4 — artifacts
  [`Task completed`]: `Aufgabe abgeschlossen`,
  [`3 agents collaborated`]: `3 Agenten haben zusammengearbeitet`,
  [`Q1 Expense Audit`]: `Q1-Ausgabenprüfung`,
  [`report`]: `Bericht`,
  [`CFO Memo`]: `CFO-Memo`,
  [`document`]: `Dokument`,

  // Scene 5 — collapse
  [`Delegated. Delivered. Done.`]: `Delegiert. Geliefert. Erledigt.`,

  // Scene 6 — CTA
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
