


export type ApiJob = {
  jobId: number
  companyId: number
  companyName: string
  title: string
  jobRole?: string | null
  requiredSkills?: string | null
  region?: string | null
  careerLevel?: string | null
  source?: string | null
  status?: string | null
  deadline?: string | null
  createdAt?: string | null
}

export type JobkoreaPosting = {
  externalId?: string | null
  companyName?: string | null
  companyUrl?: string | null
  title?: string | null
  keywords?: string[] | null
  areaCode?: string | null
  careerCode?: string | null
  deadline?: string | null
  postedDate?: string | null
  jobkoreaUrl?: string | null
}

export type JobkoreaResult = {
  totalCount?: number | null
  pageCount?: number | null
  page?: number | null
  size?: number | null
  attribution?: {
    label?: string | null
    url?: string | null
    notice?: string | null
  } | null
  items?: JobkoreaPosting[] | null
}

export type ActivityProfile = {
  projectCount: number
  completedTaskCount: number
  proofCardCount: number
  averageProofCardScore: number | null
  skillSignals: string[]
}

export type RecommendedJob = ApiJob & {
  sourceUrl?: string | null
  recommendationScore?: number | null
  matchedSkillTags?: string[] | null
  reason?: string | null
}

export type GeminiRecommendation = {
  externalId?: string | null
  companyName?: string | null
  title?: string | null
  keywords?: string[] | null
  areaCode?: string | null
  careerCode?: string | null
  deadline?: string | null
  postedDate?: string | null
  jobkoreaUrl?: string | null
  aiMatchScore: number
  aiReason?: string | null
  missingSkills?: string[] | null
}

export type GeminiAnalysis = {
  recommendations: GeminiRecommendation[]
  stretchRecommendations?: GeminiRecommendation[] | null
  aiAnalyzed: boolean
  analysisNote?: string | null
}

export type LoadingStep = 'profile' | 'jobkorea' | 'gemini' | 'finishing' | 'fallback' | null

export type UserProfile = {
  name?: string | null
  nickname?: string | null
  profileImage?: string | null
  jobTitle?: string | null
  position?: string | null
}

export type RoleFilter =
  | 'all'
  | 'backend'
  | 'backend-java'
  | 'backend-node'
  | 'backend-python'
  | 'backend-kotlin'
  | 'frontend'
  | 'frontend-react'
  | 'frontend-next'
  | 'frontend-vue'
  | 'fullstack'
  | 'mobile'
  | 'android'
  | 'ios'
  | 'devops'
  | 'cloud'
  | 'security'
  | 'qa'
  | 'data'
  | 'data-analytics'
  | 'ai'
  | 'mlops'
  | 'pm'
  | 'uiux'
export type RegionFilter =
  | 'all'
  | 'seoul'
  | 'gangnam'
  | 'mapo'
  | 'guro'
  | 'jamsil'
  | 'pangyo'
  | 'bundang'
  | 'gyeonggi'
  | 'incheon'
  | 'daejeon'
  | 'busan'
  | 'daegu'
  | 'gwangju'
  | 'remote'
  | 'hybrid'
export type CareerFilter =
  | 'all'
  | 'intern'
  | 'newcomer'
  | 'junior'
  | 'junior1'
  | 'junior2'
  | 'mid'
  | 'mid3'
  | 'mid5'
  | 'senior'
  | 'lead'
  | 'manager'

export type RoleOption = {
  value: RoleFilter
  label: string
  keyword: string
  jobCode?: string
  industryCode?: string
  skills: string[]
}

export type RegionOption = {
  value: RegionFilter
  label: string
  areaCode?: string
  aliases: string[]
}

export type CareerOption = {
  value: CareerFilter
  label: string
  aliases: string[]
}

export type MatchingJob = {
  id: string
  source: 'internal' | 'jobkorea'
  title: string
  companyName: string
  regionLabel: string
  careerLabel: string
  skills: string[]
  url?: string | null
  deadline?: string | null
  createdAt?: string | null
  matchScore: number
  matchedReasons: string[]
  missingSkills: string[]
  aiAnalyzed?: boolean
  isStretch?: boolean
}

export const roleOptions: RoleOption[] = [
  { value: 'all', label: '전체 개발 직군', keyword: '개발자', skills: ['Java', 'Spring Boot', 'React', 'SQL'] },
  { value: 'backend', label: '백엔드 전체', keyword: '백엔드 서버 API', jobCode: '1000229', skills: ['Java', 'Spring Boot', 'JPA', 'PostgreSQL', 'Redis'] },
  { value: 'backend-java', label: 'Java/Spring 백엔드', keyword: 'Java Spring Boot 백엔드', jobCode: '1000229', skills: ['Java', 'Spring Boot', 'JPA', 'PostgreSQL', 'AWS'] },
  { value: 'backend-node', label: 'Node.js 백엔드', keyword: 'Node.js NestJS 백엔드', jobCode: '1000229', skills: ['Node.js', 'NestJS', 'TypeScript', 'MySQL', 'Redis'] },
  { value: 'backend-python', label: 'Python/FastAPI 백엔드', keyword: 'Python FastAPI Django 백엔드', jobCode: '1000229', skills: ['Python', 'FastAPI', 'Django', 'PostgreSQL', 'Docker'] },
  { value: 'backend-kotlin', label: 'Kotlin/JVM 백엔드', keyword: 'Kotlin Spring JVM 백엔드', jobCode: '1000229', skills: ['Kotlin', 'Spring Boot', 'JPA', 'Kafka', 'AWS'] },
  { value: 'frontend', label: '프론트엔드 전체', keyword: '프론트엔드 React UI', jobCode: '1000230', skills: ['React', 'TypeScript', 'Next.js', 'Tailwind'] },
  { value: 'frontend-react', label: 'React 프론트엔드', keyword: 'React TypeScript 프론트엔드', jobCode: '1000230', skills: ['React', 'TypeScript', 'Vite', 'Tailwind', 'Zustand'] },
  { value: 'frontend-next', label: 'Next.js 프론트엔드', keyword: 'Next.js App Router 프론트엔드', jobCode: '1000230', skills: ['Next.js', 'React', 'TypeScript', 'SSR', 'SEO'] },
  { value: 'frontend-vue', label: 'Vue/Nuxt 프론트엔드', keyword: 'Vue Nuxt 프론트엔드', jobCode: '1000230', skills: ['Vue', 'Nuxt', 'TypeScript', 'Pinia', 'CSS'] },
  { value: 'fullstack', label: '풀스택 개발자', keyword: '풀스택 React Spring Node', jobCode: '1000239', skills: ['React', 'Spring Boot', 'Node.js', 'SQL', 'Docker'] },
  { value: 'mobile', label: '모바일 앱 전체', keyword: '모바일 앱 개발자 iOS Android React Native', jobCode: '1000232', skills: ['React Native', 'Flutter', 'Swift', 'Kotlin'] },
  { value: 'android', label: 'Android 개발자', keyword: 'Android Kotlin 모바일', jobCode: '1000232', skills: ['Kotlin', 'Android', 'Jetpack', 'Compose'] },
  { value: 'ios', label: 'iOS 개발자', keyword: 'iOS Swift 모바일', jobCode: '1000232', skills: ['Swift', 'iOS', 'UIKit', 'SwiftUI'] },
  { value: 'devops', label: 'DevOps/SRE', keyword: 'DevOps SRE Kubernetes AWS', jobCode: '1000244', skills: ['Linux', 'Docker', 'Kubernetes', 'AWS', 'CI/CD'] },
  { value: 'cloud', label: '클라우드/인프라', keyword: 'Cloud AWS Azure GCP 인프라', jobCode: '1000244', skills: ['AWS', 'Terraform', 'Kubernetes', 'Nginx', 'Monitoring'] },
  { value: 'security', label: '보안 엔지니어', keyword: '보안 엔지니어 Security AppSec', jobCode: '1000238', skills: ['Security', 'OAuth2', 'JWT', 'OWASP', 'Monitoring'] },
  { value: 'qa', label: 'QA/테스트 자동화', keyword: 'QA 테스트 자동화 Playwright Cypress', jobCode: '1000247', skills: ['QA', 'Playwright', 'Cypress', 'JUnit', 'Test Automation'] },
  { value: 'data', label: '데이터 엔지니어', keyword: '데이터 엔지니어 Python SQL', jobCode: '1000236', skills: ['Python', 'SQL', 'ETL', 'Spark', 'Kafka'] },
  { value: 'data-analytics', label: '데이터 분석가', keyword: '데이터 분석 SQL BI Python', jobCode: '1000237', skills: ['SQL', 'Python', 'Tableau', 'Amplitude', 'Statistics'] },
  { value: 'ai', label: 'AI/머신러닝', keyword: 'AI 머신러닝 Python', jobCode: '1000242', skills: ['Python', 'TensorFlow', 'PyTorch', 'LLM', 'MLOps'] },
  { value: 'mlops', label: 'MLOps/AI 플랫폼', keyword: 'MLOps AI Platform Kubernetes', jobCode: '1000242', skills: ['MLOps', 'Python', 'Docker', 'Kubernetes', 'MLflow'] },
  { value: 'pm', label: '서비스 기획/PM', keyword: '서비스 기획 PM PO 애자일', jobCode: '1000188', industryCode: '10026', skills: ['Product', 'Agile', 'Roadmap', 'Analytics', 'Figma'] },
  { value: 'uiux', label: 'UI/UX 디자이너', keyword: 'UI UX Product Design Figma', jobCode: '1000256', industryCode: '10032', skills: ['Figma', 'UX', 'UI', 'Prototype', 'Design System'] },
]

export const regionOptions: RegionOption[] = [
  { value: 'all', label: '전국', aliases: [] },
  { value: 'seoul', label: '서울 전체', areaCode: 'I000', aliases: ['서울', '강남', '서초', '송파', '마포', '구로', '성수'] },
  { value: 'gangnam', label: '강남/서초/역삼', areaCode: 'I010', aliases: ['강남', '서초', '역삼', '선릉', '삼성'] },
  { value: 'mapo', label: '마포/홍대/상암', aliases: ['마포', '홍대', '상암', '공덕', '합정'] },
  { value: 'guro', label: '구로/가산/금천', aliases: ['구로', '가산', '금천', '디지털단지'] },
  { value: 'jamsil', label: '송파/잠실/문정', aliases: ['송파', '잠실', '문정', '성수'] },
  { value: 'pangyo', label: '판교/분당', areaCode: 'I000', aliases: ['판교', '분당', '성남'] },
  { value: 'bundang', label: '성남/분당/정자', aliases: ['성남', '분당', '정자', '수내'] },
  { value: 'gyeonggi', label: '경기 전체', aliases: ['경기', '수원', '용인', '안양', '과천', '부천'] },
  { value: 'incheon', label: '인천/송도', aliases: ['인천', '송도', '청라'] },
  { value: 'daejeon', label: '대전/세종', aliases: ['대전', '세종', '유성'] },
  { value: 'busan', label: '부산/울산/경남', aliases: ['부산', '울산', '창원', '경남'] },
  { value: 'daegu', label: '대구/경북', aliases: ['대구', '경북', '구미'] },
  { value: 'gwangju', label: '광주/전라', aliases: ['광주', '전주', '전라'] },
  { value: 'remote', label: '원격 근무 선호', aliases: ['원격', '재택', 'remote'] },
  { value: 'hybrid', label: '하이브리드/부분 재택', aliases: ['하이브리드', '부분 재택', '재택', 'hybrid'] },
]

export const careerOptions: CareerOption[] = [
  { value: 'all', label: '전체', aliases: [] },
  { value: 'intern', label: '인턴 (Intern)', aliases: ['인턴', 'intern'] },
  { value: 'newcomer', label: '신입 (0년)', aliases: ['신입', '신입가능', '0년', 'new grad'] },
  { value: 'junior', label: '주니어 전체 (0~2년)', aliases: ['신입', '주니어', 'junior', '0~2'] },
  { value: 'junior1', label: '1년 이하', aliases: ['1년', '1년 이하', '0~1', '주니어'] },
  { value: 'junior2', label: '1~2년', aliases: ['1~2', '2년', '주니어'] },
  { value: 'mid', label: '미들 전체 (3~5년)', aliases: ['경력', '3~5', '미들'] },
  { value: 'mid3', label: '3년차 전후', aliases: ['3년', '2~4', '미들'] },
  { value: 'mid5', label: '4~5년', aliases: ['4년', '5년', '4~5', '경력'] },
  { value: 'senior', label: '시니어 (6년 이상)', aliases: ['시니어', 'senior', '6년', '7년'] },
  { value: 'lead', label: '리드/테크리드', aliases: ['리드', '테크리드', 'lead', 'architect'] },
  { value: 'manager', label: '파트장/매니저', aliases: ['파트장', '매니저', 'manager', '팀장'] },
]

export const STEP_MESSAGES: Record<NonNullable<LoadingStep>, string[]> = {
  profile: [
    'DevPath 학습 이력을 분석하고 있습니다...',
    'Proof Card와 프로젝트 데이터를 수집 중입니다...',
    '보유 스킬 신호를 추출하고 있습니다...',
  ],
  jobkorea: [
    '잡코리아에서 최신 채용공고를 수집하고 있습니다...',
    '실시간 채용 데이터를 불러오는 중입니다...',
    '검색 조건에 맞는 공고를 필터링하고 있습니다...',
  ],
  gemini: [
    'Gemini AI가 직무 적합도를 분석 중입니다...',
    'AI가 공고별 매칭 포인트를 계산하고 있습니다...',
    '보유 스킬과 채용 요건을 비교하고 있습니다...',
    '당신에게 딱 맞는 공고를 선별하고 있습니다...',
  ],
  finishing: [
    'AI 분석 결과를 정리하고 있습니다...',
    '맞춤 추천 목록을 구성하고 있습니다...',
  ],
  fallback: [
    'AI 분석을 완료하지 못했습니다. 기본 매칭으로 전환합니다...',
    '잡코리아 공고와 스킬 데이터를 매칭하고 있습니다...',
    '채용공고를 분석 중입니다...',
  ],
}

export function optionOf<T extends { value: string }>(items: T[], value: T['value']): T {
  return items.find((item) => item.value === value) ?? items[0]
}

export const JOBKOREA_CAREER_MAP: Record<string, string> = {
  '1': '신입', '2': '경력', '3': '신입/경력', '4': '경력무관',
}

export function resolveCareerCode(careerCode?: string | null): string {
  if (!careerCode) return '상세 조건 확인'
  return JOBKOREA_CAREER_MAP[careerCode.trim()] ?? '상세 조건 확인'
}

export const JOBKOREA_AREA_MAP: Record<string, string> = {
  I000: '서울', I010: '강남구', I020: '강동구', I030: '강북구', I040: '강서구',
  I050: '관악구', I060: '광진구', I070: '구로구', I080: '금천구', I090: '노원구',
  I100: '도봉구', I110: '동대문구', I120: '동작구', I130: '마포구', I140: '서대문구',
  I150: '서초구', I160: '성동구', I170: '성북구', I180: '송파구', I190: '양천구',
  I200: '영등포구', I210: '용산구', I220: '은평구', I230: '종로구', I240: '중구', I250: '중랑구',
  B000: '경기', B010: '가평', B020: '고양 덕양', B030: '고양 일산동', B031: '고양 일산서',
  B040: '과천', B050: '광명', B060: '광주', B070: '구리', B080: '군포', B090: '김포',
  B100: '남양주', B125: '부천', B150: '성남 분당', B160: '성남 수정', B170: '성남 중원',
  B180: '수원 권선', B190: '수원 장안', B200: '수원 팔달', B201: '수원 영통',
  B210: '시흥', B220: '안산 단원', B221: '안산 상록', B230: '안성', B240: '안양 동안',
  B250: '안양 만안', B260: '양주', B270: '양평', B280: '여주', B290: '연천',
  B300: '오산', B310: '용인 기흥', B311: '용인 수지', B312: '용인 처인',
  B320: '의왕', B330: '의정부', B340: '이천', B350: '파주', B360: '평택',
  B370: '포천', B380: '하남', B390: '화성',
  K000: '인천', K020: '계양구', K030: '미추홀구', K040: '남동구', K050: '동구',
  K060: '부평구', K070: '서구', K080: '연수구', K100: '중구',
  G000: '대전', G010: '대덕구', G020: '동구', G030: '서구', G040: '유성구', G050: '중구',
  H000: '부산', F000: '대구', E000: '광주', J000: '울산',
  A000: '강원', C000: '경남', D000: '경북', L000: '전남', M000: '전북',
  O000: '충남', P000: '충북', N000: '제주', '1000': '세종', Q000: '전국',
}

export function resolveAreaCode(areaCode?: string | null): string | null {
  if (!areaCode || areaCode === '0') return null
  const codes = areaCode.split(',').map((c) => c.trim()).filter(Boolean)
  const labels = codes.map((c) => JOBKOREA_AREA_MAP[c] ?? c).filter(Boolean)
  return labels.length > 0 ? labels.join(' · ') : null
}

export function splitSkills(value?: string | null) {
  return (value ?? '')
    .split(/[,/|·\s]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

export function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, '')
}

export function includesAny(target: string, values: string[]) {
  const normalizedTarget = normalize(target)

  return values.some((value) => normalizedTarget.includes(normalize(value)))
}

export function toDisplayDate(value?: string | null) {
  if (!value) {
    return '상시채용'
  }

  return value.replaceAll('-', '.')
}

export function initials(companyName: string) {
  const compact = companyName.replace(/[^\w가-힣]/g, '')

  if (!compact) {
    return 'JD'
  }

  return compact.slice(0, 2).toUpperCase()
}

export function buildQuery(params: Record<string, string | number | boolean | null | undefined>) {
  const searchParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return
    }

    searchParams.set(key, String(value))
  })

  const query = searchParams.toString()

  return query ? `?${query}` : ''
}

export function calculateMatchScore(
  text: string,
  skills: string[],
  role: RoleOption,
  region: RegionOption,
  career: CareerOption,
  source: 'internal' | 'jobkorea',
) {
  const searchableText = [text, ...skills].join(' ')
  const matchedSkillCount = role.skills.filter((skill) => includesAny(searchableText, [skill])).length
  const skillBonus = Math.min(matchedSkillCount * 10, 35)
  const sourceBonus = source === 'internal' ? 5 : 0
  const roleBonus = role.value === 'all' || includesAny(text, [role.keyword, ...role.skills]) ? 16 : 0
  const regionBonus = region.value === 'all' || includesAny(text, region.aliases) ? 8 : 0
  const careerBonus = career.value === 'all' || includesAny(text, career.aliases) ? 6 : 0

  return Math.max(55, Math.min(98, 42 + skillBonus + sourceBonus + roleBonus + regionBonus + careerBonus))
}

export function createReasons(skills: string[], role: RoleOption, source: 'internal' | 'jobkorea') {
  const matchedSkills = role.skills.filter((skill) => skills.some((item) => normalize(item).includes(normalize(skill))))
  const reasons = matchedSkills.slice(0, 2).map((skill) => `${skill} 역량 매칭`)

  if (source === 'internal') {
    reasons.push('DevPath 등록 공고')
  } else {
    reasons.push('잡코리아 실시간 공고')
  }

  return reasons.slice(0, 3)
}

export function createMissingSkills(skills: string[], role: RoleOption) {
  return role.skills
    .filter((skill) => !skills.some((item) => normalize(item).includes(normalize(skill))))
    .slice(0, 2)
}

export function mapDbJob(
  job: ApiJob,
  role: RoleOption,
  region: RegionOption,
  career: CareerOption,
): MatchingJob {
  const skills = splitSkills(job.requiredSkills)
  const text = [job.title, job.companyName, job.jobRole, job.requiredSkills, job.region, job.careerLevel].filter(Boolean).join(' ')

  return {
    id: `internal-${job.jobId}`,
    source: 'internal',
    title: job.title,
    companyName: job.companyName,
    regionLabel: job.region ?? region.label,
    careerLabel: job.careerLevel ?? '경력 무관',
    skills,
    deadline: job.deadline,
    createdAt: job.createdAt,
    matchScore: calculateMatchScore(text, skills, role, region, career, 'internal'),
    matchedReasons: createReasons(skills, role, 'internal'),
    missingSkills: createMissingSkills(skills, role),
  }
}

export function mapRecommendedJob(
  job: RecommendedJob,
  role: RoleOption,
  region: RegionOption,
  career: CareerOption,
): MatchingJob {
  const baseJob = mapDbJob(job, role, region, career)
  const skills = splitSkills(job.requiredSkills)
  const matchedSkills = job.matchedSkillTags ?? []
  const text = [job.title, job.companyName, job.jobRole, job.requiredSkills, job.region, job.careerLevel].filter(Boolean).join(' ')
  const backendScore = job.recommendationScore ? Math.min(98, 55 + job.recommendationScore) : 0

  return {
    ...baseJob,
    id: `internal-${job.jobId}`,
    source: 'internal',
    title: job.title,
    companyName: job.companyName,
    regionLabel: job.region ?? region.label,
    careerLabel: job.careerLevel ?? '경력 무관',
    skills,
    url: job.sourceUrl,
    deadline: job.deadline,
    createdAt: job.createdAt,
    matchScore: Math.max(
      backendScore,
      calculateMatchScore(text, [...skills, ...matchedSkills], role, region, career, 'internal'),
    ),
    matchedReasons: matchedSkills.length > 0
      ? matchedSkills.slice(0, 3).map((skill) => `${skill} 프로젝트 활동 검증`)
      : createReasons(skills, role, 'internal'),
    missingSkills: createMissingSkills([...skills, ...matchedSkills], role),
  }
}

export function mapJobkoreaPosting(
  posting: JobkoreaPosting,
  index: number,
  role: RoleOption,
  region: RegionOption,
  career: CareerOption,
): MatchingJob {
  const skills = (posting.keywords ?? []).filter(Boolean).map(String)
  const title = posting.title?.trim() || '잡코리아 채용공고'
  const companyName = posting.companyName?.trim() || '기업명 비공개'
  const regionKorean = resolveAreaCode(posting.areaCode) ?? region.label
  const careerKorean = resolveCareerCode(posting.careerCode)
  const text = [title, companyName, regionKorean, careerKorean, ...skills].filter(Boolean).join(' ')

  return {
    id: `jobkorea-${posting.externalId ?? index}`,
    source: 'jobkorea',
    title,
    companyName,
    regionLabel: regionKorean,
    careerLabel: careerKorean,
    skills: skills.length > 0 ? skills : role.skills.slice(0, 3),
    url: posting.jobkoreaUrl,
    deadline: posting.deadline,
    createdAt: posting.postedDate,
    matchScore: calculateMatchScore(text, skills, role, region, career, 'jobkorea'),
    matchedReasons: createReasons(skills, role, 'jobkorea'),
    missingSkills: createMissingSkills(skills, role),
  }
}

export function filterDbJobs(
  jobs: ApiJob[],
  role: RoleOption,
  region: RegionOption,
  career: CareerOption,
) {
  return jobs.filter((job) => {
    const text = [job.title, job.companyName, job.jobRole, job.requiredSkills, job.region, job.careerLevel]
      .filter(Boolean)
      .join(' ')

    if (role.value !== 'all' && !includesAny(text, [role.keyword, ...role.skills])) {
      return false
    }

    if (region.value !== 'all' && !includesAny(text, region.aliases)) {
      return false
    }

    if (career.value !== 'all' && !includesAny(text, career.aliases)) {
      return false
    }

    return true
  })
}

export function sortJobs(jobs: MatchingJob[]) {
  return [...jobs].sort((a, b) => {
    if (b.matchScore !== a.matchScore) {
      return b.matchScore - a.matchScore
    }

    return (b.createdAt ?? '').localeCompare(a.createdAt ?? '')
  })
}

// missingSkills 1~3개인 공고를 성장 공고 후보로 추출 (score 내림차순)
export function extractStretchJobs(candidates: MatchingJob[], count = 3): MatchingJob[] {
  const sorted = sortJobs(candidates)
  // missingSkills 있는 공고 우선, 없으면 점수 하위 공고로 fallback
  const withMissing = sorted.filter((j) => j.missingSkills.length >= 1 && j.missingSkills.length <= 3)
  const result = withMissing.length >= count
    ? withMissing.slice(0, count)
    : sorted.slice(-count)   // 점수 낮은 순 하위 3개
  return result.map((j) => ({ ...j, isStretch: true }))
}

// 채용 분석 결과를 탭 세션 동안 보존하기 위한 스냅샷 (페이지 이동 후 복귀 시 복원)
export const JOB_MATCHING_SNAPSHOT_KEY = 'devpath:job-matching:v1'

export type JobMatchingSnapshot = {
  userId: number | null
  roleFilter: RoleFilter
  regionFilter: RegionFilter
  careerFilter: CareerFilter
  highMatchOnly: boolean
  jobs: MatchingJob[]
  stretchJobs: MatchingJob[]
  scanned: boolean
  geminiMode: boolean
  sourceWarnings: string[]
  jobkoreaAttribution: JobkoreaResult['attribution']
  pageSize: number
}

export function loadJobMatchingSnapshot(userId: number | null): JobMatchingSnapshot | null {
  try {
    const raw = sessionStorage.getItem(JOB_MATCHING_SNAPSHOT_KEY)
    if (!raw) return null

    const snapshot = JSON.parse(raw) as JobMatchingSnapshot

    // 다른 계정으로 로그인한 경우 stale 결과는 폐기
    if (snapshot.userId !== userId) {
      sessionStorage.removeItem(JOB_MATCHING_SNAPSHOT_KEY)
      return null
    }

    return snapshot
  } catch {
    return null
  }
}

export function saveJobMatchingSnapshot(snapshot: JobMatchingSnapshot) {
  try {
    sessionStorage.setItem(JOB_MATCHING_SNAPSHOT_KEY, JSON.stringify(snapshot))
  } catch {
    // quota 등 저장 실패는 무시 (캐시는 부가 기능)
  }
}

export function clearJobMatchingSnapshot() {
  try {
    sessionStorage.removeItem(JOB_MATCHING_SNAPSHOT_KEY)
  } catch {
    // 무시
  }
}

export type SkillSuggestionResult = {
  mode: 'ADD' | 'CREATED'
  changeId?: number | null
  targetCustomRoadmapId: number
  roadmapTitle: string
  anchorNodeTitle?: string | null
  newNodeTitle?: string | null
  branchType?: string | null
  redirectUrl: string
}
