/**
 * Battle Match Hook
 *
 * Hook for managing individual matches within a battle tournament.
 * Handles running the full match workflow: conversation generation
 * and judgment with progress tracking.
 *
 * @example
 * const { match, isRunning, progress, messages, runMatch } = useBattleMatch(battleId, matchId)
 */
import { useState, useCallback, useEffect, useRef } from 'react'
import { flushSync } from 'react-dom'

import { useBattleStore } from '@/stores/battleStore'
import { useConversationStore } from '@/stores/conversationStore'
import { battleService } from '../services/battleService'
import type { Message } from '@/types'

/**
 * Hook for managing a specific match in a battle.
 *
 * @param battleId - The ID of the battle containing the match
 * @param matchId - The ID of the match to manage
 * @returns Match state, messages, and control functions
 */
export function useBattleMatch(battleId: string, matchId: string) {
  const store = useBattleStore()
  const conversationStore = useConversationStore()
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState(0) // 0-100 for progress bar
  const [messages, setMessages] = useState<Message[]>([])
  const [currentTurn, setCurrentTurn] = useState(0)
  const [streamingContent, setStreamingContent] = useState<string>('') // Current streaming message
  const [streamingAgentId, setStreamingAgentId] = useState<string | null>(null)
  
  // Use ref to accumulate messages and force re-renders
  const messagesRef = useRef<Message[]>([])

  // Find the match in the current battle
  const match = store.currentBattle?.rounds
    .flatMap((r) => r.matches)
    .find((m) => m.id === matchId)

  // Load messages from conversation if match has a conversationId
  useEffect(() => {
    const loadMessages = async () => {
      if (match?.conversationId && !isRunning) {
        const conversation = await conversationStore.loadConversation(match.conversationId)
        if (conversation) {
          // Filter out system messages for display
          const displayMessages = conversation.messages.filter(m => m.role !== 'system')
          setMessages(displayMessages)
          messagesRef.current = displayMessages
        }
      }
    }
    loadMessages()
  }, [match?.conversationId, isRunning])

  // Run the full match (conversation + judgment)
  const runMatch = useCallback(async () => {
    if (!store.currentBattle || !match) return

    setIsRunning(true)
    setProgress(0)
    setMessages([])
    messagesRef.current = []
    setCurrentTurn(0)

    try {
      // Start the match
      await store.startMatch(battleId, matchId)
      setProgress(5)

      const totalTurns = store.currentBattle.turnsPerConversation

      // Conduct the conversation with live updates
      const conversationId = await battleService.conductConversation(
        match,
        store.currentBattle.topic,
        totalTurns,
        // onTurnComplete - called when a turn finishes
        (turn, total, message) => {
          // Use flushSync to force immediate DOM update
          flushSync(() => {
            // Update progress based on turn completion (5% to 70%)
            const turnProgress = 5 + ((turn / total) * 65)
            setProgress(turnProgress)
            setCurrentTurn(turn)
            
            // Clear streaming state
            setStreamingContent('')
            setStreamingAgentId(null)
            
            // Add completed message to ref and trigger re-render
            const newMessage: Message = {
              id: `turn-${turn}-${Date.now()}`,
              role: 'assistant',
              agentId: message.agentId,
              content: message.content,
              timestamp: new Date(),
            }
            messagesRef.current = [...messagesRef.current, newMessage]
            // Force state update with new array reference
            setMessages([...messagesRef.current])
          })
        },
        // onStreamChunk - called for each streaming token
        (turn, _total, agentId, _chunk, fullContent) => {
          // Update state - React will batch and render
          setCurrentTurn(turn)
          setStreamingAgentId(agentId)
          setStreamingContent(fullContent)
        }
      )
      
      await store.setMatchConversation(battleId, matchId, conversationId)
      setProgress(75)

      // Set match status to judging before requesting judgment
      await store.setMatchJudging(battleId, matchId)

      // Get judgment
      const judgment = await battleService.requestJudgment(
        conversationId,
        store.currentBattle.judgeAgentId,
        store.currentBattle.topic,
        store.currentBattle.customJudgingCriteria
      )
      setProgress(95)

      // Complete the match
      await store.completeMatch(battleId, matchId, judgment.winnerId, judgment)
      setProgress(100)
    } catch (error) {
      console.error('Match failed:', error)
      throw error
    } finally {
      setIsRunning(false)
    }
  }, [battleId, matchId, match, store])

  return {
    match,
    isRunning,
    progress,
    messages,
    currentTurn,
    totalTurns: store.currentBattle?.turnsPerConversation ?? 8,
    streamingContent,
    streamingAgentId,
    runMatch,
  }
}
