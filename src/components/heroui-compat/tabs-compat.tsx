import { Tabs as HeroTabs } from '@heroui/react'
import { withCompound } from './v2-compat-types'

export const Tabs = withCompound(
  (props) => {
    const { children, variant: _v, color: _c, size: _s, radius: _r,
      selectedKey: _sk, defaultSelectedKey: _dk, onSelectionChange: _osc,
      disableAnimation: _da, isDisabled: _d, fullWidth: _fw,
      classNames: _cn, className, ...rest } = props
    return <HeroTabs className={className} aria-label={rest['aria-label']}>{children}</HeroTabs>
  },
  {
    Root: HeroTabs.Root,
    ListContainer: HeroTabs.ListContainer,
    List: HeroTabs.List,
    Tab: HeroTabs.Tab,
    Indicator: HeroTabs.Indicator,
    Separator: HeroTabs.Separator,
    Panel: HeroTabs.Panel,
  }
)
