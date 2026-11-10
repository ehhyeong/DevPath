import { expect, test } from '@playwright/test'

for (const viewport of [{ width: 1440, height: 900 }, { width: 1100, height: 700 }]) {
  test(`긴 회의 요약과 할 일을 읽고 선택해 등록한다 (${viewport.width})`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport)
    const summary = [
      '### 한눈에 보기\n결제 화면을 검토하고 금요일 배포를 결정했다.',
      '### 주요 논의\n' + Array.from({ length: 18 }, (_, index) => `- **논의 ${index + 1}** 결제 실패와 재시도 시나리오를 확인하고 화면 안내를 개선한다.`).join('\n'),
      '### 결정 사항\n- 금요일에 배포한다.',
      '### 다음 할 일\n- 박주승이 결제 테스트를 수행한다.',
      '### 확인 필요\n- ' + '긴외부문서주소'.repeat(35),
    ].join('\n\n')
    let minutes = {
      channelId: 11, recording: false, summary: '',
      transcript: Array.from({ length: 40 }, (_, index) => `[오전 9:05] 박주승: 결제 화면 논의 ${index + 1}`).join('\n'),
    }
    const actions = [
      { title: '결제 실패 시나리오 테스트', description: '재시도와 오류 안내를 확인한다.', assigneeName: '박주승', dueDate: '2026-11-13', priority: 'HIGH' },
      { title: '배포 일정 확인', description: null, assigneeName: null, dueDate: null, priority: 'MEDIUM' },
    ]
    const saves: string[] = []
    const created: unknown[] = []
    await page.addInitScript(() => {
      const exp = Math.floor(Date.now() / 1000) + 3600
      const claims = btoa(JSON.stringify({ sub: '7', role: 'ROLE_LEARNER', exp }))
      localStorage.setItem('devpath.auth.session', JSON.stringify({
        tokenType: 'Bearer', accessToken: `test.${claims}.test`, refreshToken: 'test-only',
        name: '김학습', userId: 7, role: 'ROLE_LEARNER', exp, storage: 'local',
      }))
    })
    await page.routeWebSocket('**/ws/voice-signaling**', () => {})
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
      else if (path === '/api/voice-channels/11/minutes') {
        if (route.request().method() === 'PATCH') {
          const payload = route.request().postDataJSON()
          minutes = { ...minutes, ...payload }
          saves.push(minutes.transcript)
        }
        data = minutes
      }
      else if (path.endsWith('/minutes/summary')) {
        minutes = { ...minutes, summary }
        data = { minutes, actionItems: actions }
      }
      else if (path.endsWith('/minutes/action-items/tasks')) {
        created.push(route.request().postDataJSON())
        data = { tasks: [{ taskId: 99 }] }
      }
      else if (path === '/api/users/me/profile') data = { userId: 7, name: '김학습', email: 'kim.hakseup@devpath.com' }
      await route.fulfill({ json: { success: true, data } })
    })

    await page.goto('/squad-meeting?workspaceId=42')
    await page.getByRole('button', { name: /AI 회의록$/ }).click()
    const transcript = page.getByRole('textbox', { name: '회의 원문' })
    await expect(transcript).toHaveValue(minutes.transcript)
    const edited = minutes.transcript + '\n추가 메모를 보존한다.'
    await transcript.fill(edited)
    await transcript.press('Tab')
    await expect.poll(() => saves.includes(edited)).toBe(true)
    await page.getByRole('button', { name: 'AI 회의 핵심 요약 생성' }).click()
    await expect(page.getByRole('heading', { name: 'AI 자동 요약 리포트' })).toBeVisible()
    const report = page.locator('.meeting-minutes-report-content')
    await expect(report.getByRole('heading', { name: '한눈에 보기' })).toBeVisible()
    await expect(report.getByRole('listitem')).toHaveCount(21)
    await expect(report.getByText('논의 1', { exact: true })).toHaveCSS('font-weight', '600')
    expect(await report.evaluate((el) => el.scrollHeight > el.clientHeight && el.scrollWidth <= el.clientWidth + 1)).toBe(true)
    const create = page.getByRole('button', { name: '선택한 할 일 2개 칸반에 등록' })
    await expect(create).toBeInViewport()
    await page.screenshot({ path: testInfo.outputPath('summary-top.png') })
    const secondAction = report.getByRole('checkbox', { name: /배포 일정 확인/ })
    await secondAction.uncheck()
    await expect(report.getByText('담당 박주승')).toBeVisible()
    await expect(report.getByText('마감 2026-11-13')).toBeVisible()
    await expect(report.getByText('기한 미정')).toBeVisible()
    await expect(page.getByRole('button', { name: '선택한 할 일 1개 칸반에 등록' })).toBeInViewport()
    await page.screenshot({ path: testInfo.outputPath('summary-actions.png') })
    await page.getByRole('button', { name: '선택한 할 일 1개 칸반에 등록' }).click()
    await expect.poll(() => created.length).toBe(1)
    expect(created[0]).toEqual({ actionItems: [actions[0]] })
    await expect(page.getByRole('heading', { name: 'AI 자동 요약 리포트' })).toHaveCount(0)
    await expect(transcript).toHaveValue(edited)
    const content = page.locator('.meeting-minutes-content')
    expect(await content.evaluate((el) => el.scrollHeight > el.clientHeight && el.scrollWidth <= el.clientWidth + 1)).toBe(true)
    await expect(page.getByRole('button', { name: 'AI 회의 핵심 요약 생성' })).toBeInViewport()
    await page.getByRole('button', { name: '요약 리포트 열기' }).click()
    await expect(page.getByRole('heading', { name: 'AI 자동 요약 리포트' })).toBeVisible()
    await page.getByRole('button', { name: '요약 리포트 닫기' }).click()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}
