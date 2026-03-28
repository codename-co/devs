/**
 * HeroUI v2 → v3 Compatibility Layer
 *
 * This module re-exports v3 components with v2-compatible APIs.
 * It allows existing v2 code to work without changes while using v3 under the hood.
 * Components should be incrementally migrated to native v3 APIs, at which point
 * they can import directly from '@heroui/react'.
 */

// Re-export everything from v3 first (passthrough)
export * from '@heroui/react'

// Then override with compat wrappers
export { Tooltip } from './tooltip-compat'
export type { TooltipCompatProps as TooltipProps } from './tooltip-compat'
export { Input } from './input-compat'
export { TextArea } from './textarea-compat'
export { Select, SelectItem } from './select-compat'
export { Card } from './card-compat'
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
export { Dropdown } from './dropdown-compat'
