/**
 * Soundtrack — background music track synced to the video timeline.
 *
 * Plays / pauses in lock-step with the Stage's `playing` state, seeks to
 * match the playhead when the user scrubs, and kicks in at `startOffset`
 * seconds into the video.
 *
 * The soundtrack is lazy: while the video is muted (which it is by
 * default), no `<audio>` element is rendered and the file isn't even
 * fetched. Only once the user unmutes — a real user gesture, which also
 * sidesteps the browser's autoplay policy — do we load the file and
 * start playback.
 *
 * Must be rendered inside a `<Stage>` so it can read `useTimeline()`.
 */
import { useEffect, useRef, useState } from 'react'
import { useTimeline } from './context'

export interface SoundtrackProps {
  /** Audio source URL. */
  src: string
  /** Seconds into the timeline at which the track starts. Default: 0. */
  startOffset?: number
  /** Track volume (0–1). Default: 0.25. */
  volume?: number
  /**
   * Seconds of linear fade-out leading up to the end of the timeline.
   * Default: 3.
   */
  fadeOutDuration?: number
}

export function Soundtrack({
  src,
  startOffset = 0,
  volume = 0.25,
  fadeOutDuration = 3,
}: SoundtrackProps) {
  const { time, playing, duration, muted } = useTimeline()
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Lazy-load the audio asset. We only mount the `<audio>` element — and
  // therefore only fetch the file — once the user has unmuted for the
  // first time. After that we keep it mounted so subsequent mute/unmute
  // toggles are instantaneous.
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    if (!muted) setLoaded(true)
  }, [muted])

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
  }, [volume, time, duration, fadeOutDuration, muted, loaded])

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
  }, [time, playing, startOffset, loaded])

  if (!loaded) return null

  return (
    <audio
      ref={audioRef}
      src={src}
      loop
      preload="auto"
      style={{ display: 'none' }}
    />
  )
}
