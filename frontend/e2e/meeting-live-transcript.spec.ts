import { expect, test, type WebSocketRoute } from '@playwright/test'

test('다른 참여자의 중간 음성을 즉시 표시하고 확정 응답·퇴장 뒤에도 저장 기록을 보존한다', async ({ page }, testInfo) => {
  let signaling: WebSocketRoute | undefined
  let minutes = { channelId: 11, recording: true, transcript: '기존 회의 기록' }
  const transcriptSaves: unknown[] = []
  await page.addInitScript(() => {
    const exp = Math.floor(Date.now() / 1000) + 3600
    const claims = btoa(JSON.stringify({ sub: '7', role: 'ROLE_LEARNER', exp }))
    localStorage.setItem('devpath.auth.session', JSON.stringify({
      tokenType: 'Bearer', accessToken: `test.${claims}.test`, refreshToken: 'test-only',
      name: '김학습', userId: 7, role: 'ROLE_LEARNER', exp, storage: 'local',
    }))
  })
  await page.routeWebSocket('**/ws/voice-signaling**', (socket) => { signaling = socket })
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    if (!path.startsWith('/api/')) return route.continue()
    let data: unknown = []
    if (path === '/api/workspaces/42/dashboard') data = {
      workspaceId: 42, name: '시연 스쿼드', type: 'SQUAD', status: 'ACTIVE', ownerId: 7,
      members: [{ memberId: 1, learnerId: 7, learnerName: '김학습' }], unresolvedTaskCount: 0,
    }
    else if (path === '/api/workspaces/42/voice-channels') data = [{ channelId: 11, workspaceId: 42, name: '음성 회의', activeParticipantCount: 1 }]
    else if (path === '/api/voice-channels/11/participants') data = [{ participantId: 1, channelId: 11, userId: 7, userName: '김학습', active: true, muted: true, speaking: false }]
    else if (path === '/api/voice-channels/11/minutes') data = minutes
    else if (path === '/api/users/me/profile') data = { userId: 7, name: '김학습', email: 'kim.hakseup@devpath.com' }
    else if (path.endsWith('/minutes/transcript-lines')) transcriptSaves.push(route.request().postDataJSON())
    await route.fulfill({ json: { success: true, data } })
  })

  await page.goto('/squad-meeting?workspaceId=42')
  await page.getByRole('button', { name: /AI 회의록$/ }).click()
  await expect.poll(() => Boolean(signaling)).toBe(true)
  const transcript = page.locator('textarea[readonly]')
  await expect(transcript).toHaveValue('기존 회의 기록')
  const preview = (userId: number, text: string) => signaling!.send(JSON.stringify({
    type: 'minutes-updated', channelId: 11, fromUserId: userId, fromUserName: '팀원',
    payload: { transcriptPreview: text },
  }))

  preview(8, '[오후 6:30] 박주승: 로그인')
  await expect(transcript).toHaveValue('기존 회의 기록\n[오후 6:30] 박주승: 로그인')
  preview(8, '[오후 6:30] 박주승: 로그인 기능을 테스트하겠습니다.')
  await expect(transcript).toHaveValue('기존 회의 기록\n[오후 6:30] 박주승: 로그인 기능을 테스트하겠습니다.')
  await page.screenshot({ path: testInfo.outputPath('meeting-live-transcript.png') })
  expect(transcriptSaves).toHaveLength(0)

  preview(8, '')
  minutes = { ...minutes, transcript: '기존 회의 기록\n[오후 6:30] 박주승: 로그인 기능을 테스트하겠습니다.' }
  signaling!.send(JSON.stringify({ type: 'minutes-updated', channelId: 11, fromUserId: 8, payload: { minutes } }))
  await expect(transcript).toHaveValue(minutes.transcript)
  preview(8, '[오후 6:31] 박주승: 다음 작업')
  await expect(transcript).toHaveValue(`${minutes.transcript}\n[오후 6:31] 박주승: 다음 작업`)
  signaling!.send(JSON.stringify({ type: 'minutes-updated', channelId: 11, fromUserId: 8, payload: { minutes } }))
  await expect(transcript).toHaveValue(`${minutes.transcript}\n[오후 6:31] 박주승: 다음 작업`)
  preview(9, '[오후 6:31] 김태형: API 테스트')
  signaling!.send(JSON.stringify({ type: 'peer-left', channelId: 11, fromUserId: 8 }))
  await expect(transcript).toHaveValue(`${minutes.transcript}\n[오후 6:31] 김태형: API 테스트`)
  preview(9, '')
  await expect(transcript).toHaveValue(minutes.transcript)
  expect(transcriptSaves).toHaveLength(0)
})
