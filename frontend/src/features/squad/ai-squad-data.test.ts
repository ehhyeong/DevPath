import { describe, expect, it } from 'vitest'
import type { WorkspaceAiDesign } from '../project/api'
import { aiApis, aiArchitecture, aiInterviewQuestions, aiSquadProject, aiWorkspaceHref, applyWorkspaceAiDesign, configureAiWorkspaceNavigation, formatApiGroupLabel, mapWorkspaceApis, normalizeWorkspaceApiGroups } from './ai-squad-data'

describe('AI Squad 저장 설계 매핑', () => {
  it('워크스페이스 설계로 프로젝트, API, 면접 데이터를 교체한다', () => {
    applyWorkspaceAiDesign(design())

    expect(aiSquadProject.title).toBe('지역 안전 신고 플랫폼')
    expect(aiApis[0].path).toBe('/api/reports')
    expect(aiArchitecture.technicalChallenges).toEqual(['중복 신고 방지'])
    expect(aiArchitecture.erdMermaid).toBe('erDiagram')
    expect(aiInterviewQuestions[0].question).toBe('신고 중복을 어떻게 막나요?')
  })

  it('저장된 AI 워크스페이스 메뉴에서도 workspaceId와 AI 화면 표시를 유지한다', () => {
    configureAiWorkspaceNavigation(42)

    expect(aiWorkspaceHref('/squad-erd')).toBe('/squad-erd?workspaceId=42&ai=1')
    expect(aiWorkspaceHref('/squad-blueprint', '#arch')).toBe('/squad-blueprint?workspaceId=42&ai=1#arch')

    configureAiWorkspaceNavigation(null)
  })

  it('설계의 질문 근거를 보존하며 이전 설계에 없는 근거를 만들어 넣지 않는다', () => {
    const linked = design()
    Object.assign(linked.interviewQuestions[0], { tasks: ['API 구현'], apis: ['POST /api/reports'], erd: 'REPORT' })
    applyWorkspaceAiDesign(linked)
    expect(aiInterviewQuestions[0]).toMatchObject({ tasks: ['API 구현'], apis: ['POST /api/reports'], erd: 'REPORT' })
    applyWorkspaceAiDesign(design())
    expect(aiInterviewQuestions[0]).toMatchObject({ tasks: [], apis: [], erd: undefined })
  })

  it.each([
    ['/api/v1/users', 'Users'],
    ['/api/v2/reports/{reportId}', 'Reports'],
    ['/v3.1/reservations', 'Reservations'],
    ['/api/members/login', 'Members'],
    ['/reports', 'Reports'],
    ['/reports?page=1', 'Reports'],
    ['/api/v1', '기타'],
  ])('분류 없는 이전 설계의 %s 경로를 %s 도메인으로 묶는다', (path, group) => {
    const api = { ...design().apis[0], path }
    expect(mapWorkspaceApis([api])[0]).toMatchObject({ group, path })
  })

  it('새 설계는 버전과 중첩 경로보다 명시된 기능 분류를 우선한다', () => {
    const endpoints = [
      { ...design().apis[0], path: '/api/v1/series/{seriesId}/articles', group: 'Article' },
      { ...design().apis[0], path: '/api/v1/articles/{articleId}', group: 'Article' },
      { ...design().apis[0], path: '/api/v1/authors/me/dashboard', group: 'Dashboard' },
    ]
    expect(mapWorkspaceApis(endpoints).map((api) => api.group)).toEqual(['Article', 'Article', 'Dashboard'])
  })

  it('잘못 저장된 API·버전 분류만 보정하며 상태·ID·팀 분류와 근거를 보존한다', () => {
    const endpoints = mapWorkspaceApis([
      { ...design().apis[0], path: '/api/v1/reports' },
      { ...design().apis[0], path: '/api/v1/users' },
      { ...design().apis[0], path: '/api/v1/series/{id}/articles' },
    ])
    endpoints[0] = { ...endpoints[0], id: 'A-current', group: 'v1', status: 'done', task: 'DP-101' }
    endpoints[1].group = 'API'
    endpoints[2] = { ...endpoints[2], group: '팀 콘텐츠', source: 'team', status: 'progress', feature: 'F3' }

    const normalized = normalizeWorkspaceApiGroups(endpoints)
    expect(normalized[0]).toEqual({ ...endpoints[0], group: 'Reports' })
    expect(normalized[1]).toEqual({ ...endpoints[1], group: 'Users' })
    expect(normalized[2]).toEqual(endpoints[2])
    expect(endpoints[0].group).toBe('v1')
  })
})

describe('API 분류 한글 병기', () => {
  it.each([
    ['AUTH', 'AUTH (인증)'],
    ['auth', 'AUTH (인증)'],
    ['RESERVATIONS', 'RESERVATIONS (예약)'],
    ['Reservation', 'RESERVATION (예약)'],
    ['Users', 'USERS (사용자)'],
    ['Member', 'MEMBER (회원)'],
    ['Series', 'SERIES (시리즈)'],
    ['Subscriptions', 'SUBSCRIPTIONS (구독)'],
    ['AUTH (인증)', 'AUTH (인증)'],
    ['팀 콘텐츠', '팀 콘텐츠'],
    ['인증', '인증'],
    ['CareCircle', 'CareCircle'],
  ])('%s 분류를 %s로 표시한다', (group, expected) => {
    expect(formatApiGroupLabel(group)).toBe(expected)
  })

  it('표시 함수를 적용해도 저장 그룹·상태를 변경하거나 번역을 중복하지 않는다', () => {
    const api = mapWorkspaceApis([{ ...design().apis[0], group: 'RESERVATIONS (예약)' }])[0]
    expect(formatApiGroupLabel(formatApiGroupLabel(api.group))).toBe('RESERVATIONS (예약)')
    expect(api).toMatchObject({ group: 'RESERVATIONS (예약)', status: 'todo' })
  })
})

function design(): WorkspaceAiDesign {
  return {
    title: '지역 안전 신고 플랫폼',
    summary: '주민이 위험 요소를 신고합니다.',
    difficulty: 'mvp',
    stack: {
      frontend: 'React',
      backend: 'Spring Boot',
      database: 'PostgreSQL',
      libraries: ['Redis'],
      selectionReason: '신고 정합성을 관리합니다.',
    },
    scenario: {
      userFlows: [{ actor: '주민', action: '위험 요소를 신고합니다.' }],
      coreFeatures: ['위치 기반 신고'],
    },
    architecture: {
      style: '모듈형 모놀리스',
      description: '신고 도메인을 분리합니다.',
      components: [],
      erdMermaid: 'erDiagram',
      entities: [{ name: 'REPORT', purpose: '신고', columns: [{ name: 'id', type: 'bigint', constraints: 'PK', description: '식별자' }] }],
      technicalChallenges: ['중복 신고 방지'],
    },
    apis: [{ method: 'POST', path: '/api/reports', description: '신고 생성', auth: 'USER', requestExample: '{}', responseExample: '{"id":1}' }],
    roadmap: [{ phase: 1, title: '신고 구현', goal: '신고 생성', estimatedWeeks: 1, tasks: ['API 구현'] }],
    interviewQuestions: [{ category: '정합성', question: '신고 중복을 어떻게 막나요?', answer: '위치와 시간으로 판별합니다.', keywords: ['정합성'] }],
  }
}
