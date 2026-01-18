/**
 * Standalone PromptArea for Extensions
 *
 * A simplified, self-contained PromptArea component for marketplace extensions.
 * This version uses only HeroUI components and has no dependencies on internal
 * DEVS modules like Icon, stores, or i18n.
 *
 * Usage in extensions:
 *   import { PromptArea } from '@devs/components'
 *
 *   <PromptArea
 *     placeholder="Ask anything..."
 *     onSubmit={(prompt) => console.log(prompt)}
 *   />
 */

import { forwardRef, useState, useCallback, useRef, useEffect } from 'react'
import { Button, Textarea, type TextAreaProps } from '@heroui/react'

export interface PromptAreaProps
  extends Omit<TextAreaProps, 'onKeyDown' | 'onSubmit'> {
  /** Callback when the user submits the prompt */
  onSubmit?: (prompt: string) => void
  /** Whether a request is currently in progress */
  isLoading?: boolean
  /** Default prompt text */
  defaultPrompt?: string
  /** Placeholder text */
  placeholder?: string
  /** Minimum number of rows */
  minRows?: number
  /** Custom submit button content */
  submitLabel?: React.ReactNode
  /** Whether to show the submit button */
  showSubmitButton?: boolean
  /** Keyboard handler */
  onKeyDown?: React.KeyboardEventHandler<HTMLTextAreaElement>
}

/**
 * Simplified PromptArea component for marketplace extensions.
 * Provides a textarea with submit button, suitable for chat/prompt interfaces.
 */
export const PromptArea = forwardRef<HTMLTextAreaElement, PromptAreaProps>(
  function PromptArea(
    {
      className,
      onSubmit,
      onValueChange,
      defaultPrompt = '',
      placeholder = 'Type your message...',
      minRows = 3,
      isLoading = false,
      submitLabel = '→',
      showSubmitButton = true,
      onKeyDown,
      ...props
    },
    ref,
  ) {
    const [prompt, setPrompt] = useState(defaultPrompt)
    const internalRef = useRef<HTMLTextAreaElement>(null)
    const textareaRef =
      (ref as React.RefObject<HTMLTextAreaElement>) || internalRef

    // Sync with controlled value
    useEffect(() => {
      if (props.value !== undefined && props.value !== prompt) {
        setPrompt(props.value as string)
      }
    }, [props.value])

    // Sync with default prompt changes
    useEffect(() => {
      if (defaultPrompt && !prompt) {
        setPrompt(defaultPrompt)
        onValueChange?.(defaultPrompt)
      }
    }, [defaultPrompt])

    const handlePromptChange = useCallback(
      (value: string) => {
        setPrompt(value)
        onValueChange?.(value)
      },
      [onValueChange],
    )

    const handleSubmit = useCallback(() => {
      if (!prompt.trim() || isLoading) return
      onSubmit?.(prompt.trim())
    }, [prompt, isLoading, onSubmit])

    const handleKeyDown = useCallback(
      (event: React.KeyboardEvent<HTMLElement>) => {
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault()
          handleSubmit()
        }
        onKeyDown?.(event as React.KeyboardEvent<HTMLTextAreaElement>)
      },
      [handleSubmit, onKeyDown],
    )

    const canSubmit = prompt.trim().length > 0 && !isLoading

    return (
      <div className={`relative ${className || ''}`}>
        <Textarea
          ref={textareaRef}
          value={prompt}
          placeholder={placeholder}
          minRows={minRows}
          onValueChange={handlePromptChange}
          onKeyDown={handleKeyDown}
          isDisabled={isLoading}
          classNames={{
            inputWrapper: 'pb-12',
          }}
          {...props}
        />

        {showSubmitButton && (
          <div className="absolute z-10 bottom-0 inset-x-px p-2 rounded-b-lg">
            <div className="flex justify-end">
              <Button
                type="submit"
                color={canSubmit ? 'primary' : 'default'}
                variant="solid"
                size="sm"
                radius="md"
                isDisabled={!canSubmit}
                isLoading={isLoading}
                onPress={handleSubmit}
              >
                {submitLabel}
              </Button>
            </div>
          </div>
        )}
      </div>
    )
  },
)

export default PromptArea
