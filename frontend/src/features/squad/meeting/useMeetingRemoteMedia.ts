import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import type { VoicePeerTransceivers } from './meeting-support'
import type { CameraView, ScreenShareView, SinkAudioElement, VoiceParticipant, WorkspaceMember } from './meeting-types'

type Props = {
  members: WorkspaceMember[]
  participants: VoiceParticipant[]
  activeParticipants: VoiceParticipant[]
  remoteAudioElementsRef: MutableRefObject<Map<number, SinkAudioElement>>
  remoteAudioMutedRef: MutableRefObject<boolean>
  remoteAudioContainerRef: MutableRefObject<HTMLDivElement | null>
  remoteCameraStreamsRef: MutableRefObject<Map<number, CameraView>>
  remoteCameraPendingRef: MutableRefObject<Set<number>>
  remoteScreenShareViewsRef: MutableRefObject<Map<number, ScreenShareView>>
  remoteScreenSharePendingRef: MutableRefObject<Set<number>>
  peerConnectionsRef: MutableRefObject<Map<number, RTCPeerConnection>>
  peerTransceiversRef: MutableRefObject<Map<number, VoicePeerTransceivers>>
  makingOffersRef: MutableRefObject<Set<number>>
  pendingIceCandidatesRef: MutableRefObject<Map<number, RTCIceCandidateInit[]>>
  setRemoteCameraStreams: Dispatch<SetStateAction<Map<number, CameraView>>>
  setRemoteScreenShares: Dispatch<SetStateAction<Map<number, ScreenShareView>>>
  applySelectedOutputToAudio: (audio: SinkAudioElement) => Promise<void>
}

export function useMeetingRemoteMedia(props: Props) {
  const { members, participants, activeParticipants, remoteAudioElementsRef, remoteAudioMutedRef, remoteAudioContainerRef, remoteCameraStreamsRef, remoteCameraPendingRef, remoteScreenShareViewsRef, remoteScreenSharePendingRef, peerConnectionsRef, peerTransceiversRef, makingOffersRef, pendingIceCandidatesRef, setRemoteCameraStreams, setRemoteScreenShares, applySelectedOutputToAudio } = props

  function stopRemoteAudioElements() {
    remoteAudioElementsRef.current.forEach((audio) => {
      audio.pause()
      audio.srcObject = null
      audio.remove()
    })
    remoteAudioElementsRef.current.clear()
  }

  function handlePeersClosed() {
    stopRemoteAudioElements()
    remoteCameraStreamsRef.current.clear()
    remoteCameraPendingRef.current.clear()
    remoteScreenShareViewsRef.current.clear()
    remoteScreenSharePendingRef.current.clear()
    setRemoteCameraStreams(new Map())
    setRemoteScreenShares(new Map())
  }

  function getVoiceDisplayName(userId: number, fallbackName?: string) {
    return members.find((member) => member.learnerId === userId)?.learnerName
      ?? participants.find((participant) => participant.userId === userId)?.userName
      ?? activeParticipants.find((participant) => participant.userId === userId)?.userName
      ?? fallbackName
      ?? '참가자'
  }

  function createRemoteAudioElement(userId: number) {
    const existing = remoteAudioElementsRef.current.get(userId)
    if (existing) {
      existing.muted = remoteAudioMutedRef.current
      return existing
    }
    const audio = document.createElement('audio') as SinkAudioElement
    audio.autoplay = true
    audio.muted = remoteAudioMutedRef.current
    audio.dataset.voicePeerId = String(userId)
    remoteAudioElementsRef.current.set(userId, audio)
    remoteAudioContainerRef.current?.appendChild(audio)
    void applySelectedOutputToAudio(audio)
    return audio
  }

  function clearRemoteScreenShare(userId: number, removeTrack = false) {
    if (removeTrack) remoteScreenShareViewsRef.current.delete(userId)
    remoteScreenSharePendingRef.current.delete(userId)
    setRemoteScreenShares((current) => {
      if (!current.has(userId)) return current
      const next = new Map(current)
      next.delete(userId)
      return next
    })
  }

  function clearRemoteCameraStream(userId: number, removeTrack = false) {
    if (removeTrack) remoteCameraStreamsRef.current.delete(userId)
    remoteCameraPendingRef.current.delete(userId)
    setRemoteCameraStreams((current) => {
      if (!current.has(userId)) return current
      const next = new Map(current)
      next.delete(userId)
      return next
    })
  }

  function attachRemoteScreenStream(userId: number, userName: string, stream: MediaStream, track: MediaStreamTrack) {
    const screenStream = stream.getVideoTracks().includes(track) ? stream : new MediaStream([track])
    const view = { userId, userName: getVoiceDisplayName(userId, userName), stream: screenStream, local: false }
    remoteScreenShareViewsRef.current.set(userId, view)
    if (remoteScreenSharePendingRef.current.has(userId)) setRemoteScreenShares((current) => new Map(current).set(userId, view))
    track.onended = () => clearRemoteScreenShare(userId, true)
    track.onunmute = () => {
      if (remoteScreenSharePendingRef.current.has(userId)) setRemoteScreenShares((current) => new Map(current).set(userId, view))
    }
  }

  function attachRemoteCameraStream(userId: number, userName: string, stream: MediaStream, track: MediaStreamTrack) {
    const cameraStream = stream.getVideoTracks().includes(track) ? stream : new MediaStream([track])
    const view = { userId, userName: getVoiceDisplayName(userId, userName), stream: cameraStream, local: false }
    remoteCameraStreamsRef.current.set(userId, view)
    if (remoteCameraPendingRef.current.has(userId)) setRemoteCameraStreams((current) => new Map(current).set(userId, view))
    track.onended = () => clearRemoteCameraStream(userId, true)
    track.onunmute = () => {
      if (remoteCameraPendingRef.current.has(userId)) setRemoteCameraStreams((current) => new Map(current).set(userId, view))
    }
  }

  function attachRemoteTrack(userId: number, userName: string, stream: MediaStream, track: MediaStreamTrack, transceiverIndex: number) {
    if (transceiverIndex === 1) {
      attachRemoteCameraStream(userId, userName, stream, track)
      return
    }
    if (transceiverIndex === 2) {
      attachRemoteScreenStream(userId, userName, stream, track)
      return
    }
    const audio = createRemoteAudioElement(userId)
    audio.muted = remoteAudioMutedRef.current
    audio.srcObject = stream
    void audio.play().catch(() => undefined)
  }

  function removeRemotePeer(userId: number) {
    peerConnectionsRef.current.get(userId)?.close()
    peerConnectionsRef.current.delete(userId)
    peerTransceiversRef.current.delete(userId)
    makingOffersRef.current.delete(userId)
    pendingIceCandidatesRef.current.delete(userId)
    const audio = remoteAudioElementsRef.current.get(userId)
    if (audio) {
      audio.pause()
      audio.srcObject = null
      audio.remove()
      remoteAudioElementsRef.current.delete(userId)
    }
    clearRemoteCameraStream(userId, true)
    clearRemoteScreenShare(userId, true)
  }

  return { handlePeersClosed, getVoiceDisplayName, attachRemoteTrack, removeRemotePeer, clearRemoteCameraStream, clearRemoteScreenShare }
}
