import { expect, test, type WebSocketRoute } from '@playwright/test'

test('회의록에서 새 팀 채팅 수를 표시하고 읽기·패널 닫힘·중복·주기 조회를 반영한다', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  let signaling: WebSocketRoute | undefined
  let chatLoads = 0
  const messages = [{ messageId: 1, channelId: 11, senderId: 8, senderName: '박주승', content: '이전 회의의 채팅 기록' }]
  await page.addInitScript(() => {
    const exp = Math.floor(Date.now() / 1000) + 3600
    const claims = btoa(JSON.stringify({ sub: '7', role: 'ROLE_LEARNER', exp }))
    localStorage.setItem('devpath.auth.session', JSON.stringify({ tokenType: 'Bearer', accessToken: `test.${claims}.test`, refreshToken: 'test-only', name: '김학습', userId: 7, role: 'ROLE_LEARNER', exp, storage: 'local' }))
  })
  await page.routeWebSocket('**/ws/voice-signaling**', (socket) => { signaling = socket })
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    if (!path.startsWith('/api/')) return route.continue()
    let data: unknown = []
    if (path === '/api/workspaces/42/dashboard') data = { workspaceId: 42, name: '알림 확인 스쿼드', type: 'SQUAD', status: 'ACTIVE', ownerId: 7, members: [], unresolvedTaskCount: 0 }
    else if (path === '/api/workspaces/42/voice-channels') data = [{ channelId: 11, workspaceId: 42, name: '화상 회의', activeParticipantCount: 1 }]
    else if (path === '/api/voice-channels/11/participants') data = [{ participantId: 1, channelId: 11, userId: 7, userName: '김학습', active: true, muted: true, speaking: false }]
    else if (path === '/api/voice-channels/11/chat-messages') { chatLoads++; data = messages }
    else if (path === '/api/voice-channels/11/minutes') data = { channelId: 11, recording: false, transcript: '현재 확인 중인 회의록' }
    await route.fulfill({ json: { success: true, data } })
  })
  await page.goto('/squad-meeting?workspaceId=42')
  await expect(page.getByText('현재 확인 중인 회의록', { exact: true })).toHaveValue('현재 확인 중인 회의록')
  await expect.poll(() => chatLoads).toBeGreaterThan(0)
  await expect.poll(() => Boolean(signaling)).toBe(true)
  const badge = page.locator('.meeting-chat-unread-badge:visible')
  const chat = page.getByRole('button', { name: '팀 채팅방', exact: true })
  const minutes = page.getByRole('button', { name: /AI 회의록$/ })
  await expect(badge).toHaveCount(0)
  function message(id: number, senderId = 8, broadcast = true) {
    const chatMessage = { messageId: id, channelId: 11, senderId, senderName: senderId === 7 ? '김학습' : '박주승', content: `새 메시지 ${id}` }
    messages.push(chatMessage)
    if (broadcast) signaling!.send(JSON.stringify({ type: 'chat-message', channelId: 11, fromUserId: senderId, payload: { chatMessage } }))
  }
  message(2)
  await expect(badge).toHaveText('1')
  message(3, 7)
  signaling!.send(JSON.stringify({ type: 'chat-message', channelId: 11, fromUserId: 8, payload: { chatMessage: messages[1] } }))
  await expect(badge).toHaveText('1')
  message(4)
  await expect(badge).toHaveText('2')
  await expect(minutes).toHaveClass(/text-brand/)
  await expect(page.getByText('현재 확인 중인 회의록', { exact: true })).toHaveValue('현재 확인 중인 회의록')
  await page.screenshot({ path: testInfo.outputPath('meeting-chat-unread.png') })
  await chat.click()
  await expect(badge).toHaveCount(0)
  await expect(page.getByText('새 메시지 4', { exact: true })).toBeVisible()
  message(5)
  await expect(page.getByText('새 메시지 5', { exact: true })).toBeVisible()
  await expect(badge).toHaveCount(0)
  await page.getByTitle('패널 열기/닫기').click()
  message(6)
  await expect(badge).toHaveText('1')
  await expect(page.getByTitle('패널 열기/닫기').locator('.meeting-chat-unread-badge')).toHaveText('1')
  await page.getByTitle('패널 열기/닫기').click()
  await expect(badge).toHaveCount(0)
  await minutes.click()
  message(7, 8, false)
  await expect(badge).toHaveText('1', { timeout: 7000 })
  await chat.click()
  await expect(badge).toHaveCount(0)
})
