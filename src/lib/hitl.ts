/**
 * Human-In-The-Loop (HITL) Service
 *
 * Provides a Promise-based API for agents and the orchestrator to request
 * human input during task execution. When YOLO mode is enabled, requests
 * are auto-resolved without user intervention.
 *
 * Flow:
 * 1. Agent calls `requestHumanInput()` with a question and optional quick replies
 * 2. A system message is added to the conversation with the HITL prompt
 * 3. The Promise blocks until the user responds (or YOLO mode auto-resolves)
 * 4. The response is returned to the caller
 *
 * @module lib/hitl
 */

import type { HitlRequest, HitlRequestOptions, HitlResponse } from '@/types'
import { getEffectiveSettings } from '@/stores/userStore'
import { notifyHitlRequest } from '@/lib/web-notifications'

// ============================================================================
// Internal State
// ============================================================================

/** Registry of pending HITL requests with their resolve callbacks */
const pendingRequests = new Map<
  string,
  {
    request: HitlRequest
    resolve: (response: HitlResponse) => void
  }
>()

/** Event listeners for new HITL requests */
type HitlEventListener = (request: HitlRequest) => void
const listeners = new Set<HitlEventListener>()

// ============================================================================
// Auto-Resolution (YOLO Mode)
// ============================================================================

/**
 * Determine the automatic response for a HITL request based on its type.
 */
function getAutoResponse(options: HitlRequestOptions): string {
  const replies = options.quickReplies

  switch (options.type) {
    case 'approval':
      // Pick the first "success" reply, or the first reply, or default
      if (replies?.length) {
        const successReply = replies.find((r) => r.color === 'success')
        return successReply?.value ?? replies[0].value
      }
      return 'approved'

    case 'clarification':
      return 'Proceed with your best judgment'

    case 'choice':
      if (replies?.length) {
        return replies[0].value
      }
      return 'Proceed with the first option'

    case 'confirmation':
      return 'confirmed'

    case 'feedback':
      return 'Looks good, proceed'

    default:
      return 'Proceed'
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Request human input from the user.
 *
 * Creates a HITL request and returns a Promise that resolves when the user
 * responds. If YOLO mode is enabled, the request auto-resolves immediately.
 *
 * @param options - Request configuration (question, quick replies, etc.)
 * @returns Promise resolving with the user's response
 */
export function requestHumanInput(
  options: HitlRequestOptions,
): Promise<HitlResponse> {
  const isYoloMode = getEffectiveSettings().yoloMode ?? false

  const request: HitlRequest = {
    id: crypto.randomUUID(),
    conversationId: options.conversationId,
    agentId: options.agentId,
    type: options.type,
    question: options.question,
    quickReplies: options.quickReplies,
    status: 'pending',
    createdAt: new Date().toISOString(),
  }

  // YOLO mode → auto-resolve immediately
  if (isYoloMode) {
    const autoValue = getAutoResponse(options)
    request.status = 'auto-resolved'
    request.response = autoValue
    request.resolvedAt = new Date().toISOString()

    // Notify listeners so UI can show the auto-resolved request
    notifyListeners(request)

    return Promise.resolve({
      status: 'auto-resolved',
      value: autoValue,
    })
  }

  // Normal mode → wait for user response
  return new Promise<HitlResponse>((resolve) => {
    pendingRequests.set(request.id, { request, resolve })
    notifyListeners(request)
    notifyHitlRequest(options.question)
  })
}

/**
 * Resolve a pending HITL request with a user response.
 * Called when the user clicks a quick reply or submits text.
 */
export function resolveHitlRequest(requestId: string, value: string): void {
  const entry = pendingRequests.get(requestId)
  if (!entry) return

  entry.request.status = 'answered'
  entry.request.response = value
  entry.request.resolvedAt = new Date().toISOString()

  // Notify listeners of the status change
  notifyListeners(entry.request)

  entry.resolve({
    status: 'answered',
    value,
  })

  pendingRequests.delete(requestId)
}

/**
 * Dismiss a pending HITL request without providing a response.
 * The agent will receive a dismissal status.
 */
export function dismissHitlRequest(requestId: string): void {
  const entry = pendingRequests.get(requestId)
  if (!entry) return

  entry.request.status = 'dismissed'
  entry.request.resolvedAt = new Date().toISOString()

  notifyListeners(entry.request)

  entry.resolve({
    status: 'dismissed',
    value: '',
  })

  pendingRequests.delete(requestId)
}

/**
 * Get a pending HITL request by ID.
 */
export function getPendingRequest(requestId: string): HitlRequest | undefined {
  return pendingRequests.get(requestId)?.request
}

/**
 * Get all pending HITL requests for a conversation.
 */
export function getPendingRequestsForConversation(
  conversationId: string,
): HitlRequest[] {
  return Array.from(pendingRequests.values())
    .filter((e) => e.request.conversationId === conversationId)
    .map((e) => e.request)
}

/**
 * Get all pending HITL requests across all conversations.
 */
export function getAllPendingRequests(): HitlRequest[] {
  return Array.from(pendingRequests.values()).map((e) => e.request)
}

/**
 * Check if YOLO mode is currently active.
 */
export function isYoloMode(): boolean {
  return getEffectiveSettings().yoloMode ?? false
}

// ============================================================================
// Event System
// ============================================================================

/**
 * Subscribe to HITL request events (new requests and status changes).
 * Returns an unsubscribe function.
 */
export function onHitlRequest(listener: HitlEventListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function notifyListeners(request: HitlRequest): void {
  for (const listener of listeners) {
    try {
      listener(request)
    } catch (error) {
      console.error('HITL listener error:', error)
    }
  }
}

// ============================================================================
// Cleanup
// ============================================================================

/**
 * Dismiss all pending requests for a conversation.
 * Used when a conversation is deleted or reset.
 */
export function dismissAllForConversation(conversationId: string): void {
  for (const [id, entry] of pendingRequests.entries()) {
    if (entry.request.conversationId === conversationId) {
      entry.request.status = 'dismissed'
      entry.request.resolvedAt = new Date().toISOString()
      entry.resolve({ status: 'dismissed', value: '' })
      pendingRequests.delete(id)
    }
  }
}
