/**
 * HeroUI v2 → v3 Compatibility Layer
 *
 * This module re-exports v3 components with v2-compatible APIs.
 * Components that need v2 prop compatibility get compat wrappers.
 * v3-only components pass through directly from @heroui/react.
 */

// Re-export everything from v3 first (passthrough)
export * from '@heroui/react'

// Then override with compat wrappers that accept v2 props
export { Tooltip } from './tooltip-compat'
export type { TooltipCompatProps as TooltipProps } from './tooltip-compat'
export { Input } from './input-compat'
export { TextArea } from './textarea-compat'
export { Select, SelectItem } from './select-compat'
export { Card, CardBody, CardHeader, CardFooter } from './card-compat'
export { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from './modal-compat'
export type { ModalCompatProps } from './modal-compat'
export { Button } from './button-compat'
export { Chip } from './chip-compat'
export { Badge } from './badge-compat'
export { Accordion, AccordionItem } from './accordion-compat'
export { Tab } from './tab-compat'
export { Link } from './link-compat'
export { Drawer, DrawerBody, DrawerContent, DrawerHeader, DrawerFooter } from './drawer-compat'
export { Checkbox } from './checkbox-compat'
export { Switch } from './switch-compat'
export { Pagination } from './pagination-compat'
export { Slider } from './slider-compat'
export { Spinner } from './spinner-compat'
export { ProgressBar } from './progressbar-compat'
export { Radio, RadioGroup } from './radio-compat'
export { Dropdown, DropdownItem, DropdownSection, DropdownMenu } from './dropdown-compat'
export { Popover, PopoverTrigger, PopoverContent } from './popover-compat'
export { Avatar } from './avatar-compat'
export { Tabs } from './tabs-compat'
export { Alert, Kbd, ButtonGroup, ScrollShadow, ListBox, ListBoxItem, ListBoxSection } from './misc-compat'
export { toast } from './toast-compat'

// HeroUIToastOptions type (not re-exported from v3 main index)
export interface HeroUIToastOptions {
  description?: import('react').ReactNode
  indicator?: import('react').ReactNode
  variant?: 'default' | 'accent' | 'success' | 'warning' | 'danger'
  actionProps?: Record<string, unknown>
  isLoading?: boolean
  timeout?: number
  onClose?: () => void
  [key: string]: unknown
}
