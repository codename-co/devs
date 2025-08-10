import { addToast } from '@heroui/react'
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
  })
}

export const errorToast = (
  title: string | JSX.Element,
  description?: string | Error | unknown,
) => {
  toast(title, description, 'danger')
}

export const warningToast = (
  title: string | JSX.Element,
  description?: string | Error | unknown,
) => {
  toast(title, description, 'warning')
}

export const successToast = (
  title: string | JSX.Element,
  description?: string | Error | unknown,
) => {
  toast(title, description, 'success')
}
