import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const es: I18n = {
  // LivePage
  'Speech-to-Text Provider': 'Proveedor de voz a texto',
  'Text-to-Speech Provider': 'Proveedor de texto a voz',
  Local: 'Local',
  Cloud: 'Nube',
  'Speak to microphone': 'Habla al micrófono',
  'Stop speaking': 'Dejar de hablar',
  'Speak transcript': 'Leer transcripción',
  'Voice Settings': 'Configuración de voz',
  // STT Providers
  'Fast but requires internet.': 'Rápido pero requiere internet.',
  'Web Speech API is not supported in this browser':
    'La API Web Speech no es compatible con este navegador',
  Moonshine: 'Moonshine',
  'Fast local transcription (~200ms). English only. ~166MB download.':
    'Transcripción local rápida (~200ms). Solo inglés. ~166 MB de descarga.',
  'Moonshine only supports English': 'Moonshine solo admite inglés',
  Whisper: 'Whisper',
  'High quality, multilingual. ~500MB download.':
    'Alta calidad, multilingüe. ~500 MB de descarga.',
  'Bidirectional audio with Gemini. Requires API key.':
    'Audio bidireccional con Gemini. Requiere clave API.',
  // TTS Providers
  'Instant but robotic.': 'Instantáneo pero robótico.',
  'SOTA quality, 4-bit quantized. (↓ ~154MB)':
    'Calidad SOTA, cuantizado 4-bit. (↓ ~154 MB)',
  'Natural voice with Gemini. Requires API key.':
    'Voz natural con Gemini. Requiere clave API.',
  Browser: 'Navegador',
  Kokoro: 'Kokoro',
  'Gemini Live': 'Gemini Live',
  'Text-to-Speech voice': 'Voz de texto a voz',
  // Agent & Chat
  'Select an agent': 'Seleccionar un agente',
  'Thinking…': 'Pensando…',
  Stop: 'Detener',
  'Auto-speak responses': 'Leer respuestas automáticamente',
  'Automatically speak AI responses using TTS':
    'Leer automáticamente las respuestas de IA usando síntesis de voz',
  'No AI provider configured': 'No hay proveedor LLM configurado',
  'Please configure an AI provider in Settings to use voice chat.':
    'Por favor configure un proveedor LLM en Configuración para usar el chat de voz.',
  Send: 'Enviar',
  'Listening…': 'Escuchando…',
}
