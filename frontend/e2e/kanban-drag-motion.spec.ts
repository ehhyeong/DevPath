import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'

async function openBoard(page: Page, ai = false) {
  const tasks = [
    { taskId: 101, title: '로그인 화면 구현', status: 'TODO', assigneeId: 7 },
    { taskId: 102, title: '오류 안내 구현', status: 'TODO', assigneeId: 8 },
    { taskId: 103, title: '입력 검증 구현', status: 'TODO', assigneeId: 7 },
    { taskId: 201, title: '인증 API 구현', status: 'IN_PROGRESS', assigneeId: 8 },
    { taskId: 202, title: '세션 테스트', status: 'IN_PROGRESS', assigneeId: 7 },
  ].map(task => ({ ...task, workspaceId: 42, priority: 'MEDIUM', description: '팀 작업' }))
  const moves: Array<{ taskId: number; status: string }> = []
  let failNext = false
  await page.addInitScript(() => {
    const exp = 4102444800, role = 'ROLE_LEARNER'
    const claims = btoa(JSON.stringify({ sub: '7', role, exp }))
    localStorage.setItem('devpath.auth.session', JSON.stringify({ tokenType: 'Bearer', accessToken: `test.${claims}.test`, refreshToken: 'test-only', userId: 7, name: '김학습', role, exp, storage: 'local' }))
    const state = window as Window & { kanbanMotions: string[] }
    state.kanbanMotions = []
    const animate = Element.prototype.animate
    Element.prototype.animate = function (...args) {
      if (this.matches('[data-task-id]')) state.kanbanMotions.push(this.getAttribute('data-task-id')!)
      return animate.apply(this, args)
    }
  })
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    if (!path.startsWith('/api/')) return route.continue()
    let data: unknown = []
    if (path === '/api/workspaces/42/dashboard') data = { workspaceId: 42, name: '자연스러운 작업 보드', type: 'SQUAD', status: 'ACTIVE', ownerId: 7, members: [{ memberId: 1, learnerId: 7, learnerName: '김학습' }, { memberId: 2, learnerId: 8, learnerName: '박주승' }], unresolvedTaskCount: 5 }
    else if (path === '/api/workspaces/42/tasks') data = tasks
    else if (/\/tasks\/\d+\/status$/.test(path)) {
      const taskId = Number(path.split('/').at(-2))
      const { status } = route.request().postDataJSON()
      moves.push({ taskId, status })
      if (failNext) { failNext = false; return route.fulfill({ status: 500, json: { success: false, message: '저장 실패' } }) }
      const task = tasks.find(task => task.taskId === taskId)!
      task.status = status
      data = task
    } else if (path.endsWith('/api-spec')) data = null
    else if (path.endsWith('/ai-design')) data = { workspaceId: 42, design: JSON.parse(readFileSync(new URL('../../src/main/resources/demo/workspace/toolshare-design.json', import.meta.url), 'utf8')), demoWorkspace: true }
    await route.fulfill({ json: { success: true, data } })
  })
  await page.setViewportSize({ width: 1600, height: 1000 })
  await page.goto(`/squad-workspace?workspaceId=42${ai ? '&ai=1' : ''}`)
  await expect(page.locator('#col-todo .kanban-card')).toHaveCount(3)
  return { moves, failNextMove: () => { failNext = true } }
}

async function startDrag(page: Page, id: number) {
  const transfer = await page.evaluateHandle(() => new DataTransfer())
  await page.locator('.kanban-card').filter({ hasText: `#${id}` }).dispatchEvent('dragstart', { dataTransfer: transfer, clientX: 180, clientY: 290 })
  return transfer
}

async function hoverBefore(page: Page, columnId: string, beforeTaskId?: number) {
  await page.locator(`#${columnId}`).evaluate((column, before) => {
    const card = before ? column.querySelector(`[data-task-id="${before}"]`) : null
    const rect = (card ?? column).getBoundingClientRect()
    column.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, clientX: rect.left + 30, clientY: card ? rect.top + 4 : rect.bottom - 15, dataTransfer: new DataTransfer() }))
  }, beforeTaskId)
}

async function order(page: Page, column: string) {
  return page.locator(`#${column} .kanban-card`).evaluateAll(cards => cards.map(card => Number(card.getAttribute('data-task-id'))))
}

for (const ai of [false, true]) {
  test(`카드 사이 삽입과 열 이동에 자리와 실제 이동 애니메이션을 제공한다 (AI ${ai})`, async ({ page }, testInfo) => {
    const { moves } = await openBoard(page, ai)
    await startDrag(page, 101)
    await hoverBefore(page, 'col-todo', 103)
    const placeholder = page.locator('#col-todo [data-kanban-drop-placeholder]')
    await expect(placeholder).toBeVisible()
    expect((await placeholder.boundingBox())!.height).toBeGreaterThan(100)
    await expect.poll(() => page.evaluate(() => (window as Window & { kanbanMotions: string[] }).kanbanMotions.includes('103'))).toBe(true)
    if (ai) await page.screenshot({ path: testInfo.outputPath('kanban-insertion.png') })
    await page.locator('#col-todo').dispatchEvent('drop', { clientX: 200, clientY: 550 })
    await expect.poll(() => order(page, 'col-todo')).toEqual([102, 101, 103])
    await expect(page.locator('[data-kanban-drop-placeholder]')).toHaveCount(0)
    expect(moves).toEqual([])
    await expect(page.locator('.squad-workspace-task-modal')).toHaveCount(0)

    await startDrag(page, 101)
    await hoverBefore(page, 'col-progress', 202)
    await expect(page.locator('#col-progress [data-kanban-drop-placeholder]')).toBeVisible()
    await page.locator('#col-progress').dispatchEvent('drop', { clientX: 700, clientY: 500 })
    await expect.poll(() => moves).toEqual([{ taskId: 101, status: 'IN_PROGRESS' }])
    await expect.poll(() => order(page, 'col-progress')).toEqual([201, 101, 202])
    await expect.poll(() => page.evaluate(() => (window as Window & { kanbanMotions: string[] }).kanbanMotions.includes('101'))).toBe(true)
    await expect(page.locator('#count-todo')).toHaveText('2')
    await expect(page.locator('#count-progress')).toHaveText('3')
    await page.getByRole('button', { name: '내 작업만', exact: true }).click()
    expect(await order(page, 'col-progress')).toEqual([101, 202])
    await page.getByRole('button', { name: '전체 보기', exact: true }).click()
    expect(await order(page, 'col-progress')).toEqual([201, 101, 202])
    await page.waitForTimeout(350)
    await page.screenshot({ path: testInfo.outputPath('kanban-drop.png') })
    await page.locator('[data-task-id="101"]').click()
    await expect(page.getByRole('heading', { name: /작업 수정/ })).toBeVisible()
  })
}

test('취소는 순서를 유지하고 빈 열 이동은 저장하며 실패하면 원래 위치로 되돌린다', async ({ page }) => {
  const { moves, failNextMove } = await openBoard(page)
  await startDrag(page, 102)
  await hoverBefore(page, 'col-todo', 101)
  await expect(page.locator('[data-kanban-drop-placeholder]')).toBeVisible()
  await page.locator('.kanban-card').filter({ hasText: '#102' }).dispatchEvent('dragend')
  await expect(page.locator('[data-kanban-drop-placeholder]')).toHaveCount(0)
  expect(await order(page, 'col-todo')).toEqual([101, 102, 103])
  expect(moves).toEqual([])

  await startDrag(page, 101)
  await hoverBefore(page, 'col-todo')
  await page.locator('#col-todo').dispatchEvent('drop')
  await expect.poll(() => order(page, 'col-todo')).toEqual([102, 103, 101])

  await page.locator('[data-task-id="102"]').dragTo(page.locator('#col-done'))
  await expect(page.locator('#col-done [data-task-id="102"]')).toBeVisible()
  await expect.poll(() => moves).toEqual([{ taskId: 102, status: 'DONE' }])
  failNextMove()
  await page.locator('[data-task-id="201"]').dragTo(page.locator('#col-review'))
  await expect.poll(() => moves.length).toBe(2)
  await expect.poll(() => order(page, 'col-progress')).toEqual([201, 202])
  await expect(page.locator('[data-kanban-drop-placeholder]')).toHaveCount(0)
})

test('움직임 감소 설정에서는 삽입 위치만 바꾸고 이동 애니메이션을 실행하지 않는다', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await openBoard(page)
  await startDrag(page, 103)
  await hoverBefore(page, 'col-todo', 101)
  await expect(page.locator('[data-kanban-drop-placeholder]')).toBeVisible()
  await page.locator('#col-todo').dispatchEvent('drop')
  await expect.poll(() => order(page, 'col-todo')).toEqual([103, 101, 102])
  expect(await page.evaluate(() => (window as Window & { kanbanMotions: string[] }).kanbanMotions)).toEqual([])
})
