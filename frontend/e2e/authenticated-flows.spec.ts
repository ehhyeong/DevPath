import { expect, test, type Page, type Route } from '@playwright/test'

let instructorApiDelayMs = 0

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

function token(role = 'LEARNER') {
  const payload = Buffer.from(JSON.stringify({ sub: '101', role, exp: 4_102_444_800 })).toString('base64url')
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
    const credentials = request.postDataJSON() as { email?: string }
    const isInstructor = credentials.email === 'instructor@devpath.test'

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          tokenType: 'Bearer',
          accessToken: token(isInstructor ? 'ROLE_INSTRUCTOR' : 'LEARNER'),
          refreshToken: 'e2e-refresh-token',
          name: isInstructor ? 'E2E 강사' : profile.name,
        },
      }),
    })
    return
  }

  if (pathname.startsWith('/api/instructor/')) {
    if (instructorApiDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, instructorApiDelayMs))
    }

    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ success: false, message: 'E2E instructor data unavailable', data: null }),
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

async function loginAsInstructor(page: Page, returnPath = '/instructor-dashboard') {
  await page.goto(`/login?returnTo=${encodeURIComponent(returnPath)}`)
  await page.getByLabel('이메일').fill('instructor@devpath.test')
  await page.getByLabel('비밀번호').fill('devpath-e2e-password')
  await page.getByRole('button', { name: '로그인하기' }).click()
  await expect(page.getByText('DevPath에 오신 것을 환영합니다')).toBeHidden()
}

test.beforeEach(async ({ page }) => {
  instructorApiDelayMs = 0

  await page.route('**/*', async (route) => {
    const { pathname } = new URL(route.request().url())

    if (pathname.startsWith('/api/')) {
      await mockApi(route)
      return
    }

    await route.continue()
  })
})

test('강사 주요 화면은 API 응답 전에도 공통 레이아웃과 기본 UI를 표시한다', async ({ page }) => {
  await loginAsInstructor(page, '/home')
  instructorApiDelayMs = 5_000

  await page.goto('/instructor-dashboard')

  const sidebar = page.locator('aside.instructor-sidebar')
  const sidebarElement = await sidebar.elementHandle()
  await expect(page.locator('.instructor-layout-content > div[aria-busy="true"]')).toBeVisible({ timeout: 2_500 })

  await sidebar.locator('a[href="/course-management"]').click()
  await expect(page).toHaveURL(/\/course-management$/)
  await expect(page.locator('.course-management-page[aria-busy="true"] h1')).toBeVisible({ timeout: 2_500 })

  await sidebar.locator('a[href="/instructor-qna"]').click()
  await expect(page).toHaveURL(/\/instructor-qna$/)
  await expect(page.locator('.instructor-qna-page h2')).toBeVisible({ timeout: 2_500 })
  expect(await sidebarElement?.evaluate((element) => element.isConnected)).toBe(true)
})

test('강사 대시보드 사이드바는 기본 접힘 상태에서 hover 시 펼쳐진다', async ({ page }) => {
  await loginAsInstructor(page)
  await page.goto('/instructor-dashboard')
  await page.mouse.move(640, 32)

  const sidebar = page.locator('aside.instructor-sidebar')
  const header = page.locator('nav.app-header')
  const sectionTitle = sidebar.getByText('개요', { exact: true })
  const menuLabel = sidebar.getByText('대시보드', { exact: true })
  const guideLabel = sidebar.getByText('강사 가이드', { exact: true })
  const headerMetrics = await header.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
  })

  await expect(sidebar).toHaveCSS('width', '80px')
  await expect(sectionTitle).toHaveCSS('opacity', '0')
  await expect(sectionTitle).toHaveCSS('height', '0px')
  await expect(menuLabel).toHaveCSS('opacity', '0')
  await expect(guideLabel).toHaveCSS('opacity', '0')

  await sidebar.hover()
  await expect(sidebar).toHaveCSS('width', '250px')
  await expect(sectionTitle).toHaveCSS('opacity', '1')
  await expect(menuLabel).toHaveCSS('opacity', '1')
  await expect(guideLabel).toHaveCSS('opacity', '1')
  expect(await header.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
  })).toEqual(headerMetrics)

  await page.mouse.move(640, 180)
  await expect(sidebar).toHaveCSS('width', '80px')
  await expect(menuLabel).toHaveCSS('opacity', '0')
})

test('강사 대시보드 헤더는 홈과 같은 상단 메뉴와 hover 하위 메뉴를 사용한다', async ({ page }) => {
  await loginAsInstructor(page)
  await page.goto('/instructor-dashboard')

  const header = page.locator('nav.app-header')
  const topLevelLabels = ['로드맵', '강의', '프로젝트', '채용분석', '커뮤니티', '강사 대시보드']

  for (const label of topLevelLabels) {
    await expect(header.getByRole('link', { name: label, exact: true })).toBeVisible()
  }

  const dropdowns = [
    { label: '로드맵', items: ['로드맵 추천', '로드맵 탐색', '내 로드맵'] },
    { label: '프로젝트', items: ['프로젝트 대시보드', '라운지 (팀 찾기)', '멘토링 찾기', '워크스페이스', '런칭 쇼케이스'] },
    { label: '커뮤니티', items: ['전체글', 'Q&A', '기술 공유', '커리어/이직', '자유게시판'] },
    { label: '강사 대시보드', items: ['대시보드', '강의 관리', '멘토링 관리', '수강생 분석', '질문 게시판', '수강평 관리', '정산 관리', '마케팅 관리'] },
  ]

  for (const dropdown of dropdowns) {
    const topLevelLink = header.getByRole('link', { name: dropdown.label, exact: true })
    await expect(topLevelLink.locator('.site-header-nav-chevron')).toBeVisible()
    await topLevelLink.hover()

    const menu = header.getByRole('menu', { name: `${dropdown.label} 세부 메뉴` })
    await expect(menu).toBeVisible()
    await expect(menu.getByRole('menuitem')).toHaveCount(dropdown.items.length)
    await expect(menu.locator('.site-header-mega-link-icon')).toHaveCount(dropdown.items.length)

    for (const item of dropdown.items) {
      await expect(menu.getByRole('menuitem', { name: item, exact: true })).toBeVisible()
    }
  }

  await expect(header.getByRole('link', { name: '강사 대시보드', exact: true })).toHaveClass(/site-header-nav-link--active/)
})

test('일반 체크박스는 공통 브랜드 스타일을 사용한다', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '로그인', exact: true }).click()

  const rememberMe = page.getByRole('checkbox', { name: '로그인 상태 유지' })

  await expect(rememberMe).toBeChecked()
  await expect(rememberMe).toHaveCSS('width', '16px')
  await expect(rememberMe).toHaveCSS('height', '16px')
  await expect(rememberMe).toHaveCSS('background-color', 'rgb(0, 196, 113)')
  await expect(rememberMe).toHaveCSS('border-color', 'rgb(0, 196, 113)')

  await rememberMe.uncheck()
  await expect(rememberMe).not.toBeChecked()
  await expect(rememberMe).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  await expect(rememberMe).toHaveCSS('border-color', 'rgb(0, 196, 113)')

  await page.mouse.move(640, 32)
  await expect(rememberMe).toHaveCSS('border-color', 'rgb(209, 213, 219)')

  await page.getByRole('button', { name: '회원가입', exact: true }).click()
  const termsAgreement = page.getByRole('checkbox')

  await expect(termsAgreement).not.toBeChecked()
  await expect(termsAgreement).toHaveCSS('width', '16px')
  await expect(termsAgreement).toHaveCSS('height', '16px')
  await expect(termsAgreement).toHaveCSS('background-color', 'rgb(255, 255, 255)')

  await termsAgreement.check()
  await expect(termsAgreement).toHaveCSS('background-color', 'rgb(0, 196, 113)')
  await expect(termsAgreement).toHaveCSS('border-color', 'rgb(0, 196, 113)')
})

test('설정 화면의 토글 스위치는 원형 UI를 유지한다', async ({ page }) => {
  await login(page, '/settings')
  await page.goto('/settings')

  const commentAlertSwitch = page.locator('#settings-comment-alert')

  await expect(commentAlertSwitch).toHaveCSS('width', '20px')
  await expect(commentAlertSwitch).toHaveCSS('height', '20px')
  const borderRadius = await commentAlertSwitch.evaluate((element) => Number.parseFloat(getComputedStyle(element).borderTopLeftRadius))
  expect(borderRadius).toBeGreaterThanOrEqual(10)
})

test('라운지 대시보드 사이드바 제목은 접힌 상태에서 숨겨진다', async ({ page }) => {
  await login(page, '/lounge-dashboard')
  await page.goto('/lounge-dashboard')
  await page.mouse.move(640, 32)

  const sidebar = page.locator('aside').first()
  const menuTitle = sidebar.getByText('MENU', { exact: true })
  const projectsTitle = sidebar.getByText('MY PROJECTS', { exact: true })

  await expect(sidebar).toHaveCSS('width', '80px')
  await expect(menuTitle).toHaveCSS('opacity', '0')
  await expect(menuTitle).toHaveCSS('height', '0px')
  await expect(projectsTitle).toHaveCSS('opacity', '0')
  await expect(projectsTitle).toHaveCSS('height', '0px')

  await sidebar.hover()
  await expect(sidebar).toHaveCSS('width', '256px')
  await expect(menuTitle).toHaveCSS('opacity', '1')
  await expect(projectsTitle).toHaveCSS('opacity', '1')

  await page.mouse.move(640, 32)
  await expect(sidebar).toHaveCSS('width', '80px')
  await expect(menuTitle).toHaveCSS('opacity', '0')
  await expect(projectsTitle).toHaveCSS('opacity', '0')
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
