import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'

const design = JSON.parse(readFileSync(new URL('../../src/main/resources/demo/workspace/routinecare-design.json', import.meta.url), 'utf8'))

async function session(page: Page) {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.addInitScript(() => {
    const exp = 4102444800, role = 'ROLE_LEARNER'
    const claims = btoa(JSON.stringify({ sub: '7', role, exp }))
    localStorage.setItem('devpath.auth.session', JSON.stringify({ tokenType: 'Bearer', accessToken: `test.${claims}.test`, refreshToken: 'test-only', userId: 7, name: '김학습', role, exp, storage: 'local' }))
    Object.defineProperty(window, 'documentPictureInPicture', { configurable: true, value: undefined })
    const state = window as Window & { motionKeys: string[] }
    state.motionKeys = []
    const animate = Element.prototype.animate
    Element.prototype.animate = function (...args) {
      if (this.hasAttribute('data-motion-key')) state.motionKeys.push(this.getAttribute('data-motion-key')!)
      return animate.apply(this, args)
    }
  })
}

for (const reduced of [false, true]) {
  test(`허브 삭제 후 남은 카드가 자리를 채우고 움직임 감소 설정을 따른다 (${reduced})`, async ({ page }, testInfo) => {
    await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' })
    await session(page)
    let ids = [42, 43, 44]
    await page.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname
      if (!path.startsWith('/api/')) return route.continue()
      if (route.request().method() === 'DELETE') ids = ids.filter(id => !path.includes(`/${id}/`))
      const projects = ids.map(id => ({ projectId: id, domId: `workspace-${id}`, menuId: `menu-${id}`, type: 'squad', status: 'progress', owner: true, canDelete: true, title: `프로젝트 ${id}`, description: '작업 공간', dashboardUrl: `/squad-dashboard?workspaceId=${id}`, progressPercent: 0, footerKind: 'avatars', memberAvatarSeeds: [] }))
      const data = path.endsWith('/hub/projects') ? projects : path.endsWith('/lounge/shell') ? { user: { profileImage: null }, mySquads: [] } : []
      await route.fulfill({ json: { success: true, data } })
    })
    await page.goto('/workspace-hub')
    const remaining = page.locator('#workspace-43')
    await expect(remaining).toBeVisible()
    const before = (await remaining.boundingBox())!.x
    await remaining.evaluate(element => element.setAttribute('data-preserved', 'yes'))
    await page.evaluate(() => { (window as Window & { motionKeys: string[] }).motionKeys = [] })
    page.on('dialog', dialog => dialog.accept())
    await page.locator('#workspace-42 button').click()
    await page.locator('#menu-42').getByRole('link', { name: /삭제하기$/ }).click()
    await expect(page.locator('#workspace-42')).toHaveCount(0)
    await expect(remaining).toHaveAttribute('data-preserved', 'yes')
    await expect.poll(async () => (await remaining.boundingBox())!.x).toBeLessThan(before)
    const motions = await page.evaluate(() => (window as Window & { motionKeys: string[] }).motionKeys)
    if (reduced) expect(motions).toEqual([])
    else expect(motions).toContain('workspace-43')
    await page.screenshot({ path: testInfo.outputPath(`hub-motion-${reduced}.png`) })
  })
}

for (const ai of [false, true]) {
test(`참가자 입장·퇴장 시 남은 카드 DOM을 유지하며 새 위치로 이동한다 (AI ${ai})`, async ({ page }, testInfo) => {
  await session(page)
  let userIds = [7]
  await page.routeWebSocket('**/ws/voice-signaling**', () => {})
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    if (!path.startsWith('/api/')) return route.continue()
    let data: unknown = []
    if (path.endsWith('/ai-design')) data = { workspaceId: 42, design, demoWorkspace: true }
    else if (path.endsWith('/dashboard')) data = { workspaceId: 42, name: '회의 이동', type: 'SQUAD', status: 'ACTIVE', ownerId: 7, members: [], unresolvedTaskCount: 0 }
    else if (path.endsWith('/voice-channels')) data = [{ channelId: 11, workspaceId: 42, name: '회의', activeParticipantCount: userIds.length }]
    else if (path.endsWith('/participants')) data = userIds.map(id => ({ participantId: id, channelId: 11, userId: id, userName: `팀원 ${id}`, active: true, muted: true, speaking: false, joinedAt: `2026-11-10T10:00:0${id - 7}` }))
    else if (path.endsWith('/presence')) data = []
    else if (path.endsWith('/minutes')) data = { channelId: 11, recording: false, transcript: '' }
    await route.fulfill({ json: { success: true, data } })
  })
  await page.goto(`/squad-meeting?workspaceId=42${ai ? '&ai=1' : ''}`)
  const first = page.locator('[data-participant-id="7"]')
  await expect(first).toBeVisible()
  await first.evaluate(element => element.setAttribute('data-preserved', 'yes'))
  await page.evaluate(() => { (window as Window & { motionKeys: string[] }).motionKeys = [] })
  userIds = [7, 8, 9]
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(page.locator('[data-participant-id]')).toHaveCount(3)
  await expect(first).toHaveAttribute('data-preserved', 'yes')
  await expect.poll(() => page.evaluate(() => (window as Window & { motionKeys: string[] }).motionKeys.includes('participant-7'))).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('meeting-motion.png') })
  await page.evaluate(() => { (window as Window & { motionKeys: string[] }).motionKeys = [] })
  userIds = [7]
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(page.locator('[data-participant-id]')).toHaveCount(1)
  await expect(first).toHaveAttribute('data-preserved', 'yes')
  await expect.poll(() => page.evaluate(() => (window as Window & { motionKeys: string[] }).motionKeys.includes('participant-7'))).toBe(true)
})
}

test('AI·팀채팅은 전환 중 입력을 유지하고 닫힌 패널을 조작할 수 없다', async ({ page }, testInfo) => {
  await session(page)
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    if (!path.startsWith('/api/')) return route.continue()
    let data: unknown = []
    if (path.endsWith('/ai-design')) data = { workspaceId: 42, design, demoWorkspace: true }
    else if (path.endsWith('/dashboard')) data = { workspaceId: 42, name: design.title, type: 'SQUAD', status: 'ACTIVE', ownerId: 7, members: [], unresolvedTaskCount: 0, activeMilestoneCount: 0 }
    else if (path.endsWith('/profile')) data = { userId: 7, email: 'learner@example.com', name: '김학습' }
    await route.fulfill({ json: { success: true, data } })
  })
  await page.goto('/squad-dashboard?workspaceId=42&ai=1')
  await page.getByRole('button', { name: 'AI 에이전트', exact: true }).click()
  const ai = page.locator('#aiPromptBar')
  await expect(ai).toBeVisible()
  const prompt = page.getByRole('textbox', { name: 'AI 에이전트 프롬프트 입력' })
  await prompt.fill('다시 열어도 유지할 질문')
  await expect(ai).toHaveCSS('transition-duration', '0.22s, 0.18s, 0s')
  await page.getByRole('button', { name: 'AI 패널 닫기' }).click()
  await expect(ai).toHaveAttribute('inert', '')
  await page.getByRole('button', { name: 'AI 에이전트', exact: true }).click()
  await expect(prompt).toHaveValue('다시 열어도 유지할 질문')
  await page.getByRole('button', { name: 'AI 패널 닫기' }).click()
  await page.getByRole('button', { name: '팀채팅', exact: true }).click()
  const chat = page.locator('.ui-chat-panel')
  await expect(chat).toHaveAttribute('data-open', 'true')
  const input = chat.getByRole('textbox').first()
  await input.fill('다시 열어도 유지할 메시지')
  await page.getByRole('button', { name: '팀채팅 닫기', exact: true }).click()
  await expect(chat).toHaveAttribute('inert', '')
  await expect(chat).toHaveCSS('pointer-events', 'none')
  await page.getByRole('button', { name: '팀채팅', exact: true }).click()
  await expect(input).toHaveValue('다시 열어도 유지할 메시지')
  await page.screenshot({ path: testInfo.outputPath('chat-motion.png') })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(chat).toHaveCSS('transition-duration', '0s')
  await expect(ai).toHaveCSS('transition-duration', '0s')
  await page.getByRole('button', { name: '팀채팅 닫기', exact: true }).click()
  await expect(chat).toHaveCSS('transition-duration', '0s')
  await expect(chat).toHaveCSS('visibility', 'hidden')
})

test('AI 삭제 제안 적용 시 남은 로드맵 노드와 연결선이 함께 새 위치로 이동한다', async ({ page }, testInfo) => {
  await session(page)
  const nodes = [1, 2, 3].map(id => ({ customNodeId: id, originalNodeId: id, title: `학습 단계 ${id}`, sortOrder: id - 1, orderInLane: id - 1, branchKind: 'SPINE', laneKey: null, status: 'NOT_STARTED', prerequisiteCustomNodeIds: [] }))
  let pending = true
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    if (!path.startsWith('/api/')) return route.continue()
    let data: unknown = []
    if (path.endsWith('/profile')) data = { userId: 7, name: '김학습', email: 'learner@example.com', role: 'ROLE_LEARNER', profileImage: null }
    else if (path === '/api/my-roadmaps/110') data = { customRoadmapId: 110, originalRoadmapId: null, title: '움직이는 로드맵', infoContent: '학습 단계와 연결선', progressRate: 0, createdAt: '2026-11-10T10:00:00', nodes }
    else if (path === '/api/my-roadmaps') data = { roadmaps: [{ customRoadmapId: 110, originalRoadmapId: null, title: '움직이는 로드맵', isBuilderOrigin: true, progressRate: 0 }] }
    else if (path.endsWith('/1/apply')) { pending = false; data = {} }
    else if (path === '/api/me/recommendation-changes') data = pending ? [{ changeId: 1, nodeId: 2, nodeTitle: '학습 단계 2', nodeChangeType: 'DELETE', decisionStatus: 'PENDING', reason: '이미 익힌 단계 정리', sourceRecommendationId: null }] : []
    await route.fulfill({ json: { success: true, data } })
  })
  await page.goto('/roadmap?id=110')
  const last = page.locator('[data-slot-id="node-3"]')
  await expect(last).toBeVisible()
  await expect(page.locator('.ui-roadmap-edge')).toHaveCount(2)
  await last.evaluate(element => element.setAttribute('data-preserved', 'yes'))
  await expect(page.locator('#changesPanel')).toHaveClass(/\bopen\b/)
  await page.evaluate(() => { (window as Window & { motionKeys: string[] }).motionKeys = [] })
  await page.locator('#changesPanel').getByRole('button', { name: '적용', exact: true }).click()
  await expect(page.locator('[data-slot-id="node-2"]')).toHaveCount(0)
  await expect(last).toHaveAttribute('data-preserved', 'yes')
  await expect.poll(() => page.evaluate(() => (window as Window & { motionKeys: string[] }).motionKeys.includes('node-3'))).toBe(true)
  await expect(page.locator('.ui-roadmap-edge')).toHaveCount(1)
  await expect(page.locator('.ui-roadmap-edge')).toHaveCSS('transition-property', 'd')
  await expect.poll(() => page.locator('.ui-roadmap-edge').evaluate(path => {
    const edge = path as SVGPathElement
    const end = edge.getPointAtLength(edge.getTotalLength())
    const screen = new DOMPoint(end.x, end.y).matrixTransform(edge.getScreenCTM()!)
    const target = document.querySelector('[data-slot-id="node-3"]')!.getBoundingClientRect()
    return Math.abs(screen.y - target.top)
  })).toBeLessThan(3)
  await page.screenshot({ path: testInfo.outputPath('roadmap-motion.png') })
})
