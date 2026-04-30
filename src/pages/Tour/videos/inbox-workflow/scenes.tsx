/**
 * Inbox-workflow tour — three scene components using real V2 components.
 *
 * SceneInboxFull   (2.4–10s)   Sidebar + ThreadList + ThreadPreview
 * SceneTranscript  (9.9–16s)   Sidebar + dimmed ThreadList + TranscriptEventList
 * SceneTagsSearch  (15.9–20s)  Sidebar + ThreadList with animated search + FakeCursor
 */
import { memo, useLayoutEffect, useMemo, useRef } from 'react'
import { useI18n } from '@/i18n'
import { Sidebar, ThreadList, ThreadPreview } from '@/pages/Workspace/components'
import type { Thread } from '@/pages/Workspace/types'
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
import inboxWorkflowI18n from './i18n'

interface SceneProps {
  start?: number
  end?: number
}

const noop = () => {}

// Fixed mock base date so relative timestamps stay stable
const BASE_MS = new Date(Date.UTC(2024, 0, 15, 10, 0, 0)).getTime()

// Tag ID used to mark "research" threads — must be consistent across scenes
const TAG_RESEARCH = 'tag-research'

function makeAgent(id: string, name: string, icon: Agent['icon']): Agent {
  return {
    id,
    slug: id,
    name,
    icon,
    role: name,
    instructions: '',
    createdAt: new Date(BASE_MS),
  }
}

// ── Scene 2: Inbox full ───────────────────────────────────────────────────

interface InboxStrings {
  // Agent names
  auditor: string
  scribe: string
  docbot: string
  scout: string
  reviewer: string
  digest: string
  // Thread titles
  q1Title: string
  blogTitle: string
  apiTitle: string
  marketTitle: string
  codeTitle: string
  weeklyTitle: string
  // Snippets
  q1Snippet: string
  blogSnippet: string
  apiSnippet: string
  // Thread messages
  q1UserMsg: string
  q1AssistantMsg: string
  // Transcript event labels/content
  analyzing: string
  // Tag search
  hashResearch: string
  searchTagOrganize: string
}

function useInboxStrings(): InboxStrings {
  const { t } = useI18n(inboxWorkflowI18n)
  return useMemo(
    () => ({
      auditor: t('Auditor'),
      scribe: t('Scribe'),
      docbot: t('DocBot'),
      scout: t('Scout'),
      reviewer: t('Reviewer'),
      digest: t('Digest'),
      q1Title: t('Q1 Expense Audit'),
      blogTitle: t('Blog post draft'),
      apiTitle: t('API documentation'),
      marketTitle: t('Market research'),
      codeTitle: t('Code review: auth'),
      weeklyTitle: t('Weekly summary'),
      q1Snippet: t('Found 3 anomalies in Q1 data\u2026'),
      blogSnippet: t('Here\u2019s a draft covering key topics\u2026'),
      apiSnippet: t('Endpoints documented with examples\u2026'),
      q1UserMsg: t('Audit Q1 expenses and flag anomalies'),
      q1AssistantMsg: t(
        'Found 3 anomalies totaling $12,400. Two duplicate vendor payments and one misclassified expense in Marketing.',
      ),
      analyzing: t('Analyzing expense data...'),
      hashResearch: t('#research'),
      searchTagOrganize: t('Search. Tag. Organize.'),
    }),
    [t],
  )
}

function buildInboxAgents(s: InboxStrings) {
  return {
    auditor: makeAgent('inbox-auditor', s.auditor, 'PcCheck'),
    scribe: makeAgent('inbox-scribe', s.scribe, 'EditPencil'),
    docbot: makeAgent('inbox-docbot', s.docbot, 'Document'),
    scout: makeAgent('inbox-scout', s.scout, 'GraphUp'),
    reviewer: makeAgent('inbox-reviewer', s.reviewer, 'DoubleCheck'),
    digest: makeAgent('inbox-digest', s.digest, 'ChatLines'),
  }
}

/** Build the six inbox mock threads from an agents map and pre-translated strings. */
function buildInboxThreads(
  agents: ReturnType<typeof buildInboxAgents>,
  s: InboxStrings,
  starredId: string | null = null,
): Thread[] {
  return [
    {
      id: 'inbox-q1',
      kind: 'task',
      title: s.q1Title,
      snippet: s.q1Snippet,
      updatedAt: new Date(BASE_MS - 2 * 60_000).toISOString(),
      agent: agents.auditor,
      participants: [agents.auditor],
      starColor: null,
      unread: true,
      messages: [
        {
          id: 'q1-user',
          role: 'user',
          content: s.q1UserMsg,
          timestamp: new Date(BASE_MS - 2 * 60_000 - 5_000),
        },
        {
          id: 'q1-assistant',
          role: 'assistant',
          agent: agents.auditor,
          content: s.q1AssistantMsg,
          timestamp: new Date(BASE_MS - 2 * 60_000),
        },
      ],
      artifacts: [],
      source: {},
      tags: [],
    },
    {
      id: 'inbox-blog',
      kind: 'conversation',
      title: s.blogTitle,
      snippet: s.blogSnippet,
      updatedAt: new Date(BASE_MS - 15 * 60_000).toISOString(),
      agent: agents.scribe,
      participants: [agents.scribe],
      starColor: null,
      unread: true,
      messages: [],
      artifacts: [],
      source: {},
      tags: [],
    },
    {
      id: 'inbox-api',
      kind: 'task',
      title: s.apiTitle,
      snippet: s.apiSnippet,
      updatedAt: new Date(BASE_MS - 60 * 60_000).toISOString(),
      agent: agents.docbot,
      participants: [agents.docbot],
      starColor: null,
      unread: false,
      messages: [],
      artifacts: [],
      source: {},
      tags: [TAG_RESEARCH],
    },
    {
      id: 'inbox-market',
      kind: 'task',
      title: s.marketTitle,
      snippet: 'Competitive analysis complete.',
      updatedAt: new Date(BASE_MS - 3 * 60 * 60_000).toISOString(),
      agent: agents.scout,
      participants: [agents.scout],
      starColor: starredId === 'inbox-market' ? '#F59E0B' : null,
      unread: false,
      messages: [],
      artifacts: [],
      source: {},
      tags: [TAG_RESEARCH],
    },
    {
      id: 'inbox-code',
      kind: 'task',
      title: s.codeTitle,
      snippet: 'Found 4 issues, 2 require attention.',
      updatedAt: new Date(BASE_MS - 5 * 60 * 60_000).toISOString(),
      agent: agents.reviewer,
      participants: [agents.reviewer],
      starColor: null,
      unread: true,
      messages: [],
      artifacts: [],
      source: {},
      tags: [],
    },
    {
      id: 'inbox-weekly',
      kind: 'conversation',
      title: s.weeklyTitle,
      snippet: 'Three themes: latency, privacy, price.',
      updatedAt: new Date(BASE_MS - 26 * 60 * 60_000).toISOString(),
      agent: agents.digest,
      participants: [agents.digest],
      starColor: null,
      unread: false,
      messages: [],
      artifacts: [],
      source: {},
      tags: [],
    },
  ]
}

interface InboxContentProps {
  threads: Thread[]
  selectedThreadId: string
}

const InboxContent = memo(function InboxContent({
  threads,
  selectedThreadId,
}: InboxContentProps) {
  const { width: stageW } = useStageSize()
  const showThreadList = stageW >= 650
  const chromeInset = Math.round(Math.min(40, Math.max(8, stageW * 0.031)))
  const selectedThread = threads.find((th) => th.id === selectedThreadId)

  return (
    <BrowserChrome inset={chromeInset} url="devs.new">
      <div className="bg-background relative flex h-full w-full overflow-hidden">
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
            <div className="border-divider/60 shrink-0" style={{ width: 340 }}>
              <ThreadList
                threads={threads}
                selectedThreadId={selectedThreadId}
                selectedIds={[selectedThreadId]}
                onSelectThread={noop}
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
              thread={selectedThread}
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

function SceneInboxFullInner() {
  const { localTime, duration } = useSprite()

  const inT = Easing.easeOutCubic(clamp(localTime / 0.6, 0, 1))
  const exitT = clamp((localTime - (duration - 0.5)) / 0.5, 0, 1)
  const opacity = inT * (1 - exitT)

  const s = useInboxStrings()
  const agents = useMemo(() => buildInboxAgents(s), [s])
  const threads = useMemo(() => buildInboxThreads(agents, s), [agents, s])

  const opacityRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    if (opacityRef.current) opacityRef.current.style.opacity = String(opacity)
  })

  return (
    <div ref={opacityRef} style={{ position: 'absolute', inset: 0, opacity }}>
      <InboxContent threads={threads} selectedThreadId="inbox-q1" />
    </div>
  )
}

export function SceneInboxFull({ start = 2.4, end = 10 }: SceneProps) {
  return (
    <Sprite start={start} end={end}>
      <SceneInboxFullInner />
    </Sprite>
  )
}

// ── Scene 3: Transcript ───────────────────────────────────────────────────

// Event delays (scene-local seconds) for progressive reveal
const TRANSCRIPT_EVENT_DELAYS = [0.5, 1.5, 2.5, 3.5, 4.5]

interface TranscriptContentProps {
  threads: Thread[]
  transcriptThread: Thread
}

const TranscriptContent = memo(function TranscriptContent({
  threads,
  transcriptThread,
}: TranscriptContentProps) {
  const { width: stageW } = useStageSize()
  const showThreadList = stageW >= 650
  const chromeInset = Math.round(Math.min(40, Math.max(8, stageW * 0.031)))

  return (
    <BrowserChrome inset={chromeInset} url="devs.new">
      <div className="bg-background relative flex h-full w-full overflow-hidden">
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
            <div
              className="border-divider/60 shrink-0 opacity-40"
              style={{ width: 240 }}
            >
              <ThreadList
                threads={threads}
                selectedThreadId="inbox-q1"
                selectedIds={['inbox-q1']}
                onSelectThread={noop}
                isLoading={false}
                search=""
                onSearchChange={noop}
                layout="list"
              />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <ThreadPreview
              thread={transcriptThread}
              onDeselect={noop}
              isStarred={false}
              starColor={null}
              onToggleStar={noop}
              onReply={noop}
              replyPrompt=""
              onReplyPromptChange={noop}
              mode="transcript"
              isActive
              onMarkRead={noop}
            />
          </div>
        </div>
      </div>
    </BrowserChrome>
  )
})

function SceneTranscriptInner() {
  const { localTime, duration } = useSprite()

  const inT = Easing.easeOutCubic(clamp(localTime / 0.6, 0, 1))
  const exitT = clamp((localTime - (duration - 0.5)) / 0.5, 0, 1)
  const opacity = inT * (1 - exitT)

  const s = useInboxStrings()
  const agents = useMemo(() => buildInboxAgents(s), [s])
  const threads = useMemo(() => buildInboxThreads(agents, s), [agents, s])

  // Build messages that map to transcript events, revealed progressively.
  // TranscriptView inside ThreadPreview will convert these to TranscriptEvent[].
  const eventsCount = TRANSCRIPT_EVENT_DELAYS.filter(
    (d) => localTime >= d,
  ).length

  // All five messages corresponding to the five transcript events
  const allMessages = useMemo(
    () => [
      {
        id: 'te-user',
        role: 'user' as const,
        content: s.q1UserMsg,
        timestamp: new Date(BASE_MS),
      },
      {
        id: 'te-think',
        role: 'assistant' as const,
        agent: agents.auditor,
        content: s.analyzing,
        timestamp: new Date(BASE_MS + 1200),
        steps: [
          {
            id: 'step-think',
            icon: 'Brain',
            i18nKey: 'Thinking',
            startedAt: BASE_MS + 1200,
            completedAt: BASE_MS + 2000,
            status: 'completed' as const,
            toolCalls: [],
          },
        ],
      },
      {
        id: 'te-calc',
        role: 'assistant' as const,
        agent: agents.auditor,
        content: '',
        timestamp: new Date(BASE_MS + 2000),
        steps: [
          {
            id: 'step-calc',
            icon: 'Calculator',
            i18nKey: 'Calculating',
            startedAt: BASE_MS + 2000,
            completedAt: BASE_MS + 4100,
            status: 'completed' as const,
            toolCalls: [
              {
                name: 'calculate',
                input: { transactions: 247 },
                output: '3 anomalies detected',
              },
            ],
          },
        ],
      },
      {
        id: 'te-search',
        role: 'assistant' as const,
        agent: agents.auditor,
        content: '',
        timestamp: new Date(BASE_MS + 4100),
        steps: [
          {
            id: 'step-search',
            icon: 'Search',
            i18nKey: 'Searching',
            startedAt: BASE_MS + 4100,
            completedAt: BASE_MS + 5600,
            status: 'completed' as const,
            toolCalls: [
              {
                name: 'search_knowledge',
                input: { query: 'Q1 reports' },
                output: '12 documents loaded',
              },
            ],
          },
        ],
      },
      {
        id: 'te-resp',
        role: 'assistant' as const,
        agent: agents.auditor,
        content: s.q1AssistantMsg,
        timestamp: new Date(BASE_MS + 5600),
      },
    ],
    [s, agents],
  )

  const visibleMessages = useMemo(
    () => allMessages.slice(0, eventsCount),
    [allMessages, eventsCount],
  )

  // Build a thread with the progressively revealed messages
  const transcriptThread = useMemo<Thread>(
    () => ({
      id: 'inbox-q1',
      kind: 'task',
      title: s.q1Title,
      snippet: s.q1Snippet,
      updatedAt: new Date(BASE_MS - 2 * 60_000).toISOString(),
      agent: agents.auditor,
      participants: [agents.auditor],
      starColor: null,
      unread: true,
      messages: visibleMessages,
      artifacts: [],
      source: {},
      tags: [],
    }),
    [s, agents, visibleMessages],
  )

  const opacityRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    if (opacityRef.current) opacityRef.current.style.opacity = String(opacity)
  })

  return (
    <div ref={opacityRef} style={{ position: 'absolute', inset: 0, opacity }}>
      <TranscriptContent threads={threads} transcriptThread={transcriptThread} />
    </div>
  )
}

export function SceneTranscript({ start = 9.9, end = 16 }: SceneProps) {
  return (
    <Sprite start={start} end={end}>
      <SceneTranscriptInner />
    </Sprite>
  )
}

// ── Scene 4: Tags & search ────────────────────────────────────────────────

// Cursor waypoints as stage fractions — calibrated for the V2 layout
const SEARCH_BAR_FRAC = { x: 0.22, y: 0.19 }
const STAR_FRAC = { x: 0.28, y: 0.42 }

interface TagSearchContentProps {
  threads: Thread[]
  search: string
}

const TagSearchContent = memo(function TagSearchContent({
  threads,
  search,
}: TagSearchContentProps) {
  const { width: stageW } = useStageSize()
  const showThreadList = stageW >= 650
  const chromeInset = Math.round(Math.min(40, Math.max(8, stageW * 0.031)))

  return (
    <BrowserChrome inset={chromeInset} url="devs.new">
      <div className="bg-background relative flex h-full w-full overflow-hidden">
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
            <div className="border-divider/60 shrink-0" style={{ width: 340 }}>
              <ThreadList
                threads={threads}
                selectedThreadId={undefined}
                onSelectThread={noop}
                isLoading={false}
                search={search}
                onSearchChange={noop}
                onToggleStar={noop}
                layout="list"
              />
            </div>
          )}
          {/* Right panel — dimmed placeholder keeps visual weight */}
          <div className="min-w-0 flex-1 opacity-10" />
        </div>
      </div>
    </BrowserChrome>
  )
})

function SceneTagsSearchInner() {
  const { localTime, duration } = useSprite()
  const { width: stageW, height: stageH } = useStageSize()
  const { resolveAnchor } = useTimeline()

  const inT = Easing.easeOutCubic(clamp(localTime / 0.5, 0, 1))
  const exitT = clamp((localTime - (duration - 0.5)) / 0.5, 0, 1)
  const opacity = inT * (1 - exitT)

  const s = useInboxStrings()
  const searchText = s.hashResearch
  const captionText = s.searchTagOrganize

  // Timeline:
  // 0.0–0.5: fade in
  // 0.5–0.8: cursor moves to search bar
  // 0.8–1.0: click search bar
  // 1.0–2.0: type "#research"
  // 2.0–2.5: list filters to research threads
  // 2.5–3.0: cursor moves to first matching thread
  // 3.0–3.3: click → thread gets starred
  // 3.3–4.1: caption appears

  // Typing animation — discretise to avoid re-rendering every RAF tick
  const typeProgress = clamp((localTime - 1.0) / 1.0, 0, 1)
  const charsShown = Math.floor(searchText.length * typeProgress)
  const search = localTime >= 1.0 ? searchText.slice(0, charsShown) : ''

  // Filter / star state — boolean boundaries limit re-renders to two moments
  const isFiltered = localTime >= 2.0
  const isStarred = localTime >= 3.2
  const captionT = clamp((localTime - 3.3) / 0.5, 0, 1)

  // Cursor — anchor on the real search input and the real thread row each
  // frame. Falls back to hand-tuned fractions before the items are mounted
  // (during the chrome entrance) or on viewports that hide the thread list.
  const showCursor = stageW >= 700
  const cursorSearchBar =
    resolveAnchor?.('input[name="collection-search"]') ??
    { x: SEARCH_BAR_FRAC.x * stageW, y: SEARCH_BAR_FRAC.y * stageH }
  const cursorStar =
    resolveAnchor?.('[id="inbox-market"]') ??
    { x: STAR_FRAC.x * stageW, y: STAR_FRAC.y * stageH }
  let cursorPos: { x: number; y: number } | null = null
  let clickProgress = 0
  if (showCursor) {
    if (localTime >= 0.5 && localTime < 0.8) {
      const k = Easing.easeInOutCubic(clamp((localTime - 0.5) / 0.3, 0, 1))
      cursorPos = {
        x: stageW * 0.5 + (cursorSearchBar.x - stageW * 0.5) * k,
        y: stageH * 0.9 + (cursorSearchBar.y - stageH * 0.9) * k,
      }
    } else if (localTime >= 0.8 && localTime < 2.5) {
      cursorPos = cursorSearchBar
      if (localTime < 1.0) clickProgress = (localTime - 0.8) / 0.2
    } else if (localTime >= 2.5 && localTime < 3.0) {
      const k = Easing.easeInOutCubic(clamp((localTime - 2.5) / 0.5, 0, 1))
      cursorPos = {
        x: cursorSearchBar.x + (cursorStar.x - cursorSearchBar.x) * k,
        y: cursorSearchBar.y + (cursorStar.y - cursorSearchBar.y) * k,
      }
    } else if (localTime >= 3.0) {
      cursorPos = cursorStar
      if (localTime < 3.3) clickProgress = (localTime - 3.0) / 0.3
    }
  }

  const agents = useMemo(() => buildInboxAgents(s), [s])

  // Re-compute threads only when star state changes
  const allThreads = useMemo(
    () => buildInboxThreads(agents, s, isStarred ? 'inbox-market' : null),
    [agents, s, isStarred],
  )

  // Filter to only research-tagged threads once the search term is complete
  const filteredThreads = useMemo(
    () =>
      isFiltered
        ? allThreads.filter((th) => th.tags.includes(TAG_RESEARCH))
        : allThreads,
    [allThreads, isFiltered],
  )

  const chromeInset = Math.round(Math.min(40, Math.max(8, stageW * 0.031)))

  const opacityRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    if (opacityRef.current) opacityRef.current.style.opacity = String(opacity)
  })

  return (
    <div ref={opacityRef} style={{ position: 'absolute', inset: 0, opacity }}>
      <TagSearchContent threads={filteredThreads} search={search} />

      {captionT > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: chromeInset + 20,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            opacity: captionT,
            transform: `translateY(${(1 - captionT) * 10}px)`,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              fontFamily: "'Unbounded', Georgia, serif",
              fontStyle: 'italic',
              fontSize: clamp(stageW * 0.028, 14, 32),
              color: '#1a1d22',
              background: 'rgba(255,255,255,0.85)',
              backdropFilter: 'blur(8px)',
              padding: '8px 24px',
              borderRadius: 12,
              letterSpacing: '-0.01em',
            }}
          >
            {captionText}
          </div>
        </div>
      )}

      {cursorPos && (
        <FakeCursor
          x={cursorPos.x}
          y={cursorPos.y}
          clickProgress={clickProgress}
        />
      )}
    </div>
  )
}

export function SceneTagsSearch({ start = 15.9, end = 20 }: SceneProps) {
  return (
    <Sprite start={start} end={end}>
      <SceneTagsSearchInner />
    </Sprite>
  )
}
