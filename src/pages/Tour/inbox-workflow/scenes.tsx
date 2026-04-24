/**
 * Inbox-workflow tour — three new scene components.
 *
 * SceneInboxFull   (2.4–10s)   Browser chrome with thread list + thread preview
 * SceneTranscript  (9.9–16s)   Chronological event timeline for a thread
 * SceneTagsSearch  (15.9–20s)  Search bar + tag filtering + star interaction
 */
import { useI18n } from '@/i18n'
import { clamp, Easing, Sprite, useStageSize } from '../player'
import { BrowserChrome, FakeCursor } from '../primitives'
import inboxWorkflowI18n from './i18n'

interface SceneProps {
  start?: number
  end?: number
}

// ── Shared constants ──────────────────────────────────────────────────────

const THREAD_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ef4444', '#6b7280']

// ── Scene 2: Inbox full ───────────────────────────────────────────────────

export function SceneInboxFull({ start = 2.4, end = 10 }: SceneProps) {
  const { t } = useI18n(inboxWorkflowI18n)
  const { width: stageW } = useStageSize()

  const threads = [
    { title: t('Q1 Expense Audit'), agent: t('Auditor'), time: t('2m ago'), unread: true, color: THREAD_COLORS[0] },
    { title: t('Blog post draft'), agent: t('Scribe'), time: t('15m ago'), unread: true, color: THREAD_COLORS[1] },
    { title: t('API documentation'), agent: t('DocBot'), time: t('1h ago'), unread: false, color: THREAD_COLORS[2], selected: true },
    { title: t('Market research'), agent: t('Scout'), time: t('3h ago'), unread: false, color: THREAD_COLORS[3] },
    { title: t('Code review: auth'), agent: t('Reviewer'), time: t('5h ago'), unread: true, color: THREAD_COLORS[4] },
    { title: t('Weekly summary'), agent: t('Digest'), time: t('1d ago'), unread: false, color: THREAD_COLORS[5] },
  ]

  const previewMessages = [
    { role: 'user' as const, text: t('Audit Q1 expenses and flag anomalies') },
    { role: 'thinking' as const, text: t('Analyzing expense data across departments…') },
    { role: 'assistant' as const, text: t('Found 3 anomalies totaling $12,400. Two duplicate vendor payments and one misclassified expense in Marketing.') },
  ]

  return (
    <Sprite start={start} end={end}>
      {({ localTime, duration }) => {
        const time = localTime
        const inT = Easing.easeOutCubic(clamp(time / 0.6, 0, 1))
        const exitT = clamp((time - (duration - 0.5)) / 0.5, 0, 1)
        const opacity = inT * (1 - exitT)

        const chromeInset = Math.round(Math.min(40, Math.max(8, stageW * 0.031)))
        const fontSize = Math.round(Math.min(13, Math.max(9, stageW * 0.014)))
        const titleFz = Math.round(Math.min(14, Math.max(10, stageW * 0.015)))

        return (
          <div style={{ position: 'absolute', inset: 0, opacity }}>
            <BrowserChrome inset={chromeInset} tabTitle="DEVS">
              <div style={{ display: 'flex', width: '100%', height: '100%', background: '#f8f9fb' }}>
                {/* Left panel — thread list */}
                <div
                  style={{
                    width: '30%',
                    borderRight: '1px solid #e2e5ea',
                    background: '#ffffff',
                    overflowY: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {threads.map((thread, i) => {
                    const rowIn = clamp((time - 0.4 - i * 0.15) / 0.4, 0, 1)
                    return (
                      <div
                        key={thread.title}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: Math.max(6, fontSize * 0.5),
                          padding: `${Math.max(8, fontSize * 0.7)}px ${Math.max(10, fontSize * 0.8)}px`,
                          borderBottom: '1px solid #f0f1f3',
                          background: thread.selected ? '#eef2ff' : 'transparent',
                          opacity: rowIn,
                          transform: `translateX(${(1 - rowIn) * -20}px)`,
                          cursor: 'default',
                        }}
                      >
                        {/* Color dot */}
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 4,
                            background: thread.color,
                            flexShrink: 0,
                          }}
                        />
                        {/* Content */}
                        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span
                              style={{
                                fontFamily: 'Figtree, system-ui, sans-serif',
                                fontSize: titleFz,
                                fontWeight: thread.unread ? 600 : 400,
                                color: '#1a1d22',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {thread.title}
                            </span>
                            <span
                              style={{
                                fontFamily: "'Geist', ui-monospace, monospace",
                                fontSize: Math.max(8, fontSize - 3),
                                color: '#9ca3af',
                                flexShrink: 0,
                                marginLeft: 4,
                              }}
                            >
                              {thread.time}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span
                              style={{
                                fontFamily: "'Geist', ui-monospace, monospace",
                                fontSize: Math.max(8, fontSize - 2),
                                color: '#6b7280',
                              }}
                            >
                              {thread.agent}
                            </span>
                            {thread.unread && (
                              <span
                                style={{
                                  width: 7,
                                  height: 7,
                                  borderRadius: 4,
                                  background: '#3b82f6',
                                  flexShrink: 0,
                                }}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Right panel — thread preview */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: Math.max(12, fontSize) }}>
                  {/* Thread title */}
                  <div
                    style={{
                      fontFamily: "'Unbounded', Georgia, serif",
                      fontSize: Math.round(titleFz * 1.2),
                      fontWeight: 600,
                      color: '#1a1d22',
                      marginBottom: Math.max(12, fontSize),
                      opacity: clamp((time - 0.8) / 0.4, 0, 1),
                    }}
                  >
                    {t('API documentation')}
                  </div>

                  {/* Message bubbles */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: Math.max(8, fontSize * 0.6) }}>
                    {previewMessages.map((msg, i) => {
                      const msgIn = clamp((time - 1.2 - i * 0.6) / 0.5, 0, 1)
                      const isUser = msg.role === 'user'
                      const isThinking = msg.role === 'thinking'
                      return (
                        <div
                          key={i}
                          style={{
                            alignSelf: isUser ? 'flex-end' : 'flex-start',
                            maxWidth: '80%',
                            background: isUser ? 'oklch(62.04% 0.195 253.83)' : '#ffffff',
                            color: isUser ? '#ffffff' : '#1a1d22',
                            borderRadius: 12,
                            padding: `${Math.max(8, fontSize * 0.6)}px ${Math.max(12, fontSize * 0.9)}px`,
                            fontFamily: 'Figtree, system-ui, sans-serif',
                            fontSize,
                            lineHeight: 1.5,
                            opacity: msgIn * (isThinking ? 0.5 : 1),
                            transform: `translateY(${(1 - msgIn) * 12}px)`,
                            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                            fontStyle: isThinking ? 'italic' : 'normal',
                          }}
                        >
                          {msg.text}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </BrowserChrome>
          </div>
        )
      }}
    </Sprite>
  )
}

// ── Scene 3: Transcript ───────────────────────────────────────────────────

const TIMELINE_ICONS: Record<string, string> = {
  chat: '💬',
  brain: '🧠',
  wrench: '🔧',
  check: '✓',
}

interface TimelineEvent {
  label: string
  icon: string
  detail: string
  duration: string
  tokens: string
  delay: number
  dimmed?: boolean
}

export function SceneTranscript({ start = 9.9, end = 16 }: SceneProps) {
  const { t } = useI18n(inboxWorkflowI18n)
  const { width: stageW } = useStageSize()

  const events: TimelineEvent[] = [
    { label: t('User input'), icon: 'chat', detail: t('Audit Q1 expenses...'), duration: t('1.2s'), tokens: t('340 tok'), delay: 0.5 },
    { label: t('Thinking'), icon: 'brain', detail: t('Analyzing expense data...'), duration: t('0.8s'), tokens: t('—'), delay: 1.5, dimmed: true },
    { label: t('Tool call'), icon: 'wrench', detail: t('calculate — 247 transactions'), duration: t('2.1s'), tokens: t('580 tok'), delay: 2.5 },
    { label: t('Tool call'), icon: 'wrench', detail: t('search_knowledge — Q1 reports'), duration: t('1.5s'), tokens: t('120 tok'), delay: 3.5 },
    { label: t('Response'), icon: 'check', detail: t('Found 3 anomalies...'), duration: t('0.9s'), tokens: t('410 tok'), delay: 4.5 },
  ]

  return (
    <Sprite start={start} end={end}>
      {({ localTime, duration }) => {
        const time = localTime
        const inT = Easing.easeOutCubic(clamp(time / 0.6, 0, 1))
        const exitT = clamp((time - (duration - 0.5)) / 0.5, 0, 1)
        const opacity = inT * (1 - exitT)

        const chromeInset = Math.round(Math.min(40, Math.max(8, stageW * 0.031)))
        const fontSize = Math.round(Math.min(13, Math.max(9, stageW * 0.014)))
        const titleFz = Math.round(Math.min(14, Math.max(10, stageW * 0.015)))
        const rowH = Math.round(Math.min(48, Math.max(32, stageW * 0.045)))

        return (
          <div style={{ position: 'absolute', inset: 0, opacity }}>
            <BrowserChrome inset={chromeInset} tabTitle="DEVS">
              <div style={{ display: 'flex', width: '100%', height: '100%', background: '#f8f9fb' }}>
                {/* Left panel — simplified thread list (dimmed) */}
                <div
                  style={{
                    width: '30%',
                    borderRight: '1px solid #e2e5ea',
                    background: '#ffffff',
                    opacity: 0.4,
                    padding: Math.max(8, fontSize * 0.6),
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      style={{
                        height: rowH * 0.7,
                        background: i === 0 ? '#eef2ff' : '#f5f6f8',
                        borderRadius: 6,
                      }}
                    />
                  ))}
                </div>

                {/* Right panel — transcript timeline */}
                <div style={{ flex: 1, padding: Math.max(16, fontSize * 1.2), display: 'flex', flexDirection: 'column' }}>
                  {/* Title */}
                  <div
                    style={{
                      fontFamily: "'Unbounded', Georgia, serif",
                      fontSize: Math.round(titleFz * 1.2),
                      fontWeight: 600,
                      color: '#1a1d22',
                      marginBottom: Math.max(16, fontSize * 1.2),
                      opacity: clamp(time / 0.4, 0, 1),
                    }}
                  >
                    {t('Q1 Expense Audit')}
                  </div>

                  {/* Timeline */}
                  <div style={{ position: 'relative', flex: 1 }}>
                    {/* Vertical line */}
                    <div
                      style={{
                        position: 'absolute',
                        left: 14,
                        top: 4,
                        bottom: 4,
                        width: 2,
                        background: '#e2e5ea',
                        borderRadius: 1,
                      }}
                    />

                    {/* Events */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: Math.max(8, fontSize * 0.6) }}>
                      {events.map((evt, i) => {
                        const evtIn = Easing.easeOutCubic(clamp((time - evt.delay) / 0.5, 0, 1))
                        return (
                          <div
                            key={i}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: Math.max(10, fontSize * 0.8),
                              opacity: evtIn * (evt.dimmed ? 0.5 : 1),
                              transform: `translateY(${(1 - evtIn) * 16}px)`,
                              minHeight: rowH,
                            }}
                          >
                            {/* Icon dot */}
                            <div
                              style={{
                                width: 30,
                                height: 30,
                                borderRadius: 15,
                                background: '#ffffff',
                                border: '2px solid #e2e5ea',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: evt.icon === 'check' ? 14 : 14,
                                flexShrink: 0,
                                zIndex: 1,
                                color: evt.icon === 'check' ? '#22c55e' : undefined,
                                fontWeight: evt.icon === 'check' ? 700 : 400,
                              }}
                            >
                              {TIMELINE_ICONS[evt.icon]}
                            </div>

                            {/* Content */}
                            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <span
                                style={{
                                  fontFamily: "'Geist', ui-monospace, monospace",
                                  fontSize: Math.max(9, fontSize - 1),
                                  fontWeight: 600,
                                  color: '#6b7280',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.06em',
                                }}
                              >
                                {evt.label}
                              </span>
                              <span
                                style={{
                                  fontFamily: 'Figtree, system-ui, sans-serif',
                                  fontSize,
                                  color: '#1a1d22',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {evt.detail}
                              </span>
                            </div>

                            {/* Badges */}
                            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                              <span
                                style={{
                                  fontFamily: "'Geist', ui-monospace, monospace",
                                  fontSize: Math.max(8, fontSize - 3),
                                  color: '#9ca3af',
                                  background: '#f0f1f3',
                                  borderRadius: 4,
                                  padding: '2px 6px',
                                }}
                              >
                                {evt.duration}
                              </span>
                              <span
                                style={{
                                  fontFamily: "'Geist', ui-monospace, monospace",
                                  fontSize: Math.max(8, fontSize - 3),
                                  color: '#9ca3af',
                                  background: '#f0f1f3',
                                  borderRadius: 4,
                                  padding: '2px 6px',
                                }}
                              >
                                {evt.tokens}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </BrowserChrome>
          </div>
        )
      }}
    </Sprite>
  )
}

// ── Scene 4: Tags & search ────────────────────────────────────────────────

export function SceneTagsSearch({ start = 15.9, end = 20 }: SceneProps) {
  const { t } = useI18n(inboxWorkflowI18n)
  const { width: stageW, height: stageH } = useStageSize()

  const allThreads = [
    { title: t('Q1 Expense Audit'), agent: t('Auditor'), color: THREAD_COLORS[0], match: false, starred: false },
    { title: t('Blog post draft'), agent: t('Scribe'), color: THREAD_COLORS[1], match: false, starred: false },
    { title: t('API documentation'), agent: t('DocBot'), color: THREAD_COLORS[2], match: true, starred: false },
    { title: t('Market research'), agent: t('Scout'), color: THREAD_COLORS[3], match: true, starred: false },
    { title: t('Code review: auth'), agent: t('Reviewer'), color: THREAD_COLORS[4], match: false, starred: false },
    { title: t('Weekly summary'), agent: t('Digest'), color: THREAD_COLORS[5], match: false, starred: false },
  ]

  const searchText = t('#research')
  const captionText = t('Search. Tag. Organize.')

  const SEARCH_BAR_FRAC = { x: 0.15, y: 0.23 }
  const STAR_FRAC = { x: 0.045, y: 0.44 }

  const toCursor = (frac: { x: number; y: number }) => ({
    x: frac.x * stageW,
    y: frac.y * stageH,
  })

  return (
    <Sprite start={start} end={end}>
      {({ localTime, duration }) => {
        const time = localTime
        const inT = Easing.easeOutCubic(clamp(time / 0.5, 0, 1))
        const exitT = clamp((time - (duration - 0.5)) / 0.5, 0, 1)
        const opacity = inT * (1 - exitT)

        const chromeInset = Math.round(Math.min(40, Math.max(8, stageW * 0.031)))
        const fontSize = Math.round(Math.min(13, Math.max(9, stageW * 0.014)))
        const titleFz = Math.round(Math.min(14, Math.max(10, stageW * 0.015)))

        // Timeline:
        // 0.0–0.5: scene fades in
        // 0.5–0.8: cursor moves to search bar
        // 0.8–1.0: click search bar
        // 1.0–2.0: type "#research"
        // 2.0–2.5: list filters
        // 2.5–3.0: cursor moves to star
        // 3.0–3.3: click star
        // 3.3–4.1: caption appears

        const cursorSearchBar = toCursor(SEARCH_BAR_FRAC)
        const cursorStar = toCursor(STAR_FRAC)

        // Cursor position
        let cursorPos: { x: number; y: number } | null = null
        let clickProgress = 0
        const showCursor = stageW >= 700

        if (showCursor) {
          if (time >= 0.5 && time < 0.8) {
            // Moving to search bar
            const t2 = (time - 0.5) / 0.3
            cursorPos = {
              x: stageW * 0.5 + (cursorSearchBar.x - stageW * 0.5) * Easing.easeInOutCubic(clamp(t2, 0, 1)),
              y: stageH * 0.9 + (cursorSearchBar.y - stageH * 0.9) * Easing.easeInOutCubic(clamp(t2, 0, 1)),
            }
          } else if (time >= 0.8 && time < 2.5) {
            cursorPos = cursorSearchBar
            if (time >= 0.8 && time < 1.0) {
              clickProgress = (time - 0.8) / 0.2
            }
          } else if (time >= 2.5 && time < 3.0) {
            const t2 = (time - 2.5) / 0.5
            const k = Easing.easeInOutCubic(clamp(t2, 0, 1))
            cursorPos = {
              x: cursorSearchBar.x + (cursorStar.x - cursorSearchBar.x) * k,
              y: cursorSearchBar.y + (cursorStar.y - cursorSearchBar.y) * k,
            }
          } else if (time >= 3.0) {
            cursorPos = cursorStar
            if (time >= 3.0 && time < 3.3) {
              clickProgress = (time - 3.0) / 0.3
            }
          }
        }

        // Search text progress
        const typeProgress = clamp((time - 1.0) / 1.0, 0, 1)
        const charsShown = Math.floor(searchText.length * typeProgress)
        const searchActive = time >= 1.0

        // Filter progress
        const filterT = clamp((time - 2.0) / 0.4, 0, 1)

        // Star clicked
        const starClicked = time >= 3.2

        // Caption
        const captionT = clamp((time - 3.3) / 0.5, 0, 1)

        return (
          <div style={{ position: 'absolute', inset: 0, opacity }}>
            <BrowserChrome inset={chromeInset} tabTitle="DEVS">
              <div style={{ display: 'flex', width: '100%', height: '100%', background: '#f8f9fb' }}>
                {/* Left panel — thread list with search */}
                <div
                  style={{
                    width: '30%',
                    borderRight: '1px solid #e2e5ea',
                    background: '#ffffff',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {/* Search bar */}
                  <div
                    style={{
                      padding: `${Math.max(8, fontSize * 0.6)}px`,
                      borderBottom: '1px solid #f0f1f3',
                    }}
                  >
                    <div
                      style={{
                        height: Math.max(28, fontSize * 2.2),
                        background: searchActive ? '#ffffff' : '#f5f6f8',
                        border: searchActive ? '1.5px solid oklch(62.04% 0.195 253.83)' : '1px solid #e2e5ea',
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0 10px',
                        fontFamily: 'Figtree, system-ui, sans-serif',
                        fontSize,
                        color: '#1a1d22',
                        transition: 'border 0.2s',
                      }}
                    >
                      <span style={{ color: '#9ca3af', marginRight: 6, fontSize: fontSize - 1 }}>🔍</span>
                      {searchActive && (
                        <>
                          <span>{searchText.slice(0, charsShown)}</span>
                          {charsShown < searchText.length && (
                            <span
                              style={{
                                display: 'inline-block',
                                width: 1.5,
                                height: '1.1em',
                                marginLeft: 1,
                                background: 'oklch(62.04% 0.195 253.83)',
                                verticalAlign: 'text-bottom',
                                animation: 'devs-caret 0.9s steps(1) infinite',
                              }}
                            />
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Filtered thread list */}
                  {allThreads.map((thread, i) => {
                    const isVisible = !filterT || thread.match || filterT < 1
                    const rowOpacity = filterT > 0 && !thread.match ? 1 - filterT : 1
                    const isFirstMatch = thread.match && allThreads.filter((th, idx) => th.match && idx < i).length === 0

                    if (rowOpacity <= 0) return null

                    return (
                      <div
                        key={thread.title}
                        style={{
                          display: isVisible ? 'flex' : 'none',
                          alignItems: 'center',
                          gap: Math.max(6, fontSize * 0.5),
                          padding: `${Math.max(8, fontSize * 0.7)}px ${Math.max(10, fontSize * 0.8)}px`,
                          borderBottom: '1px solid #f0f1f3',
                          opacity: rowOpacity,
                          cursor: 'default',
                        }}
                      >
                        {/* Star dot */}
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 4,
                            background:
                              starClicked && isFirstMatch
                                ? '#f59e0b'
                                : thread.color,
                            flexShrink: 0,
                            transition: 'background 0.3s',
                          }}
                        />
                        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span
                            style={{
                              fontFamily: 'Figtree, system-ui, sans-serif',
                              fontSize: titleFz,
                              fontWeight: 500,
                              color: '#1a1d22',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {thread.title}
                          </span>
                          <span
                            style={{
                              fontFamily: "'Geist', ui-monospace, monospace",
                              fontSize: Math.max(8, fontSize - 2),
                              color: '#6b7280',
                            }}
                          >
                            {thread.agent}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Right panel — dimmed placeholder */}
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0.15,
                  }}
                >
                  <div
                    style={{
                      width: '60%',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                    }}
                  >
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        style={{
                          height: Math.max(20, fontSize * 1.5),
                          background: '#d7dbe0',
                          borderRadius: 6,
                          width: `${80 - i * 15}%`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </BrowserChrome>

            {/* Caption overlay */}
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
      }}
    </Sprite>
  )
}
