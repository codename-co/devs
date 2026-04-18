import { useState, useCallback, useRef, useEffect } from 'react'
import { ScrollShadow } from '@heroui/react_3'
import { AgentAvatar, Icon, MarkdownRenderer, PromptArea } from '@/components'
import { useI18n } from '@/i18n'
import { languages } from '@/i18n/locales'
import { LLMService, type LLMMessage } from '@/lib/llm'
import { CredentialService } from '@/lib/credential-service'
import { buildAgentInstructions } from '@/lib/agent-knowledge'
import { buildMemoryContextForChat } from '@/lib/memory-learning-service'
import { CITATION_INSTRUCTIONS } from '@/lib/agent-knowledge'
import type { Agent } from '@/types'
import { nanoid } from 'nanoid'

interface PlaygroundTabProps {
  agent: Agent
}

interface PlaygroundMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export function PlaygroundTab({ agent }: PlaygroundTabProps) {
  const { lang } = useI18n()
  const [messages, setMessages] = useState<PlaygroundMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Auto-scroll on new content
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, streamingContent])

  // Reset conversation when agent changes
  useEffect(() => {
    setMessages([])
    setStreamingContent('')
    setIsStreaming(false)
    setError(null)
    abortRef.current?.abort()
  }, [agent.id])

  const handleSubmit = useCallback(
    async (prompt?: string) => {
      const text = prompt?.trim()
      if (!text || isStreaming) return

      setError(null)

      const userMsg: PlaygroundMessage = {
        id: nanoid(),
        role: 'user',
        content: text,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, userMsg])
      setIsStreaming(true)
      setStreamingContent('')

      try {
        const config = await CredentialService.getActiveConfig()
        if (!config) {
          setError(
            'No AI provider configured. Please configure one in Settings.',
          )
          setIsStreaming(false)
          return
        }

        // Build enhanced instructions identically to submitChat
        const baseInstructions =
          agent.instructions || 'You are a helpful assistant.'
        const enhancedInstructions = await buildAgentInstructions(
          baseInstructions,
          agent.knowledgeItemIds,
          agent.id,
        )
        const memoryContext = await buildMemoryContextForChat(agent.id, text)
        const hasKnowledgeItems =
          agent.knowledgeItemIds && agent.knowledgeItemIds.length > 0

        const systemPrompt = [
          enhancedInstructions,
          memoryContext,
          !hasKnowledgeItems ? CITATION_INSTRUCTIONS : '',
          `ALWAYS respond in ${languages[lang]} as this is the user's language.`,
        ]
          .filter(Boolean)
          .join('\n\n')

        const llmMessages: LLMMessage[] = [
          { role: 'system', content: systemPrompt },
          ...messages.map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          })),
          { role: 'user', content: text },
        ]

        const abortController = new AbortController()
        abortRef.current = abortController

        let accumulated = ''
        for await (const chunk of LLMService.streamChat(llmMessages, {
          ...config,
          ...(agent.temperature != null
            ? { temperature: agent.temperature }
            : {}),
          signal: abortController.signal,
        })) {
          if (abortController.signal.aborted) break
          accumulated += chunk
          setStreamingContent(accumulated)
        }

        if (accumulated) {
          setMessages((prev) => [
            ...prev,
            {
              id: nanoid(),
              role: 'assistant',
              content: accumulated,
              timestamp: new Date(),
            },
          ])
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          setStreamingContent((current) => {
            if (current) {
              setMessages((prev) => [
                ...prev,
                {
                  id: nanoid(),
                  role: 'assistant',
                  content: current,
                  timestamp: new Date(),
                },
              ])
            }
            return ''
          })
        } else {
          setError(err instanceof Error ? err.message : 'An error occurred')
        }
      } finally {
        setStreamingContent('')
        setIsStreaming(false)
        abortRef.current = null
      }
    },
    [isStreaming, messages, agent, lang],
  )

  const handleStop = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  const handleClear = useCallback(() => {
    setMessages([])
    setStreamingContent('')
    setError(null)
    abortRef.current?.abort()
    setIsStreaming(false)
  }, [])

  const isEmpty = messages.length === 0 && !isStreaming

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {/* Messages area */}
      <ScrollShadow
        ref={scrollRef}
        hideScrollBar
        className="min-h-0 flex-1 overflow-y-auto"
      >
        {isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 py-8">
            <AgentAvatar agent={agent} size="md" />
            <div className="text-center">
              <p className="text-foreground text-sm font-medium">
                Test {agent.name}
              </p>
              <p className="text-muted mt-1 text-xs">
                Send a message to try this agent. Nothing is saved.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 py-1">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {isStreaming && streamingContent && (
              <MessageBubble
                message={{
                  id: 'streaming',
                  role: 'assistant',
                  content: streamingContent,
                  timestamp: new Date(),
                }}
              />
            )}
            {isStreaming && !streamingContent && (
              <div className="flex items-center gap-2 px-2 py-1">
                <div className="bg-default-200 size-1.5 animate-pulse rounded-full" />
                <div className="bg-default-200 size-1.5 animate-pulse rounded-full [animation-delay:150ms]" />
                <div className="bg-default-200 size-1.5 animate-pulse rounded-full [animation-delay:300ms]" />
              </div>
            )}
          </div>
        )}
      </ScrollShadow>

      {/* Error banner */}
      {error && (
        <div className="bg-danger-50 text-danger border-danger-200 shrink-0 rounded-lg border px-3 py-2 text-xs">
          {error}
        </div>
      )}

      {/* Input area */}
      <div className="shrink-0">
        {messages.length > 0 && (
          <div className="mb-2 flex justify-end">
            <button
              type="button"
              className="text-muted hover:text-foreground flex items-center gap-1 text-xs transition-colors"
              onClick={handleClear}
            >
              <Icon name="Restart" size="xs" />
              Clear
            </button>
          </div>
        )}
        <PromptArea
          lang={lang}
          className="!max-w-full"
          placeholder="Send a message..."
          isSending={isStreaming}
          onStop={handleStop}
          onSubmitToAgent={handleSubmit}
          disabledAgentPicker
          disabledMention
        />
      </div>
    </div>
  )
}

function MessageBubble({ message }: { message: PlaygroundMessage }) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-md'
            : 'bg-transparent text-foreground'
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="prose-sm [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
            <MarkdownRenderer content={message.content} />
          </div>
        )}
      </div>
    </div>
  )
}
