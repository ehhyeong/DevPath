import { useEffect, useRef, useState, type MutableRefObject } from 'react'
import { createVolumeControlledStream } from './meeting-media'
import { useLatest } from './meeting-support'
import type { SinkAudioElement } from './meeting-types'

export type ParticipantAudioSettings = { volume: number; muted: boolean }
type Preferences = { microphoneVolume: number; outputVolume: number; noiseGateEnabled: boolean; participants: Record<number, ParticipantAudioSettings> }
const DEFAULT_PARTICIPANT: ParticipantAudioSettings = { volume: 100, muted: false }
const defaults = (): Preferences => ({ microphoneVolume: 100, outputVolume: 100, noiseGateEnabled: false, participants: {} })
const clampVolume = (value: number) => Number.isFinite(value) ? Math.max(0, Math.min(200, Math.round(value))) : 100

function readPreferences(key: string): Preferences {
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? 'null')
    if (!saved || typeof saved !== 'object') return defaults()
    const participants: Preferences['participants'] = {}
    for (const [id, value] of Object.entries(saved.participants ?? {})) {
      const setting = value as ParticipantAudioSettings | null
      if (setting && Number.isSafeInteger(Number(id)) && Number(id) > 0) participants[Number(id)] = { volume: clampVolume(setting.volume), muted: setting.muted === true }
    }
    return { microphoneVolume: clampVolume(saved.microphoneVolume), outputVolume: clampVolume(saved.outputVolume), noiseGateEnabled: saved.noiseGateEnabled === true, participants }
  } catch {
    return defaults()
  }
}

export function useMeetingAudioControls(userId: number | null | undefined, remoteMutedRef: MutableRefObject<boolean>) {
  const key = `devpath.meeting.audio.${userId ?? 'guest'}`
  const [stored, setStored] = useState(() => ({ key, preferences: readPreferences(key) }))
  if (stored.key !== key) setStored({ key, preferences: readPreferences(key) })
  const preferences = stored.preferences
  const preferencesRef = useLatest(preferences)
  const playbacks = useRef(new Map<number, { audio: SinkAudioElement; decoder: HTMLAudioElement; processing: ReturnType<typeof createVolumeControlledStream> | null }>())

  function applyPlayback(id: number) {
    const playback = playbacks.current.get(id)
    if (!playback) return
    const current = preferencesRef.current
    const participant = current.participants[id] ?? DEFAULT_PARTICIPANT
    const volume = current.outputVolume * participant.volume / 100
    playback.audio.muted = remoteMutedRef.current || participant.muted
    if (playback.processing) playback.processing.setVolume(volume)
    else playback.audio.volume = Math.min(1, volume / 100)
  }
  const applyPlaybackRef = useLatest(applyPlayback)
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(preferences)) } catch { /* 저장 공간이 막혀도 현재 통화의 음량은 조절한다. */ }
    playbacks.current.forEach((_, id) => applyPlaybackRef.current(id))
  }, [key, preferences, applyPlaybackRef])

  function updatePreferences(update: (current: Preferences) => Preferences) {
    setStored((current) => ({ key, preferences: update(current.key === key ? current.preferences : readPreferences(key)) }))
  }
  function detachRemoteAudio(id: number) {
    const playback = playbacks.current.get(id)
    playback?.processing?.stop()
    if (playback) { playback.decoder.pause(); playback.decoder.srcObject = null }
    playbacks.current.delete(id)
  }
  function attachRemoteAudio(id: number, stream: MediaStream, audio: SinkAudioElement) {
    detachRemoteAudio(id)
    // Chromium은 원격 스트림을 HTML 오디오에 직접 연결해야 디코딩을 시작한다.
    // 원본은 음소거하고 별도 게인을 거친 소리만 재생해 중복 출력과 개인 음소거 우회를 막는다.
    const decoder = document.createElement('audio')
    decoder.autoplay = true
    decoder.muted = true
    decoder.srcObject = stream
    void decoder.play().catch(() => undefined)
    let processing: ReturnType<typeof createVolumeControlledStream> | null = null
    try { processing = createVolumeControlledStream(stream) } catch {
      // Web Audio 미지원 시에도 원본 통화를 유지하며 HTML 오디오 범위(0~100%)로 조절한다.
    }
    audio.volume = 1
    audio.srcObject = processing?.stream ?? stream
    playbacks.current.set(id, { audio, decoder, processing })
    applyPlayback(id)
  }
  function stopRemoteAudio() {
    Array.from(playbacks.current.keys()).forEach(detachRemoteAudio)
  }
  const stopRemoteAudioRef = useLatest(stopRemoteAudio)
  useEffect(() => () => stopRemoteAudioRef.current(), [stopRemoteAudioRef])

  function resumeRemoteAudio() {
    playbacks.current.forEach((playback, id) => {
      applyPlayback(id)
      void playback.processing?.resume().catch(() => undefined)
      void playback.decoder.play().catch(() => undefined)
      void playback.audio.play().catch(() => undefined)
    })
  }

  return {
    ...preferences,
    setMicrophoneVolume: (volume: number) => updatePreferences((current) => ({ ...current, microphoneVolume: clampVolume(volume) })),
    setOutputVolume: (volume: number) => updatePreferences((current) => ({ ...current, outputVolume: clampVolume(volume) })),
    setNoiseGateEnabled: (enabled: boolean) => updatePreferences((current) => ({ ...current, noiseGateEnabled: enabled })),
    getParticipantAudio: (id: number) => preferences.participants[id] ?? DEFAULT_PARTICIPANT,
    setParticipantAudio: (id: number, settings: ParticipantAudioSettings) => updatePreferences((current) => ({ ...current, participants: { ...current.participants, [id]: { volume: clampVolume(settings.volume), muted: settings.muted } } })),
    attachRemoteAudio, detachRemoteAudio, stopRemoteAudio, resumeRemoteAudio,
  }
}

export type MeetingAudioControls = ReturnType<typeof useMeetingAudioControls>
