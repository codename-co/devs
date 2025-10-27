import { Tab, Tabs, Tooltip } from '@heroui/react'
import { Icon } from './Icon'
import { useI18n } from '@/i18n'
import { currentBasePath } from '@/lib/utils'

export const Tabbar = () => {
  const { t, url } = useI18n()

  console.log(JSON.stringify(currentBasePath()))

  return (
    <Tabs
      placement="bottom"
      size="lg"
      variant="light"
      // color="primary"
      selectedKey={currentBasePath()}
      className="fixed bottom-0 self-center z-1 backdrop-blur-xs backdrop-brightness-120 rounded-lg md:hidden"
      classNames={{
        // tab: 'p-6',
        tab: [
          'py-6 px-[4vw]',
          // first tab should be red, second tab should be blue, third tab should be green
          'data-[color=primary]:*:*:text-primary-500',
          'data-[color=secondary]:*:*:text-secondary-500',
          'data-[color=danger]:*:*:text-danger-500',
          'data-[color=success]:*:*:text-success-500',
          'data-[color=warning]:*:*:text-warning-500',
          // 'bg-white/80 dark:bg-default-50/80',
          // 'data-[hover=true]:border-2 data-[hover=true]:border-red-500',
          'data-[selected=true]:zoom-in data-[selected=true]:scale-120 *:*bg-transparent',
        ],
      }}
    >
      <Tab
        key="/agents"
        data-color="warning"
        title={
          <Tooltip content={t('Agents')} placement="top">
            <Icon name="Sparks" />
          </Tooltip>
        }
        // className="bg-amber-500"
        href={url('/agents')}
      />
      <Tab
        key="/knowledge"
        data-color="danger"
        title={
          <Tooltip content={t('Knowledge')} placement="top">
            <Icon name="Brain" />
          </Tooltip>
        }
        href={url('/knowledge')}
      />
      <Tab
        key="/"
        data-color="primary"
        title={
          <Tooltip content={t('New chat')} placement="top">
            <Icon name="ChatPlusIn" />
          </Tooltip>
        }
        href={url('')}
        className="zoom-in scale-125"
      />
      <Tab
        key="/methodologies"
        data-color="success"
        title={
          <Tooltip content={t('Methodologies')} placement="top">
            <Icon name="Strategy" />
          </Tooltip>
        }
        href={url('/methodologies')}
      />
      <Tab
        key="/tasks"
        data-color="secondary"
        title={
          <Tooltip content={t('Tasks')} placement="top">
            <Icon name="TriangleFlagTwoStripes" />
          </Tooltip>
        }
        href={url('/tasks')}
      />
    </Tabs>
  )
}
