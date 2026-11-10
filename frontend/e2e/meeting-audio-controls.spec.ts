import { expect, test, type WebSocketRoute } from '@playwright/test'
import { readFileSync } from 'node:fs'

const design = JSON.parse(readFileSync(new URL('../../src/main/resources/demo/workspace/routinecare-design.json', import.meta.url), 'utf8'))
type AudioTestWindow = Window & {
  audioTest: {
    peer: RTCPeerConnection
    context: AudioContext
    inputStream?: MediaStream
    receive: (message: { type: string; payload: RTCSessionDescriptionInit | RTCIceCandidateInit }) => Promise<void>
    measure: (kind: 'input' | 'output') => number
  }
  sendAudioSignal: (message: unknown) => Promise<void>
}

test.use({ viewport: { width: 1440, height: 900 } })

test('실제 WebRTC 음성에서 입력·전체·개인 증폭과 우클릭 음소거·설정 보존을 검증한다', async ({ page }, testInfo) => {
  test.setTimeout(90_000)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  let signaling: WebSocketRoute | undefined
  await page.exposeFunction('sendAudioSignal', (message: object) => signaling!.send(JSON.stringify(message)))
  await page.addInitScript(() => {
    const exp = Math.floor(Date.now() / 1000) + 3600
    const claims = btoa(JSON.stringify({ sub: '7', role: 'ROLE_LEARNER', exp }))
    localStorage.setItem('devpath.auth.session', JSON.stringify({ tokenType: 'Bearer', accessToken: `test.${claims}.test`, refreshToken: 'test-only', name: '김학습', userId: 7, role: 'ROLE_LEARNER', exp, storage: 'local' }))
    const state = window as AudioTestWindow
    const context = new AudioContext()
    function tone(frequency: number) {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      const destination = context.createMediaStreamDestination()
      oscillator.frequency.value = frequency
      gain.gain.value = 0.03
      oscillator.connect(gain)
      gain.connect(destination)
      oscillator.start()
      return destination.stream
    }
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: async () => { await context.resume(); return tone(440) } })
    const peer = new RTCPeerConnection({ iceServers: [] })
    const remoteTone = tone(660)
    peer.addTrack(remoteTone.getAudioTracks()[0], remoteTone)
    peer.onicecandidate = (event) => { if (event.candidate) void state.sendAudioSignal({ type: 'ice-candidate', fromUserId: 8, payload: event.candidate.toJSON() }) }
    peer.ontrack = (event) => {
      if (event.track.kind !== 'audio') return
      state.audioTest.inputStream = new MediaStream([event.track])
      const decoder = document.createElement('audio')
      decoder.muted = true
      decoder.srcObject = state.audioTest.inputStream
      void decoder.play()
    }
    const probes = new Map<string, AnalyserNode>()
    state.audioTest = {
      peer, context,
      receive: async (message) => {
        if (message.type === 'offer') {
          await peer.setRemoteDescription(message.payload as RTCSessionDescriptionInit)
          await peer.setLocalDescription(await peer.createAnswer())
          await state.sendAudioSignal({ type: 'answer', fromUserId: 8, fromUserName: '박주승', payload: peer.localDescription!.toJSON() })
        } else if (message.type === 'ice-candidate') await peer.addIceCandidate(message.payload as RTCIceCandidateInit)
      },
      measure: (kind) => {
        if (!probes.has(kind)) {
          const stream = kind === 'output' ? document.querySelector<HTMLAudioElement>('audio[data-voice-peer-id="8"]')?.srcObject : state.audioTest.inputStream
          if (!(stream instanceof MediaStream)) return 0
          const analyser = context.createAnalyser()
          analyser.fftSize = 4096
          context.createMediaStreamSource(stream).connect(analyser)
          const silent = context.createGain()
          silent.gain.value = 0
          analyser.connect(silent)
          silent.connect(context.destination)
          probes.set(kind, analyser)
        }
        const analyser = probes.get(kind)!
        const data = new Float32Array(analyser.fftSize)
        analyser.getFloatTimeDomainData(data)
        return Math.sqrt(data.reduce((sum, value) => sum + value * value, 0) / data.length)
      },
    }
  })
  await page.routeWebSocket('**/ws/voice-signaling**', (socket) => {
    signaling = socket
    socket.onMessage(async (raw) => {
      const message = JSON.parse(String(raw))
      if (['offer', 'ice-candidate'].includes(message.type)) await page.evaluate((signal) => (window as AudioTestWindow).audioTest.receive(signal), message)
    })
  })
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    if (!path.startsWith('/api/')) return route.continue()
    let data: unknown = []
    if (path === '/api/workspaces/hub/projects/42/ai-design') data = { workspaceId: 42, design, demoWorkspace: true }
    else if (path === '/api/workspaces/42/dashboard') data = { workspaceId: 42, name: design.title, type: 'SQUAD', status: 'ACTIVE', ownerId: 7, members: [], unresolvedTaskCount: 0 }
    else if (path === '/api/workspaces/42/voice-channels') data = [{ channelId: 11, workspaceId: 42, name: '화상 회의', activeParticipantCount: 2 }]
    else if (path === '/api/voice-channels/11/participants') data = [
      { participantId: 1, channelId: 11, userId: 7, userName: '김학습', active: true, muted: false, speaking: false },
      { participantId: 2, channelId: 11, userId: 8, userName: '박주승', active: true, muted: false, speaking: false },
    ]
    else if (path === '/api/voice-channels/11/minutes') data = { channelId: 11, recording: false, transcript: '' }
    await route.fulfill({ json: { success: true, data } })
  })

  await page.goto('/squad-meeting?workspaceId=42&ai=1')
  const tile = page.locator('.meeting-participant-card[data-participant-id="2"]')
  await expect(tile).toBeVisible()
  await page.getByRole('button', { name: '박주승 오디오 설정 열기' }).click()
  await expect.poll(() => Boolean(signaling)).toBe(true)
  signaling!.send(JSON.stringify({ type: 'peer-list', peers: [{ userId: 8, userName: '박주승' }] }))
  const remoteAudio = page.locator('audio[data-voice-peer-id="8"]')
  await expect(remoteAudio).toHaveCount(1)
  const measure = (kind: 'input' | 'output') => page.evaluate((direction) => (window as AudioTestWindow).audioTest.measure(direction), kind)
  try {
    await expect.poll(() => measure('output')).toBeGreaterThan(0.01)
  } catch (error) {
    const diagnostics = await page.evaluate(async () => {
      const state = (window as AudioTestWindow).audioTest
      const audio = document.querySelector<HTMLAudioElement>('audio[data-voice-peer-id="8"]')
      const stats = await state.peer.getStats()
      return { context: state.context.state, connection: state.peer.connectionState, ice: state.peer.iceConnectionState, audio: audio ? { paused: audio.paused, muted: audio.muted, time: audio.currentTime, tracks: (audio.srcObject as MediaStream)?.getTracks().map((track) => ({ kind: track.kind, ready: track.readyState, muted: track.muted, enabled: track.enabled })) } : null, stats: Array.from(stats.values()).filter((stat) => ['outbound-rtp', 'inbound-rtp', 'transport'].includes(stat.type)) }
    })
    console.log(JSON.stringify({ diagnostics, errors }))
    throw error
  }
  await expect.poll(() => measure('input')).toBeGreaterThan(0.01)
  const baseOutput = await measure('output')
  const baseInput = await measure('input')
  const menu = page.getByRole('dialog', { name: '박주승 오디오 설정' })
  await menu.getByRole('spinbutton', { name: '개인 음량 수치' }).fill('160')
  await expect.poll(async () => (await measure('output')) / baseOutput).toBeGreaterThan(1.45)
  await page.screenshot({ path: testInfo.outputPath('participant-audio-menu.png') })
  await page.keyboard.press('Escape')
  await expect(menu).toHaveCount(0)

  await page.getByRole('button', { name: '김학습 오디오 설정 열기' }).click()
  const settings = page.getByRole('dialog', { name: '오디오 설정', exact: true })
  await expect(settings.getByRole('checkbox', { name: '노이즈 게이트 사용' })).not.toBeChecked()
  await settings.getByRole('spinbutton', { name: '마이크 입력 음량 수치' }).fill('180')
  await settings.getByRole('spinbutton', { name: '전체 듣기 음량 수치' }).fill('150')
  await expect.poll(async () => (await measure('output')) / baseOutput).toBeGreaterThan(2.2)
  await expect.poll(async () => (await measure('output')) / baseOutput).toBeLessThan(2.6)
  await expect.poll(async () => (await measure('input')) / baseInput).toBeGreaterThan(1.5)
  await expect.poll(async () => (await measure('input')) / baseInput).toBeLessThan(2.1)
  await settings.getByRole('spinbutton', { name: '마이크 입력 음량 수치' }).fill('0')
  await expect.poll(() => measure('input')).toBeLessThan(0.001)
  await settings.getByRole('spinbutton', { name: '마이크 입력 음량 수치' }).fill('180')
  await page.screenshot({ path: testInfo.outputPath('meeting-audio-settings.png') })
  await settings.getByRole('button', { name: '설정 적용', exact: true }).click()
  await expect(settings).toHaveCount(0)
  await expect.poll(async () => (await measure('input')) / baseInput).toBeGreaterThan(1.5)
  await tile.click({ button: 'right' })
  await menu.getByRole('button', { name: '내게만 음소거', exact: true }).click()
  await expect(remoteAudio).toHaveJSProperty('muted', true)
  await expect(tile.getByLabel('내게 음소거됨')).toBeVisible()
  await menu.getByRole('button', { name: '내게만 음소거 해제' }).click()
  await menu.getByRole('spinbutton', { name: '개인 음량 수치' }).fill('0')
  await expect.poll(() => measure('output')).toBeLessThan(0.001)
  await menu.getByRole('button', { name: '개인 음량 초기화' }).click()
  await expect(menu.getByRole('slider', { name: '개인 음량' })).toHaveValue('100')
  await page.reload()
  await page.getByRole('button', { name: '김학습 오디오 설정 열기' }).click()
  await expect(settings.getByRole('slider', { name: '마이크 입력 음량' })).toHaveValue('180')
  await expect(settings.getByRole('slider', { name: '전체 듣기 음량' })).toHaveValue('150')
})
