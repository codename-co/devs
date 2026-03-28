import { Tab, Tabs, Tooltip } from '@/components/heroui-compat'
import { Icon } from './Icon'
import { useI18n } from '@/i18n'
import { currentBasePath } from '@/lib/utils'
import { useNavigate, useLocation } from 'react-router-dom'
import { useSearchStore } from '@/features/search/searchStore'

export const Tabbar = ({ className = '' }) => {
  const { t, url } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()

  const openSettings = () => {
    navigate(`${location.pathname}#settings`, { replace: true })
  }

  const openSearch = () => {
    useSearchStore.getState().open()
  }

  const handleSelectionChange = (key: React.Key) => {
    if (key === '/settings') {
      openSettings()
    } else if (key === '/search') {
      openSearch()
    }
  }

  return (
    <Tabs
      placement="bottom"
      size="lg"
      variant="primary"
      // color="primary"
      selectedKey={currentBasePath()}
      onSelectionChange={handleSelectionChange}
      className={`flex w-full fixed bottom-0 z-20 backdrop-blur-xs backdrop-brightness-120 border-t-1 border-default-200 dark:border-default-400 bg-white/80 dark:bg-default-50/80 ${className}`}
      classNames={{
        tabList: 'flex w-full justify-around',
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
        key="/settings"
        // data-color="gray"
        title={
          <Tooltip content={t('Settings')} placement="top">
            <Icon name="Settings" />
          </Tooltip>
        }
      />
      <Tab
        key="/search"
        // data-color="gray"
        title={
          <Tooltip content={t('Search')} placement="top">
            <Icon name="Search" />
          </Tooltip>
        }
        // className="bg-amber-500"
      />
      <Tab
        key="/"
        // data-color="primary"
        title={
          <Tooltip content={t('New Task')} placement="top">
            <Icon name="PlusCircleSolid" size="lg" />
          </Tooltip>
        }
        href={url('')}
        className="zoom-in scale-125"
      />
      <Tab
        key="/history"
        // data-color="secondary"
        title={
          <Tooltip content={t('History')} placement="top">
            <Icon name="ClockRotateRight" />
          </Tooltip>
        }
        href={url('/history')}
      />
      <Tab
        key="/marketplace"
        // data-color="warning"
        title={
          <Tooltip content={t('Marketplace')} placement="top">
            <Icon name="HexagonPlus" />
          </Tooltip>
        }
        href={url('/marketplace')}
      />
    </Tabs>
  )
}
