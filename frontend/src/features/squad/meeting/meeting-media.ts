import type { AudioProcessingStatus } from './meeting-types'

type AudioContextWindow = Window & { webkitAudioContext?: typeof AudioContext }

function getAudioContextClass() {
  return window.AudioContext || (window as AudioContextWindow).webkitAudioContext
}

export function getAudioConstraints(deviceId: string): MediaStreamConstraints {
  const baseConstraints: MediaTrackConstraints = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  }

  return {
    audio: deviceId && deviceId !== 'default'
      ? { ...baseConstraints,deviceId: { exact: deviceId } }
      : baseConstraints,
  }
}

export function getCameraConstraints(): MediaStreamConstraints {
  return {
    audio: false,
    video: { width: { ideal: 1280 },height: { ideal: 720 },facingMode: 'user' },
  }
}

export async function applyAudioProcessingConstraints(stream: MediaStream) {
  await Promise.all(stream.getAudioTracks().map((track) => track.applyConstraints({
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  }).catch(() => undefined)))
}

export function readAudioProcessingStatus(stream: MediaStream, noiseGate: boolean): AudioProcessingStatus {
  const settings = stream.getAudioTracks()[0]?.getSettings() as MediaTrackSettings & {
    echoCancellation?: boolean
    noiseSuppression?: boolean
    autoGainControl?: boolean
  }

  return {
    echoCancellation: settings.echoCancellation ?? null,
    noiseSuppression: settings.noiseSuppression ?? null,
    autoGainControl: settings.autoGainControl ?? null,
    noiseGate,
  }
}

export function createNoiseGatedVoiceStream(rawStream: MediaStream) {
  const AudioContextClass = getAudioContextClass()
  if (!AudioContextClass) return { stream: rawStream,stop: () => undefined }

  const audioContext = new AudioContextClass()
  const source = audioContext.createMediaStreamSource(rawStream)
  const analyser = audioContext.createAnalyser()
  const gate = audioContext.createGain()
  const destination = audioContext.createMediaStreamDestination()
  const data = new Uint8Array(analyser.frequencyBinCount)
  let ambientRms = 0.006
  let frameId: number | null = null

  analyser.fftSize = 512
  analyser.smoothingTimeConstant = 0.65
  gate.gain.setValueAtTime(1, audioContext.currentTime)
  source.connect(analyser)
  source.connect(gate)
  gate.connect(destination)

  function tick() {
    analyser.getByteTimeDomainData(data)
    const mean = data.reduce((sum, value) => sum + value, 0) / data.length
    const sum = data.reduce((total, value) => {
      const normalized = (value - mean) / 128
      return total + normalized * normalized
    }, 0)
    const rms = Math.sqrt(sum / data.length)
    const ambientSample = Math.min(rms, ambientRms + 0.008)
    ambientRms = ambientRms * 0.985 + ambientSample * 0.015
    const targetGain = rms > Math.max(0.014, ambientRms * 2.3) ? 1 : 0.08
    gate.gain.setTargetAtTime(targetGain, audioContext.currentTime, targetGain === 1 ? 0.015 : 0.08)
    frameId = window.requestAnimationFrame(tick)
  }

  tick()

  return {
    stream: destination.stream,
    stop: () => {
      if (frameId != null) window.cancelAnimationFrame(frameId)
      frameId = null
      void audioContext.close().catch(() => undefined)
    },
  }
}

export function createVoiceActivityMonitor(stream: MediaStream, onSpeakingChange: (speaking: boolean) => void) {
  const AudioContextClass = getAudioContextClass()
  if (!AudioContextClass) return () => undefined

  const audioContext = new AudioContextClass()
  const source = audioContext.createMediaStreamSource(stream)
  const analyser = audioContext.createAnalyser()
  const data = new Uint8Array(analyser.frequencyBinCount)
  let ambientLevel = 3
  let speechFrames = 0
  let silentFrames = 0
  let frameId: number | null = null

  analyser.fftSize = 512
  analyser.smoothingTimeConstant = 0.75
  source.connect(analyser)

  function tick() {
    const hasEnabledTrack = stream.getAudioTracks().some((track) => track.enabled && track.readyState === 'live')
    if (!hasEnabledTrack) {
      onSpeakingChange(false)
      frameId = window.requestAnimationFrame(tick)
      return
    }

    analyser.getByteTimeDomainData(data)
    const sum = data.reduce((total, value) => {
      const normalized = (value - 128) / 128
      return total + normalized * normalized
    }, 0)
    const level = Math.round(Math.sqrt(sum / data.length) * 240)
    const threshold = Math.max(10, Math.min(42, ambientLevel * 2.6 + 6))
    ambientLevel = ambientLevel * 0.96 + Math.min(level, threshold) * 0.04

    if (level >= threshold) {
      speechFrames += 1
      silentFrames = 0
      if (speechFrames >= 3) onSpeakingChange(true)
    } else {
      speechFrames = 0
      silentFrames += 1
      if (silentFrames >= 12) onSpeakingChange(false)
    }

    frameId = window.requestAnimationFrame(tick)
  }

  tick()

  return () => {
    if (frameId != null) window.cancelAnimationFrame(frameId)
    frameId = null
    void audioContext.close().catch(() => undefined)
    onSpeakingChange(false)
  }
}
