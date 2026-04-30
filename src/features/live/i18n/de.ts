import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const de: I18n = {
  // LivePage
  'Speech-to-Text Provider': 'Sprache-zu-Text-Anbieter',
  'Text-to-Speech Provider': 'Text-zu-Sprache-Anbieter',
  Local: 'Lokal',
  Cloud: 'Cloud',
  'Speak to microphone': 'Ins Mikrofon sprechen',
  'Stop speaking': 'Sprechen beenden',
  'Speak transcript': 'Transkript vorlesen',
  'Voice Settings': 'Spracheinstellungen',
  // STT Providers
  'Fast but requires internet.': 'Schnell, aber erfordert Internet.',
  'Web Speech API is not supported in this browser':
    'Die Web Speech API wird in diesem Browser nicht unterstützt',
  Moonshine: 'Moonshine',
  'Fast local transcription (~200ms). English only. ~166MB download.':
    'Schnelle lokale Transkription (~200ms). Nur Englisch. ~166 MB Download.',
  'Moonshine only supports English': 'Moonshine unterstützt nur Englisch',
  Whisper: 'Whisper',
  'High quality, multilingual. ~500MB download.':
    'Hohe Qualität, mehrsprachig. ~500 MB Download.',
  'Granite Speech': 'Granite Speech',
  'Multilingual, keyword biasing. Requires WebGPU. ~600MB download.':
    'Mehrsprachig, Schlüsselwort-Bias. Erfordert WebGPU. ~600 MB Download.',
  'Granite Speech requires WebGPU': 'Granite Speech erfordert WebGPU',
  Parakeet: 'Parakeet',
  'NVIDIA SOTA. Auto-punctuation. English & French. ~2.5GB download.':
    'NVIDIA SOTA. Auto-Interpunktion. Englisch und Französisch. ~2,5 GB Download.',
  'Cohere Transcribe': 'Cohere Transcribe',
  'SOTA multilingual (14 langs). 2B params, 4-bit. ~2.1GB download.':
    'SOTA mehrsprachig (14 Sprachen). 2B Params, 4-Bit. ~2,1 GB Download.',
  VibeVoice: 'VibeVoice',
  'Microsoft open-source real-time speech. Requires WebGPU. ~500MB download.':
    'Microsoft Open-Source Echtzeit-Sprache. Erfordert WebGPU. ~500 MB Download.',
  'VibeVoice requires WebGPU': 'VibeVoice erfordert WebGPU',
  'Bidirectional audio with Gemini. Requires API key.':
    'Bidirektionales Audio mit Gemini. API-Schlüssel erforderlich.',
  // TTS Providers
  'Instant but robotic.': 'Sofort, aber roboterhaft.',
  'SOTA quality, 4-bit quantized. (↓ ~154MB)':
    'SOTA-Qualität, 4-bit quantisiert. (↓ ~154 MB)',
  'Natural voice with Gemini. Requires API key.':
    'Natürliche Stimme mit Gemini. API-Schlüssel erforderlich.',
  Browser: 'Browser',
  Kokoro: 'Kokoro',
  'Gemini Live': 'Gemini Live',
  'Text-to-Speech voice': 'Text-zu-Sprache-Stimme',
  // Agent & Chat
  'Select an agent': 'Agent auswählen',
  'Thinking…': 'Denke nach…',
  Stop: 'Stopp',
  'Auto-speak responses': 'Antworten automatisch vorlesen',
  'Automatically speak AI responses using TTS':
    'KI-Antworten automatisch mit Sprachsynthese vorlesen',
  'No AI provider configured': 'Kein LLM-Anbieter konfiguriert',
  'Please configure an AI provider in Settings to use voice chat.':
    'Bitte konfigurieren Sie einen LLM-Anbieter in den Einstellungen, um den Sprachchat zu nutzen.',
  Send: 'Senden',
  'Listening…': 'Höre zu…',
}
