/**
 * Accordion v2 compat: accepts v2 props. Preserves v3 compound sub-components.
 * AccordionItem accepts `title`, `subtitle`, `startContent`.
 */
import { Accordion as HeroAccordion } from '@heroui/react'
import type { ReactNode, Key } from 'react'

interface AccordionCompatProps {
  children?: ReactNode
  variant?: string
  selectionMode?: string
  isCompact?: boolean
  defaultExpandedKeys?: Iterable<Key>
  selectedKeys?: Iterable<Key>
  onSelectionChange?: (keys: Set<Key>) => void
  className?: string
  classNames?: Record<string, string>
  disallowEmptySelection?: boolean
  showDivider?: boolean
  [key: string]: unknown
}

function AccordionCompat({
  children,
  variant: _variant,
  selectionMode: _selectionMode,
  isCompact: _isCompact,
  defaultExpandedKeys: _defaultExpandedKeys,
  selectedKeys: _selectedKeys,
  onSelectionChange: _onSelectionChange,
  className,
  classNames: _classNames,
  disallowEmptySelection: _disallowEmptySelection,
  showDivider: _showDivider,
  ...rest
}: AccordionCompatProps) {
  return (
    <HeroAccordion
      className={className}
      data-testid={rest['data-testid'] as string}
    >
      {children}
    </HeroAccordion>
  )
}

AccordionCompat.Root = HeroAccordion.Root
AccordionCompat.Item = HeroAccordion.Item
AccordionCompat.Heading = HeroAccordion.Heading
AccordionCompat.Trigger = HeroAccordion.Trigger
AccordionCompat.Panel = HeroAccordion.Panel
AccordionCompat.Indicator = HeroAccordion.Indicator
AccordionCompat.Body = HeroAccordion.Body

export const Accordion = AccordionCompat as typeof AccordionCompat & typeof HeroAccordion

interface AccordionItemCompatProps {
  children?: ReactNode
  id?: string | number
  title?: ReactNode
  subtitle?: ReactNode
  startContent?: ReactNode
  indicator?: ReactNode
  classNames?: Record<string, string>
  className?: string
  isDisabled?: boolean
  keepContentMounted?: boolean
  'aria-label'?: string
  [key: string]: unknown
}

export function AccordionItem({
  children,
  id,
  title,
  subtitle: _subtitle,
  startContent: _startContent,
  indicator: _indicator,
  classNames: _classNames,
  className,
  isDisabled: _isDisabled,
  keepContentMounted: _keepContentMounted,
  ...rest
}: AccordionItemCompatProps) {
  return (
    <HeroAccordion.Item className={className} id={id as string} {...rest}>
      <HeroAccordion.Heading>
        <HeroAccordion.Trigger>{title}</HeroAccordion.Trigger>
      </HeroAccordion.Heading>
      <HeroAccordion.Panel>
        <HeroAccordion.Body>{children}</HeroAccordion.Body>
      </HeroAccordion.Panel>
    </HeroAccordion.Item>
  )
}
