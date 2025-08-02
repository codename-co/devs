import { addToast } from '@heroui/react'

export const errorToast = (title: string, description?: string) => {
  addToast({
    title,
    description,
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
