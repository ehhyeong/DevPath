import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import { showAuthToast } from '../../../lib/auth-toast'
import { createSquadNotification, squadActorName } from '../notifications'
import { getUserMediaWithTimeout, useLatest } from './meeting-support'
import { getCameraConstraints } from './meeting-media'
import type { VoiceChannel } from './meeting-types'
import type { VoicePeerTransceivers } from './meeting-support'

type Props = {
  workspaceId: number | null
  activeChannel: VoiceChannel | null
  isJoined: boolean
  currentUserName?: string | null
  localCameraStreamRef: MutableRefObject<MediaStream | null>
  localScreenShareStreamRef: MutableRefObject<MediaStream | null>
  peerTransceiversRef: MutableRefObject<Map<number, VoicePeerTransceivers>>
  setLocalCameraStream: Dispatch<SetStateAction<MediaStream | null>>
  setLocalScreenShareStream: Dispatch<SetStateAction<MediaStream | null>>
  ensurePeerConnections: () => void
  broadcastCameraState: (type: 'camera-start' | 'camera-stop') => void
  broadcastScreenShareState: (type: 'screen-share-start' | 'screen-share-stop') => void
}

export function useMeetingMediaTracks(props: Props) {
  const { workspaceId, activeChannel, isJoined, currentUserName, localCameraStreamRef, localScreenShareStreamRef, peerTransceiversRef, setLocalCameraStream, setLocalScreenShareStream, ensurePeerConnections, broadcastCameraState, broadcastScreenShareState } = props
  // 대기실에서 등록한 track.onended도 입장 후의 참가 상태를 기준으로 전송을 종료한다.
  const isJoinedRef = useLatest(isJoined)

  function clearLocalCameraStream() {
    localCameraStreamRef.current?.getTracks().forEach((track) => {
      track.onended = null
      track.stop()
    })
    localCameraStreamRef.current = null
    setLocalCameraStream(null)
  }

  function clearLocalScreenShareStream() {
    localScreenShareStreamRef.current?.getTracks().forEach((track) => {
      track.onended = null
      track.stop()
    })
    localScreenShareStreamRef.current = null
    setLocalScreenShareStream(null)
  }

  async function replaceVideoTrack(kind: 'camera' | 'screen', stream: MediaStream | null) {
    const track = stream?.getVideoTracks()[0] ?? null
    if (track) ensurePeerConnections()
    await Promise.all(Array.from(peerTransceiversRef.current.values()).map((transceivers) => {
      const transceiver = transceivers[kind]
      if (stream) transceiver.sender.setStreams(stream)
      return transceiver.sender.replaceTrack(track)
    }))
  }

  async function attachLocalVoiceTrackToPeers(stream: MediaStream) {
    const [audioTrack] = stream.getAudioTracks()
    if (!audioTrack) return
    ensurePeerConnections()
    await Promise.all(Array.from(peerTransceiversRef.current.values()).map(({ microphone }) => {
      microphone.sender.setStreams(stream)
      return microphone.sender.replaceTrack(audioTrack)
    }))
  }

  async function stopLocalCamera({ notify = true, renegotiate = true }: { notify?: boolean; renegotiate?: boolean } = {}) {
    if (!localCameraStreamRef.current) return
    if (isJoinedRef.current && notify) broadcastCameraState('camera-stop')
    if (isJoinedRef.current && renegotiate) await replaceVideoTrack('camera', null)
    clearLocalCameraStream()
  }

  async function startLocalCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      showAuthToast({ message: '이 환경에서는 카메라에 접근할 수 없습니다. HTTPS 또는 localhost에서 지원 브라우저로 접속해 주세요.', durationMs: 4000 })
      return
    }
    try {
      const stream = await getUserMediaWithTimeout(getCameraConstraints())
      const [videoTrack] = stream.getVideoTracks()
      if (!videoTrack) {
        stream.getTracks().forEach((track) => track.stop())
        showAuthToast({ message: '카메라 영상을 찾지 못했습니다. 장치 연결을 확인해 주세요.', durationMs: 3000 })
        return
      }
      await stopLocalCamera({ notify: false })
      localCameraStreamRef.current = stream
      setLocalCameraStream(stream)
      videoTrack.onended = () => void stopLocalCamera()
      // 대기실에서는 미리보기만 제공하고 영상 전송은 입장 시 피어 연결에서 시작한다.
      if (isJoinedRef.current) {
        broadcastCameraState('camera-start')
        await replaceVideoTrack('camera', stream)
      }
      showAuthToast({ message: '카메라를 켰습니다.', durationMs: 1600 })
    } catch (error) {
      clearLocalCameraStream()
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        showAuthToast({ message: '카메라 권한이 차단되었습니다. 브라우저의 사이트 설정에서 카메라 접근을 허용해 주세요.', durationMs: 4000 })
        return
      }
      const message = error instanceof DOMException && error.name === 'NotFoundError'
        ? '연결된 카메라를 찾지 못했습니다. 장치 연결을 확인해 주세요.'
        : error instanceof DOMException && error.name === 'NotReadableError'
          ? '카메라를 사용할 수 없습니다. 다른 앱의 카메라 사용을 종료한 뒤 다시 시도해 주세요.'
          : error instanceof Error ? `카메라를 켜지 못했습니다. ${error.message}` : '카메라를 켜지 못했습니다. 장치와 브라우저 권한을 확인해 주세요.'
      showAuthToast({ message, durationMs: 4000 })
    }
  }

  async function toggleCamera() {
    if (localCameraStreamRef.current) {
      await stopLocalCamera()
      showAuthToast({ message: '카메라를 껐습니다.', durationMs: 1600 })
      return
    }
    await startLocalCamera()
  }

  async function stopScreenShare({ notify = true, renegotiate = true }: { notify?: boolean; renegotiate?: boolean } = {}) {
    if (!localScreenShareStreamRef.current) return
    if (notify) {
      broadcastScreenShareState('screen-share-stop')
      void createSquadNotification(workspaceId, {
        pageKey: 'squad-meeting',
        message: `${squadActorName(currentUserName)}님이 "${activeChannel?.name ?? '음성 회의'}" 화면 공유를 종료했습니다.`,
        targetPath: '/squad-meeting',
      })
    }
    if (renegotiate) await replaceVideoTrack('screen', null)
    clearLocalScreenShareStream()
  }

  async function startScreenShare() {
    if (!activeChannel || !isJoined) {
      showAuthToast({ message: '먼저 음성 회의에 입장해 주세요.', durationMs: 1800 })
      return
    }
    if (!navigator.mediaDevices?.getDisplayMedia) {
      showAuthToast({ message: '이 브라우저에서는 화면 공유를 사용할 수 없습니다.', durationMs: 2200 })
      return
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
      const [videoTrack] = stream.getVideoTracks()
      if (!videoTrack) {
        stream.getTracks().forEach((track) => track.stop())
        showAuthToast({ message: '공유할 화면 비디오를 찾지 못했습니다.', durationMs: 2200 })
        return
      }
      await stopScreenShare({ notify: false })
      localScreenShareStreamRef.current = stream
      setLocalScreenShareStream(stream)
      videoTrack.onended = () => void stopScreenShare()
      broadcastScreenShareState('screen-share-start')
      await replaceVideoTrack('screen', stream)
      void createSquadNotification(workspaceId, {
        pageKey: 'squad-meeting',
        message: `${squadActorName(currentUserName)}님이 "${activeChannel.name}"에서 화면 공유를 시작했습니다.`,
        targetPath: '/squad-meeting',
      })
      showAuthToast({ message: '화면 공유를 시작했습니다.', durationMs: 1800 })
    } catch (error) {
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        showAuthToast({ message: '화면 공유가 취소되었습니다.', durationMs: 1800 })
        return
      }
      showAuthToast({ message: '화면 공유를 시작하지 못했습니다.', durationMs: 2200 })
    }
  }

  async function toggleScreenShare() {
    if (localScreenShareStreamRef.current) {
      await stopScreenShare()
      showAuthToast({ message: '화면 공유를 종료했습니다.', durationMs: 1600 })
      return
    }
    await startScreenShare()
  }

  return { clearLocalCameraStream, clearLocalScreenShareStream, attachLocalVoiceTrackToPeers, stopLocalCamera, stopScreenShare, toggleCamera, toggleScreenShare }
}
