import { Icon } from '@/components'
import {
  Avatar,
  Button,
  ListBox,
  ScrollShadow,
  SearchField,
} from '@heroui/react_3'
import { useState } from 'react'
import { Sidebar } from './components'
import { useTasks } from '@/hooks'
import { IconName } from '@/lib/types'

export const V2Page = () => {
  const [activeNav, setActiveNav] = useState('Inbox')
  const [selectedEmail, setSelectedEmail] = useState('2')

  const currentEmail = threads.find((e) => e.id === selectedEmail)

  return (
    <div
      className="bg-background grid h-screen grid-cols-[minmax(180px,224px)_minmax(280px,360px)_minmax(400px,1fr)] overflow-hidden"
      style={{ gridAutoFlow: 'column' }}
    >
      <Sidebar activeNav={activeNav} onNavChange={setActiveNav} />
      <Threads selectedEmail={selectedEmail} onSelectEmail={setSelectedEmail} />
      <EmailDetail email={currentEmail} />
    </div>
  )
}

const threads = [
  {
    id: '1',
    name: 'Michael Curry',
    avatar:
      'https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/blue-light.jpg',
    subject: 'Flash Sale for 48 Hours Only',
    preview: "Hi Calvin, I'm excited to share that we're running a flash sale",
    time: '10:21 AM',
    unread: true,
    starred: false,
  },
  {
    id: '2',
    name: 'Sarah Johnson',
    avatar:
      'https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/sky.jpg',
    subject: 'New Product Launch Announcement',
    preview:
      "Hello Team, I'm thrilled to announce the launch of our new product next week!",
    time: '9:15 AM',
    unread: false,
    starred: false,
  },
]

function Threads({ selectedEmail, onSelectEmail }) {
  const tasks = useTasks()

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-clip px-4 pb-6 pt-4">
      {/* Search */}
      <SearchField name="mail-search" variant="primary">
        <SearchField.Group>
          <SearchField.SearchIcon />
          <SearchField.Input placeholder="Search..." />
          <SearchField.ClearButton />
        </SearchField.Group>
      </SearchField>

      {/* Task items */}
      <ScrollShadow hideScrollBar className="flex-1 overflow-y-auto">
        <ListBox
          aria-label="Task list"
          selectionMode="single"
          selectedKeys={new Set([selectedEmail])}
          onSelectionChange={(keys) => {
            const selected = [...keys][0]
            if (selected) onSelectEmail(selected)
          }}
        >
          {tasks.map((task) => (
            <ListBox.Item
              key={task.id}
              id={task.id}
              textValue={task.title}
              className="relative flex items-start gap-3 rounded-2xl p-3 data-[selected=true]:bg-surface data-[selected=true]:shadow-sm"
            >
              <Avatar className="size-9 shrink-0">
                <Avatar.Image
                  alt={task.assignedAgentId}
                  src={task.assignedAgentId}
                />
                <Avatar.Fallback>
                  {task.title
                    .split(' ')
                    .map((n) => n[0])
                    .join('')}
                </Avatar.Fallback>
              </Avatar>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-sm leading-tight ${task.unread ? 'text-foreground font-medium' : 'text-foreground'}`}
                  >
                    {task.title}
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`whitespace-nowrap text-xs leading-tight ${task.unread ? 'text-foreground font-medium' : 'text-muted'}`}
                    >
                      {task.time}
                    </span>
                    {task.unread && (
                      <span className="bg-accent size-1.5 shrink-0 rounded-full" />
                    )}
                  </div>
                </div>
                <span
                  className={`truncate text-xs leading-tight ${task.unread ? 'text-foreground font-medium' : 'text-muted'}`}
                >
                  {task.subject}
                </span>
                <span className="text-muted truncate pr-8 text-xs leading-tight">
                  {task.description}
                </span>
                <div className="absolute bottom-3 right-3">
                  {task.starred ? (
                    <Icon name="StarSolid" color="orange" />
                  ) : (
                    <Icon name="Star" />
                  )}
                </div>
              </div>
            </ListBox.Item>
          ))}
        </ListBox>
      </ScrollShadow>
    </div>
  )
}

const CTA = ({ icon }: { icon: IconName }) => (
  <Button
    isIconOnly
    size="sm"
    variant="ghost"
    className="text-muted hover:text-foreground"
  >
    <Icon name={icon} />
  </Button>
)

function EmailDetail({ email }) {
  if (!email) return null

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-clip py-4 pl-0.5 pr-4">
      <div className="surface bg-surface flex max-h-full flex-1 flex-col gap-6 overflow-clip rounded-2xl p-4 shadow-sm">
        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Icon name="SidebarCollapse" size="md" color="grey" />

            <div className="flex items-center">
              <CTA icon="Trash" />
              <CTA icon="Archive" />
              <CTA icon="MoreVert" />
            </div>
          </div>
          <div className="flex items-center gap-4 px-2">
            <span className="text-muted text-xs">2 of 831</span>
            <div className="flex items-center">
              <Button
                isIconOnly
                size="sm"
                variant="ghost"
                className="text-muted hover:text-foreground"
              >
                <Icon name="ArrowLeft" />
              </Button>
              <Button
                isIconOnly
                size="sm"
                variant="ghost"
                className="text-muted hover:text-foreground"
              >
                <Icon name="ArrowRight" />
              </Button>
            </div>
          </div>
        </div>

        {/* Email content */}
        <ScrollShadow hideScrollBar className="flex-1 overflow-y-auto px-6">
          <div className="flex flex-col gap-8 pb-5">
            <div className="flex flex-col gap-3">
              <h1 className="text-foreground truncate text-base font-semibold leading-normal">
                {email.subject}
              </h1>
              <div className="flex items-start justify-between">
                <div className="flex gap-3">
                  <Avatar className="size-9 shrink-0">
                    <Avatar.Image alt={email.name} src={email.avatar} />
                    <Avatar.Fallback>
                      {email.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
                    </Avatar.Fallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-foreground text-sm font-medium leading-tight">
                      {email.name}
                    </span>
                    <span className="text-muted text-xs font-medium leading-tight">
                      {email.name.toLowerCase().replace(' ', '.')}
                      @email.com
                    </span>
                    <div className="text-muted flex items-center gap-0.5 text-xs font-medium leading-tight">
                      <p>to me</p>
                      <Icon name="CaretDown" />
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 px-2">
                  <span className="text-muted whitespace-nowrap text-xs">
                    Today, {email.time}
                  </span>
                  <div className="flex items-center">
                    <Button
                      isIconOnly
                      variant="ghost"
                      className="text-muted hover:text-foreground"
                    >
                      <Icon name="Reply" />
                    </Button>
                    <Button
                      isIconOnly
                      variant="ghost"
                      className="text-muted hover:text-foreground"
                    >
                      <Icon name="ReplyAll" />
                    </Button>
                    <Button
                      isIconOnly
                      variant="ghost"
                      className="text-muted hover:text-foreground"
                    >
                      <Icon name="More" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-foreground whitespace-pre-wrap text-sm leading-relaxed">
              {`Hello Team, I'm thrilled to announce the launch of our new product next week, and I couldn't be more excited to share this milestone with all of you. Over the past weeks and months, an incredible amount of work has gone into bringing this product to life. From early ideas and strategy sessions to design, development, testing, and refinement, this launch represents the collective effort, dedication, and talent of everyone involved. Each team has played a critical role, and this achievement truly belongs to all of us. This product is more than just a release\u2014it's a major step forward for our vision and a strong statement about the value we aim to deliver to our users. It addresses real needs, reflects our commitment to quality, and sets a new standard for what we want to build moving forward. In preparation for the launch, please make sure you are familiar with the product's core features, value proposition, and key messaging. Over the next few days, we'll be sharing additional details, including: \u2022 The official launch date and timeline \u2022 Internal demos and walkthroughs \u2022 Go-to-market messaging and FAQs \u2022 Support and escalation processes Your alignment and enthusiasm will be essential to ensure a smooth and successful launch, both internally and externally. I want to personally thank each of you for the hard work, late nights, thoughtful discussions, and problem-solving that made this possible. Launches like this don't happen without strong teamwork, and this one is a testament to what we can accomplish together. Let's take a moment to celebrate this achievement\u2014and then get ready to make a strong impact next week. More updates coming very soon. Thank you all,`}
            </div>
          </div>
        </ScrollShadow>
      </div>
    </div>
  )
}
