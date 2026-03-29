import { Button as HeroButton } from '@heroui/react'
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
  }
)
