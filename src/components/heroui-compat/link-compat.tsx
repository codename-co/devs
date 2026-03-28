/**
 * Link v2 compat: accepts `as`, `target`, `color`, `showAnchorIcon` props.
 */
import { Link as HeroLink } from '@heroui/react'
import type { ReactNode } from 'react'

interface LinkCompatProps {
  children?: ReactNode
  href?: string
  target?: string
  rel?: string
  color?: string
  size?: string
  isExternal?: boolean
  showAnchorIcon?: boolean
  as?: React.ElementType
  className?: string
  onPress?: () => void
  onClick?: () => void
  isDisabled?: boolean
  isBlock?: boolean
  'data-testid'?: string
  [key: string]: unknown
}

export function Link({
  children,
  href,
  target,
  rel,
  color: _color,
  size: _size,
  isExternal,
  showAnchorIcon: _showAnchorIcon,
  as: _as,
  className,
  onPress,
  onClick,
  isDisabled,
  isBlock: _isBlock,
  ...rest
}: LinkCompatProps) {
  const externalProps = isExternal || target === '_blank'
    ? { target: '_blank', rel: rel ?? 'noopener noreferrer' }
    : { target, rel }

  return (
    <HeroLink
      className={className}
      href={href}
      onPress={onPress}
      onClick={onClick}
      isDisabled={isDisabled}
      data-testid={rest['data-testid'] as string}
      {...externalProps}
    >
      {children}
    </HeroLink>
  )
}
