import { Accordion as HeroAccordion } from '@heroui/react'
import { withCompound, type V2Compat } from './v2-compat-types'

export const AccordionItem: V2Compat = (props) => {
  const { children, id, title, subtitle: _s, startContent: _sc, indicator: _i,
    classNames: _cn, className, isDisabled: _d, keepContentMounted: _k, hideIndicator: _h,
    ...rest } = props
  return (
    <HeroAccordion.Item className={className} id={id} {...rest}>
      <HeroAccordion.Heading>
        <HeroAccordion.Trigger>{title}</HeroAccordion.Trigger>
      </HeroAccordion.Heading>
      <HeroAccordion.Panel>
        <HeroAccordion.Body>{children}</HeroAccordion.Body>
      </HeroAccordion.Panel>
    </HeroAccordion.Item>
  )
}

export const Accordion = withCompound(
  (props) => {
    const { children, variant: _, selectionMode: _s, isCompact: _c, defaultExpandedKeys: _d,
      selectedKeys: _sk, onSelectionChange: _osc, classNames: _cn, disallowEmptySelection: _dae,
      showDivider: _sd, className, ...rest } = props
    return <HeroAccordion className={className} {...rest}>{children}</HeroAccordion>
  },
  {
    Root: HeroAccordion.Root,
    Item: AccordionItem,
    Heading: HeroAccordion.Heading,
    Trigger: HeroAccordion.Trigger,
    Panel: HeroAccordion.Panel,
    Indicator: HeroAccordion.Indicator,
    Body: HeroAccordion.Body,
  }
)
