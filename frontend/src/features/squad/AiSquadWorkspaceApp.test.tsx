import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getWorkspaceAiDesign, projectApiRequest, type WorkspaceAiDesign } from '../project/api'
import AiSquadWorkspaceApp from './AiSquadWorkspaceApp'
import { navigateTo } from '../../lib/spa-navigation'
import { invalidateCachedQueries } from '../../lib/memory-query-cache'

vi.mock('../project/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../project/api')>()
  return { ...actual, getWorkspaceAiDesign: vi.fn(), projectApiRequest: vi.fn() }
})

vi.mock('./SquadReviewApp', () => ({ default: () => <div>시연 코드 피드백 페이지</div> }))

beforeEach(() => {
  invalidateCachedQueries()
  localStorage.clear()
  vi.mocked(projectApiRequest).mockReset()
  mockWorkspaceRequests()
})

function mockWorkspaceRequests(integrations: unknown[] = []) {
  vi.mocked(projectApiRequest).mockImplementation(async (path) => {
    if (path.endsWith('/dashboard')) {
      return {
        workspaceId: 42,
        name: '지역 안전 신고 플랫폼',
        type: 'SQUAD',
        status: 'ACTIVE',
        ownerId: 77,
        ownerName: '실제 사용자',
        members: [{ memberId: 9, learnerId: 77, learnerName: '실제 사용자', profileImage: null, online: true }],
        unresolvedTaskCount: 1,
        activeMilestoneCount: 1,
        createdAt: '2026-10-05T00:00:00Z',
      } as never
    }
    if (path.endsWith('/tasks')) {
      return [{
        taskId: 101,
        workspaceId: 42,
        title: 'API 구현',
        description: '신고 구현 · 신고 생성',
        status: 'TODO',
        priority: 'MEDIUM',
        assigneeId: 77,
        dueDate: '2026-10-12',
      }] as never
    }
    if (path.endsWith('/settings')) return { workspaceId: 42, name: '지역 안전 신고 플랫폼', type: 'SQUAD', status: 'ACTIVE', ownerId: 77, canManage: true, memberCount: 1, members: [{ memberId: 9, learnerId: 77, learnerName: '실제 사용자' }] } as never
    if (path.endsWith('/integrations')) return integrations as never
    return [] as never
  })
}

vi.mock('./erd-support', async (importOriginal) => ({
  ...await importOriginal<typeof import('./erd-support')>(),
  loadMermaid: vi.fn(async () => ({
    render: vi.fn(async () => ({ svg: '<svg aria-label="ERD diagram"></svg>' })),
  })),
}))

describe('AI 설계서 탭', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/squad-blueprint?ai=1#roadmap')
    Element.prototype.scrollIntoView = vi.fn()
  })

  it('roadmap 해시로 진입하면 개발 로드맵과 원본 면접 질문을 바로 표시한다', () => {
    render(<AiSquadWorkspaceApp />)

    expect(screen.getByRole('heading', { name: /개발 구현 로드맵/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /실무 면접 예상 질문/ })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /워크스페이스 반영 맵/ })).not.toBeInTheDocument()
    fireEvent.mouseEnter(screen.getByRole('complementary'))
    expect(screen.queryByRole('link', { name: /설계서 열기/ })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /프로젝트 설계서/ })).toHaveAttribute('href', '/squad-blueprint?ai=1')
    expect(screen.getByText('설계서 기반 면접 질문')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /핵심 사용자 흐름/ })).not.toBeInTheDocument()
    const roadmapPanel = screen.getByRole('heading', { name: /개발 구현 로드맵/ }).closest('.ai-blueprint-tab-panel')
    expect(roadmapPanel).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /^API 명세서$/ }))
    expect(window.location.hash).toBe('#api')
    expect(screen.getByText('API 명세서에서 상세 보기')).toBeInTheDocument()
    const apiPanel = screen.getByText('API 명세서에서 상세 보기').closest('.ai-blueprint-tab-panel')
    expect(apiPanel).toBeInTheDocument()
    expect(apiPanel).not.toBe(roadmapPanel)
  })
})

describe('AI API 명세서', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/squad-api?ai=1#A3')
  })

  it('해시 API의 원본 상세 구조를 표시하고 상태 변경과 추가 모달을 제공한다', async () => {
    render(<AiSquadWorkspaceApp />)

    expect(screen.getByRole('heading', { name: '/api/series' })).toBeInTheDocument()
    expect(screen.getByText('SERIES (시리즈)')).toBeInTheDocument()
    expect(screen.getByText('A3 · SERIES (시리즈)')).toBeInTheDocument()
    expect(screen.getByText('완료 0 · 진행 2 / 9')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Parameters' })).toBeInTheDocument()
    expect(screen.getByText('tag')).toBeInTheDocument()
    expect(screen.queryByText('Request Body', { exact: true })).not.toBeInTheDocument()
    expect(screen.getByText('cURL 예시')).toBeInTheDocument()
    expect(screen.queryByText('AI 설계서 연결')).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'A3 작업 카드 연결' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('A3 구현 상태'))
    fireEvent.click(screen.getByRole('option', { name: /완료/ }))
    expect(screen.getByText('구현 진행률').parentElement).not.toHaveTextContent('%')
    expect(screen.getByText('완료 1 · 진행 2 / 9')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /엔드포인트 추가/ }))
    expect(screen.getByRole('dialog', { name: '엔드포인트 추가' })).toBeInTheDocument()
    expect(screen.getByLabelText('Method')).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'MEMBER (회원)' })).toHaveAttribute('value', 'Member')
    expect(screen.getByRole('option', { name: 'SERIES (시리즈)' })).toHaveAttribute('value', 'Series')
    expect(screen.getByLabelText(/경로/)).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/경로/), { target: { value: '/api/test' } })
    fireEvent.change(screen.getByLabelText(/설명/), { target: { value: '테스트 엔드포인트' } })
    fireEvent.click(screen.getByRole('button', { name: '추가하기' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '엔드포인트 추가' })).not.toBeInTheDocument())
    expect(screen.getByRole('heading', { name: '/api/test' })).toBeInTheDocument()
    expect(window.location.hash).toBe('#A10')
    expect(screen.getByRole('button', { name: '전체 10' })).toBeInTheDocument()
  })

  it.each(['devpath-ai-api-v1', 'devpath-api-v1'])('%s의 GET에 요청 예제가 있어도 본문을 숨기고 POST 본문은 유지한다', async (format) => {
    window.history.replaceState({}, '', '/squad-api?workspaceId=42&ai=1#A1')
    const design = persistedDesign()
    vi.mocked(getWorkspaceAiDesign).mockResolvedValue({ workspaceId: 42, dashboardUrl: '/squad-dashboard?workspaceId=42&ai=1', createdAt: '2026-10-10T00:00:00Z', design })
    const endpoints = format === 'devpath-ai-api-v1'
      ? [{ ...design.apis[0], method: 'GET', path: '/api/reports/{reportId}', requestExample: '{"ignored":true}' }, design.apis[0]]
      : [{ id: 'A1', group: 'Reports', method: 'GET', path: '/api/reports/{reportId}', query: 'page=0&size=20', desc: '신고 조회', auth: 'USER', source: 'ai', status: 'todo', task: '', request: { ignored: true }, response: { status: 200, body: { id: 1 } } }, { id: 'A2', group: 'Reports', method: 'POST', path: '/api/reports', desc: '신고 생성', auth: 'USER', source: 'ai', status: 'todo', task: '', request: { title: '신고' }, response: { status: 200, body: { id: 1 } } }]
    const fallback = vi.mocked(projectApiRequest).getMockImplementation()!
    vi.mocked(projectApiRequest).mockImplementation(async (...args) => args[0].endsWith('/api-spec') ? { content: JSON.stringify({ format, endpoints }) } as never : fallback(...args))

    render(<AiSquadWorkspaceApp />)

    await screen.findByRole('heading', { name: '/api/reports/{reportId}' })
    expect(screen.queryByText('Request Body', { exact: true })).not.toBeInTheDocument()
    expect(screen.getByText('reportId', { exact: true })).toBeInTheDocument()
    if (format === 'devpath-api-v1') expect(screen.getByText('page', { exact: true })).toBeInTheDocument()
    const response = screen.getByText('Response', { exact: true }).closest('.grid')
    expect(response).not.toHaveClass('lg:grid-cols-2')
    const curlPanel = screen.getByRole('heading', { name: 'cURL 예시' }).parentElement!.parentElement!
    expect(curlPanel).toHaveTextContent('curl -X GET')
    expect(curlPanel).not.toHaveTextContent(' -d ')
    expect(curlPanel).not.toHaveTextContent('Content-Type')
    expect(curlPanel).not.toHaveTextContent('ignored')

    fireEvent.click(screen.getByText('/api/reports', { exact: true }).closest('button')!)
    expect(screen.getByText('Request Body', { exact: true })).toBeInTheDocument()
    expect(screen.getByText('Response', { exact: true }).closest('.grid')).toHaveClass('lg:grid-cols-2')
    const postCurlPanel = screen.getByRole('heading', { name: 'cURL 예시' }).parentElement!.parentElement!
    expect(postCurlPanel).toHaveTextContent('curl -X POST')
    expect(postCurlPanel).toHaveTextContent(' -d ')
    expect(postCurlPanel).toHaveTextContent('Content-Type: application/json')
  })

  it('저장된 AI 워크스페이스에서도 엔드포인트 추가와 구현 상태 변경을 제공한다', async () => {
    window.history.replaceState({}, '', '/squad-api?workspaceId=42&ai=1')
    vi.mocked(getWorkspaceAiDesign).mockResolvedValue({
      workspaceId: 42,
      dashboardUrl: '/squad-dashboard?workspaceId=42&ai=1',
      createdAt: '2026-10-05T00:00:00Z',
      design: persistedDesign(),
    })

    render(<AiSquadWorkspaceApp />)

    const addButton = await screen.findByRole('button', { name: /엔드포인트 추가/ })
    const statusSelect = screen.getByLabelText('A1 구현 상태')
    const statusDot = screen.getByLabelText('A1 구현 상태 색상')
    expect(statusDot).toHaveClass('bg-gray-300')
    fireEvent.click(statusSelect)
    expect(screen.getByLabelText('할 일 상태 색상')).toHaveClass('bg-gray-300')
    expect(screen.getByLabelText('진행 중 상태 색상')).toHaveClass('bg-blue-500')
    expect(screen.getByLabelText('리뷰 상태 색상')).toHaveClass('bg-amber-500')
    expect(screen.getByLabelText('완료 상태 색상')).toHaveClass('bg-brand')
    fireEvent.click(screen.getByRole('option', { name: /완료/ }))
    await waitFor(() => expect(statusSelect).toHaveTextContent('완료'))
    expect(statusDot).toHaveClass('bg-brand')
    expect(screen.getByText('완료 1 · 진행 0 / 1')).toBeInTheDocument()
    expect(screen.getByText('구현 진행률').parentElement).not.toHaveTextContent('%')

    fireEvent.click(addButton)
    expect(screen.getByRole('dialog', { name: '엔드포인트 추가' })).toBeInTheDocument()
  })

  it('공백·대소문자 중복 그룹을 거부하고 저장 실패 시 입력과 API를 유지한다', async () => {
    window.history.replaceState({}, '', '/squad-api?workspaceId=42&ai=1')
    const design = persistedDesign()
    vi.mocked(getWorkspaceAiDesign).mockResolvedValue({ workspaceId: 42, dashboardUrl: '/squad-dashboard?workspaceId=42&ai=1', createdAt: '2026-10-10T00:00:00Z', design })
    const fallback = vi.mocked(projectApiRequest).getMockImplementation()!
    vi.mocked(projectApiRequest).mockImplementation(async (...args) => {
      if (!args[0].endsWith('/api-spec')) return fallback(...args)
      if (args[1]?.method === 'PUT') throw new Error('그룹 저장 실패')
      return { content: JSON.stringify({ format: 'devpath-ai-api-v1', endpoints: design.apis }) } as never
    })
    render(<AiSquadWorkspaceApp />)
    fireEvent.click(await screen.findByRole('button', { name: /리소스 그룹 추가/ }))
    const input = screen.getByLabelText('그룹 이름')
    fireEvent.change(input, { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: '그룹 만들기' }))
    expect(screen.getByRole('alert')).toHaveTextContent('그룹 이름을 입력해 주세요.')
    fireEvent.change(input, { target: { value: 'reports' } })
    fireEvent.click(screen.getByRole('button', { name: '그룹 만들기' }))
    expect(screen.getByRole('alert')).toHaveTextContent('이미 있는 리소스 그룹입니다.')
    expect(vi.mocked(projectApiRequest).mock.calls.filter((call) => call[1]?.method === 'PUT')).toHaveLength(0)
    fireEvent.change(input, { target: { value: '알림' } })
    fireEvent.click(screen.getByRole('button', { name: '그룹 만들기' }))
    await waitFor(() => expect(screen.getByRole('button', { name: '그룹 만들기' })).toBeEnabled())
    expect(input).toHaveValue('알림')
    expect(screen.getByRole('dialog', { name: '리소스 그룹 추가' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '/api/reports' })).toBeInTheDocument()
  })
})

function persistedDesign(): WorkspaceAiDesign {
  return {
    title: '지역 안전 신고 플랫폼',
    summary: '주민이 위험 요소를 신고하고 처리 현황을 확인합니다.',
    difficulty: 'mvp',
    stack: {
      frontend: 'React',
      backend: 'Spring Boot',
      database: 'PostgreSQL',
      libraries: ['Redis'],
      selectionReason: '신고 정합성과 빠른 조회를 지원합니다.',
    },
    scenario: {
      userFlows: [{ actor: '주민', action: '위험 요소를 신고합니다.' }],
      coreFeatures: ['위치 기반 신고'],
    },
    architecture: {
      style: '모듈형 모놀리스',
      description: '신고 도메인을 분리합니다.',
      components: [{ name: '신고 모듈', responsibility: '신고 접수와 처리를 담당합니다.' }],
      erdMermaid: 'erDiagram',
      entities: [{
        name: 'REPORT',
        purpose: '신고 저장',
        columns: [{ name: 'id', type: 'bigint', constraints: 'PK', description: '신고 식별자' }],
      }],
      technicalChallenges: ['중복 신고 방지'],
    },
    apis: [{
      method: 'POST',
      path: '/api/reports',
      description: '신고 생성',
      auth: 'USER',
      requestExample: '{}',
      responseExample: '{"id":1}',
    }],
    roadmap: [{ phase: 1, title: '신고 구현', goal: '신고 생성', estimatedWeeks: 1, tasks: ['API 구현'] }],
    interviewQuestions: [{
      category: '정합성',
      question: '신고 중복을 어떻게 막나요?',
      answer: '위치와 시간으로 판별합니다.',
      keywords: ['정합성'],
    }],
  }
}

describe('AI 스쿼드 로컬 상호작용', () => {
  it('면접 질문 추가와 모의 면접 시작 모달을 원본 흐름대로 제공한다', async () => {
    window.history.replaceState({}, '', '/squad-interview?ai=1')
    render(<AiSquadWorkspaceApp />)

    fireEvent.click(screen.getByRole('button', { name: /AI에게 질문 더 받기/ }))
    expect(screen.getByRole('dialog', { name: 'AI에게 질문 더 받기' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'AI 질문 생성 닫기' }))

    fireEvent.click(screen.getByRole('button', { name: /직접 추가/ }))
    expect(screen.getByRole('dialog', { name: '팀 질문 추가' })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('질문'), { target: { value: '트랜잭션 경계는 어떻게 정했나요?' } })
    fireEvent.change(screen.getByLabelText('핵심 키워드'), { target: { value: '트랜잭션, 정합성' } })
    fireEvent.click(screen.getByRole('button', { name: '추가하기' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '팀 질문 추가' })).not.toBeInTheDocument())
    expect(screen.getByText('Q. 트랜잭션 경계는 어떻게 정했나요?')).toBeInTheDocument()
    expect(screen.getByText('팀 추가')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /모의 면접 시작/ }))
    expect(screen.getByRole('dialog', { name: '모의 면접 설정' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /시작하기/ }))
    expect(screen.getByRole('dialog', { name: '모의 면접' })).toBeInTheDocument()
    expect(screen.getByLabelText('모의 면접 답변')).toBeInTheDocument()
  })

  it('새 작업을 로컬 칸반의 할 일 열에 추가한다', () => {
    window.history.replaceState({}, '', '/squad-workspace?ai=1')
    render(<AiSquadWorkspaceApp />)

    fireEvent.click(screen.getByRole('button', { name: /새 작업/ }))
    expect(screen.getByRole('dialog', { name: '새 작업 추가' })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('작업 제목'), { target: { value: 'README 배포 문서 작성' } })
    fireEvent.click(screen.getByRole('button', { name: '저장하기' }))
    expect(screen.queryByRole('dialog', { name: '새 작업 추가' })).not.toBeInTheDocument()
    expect(screen.getByText('README 배포 문서 작성')).toBeInTheDocument()
  })

  it('AI 설계서 PDF 저장 버튼이 브라우저 인쇄를 실행한다', () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined)
    window.history.replaceState({}, '', '/squad-blueprint?ai=1')
    render(<AiSquadWorkspaceApp />)

    fireEvent.click(screen.getByRole('button', { name: /PDF 저장/ }))
    expect(print).toHaveBeenCalledOnce()
    print.mockRestore()
  })

  it('원본 ERD 편집 화면과 관계 설정 모달을 제공한다', async () => {
    window.history.replaceState({}, '', '/squad-erd?ai=1')
    render(<AiSquadWorkspaceApp />)

    expect(screen.getByRole('heading', { name: 'ERD Architect Pro' })).toBeInTheDocument()
    expect((screen.getByLabelText('schema.mermaid Live Editor') as HTMLTextAreaElement).value).toContain('erDiagram')
    expect(await screen.findByLabelText('ERD diagram')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /테이블 추가/ }))
    expect(screen.getByLabelText('NEW_TABLE 테이블 이름')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /관계 연결/ }))
    expect(screen.getByRole('dialog', { name: '관계 설정' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '취소' }))

    fireEvent.click(screen.getByRole('button', { name: 'ERD 도움말' }))
    expect(screen.getByRole('dialog', { name: 'DevPath ERD 가이드북' })).toBeInTheDocument()
  })
})

describe('저장된 AI 워크스페이스 대시보드', () => {
  beforeEach(() => {
    const payload = btoa(JSON.stringify({ sub: '77', role: 'ROLE_LEARNER', exp: 4102444800 }))
    localStorage.setItem('devpath.auth.session', JSON.stringify({ tokenType: 'Bearer', accessToken: `test.${payload}.signature`, refreshToken: 'test', name: '실제 사용자', userId: 77, role: 'ROLE_LEARNER', exp: 4102444800, storage: 'local' }))
    window.history.replaceState({}, '', '/squad-dashboard?workspaceId=42&ai=1&created=ai')
    vi.mocked(getWorkspaceAiDesign).mockReset()
  })

  it('설정의 팀원 초대 버튼이 실제 링크 API가 연결된 모달을 연다', async () => {
    window.history.replaceState({}, '', '/squad-settings?workspaceId=42&ai=1')
    vi.mocked(getWorkspaceAiDesign).mockResolvedValue({ workspaceId: 42, dashboardUrl: '/squad-dashboard?workspaceId=42&ai=1', createdAt: '2026-10-05T00:00:00Z', design: persistedDesign() })
    const original = vi.mocked(projectApiRequest).getMockImplementation()!
    vi.mocked(projectApiRequest).mockImplementation(async (...args) => {
      if (args[0].endsWith('/invite-link')) return { workspaceId: 42, token: 'signed-token', expiresAt: '2026-10-20T12:00:00' } as never
      return original(...args)
    })
    render(<AiSquadWorkspaceApp />)
    fireEvent.click(await screen.findByRole('button', { name: '팀원 관리' }))
    fireEvent.click(await screen.findByRole('button', { name: '팀원 초대' }))
    expect(screen.getByRole('dialog', { name: '팀원 초대하기' })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByLabelText('초대 링크 (누구나 참여 가능)')).toHaveValue(`${window.location.origin}/workspace-hub?inviteToken=signed-token`))
    expect(screen.queryByText('김개발')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '초대 모달 닫기' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('저장 설계를 원본 HTML 기반 화면에 적용하고 생성 완료 모달을 표시한다', async () => {
    const design = persistedDesign()
    vi.mocked(getWorkspaceAiDesign).mockResolvedValue({
      workspaceId: 42,
      dashboardUrl: '/squad-dashboard?workspaceId=42',
      createdAt: '2026-10-05T00:00:00Z',
      design,
    })

    render(<AiSquadWorkspaceApp />)

    expect(await screen.findByRole('dialog', { name: '워크스페이스 생성 완료' })).toBeInTheDocument()
    await waitFor(() => expect(screen.getAllByText(design.title).length).toBeGreaterThanOrEqual(2))
    const projectTitle = await screen.findByRole('heading', { name: design.title })
    expect(projectTitle).toHaveClass('text-[#00C471]')
    expect(projectTitle).not.toHaveClass('text-transparent')
    expect(screen.getAllByText('실제 사용자').length).toBeGreaterThan(0)
    expect(screen.queryByText('김개발')).not.toBeInTheDocument()
    expect(screen.getByText('AI 추천 스키마 1개 테이블')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /^프로젝트 설계서$/ })).toHaveAttribute('href', '/squad-blueprint?workspaceId=42&ai=1')

    fireEvent.click(screen.getByRole('button', { name: '대시보드 보기' }))
    await waitFor(() => expect(window.location.search).toBe('?workspaceId=42&ai=1'))
  })

  it('GitHub 저장소가 연결되지 않으면 코드 피드백 메뉴를 차단한다', async () => {
    vi.mocked(getWorkspaceAiDesign).mockResolvedValue({
      workspaceId: 42,
      dashboardUrl: '/squad-dashboard?workspaceId=42&ai=1',
      createdAt: '2026-10-05T00:00:00Z',
      design: persistedDesign(),
    })

    render(<AiSquadWorkspaceApp />)

    const reviewLink = await screen.findByRole('link', { name: /코드 피드백/ })
    await waitFor(() => expect(reviewLink).toHaveAttribute('aria-disabled', 'true'))
    fireEvent.click(reviewLink)
    expect(window.location.pathname).toBe('/squad-dashboard')
  })

  it.each([false, true])('시연 워크스페이스 여부 %s에 따라 미연동 코드 피드백 직접 진입을 구분한다', async (demoWorkspace) => {
    window.history.replaceState({}, '', '/squad-review?workspaceId=42&ai=1')
    vi.mocked(getWorkspaceAiDesign).mockResolvedValue({
      workspaceId: 42,
      dashboardUrl: '/squad-dashboard?workspaceId=42&ai=1',
      createdAt: '2026-10-05T00:00:00Z',
      design: persistedDesign(),
      demoWorkspace,
    })
    render(<AiSquadWorkspaceApp />)
    if (demoWorkspace) {
      expect(await screen.findByText('시연 코드 피드백 페이지')).toBeInTheDocument()
      expect(screen.queryByText('GitHub 연결이 필요합니다')).not.toBeInTheDocument()
    } else {
      expect(await screen.findByText('GitHub 연결이 필요합니다')).toBeInTheDocument()
      expect(screen.queryByText('시연 코드 피드백 페이지')).not.toBeInTheDocument()
    }
  })

  it('작업 담당자와 헤더에 실제 워크스페이스 멤버만 표시한다', async () => {
    window.history.replaceState({}, '', '/squad-workspace?workspaceId=42&ai=1')
    vi.mocked(getWorkspaceAiDesign).mockResolvedValue({
      workspaceId: 42,
      dashboardUrl: '/squad-dashboard?workspaceId=42&ai=1',
      createdAt: '2026-10-05T00:00:00Z',
      design: persistedDesign(),
    })

    render(<AiSquadWorkspaceApp />)

    expect(await screen.findByTitle('실제 사용자')).toBeInTheDocument()
    expect(screen.queryByText('김개발')).not.toBeInTheDocument()
    fireEvent.click(await screen.findByRole('button', { name: /작업 추가/ }))
    const assignee = screen.getByLabelText('담당자 배정')
    expect(assignee).toHaveTextContent('실제 사용자')
    expect(assignee).not.toHaveTextContent('김개발')
  })

  it('GitHub 저장소가 연결되면 코드 피드백 메뉴를 활성화한다', async () => {
    mockWorkspaceRequests([{
      provider: 'GITHUB',
      active: true,
      repositoryUrl: 'https://github.com/devpath/ai-workspace',
    }])
    vi.mocked(getWorkspaceAiDesign).mockResolvedValue({
      workspaceId: 42,
      dashboardUrl: '/squad-dashboard?workspaceId=42&ai=1',
      createdAt: '2026-10-05T00:00:00Z',
      design: persistedDesign(),
    })

    render(<AiSquadWorkspaceApp />)

    await waitFor(() => expect(screen.getByRole('link', { name: /코드 피드백/ })).toHaveAttribute('aria-disabled', 'false'))
  })

  it('최초 설계 조회 중에도 현재 메뉴와 펼침 상태를 제공하고 목업 제목을 노출하지 않는다', async () => {
    window.history.replaceState({}, '', '/squad-blueprint?workspaceId=42&ai=1')
    const response = { workspaceId: 42, dashboardUrl: '/squad-dashboard?workspaceId=42&ai=1', createdAt: '2026-10-05T00:00:00Z', design: persistedDesign() }
    let releaseDesign!: (value: typeof response) => void
    vi.mocked(getWorkspaceAiDesign).mockReturnValue(new Promise((resolve) => { releaseDesign = resolve }))
    render(<AiSquadWorkspaceApp />)
    const aside = screen.getByRole('complementary')
    expect(aside).toHaveClass('ai-squad-aside')
    expect(screen.getByRole('link', { name: /프로젝트 설계서/ })).toHaveClass('active')
    expect(screen.getByRole('status')).toHaveTextContent('AI 설계를 불러오는 중입니다...')
    expect(screen.getByRole('link', { name: /목록으로 돌아가기/ })).toHaveTextContent('스쿼드 프로젝트')
    expect(screen.queryByText('독립 출판 콘텐츠 구독 플랫폼')).not.toBeInTheDocument()
    fireEvent.mouseEnter(aside)
    expect(aside).toHaveClass('is-expanded')
    releaseDesign(response)
    expect(await screen.findByRole('heading', { name: response.design.title })).toBeInTheDocument()
    expect(screen.getByRole('complementary')).toHaveClass('is-expanded')
    fireEvent.mouseLeave(screen.getByRole('complementary'))
  })
})

describe('AI 스쿼드 페이지 전환 조회', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/squad-blueprint?workspaceId=42&ai=1')
    vi.mocked(getWorkspaceAiDesign).mockResolvedValue({ workspaceId: 42, dashboardUrl: '/squad-dashboard?workspaceId=42&ai=1', createdAt: '2026-10-05T00:00:00Z', design: persistedDesign() })
  })

  it('관련 없는 메뉴 조회를 기다리지 않고 메뉴 왕복에도 초기화를 한 번만 실행한다', async () => {
    const original = vi.mocked(projectApiRequest).getMockImplementation()!
    vi.mocked(projectApiRequest).mockImplementation((...args) => {
      if (/activities|notices|calendar-events|voice-channels/.test(args[0])) return new Promise(() => {})
      return original(...args)
    })
    const { rerender } = render(<AiSquadWorkspaceApp />)
    await screen.findByRole('button', { name: '기획·시나리오 수정' })
    window.history.pushState({}, '', '/squad-api?workspaceId=42&ai=1')
    rerender(<AiSquadWorkspaceApp />)
    await screen.findByRole('heading', { name: '/api/reports' })
    window.history.pushState({}, '', '/squad-blueprint?workspaceId=42&ai=1')
    rerender(<AiSquadWorkspaceApp />)
    expect(screen.getByRole('button', { name: '기획·시나리오 수정' })).toBeInTheDocument()
    expect(vi.mocked(projectApiRequest).mock.calls.filter(([path]) => path.endsWith('/initialize'))).toHaveLength(1)
    expect(vi.mocked(projectApiRequest).mock.calls.some(([path]) => /activities|notices|calendar-events|voice-channels/.test(path))).toBe(false)
  })

  it('이미 방문한 API 화면의 검색 입력과 DOM을 재방문 때 보존한다', async () => {
    window.history.replaceState({}, '', '/squad-api?workspaceId=42&ai=1')
    const { rerender } = render(<AiSquadWorkspaceApp />)
    await screen.findByRole('heading', { name: '/api/reports' })
    const search = screen.getByPlaceholderText('경로 또는 설명 검색...')
    fireEvent.change(search, { target: { value: 'reports' } })
    window.history.pushState({}, '', '/squad-blueprint?workspaceId=42&ai=1')
    rerender(<AiSquadWorkspaceApp />)
    await screen.findByRole('button', { name: '기획·시나리오 수정' })
    window.history.pushState({}, '', '/squad-api?workspaceId=42&ai=1')
    rerender(<AiSquadWorkspaceApp />)
    expect(screen.getByPlaceholderText('경로 또는 설명 검색...')).toBe(search)
    expect(search).toHaveValue('reports')
    expect(screen.queryByText('워크스페이스를 불러오는 중입니다...')).not.toBeInTheDocument()
  })

  it('보존된 설계서에 아키텍처 링크로 돌아오면 연결된 탭을 표시한다', async () => {
    const { rerender } = render(<AiSquadWorkspaceApp />)
    await screen.findByRole('button', { name: '기획·시나리오 수정' })
    navigateTo('/squad-api?workspaceId=42&ai=1')
    rerender(<AiSquadWorkspaceApp />)
    await screen.findByRole('heading', { name: '/api/reports' })
    window.history.pushState({}, '', '/squad-blueprint?workspaceId=42&ai=1#arch')
    fireEvent(window, new Event('devpath:spa-navigation'))
    rerender(<AiSquadWorkspaceApp />)
    expect(screen.getByRole('button', { name: 'ERD 편집하기' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '기획·시나리오 수정' })).not.toBeInTheDocument()
  })
})
