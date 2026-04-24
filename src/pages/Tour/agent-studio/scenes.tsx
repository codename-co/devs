/**
 * Agent Studio tour — three custom scenes.
 *
 * Scene 1 (SceneHook) and Scene 5 (SceneCTA) are shared components
 * imported directly in the composition. These three scenes are the
 * video-specific ones.
 *
 * All three scenes use real V2 components (AgentCollection, AgentPreview,
 * AgentAvatar, Sidebar) fed with mock Agent data so the tour always shows
 * the actual product UI — no replicas to keep in sync.
 */
import { memo, useMemo } from 'react'
import { useI18n } from '@/i18n'
import { AgentAvatar } from '@/components'
import { AgentCollection, AgentPreview, Sidebar } from '@/pages/V2/components'
import type { Agent } from '@/types'
import { clamp, Easing, Sprite, useSprite, useStageSize } from '../player'
import { BrowserChrome, FakeCursor } from '../primitives'
import agentStudioI18n from './i18n'

// ── Helpers ───────────────────────────────────────────────────────────────

interface SceneProps {
  start?: number
  end?: number
}

function mockAgent(
  id: string,
  name: string,
  role: string,
  icon: string,
): Agent {
  return {
    id,
    slug: name.toLowerCase().replace(/\s+/g, '-'),
    name,
    role,
    icon: icon as Agent['icon'],
    instructions: '',
    createdAt: new Date(0),
  }
}

const noop = () => {}

// ── Scene 2: BrowserAgents (2.4 – 10s) ───────────────────────────────────

export function SceneBrowserAgents({ start = 2.4, end = 10 }: SceneProps) {
  return (
    <Sprite start={start} end={end}>
      {() => <SceneBrowserAgentsInner />}
    </Sprite>
  )
}

function SceneBrowserAgentsInner() {
  const { t } = useI18n(agentStudioI18n)
  const { width: stageW, height: stageH } = useStageSize()
  const { localTime, duration } = useSprite()

  const agents = useMemo<Agent[]>(
    () => [
      mockAgent('a1', t('Scout'), t('Research'), 'PcCheck'),
      mockAgent('a2', t('Forge'), t('Analysis'), 'GraphUp'),
      mockAgent('a3', t('Scribe'), t('Writing'), 'EditPencil'),
      mockAgent('a4', t('Echo'), t('Review'), 'DoubleCheck'),
      mockAgent('a5', t('Probe'), t('Data'), 'DataTransferBoth'),
      mockAgent('a6', t('Lens'), t('Vision'), 'Eye'),
    ],
    [t],
  )

  const marketScout = useMemo<Agent>(
    () => mockAgent('tour-market-scout', t('Market Scout'), t('Competitive Analyst'), 'PcCheck'),
    [t],
  )

  const customAgentIds = useMemo(
    () => new Set([...agents.map((a) => a.id), marketScout.id]),
    [agents, marketScout],
  )

  const chromeInset = Math.round(Math.min(40, Math.max(8, stageW * 0.031)))
  const showCursor = stageW >= 600

  const time = localTime
  const exitT = clamp((time - (duration - 0.5)) / 0.5, 0, 1)
  const exitOpacity = 1 - exitT

  // Chrome entrance
  const chromeIn = Easing.easeOutBack(clamp(time / 0.5, 0, 1))
  const chromeScale = 0.96 + 0.04 * chromeIn
  const chromeOpacity = clamp(time / 0.4, 0, 1)

  // Cursor glide to "New agent" button (top of the collection panel)
  const CURSOR_START = 2.0
  const CURSOR_ARRIVE = 3.2
  const CLICK_START = 3.2
  const CLICK_END = 3.5

  const newBtnFrac = { x: 0.22, y: 0.22 }
  const cursorStartPos = { x: stageW * 0.5, y: stageH * 0.7 }
  const cursorEndPos = { x: newBtnFrac.x * stageW, y: newBtnFrac.y * stageH }

  let cursorX = cursorStartPos.x
  let cursorY = cursorStartPos.y
  let cursorOpacity = 0
  let clickProgress = 0

  if (showCursor && time >= CURSOR_START) {
    cursorOpacity = clamp((time - CURSOR_START) / 0.3, 0, 1)
    const moveT = Easing.easeInOutCubic(
      clamp((time - CURSOR_START) / (CURSOR_ARRIVE - CURSOR_START), 0, 1),
    )
    cursorX = cursorStartPos.x + (cursorEndPos.x - cursorStartPos.x) * moveT
    cursorY = cursorStartPos.y + (cursorEndPos.y - cursorStartPos.y) * moveT
  }
  if (showCursor && time >= CLICK_START && time < CLICK_END) {
    clickProgress = (time - CLICK_START) / (CLICK_END - CLICK_START)
  }

  // Preview panel slides in after the "New agent" click
  const PREVIEW_START = 3.8
  const previewT = Easing.easeOutCubic(clamp((time - PREVIEW_START) / 0.6, 0, 1))
  const showPreview = time >= PREVIEW_START

  return (
    <div style={{ position: 'absolute', inset: 0, opacity: exitOpacity }}>
      <BrowserChrome
        inset={chromeInset}
        url="devs.new/v2/agents"
        tabTitle={t('DEVS')}
        scale={chromeScale}
        opacity={chromeOpacity}
      >
        {/* Real V2 agents page layout: Sidebar | AgentCollection | AgentPreview */}
        <div className="bg-background flex h-full w-full overflow-hidden">
          <div className="shrink-0">
            <Sidebar
              isCollapsed
              activeFilter="agents"
              onFilterChange={noop}
              onOpenSettings={noop}
            />
          </div>
          <AgentCollection
            agents={agents}
            selectedAgentId={showPreview ? marketScout.id : undefined}
            onSelectAgent={noop}
            onCreateAgent={noop}
            isLoading={false}
            search=""
            onSearchChange={noop}
            customAgentIds={customAgentIds}
            searchPlaceholder={t('Search agents…')}
            emptyLabel={t('No agents found')}
            noMatchLabel={t('No agents found')}
            className={showPreview ? 'hidden md:flex' : 'flex'}
          />
          {showPreview && (
            <div
              className="hidden min-h-0 min-w-0 flex-1 md:block"
              style={{ opacity: previewT }}
            >
              <AgentPreview
                agent={marketScout}
                selectedId={marketScout.id}
                isCustom
                onStartConversation={noop}
                onDeselect={noop}
              />
            </div>
          )}
        </div>
      </BrowserChrome>

      {showCursor && cursorOpacity > 0 && (
        <FakeCursor
          x={cursorX}
          y={cursorY}
          opacity={cursorOpacity * exitOpacity}
          clickProgress={clickProgress}
        />
      )}
    </div>
  )
}

// ── Scene 3: AgentConfig (9.9 – 17s) ─────────────────────────────────────

export function SceneAgentConfig({ start = 9.9, end = 17 }: SceneProps) {
  return (
    <Sprite start={start} end={end}>
      {() => <SceneAgentConfigInner />}
    </Sprite>
  )
}

/**
 * Memoized browser content for SceneAgentConfig.
 * Accepts the market scout agent (with progressively revealed instructions)
 * and the stable sidebar / collection agents so React.memo can bail out when
 * the instructions string value hasn't changed between frames.
 */
interface AgentConfigContentProps {
  agent: Agent
  sidebarAgents: Agent[]
  customAgentIds: Set<string>
  chromeInset: number
  devsLabel: string
  searchPlaceholder: string
  emptyLabel: string
}

const AgentConfigContent = memo(function AgentConfigContent({
  agent,
  sidebarAgents,
  customAgentIds,
  chromeInset,
  devsLabel,
  searchPlaceholder,
  emptyLabel,
}: AgentConfigContentProps) {
  return (
    <BrowserChrome
      inset={chromeInset}
      url={`devs.new/v2/agents/${agent.slug}`}
      tabTitle={devsLabel}
    >
      <div className="bg-background flex h-full w-full overflow-hidden">
        <div className="shrink-0">
          <Sidebar
            isCollapsed
            activeFilter="agents"
            onFilterChange={noop}
            onOpenSettings={noop}
          />
        </div>
        <AgentCollection
          agents={sidebarAgents}
          selectedAgentId={agent.id}
          onSelectAgent={noop}
          isLoading={false}
          search=""
          onSearchChange={noop}
          customAgentIds={customAgentIds}
          searchPlaceholder={searchPlaceholder}
          emptyLabel={emptyLabel}
          noMatchLabel={emptyLabel}
          className="hidden md:flex"
        />
        <div className="min-h-0 min-w-0 flex-1">
          <AgentPreview
            agent={agent}
            selectedId={agent.id}
            isCustom
            onStartConversation={noop}
            onDeselect={noop}
          />
        </div>
      </div>
    </BrowserChrome>
  )
})

function SceneAgentConfigInner() {
  const { t } = useI18n(agentStudioI18n)
  const { width: stageW } = useStageSize()
  const { localTime, duration } = useSprite()

  const fullInstructions = t(
    'Analyze competitor products, pricing strategies, and market positioning. Summarize findings into actionable briefs.',
  )

  const baseAgent = useMemo<Agent>(
    () => mockAgent('tour-market-scout', t('Market Scout'), t('Competitive Analyst'), 'PcCheck'),
    [t],
  )

  const sidebarAgents = useMemo<Agent[]>(
    () => [
      baseAgent,
      mockAgent('a1', t('Scout'), t('Research'), 'PcCheck'),
      mockAgent('a2', t('Forge'), t('Analysis'), 'GraphUp'),
      mockAgent('a3', t('Scribe'), t('Writing'), 'EditPencil'),
    ],
    [t, baseAgent],
  )

  const customAgentIds = useMemo(
    () => new Set(sidebarAgents.map((a) => a.id)),
    [sidebarAgents],
  )

  const time = localTime
  const enterT = Easing.easeOutCubic(clamp(time / 0.5, 0, 1))
  const exitT = clamp((time - (duration - 0.5)) / 0.5, 0, 1)
  const opacity = enterT * (1 - exitT)

  // Stream instructions into the ProfileTab's editable field
  const STREAM_START = 1.2
  const STREAM_END = 2.6
  const streamProgress = clamp(
    (time - STREAM_START) / (STREAM_END - STREAM_START),
    0,
    1,
  )
  const shownChars = Math.floor(streamProgress * fullInstructions.length)
  const visibleInstructions = fullInstructions.slice(0, shownChars)

  const agent = useMemo<Agent>(
    () => ({ ...baseAgent, instructions: visibleInstructions }),
    [baseAgent, visibleInstructions],
  )

  const chromeInset = Math.round(Math.min(40, Math.max(8, stageW * 0.031)))

  return (
    <div style={{ position: 'absolute', inset: 0, opacity }}>
      <AgentConfigContent
        agent={agent}
        sidebarAgents={sidebarAgents}
        customAgentIds={customAgentIds}
        chromeInset={chromeInset}
        devsLabel={t('DEVS')}
        searchPlaceholder={t('Search agents…')}
        emptyLabel={t('No agents found')}
      />
    </div>
  )
}

const TEAM_AGENTS: Agent[] = [
  mockAgent('tour-scout', 'Scout', 'Research', 'PcCheck'),
  mockAgent('tour-forge', 'Forge', 'Analysis', 'GraphUp'),
  mockAgent('tour-scribe', 'Scribe', 'Writing', 'EditPencil'),
  mockAgent('tour-echo', 'Echo', 'Review', 'DoubleCheck'),
]

export function SceneTeamGlance({ start = 16.9, end = 22 }: SceneProps) {
  const { t } = useI18n(agentStudioI18n)
  const { width: stageW, height: stageH } = useStageSize()

  return (
    <Sprite start={start} end={end}>
      {({ localTime, duration }) => {
        const time = localTime
        const enterT = Easing.easeOutCubic(clamp(time / 0.5, 0, 1))
        const exitT = clamp((time - (duration - 0.5)) / 0.5, 0, 1)
        const opacity = enterT * (1 - exitT)

        const captionT = clamp((time - 3.2) / 0.5, 0, 1)
        const captionOut = clamp((time - (duration - 0.6)) / 0.5, 0, 1)

        const cardSize = Math.min(160, Math.max(90, stageW * 0.15))
        const gridGap = Math.max(12, Math.min(24, stageW * 0.022))
        const nameFz = Math.max(12, Math.min(16, stageW * 0.017))
        const roleFz = Math.max(10, Math.min(13, stageW * 0.014))
        const captionFz = Math.round(Math.max(16, stageW * 0.036))

        return (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'oklch(12% 0.0015 253.83)',
              opacity,
            }}
          >
            {/* 2×2 grid */}
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: '46%',
                transform: 'translate(-50%, -50%)',
                display: 'grid',
                gridTemplateColumns: `${cardSize}px ${cardSize}px`,
                gap: gridGap,
              }}
            >
              {TEAM_AGENTS.map((agent, i) => {
                const delay = 0.4 + i * 0.4
                const cardT = Easing.easeOutBack(
                  clamp((time - delay) / 0.5, 0, 1),
                )
                return (
                  <div
                    key={agent.id}
                    style={{
                      width: cardSize,
                      height: cardSize,
                      borderRadius: 16,
                      background: '#1a1d22',
                      border: '1px solid #24262b',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      opacity: cardT,
                      transform: `scale(${0.85 + 0.15 * cardT})`,
                    }}
                  >
                    <AgentAvatar agent={agent} size="lg" />
                    <div style={{ textAlign: 'center' }}>
                      <div
                        style={{
                          fontSize: nameFz,
                          fontWeight: 600,
                          color: '#f2f4f8',
                          fontFamily: 'Figtree, system-ui, sans-serif',
                        }}
                      >
                        {t(agent.name as Parameters<typeof t>[0])}
                      </div>
                      <div
                        style={{
                          fontSize: roleFz,
                          color: '#636b78',
                          fontFamily: 'Figtree, system-ui, sans-serif',
                        }}
                      >
                        {t(agent.role as Parameters<typeof t>[0])}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Caption */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: stageH * 0.1,
                textAlign: 'center',
                fontFamily: "'Unbounded', Georgia, serif",
                fontStyle: 'italic',
                fontSize: captionFz,
                color: '#f2f4f8',
                letterSpacing: '-0.01em',
                opacity: captionT * (1 - captionOut),
                transform: `translateY(${(1 - captionT) * 14}px)`,
                padding: '0 10%',
              }}
            >
              {t('A team. Yours. Built in seconds.')}
            </div>
          </div>
        )
      }}
    </Sprite>
  )
}
