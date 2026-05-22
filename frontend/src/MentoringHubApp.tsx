import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import AuthModal, { type AuthView } from './components/AuthModal'
import ProjectAside, { type ProjectAsideSquad } from './components/ProjectAside'
import ProjectHeader from './components/ProjectHeader'
import { AUTH_SESSION_SYNC_EVENT, clearStoredAuthSession, getPostLoginRedirect, readStoredAuthSession } from './lib/auth-session'
import LoginRequiredView from './components/LoginRequiredView'
import { showAuthToast } from './lib/auth-toast'
import { projectApiRequest } from './project-api'

type CategoryFilter =
  | 'all'
  | 'Backend'
  | 'Frontend'
  | 'Fullstack'
  | 'App'
  | 'AI'
  | 'DevOps'
  | 'Game'
  | 'Security'
  | 'PM'
  | 'Design'

type TypeFilter = 'all' | 'study' | 'team'
type SortFilter = 'latest' | 'deadline'

type LoungeShellResponse = {
  user?: {
    name?: string | null
    profileImage?: string | null
  } | null
  mySquads?: ProjectAsideSquad[]
}

type MentoringHubPost = {
  postId: number
  mentorId?: number | null
  mentorName?: string | null
  mentorDescription?: string | null
  mentorImage?: string | null
  title?: string | null
  content?: string | null
  requiredStacks?: string | null
  stacks?: string[] | null
  category?: string | null
  mentoringType?: string | null
  mentoringTypeLabel?: string | null
  currentParticipants?: number | null
  maxParticipants?: number | null
  durationWeeks?: number | null
  deadlineDaysLeft?: number | null
  viewCount?: number | null
  curriculum?: string[] | null
  status?: string | null
  closed?: boolean | null
  createdAt?: string | null
}

type MentoringHubResponse = {
  openPosts?: MentoringHubPost[]
  summary?: {
    openPostCount?: number
    totalPostCount?: number
  } | null
}

type MentoringProject = {
  id: number
  category: Exclude<CategoryFilter, 'all'>
  mType: Exclude<TypeFilter, 'all'>
  mTypeLabel: string
  mTypeIcon: string
  title: string
  tech: string
  stacks: string[]
  badge: string
  badgeColor: string
  mentor: {
    id?: number | null
    name: string
    desc: string
    img: string
  }
  desc: string
  curriculum: string[]
  capacity: string
  duration: string
  createdAt: string
  deadlineLeft: number
  closed: boolean
}

const ITEMS_PER_PAGE = 6

const categoryOptions: Array<{ value: CategoryFilter; label: string }> = [
  { value: 'all', label: '전체' },
  { value: 'Backend', label: 'Backend' },
  { value: 'Frontend', label: 'Frontend' },
  { value: 'Fullstack', label: 'Fullstack' },
  { value: 'App', label: 'App (iOS/AOS)' },
  { value: 'AI', label: 'AI / Data' },
  { value: 'DevOps', label: 'DevOps / Infra' },
  { value: 'Game', label: 'Game' },
  { value: 'Security', label: 'Security' },
  { value: 'PM', label: 'PM / 기획' },
  { value: 'Design', label: 'UI/UX 디자인' },
]

function dice(seed: string | number | null | undefined) {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(String(seed || 'DevPath'))}`
}

function normalizeCategory(category: string | null | undefined): Exclude<CategoryFilter, 'all'> {
  const normalized = category?.trim()
  const values = categoryOptions.map((option) => option.value)

  if (normalized && values.includes(normalized as CategoryFilter) && normalized !== 'all') {
    return normalized as Exclude<CategoryFilter, 'all'>
  }

  return 'Backend'
}

function splitStacks(post: MentoringHubPost) {
  if (Array.isArray(post.stacks) && post.stacks.length > 0) {
    return post.stacks.map((stack) => stack.trim()).filter(Boolean)
  }

  return String(post.requiredStacks || '')
    .split(',')
    .map((stack) => stack.trim())
    .filter(Boolean)
}

function typeIcon(type: string | null | undefined) {
  return type === 'team' ? 'fa-puzzle-piece' : 'fa-users'
}

function badgeFor(post: MentoringHubPost) {
  if (post.closed) {
    return { text: '마감완료', color: 'text-gray-500 bg-gray-200' }
  }

  if (typeof post.deadlineDaysLeft === 'number' && post.deadlineDaysLeft <= 3) {
    return { text: '마감임박', color: 'text-red-600 bg-red-100' }
  }

  return { text: '모집중', color: 'text-green-600 bg-green-100' }
}

function mapProject(post: MentoringHubPost): MentoringProject {
  const badge = badgeFor(post)
  const stacks = splitStacks(post)
  const mentoringType = post.mentoringType === 'team' ? 'team' : 'study'

  return {
    id: Number(post.postId),
    category: normalizeCategory(post.category),
    mType: mentoringType,
    mTypeLabel: post.mentoringTypeLabel || (mentoringType === 'team' ? '팀 프로젝트형' : '공통 과제형'),
    mTypeIcon: typeIcon(mentoringType),
    title: post.title || '제목 없음',
    tech: stacks.join(', '),
    stacks,
    badge: badge.text,
    badgeColor: badge.color,
    mentor: {
      id: post.mentorId,
      name: post.mentorName || '멘토',
      desc: post.mentorDescription || 'DevPath 멘토',
      img: post.mentorImage || dice(`mentor-${post.mentorId || post.postId}`),
    },
    desc: post.content || '',
    curriculum:
      Array.isArray(post.curriculum) && post.curriculum.length > 0
        ? post.curriculum
        : ['오리엔테이션', '핵심 기능 구현', '멘토 코드 리뷰', '최종 발표'],
    capacity: `${Number(post.currentParticipants) || 0} / ${Number(post.maxParticipants) || 1}명`,
    duration: `${Number(post.durationWeeks) || 4}주`,
    createdAt: post.createdAt || '',
    deadlineLeft: typeof post.deadlineDaysLeft === 'number' ? post.deadlineDaysLeft : 999,
    closed: post.closed === true,
  }
}

function matchesProject(project: MentoringProject, query: string) {
  if (!query) {
    return true
  }

  return `${project.title} ${project.tech} ${project.mentor.name} ${project.desc}`.toLowerCase().includes(query)
}

export default function MentoringHubApp() {
  const [session, setSession] = useState(() => readStoredAuthSession())
  const [authView, setAuthView] = useState<AuthView | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [asideSquads, setAsideSquads] = useState<ProjectAsideSquad[]>([])
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [projects, setProjects] = useState<MentoringProject[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<CategoryFilter>('all')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [sort, setSort] = useState<SortFilter>('latest')
  const [currentPage, setCurrentPage] = useState(1)
  const [detailProject, setDetailProject] = useState<MentoringProject | null>(null)
  const [applyProject, setApplyProject] = useState<MentoringProject | null>(null)
  const [applyRole, setApplyRole] = useState('Frontend 개발자')
  const [applyMessage, setApplyMessage] = useState('')
  const [applyPortfolio, setApplyPortfolio] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    document.body.classList.add('mentoring-hub-body')

    return () => {
      document.body.classList.remove('mentoring-hub-body')
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const storedSession = readStoredAuthSession()
    setSession(storedSession)

    setIsLoading(true)
    setLoadError(null)

    Promise.all([
      projectApiRequest<LoungeShellResponse>('/api/lounge/shell', { signal: controller.signal }, 'optional').catch(() => null),
      projectApiRequest<MentoringHubResponse>('/api/mentorings/hub', { signal: controller.signal }),
    ])
      .then(([shell, hub]) => {
        if (controller.signal.aborted) {
          return
        }

        setAsideSquads(shell?.mySquads ?? [])
        setProfileImage(shell?.user?.profileImage ?? null)
        setProjects((hub.openPosts ?? []).map(mapProject))
      })
      .catch((error) => {
        if (controller.signal.aborted) {
          return
        }

        setProjects([])
        setLoadError(error instanceof Error ? error.message : '멘토링 프로젝트를 불러오지 못했습니다.')
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      })

    return () => {
      controller.abort()
    }
  }, [reloadKey])

  useEffect(() => {
    setCurrentPage(1)
  }, [search, category, typeFilter, sort])

  useEffect(() => {
    const syncSession = () => setSession(readStoredAuthSession())
    window.addEventListener('storage', syncSession)
    window.addEventListener(AUTH_SESSION_SYNC_EVENT, syncSession)
    return () => {
      window.removeEventListener('storage', syncSession)
      window.removeEventListener(AUTH_SESSION_SYNC_EVENT, syncSession)
    }
  }, [])

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase()
    const next = projects.filter((project) => {
      if (category !== 'all' && project.category !== category) {
        return false
      }

      if (typeFilter !== 'all' && project.mType !== typeFilter) {
        return false
      }

      return matchesProject(project, query)
    })

    next.sort((a, b) => {
      if (a.closed && !b.closed) {
        return 1
      }

      if (!a.closed && b.closed) {
        return -1
      }

      if (sort === 'deadline') {
        return a.deadlineLeft - b.deadlineLeft
      }

      return Date.parse(b.createdAt || '') - Date.parse(a.createdAt || '')
    })

    return next
  }, [category, projects, search, sort, typeFilter])

  const totalPages = Math.ceil(filteredProjects.length / ITEMS_PER_PAGE)
  const paginatedProjects = filteredProjects.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  function openAuthModal(message?: string) {
    if (message) {
      showAuthToast({
        message,
        durationMs: 2200,
      })
    }

    setAuthView('login')
  }

  function handleAuthenticated() {
    const nextSession = readStoredAuthSession()
    setSession(nextSession)
    setAuthView(null)

    const redirect = getPostLoginRedirect(nextSession?.role ?? null)
    if (redirect !== '/') {
      window.location.href = redirect
      return
    }

    setReloadKey((key) => key + 1)
  }

  function handleLogout() {
    clearStoredAuthSession()
    setSession(null)
    setAsideSquads([])
    setProfileImage(null)
    setReloadKey((key) => key + 1)
  }

  function openDetail(project: MentoringProject) {
    setDetailProject(project)
  }

  function closeDetail() {
    setDetailProject(null)
    closeApply()
  }

  function openApplyForm() {
    if (!detailProject || detailProject.closed) {
      return
    }

    if (!readStoredAuthSession()?.accessToken) {
      openAuthModal('멘토링 참가 신청은 로그인 후 이용할 수 있습니다.')
      return
    }

    setApplyProject(detailProject)
    setApplyRole('Frontend 개발자')
    setApplyMessage('')
    setApplyPortfolio('')
  }

  function closeApply() {
    setApplyProject(null)
    setApplyMessage('')
    setApplyPortfolio('')
    setApplyRole('Frontend 개발자')
    setIsSubmitting(false)
  }

  async function submitApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!applyProject || isSubmitting) {
      return
    }

    const message = applyMessage.trim()
    if (!message) {
      showAuthToast({
        message: '참여 동기를 입력해주세요.',
        variant: 'error',
        durationMs: 1800,
      })
      return
    }

    const extra: string[] = []
    if (applyProject.mType === 'team' && applyRole) {
      extra.push(`지원 직군: ${applyRole}`)
    }
    if (applyPortfolio.trim()) {
      extra.push(`포트폴리오: ${applyPortfolio.trim()}`)
    }

    setIsSubmitting(true)

    try {
      await projectApiRequest(
        `/api/mentoring-posts/${applyProject.id}/applications`,
        {
          method: 'POST',
          body: JSON.stringify({
            message: extra.length ? `${message}\n\n${extra.join('\n')}` : message,
          }),
        },
        'required',
      )

      showAuthToast({
        message: '신청이 완료되었습니다.',
        durationMs: 1800,
      })
      closeDetail()
    } catch (error) {
      showAuthToast({
        message: error instanceof Error ? error.message : '신청에 실패했습니다.',
        variant: 'error',
        durationMs: 2200,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!session) return <LoginRequiredView />

  return (
    <div className="mentoring-hub-page flex h-screen overflow-hidden text-gray-800">
      <ProjectAside activeKey="mentoring" mySquads={asideSquads} />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <ProjectHeader
          session={session}
          profileImage={profileImage}
          activeHref="lounge-dashboard.html"
          onLoginClick={() => openAuthModal()}
          onLogout={handleLogout}
        />

        <main className="flex-1 overflow-y-auto bg-[#F8F9FA] relative" id="mainContainer">
          <div className="max-w-7xl mx-auto px-6 py-10">
            <div className="flex flex-col md:flex-row md:justify-between items-start md:items-end mb-8 gap-4">
              <div>
                <span className="text-brand font-bold text-xs bg-green-50 px-3 py-1 rounded-full mb-3 inline-block border border-green-100">
                  Mentoring Program
                </span>
                <h1 className="text-3xl font-extrabold text-gray-900 mb-2">현업 멘토와 함께하는 실전 프로젝트</h1>
                <p className="text-gray-500 text-sm">
                  단순 강의가 아닙니다. 멘토의 밀착 코드 리뷰를 받으며 포트폴리오를 완성하세요.
                </p>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm mb-8 space-y-5">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="mentoring-search-shell flex-1 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 h-[46px] focus-within:border-brand focus-within:bg-white transition">
                  <i className="fas fa-search text-gray-400"></i>
                  <input
                    id="searchInput"
                    type="text"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="mentoring-search-input bg-transparent outline-none w-full text-sm h-full"
                    placeholder="프로젝트 제목, 기술 스택, 멘토 이름으로 검색해보세요"
                  />
                </div>

                <div className="flex flex-wrap md:flex-nowrap gap-2 shrink-0">
                  <select
                    id="typeSelect"
                    value={typeFilter}
                    onChange={(event) => setTypeFilter(event.target.value as TypeFilter)}
                    className="mentoring-filter-select w-full md:w-auto bg-white border border-gray-200 text-gray-700 text-sm rounded-xl pl-4 pr-10 h-[46px] focus:border-brand outline-none font-bold cursor-pointer transition hover:bg-gray-50 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke-width%3D%222%22%20stroke%3D%22%239CA3AF%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[length:14px] bg-[position:right_14px_center] shadow-sm"
                  >
                    <option value="all">🎯 진행방식 전체</option>
                    <option value="study">👥 공통 과제형 (스터디)</option>
                    <option value="team">🧩 역할 분담형 (팀 플젝)</option>
                  </select>

                  <select
                    id="sortSelect"
                    value={sort}
                    onChange={(event) => setSort(event.target.value as SortFilter)}
                    className="mentoring-filter-select w-full md:w-auto bg-white border border-gray-200 text-gray-700 text-sm rounded-xl pl-4 pr-10 h-[46px] focus:border-brand outline-none font-bold cursor-pointer transition hover:bg-gray-50 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke-width%3D%222%22%20stroke%3D%22%239CA3AF%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[length:14px] bg-[position:right_14px_center] shadow-sm"
                  >
                    <option value="latest">✨ 최신 등록순</option>
                    <option value="deadline">⏳ 마감 임박순</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2.5 overflow-x-auto hide-scroll pb-1 -mx-2 px-2 md:mx-0 md:px-0">
                {categoryOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`chip shrink-0${category === option.value ? ' active' : ''}`}
                    data-filter={option.value}
                    onClick={() => setCategory(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div id="project-list" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 min-h-[300px]">
              {isLoading ? (
                <div className="col-span-full bg-white border border-gray-200 rounded-2xl p-16 text-center text-gray-500 shadow-sm">
                  <i className="fas fa-spinner fa-spin text-4xl text-gray-300 mb-4 opacity-50"></i>
                  <p className="font-bold text-sm">멘토링 프로젝트를 불러오는 중입니다.</p>
                </div>
              ) : loadError ? (
                <div className="col-span-full bg-white border border-gray-200 rounded-2xl p-16 text-center text-gray-500 shadow-sm">
                  <i className="fas fa-circle-exclamation text-4xl text-gray-300 mb-4 opacity-50"></i>
                  <p className="font-bold text-sm">{loadError}</p>
                </div>
              ) : paginatedProjects.length === 0 ? (
                <div className="col-span-full bg-white border border-gray-200 rounded-2xl p-16 text-center text-gray-500 shadow-sm">
                  <i className="fas fa-folder-open text-4xl text-gray-300 mb-4 opacity-50"></i>
                  <p className="font-bold text-sm">조건에 맞는 멘토링 프로젝트가 없습니다.</p>
                </div>
              ) : (
                paginatedProjects.map((project) => (
                  <MentoringCard key={project.id} project={project} onOpen={() => openDetail(project)} />
                ))
              )}
            </div>

            <div id="paginationContainer" className="mt-12 flex justify-center items-center gap-1.5 pb-8">
              {totalPages > 1 &&
                Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => {
                      setCurrentPage(page)
                      document.getElementById('mainContainer')?.scrollTo({ top: 0, behavior: 'smooth' })
                    }}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm transition ${
                      page === currentPage
                        ? 'bg-gray-900 text-white shadow-md cursor-default'
                        : 'text-gray-500 hover:bg-gray-100 cursor-pointer'
                    }`}
                  >
                    {page}
                  </button>
                ))}
            </div>
          </div>
        </main>
      </div>

      {detailProject ? (
        <DetailModal project={detailProject} onClose={closeDetail} onApply={openApplyForm} />
      ) : null}

      {applyProject ? (
        <div id="applyModal" className="modal active fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeApply}></div>
          <form
            onSubmit={submitApplication}
            className="mentoring-apply-modal bg-white w-full max-w-md rounded-2xl shadow-2xl relative z-10 overflow-hidden mentoring-modal-enter"
          >
            <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <h2 className="text-lg font-extrabold text-gray-900">📝 참여 신청서 작성</h2>
              <button type="button" onClick={closeApply} className="text-gray-400 hover:text-gray-900">
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              {applyProject.mType === 'team' ? (
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">
                    지원할 직군 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={applyRole}
                    onChange={(event) => setApplyRole(event.target.value)}
                    className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:border-brand outline-none"
                  >
                    <option>Frontend 개발자</option>
                    <option>Backend 개발자</option>
                    <option>디자이너 / 기획자</option>
                  </select>
                </div>
              ) : null}

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">
                  참여 동기 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={applyMessage}
                  onChange={(event) => setApplyMessage(event.target.value)}
                  className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:border-brand outline-none h-32 resize-none"
                  placeholder="이 프로젝트를 통해 얻고 싶은 것과 현재 역량을 적어주세요."
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">포트폴리오 / GitHub URL</label>
                <input
                  type="text"
                  value={applyPortfolio}
                  onChange={(event) => setApplyPortfolio(event.target.value)}
                  className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:border-brand outline-none"
                  placeholder="https://github.com/username"
                />
              </div>
            </div>

            <div className="p-5 border-t border-gray-100 bg-white flex justify-end gap-2">
              <button
                type="button"
                onClick={closeApply}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-500 hover:bg-gray-50"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-brand text-white text-sm font-bold hover:bg-green-600 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? '제출 중' : '제출하기'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {authView ? (
        <AuthModal
          view={authView}
          onClose={() => setAuthView(null)}
          onViewChange={setAuthView}
          onAuthenticated={handleAuthenticated}
        />
      ) : null}
    </div>
  )
}

function MentoringCard({ project, onOpen }: { project: MentoringProject; onOpen: () => void }) {
  return (
    <article
      className={`project-card bg-white rounded-2xl border border-gray-200 overflow-hidden cursor-pointer group flex flex-col h-full shadow-[0_2px_10px_rgba(0,0,0,0.02)] p-6 ${
        project.closed ? 'opacity-70 grayscale-[0.3]' : ''
      }`}
      onClick={onOpen}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex gap-1.5 flex-wrap">
          <span className="bg-gray-100 text-gray-700 text-[10px] font-bold px-2 py-1 rounded border border-gray-200 shadow-sm">
            {project.category}
          </span>
          <span className={`${project.badgeColor} text-[10px] font-bold px-2 py-1 rounded border border-current shadow-sm`}>
            {project.badge}
          </span>
          <span className="bg-purple-50 text-purple-600 text-[10px] font-bold px-2 py-1 rounded border border-purple-200 shadow-sm">
            <i className={`fas ${project.mTypeIcon} mr-1`}></i>
            {project.mTypeLabel}
          </span>
        </div>
        <i className="fas fa-bookmark text-gray-300 hover:text-brand transition text-lg"></i>
      </div>

      <div className="flex-1">
        <h3 className="font-extrabold text-xl text-gray-900 mb-2 group-hover:text-brand transition line-clamp-1">
          {project.title}
        </h3>
        <p className="text-sm text-gray-500 mb-5 line-clamp-2 leading-relaxed h-10">{project.desc}</p>
        <div className="flex flex-wrap gap-2 mb-6">
          {project.stacks.map((stack) => (
            <span
              key={stack}
              className="text-[10px] font-bold bg-gray-50 text-gray-600 border border-gray-100 px-2 py-1 rounded shadow-sm"
            >
              {stack}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100">
        <div className="flex items-center gap-3 min-w-0">
          <img src={project.mentor.img} className="w-9 h-9 rounded-full border border-gray-200 shadow-sm" />
          <div className="min-w-0">
            <p className="text-xs font-extrabold text-gray-900">
              {project.mentor.name}
              <span className="font-normal text-brand text-[10px] ml-1">
                <i className="fas fa-check-circle"></i> 검증됨
              </span>
            </p>
            <p className="text-[10px] text-gray-400 truncate w-40 mt-0.5">{project.mentor.desc}</p>
          </div>
        </div>
        <div className="text-gray-300 group-hover:text-brand transition transform group-hover:translate-x-1">
          <i className="fas fa-chevron-right text-sm"></i>
        </div>
      </div>
    </article>
  )
}

function DetailModal({
  project,
  onClose,
  onApply,
}: {
  project: MentoringProject
  onClose: () => void
  onApply: () => void
}) {
  return (
    <div id="detailModal" className="modal active fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="mentoring-detail-modal bg-white w-full max-w-2xl rounded-2xl shadow-2xl relative z-10 flex flex-col max-h-[95vh] mentoring-modal-enter overflow-hidden">
        <div className="p-8 bg-gradient-to-br from-gray-800 to-gray-900 relative shrink-0 text-white">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white w-8 h-8 rounded-full flex items-center justify-center transition"
          >
            <i className="fas fa-times"></i>
          </button>
          <div className="flex flex-wrap gap-2 mb-3 items-center">
            <span className={`${project.badgeColor} text-[10px] font-bold px-2 py-0.5 rounded border border-current`}>
              {project.badge}
            </span>
            <span className="bg-white/20 border border-white/30 text-white text-[10px] font-bold px-2 py-0.5 rounded">
              {project.category}
            </span>
            <span className="bg-purple-500/20 border border-purple-400/50 text-purple-200 text-[10px] font-bold px-2 py-0.5 rounded">
              <i className={`fas ${project.mTypeIcon} mr-1`}></i>
              {project.mTypeLabel}
            </span>
          </div>
          <h2 className="text-2xl font-extrabold leading-tight">{project.title}</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          <div className="flex items-center gap-4 mb-8 p-4 bg-white rounded-2xl border border-gray-200 shadow-sm">
            <img src={project.mentor.img} className="w-14 h-14 rounded-full border border-gray-100 bg-gray-50" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-brand font-bold mb-0.5 tracking-wider">MENTOR</p>
              <p className="font-extrabold text-gray-900 text-base">{project.mentor.name}</p>
              <p className="text-xs text-gray-500 truncate mt-0.5">{project.mentor.desc}</p>
            </div>
            <a
              href={`/instructor-channel${project.mentor.id ? `?instructorId=${encodeURIComponent(project.mentor.id)}` : ''}`}
              className="shrink-0 bg-white border border-gray-200 text-gray-700 hover:text-brand hover:border-brand text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-sm flex items-center gap-1.5"
            >
              채널 방문 <i className="fas fa-chevron-right text-[10px]"></i>
            </a>
          </div>

          <div className="space-y-8">
            <div>
              <h3 className="text-sm font-extrabold text-gray-900 mb-3 flex items-center gap-2 border-b border-gray-100 pb-2">
                <i className="fas fa-bullseye text-brand"></i> 프로젝트 소개
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">{project.desc}</p>
            </div>

            <div>
              <h3 className="text-sm font-extrabold text-gray-900 mb-3 flex items-center gap-2 border-b border-gray-100 pb-2">
                <i className="fas fa-list-ol text-brand"></i> 주차별 커리큘럼
              </h3>
              <div className="space-y-3">
                {project.curriculum.map((item, index) => (
                  <div key={`${project.id}-${index}-${item}`} className="flex gap-3 items-start">
                    <div className="w-6 h-6 rounded-full bg-brand text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      {index + 1}
                    </div>
                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-xl w-full border border-gray-100">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-xl text-center border border-gray-100">
                <p className="text-[10px] text-gray-500 mb-1 font-bold">모집 인원</p>
                <p className="font-extrabold text-gray-900 text-lg">{project.capacity}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl text-center border border-gray-100">
                <p className="text-[10px] text-gray-500 mb-1 font-bold">예상 기간</p>
                <p className="font-extrabold text-gray-900 text-lg">{project.duration}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-gray-100 bg-white flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition"
          >
            닫기
          </button>
          <button
            type="button"
            onClick={onApply}
            disabled={project.closed}
            className={`px-8 py-3 bg-gray-900 hover:bg-black text-white text-sm font-bold rounded-xl transition shadow-lg flex items-center gap-2 ${
              project.closed ? 'opacity-40 cursor-not-allowed' : ''
            }`}
          >
            참가 신청하기 <i className="fas fa-arrow-right"></i>
          </button>
        </div>
      </div>
    </div>
  )
}
