import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { DEMO_TEXT } from '../src/lib/demo-typing'

const design = JSON.parse(readFileSync(new URL('../../src/main/resources/demo/workspace/routinecare-design.json', import.meta.url), 'utf8'))

for (const viewport of [{ width: 1440, height: 900 }, { width: 1280, height: 720 }]) {
  test.describe(`${viewport.width}px 회의 채팅 입력`, () => {
    test.use({ viewport })

    test('기본 세 줄과 시연·붙여넣기의 마지막 줄을 표시하고 여러 줄을 전송한다', async ({ page, context }, testInfo) => {
      const messages: object[] = []
      const participant = { participantId: 1, channelId: 11, userId: 7, userName: '김학습', active: true, muted: true, speaking: false }
      await page.addInitScript(() => {
        const exp = Math.floor(Date.now() / 1000) + 3600
        const claims = btoa(JSON.stringify({ sub: '7', role: 'ROLE_LEARNER', exp }))
        localStorage.setItem('devpath.auth.session', JSON.stringify({
          tokenType: 'Bearer', accessToken: `test.${claims}.test`, refreshToken: 'test-only',
          name: '김학습', userId: 7, role: 'ROLE_LEARNER', exp, storage: 'local',
        }))
      })
      await page.route('**/api/**', async (route) => {
        const path = new URL(route.request().url()).pathname
        if (!path.startsWith('/api/')) return route.continue()
        let data: unknown = []
        if (path === '/api/workspaces/hub/projects/42/ai-design') data = { workspaceId: 42, design, demoWorkspace: true }
        else if (path === '/api/workspaces/42/dashboard') data = {
          workspaceId: 42, name: design.title, type: 'SQUAD', status: 'ACTIVE', ownerId: 7,
          members: [{ memberId: 1, learnerId: 7, learnerName: '김학습' }], unresolvedTaskCount: 0,
        }
        else if (path === '/api/workspaces/42/voice-channels') data = [{ channelId: 11, workspaceId: 42, name: 'RoutineCare 회의', activeParticipantCount: 1 }]
        else if (path === '/api/voice-channels/11/participants') data = [participant]
        else if (path === '/api/voice-channels/11/minutes') data = { channelId: 11, recording: false, transcript: '' }
        else if (path === '/api/users/me/profile') data = { userId: 7, name: '김학습', email: 'kim.hakseup@devpath.com' }
        else if (path === '/api/voice-channels/11/chat-messages') {
          if (route.request().method() === 'POST') {
            data = { messageId: messages.length + 1, channelId: 11, senderId: 7, senderName: '김학습', content: route.request().postDataJSON().content }
            messages.push(data as object)
          } else data = messages
        }
        await route.fulfill({ json: { success: true, data } })
      })
      const profileLoaded = page.waitForResponse((response) => new URL(response.url()).pathname === '/api/users/me/profile')
      await page.goto('/squad-meeting?workspaceId=42&ai=1')
      await profileLoaded
      await page.getByRole('button', { name: '팀 채팅방' }).click()
      const input = page.getByPlaceholder('메시지 입력...')
      await expect(input).toBeVisible()
      const initial = await input.evaluate((field: HTMLTextAreaElement) => ({
        height: field.clientHeight, lineHeight: parseFloat(getComputedStyle(field).lineHeight),
      }))
      expect.soft(initial.height).toBeGreaterThanOrEqual(initial.lineHeight * 3)
      await input.click()
      await expect(input).toHaveValue(DEMO_TEXT.meeting)
      await expect.poll(() => input.evaluate((field: HTMLTextAreaElement) => ({
        caretAtEnd: field.selectionEnd === field.value.length,
        bottomVisible: field.scrollHeight - field.clientHeight - field.scrollTop <= 1,
      }))).toEqual({ caretAtEnd: true, bottomVisible: true })
      await page.screenshot({ path: testInfo.outputPath('meeting-demo-chat.png') })

      await context.grantPermissions(['clipboard-read', 'clipboard-write'])
      const pasted = Array.from({ length: 10 }, (_, i) => `붙여넣기 ${i + 1}번째 줄의 회의 내용입니다.`).join('\n')
      await page.evaluate((text) => navigator.clipboard.writeText(text), pasted)
      await input.press('ControlOrMeta+A')
      await input.press('ControlOrMeta+V')
      await expect(input).toHaveValue(pasted)
      await expect.poll(() => input.evaluate((field: HTMLTextAreaElement) => field.scrollHeight - field.clientHeight - field.scrollTop)).toBeLessThanOrEqual(1)
      await expect(input).toHaveJSProperty('selectionEnd', pasted.length)

      await input.press('ControlOrMeta+Home')
      await input.pressSequentially('prefix ')
      await expect(input).toHaveJSProperty('selectionEnd', 7)
      await expect.poll(() => input.evaluate((field: HTMLTextAreaElement) => field.scrollTop)).toBeLessThan(initial.lineHeight)
      await input.press('ControlOrMeta+End')
      await input.press('Shift+Enter')
      await input.pressSequentially('last line')
      const fullText = `prefix ${pasted}\nlast line`
      await expect(input).toHaveValue(fullText)
      await expect.poll(() => input.evaluate((field: HTMLTextAreaElement) => field.scrollHeight - field.clientHeight - field.scrollTop)).toBeLessThanOrEqual(1)
      await page.screenshot({ path: testInfo.outputPath('meeting-pasted-chat.png') })
      const sent = page.waitForRequest((request) => new URL(request.url()).pathname === '/api/voice-channels/11/chat-messages' && request.method() === 'POST')
      await input.press('Enter')
      expect((await sent).postDataJSON().content).toBe(fullText)
      await expect(input).toHaveValue('')
      await expect(input).toHaveJSProperty('scrollTop', 0)
      expect(await input.evaluate((field: HTMLTextAreaElement) => field.clientHeight)).toBe(initial.lineHeight * 3)
    })
  })
}
