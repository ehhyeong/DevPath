import { useEffect, useMemo, useState } from 'react'
import AuthModal, { type AuthView } from './components/AuthModal'
import SiteHeader from './components/SiteHeader'
import { authApi, userApi } from './lib/api'
import { clearStoredAuthSession, getPostLoginRedirect, readStoredAuthSession } from './lib/auth-session'
import { showAuthToast } from './lib/auth-toast'
import { useInternalPageScroll } from './lib/useInternalPageScroll'
import { projectApiRequest } from './project-api'

type ApiJob = {
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

type JobkoreaPosting = {
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

type JobkoreaResult = {
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

type ActivityProfile = {
  projectCount: number
  completedTaskCount: number
  proofCardCount: number
  averageProofCardScore: number
  skillSignals: string[]
}

type RecommendedJob = ApiJob & {
  sourceUrl?: string | null
  recommendationScore?: number | null
  matchedSkillTags?: string[] | null
  reason?: string | null
}

type UserProfile = {
  name?: string | null
  nickname?: string | null
  profileImage?: string | null
  jobTitle?: string | null
  position?: string | null
}

type RoleFilter =
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
type RegionFilter =
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
type CareerFilter =
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

type RoleOption = {
  value: RoleFilter
  label: string
  keyword: string
  jobCode?: string
  skills: string[]
}

type RegionOption = {
  value: RegionFilter
  label: string
  areaCode?: string
  aliases: string[]
}

type CareerOption = {
  value: CareerFilter
  label: string
  aliases: string[]
}

type MatchingJob = {
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
}

const roleOptions: RoleOption[] = [
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
  { value: 'fullstack', label: '풀스택 개발자', keyword: '풀스택 React Spring Node', skills: ['React', 'Spring Boot', 'Node.js', 'SQL', 'Docker'] },
  { value: 'mobile', label: '모바일 앱 전체', keyword: '모바일 앱 개발자 iOS Android React Native', skills: ['React Native', 'Flutter', 'Swift', 'Kotlin'] },
  { value: 'android', label: 'Android 개발자', keyword: 'Android Kotlin 모바일', skills: ['Kotlin', 'Android', 'Jetpack', 'Compose'] },
  { value: 'ios', label: 'iOS 개발자', keyword: 'iOS Swift 모바일', skills: ['Swift', 'iOS', 'UIKit', 'SwiftUI'] },
  { value: 'devops', label: 'DevOps/SRE', keyword: 'DevOps SRE Kubernetes AWS', jobCode: '1000244', skills: ['Linux', 'Docker', 'Kubernetes', 'AWS', 'CI/CD'] },
  { value: 'cloud', label: '클라우드/인프라', keyword: 'Cloud AWS Azure GCP 인프라', jobCode: '1000244', skills: ['AWS', 'Terraform', 'Kubernetes', 'Nginx', 'Monitoring'] },
  { value: 'security', label: '보안 엔지니어', keyword: '보안 엔지니어 Security AppSec', skills: ['Security', 'OAuth2', 'JWT', 'OWASP', 'Monitoring'] },
  { value: 'qa', label: 'QA/테스트 자동화', keyword: 'QA 테스트 자동화 Playwright Cypress', skills: ['QA', 'Playwright', 'Cypress', 'JUnit', 'Test Automation'] },
  { value: 'data', label: '데이터 엔지니어', keyword: '데이터 엔지니어 Python SQL', jobCode: '1000236', skills: ['Python', 'SQL', 'ETL', 'Spark', 'Kafka'] },
  { value: 'data-analytics', label: '데이터 분석가', keyword: '데이터 분석 SQL BI Python', jobCode: '1000236', skills: ['SQL', 'Python', 'Tableau', 'Amplitude', 'Statistics'] },
  { value: 'ai', label: 'AI/머신러닝', keyword: 'AI 머신러닝 Python', jobCode: '1000242', skills: ['Python', 'TensorFlow', 'PyTorch', 'LLM', 'MLOps'] },
  { value: 'mlops', label: 'MLOps/AI 플랫폼', keyword: 'MLOps AI Platform Kubernetes', jobCode: '1000242', skills: ['MLOps', 'Python', 'Docker', 'Kubernetes', 'MLflow'] },
  { value: 'pm', label: '서비스 기획/PM', keyword: '서비스 기획 PM PO 애자일', skills: ['Product', 'Agile', 'Roadmap', 'Analytics', 'Figma'] },
  { value: 'uiux', label: 'UI/UX 디자이너', keyword: 'UI UX Product Design Figma', skills: ['Figma', 'UX', 'UI', 'Prototype', 'Design System'] },
]

const regionOptions: RegionOption[] = [
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

const careerOptions: CareerOption[] = [
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

function optionOf<T extends { value: string }>(items: T[], value: T['value']): T {
  return items.find((item) => item.value === value) ?? items[0]
}

function splitSkills(value?: string | null) {
  return (value ?? '')
    .split(/[,/|·\s]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, '')
}

function includesAny(target: string, values: string[]) {
  const normalizedTarget = normalize(target)

  return values.some((value) => normalizedTarget.includes(normalize(value)))
}

function toDisplayDate(value?: string | null) {
  if (!value) {
    return '상시채용'
  }

  return value.replaceAll('-', '.')
}

function initials(companyName: string) {
  const compact = companyName.replace(/[^\w가-힣]/g, '')

  if (!compact) {
    return 'JD'
  }

  return compact.slice(0, 2).toUpperCase()
}

function buildQuery(params: Record<string, string | number | boolean | null | undefined>) {
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

function calculateMatchScore(
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

function createReasons(skills: string[], role: RoleOption, source: 'internal' | 'jobkorea') {
  const matchedSkills = role.skills.filter((skill) => skills.some((item) => normalize(item).includes(normalize(skill))))
  const reasons = matchedSkills.slice(0, 2).map((skill) => `${skill} 역량 매칭`)

  if (source === 'internal') {
    reasons.push('DevPath 등록 공고')
  } else {
    reasons.push('잡코리아 실시간 공고')
  }

  return reasons.slice(0, 3)
}

function createMissingSkills(skills: string[], role: RoleOption) {
  return role.skills
    .filter((skill) => !skills.some((item) => normalize(item).includes(normalize(skill))))
    .slice(0, 2)
}

function mapDbJob(
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

function mapRecommendedJob(
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

function mapJobkoreaPosting(
  posting: JobkoreaPosting,
  index: number,
  role: RoleOption,
  region: RegionOption,
  career: CareerOption,
): MatchingJob {
  const skills = (posting.keywords ?? []).filter(Boolean).map(String)
  const title = posting.title?.trim() || '잡코리아 채용공고'
  const companyName = posting.companyName?.trim() || '기업명 비공개'
  const text = [title, companyName, posting.areaCode, posting.careerCode, ...skills].filter(Boolean).join(' ')

  return {
    id: `jobkorea-${posting.externalId ?? index}`,
    source: 'jobkorea',
    title,
    companyName,
    regionLabel: posting.areaCode ?? region.label,
    careerLabel: posting.careerCode ?? '상세 조건 확인',
    skills: skills.length > 0 ? skills : role.skills.slice(0, 3),
    url: posting.jobkoreaUrl,
    deadline: posting.deadline,
    createdAt: posting.postedDate,
    matchScore: calculateMatchScore(text, skills, role, region, career, 'jobkorea'),
    matchedReasons: createReasons(skills, role, 'jobkorea'),
    missingSkills: createMissingSkills(skills, role),
  }
}

function filterDbJobs(
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

function sortJobs(jobs: MatchingJob[]) {
  return [...jobs].sort((a, b) => {
    if (b.matchScore !== a.matchScore) {
      return b.matchScore - a.matchScore
    }

    return (b.createdAt ?? '').localeCompare(a.createdAt ?? '')
  })
}

export default function JobMatchingApp() {
  useInternalPageScroll()

  const [session, setSession] = useState(() => readStoredAuthSession())
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [authView, setAuthView] = useState<AuthView | null>(null)
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('backend')
  const [regionFilter, setRegionFilter] = useState<RegionFilter>('seoul')
  const [careerFilter, setCareerFilter] = useState<CareerFilter>('junior')
  const [highMatchOnly, setHighMatchOnly] = useState(true)
  const [loading, setLoading] = useState(false)
  const [scanned, setScanned] = useState(false)
  const [jobs, setJobs] = useState<MatchingJob[]>([])
  const [sourceWarnings, setSourceWarnings] = useState<string[]>([])
  const [jobkoreaAttribution, setJobkoreaAttribution] = useState<JobkoreaResult['attribution']>(null)
  const [activityProfile, setActivityProfile] = useState<ActivityProfile | null>(null)
  const [pageSize, setPageSize] = useState(20)

  const role = useMemo(() => optionOf(roleOptions, roleFilter), [roleFilter])
  const visibleJobs = useMemo(
    () => jobs.filter((job) => !highMatchOnly || job.matchScore >= 70),
    [highMatchOnly, jobs],
  )
  const averageProofCardScore = activityProfile?.averageProofCardScore ?? 0
  const displayedSkills = scanned && activityProfile?.skillSignals.length
    ? activityProfile.skillSignals.slice(0, 8)
    : role.skills

  useEffect(() => {
    document.title = 'DevPath - AI 채용 매칭'
  }, [])

  useEffect(() => {
    if (!session) {
      setProfile(null)
      setActivityProfile(null)
      return
    }

    const controller = new AbortController()

    userApi
      .getMyProfile(controller.signal)
      .then((nextProfile) => {
        setProfile(nextProfile)
      })
      .catch(() => {
        setProfile(null)
      })

    return () => {
      controller.abort()
    }
  }, [session])

  async function handleLogout() {
    const currentSession = readStoredAuthSession()

    try {
      if (currentSession?.refreshToken) {
        await authApi.logout(currentSession.refreshToken)
      }
    } catch {
      // 서버 로그아웃 실패와 관계없이 브라우저 세션은 정리한다.
    } finally {
      clearStoredAuthSession()
      setSession(null)
      setProfile(null)
      setActivityProfile(null)
    }
  }

  function openAuthModal(message?: string) {
    if (message) {
      showAuthToast({ message, durationMs: 2200 })
    }

    setAuthView('login')
  }

  function handleAuthenticated() {
    const nextSession = readStoredAuthSession()

    if (nextSession?.role === 'ROLE_ADMIN' || nextSession?.role === 'ROLE_INSTRUCTOR') {
      window.location.replace(getPostLoginRedirect(nextSession.role))
      return
    }

    setSession(nextSession)
    setAuthView(null)
  }

  async function refreshLearningData() {
    if (!session) {
      openAuthModal('학습 데이터 최신화는 로그인 후 이용할 수 있습니다.')
      return
    }

    showAuthToast({ message: '학습 프로필을 최신 상태로 확인했습니다.', durationMs: 1800 })
  }

  async function scanJobs(size = pageSize) {
    if (!session) {
      openAuthModal('AI 맞춤 공고 스캔하기는 로그인 후 이용할 수 있습니다.')
      return
    }

    const selectedRole = optionOf(roleOptions, roleFilter)
    const selectedRegion = optionOf(regionOptions, regionFilter)
    const selectedCareer = optionOf(careerOptions, careerFilter)
    const warnings: string[] = []

    setLoading(true)
    setSourceWarnings([])

    try {
      const jobkoreaQuery = buildQuery({
        size,
        page: 1,
        order: 1,
        keyword: selectedRole.keyword,
        industryCode: '10031',
        jobCode: selectedRole.value === 'all' ? undefined : selectedRole.jobCode,
        areaCode: selectedRegion.areaCode,
        starter: selectedCareer.value === 'intern',
      })

      const [activityResult, dbResult, jobkoreaResult] = await Promise.allSettled([
        projectApiRequest<ActivityProfile>('/api/jobs/activity-profile/me'),
        projectApiRequest<RecommendedJob[]>('/api/jobs/recommendations/me'),
        projectApiRequest<JobkoreaResult>(`/api/jobs/jobkorea${jobkoreaQuery}`),
      ])

      const nextJobs: MatchingJob[] = []

      if (activityResult.status === 'fulfilled') {
        setActivityProfile(activityResult.value)
      } else {
        setActivityProfile(null)
        warnings.push('DevPath 프로젝트 활동 데이터를 불러오지 못했습니다.')
      }

      if (dbResult.status === 'fulfilled') {
        nextJobs.push(
          ...filterDbJobs(dbResult.value, selectedRole, selectedRegion, selectedCareer).map((job) =>
            mapRecommendedJob(job, selectedRole, selectedRegion, selectedCareer),
          ),
        )
      } else {
        warnings.push('DevPath DB 채용공고를 불러오지 못했습니다.')
      }

      if (jobkoreaResult.status === 'fulfilled') {
        setJobkoreaAttribution(jobkoreaResult.value.attribution ?? null)
        nextJobs.push(
          ...(jobkoreaResult.value.items ?? []).map((posting, index) =>
            mapJobkoreaPosting(posting, index, selectedRole, selectedRegion, selectedCareer),
          ),
        )
      } else {
        warnings.push('잡코리아 실시간 공고를 불러오지 못했습니다.')
      }

      const uniqueJobs = Array.from(new Map(sortJobs(nextJobs).map((job) => [job.id, job])).values())
      setJobs(uniqueJobs)
      setScanned(true)
      setSourceWarnings(warnings)
    } finally {
      setLoading(false)
    }
  }

  function handleMissingSkill(skill: string) {
    if (!session) {
      openAuthModal('역량 로드맵 추가는 로그인 후 이용할 수 있습니다.')
      return
    }

    showAuthToast({ message: `[${skill}] 역량을 로드맵에 추가할 수 있도록 표시했습니다.`, durationMs: 2200 })
  }

  function openJob(job: MatchingJob) {
    if (job.url) {
      window.open(job.url, '_blank', 'noopener,noreferrer')
    }
  }

  function loadMore() {
    const nextSize = pageSize + 20
    setPageSize(nextSize)
    void scanJobs(nextSize)
  }

  const displayName = profile?.nickname ?? profile?.name ?? session?.name ?? '-'
  const profileImage = profile?.profileImage
  const profileStatusText = session ? '실시간 데이터' : '로그인 필요'
  const activityProjectLabel = activityProfile ? `${activityProfile.projectCount}개` : '스캔 전'
  const proofCardLabel = activityProfile ? `${activityProfile.proofCardCount}개` : '스캔 전'
  const proofScoreLabel = activityProfile ? `${averageProofCardScore}점` : '-'

  return (
    <>
      <SiteHeader
        session={session}
        profileImage={profileImage}
        onLogout={handleLogout}
        onLoginClick={() => openAuthModal()}
        activeNavHref="/job-matching"
      />

      <main className="app-main min-h-screen bg-gray-50 text-gray-800">
        <div className="job-matching-page max-w-7xl mx-auto px-6 py-10">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">학습 기반 자동 매칭</h1>
            <p className="text-sm text-gray-500 mt-1">DevPath에서 증명한 스킬과 채용공고 데이터를 분석하여 가장 적합한 기업을 찾아줍니다.</p>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            <aside className="w-full lg:w-1/3 space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 relative overflow-hidden">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-bold text-lg">내 분석 프로필</h2>
                  <span className="text-[10px] bg-green-100 text-primary px-2 py-1 rounded font-bold">{profileStatusText}</span>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-100">
                  <div className="text-xs text-gray-500 mb-2">분석 기준 데이터</div>
                  <ul className="space-y-2">
                    <li className="flex justify-between text-sm">
                      <span className="text-gray-700 font-medium"><i className="fas fa-id-card text-primary mr-2"></i>Proof Card</span>
                      <span className="font-bold truncate max-w-[160px]">{proofCardLabel}</span>
                    </li>
                    <li className="flex justify-between text-sm">
                      <span className="text-gray-700 font-medium"><i className="fas fa-folder-open text-blue-500 mr-2"></i>Project</span>
                      <span className="font-bold">{activityProjectLabel}</span>
                    </li>
                    <li className="flex justify-between text-sm">
                      <span className="text-gray-700 font-medium"><i className="fas fa-chart-line text-gray-400 mr-2"></i>평균 점수</span>
                      <span className="font-bold text-primary">{proofScoreLabel}</span>
                    </li>
                  </ul>
                </div>

                <div className="mb-6">
                  <div className="text-xs text-gray-500 mb-2">추출된 핵심 키워드</div>
                  <div className="flex flex-wrap gap-2">
                    {displayedSkills.map((skill, index) => (
                      <span
                        key={skill}
                        className={index < 3
                          ? 'px-2 py-1 bg-blue-50 text-blue-600 border border-blue-100 rounded text-xs font-bold'
                          : 'px-2 py-1 bg-gray-100 text-gray-500 border border-gray-200 rounded text-xs'}
                      >
                        {skill}{index === 0 ? ' (우수)' : ''}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={refreshLearningData}
                  className="w-full bg-gray-900 hover:bg-gray-800 text-white py-3 rounded-lg font-bold text-sm transition flex justify-center items-center gap-2 shadow-md"
                >
                  <i className="fas fa-sync-alt"></i> 학습 데이터 최신화
                </button>
                <p className="text-[10px] text-gray-400 text-center mt-2">마지막 업데이트: {session ? '방금 전' : '로그인 후 동기화'}</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="font-bold text-sm mb-4">매칭 필터</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">희망 직무</label>
                    <select
                      value={roleFilter}
                      onChange={(event) => setRoleFilter(event.target.value as RoleFilter)}
                      className="w-full border border-gray-300 rounded text-sm bg-white focus:outline-none focus:border-primary"
                    >
                      {roleOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">희망 지역</label>
                    <select
                      value={regionFilter}
                      onChange={(event) => setRegionFilter(event.target.value as RegionFilter)}
                      className="w-full border border-gray-300 rounded text-sm bg-white focus:outline-none focus:border-primary"
                    >
                      {regionOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">경력 구분</label>
                    <select
                      value={careerFilter}
                      onChange={(event) => setCareerFilter(event.target.value as CareerFilter)}
                      className="w-full border border-gray-300 rounded text-sm bg-white focus:outline-none focus:border-primary"
                    >
                      {careerOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="match-high"
                      checked={highMatchOnly}
                      onChange={(event) => setHighMatchOnly(event.target.checked)}
                      className="accent-primary w-4 h-4"
                    />
                    <label htmlFor="match-high" className="text-sm text-gray-700 font-medium cursor-pointer">매칭률 70% 이상만 보기</label>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => scanJobs()}
                  className="w-full mt-6 bg-primary hover:bg-green-600 text-white py-3 rounded-lg font-bold text-sm transition shadow-lg shadow-green-500/20 flex justify-center items-center gap-2"
                >
                  <i className="fas fa-magic"></i> AI 맞춤 공고 스캔하기
                </button>
              </div>
            </aside>

            <section className="flex-1" id="main-content-area">
              {!scanned ? (
                <div id="empty-state" className="h-full min-h-[400px] flex flex-col items-center justify-center bg-white border border-dashed border-gray-300 rounded-xl p-10 text-center">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                    <i className="fas fa-search text-gray-300 text-2xl"></i>
                  </div>
                  <h3 className="text-base font-bold text-gray-500">맞춤 공고가 아직 분석되지 않았습니다</h3>
                  <p className="text-sm text-gray-400 mt-2 leading-relaxed">
                    좌측의 매칭 필터를 설정한 후 <br /><strong className="text-primary">AI 맞춤 공고 스캔하기</strong> 버튼을 눌러주세요.
                  </p>
                </div>
              ) : (
                <div id="job-results" className="space-y-4">
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 flex justify-between items-center">
                    <div>
                      <span className="text-sm text-blue-800">{displayName}님의 조건과 채용 데이터를 분석하여</span>
                      <div className="font-bold text-lg text-gray-900">총 <span className="text-blue-600">{visibleJobs.length}건</span>의 핏한 공고를 찾았습니다.</div>
                    </div>
                    <div className="text-right hidden md:block">
                      <span className="text-xs text-gray-500">평균 점수</span>
                      <div className="text-2xl font-bold text-primary">{proofScoreLabel}</div>
                    </div>
                  </div>

                  {sourceWarnings.length > 0 ? (
                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-amber-800">
                      {sourceWarnings.map((warning) => (
                        <p key={warning}><i className="fas fa-triangle-exclamation mr-2"></i>{warning}</p>
                      ))}
                    </div>
                  ) : null}

                  {visibleJobs.length === 0 ? (
                    <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
                      <i className="fas fa-briefcase text-3xl text-gray-300 mb-3"></i>
                      <h3 className="text-base font-bold text-gray-600">조건에 맞는 채용공고가 없습니다</h3>
                      <p className="text-sm text-gray-400 mt-2">필터를 넓히거나 매칭률 조건을 해제해 주세요.</p>
                    </div>
                  ) : (
                    visibleJobs.map((job, index) => (
                      <article
                        key={job.id}
                        className={index === 0
                          ? 'bg-white border-2 border-primary/20 rounded-xl p-6 hover:shadow-lg transition cursor-pointer relative group'
                          : 'bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition cursor-pointer relative group'}
                        onClick={() => openJob(job)}
                      >
                        <div className={index === 0
                          ? 'absolute top-4 right-4 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm'
                          : 'absolute top-4 right-4 bg-gray-100 text-gray-600 text-xs font-bold px-3 py-1 rounded-full'}
                        >
                          {job.matchScore}% 일치{index === 0 ? ' (강력 추천)' : ''}
                        </div>

                        <div className="flex items-start gap-4 mb-4 pr-24">
                          <div className="w-12 h-12 bg-gray-100 rounded border border-gray-200 flex items-center justify-center font-bold text-gray-400 shrink-0">{initials(job.companyName)}</div>
                          <div className="min-w-0">
                            <h3 className="font-bold text-lg text-gray-900 group-hover:text-primary transition">{job.title}</h3>
                            <p className="text-sm text-gray-500 font-bold">{job.companyName} · {job.regionLabel}</p>
                          </div>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-3 mb-4">
                          <p className="text-xs text-gray-500 mb-2 font-bold">🎯 매칭 포인트 (Why?)</p>
                          <div className="space-y-2">
                            {job.matchedReasons.map((reason) => (
                              <div key={reason} className="job-matching-reason-row flex justify-between items-center text-xs">
                                <span className="min-w-0 text-gray-700"><i className="fas fa-check text-primary mr-1"></i> {reason}</span>
                                <span className="text-primary font-bold">검증 완료</span>
                              </div>
                            ))}
                            {job.missingSkills.map((skill) => (
                              <div
                                key={skill}
                                onClick={(event) => {
                                  event.stopPropagation()
                                  handleMissingSkill(skill)
                                }}
                                className="job-matching-missing-skill group/add flex justify-between items-center text-xs opacity-50 hover:opacity-100 cursor-pointer hover:bg-red-50 p-2 -mx-2 rounded-lg transition-all border border-transparent hover:border-red-100"
                              >
                                <span className="text-gray-500 group-hover/add:text-red-600 transition"><i className="fas fa-exclamation-circle mr-1"></i> {skill} 경험 부족</span>
                                <span className="font-bold text-red-400 group-hover/add:hidden">미충족</span>
                                <span className="font-bold text-red-600 hidden group-hover/add:inline-block">관련 로드맵 추가하기 <i className="fas fa-plus ml-1"></i></span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 text-[10px] text-gray-500">
                          <span className="border px-2 py-1 rounded">{job.source === 'jobkorea' ? '잡코리아' : 'DevPath DB'}</span>
                          <span className="border px-2 py-1 rounded">{job.careerLabel}</span>
                          <span className="border px-2 py-1 rounded">마감 {toDisplayDate(job.deadline)}</span>
                          {job.skills.slice(0, 4).map((skill) => (
                            <span key={skill} className="border px-2 py-1 rounded">{skill}</span>
                          ))}
                        </div>
                      </article>
                    ))
                  )}

                  {visibleJobs.length > 0 ? (
                    <button
                      type="button"
                      onClick={loadMore}
                      className="w-full mt-6 py-3 bg-white border border-gray-300 rounded-lg text-gray-600 font-bold text-sm hover:bg-gray-50"
                    >
                      결과 더보기
                    </button>
                  ) : null}

                  {jobkoreaAttribution ? (
                    <p className="text-[11px] text-gray-400 leading-relaxed pt-2">
                      <a
                        href={jobkoreaAttribution.url ?? 'https://www.jobkorea.co.kr'}
                        target="_blank"
                        rel="noreferrer"
                        className="font-bold text-primary hover:underline"
                      >
                        {jobkoreaAttribution.label ?? '잡코리아 채용정보 바로가기'}
                      </a>
                      {' '}· {jobkoreaAttribution.notice ?? '상세 채용정보는 원문에서 확인해 주세요.'}
                    </p>
                  ) : null}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>

      <div className={`job-matching-loader ${loading ? 'active' : ''}`}>
        <div className="smooth-spinner"></div>
        <div className="text-center">
          <h2 className="text-white text-lg font-bold mb-2 drop-shadow-md tracking-wide">DevPath AI</h2>
          <p className="text-green-400 text-sm font-bold h-5 drop-shadow-md pulse-text">실시간 채용공고와 매칭 점수를 계산 중입니다...</p>
        </div>
        <div className="absolute bottom-8 left-8 text-[11px] text-green-400/40 font-mono space-y-1">
          <p>&gt; applying preference filters...</p>
          <p>&gt; calculating fit scores based on JD...</p>
        </div>
      </div>

      {authView ? (
        <AuthModal
          view={authView}
          onClose={() => setAuthView(null)}
          onViewChange={setAuthView}
          onAuthenticated={handleAuthenticated}
        />
      ) : null}
    </>
  )
}
