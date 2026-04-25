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
  [`Stop chatting. Start delegating.`]: `Arrêtez de discuter. Commencez à déléguer.`,

  // Scene 2 — prompt submit
  [`Audit Q1 expenses, flag anomalies, draft a CFO memo`]: `Auditer les dépenses Q1, signaler les anomalies, rédiger une note au CFO`,

  // Scene 3 — board view (task titles)
  [`Parse invoices`]: `Analyser les factures`,
  [`Flag anomalies`]: `Signaler les anomalies`,
  [`Cross-check budgets`]: `Recouper les budgets`,
  [`Summarize findings`]: `Synthétiser les résultats`,
  [`Draft CFO memo`]: `Rédiger la note CFO`,
  // Scene 3 — board view (task snippets)
  [`Extract line items from 247 invoices`]: `Extraire les postes de 247 factures`,
  [`Identify outliers above 2σ threshold`]: `Identifier les valeurs aberrantes au-delà du seuil 2σ`,
  [`Compare against Q4 budget allocations`]: `Comparer aux allocations budgétaires Q4`,
  [`Aggregate findings into executive bullets`]: `Agréger les résultats en points clés`,
  [`Compose formal memo for CFO review`]: `Rédiger une note formelle pour revue du CFO`,
  // Scene 3 — agent roles
  [`Analysis`]: `Analyse`,
  [`Auditing`]: `Audit`,
  [`Writing`]: `Rédaction`,

  // Scene 4 — artifacts
  [`Task completed`]: `Tâche terminée`,
  [`3 agents collaborated`]: `3 agents ont collaboré`,
  [`Q1 Expense Audit`]: `Audit des dépenses Q1`,
  [`report`]: `rapport`,
  [`CFO Memo`]: `Note CFO`,
  [`document`]: `document`,

  // Scene 5 — collapse
  [`Delegated. Delivered. Done.`]: `Délégué. Livré. Terminé.`,

  // Scene 6 — CTA
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
