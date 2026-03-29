import { Radio as HeroRadio, RadioGroup as HeroRadioGroup } from '@heroui/react'
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
    Indicator: HeroRadio.Indicator,
    Content: HeroRadio.Content,
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
