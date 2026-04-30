import { Disclosure } from '@heroui/react_3'
import { Icon, MarkdownRenderer } from '@/components'

interface SystemPromptDisclosureProps {
  content: string
}

/** Collapsed-by-default disclosure for system prompt messages */
export function SystemPromptDisclosure({
  content,
}: SystemPromptDisclosureProps) {
  return (
    <Disclosure defaultExpanded={false}>
      <Disclosure.Heading>
        <Disclosure.Trigger className="bg-default-100/50 hover:bg-default-100 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition-colors">
          <Icon name="Settings" size="sm" className="text-muted shrink-0" />
          <span className="text-muted text-xs font-medium">System prompt</span>
          <Disclosure.Indicator className="text-muted ml-auto h-3.5 w-3.5 shrink-0 transition-transform" />
        </Disclosure.Trigger>
      </Disclosure.Heading>
      <Disclosure.Content>
        <Disclosure.Body className="px-3 pt-2 pb-3">
          <div className="text-muted text-xs leading-relaxed">
            <MarkdownRenderer content={content} />
          </div>
        </Disclosure.Body>
      </Disclosure.Content>
    </Disclosure>
  )
}
