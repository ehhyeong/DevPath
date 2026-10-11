import { workspaceFeatureId, type WorkspaceAiDesign } from '../project/api'

export type AiTaskStatus = 'todo' | 'progress' | 'review' | 'done'

export type AiTask = {
  id: string
  title: string
  tag: 'FE' | 'BE' | 'UX/UI' | 'DevOps'
  assignee: string
  status: AiTaskStatus
  due: string
  urgent?: boolean
  challenge?: boolean
}

export type AiApi = {
  id: string
  group: string
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  path: string
  desc: string
  auth: string
  source: 'ai' | 'team'
  status: AiTaskStatus
  task: string
  feature?: string
  query?: string
  request?: unknown
  response: {
    status: number
    body?: unknown
    headers?: string
  } | null
}

export const aiSquadProject = {
  title: '독립 출판 콘텐츠 구독 플랫폼',
  squadName: '독립출판 구독팀',
  oneLiner: '작가는 시리즈를 연재하고, 독자는 태그로 탐색해 구독하는 콘텐츠 플랫폼',
  summary: 'Spring Boot 기반 세션 인증과 역할 분리, 글 순서 관리(orderIndex)라는 명확한 기술적 난제를 포함합니다.',
  difficulty: '🚀 실전 MVP',
  stack: {
    frontend: ['Thymeleaf', 'HTML/CSS/JS'],
    backend: ['Spring Boot', 'Spring Security', 'Spring Data JPA'],
    database: ['MySQL'],
    deploy: ['Railway / Render'],
  },
}

export const aiArchitecture = {
  style: '모듈형 모놀리스',
  description: '도메인 경계를 나누고 단일 애플리케이션으로 배포합니다.',
  components: [] as Array<{ name: string; responsibility: string }>,
  erdMermaid: 'erDiagram',
  technicalChallenges: ['핵심 비즈니스 규칙의 정합성을 트랜잭션으로 보장합니다.'],
}

export const aiUserFlow = [
  ['작가', '이메일/비밀번호로 회원가입 및 로그인하여 대시보드로 이동합니다.'],
  ['작가', '새 시리즈를 생성하고 글 작성 후 발행 상태로 전환합니다.'],
  ['독자', '발행된 시리즈를 태그로 탐색하고 관심 시리즈를 구독합니다.'],
  ['독자', '구독한 시리즈의 글을 순서대로 읽고 이전·다음 글로 이동합니다.'],
]

export const aiFeatures = [
  { id: 'F1', title: '이메일·비밀번호 기반 회원가입 및 로그인', progress: 40 },
  { id: 'F2', title: '시리즈 생성 및 발행 상태 관리', progress: 0 },
  { id: 'F3', title: '글 순서 관리 및 이전·다음 글 이동', progress: 0 },
  { id: 'F4', title: '태그 탐색 및 시리즈 구독', progress: 0 },
  { id: 'F5', title: '구독자 수 집계 및 대시보드 통계', progress: 0 },
]

export const aiRoadmap = [
  { phase: 1, title: '환경 설정 및 엔티티 구성', desc: 'Spring Boot 초기화 및 Member, Series 등 JPA 매핑', period: '02.09 ~ 02.15', tasks: ['프로젝트 초기화', '엔티티 매핑'] },
  { phase: 2, title: '인증/인가 구현', desc: 'Spring Security 세션 로그인 및 역할(Role) 분기 적용', period: '02.16 ~ 02.24', tasks: ['인증 구현', '권한 분리'] },
  { phase: 3, title: '시리즈 및 글 관리 핵심 로직', desc: 'orderIndex 재정렬 로직 구현 및 발행 상태 API 구성', period: '02.25 ~ 03.08', tasks: ['핵심 기능 구현'] },
  { phase: 4, title: '통계 및 배포', desc: '대시보드 구독자 수 N+1 문제 해결 후 Railway/Render 배포', period: '03.09 ~ 03.15', tasks: ['성능 점검', '배포'] },
]

export const aiTasks: AiTask[] = []

export const aiApis: AiApi[] = [
  { id: 'A1', group: 'Member', method: 'POST', path: '/api/members/signup', desc: '이메일, 비밀번호, 역할을 받아 회원 생성', auth: '없음', source: 'ai', status: 'progress', task: 'DP-05', feature: 'F1', request: { email: 'writer@devpath.com', password: 'P@ssw0rd!', role: 'AUTHOR' }, response: { status: 201, body: { memberId: 1, email: 'writer@devpath.com', role: 'AUTHOR' } } },
  { id: 'A2', group: 'Member', method: 'POST', path: '/api/members/login', desc: '인증 및 세션 생성', auth: '없음', source: 'ai', status: 'review', task: 'DP-04', feature: 'F1', request: { email: 'writer@devpath.com', password: 'P@ssw0rd!' }, response: { status: 200, body: { memberId: 1, role: 'AUTHOR' }, headers: 'Set-Cookie: JSESSIONID=...' } },
  { id: 'A3', group: 'Series', method: 'GET', path: '/api/series', desc: '발행 상태인 시리즈 목록 조회 (태그 필터링)', auth: 'READER, AUTHOR', source: 'ai', status: 'todo', task: 'DP-11', feature: 'F4', query: 'tag=에세이&page=0&size=20', response: { status: 200, body: { content: [{ seriesId: 3, title: '퇴근 후 쓰는 에세이', tags: ['에세이'], subscriberCount: 128 }], page: 0, totalPages: 4 } } },
  { id: 'A4', group: 'Series', method: 'POST', path: '/api/series', desc: '작가가 새 시리즈 초안 생성', auth: 'AUTHOR', source: 'ai', status: 'todo', task: 'DP-08', feature: 'F2', request: { title: '퇴근 후 쓰는 에세이', tags: ['에세이', '일상'] }, response: { status: 201, body: { seriesId: 3, publishStatus: 'DRAFT' } } },
  { id: 'A5', group: 'Series', method: 'PATCH', path: '/api/series/{seriesId}/status', desc: '시리즈 발행 상태 전환 (DRAFT ↔ PUBLISHED)', auth: 'AUTHOR (본인)', source: 'team', status: 'todo', task: 'DP-08', feature: 'F2', request: { publishStatus: 'PUBLISHED' }, response: { status: 200, body: { seriesId: 3, publishStatus: 'PUBLISHED' } } },
  { id: 'A6', group: 'Article', method: 'POST', path: '/api/series/{seriesId}/articles', desc: '시리즈에 글 작성 (orderIndex 지정 시 중간 삽입)', auth: 'AUTHOR (본인)', source: 'team', status: 'todo', task: 'DP-09', feature: 'F2', request: { title: '3화. 월요일의 지하철', content: '...', orderIndex: 3 }, response: { status: 201, body: { articleId: 42, orderIndex: 3 } } },
  { id: 'A7', group: 'Article', method: 'GET', path: '/api/series/{seriesId}/articles/{articleId}', desc: '특정 글 본문 및 이전/다음 글 정보 조회', auth: 'READER, AUTHOR', source: 'ai', status: 'todo', task: 'DP-10', feature: 'F3', response: { status: 200, body: { articleId: 42, title: '3화. 월요일의 지하철', orderIndex: 3, prev: { articleId: 41, title: '2화' }, next: { articleId: 43, title: '4화' } } } },
  { id: 'A8', group: 'Subscription', method: 'POST', path: '/api/subscriptions', desc: '독자가 특정 시리즈 구독', auth: 'READER', source: 'ai', status: 'todo', task: 'DP-12', feature: 'F4', request: { seriesId: 3 }, response: { status: 201, body: { subscriptionId: 77, seriesId: 3 } } },
  { id: 'A9', group: 'Dashboard', method: 'GET', path: '/api/authors/me/dashboard', desc: '작가 대시보드 - 시리즈별 구독자 수 통계', auth: 'AUTHOR', source: 'team', status: 'todo', task: 'DP-13', feature: 'F5', response: { status: 200, body: { totalSubscribers: 342, series: [{ seriesId: 3, title: '퇴근 후 쓰는 에세이', subscriberCount: 128 }] } } },
]

export const aiErdTables = [
  { name: 'MEMBER', columns: [['PK', 'memberId', 'BIGINT'], ['UK', 'email', 'VARCHAR(255)'], ['', 'encodedPassword', 'VARCHAR(255)'], ['', 'role', 'VARCHAR(20)']] },
  { name: 'SERIES', columns: [['PK', 'seriesId', 'BIGINT'], ['FK', 'memberId', 'BIGINT'], ['', 'title', 'VARCHAR(255)'], ['', 'publishStatus', 'VARCHAR(20)']] },
  { name: 'ARTICLE', columns: [['PK', 'articleId', 'BIGINT'], ['FK', 'seriesId', 'BIGINT'], ['', 'orderIndex', 'INT'], ['', 'publishStatus', 'VARCHAR(20)']] },
  { name: 'SUBSCRIPTION', columns: [['PK', 'subscriptionId', 'BIGINT'], ['FK', 'memberId', 'BIGINT'], ['FK', 'seriesId', 'BIGINT']] },
]

export const aiInterviewQuestions = [
  { id: 'Q1', category: '핵심 난제', question: 'Article의 orderIndex 중간 삽입 시 재정렬은 어떻게 했나요?', answer: '명시적 업데이트 쿼리를 통해 타겟 인덱스 이상의 글들을 +1 처리하는 방식으로 정합성을 우선하여 구현했습니다.', keywords: ['벌크 UPDATE', '트랜잭션', '정합성', 'orderIndex'], level: 3, apis: ['A6'] },
  { id: 'Q2', category: '성능', question: 'N+1 문제는 어디서 발생했으며 어떻게 해결했나요?', answer: '작가 대시보드에서 시리즈 목록과 구독자 수를 동시에 가져올 때 발생하여, Fetch Join(또는 Batch Size)을 활용해 최적화했습니다.', keywords: ['Fetch Join', '@BatchSize', '지연 로딩'], level: 2, apis: ['A9'] },
  { id: 'Q3', category: '보안', question: 'Security에서 작가와 독자 분기는 어떻게 처리했나요?', answer: '회원가입 시 부여된 Role 기반으로 URL 접근 제어를 설정하고, @AuthenticationPrincipal을 활용했습니다.', keywords: ['hasRole', 'requestMatchers', '세션'], level: 2, apis: ['A1', 'A2'] },
  { id: 'G1', category: '설계', question: '이전·다음 글 조회 쿼리는 어떻게 설계했나요?', answer: 'seriesId와 orderIndex 복합 인덱스로 양방향 범위 조회를 구성했습니다.', keywords: ['복합 인덱스', '범위 조회'], level: 2 },
  { id: 'G2', category: '데이터', question: '같은 시리즈의 중복 구독은 어떻게 막았나요?', answer: 'memberId와 seriesId에 유니크 제약을 적용하고 충돌 시 409를 반환했습니다.', keywords: ['유니크 제약', '409'], level: 1 },
]

let activeWorkspaceId: number | null = null

export function configureAiWorkspaceNavigation(workspaceId: number | null) {
  activeWorkspaceId = workspaceId
}

export function aiWorkspaceHref(path: string, hash = '') {
  return activeWorkspaceId ? `${path}?workspaceId=${activeWorkspaceId}&ai=1${hash}` : `${path}?ai=1${hash}`
}

export function applyWorkspaceAiDesign(design: WorkspaceAiDesign) {
  aiSquadProject.title = design.title
  aiSquadProject.squadName = `${design.title} 팀`
  aiSquadProject.oneLiner = design.summary
  aiSquadProject.summary = design.architecture.description
  aiSquadProject.difficulty = difficultyLabel(design.difficulty)
  aiSquadProject.stack.frontend.splice(0, aiSquadProject.stack.frontend.length, design.stack.frontend)
  aiSquadProject.stack.backend.splice(0, aiSquadProject.stack.backend.length, design.stack.backend, ...design.stack.libraries)
  aiSquadProject.stack.database.splice(0, aiSquadProject.stack.database.length, design.stack.database)
  aiSquadProject.stack.deploy.splice(0, aiSquadProject.stack.deploy.length)

  aiArchitecture.style = design.architecture.style
  aiArchitecture.description = design.architecture.description
  aiArchitecture.components.splice(0, aiArchitecture.components.length, ...design.architecture.components)
  aiArchitecture.erdMermaid = design.architecture.erdMermaid
  aiArchitecture.technicalChallenges.splice(0, aiArchitecture.technicalChallenges.length, ...design.architecture.technicalChallenges)

  aiUserFlow.splice(0, aiUserFlow.length, ...design.scenario.userFlows.map((flow) => [flow.actor, flow.action]))
  aiFeatures.splice(0, aiFeatures.length, ...design.scenario.coreFeatures.map((title, index) => ({ id: workspaceFeatureId(design.scenario, index), title, progress: 0 })))
  aiRoadmap.splice(0, aiRoadmap.length, ...design.roadmap.map((phase) => ({ phase: phase.phase, title: phase.title, desc: phase.goal, period: `${phase.estimatedWeeks}주`, tasks: phase.tasks })))
  aiTasks.splice(0, aiTasks.length, ...design.roadmap.flatMap((phase) => phase.tasks).map((title, index) => ({
    id: `DP-${String(index + 1).padStart(2, '0')}`,
    title,
    tag: inferTaskTag(title),
    assignee: '미지정',
    status: 'todo' as const,
    due: '미정',
  })))
  aiApis.splice(0, aiApis.length, ...mapWorkspaceApis(design.apis))
  aiErdTables.splice(0, aiErdTables.length, ...design.architecture.entities.map((entity) => ({
    name: entity.name,
    columns: entity.columns.map((column) => [column.constraints, column.name, column.type]),
  })))
  aiInterviewQuestions.splice(0, aiInterviewQuestions.length, ...design.interviewQuestions.map((question, index) => ({
    id: `Q${index + 1}`,
    category: question.category,
    question: question.question,
    answer: question.answer,
    keywords: question.keywords,
    level: 2,
    apis: question.apis ?? [],
    tasks: question.tasks ?? [],
    erd: question.erd,
  })))
}

function inferTaskTag(title: string): AiTask['tag'] {
  if (/화면|UI|UX|디자인|프론트/i.test(title)) return 'FE'
  if (/배포|CI|CD|인프라|모니터링/i.test(title)) return 'DevOps'
  return 'BE'
}

function difficultyLabel(difficulty: WorkspaceAiDesign['difficulty']) {
  if (difficulty === 'toy') return '🐣 토이 프로젝트'
  if (difficulty === 'enterprise') return '🏢 엔터프라이즈'
  return '🚀 실전 MVP'
}

function normalizeMethod(method: string): AiApi['method'] {
  const normalized = method.toUpperCase()
  return ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'].includes(normalized) ? normalized as AiApi['method'] : 'GET'
}

function parseJsonExample(value: string) {
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

export function mapWorkspaceApis(apis: WorkspaceAiDesign['apis']): AiApi[] {
  return apis.map((api, index) => ({ id: 'A' + (index + 1), group: apiDomainGroup(api.path, api.group), method: normalizeMethod(api.method), path: api.path, desc: api.description, auth: api.auth, source: 'ai', status: 'todo', task: '', request: parseJsonExample(api.requestExample), response: { status: 200, body: parseJsonExample(api.responseExample) } }))
}

function apiDomainGroup(path: string, group?: string) {
  const label = group?.trim()
  const isPrefix = (value: string) => /^(api|v\d+(?:\.\d+)*)$/i.test(value)
  if (label && !isPrefix(label)) return label

  // 이전 설계에는 분류가 없으므로 API·버전 접두사 다음 첫 리소스를 사용한다.
  const segments = path.split(/[?#]/)[0].split('/').filter(Boolean)
  while (segments.length && isPrefix(segments[0])) segments.shift()
  const resource = segments[0] ?? '기타'
  return resource.charAt(0).toUpperCase() + resource.slice(1)
}

export function normalizeWorkspaceApiGroups(apis: AiApi[]): AiApi[] {
  return apis.map((api) => ({ ...api, group: apiDomainGroup(api.path, api.group) }))
}

// 이전 설계의 보편적 영문 분류는 추가 AI 호출 없이 표시하고 고유 분류는 새 설계의 번역을 사용한다.
const apiGroupKoreanLabels = new Map([
  ['auth', '인증'],
  ['authentication', '인증'],
  ['authorization', '인가'],
  ['user', '사용자'],
  ['member', '회원'],
  ['reservation', '예약'],
  ['booking', '예약'],
  ['series', '시리즈'],
  ['article', '글'],
  ['subscription', '구독'],
  ['dashboard', '대시보드'],
  ['content', '콘텐츠'],
  ['comment', '댓글'],
  ['notification', '알림'],
  ['project', '프로젝트'],
  ['workspace', '워크스페이스'],
  ['task', '작업'],
  ['file', '파일'],
  ['meeting', '회의'],
  ['schedule', '일정'],
  ['order', '주문'],
  ['payment', '결제'],
  ['product', '상품'],
  ['category', '분류'],
  ['categories', '분류'],
  ['profile', '프로필'],
])

export function formatApiGroupLabel(group: string) {
  const label = group.trim()
  if (/[가-힣]/.test(label)) return label
  const key = label.toLowerCase()
  const korean = apiGroupKoreanLabels.get(key) ?? apiGroupKoreanLabels.get(key.replace(/s$/, ''))
  return korean ? `${label.toUpperCase()} (${korean})` : label
}
