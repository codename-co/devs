import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const ar: I18n = {
  // LivePage
  'Speech-to-Text Provider': 'مزود تحويل الكلام إلى نص',
  'Text-to-Speech Provider': 'مزود تحويل النص إلى كلام',
  Local: 'محلي',
  Cloud: 'سحابي',
  'Speak to microphone': 'تحدث إلى الميكروفون',
  'Stop speaking': 'إيقاف الكلام',
  'Speak transcript': 'قراءة النص',
  'Voice Settings': 'إعدادات الصوت',
  // STT Providers
  'Fast but requires internet.': 'سريع لكن يتطلب الإنترنت.',
  'Web Speech API is not supported in this browser':
    'واجهة برمجة تطبيقات الكلام غير مدعومة في هذا المتصفح',
  Moonshine: 'Moonshine',
  'Fast local transcription (~200ms). English only. ~166MB download.':
    'نسخ محلي سريع (~200 مللي ثانية). الإنجليزية فقط. ~166 ميجابايت للتحميل.',
  'Moonshine only supports English': 'Moonshine يدعم الإنجليزية فقط',
  Whisper: 'Whisper',
  'High quality, multilingual. ~500MB download.':
    'جودة عالية، متعدد اللغات. ~500 ميجابايت للتحميل.',
  'Bidirectional audio with Gemini. Requires API key.':
    'صوت ثنائي الاتجاه مع Gemini. يتطلب مفتاح API.',
  // TTS Providers
  'Instant but robotic.': 'فوري لكن آلي.',
  'SOTA quality, 4-bit quantized. (↓ ~154MB)':
    'جودة SOTA، مضغوط 4-بت. (↓ ~154 ميغابايت)',
  'Natural voice with Gemini. Requires API key.':
    'صوت طبيعي مع Gemini. يتطلب مفتاح API.',
  Browser: 'المتصفح',
  Kokoro: 'Kokoro',
  'Gemini Live': 'Gemini Live',
  'Text-to-Speech voice': 'صوت تحويل النص إلى كلام',
  // Agent & Chat
  'Select an agent': 'اختر وكيلاً',
  'Thinking…': 'جارٍ التفكير…',
  Stop: 'إيقاف',
  'Auto-speak responses': 'قراءة الردود تلقائياً',
  'Automatically speak AI responses using TTS':
    'قراءة ردود الذكاء الاصطناعي تلقائياً باستخدام تحويل النص إلى كلام',
  'No LLM provider configured': 'لم يتم تكوين مزود LLM',
  'Please configure an LLM provider in Settings to use voice chat.':
    'يرجى تكوين مزود LLM في الإعدادات لاستخدام الدردشة الصوتية.',
  Send: 'إرسال',
  'Listening…': 'جارٍ الاستماع…',
}
