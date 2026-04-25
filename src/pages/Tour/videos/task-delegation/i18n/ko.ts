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
  [`Stop chatting. Start delegating.`]: `채팅을 멈추세요. 위임을 시작하세요.`,

  // Scene 2 — prompt submit
  [`Audit Q1 expenses, flag anomalies, draft a CFO memo`]: `Q1 비용 감사, 이상 항목 표시, CFO 메모 작성`,

  // Scene 3 — board view (task titles)
  [`Parse invoices`]: `송장 분석`,
  [`Flag anomalies`]: `이상 항목 표시`,
  [`Cross-check budgets`]: `예산 교차 검증`,
  [`Summarize findings`]: `결과 요약`,
  [`Draft CFO memo`]: `CFO 메모 초안`,
  // Scene 3 — board view (task snippets)
  [`Extract line items from 247 invoices`]: `247개 송장에서 항목 추출`,
  [`Identify outliers above 2σ threshold`]: `2σ 임계값 초과 이상값 식별`,
  [`Compare against Q4 budget allocations`]: `Q4 예산 배정과 비교`,
  [`Aggregate findings into executive bullets`]: `결과를 핵심 요점으로 종합`,
  [`Compose formal memo for CFO review`]: `CFO 검토용 공식 메모 작성`,
  // Scene 3 — agent roles
  [`Analysis`]: `분석`,
  [`Auditing`]: `감사`,
  [`Writing`]: `작성`,

  // Scene 4 — artifacts
  [`Task completed`]: `작업 완료`,
  [`3 agents collaborated`]: `3명의 에이전트가 협업`,
  [`Q1 Expense Audit`]: `Q1 비용 감사`,
  [`report`]: `보고서`,
  [`CFO Memo`]: `CFO 메모`,
  [`document`]: `문서`,

  // Scene 5 — collapse
  [`Delegated. Delivered. Done.`]: `위임. 완료. 끝.`,

  // Scene 6 — CTA
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
