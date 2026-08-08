import type { MutableRefObject } from 'react'
import { learningPlayerApi } from '../../lib/api/learner'
import { captureAndOcr, type ScreenRegion } from '../../lib/videoOcr'
import type { LearningPlayerConfig, LearningVideoQuality } from '../../types/learning'
import { formatOcrSourceLabel, getVideoErrorMessage, isAbortError, isPlaybackBlockedError, type PipDocument, type PipVideoElement } from './learning-player-model'
import { PLAYER_SPEEDS, type FlattenedLesson } from './learning-player-support'
import { useLearningPlaybackState } from './useLearningPlayerState'

type Props = {
  state: ReturnType<typeof useLearningPlaybackState>
  lesson: FlattenedLesson | null
  resolvedVideoUrl: string | null
  playerConfig: LearningPlayerConfig | null
  setPlayerConfig: (config: LearningPlayerConfig) => void
  videoQualitySources: Partial<Record<LearningVideoQuality, string>>
  activeVideoQuality: LearningVideoQuality | null
  setNotice: (message: string | null) => void
  getPlaybackLimit: (video: HTMLVideoElement | null) => number
  videoRef: MutableRefObject<HTMLVideoElement | null>
  frameRef: MutableRefObject<HTMLDivElement | null>
  resumeTimeRef: MutableRefObject<number>
  lastRenderedSecondRef: MutableRefObject<number>
  pendingVideoLoadRef: MutableRefObject<boolean>
  resumePlaybackAfterQualitySwitchRef: MutableRefObject<boolean>
}

export function useLearningPlaybackActions(props: Props) {
  const { state, lesson, resolvedVideoUrl, playerConfig, setPlayerConfig, videoQualitySources, activeVideoQuality, setNotice, getPlaybackLimit, videoRef, frameRef, resumeTimeRef, lastRenderedSecondRef, pendingVideoLoadRef, resumePlaybackAfterQualitySwitchRef } = props
  const { videoFailed, setVideoFailed, currentTime, setCurrentTime, volume: _volume, setVolume, isPipActive, setIsMuted, setIsPlaying, ocrBusy, setOcrBusy, setIsSelectMode, setSelectDrag, setSettingsOpen, setSelectedVideoQuality } = state
  void _volume

  async function handleTogglePlaySafe() {
    const video = videoRef.current
    if (!video || !resolvedVideoUrl) return

    if (videoFailed) {
      pendingVideoLoadRef.current = true
      setVideoFailed(false)
      setNotice('영상 재생 준비 중입니다.')
      video.load()
      return
    }

    if (videoFailed) {
      setVideoFailed(false)
      setNotice('영상을 다시 불러오는 중입니다.')
      video.load()
    }

    if (video.paused) {
      const playbackLimit = getPlaybackLimit(video)
      if (playbackLimit > 0 && video.currentTime >= playbackLimit) {
        video.currentTime = 0
        lastRenderedSecondRef.current = 0
        setCurrentTime(0)
      }

      if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        pendingVideoLoadRef.current = true
        setNotice('영상 재생 준비 중입니다.')
        if (video.networkState === HTMLMediaElement.NETWORK_EMPTY) video.load()
        return
      }

      try {
        await video.play()
        setNotice(null)
      } catch (error) {
        if (isPlaybackBlockedError(error)) {
          try {
            video.muted = true
            setIsMuted(true)
            await video.play()
            setNotice('브라우저 정책 때문에 음소거 상태로 먼저 재생했습니다. 필요하면 음소거를 해제해 주세요.')
            return
          } catch (mutedError) {
            if (!isPlaybackBlockedError(mutedError) && !isAbortError(mutedError)) {
              setNotice(getVideoErrorMessage(video, resolvedVideoUrl))
              return
            }
          }

          setNotice('브라우저 자동 재생 정책 때문에 재생이 막혔습니다. 재생 버튼을 다시 눌러 주세요.')
          return
        }

        if (isAbortError(error)) {
          setNotice('영상을 아직 불러오는 중입니다. 잠시 후 다시 시도해 주세요.')
          return
        }

        setNotice(getVideoErrorMessage(video, resolvedVideoUrl))
      }
      return
    }

    video.pause()
  }

  function handleRetryVideoLoad() {
    const video = videoRef.current
    if (!video || !resolvedVideoUrl) return
    pendingVideoLoadRef.current = true
    setVideoFailed(false)
    setIsPlaying(false)
    setNotice('영상을 다시 불러오는 중입니다.')
    video.load()
  }

  async function handleOcr(region?: ScreenRegion) {
    const video = videoRef.current
    if (!video || ocrBusy) return
    setOcrBusy(true)
    setIsSelectMode(false)
    setSelectDrag(null)
    setNotice(region ? '선택한 영역의 글자를 읽는 중...' : '화면의 글자를 읽는 중...')
    try {
      const { text, source } = await captureAndOcr(video, region, (msg) => setNotice(msg))
      if (!text.trim()) {
        setNotice(`${formatOcrSourceLabel(source)} · 인식한 글자가 없습니다.`)
        return
      }
      await navigator.clipboard.writeText(text)
      setNotice('클립보드에 복사가 완료되었습니다.')
    } catch (err) {
      setNotice(`글자를 읽지 못했습니다: ${err instanceof Error ? err.message : '알 수 없는 오류'}`)
    } finally {
      setOcrBusy(false)
    }
  }

  function handleToggleMute() {
    const video = videoRef.current
    if (!video) return
    const next = !video.muted
    video.muted = next
    setIsMuted(next)
  }

  function handleVolumeChange(next: number) {
    const video = videoRef.current
    if (!video) return
    video.volume = next
    video.muted = next === 0
    setVolume(next)
    setIsMuted(next === 0)
  }

  function handleSeek(nextSeconds: number) {
    const video = videoRef.current
    if (!video) return
    const upperBound = getPlaybackLimit(video) || (lesson?.durationSeconds ?? 0) || nextSeconds
    const bounded = Math.max(0, Math.min(upperBound, nextSeconds))
    video.currentTime = bounded
    lastRenderedSecondRef.current = Math.floor(bounded)
    setCurrentTime(Math.floor(bounded))
  }

  async function handleTogglePip() {
    const pipDocument = document as PipDocument
    const video = videoRef.current as PipVideoElement | null
    if (!video) return

    // 브라우저 PIP 미지원
    if (!pipDocument.pictureInPictureEnabled || !video.requestPictureInPicture) {
      setNotice('이 브라우저는 PIP 모드를 지원하지 않습니다.')
      return
    }

    try {
      if (pipDocument.pictureInPictureElement) {
        // 현재 PIP 활성 → 종료
        if (pipDocument.exitPictureInPicture) await pipDocument.exitPictureInPicture()
      } else {
        // 영상 메타데이터 로드 확인 (readyState 0=HAVE_NOTHING)
        if (video.readyState < 1) {
          setNotice('영상이 아직 로드되지 않았습니다. 잠시 후 다시 시도해 주세요.')
          return
        }
        await video.requestPictureInPicture()
      }
      // 상태는 enterpictureinpicture / leavepictureinpicture 이벤트로 자동 반영
      // 백엔드에 선호 설정 저장
      if (lesson) {
        learningPlayerApi.updatePipMode(lesson.lessonId, !isPipActive).catch(() => {})
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        setNotice('영상을 먼저 재생한 뒤 PIP 모드를 사용해 주세요.')
      } else {
        setNotice('PIP 모드 전환에 실패했습니다.')
      }
    }
  }

  async function handleToggleFullscreen() {
    const frame = frameRef.current
    if (!frame) return

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
        return
      }

      await frame.requestFullscreen()
    } catch {
      setNotice('전체 화면 전환에 실패했습니다.')
    }
  }

  async function handleCyclePlaybackRate() {
    if (!lesson || !playerConfig) return
    const currentIndex = PLAYER_SPEEDS.indexOf(playerConfig.defaultPlaybackRate as (typeof PLAYER_SPEEDS)[number])
    const nextRate = PLAYER_SPEEDS[(currentIndex + 1 + PLAYER_SPEEDS.length) % PLAYER_SPEEDS.length]
    setPlayerConfig({ ...playerConfig, defaultPlaybackRate: nextRate })
    if (videoRef.current) videoRef.current.playbackRate = nextRate
    try {
      await learningPlayerApi.updatePlaybackRate(lesson.lessonId, nextRate)
    } catch {
      // 로컬 설정 유지
    }
  }

  async function handleSetPlaybackRate(nextRate: number) {
    if (!lesson || !playerConfig) return
    setPlayerConfig({ ...playerConfig, defaultPlaybackRate: nextRate })
    setSettingsOpen(false)
    if (videoRef.current) videoRef.current.playbackRate = nextRate
    try {
      await learningPlayerApi.updatePlaybackRate(lesson.lessonId, nextRate)
    } catch {
      // Keep the local setting if persistence fails.
    }
  }

  function handleSetVideoQuality(nextQuality: LearningVideoQuality) {
    const nextSource = videoQualitySources[nextQuality]
    if (!nextSource) {
      setNotice(`${nextQuality}p 영상 소스가 이 강의에 등록되어 있지 않습니다.`)
      return
    }

    if (activeVideoQuality === nextQuality) {
      setSettingsOpen(false)
      return
    }

    const video = videoRef.current
    if (video) {
      const restoreSecond = Math.max(0, Math.floor(video.currentTime || currentTime))
      resumeTimeRef.current = restoreSecond
      lastRenderedSecondRef.current = restoreSecond
      resumePlaybackAfterQualitySwitchRef.current = !video.paused
      pendingVideoLoadRef.current = true
      setVideoFailed(false)
      setNotice(`${nextQuality}p로 전환 중입니다.`)
    }

    setSelectedVideoQuality(nextQuality)
    setSettingsOpen(false)
  }

  return { handleTogglePlaySafe, handleRetryVideoLoad, handleOcr, handleToggleMute, handleVolumeChange, handleSeek, handleTogglePip, handleToggleFullscreen, handleCyclePlaybackRate, handleSetPlaybackRate, handleSetVideoQuality }
}
