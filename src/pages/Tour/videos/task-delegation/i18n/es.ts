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
  [`Stop chatting. Start delegating.`]: `Deja de chatear. Empieza a delegar.`,

  // Scene 2 — prompt submit
  [`Audit Q1 expenses, flag anomalies, draft a CFO memo`]: `Auditar gastos del Q1, señalar anomalías, redactar un memo para el CFO`,

  // Scene 3 — board view (task titles)
  [`Parse invoices`]: `Analizar facturas`,
  [`Flag anomalies`]: `Señalar anomalías`,
  [`Cross-check budgets`]: `Cotejar presupuestos`,
  [`Summarize findings`]: `Resumir hallazgos`,
  [`Draft CFO memo`]: `Redactar memo CFO`,
  // Scene 3 — board view (task snippets)
  [`Extract line items from 247 invoices`]: `Extraer partidas de 247 facturas`,
  [`Identify outliers above 2σ threshold`]: `Identificar valores atípicos por encima del umbral 2σ`,
  [`Compare against Q4 budget allocations`]: `Comparar con las asignaciones presupuestarias del Q4`,
  [`Aggregate findings into executive bullets`]: `Agregar hallazgos en puntos ejecutivos`,
  [`Compose formal memo for CFO review`]: `Redactar memo formal para revisión del CFO`,
  // Scene 3 — agent roles
  [`Analysis`]: `Análisis`,
  [`Auditing`]: `Auditoría`,
  [`Writing`]: `Redacción`,

  // Scene 4 — artifacts
  [`Task completed`]: `Tarea completada`,
  [`3 agents collaborated`]: `3 agentes colaboraron`,
  [`Q1 Expense Audit`]: `Auditoría de gastos Q1`,
  [`report`]: `informe`,
  [`CFO Memo`]: `Memo CFO`,
  [`document`]: `documento`,

  // Scene 5 — collapse
  [`Delegated. Delivered. Done.`]: `Delegado. Entregado. Hecho.`,

  // Scene 6 — CTA
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
