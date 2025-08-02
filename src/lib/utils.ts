import { type ClassValue, clsx } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
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
