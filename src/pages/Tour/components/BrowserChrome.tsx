import { useI18n } from '@/i18n'
import { ReactNode } from 'react'
import tourI18n from '../i18n'
import { color_devs } from '../utils'

// ── Browser chrome ────────────────────────────────────────────────────────
interface BrowserChromeProps {
  width?: number
  height?: number
  x?: number
  y?: number
  url?: string
  dark?: boolean
  children?: ReactNode
  scale?: number
  opacity?: number
  ty?: number
}

export function BrowserChrome({
  width = 1400,
  height = 860,
  x = 260,
  y = 110,
  url = 'devs.new',
  dark = false,
  children,
  scale = 1,
  opacity = 1,
  ty = 0,
}: BrowserChromeProps) {
  const { t } = useI18n(tourI18n)
  const bg = dark ? '#0c0d10' : '#f4f7f9'
  const chrome = dark ? '#17191e' : '#e9ecef'
  const border = dark ? '#24262b' : '#d7dbe0'
  const fg = dark ? '#e9ecef' : '#1a1d22'
  const urlBg = dark ? '#0f1115' : '#ffffff'
  const urlFg = dark ? '#d7dbe0' : '#363a41'

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width,
        height,
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 16,
        overflow: 'hidden',
        transform: `translateY(${ty}px) scale(${scale})`,
        transformOrigin: 'center',
        opacity,
        boxShadow: dark
          ? '0 30px 80px rgba(0,0,0,0.6), 0 6px 20px rgba(0,0,0,0.4)'
          : '0 30px 80px rgba(15,25,50,0.15), 0 6px 20px rgba(15,25,50,0.08)',
        willChange: 'transform, opacity',
      }}
    >
      <div
        style={{
          height: 54,
          background: chrome,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '0 16px',
          borderBottom: `1px solid ${border}`,
        }}
      >
        <TrafficLights />
        <div
          style={{
            marginLeft: 12,
            padding: '6px 14px 6px 12px',
            background: urlBg,
            border: `1px solid ${border}`,
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontFamily: 'Figtree, system-ui, sans-serif',
            fontSize: 13,
            color: urlFg,
            minWidth: 160,
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              background: color_devs(),
            }}
          />
          <span>{t('DEVS')}</span>
        </div>
        <div
          style={{
            flex: 1,
            marginLeft: 12,
            height: 32,
            background: urlBg,
            border: `1px solid ${border}`,
            borderRadius: 16,
            display: 'flex',
            alignItems: 'center',
            padding: '0 14px',
            fontFamily: "'Geist', ui-monospace, monospace",
            fontSize: 13,
            color: urlFg,
            letterSpacing: '0.01em',
          }}
        >
          <span style={{ opacity: 0.5, marginRight: 8, fontSize: 11 }}>▾</span>
          <span>{url}</span>
        </div>
      </div>
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: 'calc(100% - 54px)',
          color: fg,
        }}
      >
        {children}
      </div>
    </div>
  )
}

function TrafficLights() {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {['#ff5f57', '#febc2e', '#28c840'].map((bg) => (
        <span
          key={bg}
          style={{ width: 12, height: 12, borderRadius: 6, background: bg }}
        />
      ))}
    </div>
  )
}

// ── Typed URL (animated caret) ────────────────────────────────────────────
interface TypedUrlProps {
  text: string
  progress: number
  fontSize?: number
  color?: string
}

export function TypedUrl({
  text,
  progress,
  fontSize = 13,
  color = '#363a41',
}: TypedUrlProps) {
  const shown = Math.floor(text.length * progress)
  const showCaret = progress < 1
  return (
    <span
      style={{
        fontFamily: "'Geist', ui-monospace, monospace",
        fontSize,
        color,
        letterSpacing: '0.01em',
      }}
    >
      {text.slice(0, shown)}
      {showCaret && (
        <span
          style={{
            display: 'inline-block',
            width: 1.5,
            height: fontSize * 1.1,
            marginLeft: 2,
            background: 'oklch(62.04% 0.195 253.83)',
            verticalAlign: 'text-bottom',
            animation: 'devs-caret 0.9s steps(1) infinite',
          }}
        />
      )}
    </span>
  )
}

// ── BrowserChromeTyping (URL being typed) ─────────────────────────────────
interface BrowserChromeTypingProps {
  width?: number
  height?: number
  x?: number
  y?: number
  urlText?: string
  urlProgress?: number
  dark?: boolean
  children?: ReactNode
  scale?: number
  opacity?: number
  ty?: number
  tabTitle?: string | false
}

export function BrowserChromeTyping({
  width = 1400,
  height = 860,
  x = 260,
  y = 110,
  urlText = 'devs.new',
  urlProgress = 1,
  dark = false,
  children,
  scale = 1,
  opacity = 1,
  ty = 0,
  tabTitle = 'New Tab',
}: BrowserChromeTypingProps) {
  const bg = dark ? '#0c0d10' : '#f4f7f9'
  const chrome = dark ? '#17191e' : '#e9ecef'
  const border = dark ? '#24262b' : '#d7dbe0'
  const fg = dark ? '#e9ecef' : '#1a1d22'
  const urlBg = dark ? '#0f1115' : '#ffffff'
  const urlFg = dark ? '#d7dbe0' : '#363a41'

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width,
        height,
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 16,
        overflow: 'hidden',
        transform: `translateY(${ty}px) scale(${scale})`,
        transformOrigin: 'center',
        opacity,
        boxShadow: dark
          ? '0 30px 80px rgba(0,0,0,0.6), 0 6px 20px rgba(0,0,0,0.4)'
          : '0 30px 80px rgba(15,25,50,0.15), 0 6px 20px rgba(15,25,50,0.08)',
        willChange: 'transform, opacity',
      }}
    >
      <div
        style={{
          height: 54,
          background: chrome,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '0 16px',
          borderBottom: `1px solid ${border}`,
        }}
      >
        <TrafficLights />
        {tabTitle && (
          <div
            style={{
              marginLeft: 12,
              padding: '6px 14px 6px 12px',
              background: urlBg,
              border: `1px solid ${border}`,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontFamily: 'Figtree, system-ui, sans-serif',
              fontSize: 15,
              color: urlFg,
              minWidth: 180,
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                background: color_devs(),
              }}
            />
            <span>{tabTitle}</span>
          </div>
        )}
        <div
          style={{
            flex: 1,
            marginLeft: 12,
            height: 36,
            background: urlBg,
            border: `1px solid ${border}`,
            borderRadius: 18,
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            fontFamily: "'Geist Mono', ui-monospace, monospace",
            fontSize: 16,
            color: urlFg,
            letterSpacing: '0.01em',
          }}
        >
          <span style={{ opacity: 0.5, marginRight: 10, fontSize: 12 }}>▾</span>
          <TypedUrl
            text={urlText}
            progress={urlProgress}
            fontSize={16}
            color={urlFg}
          />
        </div>
      </div>
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: 'calc(100% - 54px)',
          color: fg,
        }}
      >
        {children}
      </div>
    </div>
  )
}
