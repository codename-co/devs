/**
 * Tour-local i18n — Spanish translations.
 *
 * Keys are the literal English strings from `./en.ts`. Every new string added
 * to the English source must be translated here.
 */
import type { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const es: I18n = {
  // Browser chrome
  [`DEVS`]: `DEVS`,

  // Scene 1 — hook caption
  [`What if AI worked your way?`]: `¿Y si la IA trabajara a tu manera?`,

  // Scene 2 — browser agents
  [`New agent`]: `Nuevo agente`,
  [`Create a custom agent`]: `Crear un agente personalizado`,
  [`Scout`]: `Scout`,
  [`Research`]: `Investigación`,
  [`Forge`]: `Forge`,
  [`Analysis`]: `Análisis`,
  [`Scribe`]: `Scribe`,
  [`Writing`]: `Redacción`,
  [`Echo`]: `Echo`,
  [`Review`]: `Revisión`,
  [`Probe`]: `Probe`,
  [`Data`]: `Datos`,
  [`Lens`]: `Lens`,
  [`Vision`]: `Visión`,
  [`Market Scout`]: `Market Scout`,
  [`Competitive Analyst`]: `Analista competitivo`,

  // Scene 3 — agent config
  [`Profile`]: `Perfil`,
  [`Name`]: `Nombre`,
  [`Role`]: `Rol`,
  [`Instructions`]: `Instrucciones`,
  [`Analyze competitor products, pricing strategies, and market positioning. Summarize findings into actionable briefs.`]: `Analizar productos de la competencia, estrategias de precios y posicionamiento en el mercado. Resumir hallazgos en informes accionables.`,
  [`Context`]: `Contexto`,
  [`Knowledge`]: `Conocimiento`,
  [`market-report-q3.pdf`]: `market-report-q3.pdf`,
  [`competitor-matrix.csv`]: `competitor-matrix.csv`,
  [`Skills`]: `Habilidades`,
  [`Web research`]: `Investigación web`,
  [`Settings`]: `Ajustes`,
  [`Model`]: `Modelo`,
  [`GPT-4o`]: `GPT-4o`,
  [`Temperature`]: `Temperatura`,
  [`0.7`]: `0.7`,

  // Scene 4 — team glance
  [`A team. Yours. Built in seconds.`]: `Un equipo. El tuyo. Creado en segundos.`,

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
