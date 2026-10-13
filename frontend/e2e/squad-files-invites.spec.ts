import { expect, test } from '@playwright/test'
import type { InterviewQuestion } from '../src/features/squad/interview-practice'
import type { WorkspaceAiDesign, WorkspaceAiDesignEdit } from '../src/features/project/api'

test.use({ launchOptions: { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] } })

const design = {
  title: '지역 안전 신고 플랫폼', summary: '주민이 위험 요소를 신고합니다.', difficulty: 'mvp',
  stack: { frontend: 'React', backend: 'Spring Boot', database: 'PostgreSQL', libraries: [], selectionReason: '신고 정합성' },
  scenario: { userFlows: [{ actor: '주민', action: '위험 신고' }], coreFeatures: ['위치 기반 신고'] },
  architecture: { style: '모놀리스', description: 'REST API', components: [], erdMermaid: 'erDiagram', entities: [], technicalChallenges: [] },
  apis: [{ method: 'POST', path: '/reports', description: '신고 생성', auth: 'JWT', requestExample: '{}', responseExample: '{}' }],
  roadmap: [{ phase: 1, title: '신고 구현', goal: '신고 생성', estimatedWeeks: 1, tasks: ['API 구현'] }],
  interviewQuestions: [
    { category: '설계', question: '중복 신고를 어떻게 막나요?', answer: '요청 검증', keywords: ['검증'] },
    { category: '성능', question: '신고 조회를 어떻게 최적화하나요?', answer: '인덱스 활용', keywords: ['인덱스'] },
  ],
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.addInitScript(() => {
    const payload = btoa(JSON.stringify({ sub: '77', role: 'ROLE_LEARNER', exp: 4102444800 }))
    localStorage.setItem('devpath.auth.session', JSON.stringify({ tokenType: 'Bearer', accessToken: `test.${payload}.signature`, refreshToken: 'test-refresh', name: '실제 사용자', userId: 77, role: 'ROLE_LEARNER', exp: 4102444800, storage: 'local' }))
  })
  const sharedAnswers: { questionId: string; userId: number; name: string; text: string }[] = []
  const notices: { id: number; title: string; content: string; createdAt: string }[] = []
  let practice = { answers: {}, sessions: [] }
  let questions = design.interviewQuestions.map((question, index) => ({ ...question, id: 'Q' + (index + 1), level: 2, source: 'ai' }))
  let apiContent = JSON.stringify({ format: 'devpath-ai-api-v1', endpoints: design.apis })
  const members = [{ memberId: 9, learnerId: 77, learnerName: '실제 사용자' }]
  const tasks = [{ taskId: 101, workspaceId: 42, title: 'API 구현', description: '신고 구현', status: 'TODO', priority: 'MEDIUM', assigneeId: 77, dueDate: '2026-10-12' }]
  let events = [{ eventId: 201, workspaceId: 42, title: 'Phase 1. 신고 구현', description: '[schedule-category:milestone]', startAt: '2026-10-06T00:00:00', endAt: '2026-10-13T23:59:00' }]
  let erd = { workspaceId: 42, projectName: design.title, mermaidCode: 'erDiagram\n REPORTS {\n bigint id PK\n }', schemaJson: '{"tables":[],"relationships":[]}', version: 1, members }
  let review: { summary: Record<string, unknown>; diffText: string; members: typeof members; comments: unknown[] } | null = null
  let github = { id: 1, workspaceId: 42, provider: 'GITHUB', isActive: false, repositoryUrl: '', githubTokenConfigured: false }
  await page.route('**/api/**', async (route) => {
    const pathname = new URL(route.request().url()).pathname
    if (!pathname.startsWith('/api/')) {
      await route.continue()
      return
    }
    let data: unknown = []
    if (pathname.endsWith('/ai-design')) data = { workspaceId: 42, dashboardUrl: '/squad-dashboard?workspaceId=42&ai=1', createdAt: '2026-10-06T12:00:00Z', design }
    if (pathname.endsWith('/dashboard')) data = { workspaceId: 42, name: design.title, ownerId: 77, type: 'SQUAD', status: 'ACTIVE', createdAt: '2026-10-06T12:00:00Z', members: [{ memberId: 9, learnerId: 77, learnerName: '실제 사용자' }] }
    if (pathname.endsWith('/notices')) {
      if (route.request().method() === 'POST') notices.push({ id: 1, ...route.request().postDataJSON(), createdAt: '2026-10-06T12:00:00' })
      data = route.request().method() === 'POST' ? notices[notices.length - 1] : notices
    }
    if (pathname.endsWith('/interview/shared-answers')) {
      if (route.request().method() === 'POST') sharedAnswers.push({ ...route.request().postDataJSON(), userId: 77, name: '실제 사용자' })
      data = sharedAnswers
    }
    if (pathname.endsWith('/interview/practice')) {
      if (route.request().method() === 'PUT') practice = JSON.parse(route.request().postDataJSON().content)
      data = { content: JSON.stringify(practice) }
    }
    if (pathname.endsWith('/interview/questions')) {
      if (route.request().method() === 'PUT') questions = route.request().postDataJSON().questions
      data = { questions }
    }
    if (pathname.endsWith('/questions/generate')) data = { questions: [{ id: 'G-new', category: '설계', question: '재시도 중복 처리는 어떻게 하나요?', answer: '멱등성 키 활용', keywords: ['멱등성'], level: 2, source: 'generated', from: 'POST /reports' }] }
    if (pathname.endsWith('/interview/evaluate')) data = { score: 82, feedback: '동시성 사례를 보강해 주세요.' }
    if (pathname.endsWith('/api-spec')) {
      if (route.request().method() === 'PUT') apiContent = route.request().postDataJSON().content
      data = { content: apiContent }
    }
    if (pathname.endsWith('/tasks')) {
      if (route.request().method() === 'POST') tasks.push({ taskId: 102, workspaceId: 42, status: 'TODO', ...route.request().postDataJSON() })
      data = route.request().method() === 'POST' ? tasks[tasks.length - 1] : tasks
    }
    if (/\/tasks\/\d+(\/status|\/assignee)?$/.test(pathname)) {
      const task = tasks.find((task) => pathname.includes('/' + task.taskId))!
      Object.assign(task, route.request().postDataJSON())
      data = task
    }
    if (pathname.endsWith('/calendar-events')) {
      if (route.request().method() === 'POST') events.push({ eventId: 202, workspaceId: 42, ...route.request().postDataJSON() })
      data = route.request().method() === 'POST' ? events[events.length - 1] : events
    }
    if (/\/calendar-events\/\d+$/.test(pathname)) {
      const id = Number(pathname.split('/').pop())
      if (route.request().method() === 'DELETE') events = events.filter((event) => event.eventId !== id)
      else Object.assign(events.find((event) => event.eventId === id)!, route.request().postDataJSON())
      data = events.find((event) => event.eventId === id) ?? null
    }
    if (pathname.endsWith('/erd')) {
      if (route.request().method() === 'PUT') erd = { ...erd, ...route.request().postDataJSON(), version: erd.version + 1 }
      data = erd
    }
    if (pathname.endsWith('/voice-channels')) data = [{ channelId: 301, workspaceId: 42, name: '팀 회의', description: '설계 검토', activeParticipantCount: 0 }]
    if (pathname.endsWith('/code-reviews')) {
      if (route.request().method() === 'POST') {
        const request = route.request().postDataJSON()
        review = { summary: { ...request, reviewId: 401, workspaceId: 42, issueKey: 'DP-401', status: 'OPEN', authorId: 77, authorName: '실제 사용자', additions: 1, deletions: 0, aiCommentCount: 0 }, diffText: request.diffText, members, comments: [] }
        data = review
      } else data = { workspaceId: 42, projectName: design.title, members, openReviews: review ? [review.summary] : [], closedReviews: [] }
    }
    if (pathname.endsWith('/code-reviews/401')) data = review
    if (pathname.endsWith('/code-reviews/401/comments') && review) {
      const comment = { ...route.request().postDataJSON(), commentId: 501, authorId: 77, authorName: '실제 사용자', createdAt: '2026-10-06T12:00:00' }
      review.comments.push(comment)
      data = review
    }
    if (pathname.endsWith('/storage')) data = { usedBytes: 0, quotaBytes: 1073741824, storageProvider: 'LOCAL' }
    if (pathname.endsWith('/invite-link')) data = { workspaceId: 42, token: '42.test-signed-token', expiresAt: '2026-10-20T12:00:00' }
    if (pathname.endsWith('/invites')) data = null
    if (pathname.endsWith('/settings')) data = { workspaceId: 42, name: design.title, description: design.summary, type: 'SQUAD', status: 'ACTIVE', ownerId: 77, canManage: true, memberCount: 1, members }
    if (pathname.endsWith('/integrations')) data = [github]
    if (pathname.endsWith('/integrations/GITHUB')) {
      const payload = route.request().postDataJSON()
      github = { ...github, isActive: payload.isActive, repositoryUrl: payload.repositoryUrl, githubTokenConfigured: Boolean(payload.githubToken) || github.githubTokenConfigured }
      data = github
    }
    if (pathname.endsWith('/integrations/GITHUB/sync')) data = github
    if (pathname.endsWith('/ai-assist')) data = { answer: '검증 조건과 동시 요청 사례를 보강해 주세요.', actions: [] }
    if (pathname === '/api/lounge/shell') data = { user: { name: '실제 사용자' }, mySquads: [] }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data }) })
  })
})

for (const entry of ['마우스', '키보드'] as const) {
  test(`허브 AI 카드의 ${entry} 준비와 첫 진입이 초기화를 공유하고 느린 위젯을 기다리지 않는다`, async ({ page }) => {
    await page.route('**/api/workspaces/hub/projects', (route) => route.fulfill({ json: { success: true, data: [{ projectId: 42, domId: 'workspace-42', menuId: 'menu-42', type: 'squad', status: 'progress', dashboardUrl: '/squad-dashboard?workspaceId=42&ai=1', title: design.title, description: design.summary, progressPercent: 0, footerKind: 'avatars', memberAvatarSeeds: [], extraMemberCount: 0 }] } }))
    let releaseInitialization!: () => void
    let releaseWidgets!: () => void
    const initialization = new Promise<void>((resolve) => { releaseInitialization = resolve })
    const widgets = new Promise<void>((resolve) => { releaseWidgets = resolve })
    let initializationCount = 0
    await page.route('**/api/workspaces/hub/projects/42/ai-design/initialize', async (route) => { initializationCount++; await initialization; await route.fallback() })
    await page.route('**/api/workspaces/42/activities/recent', async (route) => { await widgets; await route.fallback() })
    await page.goto('/workspace-hub')
    const card = page.locator('#workspace-42')
    try {
      if (entry === '마우스') await card.hover()
      else await card.focus()
      await expect.poll(() => initializationCount).toBe(1)
      if (entry === '마우스') await card.click()
      else await card.press('Enter')
      await expect(page).toHaveURL('/squad-dashboard?workspaceId=42&ai=1')
      releaseInitialization()
      await expect(page.getByRole('heading', { name: design.title, exact: true })).toBeVisible()
      await expect(page.getByText('내 작업 완료율 0% · 완료 0개 / 전체 1개', { exact: true })).toBeVisible()
      expect(initializationCount).toBe(1)
      await expect(page.getByText('AI 설계를 불러오는 중입니다...', { exact: true })).toHaveCount(0)
    } finally { releaseInitialization(); releaseWidgets() }
  })
}

test('면접 첫 화면은 느린 개인 기록과 근거 조회를 기다리지 않고 기존 답변을 안전하게 복원한다', async ({ page }) => {
  let releaseRecord!: () => void
  let releaseEvidence!: () => void
  const record = new Promise<void>((resolve) => { releaseRecord = resolve })
  const evidence = new Promise<void>((resolve) => { releaseEvidence = resolve })
  let practiceWrites = 0
  let sharedReads = 0
  page.on('request', (request) => { if (request.url().endsWith('/interview/shared-answers')) sharedReads++ })
  await page.route('**/api/workspaces/42/interview/practice', async (route) => {
    if (route.request().method() === 'PUT') { practiceWrites++; await route.fallback(); return }
    await record
    await route.fulfill({ json: { success: true, data: { content: JSON.stringify({ answers: { Q1: { text: '이전에 저장한 내 답변', favorite: true, rating: 2, versions: [] } }, sessions: [] }) } } })
  })
  for (const path of ['tasks', 'api-spec', 'erd']) await page.route(`**/api/workspaces/42/${path}`, async (route) => { await evidence; await route.fallback() })
  await page.goto('/squad-interview?workspaceId=42&ai=1#Q1')
  try {
    await expect(page.getByRole('heading', { name: 'Q. 중복 신고를 어떻게 막나요?', exact: true })).toBeVisible({ timeout: 3000 })
    const answer = page.getByLabel('Q1 내 답변', { exact: true })
    await expect(answer).toBeDisabled()
    await expect(page.getByRole('button', { name: /모의 면접 시작/ })).toBeDisabled()
    await page.getByRole('tab', { name: /모범 답안/ }).first().click()
    await page.getByRole('button', { name: 'Q1 모범 답안 보기', exact: true }).click()
    await expect(page.getByText('요청 검증', { exact: true })).toBeVisible()
    expect(practiceWrites).toBe(0)
    expect(sharedReads).toBe(0)
    await expect(page.getByRole('button', { name: 'Q1 근거 연결', exact: true })).toHaveCount(0)
    releaseRecord()
    await page.getByRole('tab', { name: /내 답변/ }).first().click()
    await expect(answer).toBeEnabled()
    await expect(answer).toHaveValue('이전에 저장한 내 답변')
    await expect(page.getByRole('button', { name: 'Q1 즐겨찾기', exact: true })).toHaveAttribute('aria-pressed', 'true')
    expect(practiceWrites).toBe(0)
    await answer.fill('원본을 확인하고 보강한 내 답변')
    const saved = await page.waitForRequest((request) => request.method() === 'PUT' && request.url().endsWith('/interview/practice'))
    expect(JSON.parse(saved.postDataJSON().content).answers.Q1.text).toBe('원본을 확인하고 보강한 내 답변')
    releaseEvidence()
    await expect(page.getByRole('button', { name: 'Q1 근거 연결', exact: true })).toBeVisible()
    await page.getByRole('tab', { name: /팀원 답변/ }).first().click()
    await expect.poll(() => sharedReads).toBe(1)
  } finally { releaseRecord(); releaseEvidence() }
})

test('면접 개인 기록 조회 실패는 질문 읽기를 막지 않고 기존 기록 저장을 차단한다', async ({ page }) => {
  let writes = 0
  await page.route('**/api/workspaces/42/interview/practice', async (route) => {
    if (route.request().method() === 'PUT') { writes++; await route.fallback(); return }
    await route.fulfill({ status: 503, json: { success: false, message: '개인 기록을 조회하지 못했습니다.' } })
  })
  await page.goto('/squad-interview?workspaceId=42&ai=1#Q1')
  await expect(page.getByRole('heading', { name: 'Q. 중복 신고를 어떻게 막나요?', exact: true })).toBeVisible()
  await expect(page.getByRole('alert')).toContainText('개인 기록을 조회하지 못했습니다.')
  await expect(page.getByLabel('Q1 내 답변', { exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Q1 즐겨찾기', exact: true })).toBeDisabled()
  await page.getByRole('tab', { name: /모범 답안/ }).first().click()
  await page.getByRole('button', { name: 'Q1 모범 답안 보기', exact: true }).click()
  await expect(page.getByText('요청 검증', { exact: true })).toBeVisible()
  expect(writes).toBe(0)
})

test('AI 메뉴 왕복에서 초기화와 전체 데이터 조회를 반복하지 않고 API 화면을 보존한다', async ({ page }) => {
  const requests: string[] = []
  page.on('request', (request) => { if (request.url().includes('/api/')) requests.push(new URL(request.url()).pathname) })
  await page.goto('/squad-api?workspaceId=42&ai=1')
  await expect(page.getByRole('heading', { name: '/reports', exact: true })).toBeVisible()
  const search = page.getByPlaceholder('경로 또는 설명 검색...')
  await search.fill('reports')
  await search.evaluate((input) => input.setAttribute('data-loading-probe', 'retained'))
  await expect.poll(() => requests.filter((path) => path === '/api/lounge/chats/messages').length).toBeGreaterThanOrEqual(2)
  const taskCount = requests.filter((path) => path === '/api/workspaces/42/tasks').length
  const apiCount = requests.filter((path) => path === '/api/workspaces/42/api-spec').length
  await page.locator('aside:visible').getByRole('link', { name: /프로젝트 설계서/ }).click()
  await expect(page.getByRole('button', { name: '기획·시나리오 수정' })).toBeVisible()
  await page.locator('aside:visible').getByRole('link', { name: /API 명세서/ }).click()
  await expect(search).toHaveValue('reports')
  await expect(search).toHaveAttribute('data-loading-probe', 'retained')
  expect(requests.filter((path) => path.endsWith('/initialize'))).toHaveLength(1)
  expect(requests.filter((path) => path === '/api/workspaces/42/tasks')).toHaveLength(taskCount)
  expect(requests.filter((path) => path === '/api/workspaces/42/api-spec')).toHaveLength(apiCount)
  expect(requests.some((path) => /\/files|\/erd\/versions|\/code-reviews/.test(path))).toBe(false)
})

test('캐시 만료 후 느린 DB 재조회 중에도 방문한 API 화면을 바로 표시한다', async ({ page }) => {
  await page.goto('/squad-api?workspaceId=42&ai=1')
  await expect(page.getByRole('heading', { name: '/reports', exact: true })).toBeVisible()
  const search = page.getByPlaceholder('경로 또는 설명 검색...')
  await search.fill('reports')
  await page.locator('aside:visible').getByRole('link', { name: /프로젝트 설계서/ }).click()
  await expect(page.getByRole('button', { name: '기획·시나리오 수정' })).toBeVisible()
  let release!: () => void
  const gate = new Promise<void>((resolve) => { release = resolve })
  await page.route('**/api/workspaces/42/api-spec', async (route) => { await gate; await route.fallback() })
  await page.clock.setFixedTime(new Date(Date.now() + 31_000))
  const refresh = page.waitForRequest((request) => request.url().endsWith('/api/workspaces/42/api-spec'))
  try {
    await page.locator('aside:visible').getByRole('link', { name: /API 명세서/ }).click()
    await refresh
    await expect(search).toBeVisible()
    await expect(search).toHaveValue('reports')
    await expect(page.getByRole('heading', { name: '/reports', exact: true })).toBeVisible()
    await expect(page.getByText('워크스페이스를 불러오는 중입니다...', { exact: true })).toHaveCount(0)
  } finally { release() }
})

test('AI 설계서에서 기획·아키텍처·로드맵을 저장하고 기능 연결을 유지한다', async ({ page }) => {
  let current: WorkspaceAiDesign = { ...design, difficulty: 'mvp', scenario: { ...design.scenario, coreFeatures: ['로그인', '신고'], featureIds: ['F1', 'F2'], nextFeatureNumber: 3 } }
  const requests: WorkspaceAiDesignEdit[] = []
  await page.route('**/api/workspaces/hub/projects/42/ai-design', async (route) => {
    if (route.request().method() === 'PATCH') {
      const request = route.request().postDataJSON() as WorkspaceAiDesignEdit
      requests.push(request)
      if (request.planning) {
        let next = current.scenario.nextFeatureNumber ?? 3
        current = { ...current, title: request.planning.title, summary: request.planning.summary, scenario: { userFlows: request.planning.userFlows, coreFeatures: request.planning.features.map((feature) => feature.title), featureIds: request.planning.features.map((feature) => feature.id ?? 'F' + next++), nextFeatureNumber: next } }
      }
      if (request.architecture) current = { ...current, stack: request.architecture, architecture: { ...current.architecture, ...request.architecture } }
      if (request.roadmap) current = { ...current, roadmap: request.roadmap.map((phase, index) => ({ ...current.roadmap[index], ...phase })) }
    }
    await route.fulfill({ json: { success: true, data: { workspaceId: 42, dashboardUrl: '/squad-dashboard?workspaceId=42&ai=1', createdAt: '2026-10-06T12:00:00Z', design: current } } })
  })
  await page.route('**/api/workspaces/42/tasks', (route) => route.fulfill({ json: { success: true, data: [{ taskId: 101, workspaceId: 42, title: '신고 API', status: 'DONE', assigneeId: 77, featureIds: ['F2'] }] } }))
  await page.goto('/squad-blueprint?workspaceId=42&ai=1')
  await page.getByRole('button', { name: '기획·시나리오 수정', exact: true }).click()
  await page.getByLabel('프로젝트 이름', { exact: true }).fill('팀이 수정한 안전 플랫폼')
  await page.getByRole('button', { name: 'F1 기능 삭제', exact: true }).click()
  await page.getByLabel('F2', { exact: true }).fill('위험 신고 관리')
  await page.getByRole('button', { name: '+ MVP 기능 추가', exact: true }).click()
  await page.getByLabel('새 기능', { exact: true }).fill('신고 알림')
  await page.getByRole('button', { name: '변경사항 저장', exact: true }).click()
  await expect(page.getByRole('heading', { name: '팀이 수정한 안전 플랫폼', exact: true })).toBeVisible()
  expect(requests[0].planning?.features).toEqual([{ id: 'F2', title: '위험 신고 관리' }, { id: null, title: '신고 알림' }])
  expect(requests[0].expectedDesign.scenario.featureIds).toEqual(['F1', 'F2'])
  await page.getByRole('button', { name: '아키텍처 & DB', exact: true }).click()
  await page.getByRole('button', { name: '아키텍처 설명 수정', exact: true }).click()
  await page.getByLabel('프론트엔드', { exact: true }).fill('Vue')
  await page.getByLabel('아키텍처 설명', { exact: true }).fill('팀이 검토한 계층 구조')
  await page.getByRole('button', { name: '+ 구성 요소 추가', exact: true }).click()
  await page.getByLabel('1 구성 요소', { exact: true }).fill('신고 서비스')
  await page.getByLabel('1 역할', { exact: true }).fill('신고 검증과 등록')
  await page.getByRole('button', { name: '변경사항 저장', exact: true }).click()
  await expect(page.locator('.ai-blueprint-tab-panel').getByText('팀이 검토한 계층 구조', { exact: true })).toBeVisible()
  await expect(page.getByText('신고 검증과 등록', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'ERD 편집하기', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '개발 로드맵 & 면접', exact: true }).click()
  await page.getByRole('button', { name: '로드맵 수정', exact: true }).click()
  await page.getByLabel('Phase 1 이름', { exact: true }).fill('신고 기능 검증')
  await page.getByLabel('Phase 1 목표', { exact: true }).fill('중복 신고 검증')
  await page.getByRole('button', { name: '변경사항 저장', exact: true }).click()
  await expect(page.getByRole('heading', { name: '1. 신고 기능 검증', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '날짜·일정 수정', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '질문·모범답안 수정', exact: true })).toBeVisible()
  expect(requests).toHaveLength(3)
  expect(requests[2].roadmap?.[0]).not.toHaveProperty('estimatedWeeks')
  await page.goto('/squad-dashboard?workspaceId=42&ai=1')
  await expect(page.getByRole('progressbar', { name: 'F2. 위험 신고 관리' })).toHaveAttribute('aria-valuenow', '100')
  await expect(page.getByText('F3. 신고 알림', { exact: true })).toBeVisible()
  await expect(page.getByText('Phase 1. 신고 기능 검증', { exact: true })).toBeVisible()
  await page.goto('/squad-workspace?workspaceId=42&ai=1')
  await page.getByText('신고 API', { exact: true }).click()
  await expect(page.getByRole('checkbox', { name: 'F2. 위험 신고 관리' })).toBeChecked()
})

test('AI 설계 수정 취소와 저장 충돌 시 기존 내용과 입력을 보존한다', async ({ page }) => {
  let mutations = 0
  await page.route('**/api/workspaces/hub/projects/42/ai-design', async (route) => {
    if (route.request().method() === 'PATCH') {
      mutations++
      await route.fulfill({ status: 409, json: { success: false, message: '설계가 다른 곳에서 수정되었습니다. 새로고침 후 다시 수정해 주세요.' } })
    } else await route.fulfill({ json: { success: true, data: { workspaceId: 42, design } } })
  })
  await page.goto('/squad-blueprint?workspaceId=42&ai=1')
  await page.getByRole('button', { name: '기획·시나리오 수정', exact: true }).click()
  await page.getByLabel('프로젝트 이름', { exact: true }).fill('저장하지 않은 이름')
  await page.getByRole('button', { name: '취소', exact: true }).click()
  await expect(page.getByRole('heading', { name: design.title, exact: true })).toBeVisible()
  expect(mutations).toBe(0)
  await page.getByRole('button', { name: '기획·시나리오 수정', exact: true }).click()
  await page.getByLabel('프로젝트 이름', { exact: true }).fill('충돌해도 유지할 이름')
  await page.getByRole('button', { name: '변경사항 저장', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('다른 곳에서 수정')
  await expect(page.getByLabel('프로젝트 이름', { exact: true })).toHaveValue('충돌해도 유지할 이름')
})

test('면접 질문·모범답안 수정은 번호와 개인 답변을 보존하고 설계서에도 표시된다', async ({ page }) => {
  await page.goto('/squad-interview?workspaceId=42&ai=1#Q1')
  await page.getByLabel('Q1 내 답변', { exact: true }).fill('작성해 둔 개인 답변')
  await page.getByRole('button', { name: 'Q1 질문·모범답안 수정', exact: true }).click()
  const editor = page.getByRole('dialog', { name: '질문·모범답안 수정' })
  await editor.getByLabel('질문', { exact: true }).fill('중복 신고의 동시 요청은 어떻게 처리하나요?')
  await editor.getByLabel('모범답안', { exact: true }).fill('유니크 제약과 멱등성 키를 사용합니다.')
  const saving = page.waitForRequest((request) => request.method() === 'PUT' && request.url().endsWith('/interview/questions'))
  await editor.getByRole('button', { name: '질문 변경사항 저장', exact: true }).click()
  const payload = (await saving).postDataJSON()
  expect(payload.questions[0].id).toBe('Q1')
  expect(payload.questions).toHaveLength(2)
  await expect(editor).toBeHidden()
  await expect(page.getByRole('heading', { name: 'Q. 중복 신고의 동시 요청은 어떻게 처리하나요?', exact: true })).toBeVisible()
  await expect(page.getByLabel('Q1 내 답변', { exact: true })).toHaveValue('작성해 둔 개인 답변')
  await page.goto('/squad-blueprint?workspaceId=42&ai=1#roadmap')
  await expect(page.getByText('Q. 중복 신고의 동시 요청은 어떻게 처리하나요?', { exact: true })).toBeVisible()
  await expect(page.getByText('A. "유니크 제약과 멱등성 키를 사용합니다."', { exact: true })).toBeVisible()
})

test('팀채팅과 AI 에이전트가 모든 AI 스쿼드 메뉴에서 한 번만 표시된다', async ({ page }, testInfo) => {
  await page.goto('/squad-dashboard?workspaceId=42&ai=1')
  for (const name of ['dashboard', 'blueprint', 'workspace', 'schedule', 'erd', 'api', 'review', 'meeting', 'files', 'interview', 'settings']) {
    const aside = page.getByRole('complementary').filter({ has: page.getByRole('navigation') })
    await aside.hover()
    if (name === 'review') {
      // GitHub 미연동 메뉴는 잠겨 있으므로 직접 진입 시의 공통 도구도 확인한다.
      await page.goto('/squad-review?workspaceId=42&ai=1')
    } else {
      await aside.locator(`a[href="/squad-${name}?workspaceId=42&ai=1"]`).click()
    }
    await expect(page).toHaveURL(`/squad-${name}?workspaceId=42&ai=1`)
    await expect(page.getByRole('button', { name: '팀채팅', exact: true })).toHaveCount(1)
    await expect(page.getByRole('button', { name: '팀채팅', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'AI 에이전트', exact: true })).toHaveCount(1)
    await expect(page.getByRole('button', { name: 'AI 에이전트', exact: true })).toBeVisible()
  }
  await page.screenshot({ path: testInfo.outputPath('settings-shared-tools.png'), animations: 'disabled' })
})

test('다른 메뉴의 공통 팀채팅 송수신과 AI 응답이 메뉴 이동 뒤에도 유지된다', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'documentPictureInPicture', { value: undefined, configurable: true }))
  const messages = [{ messageId: 1, loungeId: 42, senderId: 88, senderName: '팀원', isMine: false, content: '팀의 기존 메시지', createdAt: '2026-10-11T09:00:00' }]
  await page.route('**/api/lounge/chats/messages*', async (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON()
      expect(body.loungeId).toBe(42)
      messages.push({ messageId: messages.length + 1, loungeId: 42, senderId: 77, senderName: '실제 사용자', isMine: true, content: body.content, createdAt: '2026-10-11T09:01:00' })
      await route.fulfill({ json: { success: true, data: messages[messages.length - 1] } })
    } else {
      expect(new URL(route.request().url()).searchParams.get('loungeId')).toBe('42')
      await route.fulfill({ json: { success: true, data: messages } })
    }
  })
  await page.goto('/squad-api?workspaceId=42&ai=1')
  await page.getByRole('button', { name: '팀채팅', exact: true }).click()
  await expect(page.getByRole('heading', { name: /스쿼드 소통방/ })).toBeVisible()
  await expect(page.getByText('팀의 기존 메시지', { exact: true })).toBeVisible()
  await page.getByPlaceholder('메시지 보내기...').fill('API 설계 확인 부탁해요')
  await page.getByPlaceholder('메시지 보내기...').press('Enter')
  await expect(page.getByText('API 설계 확인 부탁해요', { exact: true })).toBeVisible()
  messages.push({ messageId: 3, loungeId: 42, senderId: 88, senderName: '팀원', isMine: false, content: '확인했습니다', createdAt: '2026-10-11T09:02:00' })
  await expect(page.getByText('확인했습니다', { exact: true })).toBeVisible({ timeout: 7000 })
  await page.getByRole('button', { name: '팀채팅 닫기', exact: true }).click()
  await page.getByRole('button', { name: 'AI 에이전트', exact: true }).click()
  await page.getByRole('textbox', { name: 'AI 에이전트 프롬프트 입력' }).fill('이 API의 개선점을 알려줘')
  await page.getByRole('textbox', { name: 'AI 에이전트 프롬프트 입력' }).press('Enter')
  await expect(page.getByText('검증 조건과 동시 요청 사례를 보강해 주세요.', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'AI 패널 닫기', exact: true }).click()
  const aside = page.getByRole('complementary').filter({ has: page.getByRole('navigation') })
  await aside.hover()
  await aside.locator('a[href="/squad-files?workspaceId=42&ai=1"]').click()
  await expect(page).toHaveURL('/squad-files?workspaceId=42&ai=1')
  await page.getByRole('button', { name: '팀채팅', exact: true }).click()
  await expect(page.getByText('API 설계 확인 부탁해요', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '팀채팅 닫기', exact: true }).click()
  await page.getByRole('button', { name: 'AI 에이전트', exact: true }).click()
  await expect(page.getByText('검증 조건과 동시 요청 사례를 보강해 주세요.', { exact: true })).toBeVisible()
})

test('공통 팀채팅의 1:1 메시지가 설정 페이지에서 실제 선택한 팀원에게 저장된다', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'documentPictureInPicture', { value: undefined, configurable: true }))
  await page.route('**/api/workspaces/42/dashboard', (route) => route.fulfill({ json: { success: true, data: {
    workspaceId: 42, name: design.title, type: 'SQUAD', status: 'ACTIVE', ownerId: 77,
    members: [{ memberId: 9, learnerId: 77, learnerName: '실제 사용자' }, { memberId: 10, learnerId: 88, learnerName: '메시지 수신 팀원' }],
  } } }))
  const messages: { messageId: number; senderId: number; senderName: string; receiverId: number; receiverName: string; isMine: boolean; content: string; createdAt: string }[] = []
  await page.route('**/api/workspaces/42/direct-messages*', async (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON()
      expect(body.receiverId).toBe(88)
      messages.push({ messageId: 1, senderId: 77, senderName: '실제 사용자', receiverId: 88, receiverName: '메시지 수신 팀원', isMine: true, content: body.content, createdAt: '2026-10-11T09:00:00' })
      await route.fulfill({ json: { success: true, data: messages[0] } })
    } else await route.fulfill({ json: { success: true, data: messages } })
  })
  await page.route('**/api/workspaces/42/direct-messages/88', (route) => route.fulfill({ json: { success: true, data: messages } }))
  await page.goto('/squad-settings?workspaceId=42&ai=1')
  await page.getByRole('button', { name: '팀채팅', exact: true }).click()
  await page.getByRole('button', { name: '1:1 메시지', exact: true }).click()
  await page.getByRole('button', { name: /메시지 수신 팀원.*1:1 메시지를 시작/ }).click()
  await page.getByPlaceholder('1:1 메시지 보내기...').fill('초대된 팀원에게 보내는 메시지')
  await page.getByPlaceholder('1:1 메시지 보내기...').press('Enter')
  await expect(page.getByText('초대된 팀원에게 보내는 메시지', { exact: true })).toBeVisible()
})

test('일반 스쿼드도 메뉴 이동 시 팀채팅과 AI 에이전트가 중복되지 않는다', async ({ page }) => {
  await page.goto('/squad-dashboard?workspaceId=42')
  for (const name of ['workspace', 'schedule', 'settings', 'dashboard']) {
    const aside = page.getByRole('complementary').filter({ has: page.getByRole('navigation') })
    await aside.hover()
    await aside.locator(`a[href="/squad-${name}?workspaceId=42"]`).click()
    await expect(page).toHaveURL(`/squad-${name}?workspaceId=42`)
    await expect(page.getByRole('button', { name: '팀채팅', exact: true })).toHaveCount(1)
    await expect(page.getByRole('button', { name: 'AI 에이전트', exact: true })).toHaveCount(1)
  }
})

test('구버전 서버가 MVP 연결을 무시하면 성공으로 닫지 않고 선택을 유지하며 재시도한다', async ({ page }) => {
  const task = { taskId: 101, workspaceId: 42, title: 'API 구현', description: '신고 구현', status: 'TODO', assigneeId: 77, featureIds: [] as string[] }
  let oldServer = true
  let writes = 0
  await page.route(/\/api\/workspaces\/42\/tasks(?:\/.*)?$/, async (route) => {
    if (route.request().method() === 'PUT') {
      writes += 1
      const { featureIds, ...rest } = route.request().postDataJSON()
      Object.assign(task, rest)
      if (!oldServer) task.featureIds = featureIds
    }
    if (route.request().method() === 'PATCH') Object.assign(task, route.request().postDataJSON())
    const { featureIds, ...oldTask } = task
    const responseTask = oldServer ? oldTask : { ...oldTask, featureIds }
    const data = new URL(route.request().url()).pathname.endsWith('/tasks') ? [responseTask] : responseTask
    await route.fulfill({ json: { success: true, data } })
  })
  await page.goto('/squad-workspace?workspaceId=42&ai=1')
  await page.getByRole('heading', { name: 'API 구현', exact: true }).click()
  const feature = page.getByRole('checkbox', { name: 'F1. 위치 기반 신고', exact: true })
  await feature.check()
  await page.getByRole('button', { name: /저장하기/ }).click()
  await expect(page.getByRole('alert')).toContainText('MVP 기능 연결이 서버에 저장되지 않았습니다.')
  await expect(page.getByRole('alert')).not.toContainText('API 연결을 저장하지 못했습니다.')
  await expect(feature).toBeChecked()
  oldServer = false
  await page.getByRole('button', { name: /저장하기/ }).click()
  await expect(page.locator('.squad-workspace-task-modal-content')).toHaveCount(0)
  expect(task.featureIds).toEqual(['F1'])
  expect(writes).toBe(2)
  await page.goto('/squad-dashboard?workspaceId=42&ai=1')
  await expect(page.getByRole('progressbar', { name: 'F1. 위치 기반 신고' })).toHaveAttribute('aria-valuenow', '0')
  await expect(page.getByText('완료 0 / 연결 작업 1개')).toBeVisible()
  await expect(page.getByRole('link', { name: /작업 연결 전/ })).toHaveCount(0)
})

test('MVP 기능을 작업에 연결하고 완료 비율·저장 실패·재조회·복수 연결·해제를 반영한다', async ({ page }, testInfo) => {
  const featureDesign = { ...design, scenario: { ...design.scenario, coreFeatures: ['위치 기반 신고', '신고 조회', '알림'] } }
  const tasks = [
    { taskId: 101, workspaceId: 42, title: 'API 구현', description: '신고 구현', status: 'TODO', assigneeId: 77, featureIds: [] as string[] },
    { taskId: 102, workspaceId: 42, title: '신고 화면', description: '화면 구현', status: 'DONE', assigneeId: 88, featureIds: ['F1', 'F2'] },
  ]
  let failNext = true
  await page.route('**/api/workspaces/hub/projects/42/ai-design', (route) => route.fulfill({ json: { success: true, data: { workspaceId: 42, design: featureDesign } } }))
  await page.route(/\/api\/workspaces\/42\/tasks(?:\/.*)?$/, async (route) => {
    const pathname = new URL(route.request().url()).pathname
    const taskId = Number(pathname.match(/\/tasks\/(\d+)/)?.[1])
    const task = tasks.find((item) => item.taskId === taskId)
    if (route.request().method() === 'PUT') {
      if (failNext) { failNext = false; await route.fulfill({ status: 500, json: { success: false, message: '기능 연결 저장 실패' } }); return }
      Object.assign(task!, route.request().postDataJSON())
    }
    if (route.request().method() === 'PATCH') Object.assign(task!, route.request().postDataJSON())
    await route.fulfill({ json: { success: true, data: task ?? tasks } })
  })
  await page.goto('/squad-workspace?workspaceId=42&ai=1')
  await page.getByRole('heading', { name: 'API 구현', exact: true }).click()
  const f1 = page.getByRole('checkbox', { name: 'F1. 위치 기반 신고', exact: true })
  const f2 = page.getByRole('checkbox', { name: 'F2. 신고 조회', exact: true })
  const modal = page.locator('.squad-workspace-task-modal-content')
  await f1.check()
  await page.getByRole('button', { name: /저장하기/ }).click()
  await expect(page.getByRole('alert')).toContainText('기능 연결 저장 실패')
  await expect(f1).toBeChecked()
  await page.getByRole('button', { name: /저장하기/ }).click()
  await expect(modal).toHaveCount(0)
  expect(tasks[0].featureIds).toEqual(['F1'])
  await page.reload()
  await page.getByRole('heading', { name: 'API 구현', exact: true }).click()
  await expect(f1).toBeChecked()
  await expect(f2).not.toBeChecked()
  await page.getByRole('button', { name: '취소', exact: true }).click()
  await page.goto('/squad-dashboard?workspaceId=42&ai=1')
  const progress = page.getByRole('region', { name: 'MVP 검증 기능 진행률', exact: true })
  await expect(progress.getByRole('progressbar', { name: 'F1. 위치 기반 신고' })).toHaveAttribute('aria-valuenow', '50')
  await expect(progress.getByRole('progressbar', { name: 'F2. 신고 조회' })).toHaveAttribute('aria-valuenow', '100')
  await expect(progress.getByText(/작업 연결 전/)).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('squad-mvp-feature-progress.png'), animations: 'disabled' })
  await progress.getByRole('link', { name: 'DP-101 · API 구현', exact: true }).click()
  await expect(page.getByRole('heading', { name: /작업 수정$/ })).toBeVisible()
  await expect(f1).toBeChecked()
  await f2.check()
  await page.getByRole('button', { name: /저장하기/ }).click()
  await expect(modal).toHaveCount(0)
  await page.locator('.kanban-card').filter({ hasText: 'API 구현' }).dragTo(page.locator('#col-review'))
  await expect(page.locator('#col-review').getByRole('heading', { name: 'API 구현', exact: true })).toBeVisible()
  await page.goto('/squad-dashboard?workspaceId=42&ai=1')
  await expect(progress.getByRole('progressbar', { name: 'F1. 위치 기반 신고' })).toHaveAttribute('aria-valuenow', '50')
  await expect(progress.getByRole('progressbar', { name: 'F2. 신고 조회' })).toHaveAttribute('aria-valuenow', '50')
  await progress.getByRole('link', { name: 'DP-101 · API 구현', exact: true }).first().click()
  await page.getByRole('button', { name: '취소', exact: true }).click()
  await expect(modal).toHaveCount(0)
  await page.locator('.kanban-card').filter({ hasText: 'API 구현' }).dragTo(page.locator('#col-done'))
  await expect(page.locator('#col-done').getByRole('heading', { name: 'API 구현', exact: true })).toBeVisible()
  await page.goto('/squad-dashboard?workspaceId=42&ai=1')
  await expect(progress.getByRole('progressbar', { name: 'F1. 위치 기반 신고' })).toHaveAttribute('aria-valuenow', '100')
  await expect(progress.getByRole('progressbar', { name: 'F2. 신고 조회' })).toHaveAttribute('aria-valuenow', '100')
  await progress.getByRole('link', { name: 'DP-101 · API 구현', exact: true }).first().click()
  await f1.uncheck()
  await f2.uncheck()
  await page.getByRole('button', { name: /저장하기/ }).click()
  await expect(modal).toHaveCount(0)
  expect(tasks[0].featureIds).toEqual([])
  await page.reload()
  await page.getByRole('heading', { name: 'API 구현', exact: true }).click()
  await expect(f1).not.toBeChecked()
  await expect(f2).not.toBeChecked()
})

test('스쿼드 설정 직군을 방장과 팀원에게 변경하고 저장 실패·재조회·방장 권한을 유지한다', async ({ page }, testInfo) => {
  const members = [
    { memberId: 9, learnerId: 77, learnerName: '실제 사용자', position: 'Backend 개발자', roleLabel: 'BE' },
    { memberId: 10, learnerId: 88, learnerName: '초대한 팀원', position: 'Frontend 개발자', roleLabel: 'FE' },
  ]
  let failNext = true
  let writes = 0
  await page.route(/\/api\/workspaces\/42\/settings(?:\/.*)?$/, async (route) => {
    if (route.request().method() === 'PATCH') {
      writes += 1
      if (failNext) { failNext = false; await route.fulfill({ status: 500, json: { success: false, message: '직군 저장 실패' } }); return }
      const memberId = Number(new URL(route.request().url()).pathname.split('/').at(-2))
      const member = members.find((item) => item.memberId === memberId)!
      const key = route.request().postDataJSON().position as string
      member.roleLabel = key
      member.position = ({ FE: 'Frontend 개발자', BE: 'Backend 개발자', DES: 'UI/UX 디자이너', '': '' } as Record<string, string>)[key]
    }
    await route.fulfill({ json: { success: true, data: { workspaceId: 42, name: design.title, type: 'SQUAD', status: 'ACTIVE', ownerId: 77, canManage: true, memberCount: members.length, members } } })
  })
  await page.goto('/squad-settings?workspaceId=42&ai=1')
  await page.getByRole('button', { name: /팀원 관리$/ }).click()
  const owner = page.getByRole('combobox', { name: '실제 사용자 직군' })
  await expect(owner).toHaveValue('BE')
  await expect(page.getByText('방장', { exact: true })).toBeVisible()
  await owner.selectOption('FE')
  await expect(page.getByText('직군 저장 실패', { exact: true })).toBeVisible()
  await expect(owner).toHaveValue('BE')
  await expect(owner).toBeEnabled()
  await owner.selectOption('FE')
  await expect(owner).toHaveValue('FE')
  await page.reload()
  await page.getByRole('button', { name: /팀원 관리$/ }).click()
  await expect(owner).toHaveValue('FE')
  await expect(page.getByText('방장', { exact: true })).toBeVisible()
  await owner.selectOption('DES')
  await expect(owner).toHaveValue('DES')
  await page.getByRole('combobox', { name: '초대한 팀원 직군' }).selectOption('BE')
  await expect(page.getByRole('combobox', { name: '초대한 팀원 직군' })).toHaveValue('BE')
  await page.screenshot({ path: testInfo.outputPath('squad-member-positions.png'), animations: 'disabled' })
  await owner.selectOption('')
  await expect(owner).toHaveValue('')
  await page.reload()
  await page.getByRole('button', { name: /팀원 관리$/ }).click()
  await expect(owner).toHaveValue('')
  await expect(page.getByRole('combobox', { name: '초대한 팀원 직군' })).toHaveValue('BE')
  expect(writes).toBe(5)
})

test('스쿼드 설정 직군을 일반 팀원에게 읽기 전용으로 보여준다', async ({ page }) => {
  let writes = 0
  await page.route(/\/api\/workspaces\/42\/settings(?:\/.*)?$/, async (route) => {
    if (route.request().method() === 'PATCH') writes += 1
    await route.fulfill({ json: { success: true, data: { workspaceId: 42, name: design.title, type: 'SQUAD', status: 'ACTIVE', ownerId: 88, canManage: false, memberCount: 1, members: [{ memberId: 9, learnerId: 77, learnerName: '실제 사용자', position: 'Backend 개발자', roleLabel: 'BE' }] } } })
  })
  await page.goto('/squad-settings?workspaceId=42&ai=1')
  await page.getByRole('button', { name: /팀원 관리$/ }).click()
  await expect(page.getByText('백엔드', { exact: true })).toBeVisible()
  await expect(page.getByRole('combobox')).toHaveCount(0)
  expect(writes).toBe(0)
})

test('AI 설정에서 GitHub 토큰 저장과 PR 동기화를 실행하고 코드 피드백 잠금을 갱신한다', async ({ page }, testInfo) => {
  await page.goto('/squad-settings?workspaceId=42&ai=1')
  await page.getByRole('button', { name: /외부 연동 \(API\)$/ }).click()
  await expect(page.getByLabel('GitHub Access Token')).toBeEnabled()
  await expect(page.getByRole('heading', { name: 'GitHub Repository', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Jira', exact: true })).toHaveCount(0)
  await page.getByLabel('Repository URL').fill('https://github.com/team/project')
  await page.getByLabel('GitHub Access Token').fill('test-only-token')
  const save = page.waitForRequest((request) => request.method() === 'PATCH' && request.url().endsWith('/integrations/GITHUB'))
  await page.getByRole('button', { name: '연동하기', exact: true }).click()
  expect((await save).postDataJSON()).toEqual({ isActive: true, repositoryUrl: 'https://github.com/team/project', githubToken: 'test-only-token' })
  await expect(page.getByLabel('GitHub Access Token')).toHaveValue('')
  await expect(page.getByText('서버 인증 설정됨')).toBeVisible()
  await expect(page.locator('a[href="/squad-review?workspaceId=42&ai=1"]')).not.toHaveAttribute('aria-disabled', 'true')
  const sync = page.waitForRequest((request) => request.method() === 'POST' && request.url().endsWith('/integrations/GITHUB/sync'))
  await page.getByRole('button', { name: 'GitHub PR만 다시 동기화', exact: true }).click()
  await sync
  await page.screenshot({ path: testInfo.outputPath('squad-github.png') })
})

test('면접 준비의 글자 크기와 답변 줄 간격을 맞추고 좁은 화면에서도 카드를 유지한다', async ({ page }, testInfo) => {
  await page.goto('/squad-interview?workspaceId=42&ai=1')
  const first = page.getByRole('button', { name: 'Q1 중복 신고를 어떻게 막나요?' })
  await first.click()
  const answer = page.getByRole('textbox', { name: 'Q1 내 답변', exact: true })
  await expect(answer).toHaveCSS('font-size', '14px')
  await expect(answer).toHaveCSS('line-height', '22.75px')
  await expect(first.getByRole('heading')).toHaveCSS('font-size', '15px')
  await expect(first.getByRole('heading')).toHaveCSS('font-weight', '700')
  await expect(first.getByRole('heading')).toHaveCSS('line-height', '24px')
  await expect(page.getByRole('tablist', { name: 'Q1 답변 탭' }).getByRole('tab').first()).toHaveCSS('font-size', '12px')
  await expect(page.getByText('답변 작성', { exact: true }).first()).toHaveCSS('font-size', '11px')
  await expect(page.getByText('답변 작성', { exact: true }).first().locator('..').locator('p').nth(1)).toHaveCSS('margin-top', '4px')
  await answer.fill('요청 검증을 먼저 적용합니다.\n동시 요청에서도 중복 저장을 방지합니다.')
  for (const width of [1440, 1024, 768]) {
    await page.setViewportSize({ width, height: 900 })
    await expect(answer).toBeVisible()
    expect(await page.locator('main').evaluate((main) => main.scrollWidth <= main.clientWidth)).toBe(true)
    if (width < 1440) await first.scrollIntoViewIfNeeded()
    await page.screenshot({ path: testInfo.outputPath(`squad-interview-typography-${width}.png`) })
  }
  await page.getByRole('tablist', { name: 'Q1 답변 탭' }).getByRole('tab', { name: /모범 답안$/ }).click()
  await expect(page.getByText('요청 검증', { exact: true })).toBeVisible()
})

test('면접 질문을 각각 펼치고 답변 탭·저장·검색·리포트를 원본 구조로 표시한다', async ({ page }, testInfo) => {
  await page.goto('/squad-interview?workspaceId=42&ai=1')
  const first = page.getByRole('button', { name: 'Q1 중복 신고를 어떻게 막나요?' })
  const second = page.getByRole('button', { name: 'Q2 신고 조회를 어떻게 최적화하나요?' })
  await expect(first).toHaveAttribute('aria-expanded', 'false')
  await page.screenshot({ path: testInfo.outputPath('squad-interview-closed.png') })
  await first.click()
  await second.click()
  await expect(page.getByRole('textbox', { name: 'Q1 내 답변', exact: true })).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Q2 내 답변', exact: true })).toBeVisible()
  const savedAnswer = page.waitForResponse((response) => response.url().endsWith('/interview/practice') && response.request().method() === 'PUT' && response.ok())
  await page.getByRole('textbox', { name: 'Q1 내 답변', exact: true }).fill('요청 검증을 먼저 적용합니다.')
  await expect(page.getByText('답변 작성', { exact: true }).first().locator('..')).toContainText('1/2')
  await page.locator('#Q1').getByRole('button', { name: /버전 저장$/ }).click()
  await page.locator('#Q1').getByRole('button', { name: /AI 피드백 받기$/ }).click()
  await expect(page.getByText('검증 조건과 동시 요청 사례를 보강해 주세요.')).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('squad-interview-open.png') })
  await page.getByRole('tablist', { name: 'Q1 답변 탭' }).getByRole('tab', { name: /모범 답안$/ }).click()
  await expect(page.getByText('요청 검증', { exact: true })).toBeVisible()
  await first.click()
  await expect(first).toHaveAttribute('aria-expanded', 'false')
  await expect(second).toHaveAttribute('aria-expanded', 'true')
  // 개인 기록은 입력 후 500ms에 저장하므로 저장 응답 이후 재방문을 검증한다.
  await savedAnswer
  await page.reload()
  await first.click()
  await expect(page.getByRole('textbox', { name: 'Q1 내 답변', exact: true })).toHaveValue('요청 검증을 먼저 적용합니다.')
  await page.getByRole('button', { name: 'Q1 자신 있어요', exact: true }).click()
  await expect(page.getByText('자신 있음', { exact: true }).first().locator('..')).toContainText('1/2')
  await page.getByRole('button', { name: /연습 리포트$/ }).click()
  for (const name of ['모의 면접 평균 점수 추이', '분류별 평균 점수', '핵심 키워드 커버리지', '코드로 증명 가능한가?']) await expect(page.getByRole('heading', { name, exact: true })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('squad-interview-report.png') })
})

test('AI 자료실이 원본 레이아웃과 실제 설계 문서 미리보기·다운로드를 제공한다', async ({ page }, testInfo) => {
  await page.goto('/squad-files?workspaceId=42&ai=1')
  await expect(page.getByRole('heading', { name: '팀 자료실' })).toBeVisible()
  await expect(page.getByPlaceholder('파일 및 폴더 이름 검색...')).toBeVisible()
  await expect(page.getByRole('button', { name: /새 폴더$/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /업로드$/ })).toBeVisible()
  await expect(page.getByText('업로더 (Owner)')).toBeVisible()
  await expect(page.getByText('00_AI_설계서 (자동 생성)', { exact: true })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('squad-files.png') })
  await page.getByRole('button', { name: /AI 설계서$/ }).click()
  await page.getByRole('button', { name: /01_기획_시나리오\.md$/ }).click()
  const preview = page.getByRole('dialog', { name: '01_기획_시나리오.md' })
  await expect(preview).toContainText(design.title)
  await expect(preview).toContainText('위치 기반 신고')
  const downloadEvent = page.waitForEvent('download')
  await preview.getByRole('button', { name: /다운로드$/ }).click()
  const download = await downloadEvent
  expect(download.suggestedFilename()).toBe('01_기획_시나리오.md')
  await page.getByRole('button', { name: '설계서 미리보기 닫기' }).click()
  await page.getByRole('button', { name: /뒤로가기$/ }).click()
  await page.getByRole('button', { name: /새 폴더$/ }).click()
  await expect(page.getByRole('heading', { name: '새 폴더 만들기' })).toBeVisible()
})

test('AI 설정에서 초대 모달을 열고 링크 복사와 계정 초대를 실행한다', async ({ page, context }, testInfo) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/squad-settings?workspaceId=42&ai=1')
  await page.getByRole('button', { name: /팀원 관리$/ }).click()
  await page.getByRole('button', { name: /팀원 초대$/ }).click()
  const modal = page.getByRole('dialog', { name: '팀원 초대하기' })
  await expect(modal).toBeVisible()
  await expect(page.getByLabel('초대 링크 (누구나 참여 가능)')).toHaveValue('http://127.0.0.1:4174/workspace-hub?inviteToken=42.test-signed-token')
  await page.screenshot({ path: testInfo.outputPath('squad-invite.png') })
  await modal.getByRole('button', { name: '복사', exact: true }).click()
  await expect(modal.getByRole('status')).toContainText('초대 링크를 복사했습니다.')
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('/workspace-hub?inviteToken=42.test-signed-token')
  await page.getByLabel('팀원의 이메일 주소').fill('team@example.com')
  const requestEvent = page.waitForRequest((request) => request.method() === 'POST' && request.url().endsWith('/api/workspaces/hub/projects/42/invites'))
  await modal.getByRole('button', { name: '초대 보내기' }).click()
  expect((await requestEvent).postDataJSON()).toEqual({ email: 'team@example.com' })
  await expect(modal.getByRole('status')).toContainText('DevPath 계정에 초대 알림을 보냈습니다.')
  await page.getByRole('button', { name: '초대 모달 닫기' }).click()
  await expect(modal).toBeHidden()
})


test('대시보드가 원본 AI 설계 요약·로드맵·공지와 실제 팀원만 표시한다', async ({ page }, testInfo) => {
  await page.goto('/squad-dashboard?workspaceId=42&ai=1&created=ai')
  await expect(page.getByRole('dialog', { name: '워크스페이스 생성 완료' })).toBeVisible()
  await page.getByRole('button', { name: '대시보드 보기', exact: true }).click()
  await expect(page.getByRole('heading', { name: design.title, exact: true })).toHaveCSS('color', 'rgb(0, 196, 113)')
  for (const name of ['개발 로드맵', 'MVP 검증 기능 진행률', '팀 공지사항']) await expect(page.getByRole('heading', { name })).toBeVisible()
  await expect(page.getByText('김개발')).toHaveCount(0)
  await expect(page.getByText('내 작업 완료율 0% · 완료 0개 / 전체 1개', { exact: true })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('squad-dashboard.png') })
  await page.getByTitle('새 공지 추가').click()
  await expect(page.getByRole('button', { name: /공지 등록|등록하기/ })).toBeVisible()
  await page.getByPlaceholder('공지 제목을 입력하세요').fill('설계 검토 안내')
  await page.getByPlaceholder('팀원들에게 알릴 내용을 입력하세요').fill('ERD를 함께 검토해 주세요.')
  const notice = page.waitForRequest((request) => request.method() === 'POST' && request.url().endsWith('/notices'))
  await page.getByRole('button', { name: /등록하기$/ }).click()
  expect((await notice).postDataJSON().content).toBe('ERD를 함께 검토해 주세요.')
  await expect(page.getByText('설계 검토 안내', { exact: true })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('squad-dashboard-notice.png') })
  await page.getByRole('link', { name: /프로젝트 설계서 전체 보기/ }).click()
  await expect(page.getByRole('heading', { name: /핵심 사용자 흐름/ })).toBeVisible()
  await expect(page.getByRole('heading', { name: '워크스페이스 반영 맵', exact: true })).toHaveCount(0)
  const aside = page.getByRole('complementary')
  await aside.hover()
  await expect(aside.getByRole('link', { name: /설계서 열기/ })).toHaveCount(0)
  await page.getByRole('button', { name: '아키텍처 & DB', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Database Schema (ERD)', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '개발 로드맵 & 면접', exact: true }).click()
  await expect(page.getByRole('heading', { name: /개발 구현 로드맵/ })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('squad-blueprint-aside.png') })
  await page.getByRole('button', { name: '기획 & 시나리오', exact: true }).click()
  await page.getByRole('button', { name: '개발 로드맵 & 면접', exact: true }).click()
  await expect(page.getByRole('heading', { name: /개발 구현 로드맵/ })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('squad-blueprint.png') })
})

test('AI 사이드바가 접힘 크기를 복원하고 바로가기 없이 여러 높이에서 모든 메뉴·설정 이동을 제공한다', async ({ page }, testInfo) => {
  await page.goto('/squad-api?workspaceId=42&ai=1')
  await expect(page.getByRole('heading', { name: '/reports', exact: true })).toBeVisible()
  const aside = page.locator('.squad-workspace-aside:visible')
  const menus = aside.locator('a.workspace-nav-item')
  const menuList = aside.locator('.ai-squad-menu-list')
  expect(await menus.evaluateAll((links) => links.map((link) => link.getAttribute('href')))).toEqual(['dashboard', 'blueprint', 'workspace', 'schedule', 'erd', 'api', 'review', 'meeting', 'files', 'interview', 'settings'].map((name) => `/squad-${name}?workspaceId=42&ai=1`))
  await expect(menus.nth(5)).toHaveClass(/active/)
  await expect(menus.nth(6)).toHaveAttribute('aria-disabled', 'true')
  for (const height of [900, 768, 640, 560]) {
    await page.setViewportSize({ width: 1440, height })
    await aside.hover()
    await expect(aside).toHaveCSS('width', '256px')
    await expect(menuList).toHaveCSS('overflow-y', 'hidden')
    await expect.poll(() => menuList.evaluate((element) => Math.max(0, element.scrollHeight - element.clientHeight)), { message: `화면 높이 ${height}px의 메뉴 넘침 높이` }).toBe(0)
    for (let index = 0; index < 11; index += 1) await expect(menus.nth(index)).toBeInViewport({ ratio: 1 })
    await expect(aside.getByRole('link', { name: /설계서 열기/ })).toHaveCount(0)
    await expect(menus.first().locator('.sidebar-text > span > span').first()).toHaveCSS('font-size', '13px')
    await page.mouse.wheel(0, 500)
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(null)))))
    expect(await menuList.evaluate((element) => element.scrollTop)).toBe(0)
    await page.screenshot({ path: testInfo.outputPath('squad-aside-restored-expanded-' + height + '.png') })
    await page.locator('main:visible').last().hover()
    await expect(aside).toHaveCSS('width', '80px')
    await expect(menuList).toHaveJSProperty('scrollTop', 0)
    await expect.poll(() => menuList.evaluate((element) => Math.max(0, element.scrollHeight - element.clientHeight)), { message: `화면 높이 ${height}px의 접힘 메뉴 넘침 높이` }).toBe(0)
    for (let index = 0; index < 11; index += 1) await expect(menus.nth(index)).toBeInViewport({ ratio: 1 })
    await expect(menus.first().locator('i')).toHaveCSS('line-height', '28px')
    if (height >= 768) {
      for (let index = 0; index < 11; index += 1) await expect(menus.nth(index)).toHaveCSS('height', '56px')
      await expect(aside.locator(':scope > div').first()).toHaveCSS('height', '80px')
    }
    await expect(aside.getByRole('link', { name: '기획 & 시나리오 설계서 열기' })).toHaveCount(0)
    await page.screenshot({ path: testInfo.outputPath('squad-aside-restored-collapsed-' + height + '.png') })
  }
  await aside.hover()
  await menus.last().click()
  await expect(page.getByRole('heading', { name: /환경 설정$/ })).toBeVisible()
  await expect(page.locator('.squad-workspace-aside:visible').locator('a.workspace-nav-item').last()).toHaveClass(/active/)
})

test('팀 자료실 첫 조회 중에도 AI 사이드바의 펼침 상태와 메뉴 위치를 유지한다', async ({ page }, testInfo) => {
  let releaseModule!: () => void
  const modulePending = new Promise<void>((resolve) => { releaseModule = resolve })
  await page.route('**/src/features/squad/SquadFilesApp.tsx*', async (route) => {
    await modulePending
    await route.continue()
  })
  let releaseFiles!: () => void
  const filesPending = new Promise<void>((resolve) => { releaseFiles = resolve })
  await page.route('**/api/workspaces/42/files', async (route) => {
    await filesPending
    await route.fallback()
  })
  await page.goto('/squad-api?workspaceId=42&ai=1')
  await expect(page.getByRole('heading', { name: '/reports', exact: true })).toBeVisible()
  const aside = page.locator('.squad-workspace-aside:visible')
  await aside.hover()
  await expect(aside).toHaveCSS('width', '256px')
  const position = () => aside.locator('a.workspace-nav-item').evaluateAll((links) => links.map((link) => ({ top: link.getBoundingClientRect().top, height: link.getBoundingClientRect().height })))
  const baseline = await position()
  try {
    await aside.getByRole('link', { name: /팀 자료실/ }).click()
    await expect(page).toHaveURL('/squad-files?workspaceId=42&ai=1')
    await expect(aside).toHaveClass(/ai-squad-aside.*is-expanded|is-expanded.*ai-squad-aside/)
    await expect(page.getByRole('status')).toHaveText('팀 자료실을 불러오는 중입니다...')
    await expect(aside).toHaveCSS('width', '256px')
    await expect(aside.getByRole('link', { name: /팀 자료실/ })).toHaveClass(/active/)
    await expect(aside.getByRole('link', { name: /목록으로 돌아가기/ })).toContainText(design.title)
    await expect.poll(async () => (await position()).every((row, index) => Math.abs(row.top - baseline[index].top) < 1 && Math.abs(row.height - baseline[index].height) < 1)).toBe(true)
    await page.screenshot({ path: testInfo.outputPath('files-aside-loading.png') })
    // 정지한 포인터로 로딩 사이드바를 넘겨받아도 실제 자료실의 메뉴 위치가 바뀌면 안 된다.
    await aside.hover()
    releaseModule()
    await expect(page.locator('.squad-files-page')).toBeVisible()
    await expect(aside).toHaveClass(/is-expanded/)
    await expect.poll(async () => (await position()).every((row, index) => Math.abs(row.top - baseline[index].top) < 1 && Math.abs(row.height - baseline[index].height) < 1)).toBe(true)
    releaseFiles()
    await expect(page.getByRole('heading', { name: /팀 자료실/ })).toBeVisible()
    await expect.poll(async () => (await position()).every((row, index) => Math.abs(row.top - baseline[index].top) < 1 && Math.abs(row.height - baseline[index].height) < 1)).toBe(true)
    await page.locator('main:visible').hover()
    await expect(aside).toHaveCSS('width', '80px')
    await aside.hover()
    await expect(aside).toHaveCSS('width', '256px')
    await aside.getByRole('link', { name: /API 명세서/ }).click()
    await expect(page.getByRole('heading', { name: '/reports', exact: true })).toBeVisible()
  } finally {
    releaseModule()
    releaseFiles()
  }
})

test('AI 사이드바가 페이지 왕복 중 펼침 상태와 메뉴 위치를 유지한다', async ({ page }, testInfo) => {
  await page.goto('/squad-api?workspaceId=42&ai=1')
  await expect(page.getByRole('heading', { name: '/reports', exact: true })).toBeVisible()
  const aside = page.locator('.squad-workspace-aside:visible')
  const menus = aside.locator('a.workspace-nav-item')
  const position = () => menus.evaluateAll((links) => links.map((link) => ({ top: link.getBoundingClientRect().top, height: link.getBoundingClientRect().height })))
  for (const height of [900, 768]) {
    await page.setViewportSize({ width: 1440, height })
    await aside.hover()
    await expect(aside).toHaveCSS('width', '256px')
    const baseline = await position()
    for (const pageName of ['dashboard', 'workspace', 'schedule', 'api', 'workspace', 'blueprint', 'dashboard', 'schedule', 'workspace', 'api']) {
      await aside.locator(`a[href="/squad-${pageName}?workspaceId=42&ai=1"]`).click()
      await expect(page).toHaveURL(`/squad-${pageName}?workspaceId=42&ai=1`)
      await expect(aside.locator(`a[href="/squad-${pageName}?workspaceId=42&ai=1"]`)).toHaveClass(/active/)
      await expect(aside).toHaveClass(/is-expanded/)
      await expect.poll(async () => (await position()).every((row, index) => Math.abs(row.top - baseline[index].top) < 1 && Math.abs(row.height - baseline[index].height) < 1), { message: `${height}px에서 ${pageName} 전환 후 메뉴 위치 유지` }).toBe(true)
      for (let index = 0; index < 11; index += 1) await expect(menus.nth(index)).toBeInViewport({ ratio: 1 })
    }
    await page.screenshot({ path: testInfo.outputPath(`squad-aside-navigation-${height}.png`) })
    await page.locator('main:visible').last().hover()
    await expect(aside).toHaveCSS('width', '80px')
    await expect(aside).not.toHaveClass(/is-expanded/)
  }
})

test('작업 현황판이 생성·수정·상태 이동을 저장하고 다시 불러온다', async ({ page }, testInfo) => {
  await page.goto('/squad-workspace?workspaceId=42&ai=1')
  await page.getByRole('button', { name: /작업 추가/ }).click()
  await page.getByLabel('작업 제목').fill('신고 화면 만들기')
  await page.getByLabel('담당자 배정').selectOption('77')
  const create = page.waitForRequest((request) => request.method() === 'POST' && request.url().endsWith('/tasks'))
  await page.getByRole('button', { name: '저장하기', exact: false }).click()
  expect((await create).postDataJSON()).toMatchObject({ title: '신고 화면 만들기', assigneeId: 77, description: '[task-tag:FE]\n' })
  await expect(page.getByText('신고 화면 만들기', { exact: true })).toBeVisible()
  await page.reload()
  await page.getByText('신고 화면 만들기', { exact: true }).click()
  await page.getByLabel('작업 제목').fill('신고 화면 수정')
  const update = page.waitForRequest((request) => request.method() === 'PUT' && request.url().endsWith('/tasks/102'))
  await page.getByRole('button', { name: /수정|저장/ }).last().click()
  expect((await update).postDataJSON().title).toBe('신고 화면 수정')
  await expect(page.getByText('신고 화면 수정', { exact: true })).toBeVisible()
  const card = page.getByText('신고 화면 수정', { exact: true }).locator('..')
  const doneColumn = page.locator('#col-done')
  const move = page.waitForRequest((request) => request.method() === 'PATCH' && request.url().endsWith('/tasks/102/status'))
  await card.dragTo(doneColumn)
  expect((await move).postDataJSON()).toEqual({ status: 'DONE' })
  await expect(doneColumn.getByText('신고 화면 수정', { exact: true })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('squad-kanban.png') })
})

test('캘린더가 원본 Phase 타임라인·월간·주간과 일정 추가를 제공한다', async ({ page }, testInfo) => {
  await page.goto('/squad-schedule?workspaceId=42&ai=1')
  await expect(page.getByText('AI 개발 로드맵 타임라인')).toBeVisible()
  await page.getByRole('button', { name: '주간 (Week)', exact: true }).click()
  await page.getByRole('button', { name: '월간 (Month)', exact: true }).click()
  await page.getByRole('button', { name: /일정 추가/ }).click()
  await page.getByPlaceholder('예. 결제 모듈 API 구현').fill('팀 설계 검토')
  const create = page.waitForRequest((request) => request.method() === 'POST' && request.url().endsWith('/calendar-events'))
  await page.getByRole('button', { name: /추가하기|저장하기|일정 등록/ }).click()
  expect((await create).postDataJSON().title).toBe('팀 설계 검토')
  await expect(page.getByPlaceholder('예. 결제 모듈 API 구현')).toHaveCount(0)
  await page.screenshot({ path: testInfo.outputPath('squad-calendar.png') })
})

test('대시보드 로드맵은 생성 첫 주를 강조하고 페이지를 열어 둬도 다음 주로 전환한다', async ({ page }, testInfo) => {
  // 날짜 전환 검증과 화면 캡처가 외부 폰트 CDN의 응답에 종속되지 않도록 한다.
  await page.route('https://cdn.jsdelivr.net/**', (route) => route.abort())
  await page.route('https://fonts.googleapis.com/**', (route) => route.abort())
  await page.clock.setFixedTime(new Date('2026-10-06T12:00:00'))
  const roadmap = [1, 2, 3, 4].map((phase) => ({ phase, title: `단계 ${phase}`, goal: '개발', estimatedWeeks: phase === 2 ? 2 : 1, tasks: ['구현'] }))
  await page.route('**/api/workspaces/hub/projects/42/ai-design', (route) => route.fulfill({ json: { success: true, data: { workspaceId: 42, design: { ...design, roadmap } } } }))
  await page.route('**/api/workspaces/42/calendar-events', (route) => route.fulfill({ json: { success: true, data: [] } }))
  await page.route('**/api/workspaces/42/tasks', (route) => route.fulfill({ json: { success: true, data: [] } }))
  // 외부 폰트 다운로드 종료 대신 실제 로드맵 단계가 표시될 때까지 기다린다.
  await page.goto('/squad-dashboard?workspaceId=42&ai=1', { waitUntil: 'domcontentloaded' })
  const first = page.getByRole('link', { name: 'Phase 1. 단계 1', exact: true })
  const second = page.getByRole('link', { name: 'Phase 2. 단계 2', exact: true })
  await expect(first).toHaveAttribute('aria-current', 'step')
  await expect(first.locator('[aria-hidden]')).toHaveClass(/bg-purple-500/)
  await expect(first).toContainText('10.06 ~ 10.12')
  await expect(second).not.toHaveAttribute('aria-current')
  await expect(page.getByText('개발 로드맵 · Phase 1. 단계 1', { exact: true })).toBeVisible()
  await page.clock.setFixedTime(new Date('2026-10-13T00:00:00'))
  await expect(second).toHaveAttribute('aria-current', 'step', { timeout: 12_000 })
  await expect(page.getByText('개발 로드맵 · Phase 2. 단계 2', { exact: true })).toBeVisible()
  await expect(second).toContainText('10.13 ~ 10.26')
  await expect(second).not.toContainText(/\d+주/)
  await expect(first.locator('[aria-hidden]')).toHaveClass(/bg-brand/)
  await expect(first).toContainText('기간 종료')
  await page.clock.setFixedTime(new Date('2026-10-20T12:00:00'))
  await expect(second).toHaveAttribute('aria-current', 'step')
  await expect(page.getByText('개발 로드맵 · Phase 2. 단계 2', { exact: true })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('dashboard-roadmap-next-week.png'), animations: 'disabled' })
})

test('대시보드 로드맵은 모든 저장 Phase 일정을 반영하고 같은 번호의 회의를 제외한다', async ({ page }) => {
  await page.route('https://cdn.jsdelivr.net/**', (route) => route.abort())
  await page.route('https://fonts.googleapis.com/**', (route) => route.abort())
  await page.clock.setFixedTime(new Date('2026-11-06T12:00:00'))
  const roadmap = [1, 2, 3, 4].map((phase) => ({ phase, title: `단계 ${phase}`, goal: '개발', estimatedWeeks: 1, tasks: ['구현'] }))
  await page.route('**/api/workspaces/hub/projects/42/ai-design', (route) => route.fulfill({ json: { success: true, data: { workspaceId: 42, design: { ...design, roadmap } } } }))
  const dates = [['2026-09-28', '2026-10-04'], ['2026-10-05', '2026-10-11'], ['2026-10-12', '2026-10-18'], ['2026-11-01', '2026-11-07']]
  await page.route('**/api/workspaces/42/calendar-events', (route) => route.fulfill({ json: { success: true, data: [
    { eventId: 299, workspaceId: 42, title: 'Phase 4. 팀 회의', description: '[schedule-category:meeting]', startAt: '2026-09-01T00:00:00', endAt: '2026-09-01T23:59:00' },
    ...roadmap.map((phase, index) => ({ eventId: 201 + index, workspaceId: 42, title: `Phase ${phase.phase}. ${phase.title}`, description: '[schedule-category:milestone]', startAt: `${dates[index][0]}T00:00:00`, endAt: `${dates[index][1]}T23:59:00` })),
  ] } }))
  await page.goto('/squad-dashboard?workspaceId=42&ai=1', { waitUntil: 'domcontentloaded' })
  const current = page.getByRole('link', { name: 'Phase 4. 단계 4', exact: true })
  await expect(current).toHaveAttribute('aria-current', 'step')
  await expect(current).toContainText('11.01 ~ 11.07')
  await expect(current.locator('[aria-hidden]')).toHaveClass(/bg-purple-500/)
  await expect(page.getByText('개발 로드맵 · Phase 4. 단계 4', { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Phase 1. 단계 1', exact: true })).toContainText('기간 종료')
})

test('Phase의 실제 날짜를 색상으로 표시하고 캘린더 이동과 마지막 설정 메뉴를 유지한다', async ({ page }, testInfo) => {
  await page.clock.setFixedTime(new Date('2026-10-06T12:00:00+09:00'))
  const roadmap = [1, 2, 3, 4].map((phase) => ({ phase, title: `단계 ${phase}`, goal: '개발', estimatedWeeks: 1, tasks: ['구현'] }))
  await page.route('**/api/workspaces/hub/projects/42/ai-design', (route) => route.fulfill({ json: { success: true, data: { workspaceId: 42, dashboardUrl: '/squad-dashboard?workspaceId=42&ai=1', createdAt: '2026-09-28T00:00:00', design: { ...design, roadmap } } } }))
  const dates = [['2026-09-28', '2026-10-05'], ['2026-10-06', '2026-10-13'], ['2026-10-14', '2026-10-21'], ['2026-11-01', '2026-11-08']]
  await page.route('**/api/workspaces/42/calendar-events', (route) => route.fulfill({ json: { success: true, data: [
    { eventId: 299, workspaceId: 42, title: 'Phase 2. 팀 회의', description: '[schedule-category:meeting]', startAt: '2026-09-01T00:00:00', endAt: '2026-09-01T23:59:00' },
    ...roadmap.map((phase, index) => ({ eventId: 201 + index, workspaceId: 42, title: `Phase ${phase.phase}. ${phase.title}`, description: '[schedule-category:milestone]', startAt: `${dates[index][0]}T00:00:00`, endAt: `${dates[index][1]}T23:59:00` })),
  ] } }))
  await page.goto('/squad-schedule?workspaceId=42&ai=1')
  const current = page.getByRole('button', { name: 'Phase 2. 단계 2', exact: true })
  await expect(current).toHaveAttribute('aria-current', 'step')
  await expect(current).toHaveClass(/bg-purple-50/)
  await expect(current).toContainText('10.06 ~ 10.13')
  await expect(page.getByRole('button', { name: 'Phase 1. 단계 1', exact: true })).toContainText('✓')
  await expect(page.getByRole('button', { name: 'Phase 3. 단계 3', exact: true })).toHaveClass(/bg-white/)
  await page.getByRole('button', { name: '주간 (Week)', exact: true }).click()
  await expect(current).toHaveAttribute('aria-current', 'step')
  await page.getByRole('button', { name: '월간 (Month)', exact: true }).click()
  await page.getByRole('button', { name: 'Phase 4. 단계 4', exact: true }).click()
  await expect(page.getByRole('heading', { name: '2026년 11월', exact: true })).toBeVisible()
  await expect(current).toHaveAttribute('aria-current', 'step')
  await page.getByRole('button', { name: '오늘', exact: true }).click()
  await expect(page.getByRole('heading', { name: '2026년 10월', exact: true })).toBeVisible()
  const aside = page.getByRole('complementary').filter({ has: page.getByRole('navigation') })
  await aside.hover()
  const settings = aside.locator('a.workspace-nav-item').last()
  await expect(settings).toContainText('스쿼드 설정')
  await expect(settings).toHaveAttribute('href', '/squad-settings?workspaceId=42&ai=1')
  await page.screenshot({ path: testInfo.outputPath('squad-phase-current.png'), animations: 'disabled' })
  await settings.click()
  await expect(page.getByRole('heading', { name: /환경 설정$/ })).toBeVisible()
  await expect(aside.locator('a.workspace-nav-item').last()).toHaveClass(/active/)
})

test('API 작업 연결이 현황판에서 담당자와 함께 저장되고 작업 카드와 양방향 이동한다', async ({ page }, testInfo) => {
  let content = JSON.stringify({ format: 'devpath-ai-api-v1', groups: ['알림'], endpoints: [{ ...design.apis[0], auth: 'None' }] })
  await page.route('**/api/workspaces/42/api-spec', async (route) => {
    if (route.request().method() === 'PUT') content = route.request().postDataJSON().content
    await route.fulfill({ json: { success: true, data: { content } } })
  })
  await page.goto('/squad-workspace?workspaceId=42&ai=1')
  await page.getByRole('button', { name: /작업 추가/ }).click()
  await page.getByLabel('작업 제목').fill('예약 API 구현')
  await page.getByLabel('담당자 배정').selectOption('77')
  await page.getByRole('checkbox', { name: /POST \/reports/ }).check()
  await page.locator('input[type="date"]').fill('2026-11-03')
  await page.screenshot({ path: testInfo.outputPath('squad-task-api-selection.png') })
  await page.getByRole('button', { name: '저장하기', exact: false }).click()
  await expect(page.locator('.squad-workspace-task-modal-content')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: '예약 API 구현', exact: true })).toBeVisible()
  expect(JSON.parse(content).endpoints[0]).toMatchObject({ task: 'DP-102', auth: 'None', status: 'todo' })
  expect(JSON.parse(content).groups).toContain('알림')
  await page.goto('/squad-api?workspaceId=42&ai=1')
  await expect(page.getByText('없음', { exact: true })).toBeVisible()
  await expect(page.getByText('None', { exact: true })).toHaveCount(0)
  const curl = page.getByRole('heading', { name: 'cURL 예시', exact: true }).locator('..').locator('..')
  await expect(curl).not.toContainText('Authorization')
  await expect(curl).not.toContainText('JSESSIONID')
  await expect(page.getByText('AI 설계서 연결', { exact: true })).toHaveCount(0)
  await expect(page.getByLabel('A1 작업 카드 연결', { exact: true })).toHaveCount(0)
  const taskLink = page.getByRole('link', { name: '#DP-102 ·11.03 마감', exact: true })
  await expect(taskLink).toBeVisible()
  await expect(page.locator('.ai-api-detail-panel').getByText('실제 사용자', { exact: true })).toBeVisible()
  await taskLink.click()
  await expect(page.getByRole('heading', { name: /작업 수정$/ })).toBeVisible()
  await expect(page.getByLabel('작업 제목')).toHaveValue('예약 API 구현')
  const modal = page.locator('.squad-workspace-task-modal-content')
  await expect(modal.getByRole('link', { name: 'POST /reports', exact: true })).toBeVisible()
  await expect(modal.getByRole('checkbox', { name: /POST \/reports/ })).toBeChecked()
  await page.getByLabel('담당자 배정').selectOption('')
  await page.locator('input[type="date"]').fill('2026-12-01')
  await page.getByRole('button', { name: '저장하기', exact: false }).click()
  await expect(modal).toHaveCount(0)
  const card = page.locator('.kanban-card').filter({ hasText: '예약 API 구현' })
  await card.getByRole('link', { name: 'POST /reports', exact: true }).click()
  await expect(page.getByLabel('A1 작업 카드 연결', { exact: true })).toHaveCount(0)
  await expect(page.getByText('미지정', { exact: true })).toBeVisible()
  const updatedLink = page.getByRole('link', { name: '#DP-102 ·12.01 마감', exact: true })
  await expect(updatedLink).toBeVisible()
  await expect(page.locator('.ai-api-detail-panel')).toHaveCSS('opacity', '1')
  await page.screenshot({ path: testInfo.outputPath('squad-api-task-linked.png') })
  await updatedLink.click()
  await page.getByRole('checkbox', { name: /POST \/reports/ }).uncheck()
  await page.getByRole('button', { name: '저장하기', exact: false }).click()
  await expect(modal).toHaveCount(0)
  expect(JSON.parse(content).endpoints[0].task).toBe('')
  expect(JSON.parse(content).groups).toContain('알림')
  await expect(page.getByRole('link', { name: 'POST /reports', exact: true })).toHaveCount(0)
  await page.goto('/squad-api?workspaceId=42&ai=1')
  await expect(page.getByRole('heading', { name: '/reports', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: /#DP-102/ })).toHaveCount(0)
})

test('API 작업 연결 저장 실패를 표시하고 재시도해도 새 작업이 중복 생성되지 않는다', async ({ page }) => {
  let endpoint = { id: 'A1', group: 'AUTH', method: 'POST', path: '/reports', desc: '신고 생성', auth: 'None', source: 'ai', status: 'todo', task: 'DP-101', response: { status: 200, body: {} } }
  let fail = true
  let creates = 0
  page.on('request', (request) => { if (request.method() === 'POST' && request.url().endsWith('/tasks')) creates += 1 })
  await page.route('**/api/workspaces/42/api-spec', async (route) => {
    if (route.request().method() === 'PUT') {
      if (fail) { await route.fulfill({ status: 500, json: { success: false, message: '연결 저장 실패' } }); return }
      endpoint = JSON.parse(route.request().postDataJSON().content).endpoints[0]
    }
    await route.fulfill({ json: { success: true, data: { content: JSON.stringify({ format: 'devpath-api-v1', endpoints: [endpoint] }) } } })
  })
  await page.goto('/squad-workspace?workspaceId=42&ai=1')
  await page.getByRole('button', { name: /작업 추가/ }).click()
  await page.getByLabel('작업 제목').fill('연결 재시도 작업')
  await page.getByLabel('담당자 배정').selectOption('77')
  await page.getByRole('checkbox', { name: /POST \/reports/ }).check()
  endpoint.status = 'done'
  await page.getByRole('button', { name: '저장하기', exact: false }).click()
  await expect(page.getByRole('alert')).toContainText('작업은 저장되었지만 API 연결을 저장하지 못했습니다.')
  await expect(page.getByRole('alert')).toContainText('연결 저장 실패')
  await expect(page.getByRole('heading', { name: /작업 수정$/ })).toBeVisible()
  await expect(page.getByRole('checkbox', { name: /POST \/reports/ })).toBeChecked()
  expect(creates).toBe(1)
  expect(endpoint.task).toBe('DP-101')
  fail = false
  await page.getByRole('button', { name: '저장하기', exact: false }).click()
  await expect(page.locator('.squad-workspace-task-modal-content')).toHaveCount(0)
  expect(creates).toBe(1)
  expect(endpoint).toMatchObject({ task: 'DP-102', status: 'done', auth: 'None' })
  await page.reload()
  await expect(page.getByRole('heading', { name: '연결 재시도 작업', exact: true })).toHaveCount(1)
  await page.locator('.kanban-card').filter({ hasText: '연결 재시도 작업' }).click()
  await expect(page.getByRole('checkbox', { name: /POST \/reports/ })).toBeChecked()
})

test('API 설계서 연결 영역은 기능·로드맵·면접 근거가 있어도 표시하지 않으며 없는 작업을 추정하지 않는다', async ({ page }) => {
  const linkedDesign = { ...design, interviewQuestions: [{ ...design.interviewQuestions[0], apis: ['POST /reports'], tasks: ['API 구현'] }] }
  await page.route('**/api/workspaces/hub/projects/42/ai-design', (route) => route.fulfill({ json: { success: true, data: { workspaceId: 42, design: linkedDesign } } }))
  const endpoint = { id: 'A1', group: '신고', method: 'POST', path: '/reports', desc: '신고 생성', auth: 'None', source: 'ai', status: 'todo', feature: 'F1', task: 'DP-101', response: { status: 200, body: {} } }
  await page.route('**/api/workspaces/42/api-spec', (route) => route.fulfill({ json: { success: true, data: { content: JSON.stringify({ format: 'devpath-api-v1', endpoints: [endpoint] }) } } }))
  await page.goto('/squad-api?workspaceId=42&ai=1')
  await expect(page.getByRole('link', { name: '#DP-101 ·10.12 마감', exact: true })).toBeVisible()
  await expect(page.getByText('AI 설계서 연결', { exact: true })).toHaveCount(0)
  await expect(page.getByText('F1. 위치 기반 신고', { exact: false })).toHaveCount(0)
  await expect(page.getByText('Phase 1. 신고 구현', { exact: false })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Q1. 중복 신고를 어떻게 막나요?', exact: true })).toHaveCount(0)
  await expect(page.getByLabel('A1 작업 카드 연결', { exact: true })).toHaveCount(0)
  endpoint.task = 'DP-999'
  await page.reload()
  await expect(page.getByText('미지정', { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: /#DP-/ })).toHaveCount(0)
})

test('API 구현 상태와 팀 엔드포인트가 새로고침 후 유지된다', async ({ page }, testInfo) => {
  await page.goto('/squad-api?workspaceId=42&ai=1')
  await expect(page.getByText('Authorization: Bearer <access-token>', { exact: false })).toBeVisible()
  await page.getByLabel('A1 구현 상태', { exact: true }).click()
  const save = page.waitForRequest((request) => request.method() === 'PUT' && request.url().endsWith('/api-spec'))
  await page.getByRole('option', { name: /완료/ }).click()
  expect(JSON.parse((await save).postDataJSON().content).endpoints[0].status).toBe('done')
  await page.reload()
  await expect(page.getByLabel('A1 구현 상태', { exact: true })).toContainText('완료')
  await page.getByRole('button', { name: /엔드포인트 추가/ }).click()
  await page.getByLabel('경로').fill('/api/team-test')
  await page.getByLabel('설명', { exact: false }).fill('팀 보강 API')
  await page.getByRole('button', { name: '추가하기', exact: true }).click()
  await expect(page.getByRole('heading', { name: '/api/team-test', exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: '/api/team-test', exact: true })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('squad-api.png') })
})

test('API 버전 대신 도메인 분류를 목록·상세·추가에 표시하고 상태와 팀 분류를 보존한다', async ({ page }, testInfo) => {
  let content = JSON.stringify({ format: 'devpath-api-v1', endpoints: [
    { id: 'A-old', group: 'V1', method: 'GET', path: '/api/v1/reports', desc: '신고 조회', auth: 'JWT', source: 'ai', status: 'done', task: 'DP-101', response: { status: 200, body: {} } },
    { id: 'A-users', group: 'v1', method: 'GET', path: '/api/v1/users', desc: '회원 조회', auth: 'JWT', source: 'ai', status: 'progress', task: '', response: { status: 200, body: {} } },
    { id: 'A-team', group: '팀 콘텐츠', method: 'POST', path: '/api/v1/series/{seriesId}/articles', desc: '팀 콘텐츠 등록', auth: 'JWT', source: 'team', status: 'review', task: '', response: { status: 201, body: {} } },
  ] })
  await page.route('**/api/workspaces/42/api-spec', async (route) => {
    if (route.request().method() === 'PUT') content = route.request().postDataJSON().content
    await route.fulfill({ json: { success: true, data: { content } } })
  })
  await page.goto('/squad-api?workspaceId=42&ai=1#A-old')
  await expect(page.getByText('V1', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Reports', { exact: true })).toBeVisible()
  await expect(page.getByText('USERS (사용자)', { exact: true })).toBeVisible()
  await expect(page.getByText('팀 콘텐츠', { exact: true })).toBeVisible()
  await expect(page.getByText('A-old · Reports', { exact: true })).toBeVisible()
  await expect(page.getByLabel('A-old 구현 상태', { exact: true })).toContainText('완료')
  expect(JSON.parse(content).endpoints[0].group).toBe('V1')
  await page.getByRole('button', { name: /엔드포인트 추가/ }).click()
  const dialog = page.getByRole('dialog', { name: '엔드포인트 추가' })
  await expect(dialog.getByLabel('그룹').locator('option')).toHaveText(['Reports', 'USERS (사용자)', '팀 콘텐츠'])
  await dialog.getByLabel('그룹').selectOption('Users')
  await dialog.getByLabel('경로').fill('/api/v1/users/{userId}')
  await dialog.getByLabel('설명', { exact: false }).fill('회원 상세')
  await dialog.getByRole('button', { name: '추가하기', exact: true }).click()
  await expect(page.getByText('A1 · USERS (사용자)', { exact: true })).toBeVisible()
  const saved = JSON.parse(content).endpoints
  expect(saved[0]).toMatchObject({ id: 'A-old', group: 'Reports', status: 'done', task: 'DP-101' })
  expect(saved[2]).toMatchObject({ id: 'A-team', group: '팀 콘텐츠', source: 'team', status: 'review' })
  await page.reload()
  await expect(page.getByText('A1 · USERS (사용자)', { exact: true })).toBeVisible()
  await page.getByRole('button').filter({ has: page.getByText('/api/v1/users', { exact: true }) }).click()
  await expect(page.getByText('A-users · USERS (사용자)', { exact: true })).toBeVisible()
  await expect(page.getByLabel('A-users 구현 상태', { exact: true })).toContainText('진행 중')
  await expect(page.locator('.ai-api-detail-panel')).toHaveCSS('opacity', '1')
  await page.screenshot({ path: testInfo.outputPath('squad-api-domain-groups.png') })
})

test('API 응답 미정·직접 입력·수정 취소·JSON 검증·본문 없음과 재로드를 제공한다', async ({ page }, testInfo) => {
  let writes = 0
  let failNext = false
  page.on('request', (request) => { if (request.method() === 'PUT' && request.url().endsWith('/api-spec')) writes += 1 })
  await page.route('**/api/workspaces/42/api-spec', async (route) => {
    if (route.request().method() === 'PUT' && failNext) { failNext = false; await route.fulfill({ status: 500, json: { success: false, message: '응답 저장 실패' } }); return }
    await route.fallback()
  })
  await page.goto('/squad-api?workspaceId=42&ai=1')
  await page.getByRole('button', { name: /엔드포인트 추가/ }).click()
  const add = page.getByRole('dialog', { name: '엔드포인트 추가' })
  await add.getByLabel('경로', { exact: false }).fill('/reports/team')
  await add.getByLabel('설명', { exact: false }).fill('팀 신고 생성')
  await add.getByLabel('Method').selectOption('POST')
  const create = page.waitForRequest((request) => request.method() === 'PUT' && request.url().endsWith('/api-spec'))
  await add.getByRole('button', { name: '추가하기' }).click()
  expect(JSON.parse((await create).postDataJSON().content).endpoints[1].response).toBeNull()
  await expect(page.getByText('응답 미정', { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByText('응답 미정', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '응답 예시 수정', exact: true }).click()
  const edit = page.getByRole('dialog', { name: '응답 예시 수정' })
  await edit.getByLabel('응답 상태 코드').fill('201')
  await edit.getByLabel('응답 JSON 예시').fill('{')
  const beforeInvalid = writes
  await edit.getByRole('button', { name: '응답 예시 저장' }).click()
  await expect(edit.getByRole('alert')).toContainText('JSON 형식이 올바르지 않습니다.')
  expect(writes).toBe(beforeInvalid)
  await edit.getByRole('button', { name: '취소', exact: true }).click()
  await expect(page.getByText('응답 미정', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '응답 예시 수정', exact: true }).click()
  await expect(edit.getByLabel('응답 상태 코드')).toHaveValue('')
  await edit.getByLabel('응답 상태 코드').fill('201')
  await edit.getByLabel('응답 JSON 예시').fill('{"reportId":17,"message":"접수되었습니다."}')
  failNext = true
  await edit.getByRole('button', { name: '응답 예시 저장' }).click()
  await expect(page.getByText('응답 저장 실패', { exact: true })).toBeVisible()
  await expect(edit.getByLabel('응답 JSON 예시')).toHaveValue('{"reportId":17,"message":"접수되었습니다."}')
  await expect(edit.getByRole('button', { name: '응답 예시 저장' })).toBeEnabled()
  const save = page.waitForRequest((request) => request.method() === 'PUT' && request.url().endsWith('/api-spec'))
  await edit.getByRole('button', { name: '응답 예시 저장' }).click()
  const doc = JSON.parse((await save).postDataJSON().content)
  expect(doc.endpoints[1].response).toEqual({ status: 201, body: { reportId: 17, message: '접수되었습니다.' } })
  expect(doc.groups).toContain('Reports')
  expect(doc.endpoints[0]).toMatchObject({ id: 'A1', source: 'ai', response: { status: 200, body: {} } })
  await expect(edit).toHaveCount(0)
  await page.reload()
  await expect(page.getByText('201', { exact: true })).toBeVisible()
  await expect(page.getByText('"reportId"', { exact: true })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('squad-api-response-example.png'), animations: 'disabled' })
  await page.getByRole('button', { name: '응답 예시 수정', exact: true }).click()
  await edit.getByLabel('응답 상태 코드').fill('204')
  await edit.getByLabel('응답 JSON 예시').fill('')
  await edit.getByRole('button', { name: '응답 예시 저장' }).click()
  await expect(edit).toHaveCount(0)
  await page.reload()
  await expect(page.getByText('응답 본문 없음', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '응답 예시 수정', exact: true }).click()
  await edit.getByLabel('응답 상태 코드').fill('')
  await edit.getByRole('button', { name: '응답 예시 저장' }).click()
  await expect(edit).toHaveCount(0)
  await page.reload()
  await expect(page.getByText('응답 미정', { exact: true })).toBeVisible()
})

test('API AI 응답 초안의 입력 검증·429·검토 후 저장과 취소를 제공한다', async ({ page }, testInfo) => {
  let generations = 0
  let writes = 0
  let generatedInput: Record<string, unknown> = {}
  page.on('request', (request) => { if (request.method() === 'PUT' && request.url().endsWith('/api-spec')) writes += 1 })
  await page.route('**/api/workspaces/42/api-spec/response-draft', async (route) => {
    generations += 1
    generatedInput = route.request().postDataJSON()
    if (generations === 1) { await route.fulfill({ status: 429, json: { success: false, message: 'AI 요청이 몰리고 있습니다.' } }); return }
    await route.fulfill({ json: { success: true, data: { status: 201, body: '{"reportId":21,"status":"RECEIVED"}' } } })
  })
  await page.goto('/squad-api?workspaceId=42&ai=1')
  await page.getByRole('button', { name: /엔드포인트 추가/ }).click()
  const add = page.getByRole('dialog', { name: '엔드포인트 추가' })
  await add.getByRole('button', { name: 'AI로 응답 초안 만들기' }).click()
  await expect(add.getByRole('alert')).toContainText('경로와 설명을 먼저 입력해 주세요.')
  expect(generations).toBe(0)
  await add.getByLabel('경로', { exact: false }).fill('/reports/ai')
  await add.getByLabel('설명', { exact: false }).fill('신고 접수')
  await add.getByLabel('응답 상태 코드').fill('200')
  await add.getByLabel('응답 JSON 예시').fill('{"keep":true}')
  await add.getByRole('button', { name: 'AI로 응답 초안 만들기' }).click()
  await expect(add.getByRole('alert')).toContainText('AI 요청이 몰리고 있습니다.')
  await expect(add.getByLabel('응답 JSON 예시')).toHaveValue('{"keep":true}')
  await add.getByRole('button', { name: 'AI로 응답 초안 만들기' }).click()
  await expect(add.getByLabel('응답 상태 코드')).toHaveValue('201')
  await expect(add.getByLabel('응답 JSON 예시')).toHaveValue('{"reportId":21,"status":"RECEIVED"}')
  expect(generatedInput).toMatchObject({ path: '/reports/ai', description: '신고 접수', group: 'Reports' })
  expect(writes).toBe(0)
  await page.screenshot({ path: testInfo.outputPath('squad-api-response-ai-draft.png'), animations: 'disabled' })
  await add.getByRole('button', { name: '취소', exact: true }).click()
  expect(writes).toBe(0)
  await expect(page.getByRole('button', { name: /\/reports\/ai/ })).toHaveCount(0)
  await page.getByRole('button', { name: '응답 예시 수정', exact: true }).click()
  const edit = page.getByRole('dialog', { name: '응답 예시 수정' })
  await edit.getByRole('button', { name: 'AI로 응답 초안 만들기' }).click()
  await expect(edit.getByLabel('응답 상태 코드')).toHaveValue('201')
  expect(writes).toBe(0)
  await edit.getByLabel('응답 JSON 예시').fill('{"reportId":22}')
  await edit.getByRole('button', { name: '응답 예시 저장' }).click()
  await expect(edit).toHaveCount(0)
  await page.reload()
  await expect(page.getByText('201', { exact: true })).toBeVisible()
  await expect(page.getByText('"reportId"', { exact: true })).toBeVisible()
})

test('API 리소스 그룹을 독립 생성·검증하고 추가 모달에서도 새 그룹을 선택한다', async ({ page }, testInfo) => {
  await page.goto('/squad-api?workspaceId=42&ai=1')
  await page.getByRole('button', { name: /리소스 그룹 추가/ }).click()
  const groupDialog = page.getByRole('dialog', { name: '리소스 그룹 추가' })
  await groupDialog.getByLabel('그룹 이름').fill('   ')
  await groupDialog.getByRole('button', { name: '그룹 만들기' }).click()
  await expect(groupDialog.getByRole('alert')).toContainText('그룹 이름을 입력해 주세요.')
  await groupDialog.getByLabel('그룹 이름').fill('reports')
  await groupDialog.getByRole('button', { name: '그룹 만들기' }).click()
  await expect(groupDialog.getByRole('alert')).toContainText('이미 있는 리소스 그룹입니다.')
  await groupDialog.getByLabel('그룹 이름').fill(' PAYMENTS (결제) ')
  const groupSave = page.waitForRequest((request) => request.method() === 'PUT' && request.url().endsWith('/api-spec'))
  await groupDialog.getByRole('button', { name: '그룹 만들기' }).click()
  const document = JSON.parse((await groupSave).postDataJSON().content)
  expect(document.groups).toContain('PAYMENTS (결제)')
  expect(document.endpoints).toHaveLength(1)
  await expect(groupDialog).toHaveCount(0)
  await expect(page.getByText('PAYMENTS (결제)', { exact: true })).toBeVisible()
  await expect(page.getByText('이 그룹에 엔드포인트가 없습니다.', { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByText('PAYMENTS (결제)', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: /엔드포인트 추가/ }).click()
  const endpointDialog = page.getByRole('dialog', { name: '엔드포인트 추가' })
  await expect(endpointDialog.getByLabel('리소스 그룹').locator('option[value="PAYMENTS (결제)"]')).toHaveCount(1)
  await endpointDialog.getByRole('button', { name: '새 그룹 만들기' }).click()
  await groupDialog.getByLabel('그룹 이름').fill('알림')
  await groupDialog.getByRole('button', { name: '그룹 만들기' }).click()
  await expect(groupDialog).toHaveCount(0)
  await expect(endpointDialog.getByLabel('리소스 그룹')).toHaveValue('알림')
  await endpointDialog.getByLabel('경로', { exact: false }).fill('/notifications')
  await endpointDialog.getByLabel('설명', { exact: false }).fill('알림 조회')
  await endpointDialog.getByRole('button', { name: '추가하기' }).click()
  await expect(page.getByRole('heading', { name: '/notifications', exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByText('A2 · 알림', { exact: true })).toBeVisible()
  await expect(page.getByText('PAYMENTS (결제)', { exact: true })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('squad-api-custom-groups.png'), animations: 'disabled' })
})

test('API 엔드포인트 삭제 취소·실패·재시도·전체 삭제와 중복 없는 재추가를 제공한다', async ({ page }, testInfo) => {
  let content = JSON.stringify({ format: 'devpath-api-v1', endpoints: [
    { id: 'A1', group: 'Reports', method: 'POST', path: '/reports', desc: '신고 생성', auth: 'JWT', source: 'ai', status: 'done', task: 'DP-101', response: { status: 201, body: {} } },
    { id: 'A2', group: 'Reports', method: 'GET', path: '/reports/{id}', desc: '신고 조회', auth: 'JWT', source: 'team', status: 'todo', task: '', response: { status: 200, body: {} } },
  ] })
  let failNext = true
  let writes = 0
  await page.route('**/api/workspaces/42/api-spec', async (route) => {
    if (route.request().method() === 'PUT') {
      writes += 1
      if (failNext) { failNext = false; await route.fulfill({ status: 500, json: { success: false, message: '명세 저장 실패' } }); return }
      content = route.request().postDataJSON().content
    }
    await route.fulfill({ json: { success: true, data: { content } } })
  })
  await page.goto('/squad-api?workspaceId=42&ai=1#A1')
  const remove = page.getByRole('button', { name: '엔드포인트 삭제', exact: true })
  await expect(remove).toBeVisible()
  page.once('dialog', (dialog) => void dialog.dismiss())
  await remove.click()
  expect(writes).toBe(0)
  await expect(page.getByRole('heading', { name: '/reports', exact: true })).toBeVisible()
  page.once('dialog', (dialog) => void dialog.accept())
  await remove.click()
  await expect(page.getByText('명세 저장 실패', { exact: true })).toBeVisible()
  await expect(remove).toBeEnabled()
  expect(JSON.parse(content).endpoints).toHaveLength(2)
  await expect(page.getByRole('heading', { name: '/reports', exact: true })).toBeVisible()
  page.once('dialog', (dialog) => void dialog.accept())
  await remove.click()
  await expect(page.getByRole('heading', { name: '/reports/{id}', exact: true })).toBeVisible()
  expect(JSON.parse(content).endpoints.map((endpoint: { id: string }) => endpoint.id)).toEqual(['A2'])
  await page.getByRole('button', { name: /엔드포인트 추가/ }).click()
  const dialog = page.getByRole('dialog', { name: '엔드포인트 추가' })
  await dialog.getByLabel('경로', { exact: false }).fill('/reports/new')
  await dialog.getByLabel('설명', { exact: false }).fill('추가 신고')
  await dialog.getByRole('button', { name: '추가하기' }).click()
  await expect(page.getByText(/A3 ·/)).toBeVisible()
  expect(JSON.parse(content).endpoints.map((endpoint: { id: string }) => endpoint.id)).toEqual(['A2', 'A3'])
  for (const path of ['/reports/{id}', null]) {
    page.once('dialog', (dialog) => void dialog.accept())
    await remove.click()
    if (path) await expect(page.getByRole('heading', { name: path, exact: true })).toBeVisible()
    else await expect(page.getByRole('heading', { name: '등록된 엔드포인트가 없습니다.', exact: true })).toBeVisible()
  }
  expect(JSON.parse(content).endpoints).toEqual([])
  expect(JSON.parse(content).groups).toContain('Reports')
  await expect(page.getByText('구현 진행률', { exact: true }).locator('..')).toContainText('완료 0 · 진행 0 / 0')
  await expect(page.getByText('구현 진행률', { exact: true }).locator('..')).not.toContainText('%')
  await expect(remove).toHaveCount(0)
  await page.reload()
  await expect(page.getByRole('heading', { name: '등록된 엔드포인트가 없습니다.', exact: true })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('squad-api-deleted-empty.png'), animations: 'disabled' })
  await page.getByRole('button', { name: /엔드포인트 추가/ }).click()
  await dialog.getByLabel('경로', { exact: false }).fill('/reports/restart')
  await dialog.getByLabel('설명', { exact: false }).fill('새 명세')
  await dialog.getByRole('button', { name: '추가하기' }).click()
  await expect(page.getByRole('heading', { name: '/reports/restart', exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: '/reports/restart', exact: true })).toBeVisible()
})

test('새 AI API 문서의 명시된 기능 분류로 중첩 경로를 묶는다', async ({ page }) => {
  const endpoints = [
    { ...design.apis[0], group: 'Article', path: '/api/v1/series/{seriesId}/articles', description: '글 등록' },
    { ...design.apis[0], group: 'Article', method: 'GET', path: '/api/v1/articles/{articleId}', description: '글 조회' },
    { ...design.apis[0], group: 'Dashboard', method: 'GET', path: '/api/v1/authors/me/dashboard', description: '대시보드 조회' },
  ]
  await page.route('**/api/workspaces/42/api-spec', (route) => route.fulfill({ json: { success: true, data: { content: JSON.stringify({ format: 'devpath-ai-api-v1', endpoints }) } } }))
  await page.goto('/squad-api?workspaceId=42&ai=1')
  await expect(page.getByText('ARTICLE (글)', { exact: true })).toBeVisible()
  await expect(page.getByText('DASHBOARD (대시보드)', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: /글 조회/ }).click()
  await expect(page.getByText('A2 · ARTICLE (글)', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: /대시보드 조회/ }).click()
  await expect(page.getByText('A3 · DASHBOARD (대시보드)', { exact: true })).toBeVisible()
  await expect(page.getByText('V1', { exact: true })).toHaveCount(0)
})

for (const format of ['devpath-api-v1', 'devpath-ai-api-v1']) {
  test(`API 분류 한글 병기를 목록·상세·추가에 표시하고 저장 그룹을 보존한다 (${format})`, async ({ page }, testInfo) => {
    const endpoints = [
      { ...design.apis[0], group: 'AUTH', path: '/api/v1/auth/login', description: '로그인' },
      { ...design.apis[0], group: 'RESERVATIONS', path: '/api/v1/reservations', description: '예약 생성' },
      { ...design.apis[0], group: 'PLANT_CARE (식물 돌봄)', path: '/api/v1/plants/{plantId}/care', description: '돌봄 기록' },
    ]
    let content = JSON.stringify({ format, endpoints: format === 'devpath-ai-api-v1' ? endpoints : endpoints.map((api, index) => ({
      id: 'A' + (index + 1), group: api.group, method: api.method, path: api.path, desc: api.description, auth: api.auth, source: 'ai', status: 'todo', task: '', response: { status: 200, body: {} },
    })) })
    await page.route('**/api/workspaces/42/api-spec', async (route) => {
      if (route.request().method() === 'PUT') content = route.request().postDataJSON().content
      await route.fulfill({ json: { success: true, data: { content } } })
    })
    await page.goto('/squad-api?workspaceId=42&ai=1')
    await expect(page.getByText('AUTH (인증)', { exact: true })).toBeVisible()
    await expect(page.getByText('RESERVATIONS (예약)', { exact: true })).toBeVisible()
    await expect(page.getByText('PLANT_CARE (식물 돌봄)', { exact: true })).toBeVisible()
    await expect(page.getByText('A1 · AUTH (인증)', { exact: true })).toBeVisible()
    await page.getByLabel('A1 구현 상태', { exact: true }).click()
    await page.getByRole('option', { name: /완료/ }).click()
    await expect(page.getByLabel('A1 구현 상태', { exact: true })).toContainText('완료')
    expect(JSON.parse(content).endpoints.map((api: { group: string }) => api.group)).toEqual(endpoints.map((api) => api.group))
    await page.getByRole('button', { name: /엔드포인트 추가/ }).click()
    const dialog = page.getByRole('dialog', { name: '엔드포인트 추가' })
    await expect(dialog.getByLabel('그룹').locator('option')).toHaveText(['AUTH (인증)', 'RESERVATIONS (예약)', 'PLANT_CARE (식물 돌봄)'])
    await dialog.getByLabel('그룹').selectOption('RESERVATIONS')
    await dialog.getByLabel('경로').fill('/api/v1/reservations/{id}')
    await dialog.getByLabel('설명', { exact: false }).fill('예약 변경')
    await dialog.getByRole('button', { name: '추가하기', exact: true }).click()
    await expect(page.getByText('A4 · RESERVATIONS (예약)', { exact: true })).toBeVisible()
    expect(JSON.parse(content).endpoints[3]).toMatchObject({ group: 'RESERVATIONS', source: 'team' })
    await page.reload()
    await expect(page.getByText('A4 · RESERVATIONS (예약)', { exact: true })).toBeVisible()
    await expect(page.getByText('PLANT_CARE (식물 돌봄)', { exact: true })).toBeVisible()
    await expect(page.locator('.ai-api-detail-panel')).toHaveCSS('opacity', '1')
    await page.screenshot({ path: testInfo.outputPath('squad-api-korean-groups.png') })
  })
}

for (const tableCount of [1, 4, 12]) {
  test(`AI ERD ${tableCount}개 테이블의 기본 읽기 크기·캔버스 적응·확대와 이동 초기화를 제공한다`, async ({ page }, testInfo) => {
    const code = 'erDiagram\n' + Array.from({ length: tableCount }, (_, index) => `TABLE_${index + 1} {\n bigint id PK\n bigint owner_id FK\n varchar title\n datetime created_at\n }`).join('\n') + '\n' + Array.from({ length: tableCount - 1 }, (_, index) => `TABLE_${index === 0 ? 1 : 2} ||--o{ TABLE_${index + 2} : contains`).join('\n')
    await page.route('**/api/workspaces/42/erd', (route) => route.fulfill({ json: { success: true, data: { workspaceId: 42, projectName: design.title, mermaidCode: code, schemaJson: '{"tables":[],"relationships":[]}', version: 1, members: [{ memberId: 9, learnerId: 77, learnerName: '실제 사용자' }] } } }))
    await page.goto('/squad-erd?workspaceId=42&ai=1')
    const canvas = page.locator('.erd-diagram-wrapper')
    const diagram = page.locator('.erd-pan-zoom-container')
    const svg = diagram.locator('svg')
    const geometry = () => canvas.evaluate((element) => {
      const drawing = element.querySelector<SVGSVGElement>('.erd-pan-zoom-container svg')
      if (!drawing) return { width: 0, height: 0, sourceWidth: 0, sourceHeight: 0, viewportWidth: 0, viewportHeight: 0, scale: 0, centered: false }
      const rect = drawing.getBoundingClientRect()
      const viewport = element.getBoundingClientRect()
      return { width: rect.width, height: rect.height, sourceWidth: drawing.viewBox.baseVal.width, sourceHeight: drawing.viewBox.baseVal.height, viewportWidth: viewport.width, viewportHeight: viewport.height, scale: rect.width / drawing.viewBox.baseVal.width, centered: Math.abs(rect.x + rect.width / 2 - viewport.x - viewport.width / 2) < 1 && Math.abs(rect.y + rect.height / 2 - viewport.y - viewport.height / 2) < 1 }
    })
    await expect(svg).toBeVisible()
    await expect.poll(async () => { const value = await geometry(); return value.scale >= 0.699 && value.scale <= 1.001 && value.centered }).toBe(true)
    expect(await svg.locator('text').evaluateAll((labels) => labels.filter((label) => /^TABLE_\d+$/.test(label.textContent ?? '')).length)).toBe(tableCount)
    const initial = await geometry()
    expect(await svg.locator('text').first().evaluate((label) => label.getBoundingClientRect().height)).toBeGreaterThan(10)
    if (tableCount === 1) expect(initial.scale).toBeCloseTo(1)
    if (initial.sourceWidth * 0.7 <= initial.viewportWidth - 96 && initial.sourceHeight * 0.7 <= initial.viewportHeight - 96) {
      expect(initial.width).toBeLessThanOrEqual(initial.viewportWidth - 95)
      expect(initial.height).toBeLessThanOrEqual(initial.viewportHeight - 95)
    }
    await expect(canvas).toHaveCSS('overflow', 'hidden')
    await page.getByRole('button', { name: 'ERD 확대', exact: true }).click()
    await expect.poll(async () => (await geometry()).width).toBeGreaterThan(initial.width * 1.09)
    await page.getByRole('button', { name: 'ERD 축소', exact: true }).click()
    await expect.poll(async () => Math.abs((await geometry()).width - initial.width)).toBeLessThan(1)
    const bounds = (await canvas.boundingBox())!
    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height - 80)
    await page.mouse.down()
    await page.mouse.move(bounds.x + bounds.width / 2 + 80, bounds.y + bounds.height - 140)
    await page.mouse.up()
    await expect(diagram).toHaveAttribute('style', /translate\(80px, -60px\)/)
    await page.getByRole('button', { name: 'ERD 기본 보기', exact: true }).click()
    await expect.poll(async () => (await geometry()).centered).toBe(true)
    await page.setViewportSize({ width: 1200, height: 768 })
    await expect.poll(async () => { const value = await geometry(); return value.scale >= 0.699 && value.scale <= initial.scale + 0.001 && value.centered }).toBe(true)
    await page.getByRole('button', { name: 'ERD 확대', exact: true }).click()
    await page.getByRole('button', { name: 'ERD 기본 보기', exact: true }).click()
    await expect.poll(async () => (await geometry()).scale).toBeLessThanOrEqual(1)
    await page.screenshot({ path: testInfo.outputPath(`squad-erd-default-${tableCount}.png`), animations: 'disabled' })
    await page.reload()
    await expect.poll(async () => { const value = await geometry(); return value.scale >= 0.699 && value.scale <= 1.001 && value.centered }).toBe(true)
  })
}

test('ERD가 AI 초기 데이터 모델을 편집하고 버전 저장한다', async ({ page }, testInfo) => {
  await page.goto('/squad-erd?workspaceId=42&ai=1')
  await expect(page.getByText('AI 추천 스키마를 불러왔습니다')).toBeVisible()
  await page.getByRole('button', { name: 'AI 추천 스키마 안내', exact: true }).click()
  await expect(page.getByText('등록된 기술적 난제가 없습니다.', { exact: true })).toBeVisible()
  await expect(page.locator('textarea').first()).toHaveValue(/REPORTS/)
  const save = page.waitForRequest((request) => request.method() === 'PUT' && request.url().endsWith('/erd'))
  await page.getByRole('button', { name: /저장$/, exact: false }).click()
  expect((await save).postDataJSON().mermaidCode).toContain('REPORTS')
  await page.getByRole('button', { name: '확인', exact: true }).click()
  await page.screenshot({ path: testInfo.outputPath('squad-erd.png') })
})

test('ERD 헤더의 AI 추천 안내·접기·실제 난제·원본 복원과 설계서 이동을 제공한다', async ({ page }, testInfo) => {
  const originalCode = 'erDiagram\n USER {\n bigint id PK\n }\n REPORTS {\n bigint id PK\n bigint user_id FK\n }\n USER ||--o{ REPORTS : writes'
  const challenge = '동시 신고 요청에서도 중복 데이터를 방지해야 합니다.'
  const architecture = { ...design.architecture, erdMermaid: originalCode, technicalChallenges: [challenge], entities: ['USER', 'REPORTS'].map((name) => ({ name, purpose: '신고 데이터 모델', columns: [{ name: 'id', type: 'bigint', constraints: 'PK', description: '식별자' }] })) }
  await page.route('**/api/workspaces/hub/projects/42/ai-design', (route) => route.fulfill({ json: { success: true, data: { workspaceId: 42, dashboardUrl: '/squad-dashboard?workspaceId=42&ai=1', createdAt: '2026-10-06T12:00:00Z', design: { ...design, architecture } } } }))
  let releaseSave = () => {}
  const saveGate = new Promise<void>((resolve) => { releaseSave = resolve })
  await page.route('**/api/workspaces/42/erd', async (route) => {
    if (route.request().method() === 'PUT') await saveGate
    await route.fallback()
  })
  await page.goto('/squad-erd?workspaceId=42&ai=1')
  const banner = page.getByRole('region', { name: 'AI 추천 스키마', exact: true })
  const header = banner.getByRole('button', { name: 'AI 추천 스키마 안내', exact: true })
  const restore = banner.getByRole('button', { name: 'AI 원본으로 되돌리기', exact: true })
  const blueprint = banner.getByRole('link', { name: '설계서 보기', exact: true })
  await expect(page.locator('.erd-topbar').getByRole('region', { name: 'AI 추천 스키마', exact: true })).toBeVisible()
  await expect(page.locator('.erd-diagram-wrapper').getByRole('region', { name: 'AI 추천 스키마', exact: true })).toHaveCount(0)
  await expect(header).toHaveAttribute('aria-expanded', 'false')
  await expect(banner.getByText(challenge, { exact: true })).not.toBeVisible()
  await expect(banner.getByText('AI 추천 스키마를 불러왔습니다', { exact: true })).toHaveCSS('font-size', '12px')
  await expect(banner.getByText('AI 설계서 · 아키텍처 & DB', { exact: true })).toHaveCSS('font-size', '10px')
  await header.click()
  await expect(header).toHaveAttribute('aria-expanded', 'true')
  await expect(banner.getByText(challenge, { exact: true })).toBeVisible()
  await expect(restore).toHaveCSS('font-size', '11px')
  const details = page.locator('#erd-ai-banner-body')
  await expect(details).toHaveCSS('border-radius', '16px')
  const cardBox = (await details.boundingBox())!
  const restoreBox = (await restore.boundingBox())!
  const blueprintBox = (await blueprint.boundingBox())!
  expect(cardBox.width).toBe(360)
  expect(Math.abs(restoreBox.y - blueprintBox.y)).toBeLessThan(1)
  expect(Math.abs(restoreBox.width - blueprintBox.width)).toBeLessThan(1)
  expect(blueprintBox.x - restoreBox.x - restoreBox.width).toBeCloseTo(8, 0)
  await expect(blueprint).toHaveAttribute('href', '/squad-blueprint?workspaceId=42&ai=1#arch')
  const diagram = page.locator('.erd-pan-zoom-container')
  const transform = (await diagram.getAttribute('style'))!
  await banner.hover()
  await page.mouse.wheel(0, 200)
  await expect(diagram).toHaveAttribute('style', transform)
  const challengeBox = (await banner.getByText(challenge, { exact: true }).boundingBox())!
  await page.mouse.move(challengeBox.x + 10, challengeBox.y + 5)
  await page.mouse.down()
  await page.mouse.move(challengeBox.x + 30, challengeBox.y + 10)
  await page.mouse.up()
  await expect(diagram).toHaveAttribute('style', transform)
  await header.click()
  await expect(header).toHaveAttribute('aria-expanded', 'false')
  await expect(banner.getByText(challenge, { exact: true })).not.toBeVisible()
  await expect(restore).not.toBeVisible()
  await page.setViewportSize({ width: 1200, height: 768 })
  const topbarBox = (await page.locator('.erd-topbar').boundingBox())!
  for (const control of [header, page.locator('.erd-toolbar-export'), page.locator('.erd-toolbar-save')]) {
    const box = (await control.boundingBox())!
    expect(box.x).toBeGreaterThanOrEqual(topbarBox.x)
    expect(box.x + box.width).toBeLessThanOrEqual(topbarBox.x + topbarBox.width)
    expect(box.y + box.height).toBeLessThanOrEqual(topbarBox.y + topbarBox.height)
  }
  await page.screenshot({ path: testInfo.outputPath('squad-erd-header-1200.png'), animations: 'disabled' })
  await page.setViewportSize({ width: 1440, height: 900 })
  await header.click()
  await expect(restore).toBeVisible()
  const editor = page.locator('textarea').first()
  const draft = await editor.inputValue()
  page.once('dialog', (dialog) => void dialog.dismiss())
  await restore.click()
  await expect(editor).toHaveValue(draft)
  page.once('dialog', (dialog) => void dialog.accept())
  const request = page.waitForRequest((value) => value.method() === 'PUT' && value.url().endsWith('/workspaces/42/erd'))
  const saved = page.waitForResponse((value) => value.request().method() === 'PUT' && value.url().endsWith('/workspaces/42/erd'))
  await restore.click()
  const body = (await request).postDataJSON()
  expect(body.mermaidCode).toBe(originalCode)
  expect(JSON.parse(body.schemaJson).tables.map((table: { name: string }) => table.name)).toEqual(['USER', 'REPORTS'])
  await expect(restore).toBeDisabled()
  await expect(editor).toHaveValue(draft)
  releaseSave()
  await saved
  await expect(editor).toHaveValue(originalCode)
  await page.reload()
  await expect(editor).toHaveValue(originalCode)
  await expect(header).toHaveAttribute('aria-expanded', 'false')
  await page.screenshot({ path: testInfo.outputPath('squad-erd-header.png'), animations: 'disabled' })
  await header.click()
  await expect(banner.getByText(challenge, { exact: true })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('squad-erd-ai-banner.png'), animations: 'disabled' })
  await blueprint.click()
  await expect(page.getByRole('heading', { name: 'Database Schema (ERD)', exact: true })).toBeVisible()
})

test('회의 대기실의 장치·채널 UI와 코드 피드백의 GitHub 잠금을 표시한다', async ({ page }, testInfo) => {
  const renderErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error' && message.text().includes('Cannot update a component')) renderErrors.push(message.text())
  })
  await page.goto('/squad-meeting?workspaceId=42&ai=1')
  await expect(page.getByRole('heading', { name: '팀 회의', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: '화상 회의', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /카메라 켜기/ })).toBeEnabled()
  const mic = page.getByRole('button', { name: /마이크 끄기$/ })
  await expect(mic).toHaveCSS('font-size', '12px')
  await expect(mic).toHaveCSS('flex-direction', 'column')
  await mic.click()
  await expect(page.getByRole('button', { name: /마이크 켜기$/ })).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByText('마이크 꺼짐 · 카메라 꺼짐', { exact: true })).toBeVisible()
  expect(renderErrors).toEqual([])
  await expect(page.getByRole('button', { name: '회의 참여하기', exact: true })).toHaveCSS('font-size', '16px')
  const preview = await page.locator('.ai-meeting-preview').boundingBox()
  const channel = await page.locator('.ai-meeting-channel-card').boundingBox()
  expect(preview!.width).toBeCloseTo(channel!.width * 2 + 32, 0)
  await expect(page.getByText('마이크가 꺼졌습니다.', { exact: true })).toHaveCount(0)
  await page.screenshot({ path: testInfo.outputPath('squad-meeting-lobby.png') })
  await page.getByRole('button', { name: /상세 설정$/ }).click()
  await expect(page.getByRole('heading', { name: '오디오 설정', exact: false })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('squad-meeting-devices.png') })
  await page.getByRole('button', { name: '오디오 설정 닫기', exact: true }).click()
  await expect(page.getByRole('heading', { name: '오디오 설정', exact: false })).toHaveCount(0)
  await page.route('**/api/workspaces/42/voice-channels', (route) => route.fulfill({ json: { success: true, data: [
    { channelId: 301, workspaceId: 42, name: '팀 회의', description: '설계 검토' },
    { channelId: 302, workspaceId: 42, name: '추가 회의', description: '개발 논의' },
  ] } }))
  await page.reload()
  await expect(page.getByLabel('회의 채널', { exact: true })).toHaveValue('301')
  const select = page.waitForRequest((request) => request.url().endsWith('/voice-channels/302/participants'))
  await page.getByLabel('회의 채널', { exact: true }).selectOption('302')
  await select
  await expect(page.getByRole('heading', { name: '추가 회의', exact: true })).toBeVisible()
  await page.setViewportSize({ width: 768, height: 900 })
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
  expect(overflow).toBe(false)
  await expect(page.getByRole('button', { name: '회의 참여하기', exact: true })).toBeVisible()
  await page.goto('/squad-review?workspaceId=42&ai=1')
  await expect(page.getByRole('heading', { name: 'GitHub 연결이 필요합니다' })).toBeVisible()
})

for (const aiWorkspace of [true, false]) {
  test(`${aiWorkspace ? 'AI' : '일반'} 회의실 입장 중 공통 아이콘을 숨기고 퇴장·다른 메뉴에서 복원한다`, async ({ page }) => {
    let joined = false
    const participant = { participantId: 1, channelId: 301, userId: 77, userName: '실제 사용자', active: true, muted: false, speaking: false }
    await page.route('**/api/voice-channels/301/participants', (route) => route.fulfill({ json: { success: true, data: joined ? [participant] : [] } }))
    await page.route('**/api/voice-channels/301/join', (route) => {
      joined = true
      return route.fulfill({ json: { success: true, data: participant } })
    })
    await page.route('**/api/voice-channels/301/leave', (route) => {
      joined = false
      return route.fulfill({ json: { success: true, data: { ...participant, active: false } } })
    })
    const suffix = `?workspaceId=42${aiWorkspace ? '&ai=1' : ''}`
    const chat = page.getByRole('button', { name: '팀채팅', exact: true })
    const agent = page.getByRole('button', { name: 'AI 에이전트', exact: true })
    await page.goto('/squad-dashboard' + suffix)
    await expect(chat).toBeVisible()
    await expect(agent).toBeVisible()
    const aside = page.getByRole('complementary').filter({ has: page.getByRole('navigation') })
    await aside.hover()
    await aside.locator(`a[href="/squad-meeting${suffix}"]`).click()
    await expect(chat).toBeVisible()
    await expect(agent).toBeVisible()
    await page.getByRole('button', { name: aiWorkspace ? '회의 참여하기' : /입장$/, exact: aiWorkspace }).click()
    await expect(page.locator('.squad-meeting-room-bottom-bar')).toHaveCount(1)
    await expect(chat).toBeHidden()
    await expect(agent).toBeHidden()
    await page.goBack()
    await expect(page).toHaveURL('/squad-dashboard' + suffix)
    await expect(chat).toBeVisible()
    await expect(agent).toBeVisible()
    await page.goForward()
    await expect(page).toHaveURL('/squad-meeting' + suffix)
    await expect(chat).toBeHidden()
    await expect(agent).toBeHidden()
    await page.locator('.squad-meeting-room-stage-shell').hover()
    await page.getByRole('button', { name: /종료$/ }).click()
    await expect(page.locator('.squad-meeting-room-bottom-bar')).toHaveCount(0)
    await expect(chat).toBeVisible()
    await expect(agent).toBeVisible()
  })
}

test('AI 회의실은 입장 순서의 중앙 카드와 개인 확대·상시 조작 바를 표시한다', async ({ page }, testInfo) => {
  await page.route('**/api/voice-channels/301/participants', (route) => route.fulfill({ json: { success: true, data: [
    { participantId: 1, channelId: 301, userId: 77, userName: '실제 사용자', active: true, muted: false, speaking: false },
    { participantId: 2, channelId: 301, userId: 79, userName: '참가 사용자', active: true, muted: false, speaking: true },
  ] } }))
  await page.goto('/squad-meeting?workspaceId=42&ai=1')
  await expect(page.locator('.meeting-participant-card')).toHaveCount(2)
  await expect(page.locator('.meeting-focused-card')).toHaveCount(0)
  await expect(page.locator('.ai-meeting-thumbnails')).toHaveCount(0)
  const mutationRequests: string[] = []
  page.on('request', (request) => { if (request.method() !== 'GET') mutationRequests.push(request.url()) })
  await page.getByRole('button', { name: '실제 사용자 (나) 크게 보기', exact: true }).click()
  await expect(page.locator('.meeting-focused-card')).toBeVisible()
  await expect(page.getByText('내 화면에서만 크게 보고 있습니다.', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: /전체 참가자 보기$/ }).click()
  await expect(page.locator('.meeting-participant-card')).toHaveCount(2)
  expect(mutationRequests.filter((url) => !url.endsWith('/presence'))).toEqual([])
  await page.mouse.move(0, 0)
  await expect(page.getByRole('button', { name: '종료', exact: false })).toBeVisible()
  await expect(page.locator('.squad-meeting-room-bottom-bar')).toHaveCSS('position', 'relative')
  await expect(page.locator('.squad-meeting-room-bottom-bar')).toHaveCSS('opacity', '1')
  await expect(page.locator('.meeting-participant-card').first()).toHaveCSS('height', '176px')
  await page.screenshot({ path: testInfo.outputPath('squad-meeting-room.png') })
  await page.getByTitle('듣기 끄기', { exact: true }).click()
  await expect(page.getByTitle('듣기 켜기', { exact: true })).toHaveAttribute('aria-pressed', 'true')
  const mute = page.waitForRequest((request) => request.method() === 'POST' && request.url().endsWith('/voice-channels/301/events'))
  await page.getByTitle('마이크 끄기', { exact: true }).click()
  expect((await mute).postDataJSON().type).toBe('MUTE')
  await page.getByTitle('패널 열기/닫기', { exact: true }).click()
  await expect(page.getByRole('button', { name: 'AI 회의록', exact: false })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'AI 에이전트', exact: true })).toBeHidden()
  await expect(page.getByRole('button', { name: '팀채팅', exact: true })).toBeHidden()
  await page.getByTitle('상세 설정', { exact: true }).click()
  await expect(page.getByRole('heading', { name: '오디오 설정', exact: false })).toBeVisible()
  await page.goto('/squad-meeting?workspaceId=42')
  await expect(page.locator('.squad-meeting-participant-grid')).toBeVisible()
  await expect(page.locator('.ai-meeting-thumbnails')).toHaveCount(0)
  await page.mouse.move(0, 0)
  await expect(page.locator('.squad-meeting-room-bottom-bar')).toHaveCSS('position', 'absolute')
  await expect(page.locator('.squad-meeting-room-bottom-bar')).toHaveCSS('opacity', '0')
})

test('AI 회의실은 한 명부터 여러 명까지 카드가 중앙 정렬되고 입장 순서대로 줄바꿈된다', async ({ page }, testInfo) => {
  const participant = (index: number) => ({ participantId: index + 1, channelId: 301, userId: 77 + index, userName: index === 0 ? '실제 사용자' : `참가자 ${index + 1}`, active: true, muted: false, speaking: false, joinedAt: `2026-10-06T10:00:${String(index).padStart(2, '0')}Z` })
  let count = 1
  await page.route('**/api/voice-channels/301/participants', (route) => route.fulfill({ json: { success: true, data: Array.from({ length: count }, (_, index) => participant(index)).reverse() } }))
  await page.goto('/squad-meeting?workspaceId=42&ai=1')
  const stage = page.locator('.meeting-participant-stage')
  const cards = page.locator('.meeting-participant-card')
  await expect(cards).toHaveCount(1)
  const single = await cards.first().boundingBox()
  const area = await stage.boundingBox()
  expect(single!.width).toBe(288)
  expect(single!.x + single!.width / 2).toBeCloseTo(area!.x + area!.width / 2, 0)
  expect(single!.y + single!.height / 2).toBeCloseTo(area!.y + area!.height / 2, 0)
  await page.screenshot({ path: testInfo.outputPath('meeting-one-card.png') })
  for (count of [2, 3, 8, 20]) {
    await page.reload()
    await expect(cards).toHaveCount(count)
    expect(await cards.evaluateAll((nodes) => nodes.map((node) => Number(node.getAttribute('data-participant-id'))))).toEqual(Array.from({ length: count }, (_, index) => index + 1))
    const first = await cards.nth(0).boundingBox()
    const second = await cards.nth(1).boundingBox()
    expect(second!.x).toBeGreaterThan(first!.x)
    expect(second!.y).toBe(first!.y)
    const width = (await stage.boundingBox())!.width - 32
    const columns = Math.floor((width + 16) / (288 + 16))
    if (count > columns) expect((await cards.nth(columns).boundingBox())!.y).toBeGreaterThan(first!.y)
  }
  expect(await stage.locator('> div').evaluate((node) => node.scrollHeight > node.clientHeight)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('meeting-many-cards.png') })
})

test.describe('회의 카메라 장치', () => {
  test('참가자 카드 하나에서 화면 공유를 표시하고 종료하면 카메라로 복귀한다', async ({ page }, testInfo) => {
    await page.addInitScript(() => {
      navigator.mediaDevices.getDisplayMedia = () => navigator.mediaDevices.getUserMedia({ video: true, audio: false })
    })
    await page.route('**/api/voice-channels/301/participants', (route) => route.fulfill({ json: { success: true, data: [{ participantId: 1, channelId: 301, userId: 77, userName: '실제 사용자', active: true, muted: false, speaking: false }] } }))
    await page.goto('/squad-meeting?workspaceId=42&ai=1')
    await page.getByTitle('카메라 켜기', { exact: true }).click()
    await expect(page.locator('.meeting-participant-card video')).toBeVisible()
    await page.locator('.meeting-participant-card').evaluate((node) => {
      const stream = (node.querySelector('video') as HTMLVideoElement).srcObject as MediaStream
      Object.assign(window, { testParticipantCard: node, testParticipantCameraTrack: stream.getVideoTracks()[0] })
    })
    await page.getByTitle('화면 공유', { exact: true }).click()
    await expect(page.locator('.meeting-participant-card')).toHaveCount(1)
    await expect(page.locator('.meeting-participant-card')).toHaveAttribute('data-media-kind', 'screen')
    await expect(page.locator('.meeting-focused-card')).toHaveCount(0)
    await expect(page.locator('.meeting-participant-card video')).toHaveCount(1)
    expect(await page.locator('.meeting-participant-card').evaluate((node) => node === (window as unknown as { testParticipantCard: Element }).testParticipantCard)).toBe(true)
    await page.screenshot({ path: testInfo.outputPath('meeting-single-share-card.png') })
    await page.getByRole('button', { name: '실제 사용자 (나) 화면 공유 크게 보기', exact: true }).click()
    await expect(page.locator('.meeting-focused-card video')).toBeVisible()
    await page.getByRole('button', { name: /전체 참가자 보기$/ }).click()
    await page.getByRole('button', { name: '실제 사용자 (나) 화면 공유 전체화면으로 보기', exact: true }).click()
    await expect(page.getByRole('dialog', { name: '화면 공유 확대 보기', exact: true })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: '화면 공유 확대 보기', exact: true })).toHaveCount(0)
    await expect.poll(() => page.evaluate(() => document.fullscreenElement?.tagName ?? null)).toBeNull()
    await page.getByTitle('화면 공유 중지', { exact: true }).click()
    await expect(page.locator('.meeting-participant-card')).toHaveCount(1)
    await expect(page.locator('.meeting-participant-card')).toHaveAttribute('data-media-kind', 'camera')
    await expect.poll(() => page.locator('.meeting-participant-card video').evaluate((node) => {
      const track = (window as unknown as { testParticipantCameraTrack: MediaStreamTrack }).testParticipantCameraTrack
      const video = node as HTMLVideoElement
      return (video.srcObject as MediaStream)?.getVideoTracks()[0] === track && track.readyState === 'live' && video.videoWidth > 0 && !video.paused
    })).toBe(true)
    await page.evaluate(() => document.documentElement.requestFullscreen())
    await page.getByRole('button', { name: '실제 사용자 (나) 전체화면으로 보기', exact: true }).click()
    await expect(page.locator('.meeting-focused-card')).toBeVisible()
    await expect.poll(() => page.evaluate(() => document.fullscreenElement?.classList.contains('meeting-participant-stage'))).toBe(true)
    await page.getByRole('button', { name: /전체 참가자 보기$/ }).click()
    await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(false)
    await expect(page.locator('.meeting-participant-card')).toHaveCount(1)
    await expect(page.locator('.meeting-participant-card video')).toBeVisible()
  })

  test('입장 전 가상 카메라 영상이 재생되고 끄면 트랙이 종료된다', async ({ page }, testInfo) => {
    await page.goto('/squad-meeting?workspaceId=42&ai=1')
    await page.getByRole('button', { name: /카메라 켜기$/ }).click()
    await expect(page.getByRole('button', { name: /카메라 끄기$/ })).toHaveAttribute('aria-pressed', 'true')
    const preview = page.locator('.ai-meeting-preview video')
    await expect(preview).toBeVisible()
    await expect.poll(() => preview.evaluate((node) => {
      const video = node as HTMLVideoElement
      return video.videoWidth > 0 && video.currentTime > 0 && !video.paused
    })).toBe(true)
    await preview.evaluate((node) => {
      const stream = (node as HTMLVideoElement).srcObject as MediaStream
      Object.assign(window, { testCameraTrack: stream.getVideoTracks()[0] })
    })
    await page.screenshot({ path: testInfo.outputPath('squad-camera-preview.png') })
    await page.getByRole('button', { name: /카메라 끄기$/ }).click()
    await expect(preview).toHaveCount(0)
    await expect(page.getByRole('button', { name: /카메라 켜기$/ })).toHaveAttribute('aria-pressed', 'false')
    expect(await page.evaluate(() => (window as unknown as { testCameraTrack: MediaStreamTrack }).testCameraTrack.readyState)).toBe('ended')
  })

  test('카메라 권한이 거부되면 한국어 안내를 표시하고 꺼짐 상태를 유지한다', async ({ page }) => {
    await page.addInitScript(() => {
      const getUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices)
      navigator.mediaDevices.getUserMedia = (constraints) => constraints?.video
        ? Promise.reject(new DOMException('Permission denied', 'NotAllowedError'))
        : getUserMedia(constraints)
    })
    await page.goto('/squad-meeting?workspaceId=42&ai=1')
    await page.getByRole('button', { name: /카메라 켜기$/ }).click()
    await expect(page.getByText('카메라 권한이 차단되었습니다. 브라우저의 사이트 설정에서 카메라 접근을 허용해 주세요.', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: /카메라 켜기$/ })).toHaveAttribute('aria-pressed', 'false')
    await expect(page.locator('.ai-meeting-preview video')).toHaveCount(0)
  })
})

test('모범 답안은 블러로 시작하고 클릭·키보드로 공개와 숨김을 전환한다', async ({ page }, testInfo) => {
  await page.goto('/squad-interview?workspaceId=42&ai=1')
  await page.getByRole('button', { name: 'Q1 중복 신고를 어떻게 막나요?', exact: true }).click()
  const tabs = page.getByRole('tablist', { name: 'Q1 답변 탭' })
  await tabs.getByRole('tab', { name: /모범 답안/ }).click()
  const answer = page.getByText('요청 검증', { exact: true })
  await expect(answer).toHaveCSS('filter', 'blur(5px)')
  await expect(answer).toHaveAttribute('aria-hidden', 'true')
  await page.screenshot({ path: testInfo.outputPath('squad-interview-model-hidden.png') })
  await page.getByRole('button', { name: 'Q1 모범 답안 보기' }).focus()
  await page.keyboard.press('Enter')
  await expect(answer).toHaveCSS('filter', 'none')
  await expect(answer).toHaveAttribute('aria-hidden', 'false')
  await page.screenshot({ path: testInfo.outputPath('squad-interview-model-revealed.png') })
  await page.getByRole('button', { name: 'Q1 모범 답안 가리기' }).press('Space')
  await expect(answer).toHaveCSS('filter', 'blur(5px)')
  await page.getByRole('button', { name: 'Q1 모범 답안 보기' }).click()
  await expect(answer).toHaveCSS('filter', 'none')
  await tabs.getByRole('tab', { name: /내 답변/ }).click()
  await tabs.getByRole('tab', { name: /모범 답안/ }).click()
  await expect(answer).toHaveCSS('filter', 'blur(5px)')
})

test('질문 생성 모달에서 실패·재시도·선택을 처리하고 저장 실패 후 선택을 유지한다', async ({ page }, testInfo) => {
  let attempts = 0
  let finishGeneration: (() => void) | undefined
  await page.route('**/interview/questions/generate', async (route) => {
    attempts++
    if (attempts === 1) {
      await route.fulfill({ status: 429, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'AI 요청 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.' }) })
      return
    }
    await new Promise<void>((resolve) => { finishGeneration = resolve })
    await route.fulfill({ json: { success: true, data: { questions: [{ id: 'G-new', category: '보안', question: '재시도 중복 처리는 어떻게 하나요?', answer: '멱등성 키 활용', keywords: ['멱등성'], level: 2, source: 'generated', from: 'POST /reports' }] } } })
  })
  let saves = 0
  await page.route('**/interview/questions', async (route) => {
    if (route.request().method() === 'PUT' && ++saves === 1) {
      await route.fulfill({ status: 503, json: { success: false, message: '질문 저장에 실패했습니다.' } })
    } else await route.fallback()
  })
  await page.goto('/squad-interview?workspaceId=42&ai=1')
  await page.getByRole('button', { name: /AI에게 질문 더 받기/ }).click()
  const modal = page.getByRole('dialog', { name: 'AI에게 질문 더 받기' })
  await expect(modal.getByRole('alert')).toContainText('AI 요청 한도를 초과했습니다.')
  await expect(modal.getByRole('button', { name: '선택한 질문 추가' })).toBeDisabled()
  await modal.getByRole('button', { name: '다시 시도' }).click()
  await expect(modal.getByRole('status')).toContainText('설계서를 바탕으로 질문을 만들고 있어요.')
  await expect(modal.getByRole('status')).toContainText('작업 1개 확인')
  await page.screenshot({ path: testInfo.outputPath('squad-interview-generation-loading.png') })
  finishGeneration!()
  await expect(modal.getByText('POST /reports', { exact: true })).toBeVisible()
  await modal.getByLabel('G-new 질문 선택').check()
  await expect(modal.getByText('1개 선택')).toBeVisible()
  await expect(modal.getByLabel('G-new 질문 선택')).toHaveCSS('background-color', 'rgb(0, 196, 113)')
  await page.screenshot({ path: testInfo.outputPath('squad-interview-generation-candidates.png') })
  await modal.getByRole('button', { name: '선택한 질문 추가' }).click()
  await expect(page.getByText('질문 저장에 실패했습니다.', { exact: true })).toBeVisible()
  await expect(modal.getByLabel('G-new 질문 선택')).toBeChecked()
  await expect(modal.getByRole('button', { name: '선택한 질문 추가' })).toBeEnabled()
  await modal.getByRole('button', { name: '선택한 질문 추가' }).click()
  await expect(modal).not.toBeVisible()
  await expect(page.getByRole('button', { name: 'G-new 재시도 중복 처리는 어떻게 하나요?' })).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByLabel('G-new 내 답변', { exact: true })).toBeVisible()
  await expect(page.getByText('AI 추가 생성', { exact: true })).toBeVisible()
  await expect(page.getByText('AI 3 · 팀 0', { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('button', { name: 'G-new 재시도 중복 처리는 어떻게 하나요?' })).toBeVisible()
})

test('면접 질문 추가·실제 AI 생성 요청과 모의 면접 평가를 저장한다', async ({ page }, testInfo) => {
  await page.goto('/squad-interview?workspaceId=42&ai=1')
  await page.getByRole('button', { name: /AI에게 질문 더 받기/ }).click()
  await expect(page.getByText('재시도 중복 처리는 어떻게 하나요?', { exact: true })).toBeVisible()
  await page.getByText('재시도 중복 처리는 어떻게 하나요?', { exact: true }).click()
  await page.getByRole('button', { name: /질문 은행에 추가|선택.*추가/ }).click()
  await expect(page.getByRole('button', { name: /G-new 재시도 중복 처리는/ })).toHaveAttribute('aria-expanded', 'true')
  await page.reload()
  await expect(page.getByRole('button', { name: /G-new 재시도 중복 처리는/ })).toBeVisible()
  await page.getByRole('button', { name: /모의 면접 시작/ }).click()
  await page.getByRole('button', { name: /면접 시작하기|시작하기/ }).click()
  await page.getByPlaceholder(/답변/).fill('트랜잭션 안에서 유니크 제약과 요청 검증으로 중복을 막습니다.')
  await page.getByRole('button', { name: /답변 제출/ }).click()
  await expect(page.getByText('동시성 사례를 보강해 주세요.', { exact: true })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('squad-interview-evaluation.png') })
  for (let index = 0; index < 3; index++) {
    const completed = index === 2 ? page.waitForRequest((request) => request.method() === 'PUT' && request.url().endsWith('/interview/practice') && JSON.parse(request.postDataJSON().content).sessions.length > 0) : null
    await page.getByRole('button', { name: /자신 있어요$/ }).click()
    if (index < 2) {
      await page.getByLabel('모의 면접 답변').fill('실제 구현과 검증 사례를 설명합니다.')
      await page.getByRole('button', { name: /답변 제출/ }).click()
      await expect(page.getByText('동시성 사례를 보강해 주세요.', { exact: true })).toBeVisible()
    } else if (completed) await completed
  }
  await page.getByRole('button', { name: '기록 확인하기', exact: false }).click()
  await expect(page.getByText(/평균 82점/)).toBeVisible()
  await page.reload()
  await page.getByRole('button', { name: /모의 면접 기록$/ }).click()
  await expect(page.getByText(/평균 82점/)).toBeVisible()
  await page.getByRole('button', { name: /연습 리포트$/ }).click()
  await page.getByRole('button', { name: /표로 보기/ }).click()
  await expect(page.getByRole('table', { name: '모의 면접 점수 기록' })).toContainText('82점')
})


test('팀에 공유한 답변을 재방문하여 조회한다', async ({ page }) => {
  await page.goto('/squad-interview?workspaceId=42&ai=1')
  await page.getByRole('button', { name: 'Q1 중복 신고를 어떻게 막나요?', exact: true }).click()
  await page.getByLabel('Q1 내 답변', { exact: true }).fill('유니크 제약과 검증을 함께 적용했습니다.')
  await page.getByRole('tablist', { name: 'Q1 답변 탭' }).getByRole('tab', { name: /팀원 답변/ }).click()
  const share = page.waitForRequest((request) => request.method() === 'POST' && request.url().endsWith('/interview/shared-answers'))
  await page.getByRole('button', { name: '내 답변을 팀에 공유하기', exact: true }).click()
  expect((await share).postDataJSON()).toEqual({ questionId: 'Q1', text: '유니크 제약과 검증을 함께 적용했습니다.' })
  await page.reload()
  await page.getByRole('button', { name: 'Q1 중복 신고를 어떻게 막나요?', exact: true }).click()
  await page.getByRole('tablist', { name: 'Q1 답변 탭' }).getByRole('tab', { name: /팀원 답변/ }).click()
  await expect(page.getByText('유니크 제약과 검증을 함께 적용했습니다.', { exact: true })).toBeVisible()
})


test('면접 근거 연결을 저장하고 실제 작업 상태·분류·API·ERD 링크를 반영한다', async ({ page }, testInfo) => {
  test.setTimeout(60_000)
  let questions: InterviewQuestion[] = design.interviewQuestions.map((question, index) => ({ ...question, id: `Q${index + 1}`, category: index ? '성능' : '핵심 난제', level: 2, source: 'ai' }))
  questions.push({ id: 'Q3', category: '보안', question: '신고 소유권은 어떻게 확인하나요?', answer: '작성자 ID를 비교합니다.', keywords: ['인가'], level: 2, source: 'ai' })
  await page.route('**/api/workspaces/42/interview/questions', async (route) => {
    if (route.request().method() === 'PUT') questions = route.request().postDataJSON().questions
    await route.fulfill({ json: { success: true, data: { questions } } })
  })
  await page.route('**/api/workspaces/42/api-spec', (route) => route.fulfill({ json: { success: true, data: { content: JSON.stringify({ format: 'devpath-api-v1', endpoints: [{ id: 'A-current', method: 'POST', path: '/reports', group: '신고', desc: '신고 생성', auth: 'JWT', source: 'team', status: 'todo', task: '', request: {}, response: { status: 201, body: {} } }] }) } } }))
  const openQuestion = async () => {
    await page.goto('/squad-interview?workspaceId=42&ai=1')
    await page.getByRole('button', { name: 'Q1 중복 신고를 어떻게 막나요?', exact: true }).click()
  }
  await openQuestion()
  for (const name of ['핵심 난제', '성능', '보안']) await expect(page.getByRole('button', { name, exact: true })).toBeVisible()
  await expect(page.locator('#Q1').getByText('핵심 난제', { exact: true })).toHaveCSS('color', 'oklch(0.558 0.288 302.321)')
  await expect(page.locator('#Q1').getByText('구현 전', { exact: true })).toHaveCount(0)
  await expect(page.getByLabel('Q1 근거 코드 · 설계')).toContainText('연결 없음')
  await page.getByRole('button', { name: 'Q1 근거 연결', exact: true }).click()
  const editor = page.getByRole('dialog', { name: '근거 코드 · 설계 연결' })
  await editor.getByRole('checkbox', { name: 'DP-101 API 구현', exact: true }).check()
  await editor.getByRole('checkbox', { name: 'POST /reports', exact: true }).check()
  // 초기 ERD의 빈 schemaJson 대신 저장된 Mermaid의 REPORTS 테이블을 연결한다.
  await editor.getByLabel('근거 테이블').selectOption('REPORTS')
  const save = page.waitForResponse((response) => response.request().method() === 'PUT' && response.url().endsWith('/interview/questions'))
  await editor.getByRole('button', { name: '연결 저장', exact: true }).click()
  await save
  await expect(editor).toBeHidden()
  expect(questions[0]).toMatchObject({ tasks: ['DP-101'], apis: ['POST /reports'], erd: 'REPORTS' })
  await expect(page.locator('#Q1').getByText('구현 전', { exact: true })).toBeVisible()
  await expect(page.getByText(/관련 작업 #DP-101은 아직 시작 전/)).toBeVisible()
  await page.getByRole('tablist', { name: 'Q1 답변 탭' }).getByRole('tab', { name: /모범 답안/ }).click()
  const evidence = page.getByLabel('Q1 근거 코드 · 설계')
  await expect(evidence.getByRole('link', { name: '#DP-101 할 일', exact: true })).toBeVisible()
  await expect(evidence.getByRole('link', { name: 'POST /reports', exact: true })).toHaveAttribute('href', '/squad-api?workspaceId=42&ai=1#A-current')
  await evidence.getByRole('link', { name: 'POST /reports', exact: true }).click()
  await expect(page.getByRole('heading', { name: '/reports', exact: true })).toBeVisible()
  expect(new URL(page.url()).hash).toBe('#A-current')
  await openQuestion()
  await page.getByLabel('Q1 근거 코드 · 설계').getByRole('link', { name: 'REPORTS', exact: true }).click()
  await expect(page.getByRole('textbox').first()).toHaveValue('REPORTS')
  for (const [column, status, badge] of [['progress', 'IN_PROGRESS', '구현 진행 중'], ['done', 'DONE', '코드 근거 있음']] as const) {
    await openQuestion()
    await page.getByLabel('Q1 근거 코드 · 설계').getByRole('link', { name: /#DP-101/ }).click()
    const moved = page.waitForResponse((response) => response.request().method() === 'PATCH' && response.url().endsWith('/tasks/101/status'))
    await page.getByText('API 구현', { exact: true }).locator('..').dragTo(page.locator(`#col-${column}`))
    expect((await moved).request().postDataJSON().status).toBe(status)
    await openQuestion()
    await expect(page.locator('#Q1').getByText(badge, { exact: true })).toBeVisible()
  }
  await expect(page.getByRole('link', { name: '#DP-101 완료', exact: true })).toBeVisible()
  await page.getByRole('tablist', { name: 'Q1 답변 탭' }).getByRole('tab', { name: /모범 답안/ }).click()
  await page.screenshot({ path: testInfo.outputPath('squad-interview-evidence.png') })
  await page.getByRole('button', { name: /연습 리포트$/ }).click()
  await expect(page.getByText('코드 근거 있음 · #DP-101 API 구현', { exact: true })).toBeVisible()
  await openQuestion()
  await page.getByRole('button', { name: 'Q1 근거 연결', exact: true }).click()
  await editor.getByRole('checkbox', { name: 'DP-101 API 구현', exact: true }).uncheck()
  await editor.getByRole('checkbox', { name: 'POST /reports', exact: true }).uncheck()
  await editor.getByLabel('근거 테이블').selectOption('')
  await editor.getByRole('button', { name: '연결 저장', exact: true }).click()
  await expect(editor).toBeHidden()
  await openQuestion()
  await expect(page.getByLabel('Q1 근거 코드 · 설계')).toContainText('연결 없음')
  await expect(page.locator('#Q1').getByText('코드 근거 있음', { exact: true })).toHaveCount(0)
})

test('GitHub 연결 후 원본 리뷰 목록·Diff 상세·댓글 입력과 리뷰 요청을 제공한다', async ({ page }, testInfo) => {
  await page.goto('/squad-settings?workspaceId=42&ai=1')
  await page.getByRole('button', { name: /외부 연동/ }).click()
  await page.getByLabel('Repository URL').fill('https://github.com/team/project')
  await page.getByLabel('GitHub Access Token').fill('test-only-token')
  await page.getByRole('button', { name: '연동하기', exact: true }).click()
  await expect(page.locator('a[href="/squad-review?workspaceId=42&ai=1"]')).not.toHaveAttribute('aria-disabled', 'true')
  await page.goto('/squad-review?workspaceId=42&ai=1')
  await page.getByTitle('새 리뷰 요청').click()
  await page.getByPlaceholder('예: 로그인 로직 수정 리뷰 부탁드립니다.').fill('신고 API 구현 검토')
  await page.getByPlaceholder('여기에 소스 코드를 복사하여 붙여넣으세요.').fill('@@ -0,0 +1 @@\n+const report = 1;')
  const create = page.waitForRequest((request) => request.method() === 'POST' && request.url().endsWith('/code-reviews'))
  await page.getByRole('button', { name: '요청 등록', exact: true }).click()
  expect((await create).postDataJSON().title).toBe('신고 API 구현 검토')
  await expect(page.getByRole('heading', { name: '신고 API 구현 검토', exact: true })).toBeVisible()
  await expect(page.getByText('const report = 1;', { exact: false }).first()).toBeVisible()
  await page.getByPlaceholder('피드백에 대한 답변이나 새로운 코멘트를 남겨보세요.').fill('중복 요청 검증을 확인했습니다.')
  const comment = page.waitForRequest((request) => request.method() === 'POST' && request.url().endsWith('/code-reviews/401/comments'))
  await page.getByRole('button', { name: 'Comment', exact: true }).click()
  expect((await comment).postDataJSON().body).toBe('중복 요청 검증을 확인했습니다.')
  await expect(page.getByText('중복 요청 검증을 확인했습니다.', { exact: true })).toBeVisible()
  await expect(page.getByPlaceholder('피드백에 대한 답변이나 새로운 코멘트를 남겨보세요.')).toHaveValue('')
  await page.screenshot({ path: testInfo.outputPath('squad-review.png') })
})
