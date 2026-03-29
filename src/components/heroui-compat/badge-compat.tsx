import { Badge as HeroBadge } from '@heroui/react'
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
