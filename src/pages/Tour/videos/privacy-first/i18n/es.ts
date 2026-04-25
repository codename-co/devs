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
  [`What leaves your browser? Nothing.`]: `¿Qué sale de tu navegador? Nada.`,

  // Scene 2 — browser local
  [`IndexedDB`]: `IndexedDB`,
  [`Local storage`]: `Almacenamiento local`,
  [`Web Crypto`]: `Web Crypto`,
  [`Encrypted keys`]: `Claves cifradas`,
  [`Service Worker`]: `Service Worker`,
  [`Offline ready`]: `Listo sin conexión`,

  // Scene 3 — BYOK
  [`LLM Providers`]: `Proveedores LLM`,
  [`OpenAI`]: `OpenAI`,
  [`Anthropic`]: `Anthropic`,
  [`Gemini`]: `Gemini`,
  [`Ollama`]: `Ollama`,
  [`OpenRouter`]: `OpenRouter`,
  [`Local (WebGPU)`]: `Local (WebGPU)`,
  [`Connected`]: `Conectado`,
  [`12+ providers. Your keys. Your choice.`]: `12+ proveedores. Tus claves. Tu elección.`,

  // Scene 4 — promise
  [`No server.`]: `Sin servidor.`,
  [`No subscription.`]: `Sin suscripción.`,
  [`No third party.`]: `Sin terceros.`,
  [`Open source.`]: `Código abierto.`,
  [`OPEN SOURCE · BROWSER-NATIVE · YOURS`]: `OPEN SOURCE · NATIVO DEL NAVEGADOR · TUYO`,

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
