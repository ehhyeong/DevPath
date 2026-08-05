import { type CSSProperties,useEffect,useRef } from 'react'



export function MediaStreamVideo({
  stream,
  className,
  muted = false,
  style,
}: {
  stream: MediaStream
  className?: string
  muted?: boolean
  style?: CSSProperties
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    const video = videoRef.current

    if (!video) {
      return undefined
    }

    video.srcObject = stream
    void video.play().catch(() => undefined)

    return () => {
      if (video.srcObject === stream) {
        video.srcObject = null
      }
    }
  }, [stream])

  return <video ref={videoRef} className={className} style={style} autoPlay playsInline muted={muted} />
}
