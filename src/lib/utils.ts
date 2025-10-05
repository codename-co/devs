import { type ClassValue, clsx } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'MediaImage'
  if (mimeType.startsWith('video/')) return 'MediaVideo'
  if (mimeType.startsWith('audio/')) return 'MediaAudio'
  if (mimeType.includes('pdf')) return 'Page'
  if (mimeType.includes('text/') || mimeType.includes('json')) return 'Page'
  if (mimeType.includes('zip') || mimeType.includes('tar')) return 'Archive'
  return 'Page'
}
