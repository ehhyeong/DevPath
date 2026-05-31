import { useEffect, useState } from 'react'
import AuthModal, { type AuthView } from './components/AuthModal'
import ProjectAside from './components/ProjectAside'
import ProjectHeader from './components/ProjectHeader'
import UserAvatar from './components/UserAvatar'
import { authApi } from './lib/api'
import { AUTH_SESSION_SYNC_EVENT, clearStoredAuthSession, getPostLoginRedirect, readStoredAuthSession } from './lib/auth-session'
import LoginRequiredView from './components/LoginRequiredView'
import { showAuthToast } from './lib/auth-toast'

type ApiEnvelope<T> = {
  success: boolean
  message?: string
  data: T
}

type UserProfileResponse = {
  name?: string | null
  nickname?: string | null
  profileImage?: string | null
  jobTitle?: string | null
  position?: string | null
  role?: string | null
}

type WorkspaceResponse = {
  workspaceId: number
  name: string
  description?: string | null
  type?: string | null
  status?: string | null
  memberCount?: number | null
  createdAt?: string | null
  nextEventTitle?: string | null
  nextEventStartAt?: string | null
  nextEventEndAt?: string | null
}

type WorkspaceHubProjectResponse = {
  projectId: number
  type?: string | null
  status?: string | null
  dashboardUrl?: string | null
  title: string
  description?: string | null
  progressPercent?: number | null
  footerDateLabel?: string | null
  memberAvatarSeeds?: string[] | null
  memberAvatarUrls?: (string | null)[] | null
  extraMemberCount?: number | null
  footerKind?: string | null
  footerAvatarSeed?: string | null
  footerAvatarUrl?: string | null
  footerText?: string | null
  footerMetaText?: string | null
}

type ProjectRecommendationResponse = {
  projectId: number
  name: string
  description?: string | null
  projectType?: string | null
  recruitingStatus?: string | null
  sourceType?: string | null
  targetUrl?: string | null
  recommendationScore?: number | null
  matchedSkillTags?: string[] | null
  reason?: string | null
}

type ShowcaseSummaryResponse = {
  showcaseId: number
  title: string
  description?: string | null
  thumbnailUrl?: string | null
  likeCount?: number | null
  viewCount?: number | null
}

type JobActivityProfileResponse = {
  projectCount?: number | null
  completedTaskCount?: number | null
  proofCardCount?: number | null
  averageProofCardScore?: number | null
  skillSignals?: string[] | null
}

type LoungeShellSquad = {
  id: number
  name: string
  colorClass?: string | null
}

type LoungeShellResponse = {
  mySquads?: LoungeShellSquad[]
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? ''

function isFulfilled<T>(result: PromiseSettledResult<T>): result is PromiseFulfilledResult<T> {
  return result.status === 'fulfilled'
}

async function apiGet<T>(path: string, signal: AbortSignal, auth = false): Promise<T> {
  const headers = new Headers({ Accept: 'application/json' })

  if (auth) {
    const session = readStoredAuthSession()

    if (!session?.accessToken) {
      throw new Error('Authentication is required')
    }

    headers.set('Authorization', `${session.tokenType} ${session.accessToken}`)
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { headers, signal })
  const payload = await response.json().catch(() => null) as ApiEnvelope<T> | null

  if (!response.ok || !payload?.success) {
    throw new Error(payload?.message ?? `Request failed with status ${response.status}`)
  }

  return payload.data
}

function goTo(path: string) {
  window.location.href = path
}

function getRecommendationTarget(project: ProjectRecommendationResponse) {
  const explicitTarget = project.targetUrl?.trim()

  if (explicitTarget) {
    return explicitTarget
  }

  if (project.sourceType === 'LOUNGE_SQUAD') {
    return `/community-lounge?squadId=${project.projectId}`
  }

  return '/community-lounge'
}

function isLoungeSquadRecommendation(project: ProjectRecommendationResponse) {
  return project.sourceType === 'LOUNGE_SQUAD' || project.targetUrl?.includes('squadId=') === true
}

function getWorkspaceType(workspace: WorkspaceResponse) {
  return workspace.type?.trim().toUpperCase() ?? ''
}

function isCollaborativeWorkspace(workspace: WorkspaceResponse) {
  const type = getWorkspaceType(workspace)

  return type === 'SQUAD' || type === 'MENTORING'
}

function parseDateTime(value?: string | null) {
  if (!value) {
    return null
  }

  const date = new Date(value)

  return Number.isNaN(date.getTime()) ? null : date
}

function isSameLocalDate(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  )
}

function isTomorrow(left: Date, right: Date) {
  const tomorrow = new Date(right)
  tomorrow.setDate(right.getDate() + 1)

  return isSameLocalDate(left, tomorrow)
}

function formatEventTime(value?: string | null) {
  const date = parseDateTime(value)

  if (!date) {
    return '일정 확인'
  }

  const now = new Date()
  const time = date.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' })

  if (isSameLocalDate(date, now)) {
    return `오늘 ${time}`
  }

  if (isTomorrow(date, now)) {
    return `내일 ${time}`
  }

  return `${date.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })} ${time}`
}

function compareUrgentWorkspaces(left: WorkspaceResponse, right: WorkspaceResponse) {
  const now = new Date()
  const leftEvent = parseDateTime(left.nextEventStartAt)
  const rightEvent = parseDateTime(right.nextEventStartAt)
  const leftToday = leftEvent ? isSameLocalDate(leftEvent, now) : false
  const rightToday = rightEvent ? isSameLocalDate(rightEvent, now) : false

  if (leftToday !== rightToday) {
    return leftToday ? -1 : 1
  }

  if (leftEvent && rightEvent) {
    return leftEvent.getTime() - rightEvent.getTime()
  }

  if (leftEvent) {
    return -1
  }

  if (rightEvent) {
    return 1
  }

  return (parseDateTime(right.createdAt)?.getTime() ?? 0) - (parseDateTime(left.createdAt)?.getTime() ?? 0)
}

function getDefaultCollaborativeEventTitle(workspace?: WorkspaceResponse | null) {
  if (!workspace) {
    return '스쿼드 일정 확인'
  }

  return getWorkspaceType(workspace) === 'MENTORING' ? '멘토링 일정 확인' : '스쿼드 일정 확인'
}

function getHubProjectType(project: WorkspaceHubProjectResponse) {
  return project.type?.trim().toLowerCase() ?? 'squad'
}

function isMentoringHubProject(project: WorkspaceHubProjectResponse) {
  return getHubProjectType(project) === 'mentoring'
}

function getHubProjectTypeLabel(project: WorkspaceHubProjectResponse) {
  const type = getHubProjectType(project)

  if (type === 'mentoring') {
    return '멘토링 프로젝트'
  }

  if (type === 'solo') {
    return '개인 프로젝트'
  }

  return '스쿼드 프로젝트'
}

function getHubProjectAccentClass(project: WorkspaceHubProjectResponse) {
  const type = getHubProjectType(project)

  if (type === 'mentoring') {
    return 'bg-mentor'
  }

  if (type === 'solo') {
    return 'bg-brand'
  }

  return 'bg-blue-500'
}

function getHubProjectProgressClass(project: WorkspaceHubProjectResponse) {
  const type = getHubProjectType(project)

  if (type === 'mentoring') {
    return 'bg-mentor'
  }

  if (type === 'solo') {
    return 'bg-brand'
  }

  return 'bg-blue-500'
}

export default function LoungeDashboardApp() {
  const [session, setSession] = useState(() => readStoredAuthSession())
  const [authView, setAuthView] = useState<AuthView | null>(null)
  const [dataReloadKey, setDataReloadKey] = useState(0)
  const [profile, setProfile] = useState<UserProfileResponse | null>(null)
  const [workspaces, setWorkspaces] = useState<WorkspaceResponse[]>([])
  const [hubProjects, setHubProjects] = useState<WorkspaceHubProjectResponse[]>([])
  const [projectRecommendations, setProjectRecommendations] = useState<ProjectRecommendationResponse[]>([])
  const [showcases, setShowcases] = useState<ShowcaseSummaryResponse[]>([])
  const [jobActivityProfile, setJobActivityProfile] = useState<JobActivityProfileResponse | null>(null)
  const [shell, setShell] = useState<LoungeShellResponse | null>(null)

  useEffect(() => {
    document.title = 'DevPath - 프로젝트 라운지'
  }, [])

  useEffect(() => {
    const previousHtmlOverflow = document.documentElement.style.overflow
    const previousBodyOverflow = document.body.style.overflow

    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow
      document.body.style.overflow = previousBodyOverflow
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()

    async function loadLoungeData() {
      const hasSession = Boolean(readStoredAuthSession()?.accessToken)
      const results = await Promise.allSettled([
        apiGet<LoungeShellResponse>('/api/lounge/shell', controller.signal, hasSession),
        apiGet<UserProfileResponse>('/api/users/me/profile', controller.signal, true),
        apiGet<WorkspaceResponse[]>('/api/workspaces/me', controller.signal, true),
        apiGet<WorkspaceHubProjectResponse[]>('/api/workspaces/hub/projects', controller.signal, true),
        hasSession
          ? apiGet<ProjectRecommendationResponse[]>('/api/projects/recommendations/me', controller.signal, true)
          : Promise.resolve([]),
        apiGet<ShowcaseSummaryResponse[]>('/api/showcases?sort=POPULAR', controller.signal),
        hasSession
          ? apiGet<JobActivityProfileResponse>('/api/jobs/activity-profile/me', controller.signal, true)
          : Promise.resolve(null),
      ])

      if (cancelled) {
        return
      }

      const [
        shellResult,
        profileResult,
        workspaceResult,
        hubProjectResult,
        projectRecommendationResult,
        showcaseResult,
        jobActivityProfileResult,
      ] = results

      if (isFulfilled(shellResult)) {
        setShell(shellResult.value)
      }

      if (isFulfilled(profileResult)) {
        setProfile(profileResult.value)
      }

      if (isFulfilled(workspaceResult) && Array.isArray(workspaceResult.value)) {
        setWorkspaces(workspaceResult.value)
      }

      if (isFulfilled(hubProjectResult) && Array.isArray(hubProjectResult.value)) {
        setHubProjects(hubProjectResult.value)
      }

      if (isFulfilled(projectRecommendationResult) && Array.isArray(projectRecommendationResult.value)) {
        setProjectRecommendations(projectRecommendationResult.value)
      }

      if (isFulfilled(showcaseResult) && Array.isArray(showcaseResult.value)) {
        setShowcases(showcaseResult.value)
      }

      if (isFulfilled(jobActivityProfileResult)) {
        setJobActivityProfile(jobActivityProfileResult.value)
      }
    }

    void loadLoungeData()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [dataReloadKey])

  useEffect(() => {
    const syncSession = () => setSession(readStoredAuthSession())
    window.addEventListener('storage', syncSession)
    window.addEventListener(AUTH_SESSION_SYNC_EVENT, syncSession)
    return () => {
      window.removeEventListener('storage', syncSession)
      window.removeEventListener(AUTH_SESSION_SYNC_EVENT, syncSession)
    }
  }, [])

  async function handleLogout() {
    const currentSession = readStoredAuthSession()

    try {
      if (currentSession?.refreshToken) {
        await authApi.logout(currentSession.refreshToken)
      }
    } catch {
      // 서버 로그아웃 실패와 무관하게 브라우저 세션은 정리한다.
    } finally {
      clearStoredAuthSession()
      setSession(null)
      setProfile(null)
      setShell(null)
      setWorkspaces([])
      setHubProjects([])
      setProjectRecommendations([])
      setJobActivityProfile(null)
    }
  }

  function openAuthModal(message?: string) {
    if (message) {
      showAuthToast({
        message,
        durationMs: 2200,
      })
    }

    setAuthView('login')
  }

  function closeAuthModal() {
    setAuthView(null)
  }

  function handleAuthenticated() {
    const nextSession = readStoredAuthSession()

    if (nextSession?.role === 'ROLE_ADMIN') {
      window.location.replace(getPostLoginRedirect(nextSession.role))
      return
    }

    setSession(nextSession)
    setAuthView(null)
    setDataReloadKey((current) => current + 1)
  }

  const isAuthenticated = Boolean(session?.accessToken)
  const userName = isAuthenticated ? profile?.name?.trim() || profile?.nickname?.trim() || session?.name || '사용자' : null
  const profileImage = profile?.profileImage ?? null
  const collaborativeWorkspaces = isAuthenticated
    ? workspaces.filter(isCollaborativeWorkspace).sort(compareUrgentWorkspaces)
    : []
  const primaryWorkspace = collaborativeWorkspaces[0] ?? null
  const hasCollaborativeBanner = Boolean(primaryWorkspace)
  const primaryWorkspaceEventTitle = primaryWorkspace?.nextEventTitle?.trim() || getDefaultCollaborativeEventTitle(primaryWorkspace)
  const primaryWorkspaceEventDate = parseDateTime(primaryWorkspace?.nextEventStartAt)
  const primaryWorkspaceEventTime = formatEventTime(primaryWorkspace?.nextEventStartAt)
  const visibleWorkspaces = isAuthenticated ? workspaces.slice(0, 2) : []
  const visibleHubProjects = isAuthenticated ? hubProjects.slice(0, 2) : []
  const hasVisibleHubProjects = visibleHubProjects.length > 0
  const fallbackAsideSquads = visibleWorkspaces.map((workspace, index) => ({
    id: workspace.workspaceId,
    name: workspace.name,
    colorClass: workspace.type === 'MENTORING' || index === 1 ? 'bg-purple-500' : 'bg-blue-500',
  }))
  const projectAsideSquads = isAuthenticated ? shell?.mySquads ?? fallbackAsideSquads : []
  const recommendedProject = isAuthenticated
    ? projectRecommendations.find(isLoungeSquadRecommendation) ?? projectRecommendations[0] ?? null
    : null
  const hotShowcase = showcases[0] ?? null
  const collaborativeWorkspaceCount = collaborativeWorkspaces.length
  const careerProfileReady = Boolean(
    isAuthenticated
      && jobActivityProfile
      && ((jobActivityProfile.projectCount ?? 0) > 0
        || (jobActivityProfile.proofCardCount ?? 0) > 0
        || (jobActivityProfile.skillSignals?.length ?? 0) > 0),
  )
  const liveFeedItems = [
    {
      id: 'join',
      iconClassName: 'w-8 h-8 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center text-xs shrink-0 border border-blue-100',
      iconName: 'fas fa-handshake',
      body: <><span className="font-bold">이서버</span>님이 <span className="font-bold text-gray-900">{primaryWorkspace?.name}</span> 백엔드로 합류했습니다!</>,
      tooltip: `이서버님이 ${primaryWorkspace?.name ?? ''} 백엔드로 합류했습니다!`,
      time: '방금 전',
    },
    {
      id: 'closed',
      iconClassName: 'w-8 h-8 rounded-full bg-green-50 text-brand flex items-center justify-center text-xs shrink-0 border border-green-100',
      iconName: 'fas fa-flag-checkered',
      body: <><span className="font-bold text-gray-900">Next.js 스터디</span> 모집이 성공적으로 마감되었습니다.</>,
      tooltip: 'Next.js 스터디 모집이 성공적으로 마감되었습니다.',
      time: '12분 전',
    },
    {
      id: 'mentoring',
      iconClassName: 'w-8 h-8 rounded-full bg-purple-50 text-mentor flex items-center justify-center text-xs shrink-0 border border-purple-100',
      iconName: 'fas fa-chalkboard-teacher',
      body: <><span className="font-bold text-gray-900">시니어 데브</span> 멘토님이 [Spring MSA 아키텍처 리뷰] 멘토링을 열었습니다.</>,
      tooltip: '시니어 데브 멘토님이 [Spring MSA 아키텍처 리뷰] 멘토링을 열었습니다.',
      time: '25분 전',
    },
    {
      id: 'community',
      iconClassName: 'w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-xs shrink-0 border border-gray-200',
      iconName: 'fas fa-bullhorn',
      body: <><span className="font-bold text-gray-900">커뮤니티:</span> 신입 백엔드 포트폴리오 리뷰 부탁드립니다. 글이 올라왔습니다.</>,
      tooltip: '커뮤니티: 신입 백엔드 포트폴리오 리뷰 부탁드립니다. 글이 올라왔습니다.',
      time: '1시간 전',
      muted: true,
    },
  ]
  const shouldScrollLiveFeed = liveFeedItems.length > 4

  if (!session) return <LoginRequiredView />

  return (
    <div className="flex h-screen overflow-hidden text-gray-800">
      <ProjectAside activeKey="dashboard" mySquads={projectAsideSquads} />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <ProjectHeader session={session} profileImage={profileImage} onLoginClick={() => openAuthModal()} onLogout={handleLogout} />

        <main className="flex-1 overflow-y-auto bg-[#F8F9FA] p-4 md:p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto space-y-8">
            <div className="bg-gradient-to-r from-slate-800 to-gray-900 rounded-2xl p-6 lg:p-8 relative overflow-hidden shadow-lg fade-in">
              <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-brand opacity-20 rounded-full blur-[80px] transform translate-x-1/3 -translate-y-1/3 pointer-events-none"></div>
              <div className="absolute bottom-0 right-1/4 w-[200px] h-[200px] bg-blue-600 opacity-20 rounded-full blur-[60px] transform translate-y-1/2 pointer-events-none"></div>

              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="w-full md:w-3/5 text-white">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="bg-white/10 border border-white/20 backdrop-blur-md text-white text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
                      <i className={isAuthenticated ? 'fas fa-sun text-yellow-400' : 'fas fa-lock text-yellow-400'}></i>
                      {isAuthenticated ? `반가워요, ${userName}님!` : '로그인 후 이용할 수 있어요'}
                    </span>
                  </div>

                  <h1 className="text-2xl lg:text-3xl font-black mb-3 leading-tight text-white tracking-tight">
                    {!isAuthenticated ? (
                      <>로그인하고 <span className="text-brand">프로젝트 라운지</span>를 시작해 보세요.</>
                    ) : hasCollaborativeBanner ? (
                      <>
                        {primaryWorkspaceEventDate && isSameLocalDate(primaryWorkspaceEventDate, new Date()) ? '오늘' : '다가오는'}{' '}
                        <span className="text-brand">{primaryWorkspace?.name}</span>의 {primaryWorkspaceEventTitle} 일정이 있습니다.
                      </>
                    ) : (
                      <>DevPath에서 <span className="text-brand">스쿼드/멘토링 프로젝트</span>를 찾아보세요.</>
                    )}
                  </h1>

                  {isAuthenticated && hasCollaborativeBanner ? (
                    <div className="bg-gray-800/80 border border-gray-700 rounded-lg px-4 py-2.5 mb-5 inline-flex items-center gap-3 shadow-inner">
                      <span className="bg-brand text-white text-[10px] font-black px-2 py-1 rounded tracking-wider">{primaryWorkspaceEventTime}</span>
                      <span className="text-xs font-bold text-gray-200">{primaryWorkspaceEventTitle}</span>
                    </div>
                  ) : null}

                  <p className="text-gray-400 text-xs mb-5 leading-relaxed max-w-xl">
                    {!isAuthenticated ? (
                      <>
                        로그인하면 참여 중인 스쿼드/멘토링 일정과 학습 기술 기반 추천을 한곳에서 확인할 수 있습니다.
                      </>
                    ) : hasCollaborativeBanner ? (
                      <>
                        현재 {collaborativeWorkspaceCount}개의 스쿼드/멘토링 프로젝트에 참여 중입니다. 오늘 날짜 기준으로 가장 가까운 일정부터 보여드립니다.
                      </>
                    ) : (
                      <>
                        현재 배너에 표시할 스쿼드/멘토링 프로젝트가 없습니다. 라운지에서 팀원을 찾거나 멘토링 프로젝트를 시작해 보세요.
                      </>
                    )}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {!isAuthenticated ? (
                      <>
                        <button onClick={() => openAuthModal('로그인 후 프로젝트 라운지를 이용할 수 있습니다.')} className="bg-brand hover:bg-green-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs transition shadow-[0_4px_15px_rgba(0,196,113,0.3)] flex items-center gap-2">
                          <i className="fas fa-sign-in-alt"></i> 로그인하기
                        </button>
                        <button onClick={() => goTo('/community-lounge')} className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-5 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 backdrop-blur-md">
                          <i className="fas fa-rocket"></i> 라운지 둘러보기
                        </button>
                      </>
                    ) : hasCollaborativeBanner ? (
                      <>
                        <button onClick={() => goTo('/squad-meeting')} className="bg-brand hover:bg-green-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs transition shadow-[0_4px_15px_rgba(0,196,113,0.3)] flex items-center gap-2">
                          <i className="fas fa-headset"></i> 음성 회의 입장
                        </button>
                        <button onClick={() => goTo('/workspace-hub')} className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-5 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 backdrop-blur-md">
                          <i className="fas fa-laptop-code"></i> 내 워크스페이스
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => goTo('/community-lounge')} className="bg-brand hover:bg-green-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs transition shadow-[0_4px_15px_rgba(0,196,113,0.3)] flex items-center gap-2">
                          <i className="fas fa-rocket"></i> 라운지 둘러보기
                        </button>
                        <button onClick={() => goTo('/community-lounge')} className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-5 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 backdrop-blur-md">
                          <i className="fas fa-plus"></i> 새 스쿼드 만들기
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="w-full md:w-auto flex justify-end">
                  <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 w-full md:w-56 text-center shadow-lg">
                    <p className="text-[10px] text-gray-300 font-bold mb-1 uppercase tracking-widest">Dev Focus Score</p>
                    <div className="text-3xl font-black text-white mb-2">
                      {isAuthenticated ? (hasCollaborativeBanner ? 92 : 0) : '--'}
                      {isAuthenticated ? <span className="text-sm text-gray-400 font-medium">/100</span> : null}
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-1.5 mb-2 overflow-hidden">
                      <div className={isAuthenticated && hasCollaborativeBanner ? 'bg-brand h-1.5 rounded-full w-[92%]' : 'bg-gray-600 h-1.5 rounded-full w-[0%]'}></div>
                    </div>
                    <p className="text-[9px] text-gray-300">
                      {!isAuthenticated ? '로그인 후 활동 점수를 확인할 수 있습니다.' : hasCollaborativeBanner ? '스쿼드/멘토링 협업 활동 기준 점수입니다.' : '스쿼드/멘토링 프로젝트 활동을 시작하면 점수가 올라갑니다.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              <div className="xl:col-span-2 space-y-8">
                <section className="fade-in" style={{ animationDelay: '0.1s' }}>
                  <div className="flex justify-between items-end mb-4 h-[28px]">
                    <h2 className="text-lg font-extrabold text-gray-900 flex items-center gap-2 leading-none">
                      <i className="fas fa-folder-open text-blue-500"></i> 진행 중인 프로젝트
                    </h2>
                  </div>

                  {hasVisibleHubProjects ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {visibleHubProjects.map((project) => {
                        const isMentoring = isMentoringHubProject(project)
                        const progressPercent = Math.max(0, Math.min(project.progressPercent ?? 0, 100))
                        const memberAvatarSeeds = project.memberAvatarSeeds ?? []
                        const memberAvatarUrls = project.memberAvatarUrls ?? []

                        return (
                          <div key={project.projectId} className="bg-white rounded-2xl p-5 hover-card cursor-pointer flex flex-col justify-between relative h-[220px]" onClick={() => goTo(project.dashboardUrl ?? '/workspace-hub')}>
                            <div className={`absolute top-0 left-0 w-1 h-full rounded-l-2xl ${getHubProjectAccentClass(project)}`}></div>
                            <div>
                              <div className="flex justify-between items-start mb-3">
                                <span className={isMentoring ? 'bg-purple-50 text-mentor px-2 py-0.5 rounded text-[10px] font-extrabold flex items-center gap-1' : 'bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[10px] font-extrabold'}>
                                  {isMentoring ? <><i className="fas fa-chalkboard-teacher"></i> {getHubProjectTypeLabel(project)}</> : getHubProjectTypeLabel(project)}
                                </span>
                                <span className="text-[10px] text-gray-400 font-bold">{project.footerDateLabel ?? '최근 등록'}</span>
                              </div>
                              <h3 className="text-lg font-black text-gray-900 mb-1 truncate">{project.title}</h3>
                              <p className="text-xs text-gray-500 mb-4 line-clamp-2">{project.description ?? (isMentoring ? '멘토링 프로젝트를 진행 중입니다.' : '프로젝트를 진행 중입니다.')}</p>
                            </div>
                            {isMentoring ? (
                              <div className="mt-auto">
                                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 flex items-start gap-3">
                                  <UserAvatar
                                    name={project.footerText ?? '멘토'}
                                    imageUrl={project.footerAvatarUrl ?? null}
                                    className="w-7 h-7 shrink-0"
                                    iconClassName="text-[10px]"
                                  />
                                  <div>
                                    <p className="text-[10px] text-gray-500 font-bold mb-0.5">{project.footerText ?? '멘토링 워크스페이스'}</p>
                                    <p className="text-xs font-bold text-gray-800 line-clamp-1">{project.footerMetaText ?? '진행 중'}</p>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <div className="flex justify-between text-xs font-bold mb-1.5">
                                  <span className="text-gray-600">스프린트 달성률</span>
                                  <span className={getHubProjectType(project) === 'solo' ? 'text-brand' : 'text-blue-500'}>{progressPercent}%</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-1.5 mb-4"><div className={`${getHubProjectProgressClass(project)} h-1.5 rounded-full`} style={{ width: `${progressPercent}%` }}></div></div>
                                <div className="flex -space-x-2">
                                  {memberAvatarSeeds.map((seed, index) => (
                                    <UserAvatar
                                      key={seed}
                                      name={seed}
                                      imageUrl={memberAvatarUrls[index] ?? null}
                                      className="w-7 h-7 border-2 border-white bg-gray-100"
                                      iconClassName="text-[10px]"
                                    />
                                  ))}
                                  {project.extraMemberCount ? (
                                    <span className="w-7 h-7 rounded-full border-2 border-white bg-gray-100 text-[10px] font-bold text-gray-500 flex items-center justify-center">+{project.extraMemberCount}</span>
                                  ) : null}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center bg-white rounded-2xl border-2 border-dashed border-gray-200 h-[220px] text-center p-6 transition hover:border-gray-300 hover:bg-gray-50 cursor-default">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 text-xl mb-3 shadow-sm">
                        <i className="fas fa-folder-plus"></i>
                      </div>
                      <h3 className="text-sm font-bold text-gray-800 mb-1">아직 진행 중인 프로젝트가 없어요</h3>
                      <p className="text-[11px] text-gray-500 mb-4">마음에 드는 스쿼드에 합류하거나 직접 팀을 꾸려보세요!</p>
                      <button onClick={() => goTo('/community-lounge')} className="bg-gray-900 hover:bg-gray-800 text-white px-5 py-2 rounded-xl text-xs font-bold transition shadow-md flex items-center gap-2">
                        <i className="fas fa-search"></i> 새로운 프로젝트 찾기
                      </button>
                    </div>
                  )}
                </section>

                <section className="fade-in" style={{ animationDelay: '0.2s' }}>
                  <div className="flex justify-between items-end mb-4">
                    <h2 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
                      <i className="fas fa-compass text-orange-500"></i> 새로운 스쿼드 & 프로젝트 탐색
                    </h2>
                  </div>

                  <div className="space-y-4">
                    {!isAuthenticated ? (
                      <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm flex flex-col md:flex-row gap-5 items-start md:items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="bg-gray-900 text-white text-[10px] font-extrabold px-2 py-0.5 rounded shadow-sm">LOGIN REQUIRED</span>
                            <span className="text-[10px] text-gray-400 font-bold">AI 프로젝트 탐색</span>
                          </div>
                          <h3 className="font-bold text-gray-900 text-base mb-1 truncate">로그인 후 AI 맞춤 프로젝트를 확인하세요</h3>
                          <p className="text-[11px] text-gray-500 mb-3 truncate">학습 기록과 기술 스택을 기준으로 참여하기 좋은 스쿼드를 추천합니다.</p>
                        </div>
                        <button onClick={() => openAuthModal('AI 맞춤 프로젝트는 로그인 후 이용할 수 있습니다.')} className="w-full md:w-auto shrink-0 bg-gray-900 hover:bg-black text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-sm">
                          로그인하기
                        </button>
                      </div>
                    ) : recommendedProject ? (
                    <div className="ai-border cursor-pointer group p-5 flex flex-col md:flex-row gap-5 items-start md:items-center justify-between" onClick={() => goTo(getRecommendationTarget(recommendedProject))}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="bg-brand text-white text-[10px] font-extrabold px-2 py-0.5 rounded shadow-sm">AI 맞춤 {recommendedProject.recommendationScore ?? 0}%</span>
                            <span className="text-[10px] text-gray-400 font-bold">{recommendedProject.projectType === 'SQUAD' ? '스쿼드 프로젝트 추천' : '개인 프로젝트 추천'}</span>
                          </div>
                          <h3 className="font-bold text-gray-900 text-base mb-1 truncate group-hover:text-brand transition">{recommendedProject.name}</h3>
                          <p className="text-[11px] text-gray-500 mb-3 truncate">{recommendedProject.description ?? recommendedProject.reason ?? '추천 프로젝트 설명이 없습니다.'}</p>
                          <div className="flex gap-1.5 flex-wrap">
                            {(recommendedProject.matchedSkillTags ?? []).slice(0, 3).map((skill) => (
                              <span key={skill} className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded">{skill}</span>
                            ))}
                          </div>
                        </div>
                        <div className="w-full md:w-32 shrink-0 text-right md:border-l md:border-gray-100 md:pl-4">
                          <p className="text-[10px] text-gray-400 font-bold mb-1">매칭 기술</p>
                          <p className="text-sm font-black text-brand mb-2">{recommendedProject.matchedSkillTags?.length ?? 0}개</p>
                          <span className="text-xs font-bold text-gray-900 group-hover:text-brand transition">자세히 보기 &rarr;</span>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm flex flex-col md:flex-row gap-5 items-start md:items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="bg-gray-100 text-gray-600 text-[10px] font-extrabold px-2 py-0.5 rounded shadow-sm">AI 탐색</span>
                            <span className="text-[10px] text-gray-400 font-bold">추천 대기</span>
                          </div>
                          <h3 className="font-bold text-gray-900 text-base mb-1 truncate">추천할 프로젝트가 아직 없습니다</h3>
                          <p className="text-[11px] text-gray-500 mb-3 truncate">기술 스택을 등록하거나 공개 모집 중인 프로젝트가 생기면 추천이 표시됩니다.</p>
                        </div>
                        <button onClick={() => goTo('/community-lounge')} className="w-full md:w-auto shrink-0 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-sm">
                          라운지 보기
                        </button>
                      </div>
                    )}

                    {hotShowcase ? (
                      <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover-card cursor-pointer flex flex-col md:flex-row gap-5 items-start md:items-center justify-between group" onClick={() => goTo('/dev-showcase')}>
                        <div className="flex-1 min-w-0 flex items-center gap-4">
                          <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden shrink-0 border border-gray-100">
                            {hotShowcase.thumbnailUrl ? (
                              <img src={hotShowcase.thumbnailUrl} className="w-full h-full object-cover group-hover:scale-110 transition duration-500" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-300">
                                <i className="fas fa-image"></i>
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="bg-yellow-50 text-yellow-600 border border-yellow-200 text-[9px] font-black px-1.5 py-0.5 rounded uppercase">🔥 Hot 런칭</span>
                            </div>
                            <h3 className="font-bold text-gray-900 text-sm mb-1 truncate group-hover:text-blue-600 transition">{hotShowcase.title}</h3>
                            <p className="text-[11px] text-gray-500 line-clamp-1">{hotShowcase.description ?? '등록된 쇼케이스 설명이 없습니다.'}</p>
                          </div>
                        </div>
                        <div className="shrink-0 flex items-center gap-3 text-xs font-bold text-gray-500 md:border-l md:border-gray-100 md:pl-4">
                          <span className="flex items-center gap-1 text-red-500"><i className="fas fa-heart"></i> {hotShowcase.likeCount ?? 0}</span>
                          <span className="flex items-center gap-1"><i className="fas fa-eye"></i> {hotShowcase.viewCount ?? 0}</span>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </section>
              </div>

              <aside className="space-y-8 fade-in" style={{ animationDelay: '0.3s' }}>
                <div>
                  <div className="mb-4 h-[28px]">
                    <h2 className="text-lg font-extrabold text-transparent select-none leading-none">Spacer</h2>
                  </div>

                  <div className="bg-gray-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden group cursor-pointer hover:bg-gray-800 transition flex flex-col" onClick={() => isAuthenticated ? goTo('/job-matching') : openAuthModal('커리어 추천은 로그인 후 이용할 수 있습니다.')}>
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500 opacity-20 rounded-full blur-2xl group-hover:opacity-30 transition"></div>

                    <div>
                      <h3 className="font-bold text-sm mb-2 flex items-center gap-2"><i className="fas fa-briefcase text-blue-400"></i> 커리어 분석 준비</h3>
                      <p className="text-xs text-gray-400 mb-1 leading-relaxed">
                        {isAuthenticated ? (
                          careerProfileReady ? (
                            <>Proof Card와 프로젝트 활동을 기준으로 커리어 분석이 준비되었습니다.</>
                          ) : (
                            <>Proof Card와 프로젝트 활동이 쌓이면 커리어 분석을 준비할 수 있습니다.</>
                          )
                        ) : (
                          <>로그인하면 Proof Card와 프로젝트 활동 기반 커리어 분석을 준비할 수 있습니다.</>
                        )}
                      </p>
                      <p className="text-[11px] text-gray-500 leading-relaxed">
                        {isAuthenticated ? (
                          <>잡코리아 최신 공고 분석은 AI 맞춤 공고 스캔에서 실행됩니다.</>
                        ) : (
                          <>로그인 후 AI 맞춤 공고 스캔에서 확인할 수 있습니다.</>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center justify-between border-t border-gray-800 pt-4 mt-4 relative z-10">
                      <span className="text-xs font-bold text-blue-400 group-hover:text-blue-300 transition">채용 분석 보러가기 &rarr;</span>
                      <i className="fas fa-chart-line text-gray-700 text-lg"></i>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col h-[400px]">
                  <div className="flex justify-between items-center mb-5 shrink-0 border-b border-gray-100 pb-4">
                    <h3 className="font-extrabold text-gray-900 text-sm flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                      </span>
                      라운지 라이브 피드
                    </h3>
                  </div>

                  {hasCollaborativeBanner ? (
                    <div className={`flex-1 min-h-0 overflow-x-hidden space-y-4 ${shouldScrollLiveFeed ? 'overflow-y-auto custom-scrollbar pr-2' : 'overflow-y-hidden pr-0'}`}>
                      {liveFeedItems.map((item) => (
                        <div key={item.id} className={`flex min-w-0 gap-3 items-start cursor-pointer hover:bg-gray-50 p-1 rounded transition ${item.muted ? 'opacity-80' : ''}`}>
                          <div className={item.iconClassName}><i className={item.iconName}></i></div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[11px] text-gray-800 leading-snug mb-1" title={item.tooltip}>{item.body}</p>
                            <span className="text-[9px] text-gray-400 font-bold">{item.time}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center h-full pb-6">
                      <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 text-lg mb-3">
                        <i className="fas fa-comment-slash"></i>
                      </div>
                      <p className="text-xs font-bold text-gray-600 mb-1">아직 새로운 소식이 없습니다</p>
                      <p className="text-[10px] text-gray-400 leading-relaxed max-w-[180px]">
                        커뮤니티 활동을 시작하면<br />이곳에 실시간 피드가 표시됩니다.
                      </p>
                    </div>
                  )}
                </div>
              </aside>
            </div>
          </div>
        </main>
      </div>

      {authView ? (
        <AuthModal
          view={authView}
          onClose={closeAuthModal}
          onViewChange={setAuthView}
          onAuthenticated={handleAuthenticated}
        />
      ) : null}
    </div>
  )
}
