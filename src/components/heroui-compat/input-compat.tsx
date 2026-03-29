import { Input as HeroInput } from '@heroui/react'
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
