import {
  Select as HeroSelect,
  ListBox,
  ListBoxItem,
  Label,
} from '@heroui/react'
import { withCompound, type V2Compat } from './v2-compat-types'

// Re-export ListBoxItem directly — wrapping collection items in a regular component
// breaks React Aria's collection traversal ("cannot be rendered outside a collection").
export const SelectItem = ListBoxItem as unknown as V2Compat

export const Select = withCompound(
  (props) => {
    const {
      children,
      label,
      description: _d,
      errorMessage: _em,
      placeholder,
      items: _i,
      selectionMode: _sm,
      selectedKeys,
      defaultSelectedKeys,
      onSelectionChange,
      disallowEmptySelection: _dae,
      isRequired,
      isDisabled,
      isLoading: _il,
      selectorIcon: _si,
      scrollRef: _sr,
      classNames: _cn,
      variant,
      color: _c,
      size: _s,
      labelPlacement: _lp,
      radius: _r,
      className,
      ...rest
    } = props

    // Convert v2 selectedKeys (array/Set) to v3 selectedKey (single value)
    const selectedKey =
      selectedKeys != null
        ? ((Array.isArray(selectedKeys)
            ? selectedKeys[0]
            : Array.from(selectedKeys as Iterable<unknown>)[0]) ?? null)
        : undefined
    const defaultSelectedKey =
      defaultSelectedKeys != null
        ? Array.isArray(defaultSelectedKeys)
          ? defaultSelectedKeys[0]
          : Array.from(defaultSelectedKeys as Iterable<unknown>)[0]
        : undefined

    // Wrap v2 onSelectionChange (receives Set) to v3 (receives single Key)
    const handleSelectionChange = onSelectionChange
      ? (key: any) => onSelectionChange(new Set([key]))
      : undefined

    return (
      <HeroSelect
        className={className}
        isDisabled={isDisabled}
        isRequired={isRequired}
        selectedKey={selectedKey}
        defaultSelectedKey={defaultSelectedKey}
        onSelectionChange={handleSelectionChange}
        placeholder={placeholder}
        aria-label={typeof label === 'string' ? label : undefined}
        variant={variant}
        {...rest}
      >
        {label && <Label>{label}</Label>}
        <HeroSelect.Trigger>
          <HeroSelect.Value />
          <HeroSelect.Indicator />
        </HeroSelect.Trigger>
        <HeroSelect.Popover>
          <ListBox>{children}</ListBox>
        </HeroSelect.Popover>
      </HeroSelect>
    )
  },
  {
    Root: HeroSelect.Root,
    Trigger: HeroSelect.Trigger,
    Value: HeroSelect.Value,
    Popover: HeroSelect.Popover,
    Indicator: HeroSelect.Indicator,
    Item: ListBoxItem as unknown as V2Compat,
  },
)
