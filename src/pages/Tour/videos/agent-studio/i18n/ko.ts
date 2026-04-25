/**
 * Tour-local i18n — Korean translations.
 *
 * Keys are the literal English strings from `./en.ts`. Every new string added
 * to the English source must be translated here.
 */
import type { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const ko: I18n = {
  // Browser chrome
  [`DEVS`]: `DEVS`,

  // Scene 1 — hook caption
  [`What if AI worked your way?`]: `AI가 당신의 방식대로 일한다면?`,

  // Scene 2 — browser agents
  [`New agent`]: `새 에이전트`,
  [`Create a custom agent`]: `맞춤 에이전트 만들기`,
  [`Scout`]: `Scout`,
  [`Research`]: `리서치`,
  [`Forge`]: `Forge`,
  [`Analysis`]: `분석`,
  [`Scribe`]: `Scribe`,
  [`Writing`]: `작성`,
  [`Echo`]: `Echo`,
  [`Review`]: `검토`,
  [`Probe`]: `Probe`,
  [`Data`]: `데이터`,
  [`Lens`]: `Lens`,
  [`Vision`]: `비전`,
  [`Market Scout`]: `Market Scout`,
  [`Competitive Analyst`]: `경쟁 분석가`,

  // Scene 3 — agent config
  [`Profile`]: `프로필`,
  [`Name`]: `이름`,
  [`Role`]: `역할`,
  [`Instructions`]: `지침`,
  [`Analyze competitor products, pricing strategies, and market positioning. Summarize findings into actionable briefs.`]: `경쟁사 제품, 가격 전략, 시장 포지셔닝을 분석합니다. 결과를 실행 가능한 브리핑으로 요약합니다.`,
  [`Context`]: `컨텍스트`,
  [`Knowledge`]: `지식`,
  [`market-report-q3.pdf`]: `market-report-q3.pdf`,
  [`competitor-matrix.csv`]: `competitor-matrix.csv`,
  [`Skills`]: `스킬`,
  [`Web research`]: `웹 리서치`,
  [`Settings`]: `설정`,
  [`Model`]: `모델`,
  [`GPT-4o`]: `GPT-4o`,
  [`Temperature`]: `온도`,
  [`0.7`]: `0.7`,

  // Scene 4 — team glance
  [`A team. Yours. Built in seconds.`]: `팀. 당신의 팀. 몇 초 만에 완성.`,

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
