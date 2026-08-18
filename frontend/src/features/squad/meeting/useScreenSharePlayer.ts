import {
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
  useEffect,
  useRef,
  useState,
} from 'react'
import {
  SCREEN_SHARE_MIN_ZOOM,
  SCREEN_SHARE_WHEEL_ZOOM_STEP,
  clampScreenShareZoom,
  useLatest,
} from './meeting-support'
import type { ScreenShareDragState, ScreenSharePan, ScreenShareView } from './meeting-types'

type ScreenSharePlayerOptions = {
  currentUserId?: number
  localScreenShareStream: MediaStream | null
  remoteScreenShares: Map<number, ScreenShareView>
}

export function useScreenSharePlayer({
  currentUserId,
  localScreenShareStream,
  remoteScreenShares,
}: ScreenSharePlayerOptions) {
  const [screenSharePlayerOpen, setScreenSharePlayerOpen] = useState(false)
  const [screenSharePlayerUserId, setScreenSharePlayerUserId] = useState<number | null>(null)
  const [screenShareZoom, setScreenShareZoom] = useState(SCREEN_SHARE_MIN_ZOOM)
  const [screenSharePan, setScreenSharePan] = useState<ScreenSharePan>({ x: 0, y: 0 })
  const [screenShareDragging, setScreenShareDragging] = useState(false)
  const screenShareDragRef = useRef<ScreenShareDragState | null>(null)
  const closeScreenSharePlayerRef = useLatest(closeScreenSharePlayer)

  useEffect(() => {
    const selectedScreenShareExists = screenSharePlayerUserId != null
      && (screenSharePlayerUserId === currentUserId
        ? Boolean(localScreenShareStream)
        : remoteScreenShares.has(screenSharePlayerUserId))

    if ((!localScreenShareStream && remoteScreenShares.size === 0) || (screenSharePlayerOpen && !selectedScreenShareExists)) {
      resetScreenSharePlayer()
      setScreenSharePlayerOpen(false)
      setScreenSharePlayerUserId(null)
    }
  }, [currentUserId, localScreenShareStream, remoteScreenShares, screenSharePlayerOpen, screenSharePlayerUserId])

  useEffect(() => {
    if (!screenSharePlayerOpen) {
      return undefined
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closeScreenSharePlayerRef.current()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [closeScreenSharePlayerRef, screenSharePlayerOpen])

  useEffect(() => {
    if (!screenSharePlayerOpen) {
      return undefined
    }

    function handleFullscreenChange() {
      if (!document.fullscreenElement) {
        resetScreenSharePlayer()
        setScreenSharePlayerOpen(false)
        setScreenSharePlayerUserId(null)
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [screenSharePlayerOpen])

  function resetScreenSharePlayer() {
    screenShareDragRef.current = null
    setScreenShareDragging(false)
    setScreenShareZoom(SCREEN_SHARE_MIN_ZOOM)
    setScreenSharePan({ x: 0, y: 0 })
  }

  function openScreenSharePlayer(userId: number) {
    resetScreenSharePlayer()
    setScreenSharePlayerUserId(userId)
    setScreenSharePlayerOpen(true)

    if (document.fullscreenElement || !document.documentElement.requestFullscreen) {
      return
    }

    void document.documentElement.requestFullscreen().catch(() => undefined)
  }

  function closeScreenSharePlayer() {
    resetScreenSharePlayer()
    setScreenSharePlayerOpen(false)
    setScreenSharePlayerUserId(null)

    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined)
    }
  }

  function updateScreenShareZoom(nextValue: number, pivot?: { x: number; y: number }) {
    const nextZoom = clampScreenShareZoom(nextValue)

    if (nextZoom <= SCREEN_SHARE_MIN_ZOOM) {
      setScreenSharePan({ x: 0, y: 0 })
      setScreenShareZoom(SCREEN_SHARE_MIN_ZOOM)
      return
    }

    if (pivot) {
      const ratio = nextZoom / screenShareZoom
      setScreenSharePan((current) => ({
        x: current.x - pivot.x * (ratio - 1),
        y: current.y - pivot.y * (ratio - 1),
      }))
    }

    setScreenShareZoom(nextZoom)
  }

  function handleScreenShareWheel(event: ReactWheelEvent<HTMLDivElement>) {
    event.preventDefault()
    const rect = event.currentTarget.getBoundingClientRect()
    const pivot = {
      x: event.clientX - rect.left - rect.width / 2,
      y: event.clientY - rect.top - rect.height / 2,
    }
    const direction = event.deltaY < 0 ? 1 : -1
    updateScreenShareZoom(screenShareZoom + direction * SCREEN_SHARE_WHEEL_ZOOM_STEP, pivot)
  }

  function handleScreenSharePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (screenShareZoom <= SCREEN_SHARE_MIN_ZOOM) {
      return
    }

    if (event.target instanceof HTMLElement && event.target.closest('button, a, input, textarea, select')) {
      return
    }

    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    screenShareDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: screenSharePan.x,
      originY: screenSharePan.y,
    }
    setScreenShareDragging(true)
  }

  function handleScreenSharePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const dragState = screenShareDragRef.current
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return
    }

    event.preventDefault()
    setScreenSharePan({
      x: dragState.originX + event.clientX - dragState.startX,
      y: dragState.originY + event.clientY - dragState.startY,
    })
  }

  function endScreenShareDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    if (screenShareDragRef.current?.pointerId === event.pointerId) {
      screenShareDragRef.current = null
      setScreenShareDragging(false)
    }
  }

  return {
    screenSharePlayerOpen,
    setScreenSharePlayerOpen,
    screenSharePlayerUserId,
    setScreenSharePlayerUserId,
    screenShareZoom,
    setScreenShareZoom,
    screenSharePan,
    setScreenSharePan,
    screenShareDragging,
    setScreenShareDragging,
    screenShareDragRef,
    resetScreenSharePlayer,
    openScreenSharePlayer,
    closeScreenSharePlayer,
    updateScreenShareZoom,
    handleScreenShareWheel,
    handleScreenSharePointerDown,
    handleScreenSharePointerMove,
    endScreenShareDrag,
  }
}
