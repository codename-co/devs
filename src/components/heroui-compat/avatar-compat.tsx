import { Avatar as HeroAvatar } from '@heroui/react'
import { withCompound } from './v2-compat-types'

export const Avatar = withCompound(
  (props) => {
    const { src, alt, name: _n, icon: _i, color: _c, size: _s, radius: _r,
      isBordered: _ib, isDisabled: _id, showFallback: _sf, fallback: _f,
      classNames: _cn, className, ...rest } = props
    return <HeroAvatar className={className} src={src} alt={alt} {...rest} />
  },
  {
    Root: HeroAvatar.Root,
    Image: HeroAvatar.Image,
    Fallback: HeroAvatar.Fallback,
  }
)
