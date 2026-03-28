/**
 * Button v2 compat: accepts `color`, `isLoading`, `startContent`, `endContent`,
 * `isIconOnly`, `fullWidth`, `radius` props.
 */
import { Button as HeroButton, Spinner } from '@heroui/react'
import type { ReactNode, MouseEventHandler } from 'react'

interface ButtonCompatProps {
  children?: ReactNode
  color?: string
  variant?: string
  size?: string
  radius?: string
  isLoading?: boolean
  isDisabled?: boolean
  isIconOnly?: boolean
  fullWidth?: boolean
  startContent?: ReactNode
  endContent?: ReactNode
  className?: string
  type?: 'button' | 'submit' | 'reset'
  onPress?: () => void
  onClick?: MouseEventHandler
  href?: string
  as?: React.ElementType
  'data-testid'?: string
  'aria-label'?: string
  [key: string]: unknown
}

// Map v2 color+variant to v3 variant
function mapVariant(color?: string, variant?: string): string | undefined {
  // v2 had: color (default/primary/secondary/success/warning/danger) + variant (solid/bordered/light/flat/faded/shadow/ghost)
  // v3 has: variant (primary/secondary/tertiary/danger/danger-soft/ghost/outline)
  if (variant === 'ghost') return 'ghost'
  if (variant === 'bordered' || variant === 'faded') return 'outline'
  if (variant === 'light' || variant === 'flat') return 'tertiary'
  if (color === 'danger') return 'danger'
  if (color === 'primary' || color === 'default' || !color) {
    if (variant === 'solid' || !variant) return 'primary'
    return variant
  }
  if (color === 'secondary') return 'secondary'
  if (color === 'success' || color === 'warning') return 'secondary'
  return variant
}

export function Button({
  children,
  color,
  variant,
  size,
  radius: _radius,
  isLoading,
  isDisabled,
  isIconOnly,
  fullWidth,
  startContent,
  endContent,
  className,
  type,
  onPress,
  onClick,
  as: _as,
  ...rest
}: ButtonCompatProps) {
  const v3Variant = mapVariant(color, variant) as
    | 'primary' | 'secondary' | 'tertiary' | 'danger' | 'danger-soft' | 'ghost' | 'outline'
    | undefined

  const v3Size = size === 'lg' ? 'lg' : size === 'sm' ? 'sm' : undefined

  return (
    <HeroButton
      className={className}
      variant={v3Variant}
      size={v3Size}
      isDisabled={isDisabled || isLoading}
      isIconOnly={isIconOnly}
      fullWidth={fullWidth}
      onPress={onPress}
      onClick={onClick}
      type={type}
      data-testid={rest['data-testid'] as string}
      aria-label={rest['aria-label'] as string}
    >
      {isLoading && <Spinner size="sm" />}
      {startContent}
      {children}
      {endContent}
    </HeroButton>
  )
}
