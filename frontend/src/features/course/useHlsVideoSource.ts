import Hls from 'hls.js'
import { useEffect, type RefObject } from 'react'

export function isHlsPlaybackUrl(source: string | null) {
  if (!source) return false
  try {
    return new URL(source, window.location.origin).pathname.toLowerCase().endsWith('.m3u8')
  } catch {
    return source.toLowerCase().split(/[?#]/, 1)[0].endsWith('.m3u8')
  }
}

export function useHlsVideoSource(
  videoRef: RefObject<HTMLVideoElement | null>,
  source: string | null,
  setVideoFailed: (failed: boolean) => void,
) {
  const hlsSource = isHlsPlaybackUrl(source)

  useEffect(() => {
    const video = videoRef.current
    if (!video || !source || !hlsSource) return

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = source
      return () => {
        video.removeAttribute('src')
        video.load()
      }
    }

    if (!Hls.isSupported()) {
      setVideoFailed(true)
      return
    }

    const hls = new Hls()
    hls.loadSource(source)
    hls.attachMedia(video)
    hls.on(Hls.Events.ERROR, (_event, data) => {
      if (data.fatal) setVideoFailed(true)
    })

    return () => {
      hls.destroy()
      video.removeAttribute('src')
      video.load()
    }
  }, [hlsSource, setVideoFailed, source, videoRef])

  return hlsSource
}
