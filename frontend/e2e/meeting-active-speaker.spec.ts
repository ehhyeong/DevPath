import { expect, test, type WebSocketRoute } from '@playwright/test'
import { readFileSync } from 'node:fs'

const design = JSON.parse(readFileSync(new URL('../../src/main/resources/demo/workspace/routinecare-design.json', import.meta.url), 'utf8'))

test.use({ viewport: { width: 1440, height: 900 } })

test('화상회의 타일은 발언자의 초록 테두리를 확대 중에도 표시하고 정지·음소거에는 해제한다', async ({ page }, testInfo) => {
  let signaling: WebSocketRoute | undefined
  const participants = [
    { participantId: 1, channelId: 11, userId: 7, userName: '김학습', active: true, muted: true, speaking: false },
    { participantId: 2, channelId: 11, userId: 8, userName: '박주승', active: true, muted: false, speaking: false },
  ]
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
    if (path === '/api/workspaces/hub/projects/42/ai-design') data = { workspaceId: 42, design, demoWorkspace: true }
    else if (path === '/api/workspaces/42/dashboard') data = {
      workspaceId: 42, name: design.title, type: 'SQUAD', status: 'ACTIVE', ownerId: 7,
      members: participants.map((participant) => ({ memberId: participant.participantId, learnerId: participant.userId, learnerName: participant.userName })), unresolvedTaskCount: 0,
    }
    else if (path === '/api/workspaces/42/voice-channels') data = [{ channelId: 11, workspaceId: 42, name: '화상 회의', activeParticipantCount: 2 }]
    else if (path === '/api/voice-channels/11/participants') data = participants
    else if (path === '/api/voice-channels/11/minutes') data = { channelId: 11, recording: false, transcript: '' }
    else if (path === '/api/users/me/profile') data = { userId: 7, name: '김학습', email: 'kim.hakseup@devpath.com' }
    await route.fulfill({ json: { success: true, data } })
  })

  await page.goto('/squad-meeting?workspaceId=42&ai=1')
  const remote = page.locator('.meeting-participant-card[data-participant-id="2"]')
  const local = page.locator('.meeting-participant-card[data-participant-id="1"]')
  await expect(remote).toBeVisible()
  await expect.poll(() => Boolean(signaling)).toBe(true)
  const quietBorder = await remote.evaluate(element => getComputedStyle(element).borderColor)
  const quietBounds = await remote.boundingBox()
  await expect(remote).toHaveCSS('border-top-width', '2px')
  function speak(userId: number, speaking: boolean) {
    participants.find(participant => participant.userId === userId)!.speaking = speaking
    signaling!.send(JSON.stringify({ type: speaking ? 'speaking' : 'stop-speaking', channelId: 11, fromUserId: userId }))
  }

  speak(8, true)
  await expect(remote).toHaveCSS('border-color', 'rgb(0, 196, 113)')
  await expect(remote).toHaveCSS('box-shadow', /0, 196, 113/)
  expect(await remote.boundingBox()).toEqual(quietBounds)
  speak(7, true)
  await expect(local).not.toHaveCSS('border-color', 'rgb(0, 196, 113)')
  await page.screenshot({ path: testInfo.outputPath('meeting-active-speaker.png') })
  await page.getByRole('button', { name: '박주승 크게 보기', exact: true }).click()
  const focused = page.locator('.meeting-focused-card .meeting-participant-card')
  await expect(focused).toHaveCSS('border-color', 'rgb(0, 196, 113)')
  await expect(focused).toHaveCSS('border-top-width', '2px')
  speak(8, false)
  await expect(focused).toHaveCSS('border-color', quietBorder)
  await page.getByRole('button', { name: /전체 참가자 보기/ }).click()
  await expect(remote).toHaveCSS('border-color', quietBorder)
  await expect(local).not.toHaveCSS('border-color', 'rgb(0, 196, 113)')
})
