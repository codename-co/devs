/**
 * TourSoundtrack — background music track synced to the tour timeline.
 *
 * Plays / pauses in lock-step with the Stage's `playing` state, seeks to
 * match the playhead when the user scrubs, and kicks in at `startOffset`
 * seconds into the tour (before that, the track is silent and rewound).
 *
 * Must be rendered inside a `<Stage>` so it can read `useTimeline()`.
 */
import { useEffect, useRef } from 'react'
import { useTimeline } from './animations'
import soundtrackUrl from '../assets/sergequadrado-classical-orchestral-hip-hop-loop.mp3'

export interface TourSoundtrackProps {
  /** Seconds into the timeline at which the track starts. Default: 0. */
  startOffset?: number
  /** Track volume (0–1). Default: 0.5. */
  volume?: number
  /** Explicit source URL. Defaults to the bundled SergeQuadrado loop. */
  src?: string
  /**
   * Seconds of linear fade-out leading up to the end of the timeline.
   * Default: 3.
   */
  fadeOutDuration?: number
}

export function TourSoundtrack({
  startOffset = 0,
  volume = 0.25,
  src = soundtrackUrl,
  fadeOutDuration = 3,
}: TourSoundtrackProps) {
  const { time, playing, duration, muted } = useTimeline()
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Keep volume and mute in sync with props, muted state, and fade-out.
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.muted = muted
    let v = volume
    if (fadeOutDuration > 0 && duration > 0) {
      const remaining = duration - time
      if (remaining < fadeOutDuration) {
        v = volume * Math.max(0, remaining / fadeOutDuration)
      }
    }
    audio.volume = Math.max(0, Math.min(1, v))
  }, [volume, time, duration, fadeOutDuration, muted])

  // Sync play/pause and playhead with the timeline.
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const trackTime = Math.max(0, time - startOffset)
    // Only seek when out of sync (scrub / loop) — avoids stutter.
    if (Math.abs(audio.currentTime - trackTime) > 0.25) {
      try {
        audio.currentTime = trackTime
      } catch {
        // Seek may fail if the media isn't ready yet; ignore.
      }
    }

    const shouldPlay = playing && time >= startOffset
    if (shouldPlay && audio.paused) {
      audio.play().catch(() => {
        // Autoplay policy — will succeed after the user clicks play.
      })
    } else if (!shouldPlay && !audio.paused) {
      audio.pause()
    }
  }, [time, playing, startOffset])

  return (
    <audio
      ref={audioRef}
      src={src}
      loop
      preload="auto"
      // Visually hidden — this is a purely audible asset.
      style={{ display: 'none' }}
    />
  )
}
