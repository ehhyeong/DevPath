import { useEffect, useRef, type Dispatch, type MutableRefObject, type SetStateAction } from 'react'
import { getUserMediaWithTimeout, useLatest, type VoicePeerTransceivers } from './meeting-support'
import type { AudioProcessingStatus, VoiceParticipant } from './meeting-types'
import { applyAudioProcessingConstraints, createNoiseGatedVoiceStream, createVoiceActivityMonitor, getAudioConstraints, readAudioProcessingStatus } from './meeting-media'

type Props = {
  microphoneVolume: number
  noiseGateEnabled: boolean
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
  const { microphoneVolume, noiseGateEnabled } = props
  const inputSettingsRef = useLatest({ microphoneVolume, noiseGateEnabled })
  const inputProcessingRef = useRef<ReturnType<typeof createNoiseGatedVoiceStream> | null>(null)
  const { selectedInputId, micMuted, currentUserId, localVoiceStreamRef, localVoiceRawStreamRef, voiceNoiseGateStopRef, voiceActivityStopRef, localSpeakingRef, peerTransceiversRef, setLocalSpeaking, setParticipants, setAudioProcessingStatus, setAudioDeviceError, setWaitingMicMuted, stopMinutesSpeechRecognition, createVoiceEvent, broadcastSpeakingState } = props

  useEffect(() => {
    inputProcessingRef.current?.setVolume(microphoneVolume)
    inputProcessingRef.current?.setNoiseGateEnabled(noiseGateEnabled)
    if (inputProcessingRef.current) setAudioProcessingStatus((current) => ({ ...current, noiseGate: noiseGateEnabled }))
  }, [microphoneVolume, noiseGateEnabled, setAudioProcessingStatus])

  useEffect(() => {
    const resume = () => { void inputProcessingRef.current?.resume().catch(() => undefined) }
    window.addEventListener('pointerdown', resume)
    window.addEventListener('keydown', resume)
    return () => {
      window.removeEventListener('pointerdown', resume)
      window.removeEventListener('keydown', resume)
    }
  }, [])

  function stopVoiceNoiseGate() {
    voiceNoiseGateStopRef.current?.()
    voiceNoiseGateStopRef.current = null
    inputProcessingRef.current = null
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
    localVoiceRawStreamRef.current = rawStream
    await applyAudioProcessingConstraints(rawStream)
    stopVoiceNoiseGate()
    const settings = inputSettingsRef.current
    const noiseGate = createNoiseGatedVoiceStream(rawStream, settings.microphoneVolume, settings.noiseGateEnabled)
    inputProcessingRef.current = noiseGate
    const stream = noiseGate.stream
    voiceNoiseGateStopRef.current = noiseGate.stop
    localVoiceStreamRef.current = stream
    updateAudioProcessingStatus(rawStream, settings.noiseGateEnabled)
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
    const previousStream = localVoiceStreamRef.current
    const nextRawStream = await getUserMediaWithTimeout(getAudioConstraints(selectedInputId))
    const settings = inputSettingsRef.current
    let noiseGate: ReturnType<typeof createNoiseGatedVoiceStream> | null = null
    try {
      await applyAudioProcessingConstraints(nextRawStream)
      noiseGate = createNoiseGatedVoiceStream(nextRawStream, settings.microphoneVolume, settings.noiseGateEnabled)
      const nextStream = noiseGate.stream
      const [nextTrack] = nextStream.getAudioTracks()
      if (!nextTrack) throw new Error('선택한 마이크에 오디오 트랙이 없습니다.')
      nextTrack.enabled = !micMuted
      const changes = await Promise.allSettled(Array.from(peerTransceiversRef.current.values()).map(async ({ microphone }) => {
        microphone.sender.setStreams(nextStream)
        await microphone.sender.replaceTrack(nextTrack)
      }))
      const failed = changes.find((change) => change.status === 'rejected')
      if (failed?.status === 'rejected') throw failed.reason
    } catch (error) {
      // 새 장치 전환에 실패하면 통화 중인 기존 마이크와 게인을 유지한다.
      await Promise.all(Array.from(peerTransceiversRef.current.values()).map(async ({ microphone }) => {
        microphone.sender.setStreams(previousStream)
        await microphone.sender.replaceTrack(previousStream.getAudioTracks()[0] ?? null).catch(() => undefined)
      }))
      noiseGate?.stop()
      nextRawStream.getTracks().forEach((track) => track.stop())
      throw error
    }
    const nextStream = noiseGate.stream
    const oldTracks = new Set([
      ...(localVoiceRawStreamRef.current?.getTracks() ?? []),
      ...(localVoiceStreamRef.current?.getTracks() ?? []),
    ])
    stopVoiceNoiseGate()
    oldTracks.forEach((track) => track.stop())
    inputProcessingRef.current = noiseGate
    voiceNoiseGateStopRef.current = noiseGate.stop
    localVoiceRawStreamRef.current = nextRawStream
    localVoiceStreamRef.current = nextStream
    updateAudioProcessingStatus(nextRawStream, settings.noiseGateEnabled)
    startVoiceActivityMonitor(nextStream)
  }

  return { stopLocalVoiceStream, setLocalVoiceMuted, startLocalVoiceStreamIfAvailable, replaceLocalVoiceInput, updateAudioProcessingStatus }
}
