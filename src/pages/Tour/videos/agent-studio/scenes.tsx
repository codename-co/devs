/**
 * Agent Studio tour — four custom scenes showcasing the full agent creation
 * flow: browse agents → AI-assisted wizard → form review → test playground.
 *
 * Scene 1 (SceneHook) and Scene 6 (SceneCTA) are shared components imported
 * directly in the composition. These four scenes are the video-specific ones.
 */
import { memo, useLayoutEffect, useMemo, useRef } from 'react'
import { useI18n } from '@/i18n'
import { AgentAvatar, Icon, MarkdownRenderer } from '@/components'
import {
  Breadcrumbs,
  Button,
  Input,
  ScrollShadow,
  TextArea,
} from '@heroui/react_3'
import {
  AgentCollection,
  Sidebar,
} from '@/pages/Workspace/components'
import type { Agent } from '@/types'
import {
  clamp,
  Easing,
  Sprite,
  useSprite,
  useStageSize,
  useTimeline,
} from '../../common/assets/player'
import { BrowserChrome, FakeCursor } from '../../common/primitives'
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

// ── Translated strings ────────────────────────────────────────────────────

interface StudioStrings {
  devs: string
  scout: string
  research: string
  forge: string
  analysis: string
  scribe: string
  writing: string
  echo: string
  review: string
  probe: string
  data: string
  lens: string
  vision: string
  marketScout: string
  competitiveAnalyst: string
  searchAgents: string
  noAgents: string
  aiDescription: string
  generatedName: string
  generatedRole: string
  generatedInstructions: string
  streamChunk1: string
  streamChunk2: string
  streamChunk3: string
  testUserMsg: string
  testAssistantMsg: string
  teamCaption: string
}

function useStudioStrings(): StudioStrings {
  const { t } = useI18n(agentStudioI18n)
  return useMemo(
    () => ({
      devs: t('DEVS'),
      scout: t('Scout'),
      research: t('Research'),
      forge: t('Forge'),
      analysis: t('Analysis'),
      scribe: t('Scribe'),
      writing: t('Writing'),
      echo: t('Echo'),
      review: t('Review'),
      probe: t('Probe'),
      data: t('Data'),
      lens: t('Lens'),
      vision: t('Vision'),
      marketScout: t('Market Scout'),
      competitiveAnalyst: t('Competitive Analyst'),
      searchAgents: t('Search agents…'),
      noAgents: t('No agents found'),
      aiDescription: t('An agent that monitors competitor pricing and product launches, then writes weekly briefs'),
      generatedName: t('Market Scout'),
      generatedRole: t('Competitive Analyst'),
      generatedInstructions: t(
        'Analyze competitor products, pricing strategies, and market positioning. Summarize findings into actionable briefs.',
      ),
      streamChunk1: t('Analyzing your description...'),
      streamChunk2: t('Generating agent configuration...'),
      streamChunk3: t('{"name": "Market Scout", "role": "Competitive Analyst"}'),
      testUserMsg: t('What are our main competitors doing in Q1?'),
      testAssistantMsg: t(
        'Based on my analysis, here are the key competitor moves this quarter:\n\n1. **Acme Corp** launched a freemium tier targeting SMBs\n2. **Globex** cut enterprise pricing by 15%\n3. **Initech** acquired a data analytics startup\n\nI recommend focusing on our mid-market positioning.',
      ),
      teamCaption: t('A team. Yours. Built in seconds.'),
    }),
    [t],
  )
}

function buildAgents(s: StudioStrings) {
  return [
    mockAgent('a1', s.scout, s.research, 'PcCheck'),
    mockAgent('a2', s.forge, s.analysis, 'GraphUp'),
    mockAgent('a3', s.scribe, s.writing, 'EditPencil'),
    mockAgent('a4', s.echo, s.review, 'DoubleCheck'),
    mockAgent('a5', s.probe, s.data, 'DataTransferBoth'),
    mockAgent('a6', s.lens, s.vision, 'Eye'),
  ]
}

// ── Scene 2: Browse agents → click "New agent" → wizard mode chooser (2.4–10s) ──

const BrowseContent = memo(function BrowseContent({
  agents,
  customAgentIds,
  showWizard,
  wizardOpacity,
  s,
}: {
  agents: Agent[]
  customAgentIds: Set<string>
  showWizard: boolean
  wizardOpacity: number
  s: StudioStrings
}) {
  return (
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
          selectedAgentId={showWizard ? 'new' : undefined}
          onSelectAgent={noop}
          onCreateAgent={noop}
          isLoading={false}
          search=""
          onSearchChange={noop}
          customAgentIds={customAgentIds}
          searchPlaceholder={s.searchAgents}
          emptyLabel={s.noAgents}
          noMatchLabel={s.noAgents}
          className={showWizard ? 'hidden md:flex' : 'flex'}
        />
        {showWizard && (
          <div
            className="hidden min-h-0 min-w-0 flex-1 md:block"
            style={{ opacity: wizardOpacity }}
          >
            <div className="h-full min-h-0 min-w-0 flex-col overflow-clip py-4 pl-0.5 pr-4 flex">
              <div className="bg-surface flex min-h-0 max-h-full flex-1 flex-col gap-4 overflow-clip rounded-2xl p-4 shadow-sm">
                {/* Breadcrumbs */}
                <div className="shrink-0">
                  <Breadcrumbs>
                    <Breadcrumbs.Item>Agents</Breadcrumbs.Item>
                    <Breadcrumbs.Item className="font-medium">New agent</Breadcrumbs.Item>
                  </Breadcrumbs>
                </div>
                {/* Mode chooser */}
                <ScrollShadow hideScrollBar className="min-h-0 flex-1 overflow-y-auto">
                  <div className="flex flex-col gap-4 py-1">
                    <div className="flex flex-col gap-1">
                      <h3 className="text-foreground text-base font-semibold">
                        How would you like to create your agent?
                      </h3>
                      <p className="text-muted text-xs leading-relaxed">
                        Choose your preferred approach. You can always switch later.
                      </p>
                    </div>
                    <div className="flex flex-col gap-3">
                      <div className="group flex items-start gap-4 rounded-xl border border-primary bg-primary/5 p-4 text-left">
                        <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
                          <Icon name="Sparks" size="md" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-foreground text-sm font-semibold">AI-Assisted</span>
                          <span className="text-muted text-xs leading-relaxed">
                            Describe what kind of agent you need in plain language. AI will
                            generate the name, role, and instructions for you.
                          </span>
                        </div>
                      </div>
                      <div className="group flex items-start gap-4 rounded-xl border p-4 text-left">
                        <div className="bg-secondary/10 text-secondary flex size-10 shrink-0 items-center justify-center rounded-lg">
                          <Icon name="PageEdit" size="md" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-foreground text-sm font-semibold">Manual Configuration</span>
                          <span className="text-muted text-xs leading-relaxed">
                            Set up everything yourself. Define the name, role, and
                            instructions from scratch.
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </ScrollShadow>
              </div>
            </div>
          </div>
        )}
      </div>
  )
})

function SceneBrowseAgentsInner() {
  const { localTime, duration } = useSprite()
  const { width: stageW, height: stageH } = useStageSize()
  const { resolveAnchor } = useTimeline()

  const s = useStudioStrings()
  const agents = useMemo(() => buildAgents(s), [s])
  const customAgentIds = useMemo(() => new Set(agents.map((a) => a.id)), [agents])

  const chromeInset = Math.round(Math.min(40, Math.max(8, stageW * 0.031)))
  const showCursor = stageW >= 600

  const exitT = clamp((localTime - (duration - 0.5)) / 0.5, 0, 1)
  const exitOpacity = 1 - exitT

  // Chrome entrance
  const chromeIn = Easing.easeOutBack(clamp(localTime / 0.5, 0, 1))
  const chromeScale = 0.96 + 0.04 * chromeIn
  const chromeOpacity = clamp(localTime / 0.4, 0, 1)

  // Cursor → "New agent" button
  const CURSOR_START = 2.0
  const CURSOR_ARRIVE = 3.2
  const CLICK_START = 3.2
  const CLICK_END = 3.5
  const WIZARD_START = 3.8

  const cursorEndPos = resolveAnchor?.('[data-tour-anchor="new-agent"]') ?? {
    x: 0.22 * stageW,
    y: 0.22 * stageH,
  }
  const cursorStartPos = { x: stageW * 0.5, y: stageH * 0.7 }

  let cursorX = cursorStartPos.x
  let cursorY = cursorStartPos.y
  let cursorOpacity = 0
  let clickProgress = 0

  if (showCursor && localTime >= CURSOR_START) {
    cursorOpacity = clamp((localTime - CURSOR_START) / 0.3, 0, 1)
    const moveT = Easing.easeInOutCubic(
      clamp((localTime - CURSOR_START) / (CURSOR_ARRIVE - CURSOR_START), 0, 1),
    )
    cursorX = cursorStartPos.x + (cursorEndPos.x - cursorStartPos.x) * moveT
    cursorY = cursorStartPos.y + (cursorEndPos.y - cursorStartPos.y) * moveT
  }
  if (showCursor && localTime >= CLICK_START && localTime < CLICK_END) {
    clickProgress = (localTime - CLICK_START) / (CLICK_END - CLICK_START)
  }

  const showWizard = localTime >= WIZARD_START
  const wizardOpacity = Easing.easeOutCubic(clamp((localTime - WIZARD_START) / 0.6, 0, 1))

  const opacityRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    if (opacityRef.current) opacityRef.current.style.opacity = String(exitOpacity)
  })

  return (
    <div ref={opacityRef} style={{ position: 'absolute', inset: 0 }}>
      <BrowserChrome
        inset={chromeInset}
        url="devs.new/agents"
        tabTitle={s.devs}
        scale={chromeScale}
        opacity={chromeOpacity}
      >
        <BrowseContent
          agents={agents}
          customAgentIds={customAgentIds}
          showWizard={showWizard}
          wizardOpacity={wizardOpacity}
          s={s}
        />
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

export function SceneBrowseAgents({ start = 2.4, end = 10 }: SceneProps) {
  return (
    <Sprite start={start} end={end}>
      <SceneBrowseAgentsInner />
    </Sprite>
  )
}

// ── Scene 3: AI-assisted describe → streaming preview (9.9–17s) ──

const AIDescribeContent = memo(function AIDescribeContent({
  typedDescription,
  isGenerating,
  streamPreview,
  showGenButton,
  s,
  chromeInset,
  agents,
  customAgentIds,
}: {
  typedDescription: string
  isGenerating: boolean
  streamPreview: string
  showGenButton: boolean
  s: StudioStrings
  chromeInset: number
  agents: Agent[]
  customAgentIds: Set<string>
}) {
  return (
    <BrowserChrome inset={chromeInset} url="devs.new/agents/new" tabTitle={s.devs}>
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
          selectedAgentId="new"
          onSelectAgent={noop}
          isLoading={false}
          search=""
          onSearchChange={noop}
          customAgentIds={customAgentIds}
          searchPlaceholder={s.searchAgents}
          emptyLabel={s.noAgents}
          noMatchLabel={s.noAgents}
          className="hidden md:flex"
        />
        <div className="hidden min-h-0 min-w-0 flex-1 md:block">
          <div className="h-full min-h-0 min-w-0 flex-col overflow-clip py-4 pl-0.5 pr-4 flex">
            <div className="bg-surface flex min-h-0 max-h-full flex-1 flex-col gap-4 overflow-clip rounded-2xl p-4 shadow-sm">
              {/* Breadcrumbs */}
              <div className="shrink-0">
                <Breadcrumbs>
                  <Breadcrumbs.Item>Agents</Breadcrumbs.Item>
                  <Breadcrumbs.Item>New agent</Breadcrumbs.Item>
                  <Breadcrumbs.Item className="font-medium">AI</Breadcrumbs.Item>
                </Breadcrumbs>
              </div>
              {/* AI describe content */}
              <ScrollShadow hideScrollBar className="min-h-0 flex-1 overflow-y-auto">
                <div className="flex flex-col gap-4 py-1">
                  <div className="flex flex-col gap-1">
                    <h3 className="text-foreground text-base font-semibold">
                      Describe your agent
                    </h3>
                    <p className="text-muted text-xs leading-relaxed">
                      Tell us what kind of agent you want and we&apos;ll generate its
                      name, role, and instructions automatically.
                    </p>
                  </div>

                  <TextArea
                    variant="secondary"
                    value={typedDescription}
                    placeholder="e.g., A friendly cooking assistant..."
                    rows={3}
                    readOnly
                  />

                  {/* Streaming preview */}
                  {isGenerating && streamPreview && (
                    <div className="bg-default-50 rounded-lg border p-3">
                      <div className="mb-2 flex items-center gap-2">
                        <div className="bg-primary size-1.5 animate-pulse rounded-full" />
                        <span className="text-muted text-xs">Generating agent...</span>
                      </div>
                      <div className="text-foreground max-h-40 overflow-y-auto text-xs leading-relaxed">
                        <MarkdownRenderer content={streamPreview} />
                      </div>
                    </div>
                  )}

                  {/* Thinking dots */}
                  {isGenerating && !streamPreview && (
                    <div className="flex items-center gap-2 py-2">
                      <div className="bg-default-200 size-1.5 animate-pulse rounded-full" />
                      <div className="bg-default-200 size-1.5 animate-pulse rounded-full [animation-delay:150ms]" />
                      <div className="bg-default-200 size-1.5 animate-pulse rounded-full [animation-delay:300ms]" />
                      <span className="text-muted text-xs">Thinking...</span>
                    </div>
                  )}

                  {/* Generate button */}
                  {showGenButton && !isGenerating && (
                    <div className="flex items-center gap-3">
                      <Button size="sm" variant="primary" isDisabled={!typedDescription}>
                        <Icon name="Sparks" size="xs" />
                        Generate Agent
                      </Button>
                    </div>
                  )}
                </div>
              </ScrollShadow>
            </div>
          </div>
        </div>
      </div>
    </BrowserChrome>
  )
})

function SceneAIDescribeInner() {
  const { localTime, duration } = useSprite()
  const { width: stageW } = useStageSize()

  const s = useStudioStrings()
  const agents = useMemo(() => buildAgents(s), [s])
  const customAgentIds = useMemo(() => new Set(agents.map((a) => a.id)), [agents])

  const enterT = Easing.easeOutCubic(clamp(localTime / 0.5, 0, 1))
  const exitT = clamp((localTime - (duration - 0.5)) / 0.5, 0, 1)
  const opacity = enterT * (1 - exitT)

  const chromeInset = Math.round(Math.min(40, Math.max(8, stageW * 0.031)))

  // Timeline: type description (0.5–2.5s), click generate (2.8s), thinking (2.8–3.5s), stream (3.5–5.5s)
  const fullDesc = s.aiDescription
  const typeProgress = clamp((localTime - 0.5) / 2.0, 0, 1)
  const charsShown = Math.floor(fullDesc.length * typeProgress)
  const typedDescription = fullDesc.slice(0, charsShown)

  const isGenerating = localTime >= 2.8
  const showGenButton = localTime >= 2.3 && localTime < 2.8

  // Stream preview chunks
  const fullStream = `${s.streamChunk1}\n\n${s.streamChunk2}\n\n\`\`\`json\n${s.streamChunk3}\n\`\`\``
  const streamStart = 3.5
  const streamEnd = 5.5
  const streamProgress = clamp((localTime - streamStart) / (streamEnd - streamStart), 0, 1)
  const streamCharsShown = Math.floor(fullStream.length * streamProgress)
  const streamPreview = localTime >= streamStart ? fullStream.slice(0, streamCharsShown) : ''

  const opacityRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    if (opacityRef.current) opacityRef.current.style.opacity = String(opacity)
  })

  return (
    <div ref={opacityRef} style={{ position: 'absolute', inset: 0, opacity }}>
      <AIDescribeContent
        typedDescription={typedDescription}
        isGenerating={isGenerating}
        streamPreview={streamPreview}
        showGenButton={showGenButton}
        s={s}
        chromeInset={chromeInset}
        agents={agents}
        customAgentIds={customAgentIds}
      />
    </div>
  )
}

export function SceneAIDescribe({ start = 9.9, end = 17 }: SceneProps) {
  return (
    <Sprite start={start} end={end}>
      <SceneAIDescribeInner />
    </Sprite>
  )
}

// ── Scene 4: Form review → click "Test first" (16.9–23s) ──

const FormReviewContent = memo(function FormReviewContent({
  name,
  role,
  instructions,
  showTestHighlight,
  s,
  chromeInset,
  agents,
  customAgentIds,
}: {
  name: string
  role: string
  instructions: string
  showTestHighlight: boolean
  s: StudioStrings
  chromeInset: number
  agents: Agent[]
  customAgentIds: Set<string>
}) {
  return (
    <BrowserChrome inset={chromeInset} url="devs.new/agents/new" tabTitle={s.devs}>
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
          selectedAgentId="new"
          onSelectAgent={noop}
          isLoading={false}
          search=""
          onSearchChange={noop}
          customAgentIds={customAgentIds}
          searchPlaceholder={s.searchAgents}
          emptyLabel={s.noAgents}
          noMatchLabel={s.noAgents}
          className="hidden md:flex"
        />
        <div className="hidden min-h-0 min-w-0 flex-1 md:block">
          <div className="h-full min-h-0 min-w-0 flex-col overflow-clip py-4 pl-0.5 pr-4 flex">
            <div className="bg-surface flex min-h-0 max-h-full flex-1 flex-col gap-4 overflow-clip rounded-2xl p-4 shadow-sm">
              {/* Breadcrumbs */}
              <div className="shrink-0">
                <Breadcrumbs>
                  <Breadcrumbs.Item>Agents</Breadcrumbs.Item>
                  <Breadcrumbs.Item>New agent</Breadcrumbs.Item>
                  <Breadcrumbs.Item className="font-medium">Edit</Breadcrumbs.Item>
                </Breadcrumbs>
              </div>
              {/* Form */}
              <div className="flex min-h-0 flex-1 flex-col">
                <ScrollShadow hideScrollBar className="min-h-0 flex-1 overflow-y-auto">
                  <div className="flex flex-col gap-5 py-1">
                    <div className="flex flex-col gap-1">
                      <h3 className="text-foreground text-base font-semibold">Agent configuration</h3>
                      <p className="text-muted text-xs leading-relaxed">
                        Define your agent&apos;s identity and behavior. All fields are editable.
                      </p>
                    </div>
                    {/* Name */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <Icon name="UserCircle" size="sm" className="text-muted" />
                        <span className="text-muted text-xs font-medium uppercase tracking-wide">
                          Name<span className="text-danger ml-0.5">*</span>
                        </span>
                      </div>
                      <Input variant="secondary" value={name} readOnly />
                    </div>
                    {/* Role */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <Icon name="UserCircle" size="sm" className="text-muted" />
                        <span className="text-muted text-xs font-medium uppercase tracking-wide">
                          Role<span className="text-danger ml-0.5">*</span>
                        </span>
                      </div>
                      <Input variant="secondary" value={role} readOnly />
                    </div>
                    {/* Instructions */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <Icon name="PageEdit" size="sm" className="text-muted" />
                        <span className="text-muted text-xs font-medium uppercase tracking-wide">
                          Instructions
                        </span>
                      </div>
                      <TextArea
                        variant="secondary"
                        value={instructions}
                        rows={4}
                        readOnly
                      />
                    </div>
                  </div>
                </ScrollShadow>
                {/* Action bar */}
                <div className="flex shrink-0 items-center gap-3 border-t pt-3 mt-3">
                  <Button size="sm" variant="primary">
                    <Icon name="Check" size="xs" />
                    Create Agent
                  </Button>
                  <Button
                    size="sm"
                    variant={showTestHighlight ? 'primary' : 'secondary'}
                    data-tour-anchor="test-button"
                  >
                    <Icon name="Play" size="xs" />
                    Test first
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </BrowserChrome>
  )
})

function SceneFormReviewInner() {
  const { localTime, duration } = useSprite()
  const { width: stageW, height: stageH } = useStageSize()
  const { resolveAnchor } = useTimeline()

  const s = useStudioStrings()
  const agents = useMemo(() => buildAgents(s), [s])
  const customAgentIds = useMemo(() => new Set(agents.map((a) => a.id)), [agents])

  const enterT = Easing.easeOutCubic(clamp(localTime / 0.5, 0, 1))
  const exitT = clamp((localTime - (duration - 0.5)) / 0.5, 0, 1)
  const opacity = enterT * (1 - exitT)

  const chromeInset = Math.round(Math.min(40, Math.max(8, stageW * 0.031)))

  // Cursor → "Test first" button at ~3.5s
  const showCursor = stageW >= 600
  const CURSOR_START = 2.5
  const CURSOR_ARRIVE = 3.5
  const CLICK_START = 3.5
  const CLICK_END = 3.8

  const showTestHighlight = localTime >= CLICK_START

  const cursorEndPos = resolveAnchor?.('[data-tour-anchor="test-button"]') ?? {
    x: 0.55 * stageW,
    y: 0.85 * stageH,
  }
  const cursorStartPos = { x: stageW * 0.5, y: stageH * 0.4 }

  let cursorX = cursorStartPos.x
  let cursorY = cursorStartPos.y
  let cursorOpacity = 0
  let clickProgress = 0

  if (showCursor && localTime >= CURSOR_START) {
    cursorOpacity = clamp((localTime - CURSOR_START) / 0.3, 0, 1)
    const moveT = Easing.easeInOutCubic(
      clamp((localTime - CURSOR_START) / (CURSOR_ARRIVE - CURSOR_START), 0, 1),
    )
    cursorX = cursorStartPos.x + (cursorEndPos.x - cursorStartPos.x) * moveT
    cursorY = cursorStartPos.y + (cursorEndPos.y - cursorStartPos.y) * moveT
  }
  if (showCursor && localTime >= CLICK_START && localTime < CLICK_END) {
    clickProgress = (localTime - CLICK_START) / (CLICK_END - CLICK_START)
  }

  const opacityRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    if (opacityRef.current) opacityRef.current.style.opacity = String(opacity)
  })

  return (
    <div ref={opacityRef} style={{ position: 'absolute', inset: 0, opacity }}>
      <FormReviewContent
        name={s.generatedName}
        role={s.generatedRole}
        instructions={s.generatedInstructions}
        showTestHighlight={showTestHighlight}
        s={s}
        chromeInset={chromeInset}
        agents={agents}
        customAgentIds={customAgentIds}
      />

      {showCursor && cursorOpacity > 0 && (
        <FakeCursor
          x={cursorX}
          y={cursorY}
          opacity={cursorOpacity * (1 - exitT)}
          clickProgress={clickProgress}
        />
      )}
    </div>
  )
}

export function SceneFormReview({ start = 16.9, end = 23 }: SceneProps) {
  return (
    <Sprite start={start} end={end}>
      <SceneFormReviewInner />
    </Sprite>
  )
}

// ── Scene 5: Test playground with mock conversation (22.9–30s) ──

interface PlaygroundContentProps {
  agent: Agent
  showUserMsg: boolean
  showAssistantMsg: boolean
  assistantText: string
  s: StudioStrings
  chromeInset: number
  agents: Agent[]
  customAgentIds: Set<string>
}

const PlaygroundContent = memo(function PlaygroundContent({
  agent,
  showUserMsg,
  showAssistantMsg,
  assistantText,
  s,
  chromeInset,
  agents,
  customAgentIds,
}: PlaygroundContentProps) {
  return (
    <BrowserChrome inset={chromeInset} url="devs.new/agents/new" tabTitle={s.devs}>
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
          selectedAgentId="new"
          onSelectAgent={noop}
          isLoading={false}
          search=""
          onSearchChange={noop}
          customAgentIds={customAgentIds}
          searchPlaceholder={s.searchAgents}
          emptyLabel={s.noAgents}
          noMatchLabel={s.noAgents}
          className="hidden md:flex"
        />
        <div className="hidden min-h-0 min-w-0 flex-1 md:block">
          <div className="h-full min-h-0 min-w-0 flex-col overflow-clip py-4 pl-0.5 pr-4 flex">
            <div className="bg-surface flex min-h-0 max-h-full flex-1 flex-col gap-3 overflow-clip rounded-2xl p-4 shadow-sm">
              {/* Breadcrumbs */}
              <div className="shrink-0">
                <Breadcrumbs>
                  <Breadcrumbs.Item>Agents</Breadcrumbs.Item>
                  <Breadcrumbs.Item>New agent</Breadcrumbs.Item>
                  <Breadcrumbs.Item className="font-medium">Test</Breadcrumbs.Item>
                </Breadcrumbs>
              </div>

              {/* Chat area — mimics PlaygroundTab layout */}
              <ScrollShadow hideScrollBar className="min-h-0 flex-1 overflow-y-auto">
                <div className="flex flex-col gap-4 py-2">
                  {!showUserMsg && (
                    <div className="text-muted flex flex-col items-center justify-center gap-2 py-8 text-center">
                      <AgentAvatar agent={agent} size="lg" />
                      <p className="text-sm font-medium">{agent.name}</p>
                      <p className="text-xs">{agent.role}</p>
                    </div>
                  )}
                  {showUserMsg && (
                    <div className="flex justify-end">
                      <div className="bg-primary/10 max-w-[80%] rounded-2xl rounded-tr-sm px-4 py-2.5">
                        <p className="text-foreground text-sm">{s.testUserMsg}</p>
                      </div>
                    </div>
                  )}
                  {showAssistantMsg && (
                    <div className="flex items-start gap-2">
                      <AgentAvatar agent={agent} size="sm" />
                      <div className="bg-default-100 max-w-[80%] rounded-2xl rounded-tl-sm px-4 py-2.5">
                        <div className="text-foreground text-sm leading-relaxed">
                          <MarkdownRenderer content={assistantText} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollShadow>

              {/* Mock prompt area */}
              <div className="shrink-0 border-t pt-3">
                <div className="bg-default-100 rounded-xl px-4 py-2.5">
                  <p className="text-muted text-sm">Test your agent...</p>
                </div>
              </div>

              {/* Action bar */}
              <div className="flex shrink-0 items-center gap-3 border-t pt-3">
                <Button size="sm" variant="primary">
                  <Icon name="Check" size="xs" />
                  Create Agent
                </Button>
                <div className="flex-1" />
                <Button size="sm" variant="ghost" className="text-muted">
                  <Icon name="ArrowLeft" size="xs" />
                  Back to configure
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </BrowserChrome>
  )
})

function SceneTestPlaygroundInner() {
  const { localTime, duration } = useSprite()
  const { width: stageW } = useStageSize()

  const s = useStudioStrings()
  const agents = useMemo(() => buildAgents(s), [s])
  const customAgentIds = useMemo(() => new Set(agents.map((a) => a.id)), [agents])

  const agent = useMemo<Agent>(
    () => mockAgent('tour-market-scout', s.generatedName, s.generatedRole, 'PcCheck'),
    [s],
  )

  const enterT = Easing.easeOutCubic(clamp(localTime / 0.5, 0, 1))
  const exitT = clamp((localTime - (duration - 0.5)) / 0.5, 0, 1)
  const opacity = enterT * (1 - exitT)

  const chromeInset = Math.round(Math.min(40, Math.max(8, stageW * 0.031)))

  // Timeline: show user message (1.0s), start streaming assistant (1.8s–4.5s)
  const showUserMsg = localTime >= 1.0
  const STREAM_START = 1.8
  const STREAM_END = 4.5
  const showAssistantMsg = localTime >= STREAM_START

  const fullResponse = s.testAssistantMsg
  const streamProgress = clamp((localTime - STREAM_START) / (STREAM_END - STREAM_START), 0, 1)
  const charsShown = Math.floor(fullResponse.length * streamProgress)
  const assistantText = fullResponse.slice(0, charsShown)

  const opacityRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    if (opacityRef.current) opacityRef.current.style.opacity = String(opacity)
  })

  return (
    <div ref={opacityRef} style={{ position: 'absolute', inset: 0, opacity }}>
      <PlaygroundContent
        agent={agent}
        showUserMsg={showUserMsg}
        showAssistantMsg={showAssistantMsg}
        assistantText={assistantText}
        s={s}
        chromeInset={chromeInset}
        agents={agents}
        customAgentIds={customAgentIds}
      />
    </div>
  )
}

export function SceneTestPlayground({ start = 22.9, end = 30 }: SceneProps) {
  return (
    <Sprite start={start} end={end}>
      <SceneTestPlaygroundInner />
    </Sprite>
  )
}
