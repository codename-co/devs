import prettyBytes from 'pretty-bytes'

import { defaultLang, type Lang } from '@/i18n'

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number, lang?: Lang): string {
  return prettyBytes(bytes, { locale: lang ?? defaultLang })
}

/**
 * Format time duration in seconds to human-readable string
 */
export function formatDuration(duration: number, lang?: Lang): string {
  const days = Math.floor(duration / 86400)
  const hours = Math.floor(duration / 3600) - days * 24
  const minutes = Math.floor((duration % 3600) / 60) // - days * 24 * 60 - hours * 60
  const seconds = duration % 60

  console.log({ days, hours, minutes, seconds })

  // @ts-ignore
  return new Intl.DurationFormat(lang ?? defaultLang, {
    notation: 'short',
  }).format({ days, hours, minutes, seconds })
}

/**
 * Format a timestamp as a relative time string (e.g., "2 hours ago", "yesterday")
 * Uses the nearest appropriate unit for human-readable output
 */
export function formatTimeAgo(date: Date, lang?: Lang): string {
  const now = Date.now()
  const diffInSeconds = Math.floor((now - date.getTime()) / 1000)

  const rtf = new Intl.RelativeTimeFormat(lang ?? defaultLang, {
    numeric: 'auto',
    style: 'long',
  })

  // Define time units in descending order with their thresholds in seconds
  const units: { unit: Intl.RelativeTimeFormatUnit; seconds: number }[] = [
    { unit: 'year', seconds: 31536000 }, // 365 days
    { unit: 'month', seconds: 2592000 }, // 30 days
    { unit: 'week', seconds: 604800 }, // 7 days
    { unit: 'day', seconds: 86400 }, // 24 hours
    { unit: 'hour', seconds: 3600 }, // 60 minutes
    { unit: 'minute', seconds: 60 },
    { unit: 'second', seconds: 1 },
  ]

  // Find the nearest unit based on the time difference
  for (const { unit, seconds } of units) {
    if (Math.abs(diffInSeconds) >= seconds) {
      const value = Math.round(diffInSeconds / seconds)
      return rtf.format(-value, unit)
    }
  }

  return rtf.format(0, 'second')
}

/**
 * Format a conversation date:
 * - Less than 7 days: show the day name (e.g., "Monday")
 * - 1 week to 1 month: show weeks ago (e.g., "2 weeks ago")
 * - 1 month or more: show months ago (e.g., "3 months ago")
 */
export function formatConversationDate(date: Date, lang?: Lang): string {
  // Handle invalid or missing dates
  const dateObj = date instanceof Date ? date : new Date(date)
  const timestamp = dateObj.getTime()

  if (!Number.isFinite(timestamp)) {
    return '' // Return empty string for invalid dates
  }

  const now = Date.now()
  const diffInMs = now - timestamp
  const diffInDays = diffInMs / (1000 * 60 * 60 * 24)

  const rtf = new Intl.RelativeTimeFormat(lang ?? defaultLang, {
    numeric: 'auto',
    style: 'long',
  })

  // Less than 7 days: show the day name
  if (diffInDays < 7) {
    // For today/yesterday, use relative format
    if (diffInDays < 1) {
      return rtf.format(0, 'day') // "today"
    }
    if (diffInDays < 2) {
      return rtf.format(-1, 'day') // "yesterday"
    }
    // Show day name for 2-6 days ago
    return new Intl.DateTimeFormat(lang ?? defaultLang, {
      weekday: 'long',
    }).format(dateObj)
  }

  // 7 days to ~30 days: show weeks ago
  if (diffInDays < 30) {
    const weeks = Math.round(diffInDays / 7)
    return rtf.format(-weeks, 'week')
  }

  // 30 days or more: show months ago
  const months = Math.round(diffInDays / 30)
  return rtf.format(-months, 'month')
}

/**
 * Format a date as a localized date string
 */
export function formatDate(date: Date, lang?: Lang): string {
  return new Intl.DateTimeFormat(lang ?? defaultLang, {
    dateStyle: 'medium',
  }).format(date)
}
