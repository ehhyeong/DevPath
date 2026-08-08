import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import { getUserMediaWithTimeout, type VoicePeerTransceivers } from './meeting-support'
import type { AudioProcessingStatus, VoiceParticipant } from './meeting-types'
import { applyAudioProcessingConstraints, createNoiseGatedVoiceStream, createVoiceActivityMonitor, getAudioConstraints, readAudioProcessingStatus } from './meeting-media'

type Props = {
  selectedInputId: string
  micMuted: boolean
  currentUserId: number | null | undefined
  localVoiceStreamRef: MutableRefObject<MediaStream | null>
  localVoiceRawStreamRef: MutableRefObject<MediaStream | null>
  voiceNoiseGateStopRef: MutableRefObject<(() => void) | null>
  voiceActivityStopRef: MutableRefObject<(() => void) | null>
  localSpeakingRef: MutableRefObject<boolean>
  peerTransceiversRef: MutableRefObject<Map<number, VoicePeerTransceivers>>
  setLocalSpeaking: (speaking: boolean) => void
  setParticipants: Dispatch<SetStateAction<VoiceParticipant[]>>
  setAudioProcessingStatus: Dispatch<SetStateAction<AudioProcessingStatus>>
  setAudioDeviceError: (message: string | null) => void
  setWaitingMicMuted: (muted: boolean) => void
  stopMinutesSpeechRecognition: () => void
  createVoiceEvent: (type: 'SPEAKING' | 'STOP_SPEAKING', memo: string) => Promise<unknown>
  broadcastSpeakingState: (speaking: boolean) => void
}

export function useMeetingVoiceInput(props: Props) {
  const { selectedInputId, micMuted, currentUserId, localVoiceStreamRef, localVoiceRawStreamRef, voiceNoiseGateStopRef, voiceActivityStopRef, localSpeakingRef, peerTransceiversRef, setLocalSpeaking, setParticipants, setAudioProcessingStatus, setAudioDeviceError, setWaitingMicMuted, stopMinutesSpeechRecognition, createVoiceEvent, broadcastSpeakingState } = props

  function stopVoiceNoiseGate() {
    voiceNoiseGateStopRef.current?.()
    voiceNoiseGateStopRef.current = null
  }

  function stopVoiceActivityMonitor() {
    voiceActivityStopRef.current?.()
    voiceActivityStopRef.current = null
  }

  function publishLocalSpeaking(nextSpeaking: boolean) {
    if (localSpeakingRef.current === nextSpeaking) return
    localSpeakingRef.current = nextSpeaking
    setLocalSpeaking(nextSpeaking)
    setParticipants((current) => current.map((participant) => participant.userId === currentUserId
      ? { ...participant, speaking: nextSpeaking }
      : participant))
    void createVoiceEvent(nextSpeaking ? 'SPEAKING' : 'STOP_SPEAKING', nextSpeaking ? '마이크 입력 감지' : '마이크 입력 종료').catch(() => undefined)
    broadcastSpeakingState(nextSpeaking)
  }

  function startVoiceActivityMonitor(stream: MediaStream) {
    stopVoiceActivityMonitor()
    voiceActivityStopRef.current = createVoiceActivityMonitor(stream, (speaking) => {
      if (localVoiceStreamRef.current === stream) publishLocalSpeaking(speaking)
    })
  }

  function stopLocalVoiceStream() {
    stopVoiceActivityMonitor()
    stopVoiceNoiseGate()
    const tracks = new Set([
      ...(localVoiceRawStreamRef.current?.getTracks() ?? []),
      ...(localVoiceStreamRef.current?.getTracks() ?? []),
    ])
    tracks.forEach((track) => track.stop())
    localVoiceRawStreamRef.current = null
    localVoiceStreamRef.current = null
    setAudioProcessingStatus((current) => ({ ...current, noiseGate: false }))
  }

  function setLocalVoiceMuted(muted: boolean) {
    localVoiceStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !muted
    })
    if (muted) {
      stopMinutesSpeechRecognition()
      publishLocalSpeaking(false)
    }
  }

  function updateAudioProcessingStatus(stream: MediaStream, noiseGate: boolean) {
    setAudioProcessingStatus(readAudioProcessingStatus(stream, noiseGate))
  }

  async function startLocalVoiceStream(muted: boolean) {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('이 브라우저에서는 음성 회의 마이크를 사용할 수 없습니다.')
    stopLocalVoiceStream()
    const rawStream = await getUserMediaWithTimeout(getAudioConstraints(selectedInputId))
    await applyAudioProcessingConstraints(rawStream)
    stopVoiceNoiseGate()
    const noiseGate = createNoiseGatedVoiceStream(rawStream)
    const stream = noiseGate.stream
    voiceNoiseGateStopRef.current = noiseGate.stop
    localVoiceRawStreamRef.current = rawStream
    localVoiceStreamRef.current = stream
    updateAudioProcessingStatus(rawStream, stream !== rawStream)
    setLocalVoiceMuted(muted)
    startVoiceActivityMonitor(stream)
    return stream
  }

  async function startLocalVoiceStreamIfAvailable(muted: boolean) {
    try {
      await startLocalVoiceStream(muted)
      return true
    } catch (error) {
      stopLocalVoiceStream()
      setAudioDeviceError(error instanceof Error ? error.message : '마이크를 사용할 수 없습니다.')
      setWaitingMicMuted(true)
      return false
    }
  }

  async function replaceLocalVoiceInput() {
    if (!localVoiceStreamRef.current || !navigator.mediaDevices?.getUserMedia) return
    const nextRawStream = await getUserMediaWithTimeout(getAudioConstraints(selectedInputId))
    await applyAudioProcessingConstraints(nextRawStream)
    stopVoiceNoiseGate()
    const noiseGate = createNoiseGatedVoiceStream(nextRawStream)
    const nextStream = noiseGate.stream
    voiceNoiseGateStopRef.current = noiseGate.stop
    const [nextTrack] = nextStream.getAudioTracks()
    if (!nextTrack) {
      nextRawStream.getTracks().forEach((track) => track.stop())
      nextStream.getTracks().forEach((track) => track.stop())
      return
    }
    nextTrack.enabled = !micMuted
    await Promise.all(Array.from(peerTransceiversRef.current.values()).map(({ microphone }) => {
      microphone.sender.setStreams(nextStream)
      return microphone.sender.replaceTrack(nextTrack)
    }))
    const oldTracks = new Set([
      ...(localVoiceRawStreamRef.current?.getTracks() ?? []),
      ...(localVoiceStreamRef.current?.getTracks() ?? []),
    ])
    oldTracks.forEach((track) => track.stop())
    localVoiceRawStreamRef.current = nextRawStream
    localVoiceStreamRef.current = nextStream
    updateAudioProcessingStatus(nextRawStream, nextStream !== nextRawStream)
    startVoiceActivityMonitor(nextStream)
  }

  return { stopLocalVoiceStream, setLocalVoiceMuted, startLocalVoiceStreamIfAvailable, replaceLocalVoiceInput, updateAudioProcessingStatus }
}
