import { marked } from 'marked'
import { createElement, Fragment } from 'react'
import { Link } from 'react-router-dom'

import { defaultLang, languages, locales } from './locales'

export type Lang = keyof typeof languages

export const langs = Object.keys(languages).map(
  (lang) => (lang === defaultLang ? '' : lang) as Lang,
)

export const getLangFromUrl = (url: URL) => {
  const [, lang] = url.pathname.split('/')

  try {
    if (lang in locales) return lang as keyof typeof locales
  } catch {}

  return defaultLang
}

/**
 * Parses markdown-style links [text](url) and converts them to React Router Link components
 * @param text - The text containing markdown links
 * @returns React elements with Link components for internal routes and anchor tags for external URLs
 */
const parseMarkdownLinks = (text: string) => {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
  const parts = []
  let lastIndex = 0
  let match

  while ((match = linkRegex.exec(text)) !== null) {
    const [fullMatch, linkText, url] = match
    const startIndex = match.index

    // Add text before the link
    if (startIndex > lastIndex) {
      parts.push(text.slice(lastIndex, startIndex))
    }

    // Determine if it's an internal or external link
    const isInternal =
      url.startsWith('/') ||
      (!url.includes('://') && !url.startsWith('mailto:'))

    const className = 'underline text-blue-600 hover:text-blue-800'
    if (isInternal) {
      parts.push(
        createElement(Link, { key: startIndex, to: url, className }, linkText),
      )
    } else {
      parts.push(
        createElement(
          'a',
          {
            key: startIndex,
            href: url,
            target: '_blank',
            className,
            rel: 'noopener noreferrer',
          },
          linkText,
        ),
      )
    }

    lastIndex = startIndex + fullMatch.length
  }

  // Add remaining text after the last link
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  // If no links were found, return the original text
  if (parts.length === 0) {
    return text
  }

  // If there's only one element and it's a string, return it directly
  if (parts.length === 1 && typeof parts[0] === 'string') {
    return parts[0]
  }

  // Return a Fragment containing all parts
  return createElement(Fragment, {}, ...parts)
}

export const useTranslations = <MoreLocales>(
  lang: Lang = defaultLang,
  moreLocales?: Record<string, MoreLocales extends string ? string : never>,
) => {
  function t(
    key:
      | (typeof moreLocales extends Record<string, any>
          ? keyof typeof moreLocales
          : never)
      | keyof (typeof locales)[typeof defaultLang],
    vars?: Record<string, any>,
    options?: { allowJSX?: boolean },
  ) {
    let tmpl =
      locales[lang]?.[key] ??
      moreLocales?.[key] ??
      locales[defaultLang][key] ??
      key

    for (const v in vars) {
      tmpl = tmpl.replaceAll(`{${v}}`, vars[v])
    }

    // Check if JSX is allowed and template contains markdown links
    if (options?.allowJSX && tmpl.includes('[') && tmpl.includes('](')) {
      return parseMarkdownLinks(tmpl) as string
    }

    // For plain text, strip out markdown link syntax if present
    if (tmpl.includes('[') && tmpl.includes('](')) {
      tmpl = tmpl.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    }

    // Fall back to original marked parsing for other markdown
    const html = marked.parseInline(tmpl) as string
    return html
  }

  return t
}

export const useUrl = (lang: Lang = defaultLang) => {
  // return template string
  return function url(path: string) {
    return `/${lang === defaultLang ? '/' : lang}${path}`.replace(/^\/+/g, '/')
  }
}

export const countryCode = (lang: Lang): Lang | string => {
  switch (lang) {
    case 'en':
      return 'gb'
    default:
      return lang
  }
}

export const textDirection = (lang: Lang) => {
  switch (lang) {
    // case 'ar':
    //   // case "fa":
    //   // case "he":
    //   return 'rtl'
    default:
      return 'ltr'
  }
}
