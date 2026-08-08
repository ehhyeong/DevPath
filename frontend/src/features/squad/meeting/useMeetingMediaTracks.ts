import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import { showAuthToast } from '../../../lib/auth-toast'
import { createSquadNotification, squadActorName } from '../notifications'
import { getUserMediaWithTimeout } from './meeting-support'
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
    if (notify) broadcastCameraState('camera-stop')
    if (renegotiate) await replaceVideoTrack('camera', null)
    clearLocalCameraStream()
  }

  async function startLocalCamera() {
    if (!activeChannel || !isJoined) {
      showAuthToast({ message: 'Join the meeting before turning on camera.', durationMs: 1800 })
      return
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      showAuthToast({ message: 'Camera is not available in this browser.', durationMs: 2200 })
      return
    }
    try {
      const stream = await getUserMediaWithTimeout(getCameraConstraints())
      const [videoTrack] = stream.getVideoTracks()
      if (!videoTrack) {
        stream.getTracks().forEach((track) => track.stop())
        showAuthToast({ message: 'No camera video track was found.', durationMs: 2200 })
        return
      }
      await stopLocalCamera({ notify: false })
      localCameraStreamRef.current = stream
      setLocalCameraStream(stream)
      videoTrack.onended = () => void stopLocalCamera()
      broadcastCameraState('camera-start')
      await replaceVideoTrack('camera', stream)
      showAuthToast({ message: 'Camera turned on.', durationMs: 1600 })
    } catch (error) {
      clearLocalCameraStream()
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        showAuthToast({ message: 'Camera permission was denied.', durationMs: 1800 })
        return
      }
      showAuthToast({ message: 'Could not turn on camera.', durationMs: 2200 })
    }
  }

  async function toggleCamera() {
    if (localCameraStreamRef.current) {
      await stopLocalCamera()
      showAuthToast({ message: 'Camera turned off.', durationMs: 1600 })
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
