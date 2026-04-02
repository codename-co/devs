import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const fr: I18n = {
  // LivePage
  'Speech-to-Text Provider': 'Fournisseur de reconnaissance vocale',
  'Text-to-Speech Provider': 'Fournisseur de synthèse vocale',
  Local: 'Local',
  Cloud: 'Cloud',
  'Speak to microphone': 'Parlez dans le microphone',
  'Stop speaking': 'Arrêter la lecture',
  'Speak transcript': 'Lire la transcription',
  'Voice Settings': 'Paramètres vocaux',
  // STT Providers
  'Fast but requires internet.': 'Rapide mais nécessite internet.',
  'Web Speech API is not supported in this browser':
    "L'API Web Speech n'est pas prise en charge par ce navigateur",
  Moonshine: 'Moonshine',
  'Fast local transcription (~200ms). English only. ~166MB download.':
    'Transcription locale rapide (~200ms). Anglais uniquement. ~166 Mo à télécharger.',
  'Moonshine only supports English':
    "Moonshine ne prend en charge que l'anglais",
  Whisper: 'Whisper',
  'High quality, multilingual. ~500MB download.':
    'Haute qualité, multilingue. ~500 Mo à télécharger.',
  'Granite Speech': 'Granite Speech',
  'Multilingual, keyword biasing. Requires WebGPU. ~600MB download.':
    'Multilingue, biais par mots-clés. Nécessite WebGPU. ~600 Mo à télécharger.',
  'Granite Speech requires WebGPU': 'Granite Speech nécessite WebGPU',
  Parakeet: 'Parakeet',
  'NVIDIA SOTA. Auto-punctuation. English & French. ~2.5GB download.':
    'NVIDIA SOTA. Ponctuation auto. Anglais et français. ~2,5 Go à télécharger.',
  'Cohere Transcribe': 'Cohere Transcribe',
  'SOTA multilingual (14 langs). 2B params, 4-bit. ~2.1GB download.':
    'SOTA multilingue (14 langues). 2B params, 4-bit. ~2,1 Go à télécharger.',
  'Bidirectional audio with Gemini. Requires API key.':
    'Audio bidirectionnel avec Gemini. Nécessite une clé API.',
  // TTS Providers
  'Instant but robotic.': 'Instantané mais robotique.',
  'SOTA quality, 4-bit quantized. (↓ ~154MB)':
    'Qualité SOTA, quantifié 4-bit. (↓ ~154 Mo)',
  'Natural voice with Gemini. Requires API key.':
    'Voix naturelle avec Gemini. Nécessite une clé API.',
  Browser: 'Navigateur',
  Kokoro: 'Kokoro',
  'Gemini Live': 'Gemini Live',
  'Text-to-Speech voice': 'Voix de synthèse vocale',
  // Agent & Chat
  'Select an agent': 'Sélectionner un agent',
  'Thinking…': 'Réflexion en cours…',
  Stop: 'Arrêter',
  'Auto-speak responses': 'Lecture automatique des réponses',
  'Automatically speak AI responses using TTS':
    "Lire automatiquement les réponses de l'IA avec la synthèse vocale",
  'No AI provider configured': 'Aucun fournisseur LLM configuré',
  'Please configure an AI provider in Settings to use voice chat.':
    'Veuillez configurer un fournisseur LLM dans les paramètres pour utiliser le chat vocal.',
  Send: 'Envoyer',
  'Listening…': 'Écoute en cours…',
}
