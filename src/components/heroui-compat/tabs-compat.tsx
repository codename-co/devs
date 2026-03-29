import { Tabs as HeroTabs } from '@heroui/react'
import React from 'react'
import { withCompound } from './v2-compat-types'

const cn = (...args: unknown[]) =>
  args.flat(Infinity).filter(Boolean).join(' ') || undefined

/**
 * v2 → v3 compat for Tabs.
 *
 * v2 pattern:  <Tabs><Tab key="k" title={node}>panel</Tab></Tabs>
 * v3 requires: <Tabs><Tabs.List><Tabs.Tab id="k">title</Tabs.Tab></Tabs.List><Tabs.Panel id="k">panel</Tabs.Panel></Tabs>
 *
 * This compat reads v2-style Tab children props and builds the proper v3 compound structure.
 */
export const Tabs = withCompound(
  (props) => {
    const {
      children,
      variant,
      selectedKey,
      defaultSelectedKey,
      onSelectionChange,
      classNames,
      className,
      placement,
      color: _c,
      size: _s,
      radius: _r,
      disableAnimation: _da,
      isDisabled: _d,
      fullWidth: _fw,
      ...rest
    } = props

    // Collect tab data from v2-style <Tab> children
    const tabsData: Array<{
      id: string
      title: React.ReactNode
      content: React.ReactNode
      isDisabled?: boolean
      className?: string
      href?: string
    }> = []
    React.Children.forEach(children, (child) => {
      if (!React.isValidElement(child)) return
      const cp = child.props as Record<string, any>
      // v2 uses key prop (available on element), v3 uses id prop
      const id =
        cp.id ??
        (child.key != null ? String(child.key).replace(/^\.\$/, '') : '')
      tabsData.push({
        id,
        title: cp.title ?? id,
        content: cp.children,
        isDisabled: cp.isDisabled,
        className: cp.className,
        href: cp.href,
      })
    })

    // Map v2 variant names to v3 (v3 only has 'primary' | 'secondary')
    const v3Variant = variant === 'secondary' ? 'secondary' : undefined

    return (
      <HeroTabs
        className={
          classNames?.base
            ? `${className ?? ''} ${classNames.base}`.trim()
            : className
        }
        selectedKey={selectedKey}
        defaultSelectedKey={defaultSelectedKey}
        onSelectionChange={onSelectionChange}
        orientation={
          placement === 'bottom' || placement === 'top'
            ? 'horizontal'
            : placement === 'start' || placement === 'end'
              ? 'vertical'
              : undefined
        }
        variant={v3Variant}
        aria-label={rest['aria-label']}
      >
        <HeroTabs.List className={cn(classNames?.tabList)}>
          {tabsData.map((tab) => (
            <HeroTabs.Tab
              key={tab.id}
              id={tab.id}
              className={cn(tab.className ?? classNames?.tab)}
              isDisabled={tab.isDisabled}
              href={tab.href}
            >
              {tab.title}
            </HeroTabs.Tab>
          ))}
        </HeroTabs.List>
        {tabsData
          .filter((t) => t.content != null)
          .map((tab) => (
            <HeroTabs.Panel
              key={tab.id}
              id={tab.id}
              className={cn(classNames?.panel)}
            >
              {tab.content}
            </HeroTabs.Panel>
          ))}
      </HeroTabs>
    )
  },
  {
    Root: HeroTabs.Root,
    ListContainer: HeroTabs.ListContainer,
    List: HeroTabs.List,
    Tab: HeroTabs.Tab,
    Indicator: HeroTabs.Indicator,
    Separator: HeroTabs.Separator,
    Panel: HeroTabs.Panel,
  },
)
