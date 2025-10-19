import { addToast, ToastProps } from '@heroui/react'
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
  config?: Partial<ToastProps>,
) => {
  addToast({
    title,
    description: !description
      ? undefined
      : description instanceof Error
        ? description.message
        : String(description),
    color: severity,
    severity,
    ...config,
  })
}

export const errorToast = (
  title: string | JSX.Element,
  description?: string | Error | unknown,
  config?: Partial<ToastProps>,
) => {
  toast(title, description, 'danger', config)
}

export const warningToast = (
  title: string | JSX.Element,
  description?: string | Error | unknown,
  config?: Partial<ToastProps>,
) => {
  toast(title, description, 'warning', config)
}

export const successToast = (
  title: string | JSX.Element,
  description?: string | Error | unknown,
  config?: Partial<ToastProps>,
) => {
  toast(title, description, 'success', config)
}

export const infoToast = (
  title: string | JSX.Element,
  description?: string | Error | unknown,
  config?: Partial<ToastProps>,
) => {
  toast(title, description, 'default', config)
}
