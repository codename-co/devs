import { Slider as HeroSlider } from '@heroui/react'
import { withCompound } from './v2-compat-types'

export const Slider = withCompound(
  (props) => {
    const { label: _l, value, defaultValue, minValue, maxValue, step,
      onChange, onChangeEnd, color: _c, size: _s, radius: _r,
      showSteps: _ss, showTooltip: _st, marks: _m,
      startContent: _sc, endContent: _ec,
      classNames: _cn, className, isDisabled, ...rest } = props
    return (
      <HeroSlider className={className} value={value} defaultValue={defaultValue}
        minValue={minValue} maxValue={maxValue} step={step}
        onChange={onChange} onChangeEnd={onChangeEnd}
        isDisabled={isDisabled} aria-label={rest['aria-label']}>
        <HeroSlider.Track>
          <HeroSlider.Fill />
          <HeroSlider.Thumb />
        </HeroSlider.Track>
      </HeroSlider>
    )
  },
  {
    Root: HeroSlider.Root,
    Track: HeroSlider.Track,
    Fill: HeroSlider.Fill,
    Thumb: HeroSlider.Thumb,
    Output: HeroSlider.Output,
    Marks: HeroSlider.Marks,
  }
)
