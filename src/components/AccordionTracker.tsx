import { Accordion, type AccordionProps } from '@heroui/react'

export const AccordionTracker: React.FC<{
  children: AccordionProps['children']
}> = ({ children }) => {
  return (
    <Accordion
      isCompact
      fullWidth={false}
      showDivider={false}
      variant="light"
      className="px-0 gap-0"
      selectionMode="multiple"
      itemClasses={{
        title: 'text-sm font-medium',
        trigger:
          'py-1.5 px-2 rounded-md hover:bg-default-100 data-[hover=true]:bg-default-100',
        content: 'mx-2 px-2 pb-2 pt-0 border-s border-default-200',
        indicator: 'text-sm text-default-600 -rotate-180',
      }}
      children={children}
    />
  )
}
