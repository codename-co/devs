import { Switch as HeroSwitch } from '@heroui/react'
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
    Icon: HeroSwitch.Icon,
  }
)
