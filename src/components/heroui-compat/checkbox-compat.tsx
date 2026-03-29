import { Checkbox as HeroCheckbox } from '@heroui/react'
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
