import { memo } from 'react'
import { Icon } from './Icon'

// Memoized Devs icons to prevent unnecessary re-renders
// These are shared across the application

export const DevsIcon = memo(() => (
  <Icon
    size="4xl"
    name="DevsAnimated"
    animation="appear"
    className="mb-4 sm:my-6 text-blue-300 dark:text-white"
  />
))
DevsIcon.displayName = 'DevsIcon'

export const DevsIconSmall = memo(() => (
  <Icon name="Devs" size="sm" color="grey" />
))
DevsIconSmall.displayName = 'DevsIconSmall'

export const DevsIconXL = memo(() => <Icon name="DevsAnimated" size="xl" />)
DevsIconXL.displayName = 'DevsIconXL'
