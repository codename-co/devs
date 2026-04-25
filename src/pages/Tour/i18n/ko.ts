import type { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const ko: I18n = {
  // Gallery page
  [`DEVS Tours`]: `DEVS 투어`,
  [`Explore the platform in 30-second videos`]: `30초 영상으로 플랫폼을 탐색하세요`,

  // Video titles
  [`Product Tour`]: `제품 투어`,
  [`Agent Studio`]: `에이전트 스튜디오`,
  [`Task Delegation`]: `작업 위임`,
  [`Privacy First`]: `프라이버시 우선`,
  [`Inbox Workflow`]: `받은 편지함 워크플로`,

  // Video descriptions
  [`The full DEVS story in 30 seconds`]: `30초로 보는 DEVS의 모든 것`,
  [`Build your own AI team`]: `나만의 AI 팀을 구성하세요`,
  [`Delegate, don\u2019t chat`]: `채팅 말고 위임하세요`,
  [`Your keys. Your data. Your browser.`]: `당신의 키. 당신의 데이터. 당신의 브라우저.`,
  [`Your AI inbox`]: `AI 받은 편지함`,

  // Navigation
  [`\u2190 All tours`]: `\u2190 모든 투어`,
}
