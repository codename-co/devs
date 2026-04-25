/**
 * Tour-local i18n — French translations.
 *
 * Keys are the literal English strings from `./en.ts`. Every new string added
 * to the English source must be translated here.
 */
import type { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const fr: I18n = {
  // Scene 1 — hook
  [`What leaves your browser? Nothing.`]: `Qu\u2019est-ce qui quitte votre navigateur\u00A0? Rien.`,

  // Scene 2 — browser local
  [`IndexedDB`]: `IndexedDB`,
  [`Local storage`]: `Stockage local`,
  [`Web Crypto`]: `Web Crypto`,
  [`Encrypted keys`]: `Clés chiffrées`,
  [`Service Worker`]: `Service Worker`,
  [`Offline ready`]: `Prêt hors ligne`,

  // Scene 3 — BYOK
  [`LLM Providers`]: `Fournisseurs LLM`,
  [`OpenAI`]: `OpenAI`,
  [`Anthropic`]: `Anthropic`,
  [`Gemini`]: `Gemini`,
  [`Ollama`]: `Ollama`,
  [`OpenRouter`]: `OpenRouter`,
  [`Local (WebGPU)`]: `Local (WebGPU)`,
  [`Connected`]: `Connecté`,
  [`12+ providers. Your keys. Your choice.`]: `12+ fournisseurs. Vos clés. Votre choix.`,

  // Scene 4 — promise
  [`No server.`]: `Pas de serveur.`,
  [`No subscription.`]: `Pas d\u2019abonnement.`,
  [`No third party.`]: `Aucun tiers.`,
  [`Open source.`]: `Open source.`,
  [`OPEN SOURCE · BROWSER-NATIVE · YOURS`]: `OPEN SOURCE · NATIF NAVIGATEUR · À VOUS`,

  // Scene 5 — CTA
  [`Now you can.`]: `Maintenant, c\u2019est possible.`,
  [`Open devs.new →`]: `Ouvrir devs.new →`,
  [`No signup · No install · Free`]: `Sans inscription · Sans installation · Gratuit`,

  // Playback bar — settings menu
  [`Speed`]: `Vitesse`,
  [`Normal`]: `Normal`,
  [`Language`]: `Langue`,
  [`Keyboard shortcuts`]: `Raccourcis clavier`,

  // Playback bar — control titles
  [`Pause`]: `Pause`,
  [`Play`]: `Lecture`,
  [`Unmute`]: `Activer le son`,
  [`Mute`]: `Couper le son`,
  [`Exit full screen`]: `Quitter le plein écran`,
  [`Full screen`]: `Plein écran`,
  [`Settings`]: `Paramètres`,

  // Keyboard shortcut overlay — descriptions
  [`Play / Pause`]: `Lecture / Pause`,
  [`Seek back 0.1 s`]: `Reculer de 0,1 s`,
  [`Seek forward 0.1 s`]: `Avancer de 0,1 s`,
  [`Seek back 1 s`]: `Reculer de 1 s`,
  [`Seek forward 1 s`]: `Avancer de 1 s`,
  [`Go to start`]: `Retour au début`,
  [`Toggle mute`]: `Activer/couper le son`,
  [`Toggle full screen`]: `Basculer en plein écran`,
  [`Show shortcuts`]: `Afficher les raccourcis`,
  [`Close this overlay`]: `Fermer`,
}
