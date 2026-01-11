/**
 * Battle Service
 *
 * Core service for managing agent battles, including:
 * - Generating tournament matchups
 * - Conducting debate conversations between agents
 * - Requesting AI judge evaluations
 * - Managing tournament progression
 */

import { LLMService, LLMMessage } from '@/lib/llm'
import { CredentialService } from '@/lib/credential-service'
import { useConversationStore } from '@/stores/conversationStore'
import { getAgentById } from '@/stores/agentStore'
import {
  Battle,
  BattleMatch,
  BattleJudgment,
  BattleRound,
  AgentScore,
} from '../types'

/**
 * Template for the judge's evaluation prompt.
 * Includes scoring criteria and expected JSON response format.
 */
const JUDGE_PROMPT_TEMPLATE = `You are the judge of a debate between two AI agents on the topic: "{topic}"

Your role is to evaluate the conversation and determine a winner based on:
1. Argument Quality (1-10): Logical coherence, evidence, sound reasoning
2. Persuasiveness (1-10): Ability to convince and engage
3. Creativity (1-10): Novel perspectives, unique insights
4. Responsiveness (1-10): How well they addressed opponent's points

{customCriteria}

After reviewing the conversation, provide your evaluation in this JSON format:
{
  "winnerId": "agent_id_here",
  "scores": [
    {"agentId": "...", "argumentQuality": X, "persuasiveness": X, "creativity": X, "responsiveness": X, "total": X},
    {"agentId": "...", "argumentQuality": X, "persuasiveness": X, "creativity": X, "responsiveness": X, "total": X}
  ],
  "reasoning": "Brief justification",
  "highlights": ["Notable moment 1", "Notable moment 2"]
}

IMPORTANT: Respond ONLY with the JSON object, no additional text.`

/**
 * Template for agent debate prompts.
 * Provides context about the debate format and opponent.
 */
const DEBATE_PROMPT_TEMPLATE = `You are participating in a structured debate on the topic: "{topic}"

This is turn {turnNumber} of {totalTurns} in your debate against {opponentName}.
{turnContext}

Your goal is to:
- Present compelling arguments supporting your position
- Address and counter your opponent's points when applicable
- Be persuasive, creative, and well-reasoned
- Stay focused on the topic

{previousMessage}

Provide your response for this turn of the debate:`

export const battleService = {
  /**
   * Generate matchups for a round based on remaining agents.
   * Pairs agents optimally - from different teams when possible,
   * or winners from previous rounds.
   *
   * @param battle - The current battle state
   * @param remainingAgentIds - IDs of agents still in the tournament
   * @returns Array of match configurations
   */
  generateMatchups(battle: Battle, remainingAgentIds: string[]): BattleMatch[] {
    const matches: BattleMatch[] = []

    // Separate agents by team for balanced matchups
    const teamAAgents = remainingAgentIds.filter((id) =>
      battle.teamA.agentIds.includes(id),
    )
    const teamBAgents = remainingAgentIds.filter((id) =>
      battle.teamB.agentIds.includes(id),
    )

    // Create cross-team matchups first (Team A vs Team B)
    const minCrossTeam = Math.min(teamAAgents.length, teamBAgents.length)
    for (let i = 0; i < minCrossTeam; i++) {
      matches.push({
        id: crypto.randomUUID(),
        status: 'pending',
        agentAId: teamAAgents[i],
        agentBId: teamBAgents[i],
      })
    }

    // Handle remaining agents from the larger team (intra-team matchups)
    const remainingTeamA = teamAAgents.slice(minCrossTeam)
    const remainingTeamB = teamBAgents.slice(minCrossTeam)
    const remainingAgents = [...remainingTeamA, ...remainingTeamB]

    // Pair remaining agents together
    for (let i = 0; i < remainingAgents.length - 1; i += 2) {
      matches.push({
        id: crypto.randomUUID(),
        status: 'pending',
        agentAId: remainingAgents[i],
        agentBId: remainingAgents[i + 1],
      })
    }

    // If odd number of remaining agents, the last one gets a bye (auto-win)
    // This is handled in determineRoundWinners

    return matches
  },

  /**
   * Conduct a battle conversation between two agents.
   * Creates a new conversation, alternates turns between agents,
   * and stores all messages.
   *
   * @param match - The match configuration with agent IDs
   * @param topic - The debate topic
   * @param turnsPerConversation - Total turns (split between both agents)
   * @param onTurnComplete - Optional callback called after each turn with turn number and message
   * @param onStreamChunk - Optional callback called for each streaming chunk during a turn
   * @returns The conversation ID
   */
  async conductConversation(
    match: BattleMatch,
    topic: string,
    turnsPerConversation: number,
    onTurnComplete?: (
      turn: number,
      totalTurns: number,
      message: { agentId: string; content: string },
    ) => void,
    onStreamChunk?: (
      turn: number,
      totalTurns: number,
      agentId: string,
      chunk: string,
      fullContent: string,
    ) => void,
  ): Promise<string> {
    const { createConversation, addMessage } = useConversationStore.getState()

    // Get agent information
    const agentA = await getAgentById(match.agentAId)
    const agentB = await getAgentById(match.agentBId)

    if (!agentA || !agentB) {
      throw new Error('One or both agents not found')
    }

    // Get LLM configuration
    const config = await CredentialService.getActiveConfig()
    if (!config) {
      throw new Error('No LLM provider configured')
    }

    // Create a new conversation for this battle
    const conversation = await createConversation(match.agentAId, 'battle')

    // Add Agent B as a participant
    const store = useConversationStore.getState()
    await store.addAgentToConversation(conversation.id, match.agentBId)

    // Add initial system message explaining the battle context
    await addMessage(conversation.id, {
      role: 'system',
      content: `This is a structured debate between ${agentA.name} and ${agentB.name} on the topic: "${topic}". Each agent will take ${turnsPerConversation / 2} turns.`,
    })

    // Alternate between agents for the specified number of turns
    const turnsPerAgent = Math.floor(turnsPerConversation / 2)
    const conversationHistory: Array<{ role: string; content: string }> = []

    for (let turn = 0; turn < turnsPerConversation; turn++) {
      const isAgentATurn = turn % 2 === 0
      const currentAgent = isAgentATurn ? agentA : agentB
      const opponentAgent = isAgentATurn ? agentB : agentA
      const agentTurnNumber = Math.floor(turn / 2) + 1

      // Build turn context
      let turnContext = ''
      if (turn === 0) {
        turnContext =
          'You are opening the debate. Present your initial position clearly.'
      } else if (turn === turnsPerConversation - 1) {
        turnContext =
          'This is your final turn. Make your closing argument and summarize your key points.'
      } else {
        turnContext =
          'Continue building your argument and respond to your opponent.'
      }

      // Build previous message context
      let previousMessage = ''
      if (conversationHistory.length > 0) {
        const lastMessage = conversationHistory[conversationHistory.length - 1]
        previousMessage = `Your opponent's last statement:\n"${lastMessage.content}"`
      }

      // Build the debate prompt
      const debatePrompt = DEBATE_PROMPT_TEMPLATE.replace('{topic}', topic)
        .replace('{turnNumber}', agentTurnNumber.toString())
        .replace('{totalTurns}', turnsPerAgent.toString())
        .replace('{opponentName}', opponentAgent.name)
        .replace('{turnContext}', turnContext)
        .replace('{previousMessage}', previousMessage)

      // Prepare messages for LLM
      const llmMessages: LLMMessage[] = [
        {
          role: 'system',
          content: `${currentAgent.instructions || 'You are a helpful assistant.'}\n\n${debatePrompt}`,
        },
      ]

      // Include conversation history for context
      conversationHistory.forEach((msg) => {
        llmMessages.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })
      })

      // Add a user prompt to trigger the response
      llmMessages.push({
        role: 'user',
        content: 'Please provide your argument for this turn.',
      })

      // Generate agent's response with live streaming
      let response = ''
      let chunkCount = 0
      for await (const chunk of LLMService.streamChat(llmMessages, config)) {
        response += chunk
        chunkCount++
        // Notify listener of each streaming chunk for live updates
        if (onStreamChunk) {
          onStreamChunk(
            turn + 1,
            turnsPerConversation,
            currentAgent.id,
            chunk,
            response,
          )
          // Yield to browser every few chunks to allow rendering
          if (chunkCount % 3 === 0) {
            await new Promise((resolve) => setTimeout(resolve, 0))
          }
        }
      }

      // Save the message to the conversation
      await addMessage(conversation.id, {
        role: 'assistant',
        content: response,
        agentId: currentAgent.id,
      })

      // Add to history for context in next turns
      conversationHistory.push({
        role: isAgentATurn ? 'assistant' : 'user',
        content: response,
      })

      // Notify listener of turn completion
      if (onTurnComplete) {
        onTurnComplete(turn + 1, turnsPerConversation, {
          agentId: currentAgent.id,
          content: response,
        })
      }
    }

    return conversation.id
  },

  /**
   * Request judgment from the judge agent.
   * Loads the conversation, formats a prompt for the judge,
   * and parses the evaluation response.
   *
   * @param conversationId - ID of the debate conversation
   * @param judgeAgentId - ID of the judge agent
   * @param topic - The debate topic
   * @param customCriteria - Optional additional judging criteria
   * @returns Structured judgment with scores and winner
   */
  async requestJudgment(
    conversationId: string,
    judgeAgentId: string,
    topic: string,
    customCriteria?: string,
  ): Promise<BattleJudgment> {
    const { loadConversation } = useConversationStore.getState()

    // Load the conversation
    const conversation = await loadConversation(conversationId)
    if (!conversation) {
      throw new Error('Conversation not found')
    }

    // Get judge agent
    const judgeAgent = await getAgentById(judgeAgentId)
    if (!judgeAgent) {
      throw new Error('Judge agent not found')
    }

    // Get LLM configuration
    const config = await CredentialService.getActiveConfig()
    if (!config) {
      throw new Error('No LLM provider configured')
    }

    // Extract agent IDs from the conversation
    const agentIds =
      conversation.participatingAgents?.filter(
        (id) =>
          id !== conversation.agentId ||
          conversation.participatingAgents!.length === 1,
      ) || []

    // Get agent names for the transcript
    const agentMap = new Map<string, string>()
    for (const agentId of agentIds) {
      const agent = await getAgentById(agentId)
      if (agent) {
        agentMap.set(agentId, agent.name)
      }
    }

    // Format the conversation transcript
    const transcript = conversation.messages
      .filter((msg) => msg.role === 'assistant')
      .map((msg) => {
        const agentName = msg.agentId
          ? agentMap.get(msg.agentId) || 'Unknown Agent'
          : 'Unknown'
        return `**${agentName}** (${msg.agentId}):\n${msg.content}`
      })
      .join('\n\n---\n\n')

    // Build the judge prompt
    const customCriteriaText = customCriteria
      ? `\nAdditional judging criteria:\n${customCriteria}`
      : ''

    const judgePrompt = JUDGE_PROMPT_TEMPLATE.replace('{topic}', topic).replace(
      '{customCriteria}',
      customCriteriaText,
    )

    // Prepare messages for the judge
    const llmMessages: LLMMessage[] = [
      {
        role: 'system',
        content: `${judgeAgent.instructions || 'You are a fair and impartial judge.'}\n\n${judgePrompt}`,
      },
      {
        role: 'user',
        content: `Please evaluate this debate:\n\n${transcript}`,
      },
    ]

    // Get judge's evaluation
    let response = ''
    for await (const chunk of LLMService.streamChat(llmMessages, {
      ...config,
      temperature: 0.3, // Lower temperature for more consistent judging
    })) {
      response += chunk
    }

    // Parse the judgment response
    return this.parseJudgmentResponse(response, agentIds)
  },

  /**
   * Parse the judge's response into a structured BattleJudgment.
   *
   * @param response - Raw LLM response text
   * @param agentIds - IDs of agents in the match
   * @returns Parsed BattleJudgment object
   */
  parseJudgmentResponse(response: string, agentIds: string[]): BattleJudgment {
    try {
      // Extract JSON from response (handle markdown code blocks)
      let jsonStr = response.trim()

      // Strip markdown code fences if present
      const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
      if (codeBlockMatch) {
        jsonStr = codeBlockMatch[1].trim()
      }

      // Try to find JSON object in the response
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        jsonStr = jsonMatch[0]
      }

      const parsed = JSON.parse(jsonStr)

      // Validate and normalize the response
      const judgment: BattleJudgment = {
        winnerId: parsed.winnerId || agentIds[0],
        scores: (parsed.scores || []).map((score: Partial<AgentScore>) => ({
          agentId: score.agentId || '',
          argumentQuality: Number(score.argumentQuality) || 5,
          persuasiveness: Number(score.persuasiveness) || 5,
          creativity: Number(score.creativity) || 5,
          responsiveness: Number(score.responsiveness) || 5,
          total:
            Number(score.total) ||
            (Number(score.argumentQuality) || 5) +
              (Number(score.persuasiveness) || 5) +
              (Number(score.creativity) || 5) +
              (Number(score.responsiveness) || 5),
        })),
        reasoning: parsed.reasoning || 'No reasoning provided',
        highlights: parsed.highlights || [],
      }

      // Ensure all agents have scores
      for (const agentId of agentIds) {
        if (!judgment.scores.find((s) => s.agentId === agentId)) {
          judgment.scores.push({
            agentId,
            argumentQuality: 5,
            persuasiveness: 5,
            creativity: 5,
            responsiveness: 5,
            total: 20,
          })
        }
      }

      return judgment
    } catch (error) {
      console.error('Failed to parse judgment response:', error)

      // Return a default judgment if parsing fails
      return {
        winnerId: agentIds[0],
        scores: agentIds.map((agentId) => ({
          agentId,
          argumentQuality: 5,
          persuasiveness: 5,
          creativity: 5,
          responsiveness: 5,
          total: 20,
        })),
        reasoning: 'Judgment parsing failed - defaulting to first agent',
        highlights: [],
      }
    }
  },

  /**
   * Determine winners from a completed round.
   * Extracts winner IDs from all matches in the round.
   *
   * @param round - The completed battle round
   * @returns Array of winning agent IDs
   */
  determineRoundWinners(round: BattleRound): string[] {
    const winners: string[] = []

    for (const match of round.matches) {
      if (match.winnerId) {
        winners.push(match.winnerId)
      } else if (match.judgment?.winnerId) {
        winners.push(match.judgment.winnerId)
      }
    }

    return winners
  },

  /**
   * Check if the tournament is complete.
   * Tournament ends when only one agent remains or all rounds are done.
   *
   * @param battle - The current battle state
   * @returns True if tournament is complete
   */
  isTournamentComplete(battle: Battle): boolean {
    // Check if battle is explicitly completed
    if (battle.status === 'completed' || battle.status === 'cancelled') {
      return true
    }

    // Check if we have a champion
    if (battle.championAgentId) {
      return true
    }

    // Check if last round has only one winner
    if (battle.rounds.length > 0) {
      const lastRound = battle.rounds[battle.rounds.length - 1]
      if (lastRound.status === 'completed') {
        const winners = this.determineRoundWinners(lastRound)
        return winners.length === 1
      }
    }

    return false
  },

  /**
   * Get the champion agent ID from a completed battle.
   *
   * @param battle - The battle to check
   * @returns Champion agent ID or null if not yet determined
   */
  getChampion(battle: Battle): string | null {
    // Return stored champion if available
    if (battle.championAgentId) {
      return battle.championAgentId
    }

    // Check if battle is complete and get final winner
    if (battle.rounds.length > 0) {
      const lastRound = battle.rounds[battle.rounds.length - 1]
      if (lastRound.status === 'completed') {
        const winners = this.determineRoundWinners(lastRound)
        if (winners.length === 1) {
          return winners[0]
        }
      }
    }

    return null
  },

  /**
   * Calculate total number of rounds needed for a tournament.
   * For n agents per team (2n total), need ceil(log2(2n)) rounds.
   *
   * @param teamSize - Number of agents per team
   * @returns Number of rounds needed
   */
  calculateTotalRounds(teamSize: number): number {
    const totalAgents = teamSize * 2
    if (totalAgents <= 1) return 0
    return Math.ceil(Math.log2(totalAgents))
  },
}

export default battleService
