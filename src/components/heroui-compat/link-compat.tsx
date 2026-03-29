import { Link as HeroLink } from '@heroui/react'
import { withCompound } from './v2-compat-types'

export const Link = withCompound(
  (props) => {
    const { children, color: _c, size: _s, underline: _u,
      isBlock: _ib, isDisabled: _id, isExternal: _ie,
      showAnchorIcon: _sa, anchorIcon: _ai,
      classNames: _cn, className, href, ...rest } = props
    return <HeroLink className={className} href={href} {...rest}>{children}</HeroLink>
  },
  { Root: HeroLink.Root }
)
