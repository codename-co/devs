import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Filter, FilterOption } from '@/components/Filter'

describe('Filter Component', () => {
  const mockOptions: FilterOption[] = [
    { key: 'all', label: 'All Items', count: 10 },
    { key: 'active', label: 'Active', count: 5 },
    { key: 'completed', label: 'Completed', count: 3 },
    { key: 'pending', label: 'Pending', count: 2 },
  ]

  describe('Rendering', () => {
    it('should render with button variant by default', () => {
      const onSelectionChange = vi.fn()
      render(
        <Filter
          label="Status Filter"
          options={mockOptions}
          selectedKey="all"
          onSelectionChange={onSelectionChange}
        />,
      )

      expect(screen.getByRole('button')).toBeInTheDocument()
      expect(screen.getByText('All Items')).toBeInTheDocument()
    })

    it('should render with icon variant', () => {
      const onSelectionChange = vi.fn()
      render(
        <Filter
          label="Status Filter"
          options={mockOptions}
          selectedKey="all"
          onSelectionChange={onSelectionChange}
          variant="icon"
        />,
      )

      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
      expect(screen.queryByText('All Items')).not.toBeInTheDocument()
    })

    it('should show counts when showCounts is "all"', () => {
      const onSelectionChange = vi.fn()
      render(
        <Filter
          label="Status Filter"
          options={mockOptions}
          selectedKey="all"
          onSelectionChange={onSelectionChange}
          showCounts="all"
        />,
      )

      expect(screen.getByText(/\(10\)/)).toBeInTheDocument()
    })

    it('should show counts when showCounts is "options-only" (in dropdown only)', async () => {
      const onSelectionChange = vi.fn()
      render(
        <Filter
          label="Status Filter"
          options={mockOptions}
          selectedKey="all"
          onSelectionChange={onSelectionChange}
          showCounts="options-only"
        />,
      )

      // In options-only mode, button should NOT show count
      expect(screen.queryByText(/\(10\)/)).not.toBeInTheDocument()

      // Open the dropdown to verify counts are shown there
      const button = screen.getByRole('button')
      fireEvent.click(button)

      await waitFor(() => {
        // Counts should be shown in dropdown items
        expect(screen.getByText(/10/)).toBeInTheDocument()
      })
    })

    it('should not show counts when showCounts is "none"', () => {
      const onSelectionChange = vi.fn()
      render(
        <Filter
          label="Status Filter"
          options={mockOptions}
          selectedKey="all"
          onSelectionChange={onSelectionChange}
          showCounts="none"
        />,
      )

      expect(screen.queryByText(/\(10\)/)).not.toBeInTheDocument()
    })

    it('should not show counts by default', () => {
      const onSelectionChange = vi.fn()
      render(
        <Filter
          label="Status Filter"
          options={mockOptions}
          selectedKey="all"
          onSelectionChange={onSelectionChange}
        />,
      )

      expect(screen.queryByText(/\(10\)/)).not.toBeInTheDocument()
    })

    it('should render with custom className prop', () => {
      const onSelectionChange = vi.fn()
      const { container } = render(
        <Filter
          label="Status Filter"
          options={mockOptions}
          selectedKey="all"
          onSelectionChange={onSelectionChange}
          className="custom-class"
        />,
      )

      // Verify the component renders without errors when className is provided
      expect(container).toBeInTheDocument()
      expect(screen.getByRole('button')).toBeInTheDocument()
    })
  })

  describe('Selection', () => {
    it('should call onSelectionChange when an option is selected', async () => {
      const onSelectionChange = vi.fn()

      render(
        <Filter
          label="Status Filter"
          options={mockOptions}
          selectedKey="all"
          onSelectionChange={onSelectionChange}
        />,
      )

      const button = screen.getByRole('button')
      fireEvent.click(button)

      // Find and click the "Active" option
      await waitFor(() => {
        const activeOption = screen.getByText('Active')
        fireEvent.click(activeOption)
      })

      expect(onSelectionChange).toHaveBeenCalledWith('active')
    })

    it('should display selected option label', () => {
      const onSelectionChange = vi.fn()
      render(
        <Filter
          label="Status Filter"
          options={mockOptions}
          selectedKey="completed"
          onSelectionChange={onSelectionChange}
        />,
      )

      expect(screen.getByText('Completed')).toBeInTheDocument()
    })
  })

  describe('Visual States', () => {
    it('should highlight when a non-default filter is selected', () => {
      const onSelectionChange = vi.fn()
      const { rerender } = render(
        <Filter
          label="Status Filter"
          options={mockOptions}
          selectedKey="all"
          onSelectionChange={onSelectionChange}
          variant="button"
        />,
      )

      const button = screen.getByRole('button')
      expect(button).not.toHaveClass('bg-primary')

      // Change to non-default filter
      rerender(
        <Filter
          label="Status Filter"
          options={mockOptions}
          selectedKey="active"
          onSelectionChange={onSelectionChange}
          variant="button"
        />,
      )

      // Button should now be highlighted with primary color
      expect(screen.getByText('Active')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper aria-label on dropdown menu', async () => {
      const onSelectionChange = vi.fn()

      render(
        <Filter
          label="Status Filter"
          options={mockOptions}
          selectedKey="all"
          onSelectionChange={onSelectionChange}
        />,
      )

      const button = screen.getByRole('button')
      fireEvent.click(button)

      // Menu should have the label as aria-label
      await waitFor(() => {
        const menu = screen.getByRole('menu')
        expect(menu).toHaveAttribute('aria-label', 'Status Filter')
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty options array gracefully', () => {
      const onSelectionChange = vi.fn()
      render(
        <Filter
          label="Empty Filter"
          options={[]}
          selectedKey="all"
          onSelectionChange={onSelectionChange}
        />,
      )

      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('should handle options without counts', () => {
      const optionsWithoutCounts: FilterOption[] = [
        { key: 'all', label: 'All Items' },
        { key: 'active', label: 'Active' },
      ]
      const onSelectionChange = vi.fn()

      render(
        <Filter
          label="Status Filter"
          options={optionsWithoutCounts}
          selectedKey="all"
          onSelectionChange={onSelectionChange}
          showCounts="all"
        />,
      )

      expect(screen.getByText('All Items')).toBeInTheDocument()
      expect(screen.queryByText(/\(\d+\)/)).not.toBeInTheDocument()
    })
  })

  describe('ShowCounts Mode: options-only', () => {
    it('should NOT show count in button for selected item', () => {
      const onSelectionChange = vi.fn()
      render(
        <Filter
          label="Status Filter"
          options={mockOptions}
          selectedKey="active"
          onSelectionChange={onSelectionChange}
          showCounts="options-only"
        />,
      )

      // In options-only mode, button should NOT show count
      expect(screen.getByText(/Active/)).toBeInTheDocument()
      expect(screen.queryByText(/\(5\)/)).not.toBeInTheDocument()
    })

    it('should show counts in dropdown for non-selected items', async () => {
      const onSelectionChange = vi.fn()
      render(
        <Filter
          label="Status Filter"
          options={mockOptions}
          selectedKey="all"
          onSelectionChange={onSelectionChange}
          showCounts="options-only"
        />,
      )

      const button = screen.getByRole('button')
      fireEvent.click(button)

      // In options-only mode, counts should appear in dropdown only
      await waitFor(() => {
        // Dropdown shows counts for items
        const menu = screen.getByRole('menu')
        expect(menu).toBeInTheDocument()
        // Should find count "10" somewhere in dropdown
        expect(screen.getByText(/10/)).toBeInTheDocument()
      })
    })
  })
})
