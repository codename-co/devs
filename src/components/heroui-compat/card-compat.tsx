import { Card as HeroCard } from '@heroui/react'
import { withCompound, type V2Compat } from './v2-compat-types'

export const CardBody: V2Compat = (props) => {
  const { children, className, ...rest } = props
  return (
    <HeroCard.Content className={className} {...rest}>
      {children}
    </HeroCard.Content>
  )
}

export const CardHeader: V2Compat = (props) => {
  const { children, className, ...rest } = props
  return (
    <HeroCard.Header className={className} {...rest}>
      {children}
    </HeroCard.Header>
  )
}

export const CardFooter: V2Compat = (props) => {
  const { children, className, ...rest } = props
  return (
    <HeroCard.Footer className={className} {...rest}>
      {children}
    </HeroCard.Footer>
  )
}

export const Card = withCompound(
  (props) => {
    const {
      children,
      isPressable: _p,
      isHoverable: _h,
      shadow: _s,
      classNames: _cn,
      className,
      ...rest
    } = props
    const validVariant = rest.variant === 'surface' ? 'default' : rest.variant
    const { variant: _, ...validRest } = rest
    return (
      <HeroCard className={className} variant={validVariant} {...validRest}>
        {children}
      </HeroCard>
    )
  },
  {
    Root: HeroCard.Root,
    Header: CardHeader,
    Content: CardBody,
    Body: CardBody,
    Footer: CardFooter,
  },
)
