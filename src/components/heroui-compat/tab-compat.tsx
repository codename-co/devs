/**
 * Tab v2 compat: accepts `title` prop.
 * In v2, <Tab title="Foo">panel content</Tab>
 * In v3, <Tabs.Tab id="...">tab label</Tabs.Tab> + <Tabs.Panel>content</Tabs.Panel>
 *
 * This wrapper provides a simplified compat that renders Tab using title as children.
 */
import { Tab as HeroTab } from '@heroui/react'
import type { ReactNode } from 'react'

interface TabCompatProps {
  children?: ReactNode
  title?: ReactNode
  id?: string
  key?: string
  className?: string
  isDisabled?: boolean
  'aria-label'?: string
  [key: string]: unknown
}

export function Tab({
  children: _children,
  title,
  id,
  className,
  isDisabled,
  ...rest
}: TabCompatProps) {
  return (
    <HeroTab
      id={id}
      className={className}
      isDisabled={isDisabled}
      aria-label={rest['aria-label'] as string}
    >
      {title ?? id}
    </HeroTab>
  )
}
