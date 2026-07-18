import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// ── Mocks ──

const applyMemoryOperation = vi.fn().mockResolvedValue('ok')
vi.mock('@/lib/memory-learning-service', () => ({
  applyMemoryOperation: (...args: unknown[]) =>
    (applyMemoryOperation as any)(...args),
  GLOBAL_MEMORY_AGENT_ID: '__global__',
}))
vi.mock('@/lib/toast', () => ({
  successToast: vi.fn(),
  errorToast: vi.fn(),
}))
vi.mock('@/i18n', () => ({
  useI18n: () => ({ t: (s: string) => s, lang: 'en' }),
}))
vi.mock('@/components', () => ({
  Icon: () => null,
}))

import {
  RememberSelectionMenu,
  formatSelectionNote,
} from '@/components/chat/RememberSelectionMenu'

// Simulate a text selection inside `node`.
function mockSelection(text: string, node: Node) {
  const range = {
    commonAncestorContainer: node,
    getBoundingClientRect: () => ({
      left: 100,
      top: 50,
      width: 40,
      height: 16,
    }),
  }
  vi.spyOn(window, 'getSelection').mockReturnValue({
    isCollapsed: text.length === 0,
    rangeCount: text.length ? 1 : 0,
    toString: () => text,
    getRangeAt: () => range,
    removeAllRanges: () => {},
  } as unknown as Selection)
}

beforeEach(() => {
  applyMemoryOperation.mockClear()
  // Run rAF synchronously so the mouseup handler reads the selection at once.
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    cb(0)
    return 0
  })
})

describe('formatSelectionNote', () => {
  it('turns a selection into a single tidy bullet', () => {
    expect(formatSelectionNote('  hello   world \n foo ')).toBe(
      '- hello world foo',
    )
  })
})

describe('RememberSelectionMenu', () => {
  it('renders its children', () => {
    render(
      <RememberSelectionMenu agentId="a1">
        <p>Some assistant answer</p>
      </RememberSelectionMenu>,
    )
    expect(screen.getByText('Some assistant answer')).toBeInTheDocument()
  })

  it('opens the action menu after a text selection', async () => {
    const { container } = render(
      <RememberSelectionMenu agentId="a1">
        <p>Some assistant answer</p>
      </RememberSelectionMenu>,
    )
    const wrapper = container.firstChild as HTMLElement
    mockSelection('assistant answer', screen.getByText('Some assistant answer'))
    fireEvent.mouseUp(wrapper)

    await waitFor(() =>
      expect(screen.getByText('Remember for this agent')).toBeInTheDocument(),
    )
    expect(screen.getByText('Remember for all agents')).toBeInTheDocument()
  })

  it('saves to this agent memory when the agent action is chosen', async () => {
    const { container } = render(
      <RememberSelectionMenu agentId="a1">
        <p>Some assistant answer</p>
      </RememberSelectionMenu>,
    )
    const wrapper = container.firstChild as HTMLElement
    mockSelection('cherries are nice', screen.getByText('Some assistant answer'))
    fireEvent.mouseUp(wrapper)

    const item = await screen.findByText('Remember for this agent')
    fireEvent.click(item)

    await waitFor(() =>
      expect(applyMemoryOperation).toHaveBeenCalledWith('a1', 'append', {
        content: '- cherries are nice',
      }),
    )
  })

  it('saves to global memory when the global action is chosen', async () => {
    const { container } = render(
      <RememberSelectionMenu agentId="a1">
        <p>Some assistant answer</p>
      </RememberSelectionMenu>,
    )
    const wrapper = container.firstChild as HTMLElement
    mockSelection('speaks French', screen.getByText('Some assistant answer'))
    fireEvent.mouseUp(wrapper)

    const item = await screen.findByText('Remember for all agents')
    fireEvent.click(item)

    await waitFor(() =>
      expect(applyMemoryOperation).toHaveBeenCalledWith('__global__', 'append', {
        content: '- speaks French',
      }),
    )
  })

  it('only offers global scope when no agent is provided', async () => {
    const { container } = render(
      <RememberSelectionMenu>
        <p>A user query</p>
      </RememberSelectionMenu>,
    )
    const wrapper = container.firstChild as HTMLElement
    mockSelection('user query', screen.getByText('A user query'))
    fireEvent.mouseUp(wrapper)

    await waitFor(() =>
      expect(screen.getByText('Remember for all agents')).toBeInTheDocument(),
    )
    expect(screen.queryByText('Remember for this agent')).not.toBeInTheDocument()
  })
})
