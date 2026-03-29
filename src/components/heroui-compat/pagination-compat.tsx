import { Pagination as HeroPagination } from '@heroui/react'
import { withCompound } from './v2-compat-types'

export const Pagination = withCompound(
  (props) => {
    const { total: _t, page: _p, initialPage: _ip, onChange: _oc,
      color: _c, variant: _v, size: _s, radius: _r,
      showControls: _sc, isCompact: _ic, isDisabled: _id,
      loop: _l, siblings: _si, boundaries: _b,
      classNames: _cn, className, ...rest } = props
    return (
      <HeroPagination className={className} {...rest}>
        <HeroPagination.Previous>{"<"}</HeroPagination.Previous>
        <HeroPagination.Content>{" "}</HeroPagination.Content>
        <HeroPagination.Next>{">"}</HeroPagination.Next>
      </HeroPagination>
    )
  },
  {
    Root: HeroPagination.Root,
    Previous: HeroPagination.Previous,
    Content: HeroPagination.Content,
    Next: HeroPagination.Next,
    Item: HeroPagination.Item,
    Link: HeroPagination.Link,
    Ellipsis: HeroPagination.Ellipsis,
  }
)
