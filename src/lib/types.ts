import { Icons } from '@/components'

export type IconName = keyof typeof Icons

export interface HeaderProps {
  color?: string
  icon?: {
    name: IconName
    color?: string
    image?: string // Base64-encoded image that supersedes icon when present
    isEditable?: boolean
    onEdit?: () => void
  }
  title?: string | React.ReactNode
  subtitle?: string | React.ReactNode
  cta?: {
    label: string
    href: string
    icon?: IconName
  }
  moreActions?: {
    label: string
    onClick: () => void | Promise<void>
    icon?: IconName
  }[]
}

declare global {
  interface Navigator {
    /**
     * The deviceMemory read-only property of the Navigator interface returns the approximate amount of device memory in gigabytes.
     * It's approximated by rounding down to the nearest power of 2, then dividing that number by 1024. It is then clamped within lower and upper bounds to protect the privacy of owners of very low-memory or high-memory devices.
     *
     * @returns The amount of device memory in gigabytes, rounded down to the nearest power of 2, and clamped within lower and upper bounds.
     * @see https://developer.mozilla.org/en-US/docs/Web/API/Navigator/deviceMemory
     * @remarks
     * Browser Compatibility:
     * - Chrome: 63+
     * - Edge: 79+
     * - Firefox: Not supported
     * - Opera: 50+
     * - Safari: Not supported
     * - Chrome Android: 63+
     * - Safari on iOS: Not supported
     */
    deviceMemory?: 0.25 | 0.5 | 1 | 2 | 4 | 8
  }
}
