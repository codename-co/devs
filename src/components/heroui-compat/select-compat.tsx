import { Select as HeroSelect, ListBox as HeroListBox } from '@heroui/react'
import { withCompound, type V2Compat } from './v2-compat-types'

export const SelectItem: V2Compat = (props) => {
  const { children, title: _t, description: _d, startContent: _s,
    endContent: _e, classNames: _cn, ...rest } = props
  return <HeroListBox.Item {...rest}>{children}</HeroListBox.Item>
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
    Item: SelectItem,
  }
)
