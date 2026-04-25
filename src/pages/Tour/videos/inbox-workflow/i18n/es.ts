/**
 * Tour-local i18n — Spanish translations.
 *
 * Keys are the literal English strings from `./en.ts`. Every new string added
 * to the English source must be translated here.
 */
import type { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const es: I18n = {
  // Scene 1 — hook
  [`AI that reports back to you.`]: `IA que te informa.`,

  // Scene 2 — inbox full
  [`Q1 Expense Audit`]: `Auditoría de gastos T1`,
  [`Blog post draft`]: `Borrador de artículo`,
  [`API documentation`]: `Documentación de API`,
  [`Market research`]: `Estudio de mercado`,
  [`Code review: auth`]: `Revisión de código: auth`,
  [`Weekly summary`]: `Resumen semanal`,
  [`Auditor`]: `Auditor`,
  [`Scribe`]: `Scribe`,
  [`DocBot`]: `DocBot`,
  [`Scout`]: `Scout`,
  [`Reviewer`]: `Reviewer`,
  [`Digest`]: `Digest`,
  [`2m ago`]: `hace 2 min`,
  [`15m ago`]: `hace 15 min`,
  [`1h ago`]: `hace 1 h`,
  [`3h ago`]: `hace 3 h`,
  [`5h ago`]: `hace 5 h`,
  [`1d ago`]: `hace 1 d`,
  [`Found 3 anomalies in Q1 data…`]: `3 anomalías encontradas en los datos del T1…`,
  [`Here\u2019s a draft covering key topics…`]: `Aquí tienes un borrador sobre los temas clave…`,
  [`Endpoints documented with examples…`]: `Endpoints documentados con ejemplos…`,
  [`Audit Q1 expenses and flag anomalies`]: `Auditar gastos del T1 y señalar anomalías`,
  [`Analyzing expense data across departments…`]: `Analizando datos de gastos por departamento…`,
  [`Found 3 anomalies totaling $12,400. Two duplicate vendor payments and one misclassified expense in Marketing.`]: `3 anomalías detectadas por un total de 12.400 $. Dos pagos duplicados a proveedores y un gasto mal clasificado en Marketing.`,

  // Scene 3 — transcript
  [`Audit Q1 expenses...`]: `Auditar gastos del T1…`,
  [`Analyzing expense data...`]: `Analizando datos de gastos…`,
  [`calculate — 247 transactions`]: `calculate — 247 transacciones`,
  [`search_knowledge — Q1 reports`]: `search_knowledge — informes T1`,
  [`Found 3 anomalies...`]: `3 anomalías encontradas…`,
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
  [`User input`]: `Entrada del usuario`,
  [`Thinking`]: `Pensando`,
  [`Tool call`]: `Llamada a herramienta`,
  [`Response`]: `Respuesta`,

  // Scene 4 — tags & search
  [`#research`]: `#research`,
  [`Search. Tag. Organize.`]: `Buscar. Etiquetar. Organizar.`,

  // Scene 5 — CTA
  [`Now you can.`]: `Ahora puedes.`,
  [`Open devs.new →`]: `Abrir devs.new →`,
  [`No signup · No install · Free`]: `Sin registro · Sin instalación · Gratis`,

  // Playback bar — settings menu
  [`Speed`]: `Velocidad`,
  [`Normal`]: `Normal`,
  [`Language`]: `Idioma`,
  [`Keyboard shortcuts`]: `Atajos de teclado`,

  // Playback bar — control titles
  [`Pause`]: `Pausa`,
  [`Play`]: `Reproducir`,
  [`Unmute`]: `Activar sonido`,
  [`Mute`]: `Silenciar`,
  [`Exit full screen`]: `Salir de pantalla completa`,
  [`Full screen`]: `Pantalla completa`,
  [`Settings`]: `Ajustes`,

  // Keyboard shortcut overlay — descriptions
  [`Play / Pause`]: `Reproducir / Pausa`,
  [`Seek back 0.1 s`]: `Retroceder 0,1 s`,
  [`Seek forward 0.1 s`]: `Avanzar 0,1 s`,
  [`Seek back 1 s`]: `Retroceder 1 s`,
  [`Seek forward 1 s`]: `Avanzar 1 s`,
  [`Go to start`]: `Ir al inicio`,
  [`Toggle mute`]: `Alternar silencio`,
  [`Toggle full screen`]: `Alternar pantalla completa`,
  [`Show shortcuts`]: `Mostrar atajos`,
  [`Close this overlay`]: `Cerrar`,
}
