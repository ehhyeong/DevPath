import { useEffect, useState } from 'react'
import AccountUserMenu from './components/AccountUserMenu'
import { authApi } from './lib/api'
import { clearStoredAuthSession, readStoredAuthSession } from './lib/auth-session'

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
}

type ProjectResponse = {
  projectId: number
  name: string
  description?: string | null
  recruitingStatus?: string | null
}

type ShowcaseSummaryResponse = {
  showcaseId: number
  title: string
  thumbnailUrl?: string | null
  likeCount?: number | null
  viewCount?: number | null
}

type JobRecommendationResponse = {
  jobId: number
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? ''

const headerLinks = [
  { href: 'roadmap-hub.html', label: '로드맵' },
  { href: 'lecture-list.html', label: '강의' },
  { href: 'lounge-dashboard.html', label: '프로젝트' },
  { href: 'job-matching.html', label: '채용분석' },
  { href: 'community-list.html', label: '커뮤니티' },
]

const fallbackProject: ProjectResponse = {
  projectId: 1,
  name: "배달비 쉐어 서비스 'N-Bread'",
  description: '기획 1, 프론트 2 확보. Spring Boot/AWS로 서버 구축하실 분!',
  recruitingStatus: 'OPEN',
}

const fallbackShowcase: ShowcaseSummaryResponse = {
  showcaseId: 1,
  title: 'ROOT (컴공생 올인원 웹 플랫폼)',
  thumbnailUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=200',
  likeCount: 142,
  viewCount: 32,
}

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

export default function LoungeDashboardApp() {
  const [session, setSession] = useState(() => readStoredAuthSession())
  const [profile, setProfile] = useState<UserProfileResponse | null>(null)
  const [workspaces, setWorkspaces] = useState<WorkspaceResponse[]>([])
  const [projects, setProjects] = useState<ProjectResponse[]>([])
  const [showcases, setShowcases] = useState<ShowcaseSummaryResponse[]>([])
  const [jobRecommendations, setJobRecommendations] = useState<JobRecommendationResponse[]>([])

  useEffect(() => {
    document.title = 'DevPath - 프로젝트 라운지'
  }, [])

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()

    async function loadLoungeData() {
      const results = await Promise.allSettled([
        apiGet<UserProfileResponse>('/api/users/me/profile', controller.signal, true),
        apiGet<WorkspaceResponse[]>('/api/workspaces/projects/me', controller.signal, true),
        apiGet<ProjectResponse[]>('/api/projects', controller.signal),
        apiGet<ShowcaseSummaryResponse[]>('/api/showcases?sort=POPULAR', controller.signal),
        apiGet<JobRecommendationResponse[]>('/api/jobs/recommendations/me', controller.signal, true),
      ])

      if (cancelled) {
        return
      }

      const [profileResult, workspaceResult, projectResult, showcaseResult, jobResult] = results

      if (isFulfilled(profileResult)) {
        setProfile(profileResult.value)
      }

      if (isFulfilled(workspaceResult) && Array.isArray(workspaceResult.value)) {
        setWorkspaces(workspaceResult.value)
      }

      if (isFulfilled(projectResult) && Array.isArray(projectResult.value)) {
        setProjects(projectResult.value)
      }

      if (isFulfilled(showcaseResult) && Array.isArray(showcaseResult.value)) {
        setShowcases(showcaseResult.value)
      }

      if (isFulfilled(jobResult) && Array.isArray(jobResult.value)) {
        setJobRecommendations(jobResult.value)
      }
    }

    void loadLoungeData()

    return () => {
      cancelled = true
      controller.abort()
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
    }
  }

  const userName = profile?.name?.trim() || profile?.nickname?.trim() || session?.name || '이태형'
  const profileImage = profile?.profileImage ?? null
  const hasActiveWorkspaces = workspaces.length > 0
  const primaryWorkspace = workspaces.find((workspace) => workspace.type !== 'MENTORING') ?? workspaces[0]
  const visibleWorkspaces = workspaces.slice(0, 2)
  const recommendedProject = projects.find((project) => project.recruitingStatus === 'OPEN') ?? projects[0] ?? fallbackProject
  const hotShowcase = showcases[0] ?? fallbackShowcase
  const activeWorkspaceCount = workspaces.length
  const jobRecommendationCount = jobRecommendations.length > 0 ? jobRecommendations.length : 12
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

  return (
    <div className="flex h-screen overflow-hidden text-gray-800">
      <aside className="w-20 hover:w-64 bg-white border-r border-gray-200 flex flex-col shrink-0 z-50 transition-all duration-300 ease-in-out group shadow-xl">
        <div className="h-20 flex items-center px-5 cursor-pointer hover:bg-gray-50 transition border-b border-gray-100 shrink-0" onClick={() => goTo('home.html')}>
          <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center text-brand text-xl shrink-0 shadow-md">
            <i className="fas fa-layer-group"></i>
          </div>
          <div className="sidebar-text flex flex-col">
            <p className="font-bold text-gray-900 text-lg tracking-tight">DevSquad</p>
            <p className="text-[10px] text-gray-400">Team Building</p>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-2 mt-4 overflow-y-auto overflow-x-hidden">
          <p className="px-4 text-xs font-bold text-gray-400 sidebar-section-title">MENU</p>
          <a href="lounge-dashboard.html" className="nav-item active">
          <i className="fas fa-home w-6 text-center text-lg"></i>
          <span className="sidebar-text">대시보드</span>
          </a>
          <a href="community-lounge.html" className="nav-item">
            <i className="fas fa-rocket w-6 text-center text-lg"></i>
            <span className="sidebar-text">라운지 (팀 찾기)</span>
          </a>
          <a href="mentoring-hub.html" className="nav-item">
            <i className="fas fa-chalkboard-teacher w-6 text-center text-lg"></i>
            <span className="sidebar-text">멘토링 찾기</span>
          </a>
          <a href="workspace-hub.html" className="nav-item">
            <i className="fas fa-laptop-code w-6 text-center text-lg"></i>
            <span className="sidebar-text">워크스페이스</span>
          </a>
          <a href="dev-showcase.html" className="nav-item">
            <i className="fas fa-trophy w-6 text-center text-lg"></i>
            <span className="sidebar-text">런칭 쇼케이스</span>
          </a>

          <p className="px-4 text-xs font-bold text-gray-400 sidebar-section-title">MY SQUADS</p>
          <div id="mySquadList">
            {hasActiveWorkspaces ? (
              visibleWorkspaces.map((workspace, index) => (
                <a key={workspace.workspaceId} href="squad-dashboard.html" className="nav-item">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 mx-2 ${workspace.type === 'MENTORING' || index === 1 ? 'bg-purple-500' : 'bg-blue-500'}`}></span>
                  <span className="sidebar-text truncate">{workspace.name}</span>
                </a>
              ))
            ) : (
              <div className="nav-item opacity-50 cursor-default hover:bg-transparent">
                <i className="fas fa-ghost w-6 text-center text-sm"></i>
                <span className="sidebar-text text-[11px]">참여 중인 팀 없음</span>
              </div>
            )}
          </div>
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-8 sticky top-0 z-30 shrink-0 shadow-sm">
          <div className="flex-1"></div>
          <nav className="-translate-x-[20px] flex items-center gap-10 text-sm font-bold text-gray-500">
            {headerLinks.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={item.href === 'lounge-dashboard.html' ? 'site-header-nav-link site-header-nav-link--active' : 'site-header-nav-link'}
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="flex flex-1 items-center justify-end gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="받은 메시지"
                className="relative cursor-pointer rounded-full p-2.5 text-gray-500 transition hover:bg-gray-100 hover:text-brand"
              >
                <i className="far fa-envelope text-lg"></i>
                <span className="pointer-events-none absolute right-2 top-[5px] h-2 w-2 rounded-full border border-white bg-red-500"></span>
              </button>
              <button
                type="button"
                aria-label="알림"
                className="relative cursor-pointer rounded-full p-2.5 text-gray-500 transition hover:bg-gray-100 hover:text-brand"
              >
                <i className="far fa-bell text-lg"></i>
                <span className="pointer-events-none absolute right-2 top-[5px] h-2 w-2 rounded-full border border-white bg-red-500"></span>
              </button>
            </div>
            {session ? (
              <AccountUserMenu session={session} profileImage={profileImage} onLogout={handleLogout} />
            ) : (
              <button
                type="button"
                onClick={() => goTo('login.html')}
                className="rounded-full bg-gray-900 px-5 py-2 text-sm font-bold text-white shadow-lg transition hover:bg-black"
              >
                로그인
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-[#F8F9FA] p-4 md:p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto space-y-8">
            <div className="bg-gradient-to-r from-slate-800 to-gray-900 rounded-2xl p-6 lg:p-8 relative overflow-hidden shadow-lg fade-in">
              <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-brand opacity-20 rounded-full blur-[80px] transform translate-x-1/3 -translate-y-1/3 pointer-events-none"></div>
              <div className="absolute bottom-0 right-1/4 w-[200px] h-[200px] bg-blue-600 opacity-20 rounded-full blur-[60px] transform translate-y-1/2 pointer-events-none"></div>

              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="w-full md:w-3/5 text-white">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="bg-white/10 border border-white/20 backdrop-blur-md text-white text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
                      <i className="fas fa-sun text-yellow-400"></i> 반가워요, {userName}님!
                    </span>
                  </div>

                  <h1 className="text-2xl lg:text-3xl font-black mb-3 leading-tight text-white tracking-tight">
                    {hasActiveWorkspaces ? (
                      <>오늘 <span className="text-brand">{primaryWorkspace?.name}</span>의 화상 회의가 있습니다.</>
                    ) : (
                      <>DevPath에서 <span className="text-brand">새로운 프로젝트</span>를 시작해 보세요!</>
                    )}
                  </h1>

                  {hasActiveWorkspaces ? (
                    <div className="bg-gray-800/80 border border-gray-700 rounded-lg px-4 py-2.5 mb-5 inline-flex items-center gap-3 shadow-inner">
                      <span className="bg-brand text-white text-[10px] font-black px-2 py-1 rounded tracking-wider">오후 8:00</span>
                      <span className="text-xs font-bold text-gray-200">주간 스프린트 및 결제 API 리뷰</span>
                    </div>
                  ) : null}

                  <p className="text-gray-400 text-xs mb-5 leading-relaxed max-w-xl">
                    {hasActiveWorkspaces ? (
                      <>현재 {activeWorkspaceCount}개의 스쿼드에 참여 중이며, 1건의 새로운 멘토링 코멘트가 도착했습니다.</>
                    ) : (
                      <>
                        현재 참여 중인 스쿼드가 없습니다. 라운지에서 마음이 맞는 팀원을 찾거나,<br />
                        직접 새로운 스터디 및 프로젝트를 개설하여 개발 여정을 시작해 보세요.
                      </>
                    )}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {hasActiveWorkspaces ? (
                      <>
                        <button onClick={() => goTo('squad-meeting.html')} className="bg-brand hover:bg-green-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs transition shadow-[0_4px_15px_rgba(0,196,113,0.3)] flex items-center gap-2">
                          <i className="fas fa-video"></i> 회의실 바로 입장
                        </button>
                        <button onClick={() => goTo('workspace-hub.html')} className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-5 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 backdrop-blur-md">
                          <i className="fas fa-laptop-code"></i> 내 워크스페이스
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => goTo('community-lounge.html')} className="bg-brand hover:bg-green-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs transition shadow-[0_4px_15px_rgba(0,196,113,0.3)] flex items-center gap-2">
                          <i className="fas fa-rocket"></i> 라운지 둘러보기
                        </button>
                        <button onClick={() => window.alert('스쿼드 개설 모달을 띄웁니다.')} className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-5 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 backdrop-blur-md">
                          <i className="fas fa-plus"></i> 새 스쿼드 만들기
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="w-full md:w-auto flex justify-end">
                  <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 w-full md:w-56 text-center shadow-lg">
                    <p className="text-[10px] text-gray-300 font-bold mb-1 uppercase tracking-widest">Dev Focus Score</p>
                    <div className="text-3xl font-black text-white mb-2">{hasActiveWorkspaces ? 92 : 0}<span className="text-sm text-gray-400 font-medium">/100</span></div>
                    <div className="w-full bg-gray-800 rounded-full h-1.5 mb-2 overflow-hidden">
                      <div className={hasActiveWorkspaces ? 'bg-brand h-1.5 rounded-full w-[92%]' : 'bg-gray-600 h-1.5 rounded-full w-[0%]'}></div>
                    </div>
                    <p className="text-[9px] text-gray-300">{hasActiveWorkspaces ? '상위 5%의 꾸준한 활동량입니다! 🔥' : '첫 활동을 시작하고 점수를 올려보세요! 🚀'}</p>
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

                  {hasActiveWorkspaces ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {visibleWorkspaces.map((workspace, index) => {
                        const isMentoring = workspace.type === 'MENTORING' || index === 1

                        return (
                          <div key={workspace.workspaceId} className="bg-white rounded-2xl p-5 hover-card cursor-pointer flex flex-col justify-between relative h-[220px]" onClick={() => goTo('squad-dashboard.html')}>
                            <div className={`absolute top-0 left-0 w-1 h-full rounded-l-2xl ${isMentoring ? 'bg-mentor' : 'bg-blue-500'}`}></div>
                            <div>
                              <div className="flex justify-between items-start mb-3">
                                <span className={isMentoring ? 'bg-purple-50 text-mentor px-2 py-0.5 rounded text-[10px] font-extrabold flex items-center gap-1' : 'bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[10px] font-extrabold'}>
                                  {isMentoring ? <><i className="fas fa-chalkboard-teacher"></i> 멘토링 스터디</> : '일반 스쿼드'}
                                </span>
                                <span className="text-[10px] text-gray-400 font-bold">{isMentoring ? '매주 화요일' : <><i className="fas fa-clock"></i> D-14</>}</span>
                              </div>
                              <h3 className="text-lg font-black text-gray-900 mb-1 truncate">{workspace.name}</h3>
                              <p className="text-xs text-gray-500 mb-4 line-clamp-2">{workspace.description ?? (isMentoring ? '멘토링 스터디를 진행 중입니다.' : '프로젝트를 진행 중입니다.')}</p>
                            </div>
                            {isMentoring ? (
                              <div className="mt-auto">
                                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 flex items-start gap-3">
                                  <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Mentor" className="w-7 h-7 rounded-full border border-gray-200 shrink-0" />
                                  <div>
                                    <p className="text-[10px] text-gray-500 font-bold mb-0.5">시니어 멘토 코멘트</p>
                                    <p className="text-xs font-bold text-gray-800 line-clamp-1">"운영체제 페이징 기법 복습 필수입니다!"</p>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <div className="flex justify-between text-xs font-bold mb-1.5">
                                  <span className="text-gray-600">스프린트 달성률</span>
                                  <span className="text-blue-500">65%</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-1.5 mb-4"><div className="bg-blue-500 h-1.5 rounded-full" style={{ width: '65%' }}></div></div>
                                <div className="flex -space-x-2">
                                  <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=A" className="w-7 h-7 rounded-full border-2 border-white bg-gray-100" />
                                  <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=B" className="w-7 h-7 rounded-full border-2 border-white bg-gray-100" />
                                  <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=C" className="w-7 h-7 rounded-full border-2 border-white bg-gray-100" />
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
                      <button onClick={() => goTo('community-lounge.html')} className="bg-gray-900 hover:bg-gray-800 text-white px-5 py-2 rounded-xl text-xs font-bold transition shadow-md flex items-center gap-2">
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
                    <div className="ai-border cursor-pointer group p-5 flex flex-col md:flex-row gap-5 items-start md:items-center justify-between" onClick={() => goTo('community-lounge.html')}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="bg-brand text-white text-[10px] font-extrabold px-2 py-0.5 rounded shadow-sm">AI 맞춤 95%</span>
                          <span className="text-[10px] text-gray-400 font-bold">사이드 프로젝트 백엔드 구인</span>
                        </div>
                        <h3 className="font-bold text-gray-900 text-base mb-1 truncate group-hover:text-brand transition">{recommendedProject.name}</h3>
                        <p className="text-[11px] text-gray-500 mb-3 truncate">{recommendedProject.description ?? fallbackProject.description}</p>
                        <div className="flex gap-1.5">
                          <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded">Spring Boot</span>
                          <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded">MySQL</span>
                        </div>
                      </div>
                      <div className="w-full md:w-32 shrink-0 text-right md:border-l md:border-gray-100 md:pl-4">
                        <p className="text-[10px] text-gray-400 font-bold mb-1">모집 마감까지</p>
                        <p className="text-sm font-black text-red-500 mb-2">D-3</p>
                        <span className="text-xs font-bold text-gray-900 group-hover:text-brand transition">자세히 보기 &rarr;</span>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover-card cursor-pointer flex flex-col md:flex-row gap-5 items-start md:items-center justify-between group" onClick={() => goTo('dev-showcase.html')}>
                      <div className="flex-1 min-w-0 flex items-center gap-4">
                        <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden shrink-0 border border-gray-100">
                          <img src={hotShowcase.thumbnailUrl ?? fallbackShowcase.thumbnailUrl ?? undefined} className="w-full h-full object-cover group-hover:scale-110 transition duration-500" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="bg-yellow-50 text-yellow-600 border border-yellow-200 text-[9px] font-black px-1.5 py-0.5 rounded uppercase">🔥 Hot 런칭</span>
                          </div>
                          <h3 className="font-bold text-gray-900 text-sm mb-1 truncate group-hover:text-blue-600 transition">{hotShowcase.title}</h3>
                          <p className="text-[11px] text-gray-500 line-clamp-1">수강신청부터 과제 제출까지 관리하는 졸업작품입니다. 피드백 환영해요!</p>
                        </div>
                      </div>
                      <div className="shrink-0 flex items-center gap-3 text-xs font-bold text-gray-500 md:border-l md:border-gray-100 md:pl-4">
                        <span className="flex items-center gap-1 text-red-500"><i className="fas fa-heart"></i> {hotShowcase.likeCount ?? 142}</span>
                        <span className="flex items-center gap-1"><i className="fas fa-comment"></i> 32</span>
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              <aside className="space-y-8 fade-in" style={{ animationDelay: '0.3s' }}>
                <div>
                  <div className="mb-4 h-[28px]">
                    <h2 className="text-lg font-extrabold text-transparent select-none leading-none">Spacer</h2>
                  </div>

                  <div className="bg-gray-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden group cursor-pointer hover:bg-gray-800 transition flex flex-col" onClick={() => goTo('job-matching.html')}>
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500 opacity-20 rounded-full blur-2xl group-hover:opacity-30 transition"></div>

                    <div>
                      <h3 className="font-bold text-sm mb-2 flex items-center gap-2"><i className="fas fa-briefcase text-blue-400"></i> 커리어 추천 현황</h3>
                      <p className="text-xs text-gray-400 mb-1 leading-relaxed">{userName}님의 스택과 일치하는 채용공고가 <span className="text-white font-bold">{jobRecommendationCount}건</span> 업데이트 되었습니다.</p>
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

                  {hasActiveWorkspaces ? (
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
    </div>
  )
}
