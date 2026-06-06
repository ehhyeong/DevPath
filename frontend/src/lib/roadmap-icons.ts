export interface RoadmapNodeVisual {
  icon: string
  color: string
  bgColor: string
}

export interface RoadmapNodeVisualInput {
  title?: string | null
  subTopics?: string | string[] | null
  nodeType?: string | null
  roadmapTitle?: string | null
  category?: string | null
}

interface RoadmapIconSource {
  title?: string | null
  subtitle?: string | null
  category?: string | null
  iconClass?: string | null
}

interface RoadmapVisualRule extends RoadmapNodeVisual {
  keywords: string[]
}

const DEFAULT_NODE_VISUAL: RoadmapNodeVisual = {
  icon: 'fas fa-book-open',
  color: 'text-[#00C471]',
  bgColor: 'bg-green-50',
}

const STAGE_VISUAL_RULES: RoadmapVisualRule[] = [
  {
    keywords: ['테스트', '검증', 'test', 'testing', 'qa', '품질', '디버깅', 'debug', 'coverage'],
    icon: 'fas fa-vial',
    color: 'text-teal-500',
    bgColor: 'bg-teal-50',
  },
  {
    keywords: ['보안', 'security', 'auth', '인증', '인가', '권한', 'oauth', 'jwt', 'xss', 'csrf', '취약점', 'owasp', '시크릿', '암호'],
    icon: 'fas fa-shield-alt',
    color: 'text-red-500',
    bgColor: 'bg-red-50',
  },
  {
    keywords: ['성능', '최적화', 'performance', 'perf', 'latency', '처리량', '트래픽', '비용', '메모리', '병목'],
    icon: 'fas fa-chart-line',
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-50',
  },
  {
    keywords: ['운영', '모니터링', 'monitoring', '로그', 'log', 'metric', 'metrics', '알림', 'alert', 'observability', '백업', '롤백'],
    icon: 'fas fa-chart-line',
    color: 'text-sky-500',
    bgColor: 'bg-sky-50',
  },
  {
    keywords: ['ci/cd', 'cicd', 'ci cd', '파이프라인', 'pipeline', 'workflow', '워크플로', 'github actions', 'jenkins', '자동화', '빌드', 'build'],
    icon: 'fas fa-infinity',
    color: 'text-amber-500',
    bgColor: 'bg-amber-50',
  },
  {
    keywords: ['배포', 'deploy', 'deployment', 'release', '릴리스', '컨테이너', 'container', 'registry', '운영 자동화'],
    icon: 'fas fa-rocket',
    color: 'text-orange-500',
    bgColor: 'bg-orange-50',
  },
  {
    keywords: ['환경 변수', '환경', '변수', 'env', 'config', 'configuration', '설정', '터미널', 'shell', 'cli', '도구', '작업 환경'],
    icon: 'fas fa-terminal',
    color: 'text-slate-500',
    bgColor: 'bg-slate-50',
  },
  {
    keywords: ['api', 'http', 'rest', 'graphql', '라우팅', 'routing', '요청', '응답', '서버 상태', '클라이언트 상태', '연동'],
    icon: 'fas fa-plug',
    color: 'text-orange-500',
    bgColor: 'bg-orange-50',
  },
  {
    keywords: ['데이터 설계', '데이터 모델', '상태 관리', 'database', 'db', 'sql', 'mysql', 'postgres', 'redis', '데이터베이스', '저장소'],
    icon: 'fas fa-database',
    color: 'text-violet-500',
    bgColor: 'bg-violet-50',
  },
  {
    keywords: ['아키텍처', 'architecture', '설계', '모듈', '경계', 'system design', '디자인 시스템', '구조'],
    icon: 'fas fa-sitemap',
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-50',
  },
  {
    keywords: ['협업', '문서', '문서화', 'git', 'github', 'branch', '브랜치', 'merge', '리뷰', 'review', 'pull request', 'pr'],
    icon: 'fas fa-code-branch',
    color: 'text-amber-500',
    bgColor: 'bg-amber-50',
  },
  {
    keywords: ['프로젝트', '포트폴리오', 'portfolio', 'mvp', '실전 구현', '산출물'],
    icon: 'fas fa-briefcase',
    color: 'text-[#00C471]',
    bgColor: 'bg-green-50',
  },
]

const HUB_TECH_VISUAL_RULES: RoadmapVisualRule[] = [
  { keywords: ['typescript', '타입스크립트', 'tsconfig'], icon: 'fas fa-file-code', color: 'text-[#3178C6]', bgColor: 'bg-blue-50' },
  { keywords: ['javascript', '자바스크립트', 'ecmascript'], icon: 'fab fa-js', color: 'text-[#F7DF1E]', bgColor: 'bg-yellow-50' },
  { keywords: ['react native'], icon: 'fab fa-react', color: 'text-[#61DAFB]', bgColor: 'bg-cyan-50' },
  { keywords: ['react', 'jsx', 'hooks'], icon: 'fab fa-react', color: 'text-[#61DAFB]', bgColor: 'bg-cyan-50' },
  { keywords: ['next.js', 'nextjs', 'next '], icon: 'fas fa-n', color: 'text-gray-900', bgColor: 'bg-gray-100' },
  { keywords: ['vue', 'composition api', 'pinia'], icon: 'fab fa-vuejs', color: 'text-[#42B883]', bgColor: 'bg-emerald-50' },
  { keywords: ['angular', 'rxjs'], icon: 'fab fa-angular', color: 'text-[#DD0031]', bgColor: 'bg-red-50' },
  { keywords: ['html', 'semantic tag', '시맨틱'], icon: 'fab fa-html5', color: 'text-[#E34F26]', bgColor: 'bg-orange-50' },
  { keywords: ['css', 'flex', 'grid', '반응형', 'tailwind'], icon: 'fab fa-css3-alt', color: 'text-[#1572B6]', bgColor: 'bg-blue-50' },
  { keywords: ['node.js', 'nodejs', 'express'], icon: 'fab fa-node-js', color: 'text-[#339933]', bgColor: 'bg-green-50' },
  { keywords: ['spring boot', 'spring', 'jpa', 'hibernate'], icon: 'fas fa-leaf', color: 'text-[#6DB33F]', bgColor: 'bg-green-50' },
  { keywords: ['java', 'jvm', 'jdk', 'gradle'], icon: 'fab fa-java', color: 'text-[#F89820]', bgColor: 'bg-orange-50' },
  { keywords: ['python', 'pandas', 'jupyter', 'scikit'], icon: 'fab fa-python', color: 'text-[#3776AB]', bgColor: 'bg-blue-50' },
  { keywords: ['django'], icon: 'fab fa-python', color: 'text-[#092E20]', bgColor: 'bg-green-50' },
  { keywords: ['php'], icon: 'fab fa-php', color: 'text-[#777BB4]', bgColor: 'bg-indigo-50' },
  { keywords: ['laravel'], icon: 'fab fa-laravel', color: 'text-[#FF2D20]', bgColor: 'bg-red-50' },
  { keywords: ['ruby on rails', 'rails'], icon: 'fas fa-train', color: 'text-[#CC0000]', bgColor: 'bg-red-50' },
  { keywords: ['ruby', 'gem'], icon: 'fas fa-gem', color: 'text-[#CC342D]', bgColor: 'bg-red-50' },
  { keywords: ['rust'], icon: 'fab fa-rust', color: 'text-[#DEA584]', bgColor: 'bg-orange-50' },
  { keywords: ['go roadmap', 'golang', 'goroutine', 'gin', 'go toolchain'], icon: 'fas fa-code', color: 'text-[#00ADD8]', bgColor: 'bg-cyan-50' },
  { keywords: ['kotlin', 'coroutine', 'sealed class'], icon: 'fas fa-code', color: 'text-[#7F52FF]', bgColor: 'bg-purple-50' },
  { keywords: ['swiftui', 'swift ui', 'swift', 'xcode'], icon: 'fab fa-swift', color: 'text-[#FA7343]', bgColor: 'bg-orange-50' },
  { keywords: ['android', 'jetpack', 'compose', 'android studio'], icon: 'fab fa-android', color: 'text-[#3DDC84]', bgColor: 'bg-green-50' },
  { keywords: ['flutter', 'dart'], icon: 'fas fa-mobile-alt', color: 'text-[#02569B]', bgColor: 'bg-blue-50' },
  { keywords: ['docker', 'dockerfile', 'compose'], icon: 'fab fa-docker', color: 'text-[#2496ED]', bgColor: 'bg-blue-50' },
  { keywords: ['kubernetes', 'k8s', 'kubectl', 'helm'], icon: 'fas fa-dharmachakra', color: 'text-[#326CE5]', bgColor: 'bg-blue-50' },
  { keywords: ['aws', 'ec2', 's3', 'rds', 'iam', 'vpc'], icon: 'fab fa-aws', color: 'text-[#FF9900]', bgColor: 'bg-orange-50' },
  { keywords: ['terraform', 'provider resource state'], icon: 'fas fa-cubes', color: 'text-[#7B42BC]', bgColor: 'bg-purple-50' },
  { keywords: ['linux', 'systemd', 'ssh', 'journalctl'], icon: 'fab fa-linux', color: 'text-gray-900', bgColor: 'bg-gray-100' },
  { keywords: ['cloudflare', 'workers', 'cdn', 'waf'], icon: 'fab fa-cloudflare', color: 'text-[#F38020]', bgColor: 'bg-orange-50' },
  { keywords: ['sql', 'postgresql', 'mysql', 'rdbms', '트랜잭션', '인덱스'], icon: 'fas fa-database', color: 'text-[#336791]', bgColor: 'bg-blue-50' },
  { keywords: ['mongodb', 'document collection'], icon: 'fas fa-leaf', color: 'text-[#47A248]', bgColor: 'bg-green-50' },
  { keywords: ['redis', 'cache', '캐시'], icon: 'fas fa-memory', color: 'text-[#DC382D]', bgColor: 'bg-red-50' },
  { keywords: ['graphql', 'schema query mutation'], icon: 'fas fa-project-diagram', color: 'text-[#E10098]', bgColor: 'bg-pink-50' },
  { keywords: ['machine learning', '머신러닝', 'mlflow', '모델 학습'], icon: 'fas fa-microchip', color: 'text-[#F97316]', bgColor: 'bg-orange-50' },
  { keywords: ['deep learning', '딥러닝', 'pytorch', 'tensorflow', '신경망'], icon: 'fas fa-brain', color: 'text-[#A855F7]', bgColor: 'bg-purple-50' },
  { keywords: ['ai agents', 'agent', 'tool calling', 'langgraph'], icon: 'fas fa-robot', color: 'text-[#9333EA]', bgColor: 'bg-purple-50' },
  { keywords: ['prompt engineering', '프롬프트'], icon: 'fas fa-magic', color: 'text-[#8B5CF6]', bgColor: 'bg-purple-50' },
  { keywords: ['computer science', '컴퓨터 사이언스', '자료구조', '알고리즘', '운영체제', '네트워크'], icon: 'fas fa-microchip', color: 'text-slate-500', bgColor: 'bg-slate-50' },
  { keywords: ['code review', '코드 리뷰'], icon: 'fas fa-code-branch', color: 'text-[#10B981]', bgColor: 'bg-emerald-50' },
  { keywords: ['shell', 'bash', 'shellcheck'], icon: 'fas fa-terminal', color: 'text-[#4EAA25]', bgColor: 'bg-green-50' },
]

const HUB_ROLE_VISUAL_RULES: RoadmapVisualRule[] = [
  { keywords: ['frontend', '프론트엔드', '프론트'], icon: 'fas fa-desktop', color: 'text-[#38BDF8]', bgColor: 'bg-sky-50' },
  { keywords: ['backend', '백엔드'], icon: 'fas fa-server', color: 'text-[#00C471]', bgColor: 'bg-green-50' },
  { keywords: ['full stack', '풀스택'], icon: 'fas fa-layer-group', color: 'text-[#8B5CF6]', bgColor: 'bg-purple-50' },
  { keywords: ['devops', '데브옵스'], icon: 'fas fa-infinity', color: 'text-[#F59E0B]', bgColor: 'bg-amber-50' },
  { keywords: ['devsecops', '데브섹옵스'], icon: 'fas fa-shield-alt', color: 'text-[#EF4444]', bgColor: 'bg-red-50' },
  { keywords: ['data analyst', '데이터 분석가', 'bi analyst', 'bi 분석가'], icon: 'fas fa-chart-line', color: 'text-[#06B6D4]', bgColor: 'bg-cyan-50' },
  { keywords: ['data engineer', '데이터 엔지니어'], icon: 'fas fa-database', color: 'text-[#0EA5E9]', bgColor: 'bg-sky-50' },
  { keywords: ['ai engineer', 'ai 엔지니어', 'data scientist', '데이터 사이언티스트'], icon: 'fas fa-brain', color: 'text-[#A855F7]', bgColor: 'bg-purple-50' },
  { keywords: ['cyber security', '사이버 보안'], icon: 'fas fa-user-shield', color: 'text-[#DC2626]', bgColor: 'bg-red-50' },
  { keywords: ['software architect', '소프트웨어 아키텍트'], icon: 'fas fa-sitemap', color: 'text-slate-500', bgColor: 'bg-slate-50' },
  { keywords: ['ux design', 'ux 디자인'], icon: 'fas fa-bezier-curve', color: 'text-[#EC4899]', bgColor: 'bg-pink-50' },
  { keywords: ['technical writer', '테크니컬 라이터'], icon: 'fas fa-pen-fancy', color: 'text-slate-500', bgColor: 'bg-slate-50' },
  { keywords: ['game developer', '게임 개발자'], icon: 'fas fa-gamepad', color: 'text-[#7C3AED]', bgColor: 'bg-purple-50' },
  { keywords: ['product manager', '프로덕트 매니저'], icon: 'fas fa-clipboard-list', color: 'text-[#F59E0B]', bgColor: 'bg-amber-50' },
  { keywords: ['engineering manager', '엔지니어링 매니저'], icon: 'fas fa-users', color: 'text-[#0F766E]', bgColor: 'bg-teal-50' },
  { keywords: ['developer relations', '데브렐'], icon: 'fas fa-bullhorn', color: 'text-[#EAB308]', bgColor: 'bg-yellow-50' },
]

const NODE_MATCH_RULES = [...STAGE_VISUAL_RULES, ...HUB_TECH_VISUAL_RULES, ...HUB_ROLE_VISUAL_RULES]
const REPRESENTATIVE_MATCH_RULES = [...HUB_TECH_VISUAL_RULES, ...HUB_ROLE_VISUAL_RULES]

function normalizeSearchText(values: Array<string | string[] | null | undefined>) {
  return values
    .flatMap((value) => Array.isArray(value) ? value : [value])
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join(' ')
    .toLowerCase()
}

function findVisualRule(target: string, rules: RoadmapVisualRule[]) {
  return rules.find((rule) =>
    rule.keywords.some((keyword) => target.includes(keyword.toLowerCase())),
  )
}

export function getRoadmapNodeVisual(input: RoadmapNodeVisualInput): RoadmapNodeVisual {
  const nodeTarget = normalizeSearchText([input.title, input.subTopics, input.nodeType])
  const nodeRule = findVisualRule(nodeTarget, NODE_MATCH_RULES)

  if (nodeRule) {
    return nodeRule
  }

  const roadmapTarget = normalizeSearchText([input.roadmapTitle, input.category])
  const roadmapRule = findVisualRule(roadmapTarget, REPRESENTATIVE_MATCH_RULES)

  return roadmapRule ?? DEFAULT_NODE_VISUAL
}

export function getRoadmapHubIconClass(source: RoadmapIconSource, fallbackIconClass: string) {
  const explicitIconClass = source.iconClass?.trim()

  if (explicitIconClass) {
    return explicitIconClass
  }

  const representativeTarget = normalizeSearchText([source.title, source.subtitle, source.category])
  const representativeRule = findVisualRule(representativeTarget, REPRESENTATIVE_MATCH_RULES)

  return representativeRule?.icon ?? fallbackIconClass
}
