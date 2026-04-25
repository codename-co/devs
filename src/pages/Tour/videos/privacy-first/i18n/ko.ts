/**
 * Tour-local i18n — Korean translations.
 *
 * Keys are the literal English strings from `./en.ts`. Every new string added
 * to the English source must be translated here.
 */
import type { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const ko: I18n = {
  // Scene 1 — hook
  [`What leaves your browser? Nothing.`]: `브라우저를 떠나는 건? 아무것도 없습니다.`,

  // Scene 2 — browser local
  [`IndexedDB`]: `IndexedDB`,
  [`Local storage`]: `로컬 스토리지`,
  [`Web Crypto`]: `Web Crypto`,
  [`Encrypted keys`]: `암호화된 키`,
  [`Service Worker`]: `Service Worker`,
  [`Offline ready`]: `오프라인 지원`,

  // Scene 3 — BYOK
  [`LLM Providers`]: `LLM 제공자`,
  [`OpenAI`]: `OpenAI`,
  [`Anthropic`]: `Anthropic`,
  [`Gemini`]: `Gemini`,
  [`Ollama`]: `Ollama`,
  [`OpenRouter`]: `OpenRouter`,
  [`Local (WebGPU)`]: `Local (WebGPU)`,
  [`Connected`]: `연결됨`,
  [`12+ providers. Your keys. Your choice.`]: `12개 이상의 제공자. 당신의 키. 당신의 선택.`,

  // Scene 4 — promise
  [`No server.`]: `서버 없음.`,
  [`No subscription.`]: `구독 없음.`,
  [`No third party.`]: `제3자 없음.`,
  [`Open source.`]: `오픈소스.`,
  [`OPEN SOURCE · BROWSER-NATIVE · YOURS`]: `오픈소스 · 브라우저 네이티브 · 당신의 것`,

  // Scene 5 — CTA
  [`Now you can.`]: `이제 할 수 있습니다.`,
  [`Open devs.new →`]: `devs.new 열기 →`,
  [`No signup · No install · Free`]: `가입 없음 · 설치 없음 · 무료`,

  // Playback bar — settings menu
  [`Speed`]: `속도`,
  [`Normal`]: `보통`,
  [`Language`]: `언어`,
  [`Keyboard shortcuts`]: `키보드 단축키`,

  // Playback bar — control titles
  [`Pause`]: `일시정지`,
  [`Play`]: `재생`,
  [`Unmute`]: `음소거 해제`,
  [`Mute`]: `음소거`,
  [`Exit full screen`]: `전체 화면 종료`,
  [`Full screen`]: `전체 화면`,
  [`Settings`]: `설정`,

  // Keyboard shortcut overlay — descriptions
  [`Play / Pause`]: `재생 / 일시정지`,
  [`Seek back 0.1 s`]: `0.1초 뒤로`,
  [`Seek forward 0.1 s`]: `0.1초 앞으로`,
  [`Seek back 1 s`]: `1초 뒤로`,
  [`Seek forward 1 s`]: `1초 앞으로`,
  [`Go to start`]: `처음으로`,
  [`Toggle mute`]: `음소거 전환`,
  [`Toggle full screen`]: `전체 화면 전환`,
  [`Show shortcuts`]: `단축키 보기`,
  [`Close this overlay`]: `닫기`,
}
