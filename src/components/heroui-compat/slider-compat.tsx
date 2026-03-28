/**
 * Slider v2 compat: accepts v2 props.
 */
import { Slider as HeroSlider } from '@heroui/react'
import type { ReactNode } from 'react'

interface SliderCompatProps {
  label?: ReactNode
  value?: number | number[]
  defaultValue?: number | number[]
  minValue?: number
  maxValue?: number
  step?: number
  onChange?: (value: number | number[]) => void
  onChangeEnd?: (value: number | number[]) => void
  color?: string
  size?: string
  radius?: string
  showSteps?: boolean
  showTooltip?: boolean
  marks?: Array<{ value: number; label: string }>
  startContent?: ReactNode
  endContent?: ReactNode
  classNames?: Record<string, string>
  className?: string
  isDisabled?: boolean
  'aria-label'?: string
  [key: string]: unknown
}

export function Slider({
  label: _label,
  value,
  defaultValue,
  minValue,
  maxValue,
  step,
  onChange,
  onChangeEnd,
  color: _color,
  size: _size,
  radius: _radius,
  showSteps: _showSteps,
  showTooltip: _showTooltip,
  marks: _marks,
  startContent: _startContent,
  endContent: _endContent,
  classNames: _classNames,
  className,
  isDisabled,
  ...rest
}: SliderCompatProps) {
  return (
    <HeroSlider
      className={className}
      value={value}
      defaultValue={defaultValue}
      minValue={minValue}
      maxValue={maxValue}
      step={step}
      onChange={onChange}
      onChangeEnd={onChangeEnd}
      isDisabled={isDisabled}
      aria-label={rest['aria-label'] as string}
    >
      <HeroSlider.Track>
        <HeroSlider.Filler />
        <HeroSlider.Thumb />
      </HeroSlider.Track>
    </HeroSlider>
  )
}
