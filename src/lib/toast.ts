import { toast as heroToast } from '@/components/heroui-compat'
import type { HeroUIToastOptions } from '@/components/heroui-compat'
import { JSX } from 'react'

const toast = (
  title: string | JSX.Element,
  description?: string | Error | unknown,
  severity?:
    | 'success'
    | 'warning'
    | 'danger'
    | 'default'
    | 'primary'
    | 'secondary',
  config?: Partial<HeroUIToastOptions>,
) => {
  const variant = severity === 'primary' || severity === 'secondary' ? 'default' : severity
  heroToast(title, {
    description: !description
      ? undefined
      : description instanceof Error
        ? description.message
        : String(description),
    variant: variant as HeroUIToastOptions['variant'],
    ...config,
  })
}

export const errorToast = (
  title: string | JSX.Element,
  description?: string | Error | unknown,
  config?: Partial<HeroUIToastOptions>,
) => {
  toast(title, description, 'danger', config)
}

export const warningToast = (
  title: string | JSX.Element,
  description?: string | Error | unknown,
  config?: Partial<HeroUIToastOptions>,
) => {
  toast(title, description, 'warning', config)
}

export const successToast = (
  title: string | JSX.Element,
  description?: string | Error | unknown,
  config?: Partial<HeroUIToastOptions>,
) => {
  toast(title, description, 'success', config)
}

export const infoToast = (
  title: string | JSX.Element,
  description?: string | Error | unknown,
  config?: Partial<HeroUIToastOptions>,
) => {
  toast(title, description, 'default', config)
}
