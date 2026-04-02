import { Icon } from '@/components'
import { type IconName } from '@/lib/types'
import {
  Avatar,
  Button,
  Chip,
  ListBox,
  ScrollShadow,
  Separator,
  Tooltip,
} from '@heroui/react_3'

const navItems: {
  id: string
  label: string
  icon: IconName
  count?: number
}[] = [
  { id: 'Inbox', label: 'Inbox', icon: 'Neighbourhood', count: 12 },
  { id: 'Sent', label: 'Sent', icon: 'EvPlugCharging' },
  { id: 'Starred', label: 'Starred', icon: 'Star' },
  { id: 'Drafts', label: 'Drafts', icon: 'Drafts' },
  { id: 'Flag', label: 'Flag', icon: 'Flag' },
]

export const Sidebar = ({ activeNav, onNavChange }) => {
  return (
    <aside className="border-separator flex h-full min-h-0 flex-col gap-6 overflow-clip border-r px-4 pb-6 pt-4">
      {/* User profile */}
      <div className="flex items-center gap-3 px-1 py-2">
        <Avatar>
          <Avatar.Image alt="Calvin Rice" src="/devs.svg" />
          <Avatar.Fallback>CR</Avatar.Fallback>
        </Avatar>
        <div className="flex min-w-0 flex-col">
          <span className="text-foreground text-lg font-medium leading-tight">
            𝐃𝐄𝐕𝐒
          </span>
        </div>
      </div>

      {/* Navigation */}
      <ScrollShadow hideScrollBar className="min-h-0 flex-1 overflow-y-auto">
        <ListBox
          aria-label="Mail navigation"
          selectionMode="single"
          selectedKeys={new Set([activeNav])}
          onSelectionChange={(keys) => {
            const selected = [...keys][0]
            if (selected) onNavChange(selected)
          }}
        >
          {navItems.map((item) => (
            <ListBox.Item
              key={item.id}
              id={item.id}
              textValue={item.label}
              className="group flex min-h-9 items-center gap-3 px-3 py-1.5 data-[selected=true]:bg-default"
            >
              <Icon name={item.icon} />
              <span className="flex-1 text-left text-sm font-medium">
                {item.label}
              </span>
              {item.count && (
                <Chip color="accent" size="sm" variant="soft">
                  {item.count}
                </Chip>
              )}
            </ListBox.Item>
          ))}
        </ListBox>
        <Separator className="my-1" />
        <Button variant="ghost" size="sm" fullWidth className="justify-start">
          <Icon name="ChevronDown" />
          <span className="flex-1 text-left">More</span>
        </Button>
      </ScrollShadow>

      {/* Compose button */}
      <Tooltip delay={0}>
        <Button fullWidth className="mt-auto" variant="primary">
          <Icon name="Compose" />
          New Email
        </Button>
        <Tooltip.Content>
          <p>This is a tooltip</p>
        </Tooltip.Content>
      </Tooltip>
    </aside>
  )
}
