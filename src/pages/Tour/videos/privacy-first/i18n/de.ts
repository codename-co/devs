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
  [`What leaves your browser? Nothing.`]: `Was verlässt deinen Browser? Nichts.`,

  // Scene 2 — browser local
  [`IndexedDB`]: `IndexedDB`,
  [`Local storage`]: `Lokaler Speicher`,
  [`Web Crypto`]: `Web Crypto`,
  [`Encrypted keys`]: `Verschlüsselte Schlüssel`,
  [`Service Worker`]: `Service Worker`,
  [`Offline ready`]: `Offline bereit`,

  // Scene 3 — BYOK
  [`LLM Providers`]: `LLM-Anbieter`,
  [`OpenAI`]: `OpenAI`,
  [`Anthropic`]: `Anthropic`,
  [`Gemini`]: `Gemini`,
  [`Ollama`]: `Ollama`,
  [`OpenRouter`]: `OpenRouter`,
  [`Local (WebGPU)`]: `Local (WebGPU)`,
  [`Connected`]: `Verbunden`,
  [`12+ providers. Your keys. Your choice.`]: `12+ Anbieter. Deine Schlüssel. Deine Wahl.`,

  // Scene 4 — promise
  [`No server.`]: `Kein Server.`,
  [`No subscription.`]: `Kein Abo.`,
  [`No third party.`]: `Keine Dritten.`,
  [`Open source.`]: `Open Source.`,
  [`OPEN SOURCE · BROWSER-NATIVE · YOURS`]: `OPEN SOURCE · BROWSER-NATIV · DEINS`,

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
