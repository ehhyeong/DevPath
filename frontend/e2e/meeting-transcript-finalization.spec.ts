import { expect, test, type Page, type WebSocketRoute } from '@playwright/test'

async function setupRoom(page: Page, localSpeaker: boolean) {
  let signaling: WebSocketRoute | undefined
  let minutes = { channelId: 11, recording: false, transcript: '', summary: '' }
  const summaries: string[] = []
  const appends: string[] = []
  const transcriptReplacements: string[] = []
  const participant = { participantId: 1, channelId: 11, userId: 7, userName: '진행자', active: true, muted: !localSpeaker, speaking: false }
  await page.addInitScript(({ localSpeaker }) => {
    const exp = 4102444800
    const claims = btoa(JSON.stringify({ sub: '7', role: 'ROLE_LEARNER', exp }))
    localStorage.setItem('devpath.auth.session', JSON.stringify({ tokenType: 'Bearer', accessToken: `test.${claims}.test`, refreshToken: 'test-only', name: '진행자', userId: 7, role: 'ROLE_LEARNER', exp, storage: 'local' }))
    if (!localSpeaker) return
    const audio = new AudioContext()
    const destination = audio.createMediaStreamDestination()
    navigator.mediaDevices.getUserMedia = async () => destination.stream
    let emitInterim: ((text: string) => void) | undefined
    class Recognition extends EventTarget {
      lang = ''
      continuous = false
      interimResults = false
      onresult: ((event: Event) => void) | null = null
      onend: (() => void) | null = null
      onerror: (() => void) | null = null
      text = ''
      start() { emitInterim = text => this.emit(text, false); document.documentElement.dataset.speechReady = 'true' }
      stop() {
        const text = this.text
        setTimeout(() => { this.emit(text, true); this.onend?.() }, 80)
      }
      abort() { this.onend?.() }
      emit(text: string, isFinal: boolean) {
        this.text = isFinal ? '' : text
        this.onresult?.(Object.assign(new Event('result'), { resultIndex: 0, results: [Object.assign([{ transcript: text }], { isFinal })] }))
      }
    }
    Object.defineProperty(window, 'SpeechRecognition', { value: Recognition })
    window.addEventListener('test-meeting-speech', event => emitInterim?.((event as CustomEvent<string>).detail))
  }, { localSpeaker })
  await page.routeWebSocket('**/ws/voice-signaling**', socket => { signaling = socket })
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    if (!path.startsWith('/api/')) return route.continue()
    let data: unknown = []
    if (path === '/api/workspaces/42/dashboard') data = { workspaceId: 42, name: '기록 보존 회의', type: 'SQUAD', status: 'ACTIVE', ownerId: 7, members: [{ memberId: 1, learnerId: 7, learnerName: '진행자' }], unresolvedTaskCount: 0 }
    else if (path === '/api/workspaces/42/voice-channels') data = [{ channelId: 11, workspaceId: 42, name: '음성 회의', activeParticipantCount: 2 }]
    else if (path === '/api/voice-channels/11/participants') data = [participant, { participantId: 2, channelId: 11, userId: 8, userName: '팀원', active: true, muted: false, speaking: false }]
    else if (path === '/api/voice-channels/11/minutes') {
      if (route.request().method() === 'PATCH') {
        const update = route.request().postDataJSON()
        if (update.transcript !== undefined) transcriptReplacements.push(update.transcript)
        minutes = { ...minutes, ...update }
      }
      data = minutes
    }
    else if (path.endsWith('/minutes/summary')) {
      summaries.push(route.request().postDataJSON().transcript)
      minutes = { ...minutes, summary: '화면의 임시 발화까지 포함한 요약입니다.' }
      data = { minutes, actionItems: [] }
    }
    else if (path.endsWith('/minutes/transcript-lines')) {
      const text = route.request().postDataJSON().text
      appends.push(text)
      minutes = { ...minutes, transcript: `[오전 9:05] 진행자: ${text}` }
      data = minutes
    }
    else if (path.endsWith('/events')) {
      if (route.request().postDataJSON().type === 'MUTE') participant.muted = true
    }
    else if (path === '/api/users/me/profile') data = { userId: 7, name: '진행자', email: 'minutes@example.com' }
    await route.fulfill({ json: { success: true, data } })
  })
  await page.goto('/squad-meeting?workspaceId=42')
  await page.getByRole('button', { name: /AI 회의록$/ }).click()
  await expect.poll(() => Boolean(signaling)).toBe(true)
  await page.getByRole('button', { name: '기록 시작', exact: true }).click()
  return {
    summaries, appends, transcriptReplacements,
    preview: (text: string) => signaling!.send(JSON.stringify({ type: 'minutes-updated', channelId: 11, fromUserId: 8, payload: { transcriptPreview: text } })),
    commit: (transcript: string) => {
      minutes = { ...minutes, transcript }
      signaling!.send(JSON.stringify({ type: 'minutes-updated', channelId: 11, fromUserId: 8, payload: { minutes, transcriptPreview: '' } }))
    },
  }
}

test('팀원 임시 문장만 있어도 요약하고 중지 후 저장 대기를 유지한다', async ({ page }, testInfo) => {
  const room = await setupRoom(page, false)
  const text = '[오전 9:05] 팀원: 오늘 로그인 화면을 완성하고 내일 API를 연결합니다.'
  room.preview(text)
  const transcript = page.getByRole('textbox', { name: '회의 원문' })
  await expect(transcript).toHaveValue(text)
  const summary = page.getByRole('button', { name: 'AI 회의 핵심 요약 생성' })
  await expect(summary).toBeEnabled()
  await summary.click()
  await expect(page.getByRole('heading', { name: 'AI 자동 요약 리포트' })).toBeVisible()
  expect(room.summaries).toEqual([text])
  expect(room.transcriptReplacements).toHaveLength(0)
  await page.getByRole('button', { name: '요약 리포트 닫기' }).click()
  await page.getByRole('button', { name: '기록 중지', exact: true }).click()
  await expect(transcript).toHaveValue(text)
  await expect(transcript).toHaveJSProperty('readOnly', true)
  await page.screenshot({ path: testInfo.outputPath('pending-after-stop.png') })
  room.commit(text)
  await expect(transcript).toHaveValue(text)
  await expect(transcript).toHaveJSProperty('readOnly', false)
  await summary.click()
  await expect.poll(() => room.summaries.length).toBe(2)
  expect(room.summaries[1]).toBe(text)
  expect(room.appends).toHaveLength(0)
})

test('중지 뒤 도착하는 브라우저 final을 저장하고 임시 요약과 중복하지 않는다', async ({ page }) => {
  const room = await setupRoom(page, true)
  await expect(page.locator('html')).toHaveAttribute('data-speech-ready', 'true')
  const text = '발표 대본의 마지막 문장까지 저장해야 합니다.'
  await page.evaluate(text => window.dispatchEvent(new CustomEvent('test-meeting-speech', { detail: text })), text)
  const transcript = page.getByRole('textbox', { name: '회의 원문' })
  await expect(transcript).toHaveValue(new RegExp(text))
  await page.getByRole('button', { name: 'AI 회의 핵심 요약 생성' }).click()
  await expect(page.getByRole('heading', { name: 'AI 자동 요약 리포트' })).toBeVisible()
  expect(room.summaries[0]).toContain(text)
  expect(room.appends).toHaveLength(0)
  await page.getByRole('button', { name: '요약 리포트 닫기' }).click()
  await page.getByRole('button', { name: '기록 중지', exact: true }).click()
  await expect.poll(() => room.appends.length).toBe(1)
  expect(room.appends).toEqual([text])
  await expect(transcript).toHaveValue(`[오전 9:05] 진행자: ${text}`)
  expect(room.transcriptReplacements).toHaveLength(0)
})
