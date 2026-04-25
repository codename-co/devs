/**
 * Tour-local i18n — French translations.
 *
 * Keys are the literal English strings from `./en.ts`. Every new string added
 * to the English source must be translated here.
 */
import type { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const fr: I18n = {
  // Browser chrome
  [`DEVS`]: `DEVS`,

  // Scene 1 — hook caption
  [`What if AI worked your way?`]: `Et si l\u2019IA s\u2019adaptait à vous ?`,

  // Scene 2 — browser agents
  [`New agent`]: `Nouvel agent`,
  [`Create a custom agent`]: `Créer un agent personnalisé`,
  [`Scout`]: `Scout`,
  [`Research`]: `Recherche`,
  [`Forge`]: `Forge`,
  [`Analysis`]: `Analyse`,
  [`Scribe`]: `Scribe`,
  [`Writing`]: `Rédaction`,
  [`Echo`]: `Echo`,
  [`Review`]: `Revue`,
  [`Probe`]: `Probe`,
  [`Data`]: `Données`,
  [`Lens`]: `Lens`,
  [`Vision`]: `Vision`,
  [`Market Scout`]: `Market Scout`,
  [`Competitive Analyst`]: `Analyste concurrentiel`,

  // Scene 3 — agent config
  [`Profile`]: `Profil`,
  [`Name`]: `Nom`,
  [`Role`]: `Rôle`,
  [`Instructions`]: `Instructions`,
  [`Analyze competitor products, pricing strategies, and market positioning. Summarize findings into actionable briefs.`]: `Analyser les produits concurrents, les stratégies de prix et le positionnement marché. Résumer les conclusions en notes d\u2019action.`,
  [`Context`]: `Contexte`,
  [`Knowledge`]: `Connaissances`,
  [`market-report-q3.pdf`]: `market-report-q3.pdf`,
  [`competitor-matrix.csv`]: `competitor-matrix.csv`,
  [`Skills`]: `Compétences`,
  [`Web research`]: `Recherche web`,
  [`Settings`]: `Paramètres`,
  [`Model`]: `Modèle`,
  [`GPT-4o`]: `GPT-4o`,
  [`Temperature`]: `Température`,
  [`0.7`]: `0.7`,

  // Scene 4 — team glance
  [`A team. Yours. Built in seconds.`]: `Une équipe. La vôtre. Créée en quelques secondes.`,

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
