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
  [`AI that reports back to you.`]: `결과를 보고하는 AI.`,

  // Scene 2 — inbox full
  [`Q1 Expense Audit`]: `1분기 비용 감사`,
  [`Blog post draft`]: `블로그 글 초안`,
  [`API documentation`]: `API 문서`,
  [`Market research`]: `시장 조사`,
  [`Code review: auth`]: `코드 리뷰: auth`,
  [`Weekly summary`]: `주간 요약`,
  [`Auditor`]: `Auditor`,
  [`Scribe`]: `Scribe`,
  [`DocBot`]: `DocBot`,
  [`Scout`]: `Scout`,
  [`Reviewer`]: `Reviewer`,
  [`Digest`]: `Digest`,
  [`2m ago`]: `2분 전`,
  [`15m ago`]: `15분 전`,
  [`1h ago`]: `1시간 전`,
  [`3h ago`]: `3시간 전`,
  [`5h ago`]: `5시간 전`,
  [`1d ago`]: `1일 전`,
  [`Found 3 anomalies in Q1 data…`]: `1분기 데이터에서 이상 항목 3건 발견…`,
  [`Here\u2019s a draft covering key topics…`]: `주요 주제를 다룬 초안입니다…`,
  [`Endpoints documented with examples…`]: `엔드포인트가 예제와 함께 문서화됨…`,
  [`Audit Q1 expenses and flag anomalies`]: `1분기 비용을 감사하고 이상 항목을 표시`,
  [`Analyzing expense data across departments…`]: `부서별 비용 데이터를 분석하는 중…`,
  [`Found 3 anomalies totaling $12,400. Two duplicate vendor payments and one misclassified expense in Marketing.`]: `총 $12,400에 해당하는 이상 항목 3건 발견. 공급업체 중복 결제 2건과 마케팅 부서 비용 오분류 1건.`,

  // Scene 3 — transcript
  [`Audit Q1 expenses...`]: `1분기 비용 감사…`,
  [`Analyzing expense data...`]: `비용 데이터 분석 중…`,
  [`calculate — 247 transactions`]: `calculate — 247건의 거래`,
  [`search_knowledge — Q1 reports`]: `search_knowledge — 1분기 보고서`,
  [`Found 3 anomalies...`]: `이상 항목 3건 발견…`,
  [`1.2s`]: `1.2s`,
  [`0.8s`]: `0.8s`,
  [`2.1s`]: `2.1s`,
  [`1.5s`]: `1.5s`,
  [`0.9s`]: `0.9s`,
  [`340 tok`]: `340 tok`,
  [`—`]: `—`,
  [`580 tok`]: `580 tok`,
  [`120 tok`]: `120 tok`,
  [`410 tok`]: `410 tok`,
  [`User input`]: `사용자 입력`,
  [`Thinking`]: `사고 중`,
  [`Tool call`]: `도구 호출`,
  [`Response`]: `응답`,

  // Scene 4 — tags & search
  [`#research`]: `#research`,
  [`Search. Tag. Organize.`]: `검색. 태그. 정리.`,

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
