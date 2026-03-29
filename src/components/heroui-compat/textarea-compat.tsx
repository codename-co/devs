import { TextArea as HeroTextArea } from '@heroui/react'
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
