import { memo } from 'react'
import { Icon } from './Icon'

// Memoized Devs icons to prevent unnecessary re-renders
// These are shared across the application

export const DevsIcon = memo(() => (
  <Icon
    size="5xl"
    name="Devs"
    animation="appear"
    className="text-gray-400 dark:text-white"
  />
))
DevsIcon.displayName = 'DevsIcon'

export const DevsIconSmall = memo(() => (
  <Icon name="Devs" size="sm" color="grey" />
))
DevsIconSmall.displayName = 'DevsIconSmall'

export const DevsIconXL = memo(() => <Icon name="DevsAnimated" size="xl" />)
DevsIconXL.displayName = 'DevsIconXL'
