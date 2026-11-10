import { afterEach, describe, expect, it, vi } from 'vitest'
import { createNoiseGatedVoiceStream, createVoiceActivityMonitor, createVolumeControlledStream } from './meeting-media'

function audioGraph() {
  const nodes: Array<{ gain: { value: number; setValueAtTime: ReturnType<typeof vi.fn>; setTargetAtTime: ReturnType<typeof vi.fn> }; connect: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }> = []
  const stopTrack = vi.fn()
  const source = { connect: vi.fn(), disconnect: vi.fn() }
  const analyser = { fftSize: 2048, smoothingTimeConstant: 0, getByteTimeDomainData: vi.fn((data: Uint8Array) => {
    expect(data.length).toBe(analyser.fftSize)
    for (let i = 0; i < data.length; i++) data[i] = 128 + (i % 2 ? 1 : -1)
  }), disconnect: vi.fn() }
  const context = {
    currentTime: 0, createMediaStreamSource: vi.fn(() => source), createAnalyser: () => analyser,
    createGain: () => {
      const node = { gain: { value: 1, setValueAtTime: vi.fn(), setTargetAtTime: vi.fn() }, connect: vi.fn(), disconnect: vi.fn() }
      nodes.push(node)
      return node
    },
    createMediaStreamDestination: () => ({ stream: { getTracks: () => [{ stop: stopTrack }] } }),
    close: vi.fn().mockResolvedValue(undefined), resume: vi.fn().mockResolvedValue(undefined),
  }
  vi.stubGlobal('AudioContext', class { constructor() { return context } })
  let frame: FrameRequestCallback = () => undefined
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => { frame = callback; return 1 })
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined)
  return { nodes, context, source, analyser, stopTrack, tick: () => frame(0) }
}

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

describe('회의 실제 음량 처리 연결', () => {
  it('입력 음량 0의 무음을 발언으로 오인하지 않고 음성이 돌아오면 감지한다', () => {
    const graph = audioGraph()
    graph.analyser.getByteTimeDomainData.mockImplementation((data) => { data.fill(128) })
    const onSpeaking = vi.fn()
    const stop = createVoiceActivityMonitor({ getAudioTracks: () => [{ enabled: true, readyState: 'live' }] } as unknown as MediaStream, onSpeaking)
    for (let i = 0; i < 15; i++) graph.tick()
    expect(onSpeaking).not.toHaveBeenCalledWith(true)
    graph.analyser.getByteTimeDomainData.mockImplementation((data) => { for (let i = 0; i < data.length; i++) data[i] = 128 + (i % 2 ? 20 : -20) })
    for (let i = 0; i < 3; i++) graph.tick()
    expect(onSpeaking).toHaveBeenLastCalledWith(true)
    stop()
    expect(onSpeaking).toHaveBeenLastCalledWith(false)
  })
  it('기본 마이크는 작은 음성도 게이트 감쇠 없이 보내고 입력 증폭·선택 게이트를 실시간 조절한다', () => {
    const graph = audioGraph()
    const processing = createNoiseGatedVoiceStream({} as MediaStream, 150)
    expect(graph.source.connect).toHaveBeenCalledWith(graph.nodes[0])
    expect(graph.nodes[0].gain.value).toBe(1.5)
    for (let i = 0; i < 600; i++) graph.tick()
    expect(graph.nodes[1].gain.setTargetAtTime).toHaveBeenLastCalledWith(1, 0, 0.015)
    processing.setVolume(200)
    expect(graph.nodes[0].gain.setTargetAtTime).toHaveBeenLastCalledWith(2, 0, 0.015)
    processing.setNoiseGateEnabled(true)
    graph.tick()
    expect(graph.nodes[1].gain.setTargetAtTime).toHaveBeenLastCalledWith(0.08, 0, 0.08)
    processing.setNoiseGateEnabled(false)
    graph.tick()
    expect(graph.nodes[1].gain.setTargetAtTime).toHaveBeenLastCalledWith(1, 0, 0.015)
    processing.stop()
    expect(graph.stopTrack).toHaveBeenCalledOnce()
    expect(graph.context.close).toHaveBeenCalledOnce()
    expect(graph.source.disconnect).toHaveBeenCalledOnce()
  })

  it('전체×개인 음량의 4배 증폭과 0 음량을 지원하고 종료 시 원본 트랙은 소유하지 않는다', () => {
    const graph = audioGraph()
    const rawStop = vi.fn()
    const stream = { getTracks: () => [{ stop: rawStop }] } as unknown as MediaStream
    const processing = createVolumeControlledStream(stream, 400)
    expect(graph.nodes[0].gain.value).toBe(4)
    processing.setVolume(0)
    expect(graph.nodes[0].gain.setTargetAtTime).toHaveBeenCalledWith(0, 0, 0.015)
    processing.stop()
    expect(graph.stopTrack).toHaveBeenCalledOnce()
    expect(rawStop).not.toHaveBeenCalled()
  })
})
