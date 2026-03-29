import { toast as heroToast } from '@heroui/react'
import type { ReactNode } from 'react'

// v2 toast API: toast({ title, color, description, hideCloseButton, ... })
interface V2ToastOptions {
  title?: ReactNode
  description?: ReactNode
  color?: string
  variant?: string
  hideCloseButton?: boolean
  [key: string]: unknown
}

/**
 * v2-compatible toast wrapper.
 * Accepts both v2 object syntax and v3 positional syntax.
 */
export function toast(messageOrOptions: ReactNode | V2ToastOptions, options?: Record<string, unknown>): string | void {
  // v2 pattern: toast({ title: "...", color: "..." })
  if (messageOrOptions !== null && typeof messageOrOptions === 'object' && !Array.isArray(messageOrOptions) && 'title' in messageOrOptions) {
    const { title, color, variant: v, description, hideCloseButton: _h, ...rest } = messageOrOptions as V2ToastOptions
    const colorMap: Record<string, string> = {
      success: 'success', danger: 'danger', warning: 'warning',
      primary: 'accent', secondary: 'default', default: 'default',
    }
    const mappedVariant = v || (color ? colorMap[color as string] || 'default' : undefined)
    return heroToast(title ?? '', {
      description: description as ReactNode,
      variant: mappedVariant as any,
      ...rest,
    })
  }
  // v3 pattern: toast("message", { variant: "..." })
  return heroToast(messageOrOptions as ReactNode, options as any)
}

// Proxy convenience methods
toast.success = heroToast.success
toast.danger = heroToast.danger
toast.info = heroToast.info
toast.warning = heroToast.warning
toast.promise = heroToast.promise
toast.getQueue = heroToast.getQueue
toast.close = heroToast.close
toast.pauseAll = heroToast.pauseAll
toast.resumeAll = heroToast.resumeAll
toast.clear = heroToast.clear
