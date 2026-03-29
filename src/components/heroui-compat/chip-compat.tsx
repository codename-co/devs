import { Chip as HeroChip } from '@heroui/react'
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
    Label: HeroChip.Label,
  }
)
