/**
 * DEVS product tour — five-scene timeline.
 *
 * Each scene is a `<Sprite start={…} end={…}>` that renders its children
 * only while the Stage playhead is inside its window and exposes the local
 * time / progress via the `useSprite()` hook.
 *
 * Scenes 1 and 2 render the real `<NewTaskHero />` inside a mock browser
 * chrome so the demo always shows the actual home page — no replicas to
 * keep in sync. Scenes 3-5 use the real `<DevsIcon />` (via a small
 * `TourSphere` wrapper that adds sizing + glow).
 */
import { memo, useLayoutEffect, useMemo, useRef } from 'react'
import { useI18n } from '@/i18n'
import { NewTaskHero } from '@/pages/V2/pages/NewTaskHero'
import { Sidebar, ThreadList, ThreadPreview } from '@/pages/V2/components'
import type { Thread } from '@/pages/V2/types'
import type { Agent, Artifact, MessageStep, Task } from '@/types'
import {
  clamp,
  Easing,
  Sprite,
  useSprite,
  useStageSize,
  useTimeline,
} from '../../common/assets/player'
import { BrowserChrome, BrowserChromeTyping } from '../../common/primitives'
import { FakeCursor } from '../../common/primitives'
import {
  SceneCollapse as SharedSceneCollapse,
  ScenePromise as SharedScenePromise,
  SceneCTA as SharedSceneCTA,
} from '../../common/scenes'
import tourI18n from './i18n'

// ── Scene 1: Browser opens, prompt appears, submit clicked ───────────────
// 0–4.0s — tight opening. We skip the 5× URL zoom and per-char typing that
// used to burn ~6s. The point of Scene 1 is to establish "it's a browser
// tab" — the product payoff lives in Scene 2.
interface SceneProps {
  start?: number
  end?: number
}

export function SceneOpen({ start = 0, end = 4.0 }: SceneProps) {
  const { t } = useI18n(tourI18n)
  const { width: stageW, height: stageH } = useStageSize()
  const { resolveAnchor } = useTimeline()
  const prompt = t(
    'Research how 5 major cities are adapting to climate change, compare their strategies, and draft a presentation briefing for city planners.',
  )

  const toCursor = (frac: { x: number; y: number }) => ({
    x: frac.x * stageW,
    y: frac.y * stageH,
  })

  // Timeline (scene-local seconds):
  //   0.00 – 0.35  hook "What if you could delegate anything?" fades in
  //   0.35 – 0.70  hook holds
  //   0.70 – 1.10  hook fades out
  //   0.80 – 1.30  chrome eases in
  //   1.40 – 2.20  URL "devs.new" types
  //   1.80 – 2.60  home page fades in with prompt already filled
  //   2.40 – 3.20  cursor glides from off-stage to submit
  //   3.20 – 3.45  cursor clicks submit (ripple)
  //   3.60 – 4.00  scene fades out into SceneSwarm
  const CURSOR_ENTER = 2.4
  const MOVE_END = 3.2
  const CLICK_END = 3.45

  return (
    <Sprite start={start} end={end}>
      {({ localTime, duration }) => {
        const time = localTime
        const exitT = clamp((time - (duration - 0.4)) / 0.4, 0, 1)
        const exitOpacity = 1 - exitT

        // Opening hook — fades in before the browser appears, fades out as chrome comes in.
        const hookIn = clamp(time / 0.35, 0, 1)
        const hookOut = clamp((time - 0.7) / 0.4, 0, 1)
        const hookOpacity = hookIn * (1 - hookOut)

        const chromeIn = Easing.easeOutBack(clamp((time - 0.8) / 0.5, 0, 1))
        const chromeScale = 0.96 + 0.04 * chromeIn
        const chromeOpacity = clamp((time - 0.8) / 0.4, 0, 1)
        const urlProgress = clamp((time - 1.4) / 0.8, 0, 1)
        const pageIn = Easing.easeOutCubic(clamp((time - 1.8) / 0.8, 0, 1))

        // Responsive chrome inset: shrinks to ~8px on phones, caps at 80px on
        // wide screens — mirrors how the real app fills the viewport on mobile.
        const chromeInset = Math.round(
          Math.min(80, Math.max(8, stageW * 0.062)),
        )
        // Cursor fractions are calibrated for inset=80; suppress on mobile.
        const showCursor = stageW >= 700

        // Cursor — glide off-stage → submit, then click. The submit target
        // is resolved from the real PromptArea every frame so it tracks the
        // actual button position through responsive / zoom layout changes;
        // the fractional value is only used as a fallback before the page
        // has mounted.
        const cursorOff = toCursor(CURSOR_OFF_FRAC)
        const cursorSubmit =
          resolveAnchor?.('#prompt-area button[type="submit"]') ??
          toCursor(CURSOR_SUBMIT_FRAC)
        let cursorPos: { x: number; y: number } | null = null
        if (showCursor && time >= CURSOR_ENTER && time < MOVE_END) {
          cursorPos = lerpPoint(
            cursorOff,
            cursorSubmit,
            (time - CURSOR_ENTER) / (MOVE_END - CURSOR_ENTER),
          )
        } else if (showCursor && time >= MOVE_END) {
          cursorPos = cursorSubmit
        }
        const click =
          showCursor && time >= MOVE_END && time < CLICK_END
            ? (time - MOVE_END) / (CLICK_END - MOVE_END)
            : 0

        return (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              opacity: exitOpacity,
            }}
          >
            <BrowserChromeTyping
              inset={chromeInset}
              urlText="devs.new"
              urlProgress={urlProgress}
              scale={chromeScale}
              opacity={chromeOpacity}
              tabTitle={false}
            >
              {/* Real product home page inside the browser body. */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  opacity: pageIn,
                  transform: `scale(${0.94 + 0.06 * pageIn})`,
                  transformOrigin: 'center top',
                }}
              >
                <NewTaskHero
                  autoFocus={false}
                  showUseCases={pageIn > 0.6}
                  className="flex h-full min-h-0 flex-1 flex-col"
                  value={pageIn > 0.3 ? prompt : undefined}
                  demo
                />
              </div>
            </BrowserChromeTyping>

            {/* Opening hook — appears before the browser, answers its own question
                with the swarm demo that follows. */}
            {hookOpacity > 0 && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: hookOpacity,
                  pointerEvents: 'none',
                }}
              >
                <div
                  style={{
                    fontFamily: "'Unbounded', Georgia, serif",
                    fontStyle: 'italic',
                    fontSize: clamp(stageW * 0.042, 24, 56),
                    color: '#1a1d22',
                    textAlign: 'center',
                    letterSpacing: '-0.02em',
                    lineHeight: 1.2,
                    padding: '0 10%',
                  }}
                >
                  {t('What if you could delegate anything?')}
                </div>
              </div>
            )}

            {cursorPos && (
              <FakeCursor
                x={cursorPos.x}
                y={cursorPos.y}
                clickProgress={click}
              />
            )}
          </div>
        )
      }}
    </Sprite>
  )
}

// ── Scene 1b: Fake cursor clicks the prompt area and types the request ──
// Bridges SceneOpen (tab + home page) and SceneSwarm (streaming reply).
// Uses the real NewTaskHero with a controlled `value` so the prompt text
// reveals progressively. A FakeCursor overlay simulates the user's hand:
// move → click prompt → type → move to submit → click.
//
// Cursor waypoints are stored as fractions of the stage so the cursor
// lands in the same relative spot regardless of the user's viewport size.
// `NewTaskHero` centres its prompt horizontally, so the X fractions stay
// near the visual centre at any aspect ratio.

const CURSOR_OFF_FRAC = { x: 0.885, y: 0.963 }
const CURSOR_SUBMIT_FRAC = { x: 0.661, y: 0.637 }

/** Smooth lerp with ease-in-out for cursor movement. */
function lerpPoint(
  a: { x: number; y: number },
  b: { x: number; y: number },
  tNorm: number,
) {
  const k = Easing.easeInOutCubic(clamp(tNorm, 0, 1))
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }
}

// ── Scene 2: The task package — swarm + thinking + tools + artifacts ─────
// 4.0–15.0s (11 s). Uses real product components (ThreadPreview,
// TaskDetailsSection, MessageBubble, ArtifactPreviewCard). The tour
// feeds them a richer mock than before:
//
//   - 4 participants visible in the thread header
//   - kind: 'task' → status chip + TaskDetailsSection disclosures
//     (Requirements 5, Steps 4, Tools 6 — counts animate as statuses flip)
//   - assistant message with `steps` = thinking + 3 tool-call steps +
//     3 work steps; rendered by the real MessageBubble / StepTracker
//   - 2 artifacts that shimmer in during the last 1.5 s

/** Build the team of agents shown as thread participants. */
function getTourTeam(roles: {
  research: string
  analysis: string
  writing: string
  review: string
}): {
  scout: Agent
  forge: Agent
  scribe: Agent
  echo: Agent
} {
  const t0 = new Date(0)
  return {
    scout: {
      id: 'tour-scout',
      slug: 'scout',
      name: 'Scout',
      icon: 'PcCheck',
      role: roles.research,
      instructions: '',
      createdAt: t0,
    },
    forge: {
      id: 'tour-forge',
      slug: 'forge',
      name: 'Forge',
      icon: 'GraphUp',
      role: roles.analysis,
      instructions: '',
      createdAt: t0,
    },
    scribe: {
      id: 'tour-scribe',
      slug: 'scribe',
      name: 'Scribe',
      icon: 'EditPencil',
      role: roles.writing,
      instructions: '',
      createdAt: t0,
    },
    echo: {
      id: 'tour-echo',
      slug: 'echo',
      name: 'Echo',
      icon: 'DoubleCheck',
      role: roles.review,
      instructions: '',
      createdAt: t0,
    },
  }
}

/** Compute requirement status at scene-local time `t`. */
// function reqStatus(
//   t: number,
//   startT: number,
//   doneT: number,
// ): { status: Requirement['status']; satisfiedAt?: Date } {
//   if (t >= doneT) return { status: 'satisfied', satisfiedAt: new Date() }
//   if (t >= startT) return { status: 'in_progress' }
//   return { status: 'pending' }
// }

/** Compute task-step status at scene-local time `t`. */
// function stepStatus(
//   t: number,
//   startT: number,
//   doneT: number,
// ): TaskStep['status'] {
//   if (t >= doneT) return 'completed'
//   if (t >= startT) return 'in_progress'
//   return 'pending'
// }

interface TourThreadStrings {
  prompt: string
  filler2Title: string
  filler2Snippet: string
  filler3Title: string
  filler3Snippet: string
  filler4Title: string
  filler4Snippet: string
  stepResearch: string
  stepChart: string
  stepDraft: string
  stepReview: string
  artifactSummary: string
  artifactChart: string
}

/** Build the mocked thread collection shown in the Inbox. */
function buildTourThreads(
  team: ReturnType<typeof getTourTeam>,
  answerSoFar: string,
  messageSteps: MessageStep[],
  task: Task,
  artifacts: Artifact[],
  createdAt: Date,
  s: TourThreadStrings,
): Thread[] {
  const { scout, forge, scribe, echo } = team

  const selected: Thread = {
    id: 'tour-thread-primary',
    kind: 'task',
    title: s.prompt,
    snippet: answerSoFar || s.prompt,
    updatedAt: createdAt.toISOString(),
    agent: scout,
    participants: [scout, forge, scribe, echo],
    starColor: null,
    unread: false,
    messages: [
      {
        id: 'm-user',
        role: 'user',
        content: s.prompt,
        timestamp: createdAt,
      },
      {
        id: 'm-assistant',
        role: 'assistant',
        agent: scout,
        content: answerSoFar,
        timestamp: createdAt,
        steps: messageSteps,
      },
    ],
    artifacts,
    source: { task },
    tags: [],
  }

  const filler: Thread[] = [
    {
      id: 'tour-thread-2',
      kind: 'conversation',
      title: s.filler2Title,
      snippet: s.filler2Snippet,
      updatedAt: new Date(createdAt.getTime() - 1000 * 60 * 45).toISOString(),
      agent: scribe,
      participants: [],
      starColor: '#F59E0B',
      unread: false,
      messages: [],
      artifacts: [],
      source: {},
      tags: [],
    },
    {
      id: 'tour-thread-3',
      kind: 'conversation',
      title: s.filler3Title,
      snippet: s.filler3Snippet,
      updatedAt: new Date(
        createdAt.getTime() - 1000 * 60 * 60 * 3,
      ).toISOString(),
      agent: forge,
      participants: [],
      starColor: null,
      unread: true,
      messages: [],
      artifacts: [],
      source: {},
      tags: [],
    },
    {
      id: 'tour-thread-4',
      kind: 'conversation',
      title: s.filler4Title,
      snippet: s.filler4Snippet,
      updatedAt: new Date(
        createdAt.getTime() - 1000 * 60 * 60 * 26,
      ).toISOString(),
      agent: echo,
      participants: [],
      starColor: null,
      unread: false,
      messages: [],
      artifacts: [],
      source: {},
      tags: [],
    },
  ]

  return [selected, ...filler]
}

const noop = () => {}

// ── Scene 2 helpers ───────────────────────────────────────────────────────
// The heavy BrowserChrome content is memoized so it only re-renders when
// `answerSoFar` / step count / status tier changes, not on every RAF tick.

interface SwarmContentProps {
  answerSoFar: string
  messageSteps: MessageStep[]
  task: Task
  team: ReturnType<typeof getTourTeam>
  artifacts: Artifact[]
  createdAt: Date
  strings: TourThreadStrings
  createNewLabel: string
  createNewSublabel: string
}

const SwarmContent = memo(function SwarmContent({
  answerSoFar,
  messageSteps,
  task,
  team,
  artifacts,
  createdAt,
  strings,
  createNewLabel,
  createNewSublabel,
}: SwarmContentProps) {
  const { width: stageW } = useStageSize()
  // Mirror the real inbox page: on mobile the thread list is hidden and the
  // preview fills the full width. Same breakpoint logic as ThreadsPage
  // (`hidden md:flex` = hidden below 768px).
  const showThreadList = stageW >= 650
  const chromeInset = Math.round(Math.min(40, Math.max(8, stageW * 0.031)))

  const threads = buildTourThreads(
    team,
    answerSoFar,
    messageSteps,
    task,
    artifacts,
    createdAt,
    strings,
  )
  const selectedId = threads[0].id
  return (
    <BrowserChrome inset={chromeInset} url="devs.new">
      {/* ThreadsPage composition — real Sidebar + ThreadList + ThreadPreview.
          We avoid WorkspaceLayout because it forces h-dvh. */}
      <div
        className="bg-background flex h-full w-full overflow-hidden relative"
        style={{ height: 'calc(100% - 0px)' }}
      >
        <div className="shrink-0">
          <Sidebar
            isCollapsed
            activeFilter="inbox"
            onFilterChange={noop}
            onOpenSettings={noop}
          />
        </div>
        <div className="flex min-w-0 flex-1">
          {showThreadList && (
            <div className="shrink-0 border-divider/60" style={{ width: 340 }}>
              <ThreadList
                threads={threads}
                selectedThreadId={selectedId}
                selectedIds={[selectedId]}
                onSelectThread={noop}
                onShiftSelectThread={noop}
                onCreateNew={noop}
                createNewLabel={createNewLabel}
                createNewSublabel={createNewSublabel}
                isLoading={false}
                search=""
                onSearchChange={noop}
                onToggleStar={noop}
                onToggleRead={noop}
                layout="list"
              />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <ThreadPreview
              thread={threads[0]}
              onDeselect={noop}
              isStarred={false}
              starColor={null}
              onToggleStar={noop}
              onReply={noop}
              replyPrompt=""
              onReplyPromptChange={noop}
              mode="feed"
              isActive
              onMarkRead={noop}
            />
          </div>
        </div>
      </div>
    </BrowserChrome>
  )
})

// Throttle the streaming so SwarmContent re-renders at ~8fps instead of 60fps.
// Fewer re-renders → fewer layer re-rasters → the compositor-driven CSS zoom
// keyframes run uninterrupted.
const STREAM_STEPS = 48

function SceneSwarmInner() {
  const { t } = useI18n(tourI18n)
  const { localTime, duration } = useSprite()

  // Translated strings used to build the mocked thread + answer.
  const answerMarkdown = t(
    `## Climate adaptation briefing — 5 major cities

**Cities surveyed:** Amsterdam · Singapore · Copenhagen · Medellín · Rotterdam

### Comparative strategies

1. **Amsterdam** — floating infrastructure, canal surge control
2. **Singapore** — NEWater system, urban heat island mitigation
3. **Copenhagen** — 100% renewable target, 20-min city model
4. **Medellín** — green corridors, urban acupuncture model
5. **Rotterdam** — water squares, rooftop gardens, floating pavilions

> Strategy comparison and presentation deck attached.`,
  )
  const answerTokens = useMemo(
    () => answerMarkdown.split(/(\s+)/),
    [answerMarkdown],
  )

  const strings = useMemo<TourThreadStrings>(
    () => ({
      prompt: t(
        'Research how 5 major cities are adapting to climate change, compare their strategies, and draft a presentation briefing for city planners.',
      ),
      filler2Title: t('Draft Q3 OKRs for the platform team'),
      filler2Snippet: t('Synthesized five drafts. Ready for review.'),
      filler3Title: t('Compare three WebGPU inference runtimes'),
      filler3Snippet: t(
        'Benchmarks complete. Transformers.js leads on cold start.',
      ),
      filler4Title: t('Summarize last week’s customer interviews'),
      filler4Snippet: t('Three themes emerged: latency, privacy, price.'),
      stepResearch: t('Research city adaptations'),
      stepChart: t('Build strategy overview'),
      stepDraft: t('Draft briefing'),
      stepReview: t('Reviewing deliverables'),
      artifactSummary: t('Climate adaptation — strategy comparison'),
      artifactChart: t('City planners briefing — presentation'),
    }),
    [t],
  )
  const createNewLabel = t('New task')
  const createNewSublabel = t('Start a new task')
  const roles = {
    research: t('Research'),
    analysis: t('Analysis'),
    writing: t('Writing'),
    review: t('Review'),
  }
  const thinkingContent = t(
    'Breaking this into parallel subtasks. Recruiting Research, Analysis, Writing, and Review…',
  )
  const toolLabels = {
    knowledge: t('Searching knowledge base'),
    wikipedia: t('Searching Wikipedia'),
    arxiv: t('Searching arXiv'),
    chart: t('Comparing city strategies'),
    draft: t('Drafting presentation briefing'),
    review: t('Reviewing deliverables'),
    pptx: t('Generating presentation'),
  }

  // Opacity: fade in over first 0.3s, fade out over last 0.4s.
  const inOpacity = clamp(localTime / 0.3, 0, 1)
  const exitT = clamp((localTime - (duration - 0.4)) / 0.4, 0, 1)
  const opacity = inOpacity * (1 - exitT)

  // ── Streaming text ─────────────────────────────────────────────────────
  // Stream is slower + starts later: we want Thinking + tool calls to
  // dominate the first half of the scene, not wall-to-wall markdown.
  const STREAM_BEGIN = 4.0
  const STREAM_END = duration - 2.0
  const streamT = clamp(
    (localTime - STREAM_BEGIN) / (STREAM_END - STREAM_BEGIN),
    0,
    1,
  )
  const step = Math.floor(streamT * STREAM_STEPS)
  const revealedTokenCount = Math.floor(
    (step / STREAM_STEPS) * answerTokens.length,
  )
  const answerSoFar = useMemo(
    () => answerTokens.slice(0, revealedTokenCount).join(''),
    [answerTokens, revealedTokenCount],
  )

  // ── Team ───────────────────────────────────────────────────────────────
  const team = useMemo(
    () => getTourTeam(roles),
    [roles.research, roles.analysis, roles.writing, roles.review],
  )
  const createdAt = useMemo(() => new Date(), [])

  // ── Task package (requirements, steps, agent-with-tools) ───────────────
  const task = useMemo<Task>(() => {
    // const tools: Tool[] = [
    //   {
    //     id: 'tour-tool-knowledge',
    //     name: 'search_knowledge',
    //     description: 'Search the knowledge base',
    //     type: 'file',
    //     config: {},
    //   },
    //   {
    //     id: 'tour-tool-wikipedia',
    //     name: 'wikipedia_search',
    //     description: 'Search Wikipedia',
    //     type: 'web',
    //     config: {},
    //   },
    //   {
    //     id: 'tour-tool-arxiv',
    //     name: 'arxiv_search',
    //     description: 'Search arXiv papers',
    //     type: 'web',
    //     config: {},
    //   },
    //   {
    //     id: 'tour-tool-chart',
    //     name: 'generate_chart',
    //     description: 'Build a chart artifact',
    //     type: 'custom',
    //     config: {},
    //   },
    //   {
    //     id: 'tour-tool-artifact',
    //     name: 'artifact',
    //     description: 'Produce a deliverable',
    //     type: 'custom',
    //     config: {},
    //   },
    //   {
    //     id: 'tour-tool-execute',
    //     name: 'execute',
    //     description: 'Run sandboxed code',
    //     type: 'shell',
    //     config: {},
    //   },
    // ]
    // const agentWithTools: Agent = { ...team.scout, tools }

    // Requirements wave — each transitions pending → in_progress → satisfied.
    // const requirements: Requirement[] = [
    //   {
    //     id: 'req-1',
    //     type: 'functional',
    //     description: t('Research supply chain stages'),
    //     priority: 'must',
    //     source: 'explicit',
    //     taskId: 'tour-task-primary',
    //     validationCriteria: [],
    //     ...reqStatus(localTime, 1.0, 3.0),
    //   },
    //   {
    //     id: 'req-2',
    //     type: 'functional',
    //     description: t('Identify top 5 risks'),
    //     priority: 'must',
    //     source: 'explicit',
    //     taskId: 'tour-task-primary',
    //     validationCriteria: [],
    //     ...reqStatus(localTime, 1.5, 3.8),
    //   },
    //   {
    //     id: 'req-3',
    //     type: 'functional',
    //     description: t('Build risks chart'),
    //     priority: 'must',
    //     source: 'explicit',
    //     taskId: 'tour-task-primary',
    //     validationCriteria: [],
    //     ...reqStatus(localTime, 3.0, 5.8),
    //   },
    //   {
    //     id: 'req-4',
    //     type: 'functional',
    //     description: t('Draft exec summary'),
    //     priority: 'must',
    //     source: 'explicit',
    //     taskId: 'tour-task-primary',
    //     validationCriteria: [],
    //     ...reqStatus(localTime, 4.2, 7.0),
    //   },
    //   {
    //     id: 'req-5',
    //     type: 'non_functional',
    //     description: t('Reviewing deliverables'),
    //     priority: 'should',
    //     source: 'inferred',
    //     taskId: 'tour-task-primary',
    //     validationCriteria: [],
    //     ...reqStatus(localTime, 5.5, 8.0),
    //   },
    // ]

    // Task steps — show the parallel agents via Chip in the Steps disclosure.
    // const steps: TaskStep[] = [
    //   {
    //     id: 's-1',
    //     name: strings.stepResearch,
    //     description: '',
    //     order: 1,
    //     agentId: team.scout.id,
    //     status: stepStatus(localTime, 1.0, 3.8),
    //   },
    //   {
    //     id: 's-2',
    //     name: strings.stepChart,
    //     description: '',
    //     order: 2,
    //     agentId: team.forge.id,
    //     status: stepStatus(localTime, 3.0, 5.8),
    //   },
    //   {
    //     id: 's-3',
    //     name: strings.stepDraft,
    //     description: '',
    //     order: 3,
    //     agentId: team.scribe.id,
    //     status: stepStatus(localTime, 4.2, 7.0),
    //   },
    //   {
    //     id: 's-4',
    //     name: strings.stepReview,
    //     description: '',
    //     order: 4,
    //     agentId: team.echo.id,
    //     status: stepStatus(localTime, 5.5, 8.0),
    //   },
    // ]

    const taskStatus: Task['status'] =
      localTime >= 9.5
        ? 'completed'
        : localTime >= 0.3
          ? 'in_progress'
          : 'pending'

    return {
      id: 'tour-task-primary',
      workflowId: 'tour-workflow',
      title: strings.prompt,
      description: strings.prompt,
      complexity: 'complex',
      status: taskStatus,
      assignedAgentId: team.scout.id,
      // agent: agentWithTools,
      agent: team.scout,
      dependencies: [],
      requirements: [],
      artifacts: [],
      steps: [],
      estimatedPasses: 1,
      actualPasses: 1,
      createdAt,
      updatedAt: createdAt,
      completedAt: taskStatus === 'completed' ? createdAt : undefined,
    }
  }, [localTime, team, createdAt, strings, t])

  // ── Assistant message.steps (Thinking + tool calls + work) ─────────────
  // Each step flips running → completed at its own time. We guard with
  // tiered boundaries so SwarmContent only re-renders when the shape
  // actually changes.
  const messageSteps = useMemo<MessageStep[]>(() => {
    const now = createdAt.getTime()
    const mk = (
      id: string,
      icon: string,
      i18nKey: string,
      startT: number,
      doneT: number,
      extra: Partial<MessageStep> = {},
    ): MessageStep | null => {
      if (localTime < startT) return null
      const completed = localTime >= doneT
      return {
        id,
        icon,
        i18nKey,
        status: completed ? 'completed' : 'running',
        startedAt: now + startT * 1000,
        completedAt: completed ? now + doneT * 1000 : undefined,
        ...extra,
      }
    }

    const out: MessageStep[] = []

    // Step 0: Thinking — always present once scene begins.
    const thinking = mk('s0-thinking', 'Sparks', 'thinking', 0.5, 2.2, {
      thinkingContent,
      title: thinkingContent,
    })
    if (thinking) out.push(thinking)

    // Tool calls (staggered 200ms apart).
    // const tc1 = mk('s1-knowledge', 'Search', 'tool', 2.0, 2.8, {
    //   title: toolLabels.knowledge,
    //   toolCalls: [
    //     {
    //       name: 'search_knowledge',
    //       input: { query: 'lithium supply chain 2024' },
    //       output:
    //         localTime >= 2.8 ? '42 documents · 128 chunks matched' : undefined,
    //     },
    //   ],
    // })
    // if (tc1) out.push(tc1)

    const tc2 = mk('s2-wikipedia', 'Internet', 'tool', 2.4, 3.2, {
      title: toolLabels.wikipedia,
      toolCalls: [
        {
          name: 'wikipedia_search',
          input: { topic: 'Climate change urban adaptation' },
          output: localTime >= 3.2 ? '9 articles · cross-linked' : undefined,
        },
      ],
    })
    if (tc2) out.push(tc2)

    // const tc3 = mk('s3-arxiv', 'Page', 'tool', 2.8, 3.6, {
    //   title: toolLabels.arxiv,
    //   toolCalls: [
    //     {
    //       name: 'arxiv_search',
    //       input: { query: 'Li-ion recycling capacity' },
    //       output: localTime >= 3.6 ? '23 papers · 2022-2024' : undefined,
    //     },
    //   ],
    // })
    // if (tc3) out.push(tc3)

    // Work steps — the three agents doing their part.
    // const w1 = mk('s4-chart', 'GraphUp', 'tool', 4.2, 5.8, {
    //   title: toolLabels.chart,
    //   toolCalls: [
    //     {
    //       name: 'generate_chart',
    //       input: { kind: 'bar', series: 'risk_score', n: 5 },
    //       output: localTime >= 5.8 ? 'chart.svg · 5 bars' : undefined,
    //     },
    //   ],
    // })
    // if (w1) out.push(w1)

    // const w2 = mk('s5-draft', 'EditPencil', 'tool', 5.0, 6.8, {
    //   title: toolLabels.draft,
    //   toolCalls: [
    //     {
    //       name: 'artifact',
    //       input: { type: 'document', format: 'markdown' },
    //       output: localTime >= 6.8 ? 'summary.md · 820 words' : undefined,
    //     },
    //   ],
    // })
    // if (w2) out.push(w2)

    const w3 = mk('s6-review', 'DoubleCheck', 'tool', 6.5, 7.8, {
      title: toolLabels.review,
      toolCalls: [
        {
          name: 'validate',
          input: { requirements: 5 },
          output: localTime >= 7.8 ? '5/5 satisfied · approved' : undefined,
        },
      ],
    })
    if (w3) out.push(w3)

    const w4 = mk('s7-pptx', 'Presentation', 'tool', 8.0, 9.5, {
      title: toolLabels.pptx,
      toolCalls: [
        {
          name: 'generate_pptx',
          input: { title: 'Climate Adaptation Strategies', slides: 12 },
          output: localTime >= 9.5 ? '12 slides · .pptx ready' : undefined,
        },
      ],
    })
    if (w4) out.push(w4)

    return out
  }, [
    // Re-derive only when a status boundary crosses:
    Math.floor(localTime * 5),
    thinkingContent,
    toolLabels.knowledge,
    toolLabels.wikipedia,
    toolLabels.arxiv,
    toolLabels.chart,
    toolLabels.draft,
    toolLabels.review,
    toolLabels.pptx,
  ])

  // ── Artifacts (appear at t=7.5, shimmer via CSS) ───────────────────────
  const artifacts = useMemo<Artifact[]>(() => {
    if (localTime < 9.5) return []
    return [
      {
        id: 'tour-art-comparison',
        taskId: 'tour-task-primary',
        agentId: team.forge.id,
        title: strings.artifactSummary,
        description: '5 cities · comparative analysis',
        type: 'analysis',
        format: 'markdown',
        content: '',
        version: 1,
        status: 'final',
        dependencies: [],
        validates: [],
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: 'tour-art-pptx',
        taskId: 'tour-task-primary',
        agentId: team.scribe.id,
        title: strings.artifactChart,
        description: '12 slides · .pptx',
        type: 'document',
        format: 'html',
        content: '',
        version: 1,
        status: 'final',
        dependencies: [],
        validates: [],
        createdAt,
        updatedAt: createdAt,
      },
    ]
  }, [localTime >= 9.5, team.forge.id, team.scribe.id, strings, createdAt])

  // Apply opacity via DOM ref too — the outer wrapper never re-renders from
  // React for animation purposes.
  const opacityRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    if (opacityRef.current) opacityRef.current.style.opacity = String(opacity)
  })

  return (
    <div ref={opacityRef} style={{ position: 'absolute', inset: 0, opacity }}>
      {/* Zoom handled 100% by the compositor via CSS keyframes. No React
          work per frame; unaffected by any main-thread re-renders. */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transformOrigin: 'center center',
          willChange: 'transform',
          animation: `tour-swarm-zoom ${duration}s cubic-bezier(0.42, 0, 0.58, 1) forwards`,
        }}
      >
        <SwarmContent
          answerSoFar={answerSoFar}
          messageSteps={messageSteps}
          task={task}
          team={team}
          artifacts={artifacts}
          createdAt={createdAt}
          strings={strings}
          createNewLabel={createNewLabel}
          createNewSublabel={createNewSublabel}
        />
      </div>
    </div>
  )
}

export function SceneSwarm({ start = 3.9, end = 15.0 }: SceneProps) {
  return (
    <>
      <style>{`@keyframes tour-swarm-zoom { from { transform: scale(1); } to { transform: scale(1.08); } }
@keyframes tour-artifact-shimmer { 0% { opacity: 0; transform: translateY(6px); } 100% { opacity: 1; transform: translateY(0); } }`}</style>
      <Sprite start={start} end={end}>
        <SceneSwarmInner />
      </Sprite>
    </>
  )
}

// ── Scene 3: Simple transition into the sphere ────────────────────────────
// Delegates to the shared SceneCollapse with tour-specific caption.
export function SceneCollapse({ start = 12.5, end = 15.5 }: SceneProps) {
  // Strings are passed as raw English keys; SharedSceneCollapse translates
  // them via `useStageT()` against the player's local language.
  return (
    <SharedSceneCollapse
      start={start}
      end={end}
      caption="All of that. In one tab."
    />
  )
}

// ── Scene 4: Privacy triad ────────────────────────────────────────────────
// Delegates to the shared ScenePromise with tour-specific phrases.
export function ScenePromise({ start = 17.9, end = 23.0 }: SceneProps) {
  return (
    <SharedScenePromise
      start={start}
      end={end}
      phrases={[
        { text: 'No server.', at: 0.3 },
        { text: 'No subscription.', at: 1.2 },
        { text: 'Your keys. Your data.', at: 2.1 },
      ]}
      tagline="OPEN SOURCE · BROWSER-NATIVE · YOURS"
      taglineAt={3.4}
    />
  )
}

// ── Scene 5: Call to action ───────────────────────────────────────────────
// Delegates to the shared SceneCTA with tour-specific strings.
export function SceneCTA({ start = 22.9, end = 30 }: SceneProps) {
  return (
    <SharedSceneCTA
      start={start}
      end={end}
      tagline="Now you can."
      ctaLabel="Open devs.new →"
      frictionBadge="No signup · No install · Free"
    />
  )
}
