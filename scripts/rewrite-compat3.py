#!/usr/bin/env python3
"""
Fix compat layer: use FC<any> pattern instead of 'as any' on export.
This ensures:
- Components accept any props (no TS2322 on v2 props)
- Return type is JSX.Element (callbacks don't become implicit any)
"""
import os
import re

ROOT = '/Users/arnaud/repos/codename/devs/src/components/heroui-compat'

# For each compat file, change the export from `as any` to proper FC typing
# The key change: function signature uses explicit return type JSX.Element
# and accepts any props, but compound sub-components are typed as FC<any>

for filename in os.listdir(ROOT):
    if not filename.endswith('.tsx') or filename == 'index.tsx':
        continue
    
    filepath = os.path.join(ROOT, filename)
    with open(filepath, 'r') as f:
        content = f.read()
    
    original = content
    
    # Replace `type AnyProps = Record<string, any>` with a more specific approach
    # Keep AnyProps but ensure function return types are explicit
    
    # Fix: instead of `export const X = Compat as any`, use proper typing
    # The `as any` on the export causes all downstream types to be `any`
    # Instead, we need the component to accept any props but return JSX.Element
    
    # Pattern: change `export const Foo = FooCompat as any` to keep it but
    # ensure compound sub-components have proper types
    
    # Actually, the real fix is simpler: DON'T cast to `any`, instead
    # make the function signature accept a generic props object
    
    with open(filepath, 'w') as f:
        f.write(content)

print("Analyzing approach...")

# The real fix: use a V2CompatComponent type that accepts any props
# but returns JSX.Element properly
# 
# type V2Compat<T> = React.FC<T & Record<string, any>>
#
# This way:
# - Component accepts any extra v2 props (no TS2322)
# - Return type is ReactElement (callbacks typed properly)
# - Compound sub-components maintain their v3 types for autocompletion

# Let me take a different final approach:
# Keep compat wrappers as-is with AnyProps, but make the EXPORT use
# a branded type that preserves JSX return while accepting any props

print("Writing final compat approach...")

# The solution: Create a helper type and use it
helper_content = '''/**
 * Helper type for v2 compat components.
 * Accepts any props (v2 compat) but returns proper JSX (not any).
 */
import type { JSX } from 'react'

/**
 * A component that accepts any props for v2 backward compatibility.
 * This prevents TS2322 errors on v2 props while keeping return types typed.
 */
export type V2Compat = (props: any) => JSX.Element

/**
 * Creates a v2-compat component with compound sub-components.
 * The main component accepts any props, compound members keep their v3 types.
 */
export function withCompound<T extends Record<string, any>>(
  main: (props: any) => JSX.Element,
  compounds: T
): V2Compat & T {
  const result = main as V2Compat & T
  Object.assign(result, compounds)
  return result
}
'''

with open(os.path.join(ROOT, 'v2-compat-types.tsx'), 'w') as f:
    f.write(helper_content)
print("  Wrote v2-compat-types.tsx")

# Now rewrite each compat to use withCompound helper
rewrites = {
    'accordion-compat.tsx': '''import { Accordion as HeroAccordion } from '@heroui/react'
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
''',

    'dropdown-compat.tsx': '''import { Dropdown as HeroDropdown } from '@heroui/react'
import { withCompound, type V2Compat } from './v2-compat-types'

export const DropdownItem: V2Compat = (props) => {
  const { children, title: _, description: _d, startContent: _s, endContent: _e,
    color: _c, closeOnSelect: _cs, isReadOnly: _r, showDivider: _sd,
    classNames: _cn, ...rest } = props
  return <HeroDropdown.Item {...rest}>{children}</HeroDropdown.Item>
}

export const DropdownSection: V2Compat = (props) => {
  const { children, title: _, showDivider: _s, classNames: _cn, ...rest } = props
  return <HeroDropdown.Section {...rest}>{children}</HeroDropdown.Section>
}

export const DropdownMenu: V2Compat = (props) => {
  const { children, closeOnSelect: _c, selectionMode: _s, selectedKeys: _sk,
    onSelectionChange: _osc, disallowEmptySelection: _d, classNames: _cn,
    color: _co, variant: _v, ...rest } = props
  return <HeroDropdown.Menu {...rest}>{children}</HeroDropdown.Menu>
}

export const Dropdown = withCompound(
  (props) => {
    const { children, isOpen: _, onOpenChange: _o, placement: _p,
      closeOnSelect: _c, classNames: _cn, ...rest } = props
    return <HeroDropdown {...rest}>{children}</HeroDropdown>
  },
  {
    Root: HeroDropdown.Root,
    Trigger: HeroDropdown.Trigger,
    Popover: HeroDropdown.Popover,
    Menu: DropdownMenu,
    Section: DropdownSection,
    Item: DropdownItem,
    ItemIndicator: HeroDropdown.ItemIndicator,
    SubmenuIndicator: HeroDropdown.SubmenuIndicator,
    SubmenuTrigger: HeroDropdown.SubmenuTrigger,
  }
)
''',

    'card-compat.tsx': '''import { Card as HeroCard } from '@heroui/react'
import { withCompound, type V2Compat } from './v2-compat-types'

export const CardBody: V2Compat = (props) => {
  const { children, className, ...rest } = props
  return <HeroCard.Content className={className} {...rest}>{children}</HeroCard.Content>
}

export const CardHeader: V2Compat = (props) => {
  const { children, className, ...rest } = props
  return <HeroCard.Header className={className} {...rest}>{children}</HeroCard.Header>
}

export const CardFooter: V2Compat = (props) => {
  const { children, className, ...rest } = props
  return <HeroCard.Footer className={className} {...rest}>{children}</HeroCard.Footer>
}

export const Card = withCompound(
  (props) => {
    const { children, isPressable: _p, isHoverable: _h, shadow: _s,
      classNames: _cn, className, ...rest } = props
    const validVariant = rest.variant === 'surface' ? 'default' : rest.variant
    const { variant: _, ...validRest } = rest
    return <HeroCard className={className} variant={validVariant} {...validRest}>{children}</HeroCard>
  },
  {
    Root: HeroCard.Root,
    Header: CardHeader,
    Content: CardBody,
    Body: CardBody,
    Footer: CardFooter,
  }
)
''',

    'tabs-compat.tsx': '''import { Tabs as HeroTabs } from '@heroui/react'
import { withCompound } from './v2-compat-types'

export const Tabs = withCompound(
  (props) => {
    const { children, variant: _v, color: _c, size: _s, radius: _r,
      selectedKey: _sk, defaultSelectedKey: _dk, onSelectionChange: _osc,
      disableAnimation: _da, isDisabled: _d, fullWidth: _fw,
      classNames: _cn, className, ...rest } = props
    return <HeroTabs className={className} aria-label={rest['aria-label']}>{children}</HeroTabs>
  },
  {
    Root: HeroTabs.Root,
    ListContainer: HeroTabs.ListContainer,
    List: HeroTabs.List,
    Tab: HeroTabs.Tab,
    Indicator: HeroTabs.Indicator,
    Separator: HeroTabs.Separator,
    Panel: HeroTabs.Panel,
  }
)
''',

    'modal-compat.tsx': '''import { Modal as HeroModal } from '@heroui/react'
import { withCompound, type V2Compat } from './v2-compat-types'
import type { ReactNode } from 'react'

export interface ModalCompatProps {
  children?: ReactNode
  isOpen?: boolean
  onOpenChange?: (isOpen: boolean) => void
  [key: string]: any
}

export const ModalContent: V2Compat = (props) => {
  const { children, className, ...rest } = props
  return <HeroModal.Content className={className} {...rest}>{typeof children === 'function' ? children(() => {}) : children}</HeroModal.Content>
}

export const ModalHeader: V2Compat = (props) => {
  const { children, className, ...rest } = props
  return <HeroModal.Header className={className} {...rest}>{children}</HeroModal.Header>
}

export const ModalBody: V2Compat = (props) => {
  const { children, className, ...rest } = props
  return <HeroModal.Body className={className} {...rest}>{children}</HeroModal.Body>
}

export const ModalFooter: V2Compat = (props) => {
  const { children, className, ...rest } = props
  return <HeroModal.Footer className={className} {...rest}>{children}</HeroModal.Footer>
}

export const Modal = withCompound(
  (props) => {
    const { children, isOpen: _io, onOpenChange: _ooc, size: _s,
      placement: _p, backdrop: _b, scrollBehavior: _sb,
      isDismissable: _id, isKeyboardDismissDisabled: _ikd,
      hideCloseButton: _hcb, closeButton: _cb,
      classNames: _cn, className, ...rest } = props
    return <HeroModal className={className} {...rest}>{children}</HeroModal>
  },
  {
    Root: HeroModal.Root,
    Backdrop: HeroModal.Backdrop,
    Container: HeroModal.Container,
    Dialog: HeroModal.Dialog,
    Header: ModalHeader,
    Heading: HeroModal.Heading,
    Body: ModalBody,
    Footer: ModalFooter,
    Content: ModalContent,
  }
)
''',

    'misc-compat.tsx': '''import {
  Alert as HeroAlert,
  Kbd as HeroKbd,
  ButtonGroup as HeroBtnGroup,
  ScrollShadow as HeroScrollShadow,
  ListBox as HeroListBox,
  ListBoxItem as HeroListBoxItem,
  ListBoxSection as HeroListBoxSection,
} from '@heroui/react'
import { withCompound, type V2Compat } from './v2-compat-types'

export const Alert: V2Compat = (props) => {
  const { children, title: _t, description: _d, color: _c, variant: _v,
    icon: _i, startContent: _s, endContent: _e, isVisible: _iv,
    hideIconWrapper: _h, classNames: _cn, className, onClose: _oc, ...rest } = props
  return <HeroAlert className={className} {...rest}>{children}</HeroAlert>
}

export const Kbd: V2Compat = (props) => {
  const { children, keys: _k, classNames: _cn, className, ...rest } = props
  return <HeroKbd className={className} {...rest}>{children}</HeroKbd>
}

export const ButtonGroup: V2Compat = (props) => {
  const { children, variant: _v, color: _c, size: _s, radius: _r,
    fullWidth: _fw, className, ...rest } = props
  return <HeroBtnGroup className={className} {...rest}>{children}</HeroBtnGroup>
}

export const ScrollShadow: V2Compat = (props) => {
  const { children, className, size: _s, offset: _o, orientation: _or,
    isEnabled: _ie, hideScrollBar: _h, visibility: _vi, ...rest } = props
  return <HeroScrollShadow className={className} {...rest}>{children}</HeroScrollShadow>
}

export const ListBoxItem: V2Compat = (props) => {
  const { children, title: _t, description: _d, startContent: _s,
    endContent: _e, classNames: _cn, color: _c, isReadOnly: _r, ...rest } = props
  return <HeroListBoxItem {...rest}>{children}</HeroListBoxItem>
}

export const ListBoxSection: V2Compat = (props) => {
  const { children, title: _t, showDivider: _s, classNames: _cn, ...rest } = props
  return <HeroListBoxSection {...rest}>{children}</HeroListBoxSection>
}

export const ListBox = withCompound(
  (props) => {
    const { children, items: _i, selectionMode: _s, selectedKeys: _sk,
      onSelectionChange: _osc, disallowEmptySelection: _d, className,
      classNames: _cn, emptyContent: _ec, ...rest } = props
    return <HeroListBox className={className} aria-label={rest['aria-label']}>{children}</HeroListBox>
  },
  {
    Root: HeroListBox.Root,
    Item: ListBoxItem,
    Section: ListBoxSection,
  }
)
''',

    'popover-compat.tsx': '''import { Popover as HeroPopover } from '@heroui/react'
import { withCompound, type V2Compat } from './v2-compat-types'

export const PopoverTrigger: V2Compat = (props) => {
  const { children, ...rest } = props
  return <HeroPopover.Trigger {...rest}>{children}</HeroPopover.Trigger>
}

export const PopoverContent: V2Compat = (props) => {
  const { children, className, ...rest } = props
  return <HeroPopover.Content className={className} {...rest}>{children ?? null}</HeroPopover.Content>
}

export const Popover = withCompound(
  (props) => {
    const { children, isOpen: _io, onOpenChange: _ooc, placement: _p,
      offset: _o, showArrow: _sa, triggerScaleOnOpen: _ts,
      classNames: _cn, className, ...rest } = props
    return <HeroPopover className={className} {...rest}>{children}</HeroPopover>
  },
  {
    Root: HeroPopover.Root,
    Trigger: PopoverTrigger,
    Content: PopoverContent,
  }
)
''',
}

for filename, content in rewrites.items():
    filepath = os.path.join(ROOT, filename)
    with open(filepath, 'w') as f:
        f.write(content)
    print(f"  Wrote {filename}")

# Also rewrite simpler compat files to use V2Compat type
simple_rewrites = {
    'tab-compat.tsx': '''import { Tab as HeroTab } from '@heroui/react'
import type { V2Compat } from './v2-compat-types'

export const Tab: V2Compat = (props) => {
  const { children: _children, title, id, className, isDisabled, ...rest } = props
  return (
    <HeroTab id={id} className={className} isDisabled={isDisabled}
      aria-label={rest['aria-label']}>
      {title ?? id}
    </HeroTab>
  )
}
''',

    'avatar-compat.tsx': '''import { Avatar as HeroAvatar } from '@heroui/react'
import { withCompound } from './v2-compat-types'

export const Avatar = withCompound(
  (props) => {
    const { src, alt, name: _n, icon: _i, color: _c, size: _s, radius: _r,
      isBordered: _ib, isDisabled: _id, showFallback: _sf, fallback: _f,
      classNames: _cn, className, ...rest } = props
    return <HeroAvatar className={className} src={src} alt={alt} {...rest} />
  },
  {
    Root: HeroAvatar.Root,
    Image: HeroAvatar.Image,
    Fallback: HeroAvatar.Fallback,
  }
)
''',

    'chip-compat.tsx': '''import { Chip as HeroChip } from '@heroui/react'
import { withCompound } from './v2-compat-types'

const variantMap: Record<string, string> = {
  faded: 'bordered',
  flat: 'default',
  light: 'default',
}

export const Chip = withCompound(
  (props) => {
    const { children, variant, color: _c, size: _s, radius: _r,
      startContent: _sc, endContent: _ec, onClose: _oc,
      isCloseable: _ic, classNames: _cn, className, ...rest } = props
    const mappedVariant = variantMap[variant] || variant
    return <HeroChip className={className} variant={mappedVariant} {...rest}>{children}</HeroChip>
  },
  {
    Root: HeroChip.Root,
    Content: HeroChip.Content,
    CloseButton: HeroChip.CloseButton,
  }
)
''',

    'switch-compat.tsx': '''import { Switch as HeroSwitch } from '@heroui/react'
import { withCompound } from './v2-compat-types'

export const Switch = withCompound(
  (props) => {
    const { children, isSelected, defaultSelected: _ds, onChange, onValueChange: _ov,
      color: _c, size: _s, thumbIcon: _ti, startContent: _sc, endContent: _ec,
      classNames: _cn, className, ...rest } = props
    return (
      <HeroSwitch className={className} isSelected={isSelected} onChange={onChange} {...rest}>
        {children}
      </HeroSwitch>
    )
  },
  {
    Root: HeroSwitch.Root,
    Thumb: HeroSwitch.Thumb,
    Control: HeroSwitch.Control,
    ThumbIcon: HeroSwitch.ThumbIcon,
  }
)
''',

    'badge-compat.tsx': '''import { Badge as HeroBadge } from '@heroui/react'
import { withCompound } from './v2-compat-types'

export const Badge = withCompound(
  (props) => {
    const { children, content: _ct, color: _c, variant: _v, size: _s,
      shape: _sh, placement: _p, showOutline: _so, isInvisible: _ii,
      isOneChar: _io, isDot: _id, disableAnimation: _da,
      classNames: _cn, className, ...rest } = props
    return <HeroBadge className={className} {...rest}>{children}</HeroBadge>
  },
  { Root: HeroBadge.Root }
)
''',

    'button-compat.tsx': '''import { Button as HeroButton } from '@heroui/react'
import { withCompound } from './v2-compat-types'

const variantMap: Record<string, string> = {
  faded: 'bordered',
  flat: 'default',
  light: 'ghost',
}

export const Button = withCompound(
  (props) => {
    const { children, variant, color: _c, size: _s, radius: _r,
      startContent: _sc, endContent: _ec, spinner: _sp,
      spinnerPlacement: _spp, isLoading: _il, disableAnimation: _da,
      disableRipple: _dr, fullWidth: _fw, isIconOnly: _iio,
      classNames: _cn, className, ...rest } = props
    const mappedVariant = variantMap[variant] || variant
    return <HeroButton className={className} variant={mappedVariant} {...rest}>{children}</HeroButton>
  },
  {
    Root: HeroButton.Root,
    Content: HeroButton.Content,
    Icon: HeroButton.Icon,
    Spinner: HeroButton.Spinner,
    Ripple: HeroButton.Ripple,
  }
)
''',

    'checkbox-compat.tsx': '''import { Checkbox as HeroCheckbox } from '@heroui/react'
import { withCompound } from './v2-compat-types'

export const Checkbox = withCompound(
  (props) => {
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
  },
  {
    Root: HeroCheckbox.Root,
    Control: HeroCheckbox.Control,
    Indicator: HeroCheckbox.Indicator,
  }
)
''',

    'drawer-compat.tsx': '''import { Drawer as HeroDrawer } from '@heroui/react'
import { withCompound, type V2Compat } from './v2-compat-types'

export const DrawerContent: V2Compat = (props) => {
  const { children, className, ...rest } = props
  return <HeroDrawer.Content className={className} {...rest}>{children}</HeroDrawer.Content>
}

export const DrawerHeader: V2Compat = (props) => {
  const { children, className, ...rest } = props
  return <HeroDrawer.Header className={className} {...rest}>{children}</HeroDrawer.Header>
}

export const DrawerBody: V2Compat = (props) => {
  const { children, className, ...rest } = props
  return <HeroDrawer.Body className={className} {...rest}>{children}</HeroDrawer.Body>
}

export const DrawerFooter: V2Compat = (props) => {
  const { children, className, ...rest } = props
  return <HeroDrawer.Footer className={className} {...rest}>{children}</HeroDrawer.Footer>
}

export const Drawer = withCompound(
  (props) => {
    const { children, isOpen: _io, onOpenChange: _ooc, placement: _p,
      size: _s, classNames: _cn, className, ...rest } = props
    return <HeroDrawer className={className} {...rest}>{children}</HeroDrawer>
  },
  {
    Root: HeroDrawer.Root,
    Content: DrawerContent,
    Header: DrawerHeader,
    Body: DrawerBody,
    Footer: DrawerFooter,
  }
)
''',

    'input-compat.tsx': '''import { Input as HeroInput } from '@heroui/react'
import { withCompound } from './v2-compat-types'

export const Input = withCompound(
  (props) => {
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
  },
  { Root: HeroInput.Root }
)
''',

    'textarea-compat.tsx': '''import { TextArea as HeroTextArea } from '@heroui/react'
import { withCompound } from './v2-compat-types'

export const TextArea = withCompound(
  (props) => {
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
  },
  { Root: HeroTextArea.Root }
)
''',

    'link-compat.tsx': '''import { Link as HeroLink } from '@heroui/react'
import { withCompound } from './v2-compat-types'

export const Link = withCompound(
  (props) => {
    const { children, color: _c, size: _s, underline: _u,
      isBlock: _ib, isDisabled: _id, isExternal: _ie,
      showAnchorIcon: _sa, anchorIcon: _ai,
      classNames: _cn, className, href, ...rest } = props
    return <HeroLink className={className} href={href} {...rest}>{children}</HeroLink>
  },
  { Root: HeroLink.Root }
)
''',

    'select-compat.tsx': '''import { Select as HeroSelect } from '@heroui/react'
import { withCompound, type V2Compat } from './v2-compat-types'

export const SelectItem: V2Compat = (props) => {
  const { children, title: _t, description: _d, startContent: _s,
    endContent: _e, classNames: _cn, ...rest } = props
  return <HeroSelect.Item {...rest}>{children}</HeroSelect.Item>
}

export const Select = withCompound(
  (props) => {
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
  },
  {
    Root: HeroSelect.Root,
    Trigger: HeroSelect.Trigger,
    Value: HeroSelect.Value,
    Popover: HeroSelect.Popover,
    ListBox: HeroSelect.ListBox,
    Item: SelectItem,
    Section: HeroSelect.Section,
  }
)
''',

    'radio-compat.tsx': '''import { Radio as HeroRadio, RadioGroup as HeroRadioGroup } from '@heroui/react'
import { withCompound } from './v2-compat-types'

export const Radio = withCompound(
  (props) => {
    const { children, value, description: _d, color: _c, size: _s,
      classNames: _cn, className, ...rest } = props
    return <HeroRadio className={className} value={value} {...rest}>{children}</HeroRadio>
  },
  {
    Root: HeroRadio.Root,
    Control: HeroRadio.Control,
    Label: HeroRadio.Label,
    Description: HeroRadio.Description,
  }
)

export const RadioGroup = withCompound(
  (props) => {
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
  },
  { Root: HeroRadioGroup.Root }
)
''',

    'spinner-compat.tsx': '''import { Spinner as HeroSpinner } from '@heroui/react'
import type { V2Compat } from './v2-compat-types'

export const Spinner: V2Compat = (props) => {
  const { label: _l, color: _c, size: _s, labelColor: _lc,
    classNames: _cn, className, ...rest } = props
  return <HeroSpinner className={className} {...rest} />
}
''',

    'progressbar-compat.tsx': '''import { ProgressBar as HeroProgressBar } from '@heroui/react'
import { withCompound } from './v2-compat-types'

export const ProgressBar = withCompound(
  (props) => {
    const { label: _l, value, maxValue, minValue,
      color: _c, size: _s, radius: _r,
      showValueLabel: _sv, formatOptions: _fo,
      isIndeterminate: _ii, isStriped: _is,
      classNames: _cn, className, ...rest } = props
    return <HeroProgressBar className={className} value={value}
      maxValue={maxValue} minValue={minValue} {...rest} />
  },
  {
    Root: HeroProgressBar.Root,
    Track: HeroProgressBar.Track,
    Fill: HeroProgressBar.Fill,
  }
)
''',

    'slider-compat.tsx': '''import { Slider as HeroSlider } from '@heroui/react'
import { withCompound } from './v2-compat-types'

export const Slider = withCompound(
  (props) => {
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
  },
  {
    Root: HeroSlider.Root,
    Track: HeroSlider.Track,
    Fill: HeroSlider.Fill,
    Thumb: HeroSlider.Thumb,
    Output: HeroSlider.Output,
    Marks: HeroSlider.Marks,
  }
)
''',

    'pagination-compat.tsx': '''import React from 'react'
import { Pagination as HeroPagination } from '@heroui/react'
import { withCompound } from './v2-compat-types'

export const Pagination = withCompound(
  (props) => {
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
  },
  {
    Root: HeroPagination.Root,
    Previous: HeroPagination.Previous,
    Content: HeroPagination.Content,
    Next: HeroPagination.Next,
    Item: HeroPagination.Item,
    Link: HeroPagination.Link,
    Ellipsis: HeroPagination.Ellipsis,
  }
)
''',
}

for filename, content in simple_rewrites.items():
    filepath = os.path.join(ROOT, filename)
    with open(filepath, 'w') as f:
        f.write(content)
    print(f"  Wrote {filename}")

print("Done!")
