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
  [`AI that reports back to you.`]: `L\u2019IA qui vous rend compte.`,

  // Scene 2 — inbox full
  [`Q1 Expense Audit`]: `Audit des dépenses T1`,
  [`Blog post draft`]: `Brouillon d\u2019article`,
  [`API documentation`]: `Documentation API`,
  [`Market research`]: `Étude de marché`,
  [`Code review: auth`]: `Revue de code : auth`,
  [`Weekly summary`]: `Résumé hebdomadaire`,
  [`Auditor`]: `Auditor`,
  [`Scribe`]: `Scribe`,
  [`DocBot`]: `DocBot`,
  [`Scout`]: `Scout`,
  [`Reviewer`]: `Reviewer`,
  [`Digest`]: `Digest`,
  [`2m ago`]: `il y a 2 min`,
  [`15m ago`]: `il y a 15 min`,
  [`1h ago`]: `il y a 1 h`,
  [`3h ago`]: `il y a 3 h`,
  [`5h ago`]: `il y a 5 h`,
  [`1d ago`]: `il y a 1 j`,
  [`Found 3 anomalies in Q1 data…`]: `3 anomalies trouvées dans les données T1…`,
  [`Here\u2019s a draft covering key topics…`]: `Voici un brouillon couvrant les sujets clés…`,
  [`Endpoints documented with examples…`]: `Points d\u2019accès documentés avec exemples…`,
  [`Audit Q1 expenses and flag anomalies`]: `Auditer les dépenses T1 et signaler les anomalies`,
  [`Analyzing expense data across departments…`]: `Analyse des données de dépenses par département…`,
  [`Found 3 anomalies totaling $12,400. Two duplicate vendor payments and one misclassified expense in Marketing.`]: `3 anomalies détectées totalisant 12 400 $. Deux paiements fournisseur en double et une dépense mal classée en Marketing.`,

  // Scene 3 — transcript
  [`Audit Q1 expenses...`]: `Auditer les dépenses T1…`,
  [`Analyzing expense data...`]: `Analyse des données de dépenses…`,
  [`calculate — 247 transactions`]: `calculer — 247 transactions`,
  [`search_knowledge — Q1 reports`]: `search_knowledge — rapports T1`,
  [`Found 3 anomalies...`]: `3 anomalies trouvées…`,
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
  [`User input`]: `Entrée utilisateur`,
  [`Thinking`]: `Réflexion`,
  [`Tool call`]: `Appel d\u2019outil`,
  [`Response`]: `Réponse`,

  // Scene 4 — tags & search
  [`#research`]: `#research`,
  [`Search. Tag. Organize.`]: `Chercher. Étiqueter. Organiser.`,

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
