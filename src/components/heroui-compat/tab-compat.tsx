import { Tab as HeroTab } from '@heroui/react'
import type { V2Compat } from './v2-compat-types'

export const Tab: V2Compat = (props) => {
  const { children: _children, title, id, className, isDisabled, ...rest } = props
  return (
    <HeroTab id={id} className={className} isDisabled={isDisabled}
      aria-label={rest['aria-label']}>
      {title ?? id}
    </HeroTab>
  )
}
