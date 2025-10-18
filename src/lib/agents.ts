import { Agent } from '@/types'
import { IconName } from './types'

/**
 * Define category display names
 */
export const agentCategoryNames = {
  default: '',
  scientist: 'Scientists',
  advisor: 'Advisors',
  artist: 'Artists',
  philosopher: 'Philosophers',
  musician: 'Musicians',
  developer: 'Developers',
  writer: 'Writers',
  other: 'Other Agents',
} as const

/**
 * Define category display names
 */
export const agentTheme = {
  scientist: 'Learn',
  psychologist: 'Life',
  advisor: 'Life',
  artist: 'Art',
  philosopher: 'Learn',
  musician: 'Art',
  writer: 'Writing',
  developer: 'Coding',
} as const

export const agentThemeIcon: Record<
  (typeof agentTheme)[keyof typeof agentTheme],
  IconName
> = {
  Writing: 'EditPencil',
  Learn: 'GraduationCap',
  Life: 'CoffeeCup',
  Art: 'Palette',
  Coding: 'Code',
} as const

export const agentThemes = (agents: Agent[]) =>
  Array.from(
    agents.reduce((themes, agent) => {
      const tag = agent.tags?.[0]
      if (tag) {
        const theme = (agentTheme as any)[tag]
        if (theme) themes.add(theme)
      }
      return themes
    }, new Set<string>()),
  ).sort((a, b) => a.localeCompare(b) + 2)

/**
 * Order items by a hash function based on the day of the year to ensure
 * a different but consistent order each day.
 */
const orderByHashByDay = <T extends { id: string }>(items: T[]) => {
  const dayOfYear = Math.floor(
    (new Date().getTime() -
      new Date(new Date().getFullYear(), 0, 0).getTime()) /
      (1000 * 60 * 60 * 24),
  )

  return items.slice().sort((a, b) => {
    const hashA = (a.id.charCodeAt(0) + dayOfYear) % 100
    const hashB = (b.id.charCodeAt(0) + dayOfYear) % 100
    return hashA - hashB
  })
}

export const useCasesByThemes = (agents: Agent[]) =>
  agentThemes(agents)
    .map((theme) => ({
      theme,
      usecases: agents
        .filter((agent) => {
          const tag = agent.tags?.[0]
          return tag && (agentTheme as any)[tag] === theme
        })
        .flatMap(
          (agent) =>
            agent.examples?.map((example) => ({ ...example, agent })) || [],
        ),
    }))
    .map((group) => ({
      ...group,
      usecases: orderByHashByDay(group.usecases).slice(0, 5),
    })) // .sort(() => Math.random() - 0.5)
