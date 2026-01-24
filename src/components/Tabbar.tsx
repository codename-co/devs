import { Tab, Tabs, Tooltip } from '@heroui/react'
import { Icon } from './Icon'
import { useI18n } from '@/i18n'
import { currentBasePath } from '@/lib/utils'

export const Tabbar = ({ className = '' }) => {
  const { t, url } = useI18n()

  return (
    <Tabs
      placement="bottom"
      size="lg"
      variant="underlined"
      // color="primary"
      selectedKey={currentBasePath()}
      className={`flex w-full justify-center fixed bottom-0 z-20 backdrop-blur-xs backdrop-brightness-120 border-t-1 border-default-200 dark:border-default-400 bg-white/80 dark:bg-default-50/80 ${className}`}
      classNames={{
        tab: [
          'py-6 px-[4vw]',
          // first tab should be red, second tab should be blue, third tab should be green
          // 'data-[color=primary]:*:*:text-primary-800',
          // 'data-[color=secondary]:*:*:text-secondary-500',
          // 'data-[color=danger]:*:*:text-danger-500',
          // 'data-[color=success]:*:*:text-success-500',
          // 'data-[color=warning]:*:*:text-warning-500',
          // 'bg-white/80 dark:bg-default-50/80',
          // 'data-[hover=true]:border-2 data-[hover=true]:border-red-500',
          'data-[selected=true]:zoom-in data-[selected=true]:scale-120 *:*bg-transparent',
        ],
      }}
    >
      <Tab
        key="/agents"
        // data-color="warning"
        title={
          <Tooltip content={t('Agents')} placement="top">
            <Icon name="Sparks" />
          </Tooltip>
        }
        // className="bg-amber-500"
        href={url('/agents')}
      />
      <Tab
        key="/studio"
        // data-color="danger"
        title={
          <Tooltip content={t('Studio')} placement="top">
            <Icon name="MediaImagePlus" />
          </Tooltip>
        }
        href={url('/studio')}
      />
      <Tab
        key="/"
        // data-color="primary"
        title={
          <Tooltip content={t('New chat')} placement="top">
            <Icon name="ChatPlusIn" size="lg" />
          </Tooltip>
        }
        href={url('')}
        className="zoom-in scale-125"
      />
      <Tab
        key="/tasks"
        // data-color="secondary"
        title={
          <Tooltip content={t('Tasks')} placement="top">
            <Icon name="TriangleFlagTwoStripes" />
          </Tooltip>
        }
        href={url('/tasks')}
      />
      <Tab
        key="/live"
        // data-color="cyan"
        title={
          <Tooltip content={t('Live')} placement="top">
            <Icon name="Voice" />
          </Tooltip>
        }
        href={url('/live')}
      />
    </Tabs>
  )
}
