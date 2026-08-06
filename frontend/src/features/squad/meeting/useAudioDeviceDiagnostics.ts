import { useEffect, useRef, useState } from 'react'
import {
  FALLBACK_AUDIO_INPUTS,
  FALLBACK_AUDIO_OUTPUTS,
  INITIAL_AUDIO_PROCESSING_STATUS,
  getUserMediaWithTimeout,
  useLatest,
} from './meeting-support'
import type { AudioDeviceOption, AudioProcessingStatus, SinkAudioElement } from './meeting-types'

type AudioDeviceDiagnosticsOptions = {
  accessToken?: string
  activeChannelId: number | null
  audioSettingsOpen: boolean
  isJoined: boolean
  waitingMicMuted: boolean
  applyAudioProcessingConstraints: (stream: MediaStream) => Promise<void>
  applySelectedOutputToAudio: (audio: SinkAudioElement, errorMessage?: string) => Promise<void>
  getAudioConstraints: (deviceId: string) => MediaStreamConstraints
  updateAudioProcessingStatus: (stream: MediaStream, noiseGate: boolean) => void
}

export function useAudioDeviceDiagnostics({
  accessToken,
  activeChannelId,
  audioSettingsOpen,
  isJoined,
  waitingMicMuted,
  applyAudioProcessingConstraints,
  applySelectedOutputToAudio,
  getAudioConstraints,
  updateAudioProcessingStatus,
}: AudioDeviceDiagnosticsOptions) {
  const [audioInputs, setAudioInputs] = useState<AudioDeviceOption[]>(FALLBACK_AUDIO_INPUTS)
  const [audioOutputs, setAudioOutputs] = useState<AudioDeviceOption[]>(FALLBACK_AUDIO_OUTPUTS)
  const [selectedInputId, setSelectedInputId] = useState(FALLBACK_AUDIO_INPUTS[0].deviceId)
  const [selectedOutputId, setSelectedOutputId] = useState(FALLBACK_AUDIO_OUTPUTS[0].deviceId)
  const [audioDeviceError, setAudioDeviceError] = useState<string | null>(null)
  const [audioProcessingStatus, setAudioProcessingStatus] = useState<AudioProcessingStatus>(INITIAL_AUDIO_PROCESSING_STATUS)
  const [micLevel, setMicLevel] = useState(0)
  const [speakerLevel, setSpeakerLevel] = useState(0)
  const [micTesting, setMicTesting] = useState(false)
  const [soundTesting, setSoundTesting] = useState(false)
  const micStreamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const micLoopbackAudioRef = useRef<SinkAudioElement | null>(null)
  const soundTestAudioRef = useRef<SinkAudioElement | null>(null)
  const soundTestContextRef = useRef<AudioContext | null>(null)
  const soundTestOscillatorRef = useRef<OscillatorNode | null>(null)
  const soundTestGainRef = useRef<GainNode | null>(null)
  const speakerMeterIntervalRef = useRef<number | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const applyAudioProcessingConstraintsRef = useLatest(applyAudioProcessingConstraints)
  const applySelectedOutputToAudioRef = useLatest(applySelectedOutputToAudio)
  const getAudioConstraintsRef = useLatest(getAudioConstraints)
  const updateAudioProcessingStatusRef = useLatest(updateAudioProcessingStatus)
  const loadAudioDevicesRef = useLatest(loadAudioDevices)
  const stopMicMonitorRef = useLatest(stopMicMonitor)
  const startMicMonitorRef = useLatest(startMicMonitor)

  useEffect(() => {
    const stopCurrentMicMonitor = stopMicMonitorRef.current
    void loadAudioDevicesRef.current(false)

    function handleDeviceChange() {
      void loadAudioDevicesRef.current(false)
    }

    navigator.mediaDevices?.addEventListener?.('devicechange', handleDeviceChange)
    return () => {
      navigator.mediaDevices?.removeEventListener?.('devicechange', handleDeviceChange)
      stopCurrentMicMonitor()
      stopSoundTest()
    }
  }, [loadAudioDevicesRef, stopMicMonitorRef])

  useEffect(() => {
    if (!audioSettingsOpen) {
      stopSoundTest()
    }
  }, [audioSettingsOpen])

  useEffect(() => {
    const testAudios = [micLoopbackAudioRef.current, soundTestAudioRef.current]
    void Promise.all(
      testAudios
        .filter((audio): audio is SinkAudioElement => audio != null)
        .map((audio) => applySelectedOutputToAudioRef.current(audio, '선택한 스피커로 테스트 출력을 전환하지 못했습니다.')),
    )
  }, [applySelectedOutputToAudioRef, selectedOutputId])

  useEffect(() => {
    const stopCurrentMicMonitor = stopMicMonitorRef.current

    if (!accessToken || !activeChannelId) {
      stopCurrentMicMonitor()
      return
    }

    const shouldMonitorMic = audioSettingsOpen || (!isJoined && !waitingMicMuted)
    if (!shouldMonitorMic) {
      stopCurrentMicMonitor()
      return
    }

    let stopped = false
    void loadAudioDevicesRef.current(true).then(() => {
      if (!stopped) {
        void startMicMonitorRef.current(selectedInputId)
      }
    })

    return () => {
      stopped = true
      stopCurrentMicMonitor()
    }
  }, [accessToken, activeChannelId, audioSettingsOpen, isJoined, loadAudioDevicesRef, selectedInputId, startMicMonitorRef, stopMicMonitorRef, waitingMicMuted])

  function toDeviceOption(device: MediaDeviceInfo, index: number, fallbackLabel: string): AudioDeviceOption {
    return {
      deviceId: device.deviceId || 'default',
      label: device.label || `${fallbackLabel} ${index + 1}`,
    }
  }

  async function loadAudioDevices(requestPermission: boolean) {
    if (!navigator.mediaDevices?.enumerateDevices) {
      setAudioInputs(FALLBACK_AUDIO_INPUTS)
      setAudioOutputs(FALLBACK_AUDIO_OUTPUTS)
      setAudioDeviceError('이 브라우저에서는 오디오 장치 목록을 가져올 수 없습니다.')
      return
    }

    let permissionStream: MediaStream | null = null
    try {
      if (requestPermission) {
        permissionStream = await getUserMediaWithTimeout({ audio: true })
      }

      const devices = await navigator.mediaDevices.enumerateDevices()
      const nextInputs = devices
        .filter((device) => device.kind === 'audioinput')
        .map((device, index) => toDeviceOption(device, index, '마이크'))
      const nextOutputs = devices
        .filter((device) => device.kind === 'audiooutput')
        .map((device, index) => toDeviceOption(device, index, '스피커'))
      const normalizedInputs = nextInputs.length > 0 ? nextInputs : FALLBACK_AUDIO_INPUTS
      const normalizedOutputs = nextOutputs.length > 0 ? nextOutputs : FALLBACK_AUDIO_OUTPUTS

      setAudioInputs(normalizedInputs)
      setAudioOutputs(normalizedOutputs)
      setSelectedInputId((current) => normalizedInputs.some((device) => device.deviceId === current) ? current : normalizedInputs[0].deviceId)
      setSelectedOutputId((current) => normalizedOutputs.some((device) => device.deviceId === current) ? current : normalizedOutputs[0].deviceId)
      setAudioDeviceError(null)
    } catch {
      setAudioInputs(FALLBACK_AUDIO_INPUTS)
      setAudioOutputs(FALLBACK_AUDIO_OUTPUTS)
      setAudioDeviceError('마이크 권한을 허용해야 실제 PC 오디오 장치명이 표시됩니다.')
    } finally {
      permissionStream?.getTracks().forEach((track) => track.stop())
    }
  }

  function stopMicMonitor() {
    if (animationFrameRef.current != null) {
      window.cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    stopMicLoopback()
    micStreamRef.current?.getTracks().forEach((track) => track.stop())
    micStreamRef.current = null
    void audioContextRef.current?.close().catch(() => undefined)
    audioContextRef.current = null
    setMicLevel(0)
  }

  function stopMicLoopback() {
    if (!micLoopbackAudioRef.current) {
      setMicTesting(false)
      return
    }

    micLoopbackAudioRef.current.pause()
    micLoopbackAudioRef.current.srcObject = null
    micLoopbackAudioRef.current = null
    setMicTesting(false)
  }

  function stopSoundTest() {
    if (speakerMeterIntervalRef.current != null) {
      window.clearInterval(speakerMeterIntervalRef.current)
      speakerMeterIntervalRef.current = null
    }

    try {
      soundTestOscillatorRef.current?.stop()
    } catch {
      // The oscillator may already be stopped when cleanup runs after a failed start.
    }

    soundTestOscillatorRef.current?.disconnect()
    soundTestGainRef.current?.disconnect()
    soundTestAudioRef.current?.pause()
    if (soundTestAudioRef.current) {
      soundTestAudioRef.current.srcObject = null
    }

    void soundTestContextRef.current?.close().catch(() => undefined)
    soundTestAudioRef.current = null
    soundTestContextRef.current = null
    soundTestOscillatorRef.current = null
    soundTestGainRef.current = null
    setSpeakerLevel(0)
    setSoundTesting(false)
  }

  async function startMicLoopback(stream = micStreamRef.current) {
    if (!stream) {
      setAudioDeviceError('마이크 테스트를 시작할 수 없습니다. 입력 장치를 다시 확인해 주세요.')
      return
    }

    stopMicLoopback()
    try {
      const audio = new Audio() as SinkAudioElement
      audio.srcObject = stream
      audio.autoplay = true
      audio.volume = 0.85
      micLoopbackAudioRef.current = audio
      await applySelectedOutputToAudioRef.current(audio, '선택한 스피커로 마이크 테스트 출력을 전환하지 못했습니다.')
      await audio.play()
      setMicTesting(true)
      setAudioDeviceError(null)
    } catch {
      stopMicLoopback()
      setAudioDeviceError('마이크 테스트 소리를 재생하지 못했습니다. 브라우저 권한과 출력 장치를 확인해 주세요.')
    }
  }

  async function toggleMicTest() {
    if (micTesting) {
      stopMicLoopback()
      return
    }

    if (!micStreamRef.current) {
      await startMicMonitor(selectedInputId)
    }
    await startMicLoopback()
  }

  async function playSoundTest() {
    if (soundTesting || soundTestAudioRef.current) {
      stopSoundTest()
      return
    }

    const AudioContextClass = window.AudioContext
      || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) {
      setAudioDeviceError('이 브라우저에서는 스피커 테스트를 지원하지 않습니다.')
      return
    }

    stopSoundTest()
    try {
      const testAudioContext = new AudioContextClass()
      const oscillator = testAudioContext.createOscillator()
      const gain = testAudioContext.createGain()
      const destination = testAudioContext.createMediaStreamDestination()
      const audio = new Audio() as SinkAudioElement
      oscillator.type = 'sine'
      oscillator.frequency.value = 880
      gain.gain.setValueAtTime(0.11, testAudioContext.currentTime)
      oscillator.connect(gain)
      gain.connect(destination)
      audio.srcObject = destination.stream
      audio.autoplay = true
      audio.volume = 0.85
      soundTestAudioRef.current = audio
      soundTestContextRef.current = testAudioContext
      soundTestOscillatorRef.current = oscillator
      soundTestGainRef.current = gain
      await applySelectedOutputToAudioRef.current(audio, '선택한 스피커로 테스트음을 전환하지 못했습니다.')
      oscillator.start()
      await audio.play()
      setSoundTesting(true)
      setSpeakerLevel(80)
      speakerMeterIntervalRef.current = window.setInterval(() => {
        setSpeakerLevel((current) => (current > 65 ? 42 : 82))
      }, 500)
      setAudioDeviceError(null)
    } catch {
      stopSoundTest()
      setAudioDeviceError('스피커 테스트음을 재생하지 못했습니다. 브라우저 권한과 출력 장치를 확인해 주세요.')
    }
  }

  async function startMicMonitor(deviceId: string) {
    if (!navigator.mediaDevices?.getUserMedia) {
      setAudioDeviceError('이 브라우저에서는 마이크 입력을 테스트할 수 없습니다.')
      return
    }

    stopMicMonitor()
    try {
      const stream = await getUserMediaWithTimeout(getAudioConstraintsRef.current(deviceId))
      await applyAudioProcessingConstraintsRef.current(stream)
      updateAudioProcessingStatusRef.current(stream, audioProcessingStatus.noiseGate)
      const AudioContextClass = window.AudioContext
        || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AudioContextClass) {
        stream.getTracks().forEach((track) => track.stop())
        setAudioDeviceError('이 브라우저에서는 마이크 레벨 테스트를 지원하지 않습니다.')
        return
      }

      const audioContext = new AudioContextClass()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      const data = new Uint8Array(analyser.frequencyBinCount)
      let ambientRms = 0.006
      let peakSignal = 0.035
      let smoothedMeterLevel = 0
      analyser.fftSize = 256
      source.connect(analyser)
      micStreamRef.current = stream
      audioContextRef.current = audioContext

      function tick() {
        analyser.getByteTimeDomainData(data)
        let mean = 0
        for (const value of data) mean += value
        mean /= data.length

        let sum = 0
        for (const value of data) {
          const normalized = (value - mean) / 128
          sum += normalized * normalized
        }

        const rms = Math.sqrt(sum / data.length)
        const ambientSample = Math.min(rms, ambientRms + 0.012)
        ambientRms = ambientRms * 0.97 + ambientSample * 0.03
        const signal = Math.max(0, rms - ambientRms * 1.35)
        peakSignal = Math.max(0.035, signal, peakSignal * 0.985)
        const nextMeterLevel = Math.max(0, Math.min(100, Math.round((signal / peakSignal) * 100)))
        smoothedMeterLevel = smoothedMeterLevel * 0.72 + nextMeterLevel * 0.28
        setMicLevel(Math.round(smoothedMeterLevel))
        animationFrameRef.current = window.requestAnimationFrame(tick)
      }

      tick()
      if (micTesting) {
        await startMicLoopback(stream)
      }
      setAudioDeviceError(null)
    } catch {
      setAudioDeviceError('선택한 마이크를 열 수 없습니다. 브라우저 권한과 장치 연결 상태를 확인해 주세요.')
    }
  }

  return {
    audioInputs,audioOutputs,selectedInputId,setSelectedInputId,selectedOutputId,setSelectedOutputId,
    audioDeviceError,setAudioDeviceError,audioProcessingStatus,setAudioProcessingStatus,
    micLevel,speakerLevel,micTesting,soundTesting,
    loadAudioDevices,stopMicMonitor,stopSoundTest,toggleMicTest,playSoundTest,startMicMonitor,
  }
}
