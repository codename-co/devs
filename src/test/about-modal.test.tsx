import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { AboutModal } from '../components/AboutModal'

// Mock the Icon component
vi.mock('../components/Icon', () => ({
  Icon: ({ name }: { name: string }) => (
    <div data-testid={`icon-${name}`}>{name}</div>
  ),
}))

// Mock the PRODUCT config
vi.mock('../config/product', () => ({
  PRODUCT: {
    name: 'devs',
    displayName: 'devs',
  },
}))

describe('AboutModal', () => {
  it('renders the modal when open', () => {
    render(<AboutModal isOpen={true} />)

    // Check if main content is visible
    expect(screen.getByText('devs')).toBeInTheDocument()
    expect(
      screen.getByText('AI Agent Orchestration Platform'),
    ).toBeInTheDocument()
    expect(screen.getByText('Our Vision')).toBeInTheDocument()
    expect(
      screen.getByText(/Democratize AI agent delegation/),
    ).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(<AboutModal isOpen={false} />)

    // Content should not be visible when modal is closed
    expect(
      screen.queryByText('AI Agent Orchestration Platform'),
    ).not.toBeInTheDocument()
  })

  it('displays key features', () => {
    render(<AboutModal isOpen={true} />)

    // Check for key features
    expect(screen.getByText('Privacy First')).toBeInTheDocument()
    expect(screen.getByText('Browser Native')).toBeInTheDocument()
    expect(screen.getByText('AI Teams')).toBeInTheDocument()
    expect(screen.getByText('LLM Independent')).toBeInTheDocument()
    expect(screen.getByText('Open Source')).toBeInTheDocument()
    expect(screen.getByText('Offline Ready')).toBeInTheDocument()
  })

  it('displays use cases', () => {
    render(<AboutModal isOpen={true} />)

    // Check for use cases
    expect(
      screen.getByText(/Research assistance and study planning/),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Rapid prototyping and code generation/),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Content creation and brainstorming/),
    ).toBeInTheDocument()
  })

  it('displays tech stack', () => {
    render(<AboutModal isOpen={true} />)

    // Check for tech stack
    expect(screen.getByText('TypeScript')).toBeInTheDocument()
    expect(screen.getByText('React')).toBeInTheDocument()
    expect(screen.getByText('Vite')).toBeInTheDocument()
    expect(screen.getByText('HeroUI')).toBeInTheDocument()
  })

  it('has working action buttons', () => {
    render(<AboutModal isOpen={true} />)

    // Check for action buttons
    const githubButton = screen.getByText('View on GitHub')
    const getStartedButton = screen.getByText('Get Started')

    expect(githubButton).toBeInTheDocument()
    expect(getStartedButton).toBeInTheDocument()
  })

  it('shows how it works steps', () => {
    render(<AboutModal isOpen={true} />)

    // Check for the numbered steps
    expect(screen.getByText(/Configure your LLM provider/)).toBeInTheDocument()
    expect(screen.getByText(/Describe your task/)).toBeInTheDocument()
    expect(screen.getByText(/Watch AI agents collaborate/)).toBeInTheDocument()
    expect(screen.getByText(/Guide when needed/)).toBeInTheDocument()
  })
})
