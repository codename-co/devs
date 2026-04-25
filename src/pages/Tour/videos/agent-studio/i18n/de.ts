/**
 * Tour-local i18n — German translations.
 *
 * Keys are the literal English strings from `./en.ts`. Every new string added
 * to the English source must be translated here.
 */
import type { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const de: I18n = {
  // Browser chrome
  [`DEVS`]: `DEVS`,

  // Scene 1 — hook caption
  [`What if AI worked your way?`]: `Was, wenn KI nach deinen Regeln arbeitet?`,

  // Scene 2 — browser agents
  [`New agent`]: `Neuer Agent`,
  [`Create a custom agent`]: `Eigenen Agenten erstellen`,
  [`Scout`]: `Scout`,
  [`Research`]: `Recherche`,
  [`Forge`]: `Forge`,
  [`Analysis`]: `Analyse`,
  [`Scribe`]: `Scribe`,
  [`Writing`]: `Schreiben`,
  [`Echo`]: `Echo`,
  [`Review`]: `Prüfung`,
  [`Probe`]: `Probe`,
  [`Data`]: `Daten`,
  [`Lens`]: `Lens`,
  [`Vision`]: `Vision`,
  [`Market Scout`]: `Market Scout`,
  [`Competitive Analyst`]: `Wettbewerbsanalyst`,

  // Scene 3 — agent config
  [`Profile`]: `Profil`,
  [`Name`]: `Name`,
  [`Role`]: `Rolle`,
  [`Instructions`]: `Anweisungen`,
  [`Analyze competitor products, pricing strategies, and market positioning. Summarize findings into actionable briefs.`]: `Konkurrenzprodukte, Preisstrategien und Marktpositionierung analysieren. Ergebnisse in umsetzbare Briefings zusammenfassen.`,
  [`Context`]: `Kontext`,
  [`Knowledge`]: `Wissen`,
  [`market-report-q3.pdf`]: `market-report-q3.pdf`,
  [`competitor-matrix.csv`]: `competitor-matrix.csv`,
  [`Skills`]: `Fähigkeiten`,
  [`Web research`]: `Webrecherche`,
  [`Settings`]: `Einstellungen`,
  [`Model`]: `Modell`,
  [`GPT-4o`]: `GPT-4o`,
  [`Temperature`]: `Temperatur`,
  [`0.7`]: `0.7`,

  // Scene 4 — team glance
  [`A team. Yours. Built in seconds.`]: `Ein Team. Deins. In Sekunden erstellt.`,

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
