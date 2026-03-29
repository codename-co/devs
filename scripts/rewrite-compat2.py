#!/usr/bin/env python3
"""Rewrite remaining compat files to use any types."""
import os

ROOT = '/Users/arnaud/repos/codename/devs/src/components/heroui-compat'

files = {
    'badge-compat.tsx': r'''/**
 * Badge v2 compat with any-typed props.
 */
import { Badge as HeroBadge } from '@heroui/react'

type AnyProps = Record<string, any>

function BadgeCompat(props: AnyProps) {
  const { children, content: _ct, color: _c, variant: _v, size: _s,
    shape: _sh, placement: _p, showOutline: _so, isInvisible: _ii,
    isOneChar: _io, isDot: _id, disableAnimation: _da,
    classNames: _cn, className, ...rest } = props
  return <HeroBadge className={className} {...rest}>{children}</HeroBadge>
}

BadgeCompat.Root = HeroBadge.Root

export const Badge = BadgeCompat as any
''',

    'checkbox-compat.tsx': r'''/**
 * Checkbox v2 compat with any-typed props.
 */
import { Checkbox as HeroCheckbox } from '@heroui/react'

type AnyProps = Record<string, any>

function CheckboxCompat(props: AnyProps) {
  const { children, isSelected, defaultSelected: _ds, onChange, onValueChange: _ov,
    color: _c, size: _s, radius: _r, icon: _i, lineThrough: _lt,
    isDisabled, isReadOnly: _ro, isIndeterminate: _ii,
    classNames: _cn, className, value, ...rest } = props
  return (
    <HeroCheckbox className={className} isSelected={isSelected}
      onChange={onChange} isDisabled={isDisabled} value={value} {...rest}>
      {children}
    </HeroCheckbox>
  )
}

CheckboxCompat.Root = HeroCheckbox.Root
CheckboxCompat.Control = HeroCheckbox.Control
CheckboxCompat.Indicator = HeroCheckbox.Indicator

export const Checkbox = CheckboxCompat as any
''',

    'drawer-compat.tsx': r'''/**
 * Drawer v2 compat with any-typed props.
 */
import { Drawer as HeroDrawer } from '@heroui/react'

type AnyProps = Record<string, any>

function DrawerCompat(props: AnyProps) {
  const { children, isOpen: _io, onOpenChange: _ooc, placement: _p,
    size: _s, classNames: _cn, className, ...rest } = props
  return <HeroDrawer className={className} {...rest}>{children}</HeroDrawer>
}

export function DrawerContent(props: AnyProps) {
  const { children, className, ...rest } = props
  return <HeroDrawer.Content className={className} {...rest}>{children}</HeroDrawer.Content>
}

export function DrawerHeader(props: AnyProps) {
  const { children, className, ...rest } = props
  return <HeroDrawer.Header className={className} {...rest}>{children}</HeroDrawer.Header>
}

export function DrawerBody(props: AnyProps) {
  const { children, className, ...rest } = props
  return <HeroDrawer.Body className={className} {...rest}>{children}</HeroDrawer.Body>
}

export function DrawerFooter(props: AnyProps) {
  const { children, className, ...rest } = props
  return <HeroDrawer.Footer className={className} {...rest}>{children}</HeroDrawer.Footer>
}

DrawerCompat.Root = HeroDrawer.Root
DrawerCompat.Content = DrawerContent as any
DrawerCompat.Header = DrawerHeader as any
DrawerCompat.Body = DrawerBody as any
DrawerCompat.Footer = DrawerFooter as any

export const Drawer = DrawerCompat as any
''',

    'input-compat.tsx': r'''/**
 * Input v2 compat with any-typed props.
 */
import { Input as HeroInput } from '@heroui/react'

type AnyProps = Record<string, any>

function InputCompat(props: AnyProps) {
  const { label: _l, description: _d, errorMessage: _em,
    startContent: _sc, endContent: _ec, labelPlacement: _lp,
    isClearable: _ic, onClear: _oc, classNames: _cn,
    variant: _v, color: _c, size: _s, radius: _r,
    isRequired: _ir, isReadOnly: _ronly, isDisabled,
    className, type, value, defaultValue, onChange,
    onValueChange: _ov, placeholder, ...rest } = props
  return (
    <HeroInput className={className} type={type} value={value}
      defaultValue={defaultValue} onChange={onChange}
      isDisabled={isDisabled} placeholder={placeholder}
      aria-label={rest['aria-label']} {...rest} />
  )
}

InputCompat.Root = HeroInput.Root

export const Input = InputCompat as any
''',

    'textarea-compat.tsx': r'''/**
 * TextArea v2 compat with any-typed props.
 */
import { TextArea as HeroTextArea } from '@heroui/react'

type AnyProps = Record<string, any>

function TextAreaCompat(props: AnyProps) {
  const { label: _l, description: _d, errorMessage: _em,
    labelPlacement: _lp, classNames: _cn,
    variant: _v, color: _c, size: _s, radius: _r,
    minRows: _mr, maxRows: _maxr, cacheMeasurements: _cm,
    isRequired: _ir, isReadOnly: _ronly, isDisabled,
    disableAutosize: _daa, disableAnimation: _da,
    className, value, defaultValue, onChange,
    onValueChange: _ov, placeholder, ...rest } = props
  return (
    <HeroTextArea className={className} value={value}
      defaultValue={defaultValue} onChange={onChange}
      isDisabled={isDisabled} placeholder={placeholder}
      aria-label={rest['aria-label']} {...rest} />
  )
}

TextAreaCompat.Root = HeroTextArea.Root

export const TextArea = TextAreaCompat as any
''',

    'link-compat.tsx': r'''/**
 * Link v2 compat with any-typed props.
 */
import { Link as HeroLink } from '@heroui/react'

type AnyProps = Record<string, any>

function LinkCompat(props: AnyProps) {
  const { children, color: _c, size: _s, underline: _u,
    isBlock: _ib, isDisabled: _id, isExternal: _ie,
    showAnchorIcon: _sa, anchorIcon: _ai,
    classNames: _cn, className, href, ...rest } = props
  return (
    <HeroLink className={className} href={href} {...rest}>
      {children}
    </HeroLink>
  )
}

LinkCompat.Root = HeroLink.Root

export const Link = LinkCompat as any
''',

    'modal-compat.tsx': r'''/**
 * Modal v2 compat with any-typed props.
 */
import { Modal as HeroModal } from '@heroui/react'
import type { ReactNode } from 'react'

type AnyProps = Record<string, any>

export interface ModalCompatProps {
  children?: ReactNode
  isOpen?: boolean
  onOpenChange?: (isOpen: boolean) => void
  [key: string]: any
}

function ModalCompat(props: AnyProps) {
  const { children, isOpen: _io, onOpenChange: _ooc, size: _s,
    placement: _p, backdrop: _b, scrollBehavior: _sb,
    isDismissable: _id, isKeyboardDismissDisabled: _ikd,
    hideCloseButton: _hcb, closeButton: _cb,
    classNames: _cn, className, ...rest } = props
  return <HeroModal className={className} {...rest}>{children}</HeroModal>
}

export function ModalContent(props: AnyProps) {
  const { children, className, ...rest } = props
  return <HeroModal.Content className={className} {...rest}>{typeof children === 'function' ? children(() => {}) : children}</HeroModal.Content>
}

export function ModalHeader(props: AnyProps) {
  const { children, className, ...rest } = props
  return <HeroModal.Header className={className} {...rest}>{children}</HeroModal.Header>
}

export function ModalBody(props: AnyProps) {
  const { children, className, ...rest } = props
  return <HeroModal.Body className={className} {...rest}>{children}</HeroModal.Body>
}

export function ModalFooter(props: AnyProps) {
  const { children, className, ...rest } = props
  return <HeroModal.Footer className={className} {...rest}>{children}</HeroModal.Footer>
}

ModalCompat.Root = HeroModal.Root
ModalCompat.Backdrop = HeroModal.Backdrop
ModalCompat.Container = HeroModal.Container
ModalCompat.Dialog = HeroModal.Dialog
ModalCompat.Header = ModalHeader as any
ModalCompat.Heading = HeroModal.Heading
ModalCompat.Body = ModalBody as any
ModalCompat.Footer = ModalFooter as any
ModalCompat.Content = ModalContent as any

export const Modal = ModalCompat as any
''',

    'select-compat.tsx': r'''/**
 * Select v2 compat with any-typed props.
 */
import { Select as HeroSelect } from '@heroui/react'

type AnyProps = Record<string, any>

function SelectCompat(props: AnyProps) {
  const { children, label: _l, description: _d, errorMessage: _em,
    placeholder: _p, items: _i, selectionMode: _sm,
    selectedKeys: _sk, defaultSelectedKeys: _dsk,
    onSelectionChange: _osc, disallowEmptySelection: _dae,
    isRequired: _ir, isDisabled, isLoading: _il,
    selectorIcon: _si, scrollRef: _sr,
    classNames: _cn, variant: _v, color: _c, size: _s,
    labelPlacement: _lp, radius: _r,
    className, ...rest } = props
  return <HeroSelect className={className} isDisabled={isDisabled} {...rest}>{children}</HeroSelect>
}

export function SelectItem(props: AnyProps) {
  const { children, title: _t, description: _d, startContent: _s,
    endContent: _e, classNames: _cn, ...rest } = props
  return <HeroSelect.Item {...rest}>{children}</HeroSelect.Item>
}

SelectCompat.Root = HeroSelect.Root
SelectCompat.Trigger = HeroSelect.Trigger
SelectCompat.Value = HeroSelect.Value
SelectCompat.Popover = HeroSelect.Popover
SelectCompat.ListBox = HeroSelect.ListBox
SelectCompat.Item = SelectItem as any
SelectCompat.Section = HeroSelect.Section

export const Select = SelectCompat as any
''',

    'radio-compat.tsx': r'''/**
 * Radio/RadioGroup v2 compat with any-typed props.
 */
import { Radio as HeroRadio, RadioGroup as HeroRadioGroup } from '@heroui/react'

type AnyProps = Record<string, any>

function RadioCompat(props: AnyProps) {
  const { children, value, description: _d, color: _c, size: _s,
    classNames: _cn, className, ...rest } = props
  return <HeroRadio className={className} value={value} {...rest}>{children}</HeroRadio>
}

RadioCompat.Root = HeroRadio.Root
RadioCompat.Control = HeroRadio.Control
RadioCompat.Label = HeroRadio.Label
RadioCompat.Description = HeroRadio.Description

export const Radio = RadioCompat as any

function RadioGroupCompat(props: AnyProps) {
  const { children, label: _l, description: _d, errorMessage: _em,
    orientation: _o, color: _c, size: _s,
    value, defaultValue, onValueChange: _ov, onChange,
    isRequired: _ir, isDisabled, isReadOnly: _ro,
    classNames: _cn, className, ...rest } = props
  return (
    <HeroRadioGroup className={className} value={value}
      defaultValue={defaultValue} onChange={onChange}
      isDisabled={isDisabled} {...rest}>
      {children}
    </HeroRadioGroup>
  )
}

RadioGroupCompat.Root = HeroRadioGroup.Root

export const RadioGroup = RadioGroupCompat as any
''',

    'spinner-compat.tsx': r'''/**
 * Spinner v2 compat with any-typed props.
 */
import { Spinner as HeroSpinner } from '@heroui/react'

type AnyProps = Record<string, any>

function SpinnerCompat(props: AnyProps) {
  const { label: _l, color: _c, size: _s, labelColor: _lc,
    classNames: _cn, className, ...rest } = props
  return <HeroSpinner className={className} {...rest} />
}

export const Spinner = SpinnerCompat as any
''',

    'progressbar-compat.tsx': r'''/**
 * ProgressBar v2 compat with any-typed props.
 */
import { ProgressBar as HeroProgressBar } from '@heroui/react'

type AnyProps = Record<string, any>

function ProgressBarCompat(props: AnyProps) {
  const { label: _l, value, maxValue, minValue,
    color: _c, size: _s, radius: _r,
    showValueLabel: _sv, formatOptions: _fo,
    isIndeterminate: _ii, isStriped: _is,
    classNames: _cn, className, ...rest } = props
  return (
    <HeroProgressBar className={className} value={value}
      maxValue={maxValue} minValue={minValue} {...rest} />
  )
}

ProgressBarCompat.Root = HeroProgressBar.Root
ProgressBarCompat.Track = HeroProgressBar.Track
ProgressBarCompat.Fill = HeroProgressBar.Fill

export const ProgressBar = ProgressBarCompat as any
''',

    'slider-compat.tsx': r'''/**
 * Slider v2 compat with any-typed props.
 */
import { Slider as HeroSlider } from '@heroui/react'

type AnyProps = Record<string, any>

function SliderCompat(props: AnyProps) {
  const { label: _l, value, defaultValue, minValue, maxValue, step,
    onChange, onChangeEnd, color: _c, size: _s, radius: _r,
    showSteps: _ss, showTooltip: _st, marks: _m,
    startContent: _sc, endContent: _ec,
    classNames: _cn, className, isDisabled, ...rest } = props
  return (
    <HeroSlider className={className} value={value} defaultValue={defaultValue}
      minValue={minValue} maxValue={maxValue} step={step}
      onChange={onChange} onChangeEnd={onChangeEnd}
      isDisabled={isDisabled} aria-label={rest['aria-label']}>
      <HeroSlider.Track>
        <HeroSlider.Fill />
        <HeroSlider.Thumb />
      </HeroSlider.Track>
    </HeroSlider>
  )
}

SliderCompat.Root = HeroSlider.Root
SliderCompat.Track = HeroSlider.Track
SliderCompat.Fill = HeroSlider.Fill
SliderCompat.Thumb = HeroSlider.Thumb
SliderCompat.Output = HeroSlider.Output
SliderCompat.Marks = HeroSlider.Marks

export const Slider = SliderCompat as any
''',

    'pagination-compat.tsx': r'''/**
 * Pagination v2 compat with any-typed props.
 */
import React from 'react'
import { Pagination as HeroPagination } from '@heroui/react'

type AnyProps = Record<string, any>

function PaginationCompat(props: AnyProps) {
  const { total: _t, page: _p, initialPage: _ip, onChange: _oc,
    color: _c, variant: _v, size: _s, radius: _r,
    showControls: _sc, isCompact: _ic, isDisabled: _id,
    loop: _l, siblings: _si, boundaries: _b,
    classNames: _cn, className, ...rest } = props
  return (
    <HeroPagination className={className} {...rest}>
      <HeroPagination.Previous>{"<"}</HeroPagination.Previous>
      <HeroPagination.Content>{" "}</HeroPagination.Content>
      <HeroPagination.Next>{">"}</HeroPagination.Next>
    </HeroPagination>
  )
}

PaginationCompat.Root = HeroPagination.Root
PaginationCompat.Previous = HeroPagination.Previous
PaginationCompat.Content = HeroPagination.Content
PaginationCompat.Next = HeroPagination.Next
PaginationCompat.Item = HeroPagination.Item
PaginationCompat.Link = HeroPagination.Link
PaginationCompat.Ellipsis = HeroPagination.Ellipsis

export const Pagination = PaginationCompat as any
''',

    'tooltip-compat.tsx': r'''/**
 * Tooltip v2 compat: accepts `content`, `placement`, `delay` props.
 */
import { Tooltip as HeroTooltip } from '@heroui/react'
import type { ReactNode } from 'react'

export interface TooltipCompatProps {
  content?: ReactNode
  placement?: string
  delay?: number
  closeDelay?: number
  offset?: number
  showArrow?: boolean
  color?: string
  className?: string
  children: ReactNode
  isDisabled?: boolean
  [key: string]: any
}

export function Tooltip(props: TooltipCompatProps) {
  const { content, placement: _p, delay, closeDelay,
    offset, showArrow, color: _c, className, children,
    isDisabled, ...rest } = props

  if (isDisabled || !content) {
    return <>{children}</>
  }

  return (
    <HeroTooltip delay={delay} closeDelay={closeDelay} {...rest}>
      <HeroTooltip.Trigger>{children}</HeroTooltip.Trigger>
      <HeroTooltip.Content className={className} offset={offset} showArrow={showArrow}>
        {content}
      </HeroTooltip.Content>
    </HeroTooltip>
  )
}
''',
}

for filename, content in files.items():
    filepath = os.path.join(ROOT, filename)
    with open(filepath, 'w') as f:
        f.write(content.lstrip('\n'))
    print(f'  Wrote {filename} ({len(content)} bytes)')

print('Done!')
