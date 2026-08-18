import { expect, test, type Page, type Route } from '@playwright/test'

const profile = {
  userId: 101,
  name: 'E2E 학습자',
  email: 'e2e@devpath.test',
  role: 'LEARNER',
  bio: null,
  phone: null,
  profileImage: null,
  channelName: null,
  githubUrl: null,
  blogUrl: null,
  tags: [],
}

const proofCard = {
  proofCardId: 14,
  nodeId: 7,
  nodeTitle: 'Spring Boot API',
  courseId: 73,
  courseTitle: '백엔드 실전 과정',
  title: 'Spring Boot Proof Card',
  status: 'ISSUED',
  issuedAt: '2026-08-01T09:00:00Z',
  description: 'E2E 검증용 Proof Card',
  tags: [{ tagId: 1, tagName: 'Spring Boot', evidenceType: 'COURSE' }],
}

function token() {
  const payload = Buffer.from(JSON.stringify({ sub: '101', role: 'LEARNER', exp: 4_102_444_800 })).toString('base64url')
  return `e2e.${payload}.signature`
}

function responseData(pathname: string) {
  if (pathname === '/api/users/me/profile') return profile
  if (pathname === '/api/users/tags/official') return []
  if (pathname === '/api/me/wishlist/courses') return []
  if (pathname === '/api/me/proof-cards/gallery') return [proofCard]
  if (pathname === '/api/me/proof-cards/14') return proofCard
  if (pathname === '/api/my-roadmaps') return { roadmaps: [] }
  if (pathname === '/api/roadmaps/hub-catalog') return { sections: [], officialRoadmaps: [] }
  if (pathname === '/api/me/dashboard/summary') {
    return { currentStreak: 0, completedNodes: 0, totalStudyHours: 0, studyHoursDeltaMinutes: 0, lastLessonInfo: null }
  }
  if (pathname === '/api/me/learning-histories/summary') {
    return {
      completedNodeCount: 0,
      proofCardCount: 1,
      tilCount: 0,
      publishedTilCount: 0,
      assignmentSubmissionCount: 0,
      passedAssignmentCount: 0,
      supplementRecommendationCount: 0,
    }
  }
  if (pathname.includes('/posts')) {
    return { content: [], page: 0, size: 10, totalElements: 0, totalPages: 0, hasNext: false }
  }
  if (
    pathname.endsWith('/heatmap')
    || pathname === '/api/me/enrollments'
    || pathname.includes('/notifications')
    || pathname === '/api/workspaces/hub/projects'
  ) {
    return []
  }
  if (pathname.endsWith('/growth-recommendation')) return { analysisText: '', recommendations: [] }
  if (pathname.endsWith('/study-group')) {
    return { joinedGroupCount: 0, recruitingGroupCount: 0, inProgressGroupCount: 0, groups: [] }
  }
  if (pathname.endsWith('/mentoring')) {
    return {
      joinedProjectCount: 0,
      applicationCount: 0,
      pendingApplicationCount: 0,
      latestProject: null,
      latestApplication: null,
    }
  }
  return null
}

async function mockApi(route: Route) {
  const request = route.request()
  const { pathname } = new URL(request.url())

  if (pathname === '/api/auth/login') {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          tokenType: 'Bearer',
          accessToken: token(),
          refreshToken: 'e2e-refresh-token',
          name: profile.name,
        },
      }),
    })
    return
  }

  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data: responseData(pathname) }),
  })
}

async function login(page: Page, returnPath = '/dashboard') {
  await page.goto(`/login?returnTo=${encodeURIComponent(returnPath)}`)
  await page.getByLabel('이메일').fill('e2e@devpath.test')
  await page.getByLabel('비밀번호').fill('devpath-e2e-password')
  await page.getByRole('button', { name: '로그인하기' }).click()
  await expect(page.getByText('DevPath에 오신 것을 환영합니다')).toBeHidden()
}

test.beforeEach(async ({ page }) => {
  await page.route('**/*', async (route) => {
    const { pathname } = new URL(route.request().url())

    if (pathname.startsWith('/api/')) {
      await mockApi(route)
      return
    }

    await route.continue()
  })
})

test('로그인 후 계정 메뉴를 이동할 수 있다', async ({ page }) => {
  await login(page)
  await page.goto('/dashboard')

  await expect(page.getByRole('heading', { name: /반가워요, E2E 학습자님/ })).toBeVisible()

  for (const menuName of ['프로필 관리', '내 학습 현황', '학습일지', '내 게시글', '구매 및 보관함', '계정 설정']) {
    await expect(page.getByRole('link', { name: menuName })).toBeVisible()
  }
})

test('계정 메뉴는 문서 새로고침 없이 이동하고 공통 프로필 요청을 재사용한다', async ({ page }) => {
  let profileRequestCount = 0
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/users/me/profile') {
      profileRequestCount += 1
    }
  })

  await login(page)
  await page.goto('/dashboard')
  await expect(page.getByRole('heading', { name: /반가워요, E2E 학습자님/ })).toBeVisible()
  await page.evaluate(() => {
    Object.assign(window, { __devpathSpaMarker: 'same-document' })
  })
  const profileRequestBaseline = profileRequestCount

  await page.getByRole('link', { name: '프로필 관리' }).click()
  await expect(page).toHaveURL(/\/profile$/)
  await expect(page.getByRole('heading', { name: '프로필 관리' })).toBeVisible()
  expect(await page.evaluate(() => Reflect.get(window, '__devpathSpaMarker'))).toBe('same-document')

  await page.getByRole('link', { name: '내 학습 현황' }).click()
  await expect(page).toHaveURL(/\/my-learning$/)
  expect(await page.evaluate(() => Reflect.get(window, '__devpathSpaMarker'))).toBe('same-document')

  await page.goBack()
  await expect(page).toHaveURL(/\/profile$/)
  expect(await page.evaluate(() => Reflect.get(window, '__devpathSpaMarker'))).toBe('same-document')
  expect(profileRequestCount).toBe(profileRequestBaseline)
})

test('공유 주소로 진입하면 대상 Proof Card가 자동으로 열린다', async ({ page }) => {
  await login(page, '/learning-log-gallery?cardId=14')
  await page.goto('/learning-log-gallery?cardId=14')

  const card = page.locator('[data-proof-card-id="14"]')
  await expect(card).toBeVisible()
  await expect(card).toHaveClass(/flipped/)
})

test('인증이 필요한 핵심 화면들이 오류 경계 없이 열린다', async ({ page }) => {
  await login(page)

  const paths = [
    '/learning?courseId=73',
    '/my-roadmap',
    '/squad-erd?workspaceId=11',
    '/squad-dashboard?workspaceId=11',
    '/squad-meeting?workspaceId=11',
  ]

  for (const path of paths) {
    await page.goto(path)
    await expect(page.getByText('페이지를 불러오지 못했습니다.')).toHaveCount(0)
    await expect(page.getByRole('heading', { name: '페이지를 찾을 수 없습니다' })).toHaveCount(0)
    await expect(page).toHaveURL(new RegExp(path.split('?')[0]))
  }
})
