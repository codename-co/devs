import { addToast } from '@heroui/react'

export const errorToast = (
  title: string,
  description?: string | Error | unknown,
) => {
  addToast({
    title,
    description:
      description instanceof Error ? description.message : String(description),
    color: 'danger',
    severity: 'danger',
  })
}

export const warningToast = (title: string, description?: string) => {
  addToast({
    title,
    description,
    color: 'warning',
    severity: 'warning',
  })
}

export const successToast = (title: string, description?: string) => {
  addToast({
    title,
    description,
    color: 'success',
    severity: 'success',
  })
}
