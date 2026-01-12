import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const ko: I18n = {
  // LivePage
  'Speech-to-Text Provider': '음성 인식 제공자',
  'Text-to-Speech Provider': '음성 합성 제공자',
  Local: '로컬',
  Cloud: '클라우드',
  'Speak to microphone': '마이크에 말하기',
  'Stop speaking': '말하기 중지',
  'Speak transcript': '텍스트 읽기',
  'Voice Settings': '음성 설정',
  // STT Providers
  'Fast but requires internet.': '빠르지만 인터넷이 필요합니다.',
  'Web Speech API is not supported in this browser':
    '이 브라우저에서 Web Speech API가 지원되지 않습니다',
  Moonshine: 'Moonshine',
  'Fast local transcription (~200ms). English only. ~166MB download.':
    '빠른 로컬 전사 (~200ms). 영어만 지원. ~166MB 다운로드.',
  'Moonshine only supports English': 'Moonshine은 영어만 지원합니다',
  Whisper: 'Whisper',
  'High quality, multilingual. ~500MB download.':
    '고품질, 다국어 지원. ~500MB 다운로드.',
  'Bidirectional audio with Gemini. Requires API key.':
    'Gemini와 양방향 오디오. API 키 필요.',
  // TTS Providers
  'Instant but robotic.': '즉시 사용 가능하지만 기계적인 음성.',
  'SOTA quality, 4-bit quantized. (↓ ~154MB)':
    'SOTA 품질, 4비트 양자화. (↓ ~154MB)',
  'Natural voice with Gemini. Requires API key.':
    'Gemini로 자연스러운 음성. API 키 필요.',
  Browser: '브라우저',
  Kokoro: 'Kokoro',
  'Gemini Live': 'Gemini Live',
  'Text-to-Speech voice': '음성 합성 음성',
  // Agent & Chat
  'Select an agent': '에이전트 선택',
  'Thinking…': '생각 중…',
  Stop: '중지',
  'Auto-speak responses': '자동 응답 읽기',
  'Automatically speak AI responses using TTS':
    'TTS를 사용하여 AI 응답을 자동으로 읽기',
  'No LLM provider configured': 'LLM 제공자가 구성되지 않음',
  'Please configure an LLM provider in Settings to use voice chat.':
    '음성 채팅을 사용하려면 설정에서 LLM 제공자를 구성하세요.',
  Send: '보내기',
  'Listening…': '듣는 중…',
}
