import { Spinner as HeroSpinner } from '@heroui/react'
import type { V2Compat } from './v2-compat-types'

export const Spinner: V2Compat = (props) => {
  const { label: _l, color: _c, size: _s, labelColor: _lc,
    classNames: _cn, className, ...rest } = props
  return <HeroSpinner className={className} {...rest} />
}
