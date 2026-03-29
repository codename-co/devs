import { ProgressBar as HeroProgressBar } from '@heroui/react'
import { withCompound } from './v2-compat-types'

export const ProgressBar = withCompound(
  (props) => {
    const { label: _l, value, maxValue, minValue,
      color: _c, size: _s, radius: _r,
      showValueLabel: _sv, formatOptions: _fo,
      isIndeterminate: _ii, isStriped: _is,
      classNames: _cn, className, ...rest } = props
    return <HeroProgressBar className={className} value={value}
      maxValue={maxValue} minValue={minValue} {...rest} />
  },
  {
    Root: HeroProgressBar.Root,
    Track: HeroProgressBar.Track,
    Fill: HeroProgressBar.Fill,
  }
)
