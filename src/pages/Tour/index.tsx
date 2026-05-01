/**
 * Tour routes — `/tour` (gallery) and `/tour/:videoId` (individual video).
 *
 * The gallery lists all available product videos as clickable cards.
 * Each video is a self-contained composition using the shared player engine.
 *
 * The tour forces light theme for the duration of any video — the product demo
 * always looks its best on the bright canvas. A MutationObserver keeps the
 * `<html>` class set to `light` even if the Providers theme effect re-asserts
 * `dark`.
 */
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useI18n } from '@/i18n'
import { ProductTourVideo } from './videos/product-tour'
import { AgentStudioVideo } from './videos/agent-studio'
import { TaskDelegationVideo } from './videos/task-delegation'
import { PrivacyFirstVideo } from './videos/privacy-first'
import { InboxWorkflowVideo } from './videos/inbox-workflow'
import tourGalleryI18n from './i18n'

const videos = [
  {
    id: 'product',
    title: 'Product Tour',
    description: 'The full DEVS story in 30 seconds',
    Component: ProductTourVideo,
  },
  {
    id: 'agent-studio',
    title: 'Agent Studio',
    description: 'Build your own AI team',
    Component: AgentStudioVideo,
  },
  {
    id: 'task-delegation',
    title: 'Task Delegation',
    description: 'Delegate, don\u2019t chat',
    Component: TaskDelegationVideo,
  },
  {
    id: 'privacy-first',
    title: 'Privacy First',
    description: 'Your keys. Your data. Your browser.',
    Component: PrivacyFirstVideo,
  },
  {
    id: 'inbox-workflow',
    title: 'Inbox Workflow',
    description: 'Your AI tasks',
    Component: InboxWorkflowVideo,
  },
] as const

/** Force light theme while any tour page is mounted. */
function useForceLightTheme() {
  useEffect(() => {
    const root = document.documentElement
    const hadDark = root.classList.contains('dark')
    const hadLight = root.classList.contains('light')

    const enforce = () => {
      if (root.classList.contains('dark')) root.classList.remove('dark')
      if (!root.classList.contains('light')) root.classList.add('light')
    }
    enforce()

    const observer = new MutationObserver(enforce)
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })

    return () => {
      observer.disconnect()
      if (hadDark) root.classList.add('dark')
      if (!hadLight) root.classList.remove('light')
    }
  }, [])
}

// ── Gallery card ─────────────────────────────────────────────────────────

const THUMBNAIL_TIME = 12

interface GalleryCardProps {
  id: string
  title: string
  description: string
  Component: (typeof videos)[number]['Component']
  onNavigate: () => void
}

function GalleryCard({
  id,
  title,
  description,
  Component,
  onNavigate,
}: GalleryCardProps) {
  const [hovered, setHovered] = useState(false)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Thumbnail — static frame at THUMBNAIL_TIME, play button on hover */}
      <div
        role="button"
        tabIndex={0}
        aria-label={`Play ${title}`}
        onClick={onNavigate}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onNavigate()}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: 'relative',
          aspectRatio: '16 / 9',
          borderRadius: 12,
          overflow: 'hidden',
          border: `1px solid ${hovered ? 'oklch(50% 0.04 253)' : 'oklch(28% 0.01 253)'}`,
          cursor: 'pointer',
          transition: 'border-color 0.2s',
        }}
      >
        {/* Static frame — rendered at 2× size then scaled down 50% so content
            appears at native viewport density rather than squeezed. */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '200%',
            height: '200%',
            transform: 'scale(0.5)',
            transformOrigin: 'top left',
          }}
        >
          <Component
            autoplay={false}
            rootId={`gallery-${id}`}
            disableKeyboard
            initialTime={THUMBNAIL_TIME}
            hideControls
          />
        </div>

        {/* Overlay — darkens on hover and reveals play button */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: hovered
              ? 'oklch(0% 0 0 / 0.45)'
              : 'oklch(0% 0 0 / 0.1)',
            transition: 'background 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: hovered
                ? 'oklch(100% 0 0 / 0.92)'
                : 'oklch(100% 0 0 / 0.55)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s, transform 0.2s',
              transform: hovered ? 'scale(1.12)' : 'scale(1)',
              flexShrink: 0,
            }}
          >
            {/* Play triangle */}
            <div
              style={{
                width: 0,
                height: 0,
                borderStyle: 'solid',
                borderWidth: '9px 0 9px 18px',
                borderColor:
                  'transparent transparent transparent oklch(12% 0.0015 253)',
                marginLeft: 4,
              }}
            />
          </div>
        </div>
      </div>

      {/* Caption row */}
      <button
        onClick={onNavigate}
        style={{
          background: 'transparent',
          border: 'none',
          padding: '4px 0',
          cursor: 'pointer',
          textAlign: 'left',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        <span
          style={{
            fontFamily: "'Unbounded', Georgia, serif",
            fontSize: 15,
            fontWeight: 500,
            color: '#f2f4f8',
          }}
        >
          {title}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              fontFamily: "'Geist', system-ui, sans-serif",
              fontSize: 13,
              color: '#8b919a',
            }}
          >
            {description}
          </span>
        </div>
      </button>
    </div>
  )
}

// ── Gallery page ─────────────────────────────────────────────────────────

function TourGallery() {
  const navigate = useNavigate()
  const { t } = useI18n(tourGalleryI18n)

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'oklch(12% 0.0015 253.83)',
        zIndex: 1000,
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '60px 24px',
        gap: 16,
      }}
    >
      <h1
        style={{
          fontFamily: "'Unbounded', Georgia, serif",
          fontSize: 36,
          fontWeight: 500,
          color: '#f2f4f8',
          letterSpacing: '0.08em',
          marginBottom: 8,
        }}
      >
        {t('DEVS Tours')}
      </h1>
      <p
        style={{
          fontFamily: "'Geist', system-ui, sans-serif",
          fontSize: 16,
          color: '#8b919a',
          marginBottom: 32,
        }}
      >
        {t('Explore the platform in 30-second videos')}
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
          gap: 24,
          maxWidth: 1200,
          width: '100%',
        }}
      >
        {videos.map((v) => (
          <GalleryCard
            key={v.id}
            id={v.id}
            title={t(v.title)}
            description={t(v.description)}
            Component={v.Component}
            onNavigate={() => navigate(`/tour/${v.id}`)}
          />
        ))}
      </div>
    </div>
  )
}

// ── Individual video page ────────────────────────────────────────────────

function TourVideo() {
  const { videoId } = useParams<{ videoId: string }>()
  const navigate = useNavigate()
  const { t } = useI18n(tourGalleryI18n)

  const video = videos.find((v) => v.id === videoId)
  if (!video) {
    navigate('/tour', { replace: true })
    return null
  }

  const { Component } = video

  return (
    <div
      id="tour-root"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'oklch(12% 0.0015 253.83)',
        zIndex: 1000,
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      {/* Back button */}
      <button
        onClick={() => navigate('/tour')}
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          zIndex: 1001,
          background: 'oklch(18% 0.005 253 / 0.8)',
          border: '1px solid oklch(28% 0.01 253)',
          borderRadius: 8,
          padding: '6px 14px',
          cursor: 'pointer',
          fontFamily: "'Geist', system-ui, sans-serif",
          fontSize: 13,
          color: '#8b919a',
          transition: 'color 0.2s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#f2f4f8')}
        onMouseLeave={(e) => (e.currentTarget.style.color = '#8b919a')}
      >
        {t('← All tours')}
      </button>

      <style>{`@keyframes devs-caret { 50% { opacity: 0; } }`}</style>
      <Component />
    </div>
  )
}

// ── Route exports ────────────────────────────────────────────────────────

export function TourPage() {
  useForceLightTheme()
  return <TourGallery />
}

export function TourVideoPage() {
  useForceLightTheme()
  return <TourVideo />
}
