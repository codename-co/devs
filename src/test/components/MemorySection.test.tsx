import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// ── Mocks ──

let memoryDoc: { synthesis: string } | undefined
const writeAgentMemory = vi.fn().mockResolvedValue(undefined)

vi.mock('@/stores/agentMemoryStore', () => ({
  useAgentMemories: () => [],
  useAgentMemoryDocument: () => memoryDoc,
}))
vi.mock('@/lib/memory-learning-service', () => ({
  writeAgentMemory: (...args: unknown[]) => (writeAgentMemory as any)(...args),
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
  MarkdownRenderer: ({ content }: { content: string }) => <div>{content}</div>,
}))

import { MemorySection } from '@/pages/Workspace/components/agent-preview/context-sections/MemorySection'

beforeEach(() => {
  writeAgentMemory.mockClear()
  memoryDoc = { synthesis: '- likes cherries' }
})

describe('MemorySection editing', () => {
  it('shows the memory document', () => {
    render(<MemorySection agentId="a1" />)
    expect(screen.getByText('- likes cherries')).toBeInTheDocument()
  })

  it('edits and saves the memory document', async () => {
    render(<MemorySection agentId="a1" />)

    fireEvent.click(screen.getByRole('button', { name: 'Edit memory' }))

    const textarea = await screen.findByPlaceholderText(
      'Write what this agent should remember, as short notes…',
    )
    expect((textarea as HTMLTextAreaElement).value).toBe('- likes cherries')

    fireEvent.change(textarea, {
      target: { value: '- likes cherries\n- speaks French' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(writeAgentMemory).toHaveBeenCalledWith(
        'a1',
        '- likes cherries\n- speaks French',
      ),
    )
  })

  it('offers to add a note when there is no memory yet', async () => {
    memoryDoc = undefined
    render(<MemorySection agentId="a1" />)

    fireEvent.click(screen.getByRole('button', { name: 'Add a note' }))
    const textarea = await screen.findByPlaceholderText(
      'Write what this agent should remember, as short notes…',
    )
    fireEvent.change(textarea, { target: { value: '- new fact' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(writeAgentMemory).toHaveBeenCalledWith('a1', '- new fact'),
    )
  })
})
