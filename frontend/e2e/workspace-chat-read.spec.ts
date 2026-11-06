import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

const design = JSON.parse(readFileSync(new URL('../../src/main/resources/demo/workspace/routinecare-design.json', import.meta.url), 'utf8'))

test('AI 워크스페이스의 읽은 팀채팅 알림은 메뉴 이동·재조회 후에도 꺼지고 새 메시지에만 다시 켜진다', async ({ page }) => {
  test.setTimeout(60_000)
  await page.setViewportSize({ width: 1440, height: 1000 })
  const message = (messageId: number, senderId = 8, isMine = false) => ({ messageId, loungeId: 42, senderId, senderName: '팀원', isMine, content: `팀채팅 메시지 ${messageId}`, createdAt: '2026-11-06T07:00:00Z' })
  let messages = [message(1)]
  let chatReads = 0
  await page.addInitScript(() => {
    const exp = Math.floor(Date.now() / 1000) + 3600
    const role = 'ROLE_LEARNER'
    const claims = btoa(JSON.stringify({ sub: '7', role, exp }))
    localStorage.setItem('devpath.auth.session', JSON.stringify({ tokenType: 'Bearer', accessToken: `test.${claims}.test`, refreshToken: 'test-only', name: '김학습', userId: 7, role, exp, storage: 'local' }))
    Object.defineProperty(window, 'documentPictureInPicture', { configurable: true, value: undefined })
  })
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    if (!path.startsWith('/api/')) return route.continue()
    let data: unknown = []
    if (path === '/api/workspaces/hub/projects/42/ai-design') data = { workspaceId: 42, design, demoWorkspace: true }
    else if (path === '/api/workspaces/42/dashboard') data = { workspaceId: 42, name: design.title, type: 'SQUAD', status: 'ACTIVE', ownerId: 7, members: [], unresolvedTaskCount: 0, activeMilestoneCount: 0 }
    else if (path === '/api/lounge/chats/messages') {
      chatReads++
      data = messages
    }
    await route.fulfill({ json: { success: true, data } })
  })
  await page.goto('/squad-dashboard?workspaceId=42&ai=1')
  const chat = page.getByRole('button', { name: '팀채팅', exact: true })
  const unread = chat.getByRole('status', { name: '읽지 않은 팀 채팅' })
  await expect(unread).toBeVisible()
  await chat.click()
  await expect(page.getByText('팀채팅 메시지 1', { exact: true })).toBeVisible()
  await expect(unread).toHaveCount(0)
  await page.getByRole('button', { name: '팀채팅 닫기', exact: true }).click()
  const previousReads = chatReads
  await expect.poll(() => chatReads).toBeGreaterThan(previousReads)
  await expect(unread).toHaveCount(0)

  const aside = page.locator('.squad-workspace-aside:visible')
  await aside.locator('a[href^="/squad-blueprint?"]').click()
  await expect(page).toHaveURL(/\/squad-blueprint\?/)
  await expect(unread).toHaveCount(0)
  messages = [...messages, message(2)]
  await expect(unread).toBeVisible()
  await chat.click()
  await expect(page.getByText('팀채팅 메시지 2', { exact: true })).toBeVisible()
  await expect(unread).toHaveCount(0)

  await page.getByRole('button', { name: '1:1 메시지', exact: true }).click()
  await page.getByRole('button', { name: '팀채팅 닫기', exact: true }).click()
  messages = [...messages, message(3)]
  await expect(unread).toBeVisible()
  await chat.click()
  await expect(page.getByText('팀채팅 메시지 3', { exact: true })).toBeVisible()
  await expect(unread).toHaveCount(0)
  await page.getByRole('button', { name: '팀채팅 닫기', exact: true }).click()
  const ownReads = chatReads
  messages = [...messages, message(4, 7, true)]
  await expect.poll(() => chatReads).toBeGreaterThan(ownReads)
  await expect(unread).toHaveCount(0)
  await page.reload()
  await expect(chat).toBeVisible()
  const reloadReads = chatReads
  await expect.poll(() => chatReads).toBeGreaterThan(reloadReads)
  await expect(unread).toHaveCount(0)
  messages = [...messages, message(5)]
  await expect(unread).toBeVisible()
})
