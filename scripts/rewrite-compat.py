#!/usr/bin/env python3
"""Rewrite compat files to use 'any' types for v2 bridge convenience."""
import os

ROOT = '/Users/arnaud/repos/codename/devs/src/components/heroui-compat'

files = {
    'dropdown-compat.tsx': r'''/**
 * Dropdown v2 compat with any-typed props for v2 bridge.
 */
import { Dropdown as HeroDropdown } from '@heroui/react'

type AnyProps = Record<string, any>

function DropdownCompat(props: AnyProps) {
  const { children, isOpen: _, onOpenChange: _o, placement: _p,
    closeOnSelect: _c, classNames: _cn, ...rest } = props
  return <HeroDropdown {...rest}>{children}</HeroDropdown>
}

export function DropdownItem(props: AnyProps) {
  const { children, title: _, description: _d, startContent: _s, endContent: _e,
    color: _c, closeOnSelect: _cs, isReadOnly: _r, showDivider: _sd,
    classNames: _cn, ...rest } = props
  return <HeroDropdown.Item {...rest}>{children}</HeroDropdown.Item>
}

export function DropdownSection(props: AnyProps) {
  const { children, title: _, showDivider: _s, classNames: _cn, ...rest } = props
  return <HeroDropdown.Section {...rest}>{children}</HeroDropdown.Section>
}

export function DropdownMenu(props: AnyProps) {
  const { children, closeOnSelect: _c, selectionMode: _s, selectedKeys: _sk,
    onSelectionChange: _osc, disallowEmptySelection: _d, classNames: _cn,
    color: _co, variant: _v, ...rest } = props
  return <HeroDropdown.Menu {...rest}>{children}</HeroDropdown.Menu>
}

DropdownCompat.Root = HeroDropdown.Root
DropdownCompat.Trigger = HeroDropdown.Trigger
DropdownCompat.Popover = HeroDropdown.Popover
DropdownCompat.Menu = DropdownMenu as any
DropdownCompat.Section = DropdownSection as any
DropdownCompat.Item = DropdownItem as any
DropdownCompat.ItemIndicator = HeroDropdown.ItemIndicator
DropdownCompat.SubmenuIndicator = HeroDropdown.SubmenuIndicator
DropdownCompat.SubmenuTrigger = HeroDropdown.SubmenuTrigger

export const Dropdown = DropdownCompat as any
''',

    'tabs-compat.tsx': r'''/**
 * Tabs v2 compat with any-typed props.
 */
import { Tabs as HeroTabs, Tab as HeroTab } from '@heroui/react'

type AnyProps = Record<string, any>

function TabsCompat(props: AnyProps) {
  const { children, variant: _v, color: _c, size: _s, radius: _r,
    selectedKey: _sk, defaultSelectedKey: _dk, onSelectionChange: _osc,
    disableAnimation: _da, isDisabled: _d, fullWidth: _fw,
    classNames: _cn, className, ...rest } = props
  return (
    <HeroTabs className={className} aria-label={rest['aria-label']}>
      {children}
    </HeroTabs>
  )
}

TabsCompat.Root = HeroTabs.Root
TabsCompat.ListContainer = HeroTabs.ListContainer
TabsCompat.List = HeroTabs.List
TabsCompat.Tab = HeroTabs.Tab
TabsCompat.Indicator = HeroTabs.Indicator
TabsCompat.Separator = HeroTabs.Separator
TabsCompat.Panel = HeroTabs.Panel

export const Tabs = TabsCompat as any
''',

    'tab-compat.tsx': r'''/**
 * Tab v2 compat: accepts `title` prop.
 * In v2, <Tab title="Foo">panel content</Tab>
 * In v3, title becomes children of Tab.
 */
import { Tab as HeroTab } from '@heroui/react'

type AnyProps = Record<string, any>

export function Tab(props: AnyProps) {
  const { children: _children, title, id, className, isDisabled, ...rest } = props
  return (
    <HeroTab id={id} className={className} isDisabled={isDisabled}
      aria-label={rest['aria-label']}>
      {title ?? id}
    </HeroTab>
  )
}
''',

    'card-compat.tsx': r'''/**
 * Card v2 compat with any-typed props.
 */
import { Card as HeroCard } from '@heroui/react'
import type { ReactNode } from 'react'

type AnyProps = Record<string, any>

function CardCompat(props: AnyProps) {
  const { children, isPressable: _p, isHoverable: _h, shadow: _s,
    classNames: _cn, className, ...rest } = props

  const validVariant = rest.variant === 'surface' ? 'default' : rest.variant
  const { variant: _, ...validRest } = rest

  return (
    <HeroCard className={className} variant={validVariant} {...validRest}>
      {children}
    </HeroCard>
  )
}

export function CardBody(props: AnyProps) {
  const { children, className, ...rest } = props
  return <HeroCard.Content className={className} {...rest}>{children}</HeroCard.Content>
}

export function CardHeader(props: AnyProps) {
  const { children, className, ...rest } = props
  return <HeroCard.Header className={className} {...rest}>{children}</HeroCard.Header>
}

export function CardFooter(props: AnyProps) {
  const { children, className, ...rest } = props
  return <HeroCard.Footer className={className} {...rest}>{children}</HeroCard.Footer>
}

CardCompat.Root = HeroCard.Root
CardCompat.Header = CardHeader as any
CardCompat.Content = CardBody as any
CardCompat.Body = CardBody as any
CardCompat.Footer = CardFooter as any

export const Card = CardCompat as any
''',

    'misc-compat.tsx': r'''/**
 * Additional v2 compat wrappers for smaller components.
 * Uses any types for v2 bridge convenience.
 */
import {
  Alert as HeroAlert,
  Kbd as HeroKbd,
  ButtonGroup as HeroBtnGroup,
  ScrollShadow as HeroScrollShadow,
  ListBox as HeroListBox,
  ListBoxItem as HeroListBoxItem,
  ListBoxSection as HeroListBoxSection,
} from '@heroui/react'

type AnyProps = Record<string, any>

export function Alert(props: AnyProps) {
  const { children, title: _t, description: _d, color: _c, variant: _v,
    icon: _i, startContent: _s, endContent: _e, isVisible: _iv,
    hideIconWrapper: _h, classNames: _cn, className, onClose: _oc, ...rest } = props
  return <HeroAlert className={className} {...rest}>{children}</HeroAlert>
}

export function Kbd(props: AnyProps) {
  const { children, keys: _k, classNames: _cn, className, ...rest } = props
  return <HeroKbd className={className} {...rest}>{children}</HeroKbd>
}

export function ButtonGroup(props: AnyProps) {
  const { children, variant: _v, color: _c, size: _s, radius: _r,
    fullWidth: _fw, className, ...rest } = props
  return <HeroBtnGroup className={className} {...rest}>{children}</HeroBtnGroup>
}

export function ScrollShadow(props: AnyProps) {
  const { children, className, size: _s, offset: _o, orientation: _or,
    isEnabled: _ie, hideScrollBar: _h, visibility: _vi, ...rest } = props
  return <HeroScrollShadow className={className} {...rest}>{children}</HeroScrollShadow>
}

function ListBoxCompat(props: AnyProps) {
  const { children, items: _i, selectionMode: _s, selectedKeys: _sk,
    onSelectionChange: _osc, disallowEmptySelection: _d, className,
    classNames: _cn, emptyContent: _ec, ...rest } = props
  return <HeroListBox className={className} aria-label={rest['aria-label']}>{children}</HeroListBox>
}

export function ListBoxItem(props: AnyProps) {
  const { children, title: _t, description: _d, startContent: _s,
    endContent: _e, classNames: _cn, color: _c, isReadOnly: _r, ...rest } = props
  return <HeroListBoxItem {...rest}>{children}</HeroListBoxItem>
}

export function ListBoxSection(props: AnyProps) {
  const { children, title: _t, showDivider: _s, classNames: _cn, ...rest } = props
  return <HeroListBoxSection {...rest}>{children}</HeroListBoxSection>
}

ListBoxCompat.Root = HeroListBox.Root
ListBoxCompat.Item = ListBoxItem as any
ListBoxCompat.Section = ListBoxSection as any

export const ListBox = ListBoxCompat as any
''',

    'popover-compat.tsx': r'''/**
 * Popover v2 compat with any-typed props.
 */
import { Popover as HeroPopover } from '@heroui/react'
import type { ReactNode } from 'react'

type AnyProps = Record<string, any>

function PopoverCompat(props: AnyProps) {
  const { children, isOpen: _io, onOpenChange: _ooc, placement: _p,
    offset: _o, showArrow: _sa, triggerScaleOnOpen: _ts,
    classNames: _cn, className, ...rest } = props
  return <HeroPopover className={className} {...rest}>{children}</HeroPopover>
}

export function PopoverTrigger(props: AnyProps) {
  const { children, ...rest } = props
  return <HeroPopover.Trigger {...rest}>{children}</HeroPopover.Trigger>
}

export function PopoverContent(props: AnyProps) {
  const { children, className, ...rest } = props
  return <HeroPopover.Content className={className} {...rest}>{children ?? null}</HeroPopover.Content>
}

PopoverCompat.Root = HeroPopover.Root
PopoverCompat.Trigger = PopoverTrigger as any
PopoverCompat.Content = PopoverContent as any

export const Popover = PopoverCompat as any
''',

    'avatar-compat.tsx': r'''/**
 * Avatar v2 compat with any-typed props.
 */
import { Avatar as HeroAvatar } from '@heroui/react'

type AnyProps = Record<string, any>

function AvatarCompat(props: AnyProps) {
  const { src, alt, name: _n, icon: _i, color: _c, size: _s, radius: _r,
    isBordered: _ib, isDisabled: _id, showFallback: _sf, fallback: _f,
    classNames: _cn, className, ...rest } = props
  return <HeroAvatar className={className} src={src} alt={alt} {...rest} />
}

AvatarCompat.Root = HeroAvatar.Root
AvatarCompat.Image = HeroAvatar.Image
AvatarCompat.Fallback = HeroAvatar.Fallback

export const Avatar = AvatarCompat as any
''',

    'chip-compat.tsx': r'''/**
 * Chip v2 compat with any-typed props.
 */
import { Chip as HeroChip } from '@heroui/react'

type AnyProps = Record<string, any>

const variantMap: Record<string, string> = {
  faded: 'bordered',
  flat: 'default',
  light: 'default',
}

function ChipCompat(props: AnyProps) {
  const { children, variant, color: _c, size: _s, radius: _r,
    startContent: _sc, endContent: _ec, onClose: _oc,
    isCloseable: _ic, classNames: _cn, className, ...rest } = props

  const mappedVariant = variantMap[variant] || variant

  return (
    <HeroChip className={className} variant={mappedVariant} {...rest}>
      {children}
    </HeroChip>
  )
}

ChipCompat.Root = HeroChip.Root
ChipCompat.Content = HeroChip.Content
ChipCompat.CloseButton = HeroChip.CloseButton

export const Chip = ChipCompat as any
''',

    'switch-compat.tsx': r'''/**
 * Switch v2 compat with any-typed props.
 */
import { Switch as HeroSwitch } from '@heroui/react'

type AnyProps = Record<string, any>

function SwitchCompat(props: AnyProps) {
  const { children, isSelected, defaultSelected: _ds, onChange, onValueChange: _ov,
    color: _c, size: _s, thumbIcon: _ti, startContent: _sc, endContent: _ec,
    classNames: _cn, className, ...rest } = props
  return (
    <HeroSwitch className={className} isSelected={isSelected} onChange={onChange} {...rest}>
      {children}
    </HeroSwitch>
  )
}

SwitchCompat.Root = HeroSwitch.Root
SwitchCompat.Thumb = HeroSwitch.Thumb
SwitchCompat.Control = HeroSwitch.Control
SwitchCompat.ThumbIcon = HeroSwitch.ThumbIcon

export const Switch = SwitchCompat as any
''',

    'button-compat.tsx': r'''/**
 * Button v2 compat with any-typed props.
 */
import { Button as HeroButton } from '@heroui/react'

type AnyProps = Record<string, any>

const variantMap: Record<string, string> = {
  faded: 'bordered',
  flat: 'default',
  light: 'ghost',
}

function ButtonCompat(props: AnyProps) {
  const { children, variant, color: _c, size: _s, radius: _r,
    startContent: _sc, endContent: _ec, spinner: _sp,
    spinnerPlacement: _spp, isLoading: _il, disableAnimation: _da,
    disableRipple: _dr, fullWidth: _fw, isIconOnly: _iio,
    classNames: _cn, className, ...rest } = props

  const mappedVariant = variantMap[variant] || variant

  return (
    <HeroButton className={className} variant={mappedVariant} {...rest}>
      {children}
    </HeroButton>
  )
}

ButtonCompat.Root = HeroButton.Root
ButtonCompat.Content = HeroButton.Content
ButtonCompat.Icon = HeroButton.Icon
ButtonCompat.Spinner = HeroButton.Spinner
ButtonCompat.Ripple = HeroButton.Ripple

export const Button = ButtonCompat as any
''',
}

for filename, content in files.items():
    filepath = os.path.join(ROOT, filename)
    with open(filepath, 'w') as f:
        f.write(content.lstrip('\n'))
    print(f'  Wrote {filename} ({len(content)} bytes)')

print('Done!')
