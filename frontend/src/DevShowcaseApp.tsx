import type { FormEvent, ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import ProjectAside, { type ProjectAsideSquad } from './components/ProjectAside'
import ProjectHeader from './components/ProjectHeader'
import { clearStoredAuthSession, readStoredAuthSession } from './lib/auth-session'
import { projectApiRequest } from './project-api'

type ShowcaseCategory = 'FRONTEND' | 'BACKEND' | 'FULLSTACK' | 'MOBILE' | 'AI' | 'DATA' | 'DEVOPS' | 'ETC'
type CategoryFilter = 'all' | 'web' | 'app' | 'ai' | 'game'
type SortFilter = 'popular' | 'recent' | 'views' | 'comments'

type ShowcaseSummary = {
  showcaseId: number
  userId: number
  title: string
  description?: string | null
  thumbnailUrl?: string | null
  category: ShowcaseCategory
  viewCount: number
  likeCount: number
  createdAt?: string | null
}

type ShowcaseLink = {
  linkType: string
  url: string
}

type ShowcaseDetail = ShowcaseSummary & {
  links?: ShowcaseLink[]
  updatedAt?: string | null
}

type ShowcaseComment = {
  commentId: number
  userId: number
  content: string
  createdAt?: string | null
}

type LoungeShellResponse = {
  mySquads?: ProjectAsideSquad[]
}

const fallbackShowcases: ShowcaseSummary[] = [
  {
    showcaseId: 1,
    userId: 101,
    title: 'DevPath 포트폴리오 빌더',
    description: '학습 기록과 프로젝트 경험을 모아 PDF 포트폴리오로 정리하는 웹 서비스입니다.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=900',
    category: 'FULLSTACK',
    viewCount: 36,
    likeCount: 4,
  },
  {
    showcaseId: 2,
    userId: 102,
    title: 'AI 코드 리뷰 대시보드',
    description: 'PR 리뷰 결과를 위험도, 수정 가이드, 히스토리로 분류해서 팀 단위로 추적합니다.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=900',
    category: 'AI',
    viewCount: 42,
    likeCount: 4,
  },
  {
    showcaseId: 3,
    userId: 103,
    title: '스터디 매칭 모바일 MVP',
    description: '관심 스택과 시간대를 기반으로 스터디원을 추천하고 출석을 관리하는 모바일 MVP입니다.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=900',
    category: 'MOBILE',
    viewCount: 28,
    likeCount: 4,
  },
]

const categoryLabels: Record<ShowcaseCategory, string> = {
  FRONTEND: 'Web',
  BACKEND: 'Backend',
  FULLSTACK: 'Web',
  MOBILE: 'App',
  AI: 'AI',
  DATA: 'Data',
  DEVOPS: 'DevOps',
  ETC: 'Game',
}

const categoryQueries: Record<Exclude<CategoryFilter, 'all'>, ShowcaseCategory> = {
  web: 'FULLSTACK',
  app: 'MOBILE',
  ai: 'AI',
  game: 'ETC',
}

const authorNames = ['김하늘', '이서준', '정다은', '최민지', '오서연', '박도윤']
const authorImages = ['TeamTrip', 'Linux', 'Mood', 'Habit', 'DevPath', 'Root']
const statusLabels = ['Featured', 'Hot', 'New', 'Trending']
const techByCategory: Record<ShowcaseCategory, string[]> = {
  FRONTEND: ['React', 'TypeScript', 'Tailwind'],
  BACKEND: ['Spring Boot', 'PostgreSQL', 'Redis'],
  FULLSTACK: ['React', 'Spring Boot', 'PostgreSQL'],
  MOBILE: ['React Native', 'Expo', 'Firebase'],
  AI: ['Python', 'OpenAI API', 'Spring Boot'],
  DATA: ['Python', 'Pandas', 'Superset'],
  DEVOPS: ['Docker', 'GitHub Actions', 'AWS'],
  ETC: ['Unity', 'TypeScript', 'WebSocket'],
}

const completedWorkspaceProjects = [
  {
    id: 'ws-1',
    team: '배달비 절약팀',
    title: '배달비 절약 플랫폼 (MVP)',
    short: '위치 기반 실시간 공동 구매 매칭 서비스',
    description: '스프링 부트와 웹소켓을 이용해 실시간으로 근처 사용자를 매칭해 배달비를 아끼게 해주는 앱입니다.',
    tech: 'Spring Boot, WebSocket, MySQL, Docker',
    category: 'MOBILE' as ShowcaseCategory,
  },
  {
    id: 'ws-2',
    team: 'ROOT 팀',
    title: 'ROOT (컴공생 올인원 웹 플랫폼)',
    short: '수강신청부터 과제 제출까지 관리하는 졸업작품',
    description: '수강신청부터 과제 제출까지 관리하는 졸업작품 프로젝트. Docker와 Nginx를 활용해 오라클 클라우드에 배포 환경을 구축했습니다.',
    tech: 'Spring Boot, Docker, Oracle Cloud, Nginx, WebSocket',
    category: 'FULLSTACK' as ShowcaseCategory,
  },
]

function getAuthorName(userId: number) {
  return authorNames[userId % authorNames.length]
}

function getShowcaseTeam(showcase: ShowcaseSummary) {
  const index = showcase.userId % authorNames.length
  return {
    name: index % 2 === 0 ? `Team ${authorNames[index]}` : `${authorNames[index]} 팀`,
    image: `https://api.dicebear.com/7.x/avataaars/svg?seed=${authorImages[index]}`,
  }
}

function getShowcaseStatus(showcase: ShowcaseSummary) {
  return statusLabels[(showcase.showcaseId - 1) % statusLabels.length]
}

function getShowcaseShort(showcase: ShowcaseSummary) {
  return showcase.description || '완성된 프로젝트를 공유하고 피드백을 받는 쇼케이스입니다.'
}

function formatViews(value: number) {
  if (value >= 1000) {
    return `${Math.round((value / 1000) * 10) / 10}k`
  }

  return String(value)
}

function getSortQuery(sort: SortFilter) {
  return sort === 'recent' ? 'LATEST' : 'POPULAR'
}

function formatDate(value?: string | null) {
  if (!value) {
    return '방금 전'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '방금 전'
  }

  return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}

function sortShowcases(showcases: ShowcaseSummary[], sort: SortFilter) {
  return [...showcases].sort((a, b) => {
    if (sort === 'views') {
      return b.viewCount - a.viewCount
    }
    if (sort === 'comments') {
      return b.likeCount + b.viewCount / 10 - (a.likeCount + a.viewCount / 10)
    }
    if (sort === 'recent') {
      return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
    }
    return b.likeCount - a.likeCount
  })
}

export default function DevShowcaseApp() {
  const [session, setSession] = useState(() => readStoredAuthSession())
  const [showcases, setShowcases] = useState<ShowcaseSummary[]>(fallbackShowcases)
  const [asideSquads, setAsideSquads] = useState<ProjectAsideSquad[]>([])
  const [category, setCategory] = useState<CategoryFilter>('all')
  const [sort, setSort] = useState<SortFilter>('popular')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeShowcase, setActiveShowcase] = useState<ShowcaseDetail | null>(null)
  const [comments, setComments] = useState<ShowcaseComment[]>([])
  const [commentText, setCommentText] = useState('')
  const [likedShowcaseIds, setLikedShowcaseIds] = useState<Set<number>>(() => new Set())
  const [uploadOpen, setUploadOpen] = useState(false)
  const [newShowcase, setNewShowcase] = useState({
    title: '',
    team: '',
    short: '',
    description: '',
    tech: '',
    githubUrl: '',
    demoUrl: '',
    category: 'FULLSTACK' as ShowcaseCategory,
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    document.title = 'DevPath - 런칭 쇼케이스'
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
    const controller = new AbortController()
    setSession(readStoredAuthSession())

    async function load() {
      setLoading(true)
      const params = new URLSearchParams({ sort: getSortQuery(sort) })
      if (category !== 'all') {
        params.set('category', categoryQueries[category])
      }

      try {
        const [shell, list] = await Promise.all([
          projectApiRequest<LoungeShellResponse>('/api/lounge/shell', { signal: controller.signal }, 'optional').catch(() => null),
          projectApiRequest<ShowcaseSummary[]>(`/api/showcases?${params.toString()}`, { signal: controller.signal }),
        ])
        setAsideSquads(shell?.mySquads ?? [])
        setShowcases(list.length > 0 ? list : fallbackShowcases)
      } catch (error) {
        console.error(error)
        setShowcases(fallbackShowcases)
      } finally {
        setLoading(false)
      }
    }

    void load()
    return () => controller.abort()
  }, [category, sort])

  const visibleShowcases = useMemo(() => {
    const lowered = search.trim().toLowerCase()
    const filtered = showcases.filter((showcase) => {
      if (!lowered) {
        return true
      }

      return `${showcase.title} ${showcase.description ?? ''} ${getShowcaseTeam(showcase).name} ${techByCategory[showcase.category].join(' ')}`
        .toLowerCase()
        .includes(lowered)
    })

    return sortShowcases(filtered, sort)
  }, [search, showcases, sort])

  function handleLogout() {
    clearStoredAuthSession()
    setSession(null)
  }

  function toggleLike(showcaseId: number) {
    setLikedShowcaseIds((current) => {
      const next = new Set(current)
      if (next.has(showcaseId)) {
        next.delete(showcaseId)
      } else {
        next.add(showcaseId)
      }
      return next
    })
  }

  async function openDetail(showcase: ShowcaseSummary) {
    setActiveShowcase({ ...showcase, links: [] })
    setComments([])

    try {
      await projectApiRequest<ShowcaseDetail>(`/api/showcases/${showcase.showcaseId}/views`, { method: 'POST' }).catch(() => null)
      const [detail, commentList] = await Promise.all([
        projectApiRequest<ShowcaseDetail>(`/api/showcases/${showcase.showcaseId}`),
        projectApiRequest<ShowcaseComment[]>(`/api/showcases/${showcase.showcaseId}/comments`),
      ])
      setActiveShowcase(detail)
      setComments(commentList)
    } catch (error) {
      console.error(error)
    }
  }

  async function submitComment() {
    if (!activeShowcase || !commentText.trim()) {
      return
    }
    if (!readStoredAuthSession()?.accessToken) {
      window.location.assign('login.html')
      return
    }

    try {
      const created = await projectApiRequest<ShowcaseComment>(
        `/api/showcases/${activeShowcase.showcaseId}/comments`,
        { method: 'POST', body: JSON.stringify({ content: commentText.trim() }) },
        'required',
      )
      setComments((current) => [...current, created])
      setCommentText('')
    } catch (error) {
      console.error(error)
    }
  }

  async function createShowcase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!readStoredAuthSession()?.accessToken) {
      window.location.assign('login.html')
      return
    }

    setSubmitting(true)
    try {
      const created = await projectApiRequest<ShowcaseDetail>(
        '/api/showcases',
        {
          method: 'POST',
          body: JSON.stringify({
            title: newShowcase.title.trim(),
            description: newShowcase.description.trim() || newShowcase.short.trim(),
            thumbnailUrl: null,
            category: newShowcase.category,
            isPublic: true,
          }),
        },
        'required',
      )
      setShowcases((current) => [created, ...current])
      setUploadOpen(false)
      setNewShowcase({
        title: '',
        team: '',
        short: '',
        description: '',
        tech: '',
        githubUrl: '',
        demoUrl: '',
        category: 'FULLSTACK',
      })
    } catch (error) {
      console.error(error)
    } finally {
      setSubmitting(false)
    }
  }

  function importWorkspaceProject(projectId: string) {
    const selected = completedWorkspaceProjects.find((project) => project.id === projectId)
    if (!selected) {
      return
    }

    setNewShowcase((current) => ({
      ...current,
      category: selected.category,
      team: selected.team,
      title: selected.title,
      short: selected.short,
      description: selected.description,
      tech: selected.tech,
    }))
  }

  return (
    <div className="flex h-screen overflow-hidden text-gray-800">
      <ProjectAside activeKey="showcase" mySquads={asideSquads} />

      <div className="flex min-w-0 flex-1 flex-col h-screen overflow-hidden">
        <ProjectHeader session={session} activeHref="lounge-dashboard.html" onLoginClick={() => window.location.assign('login.html')} onLogout={handleLogout} />

        <main className="relative flex-1 overflow-y-auto bg-[#F8F9FA]">
          <div className="p-8">
            <div className="mx-auto max-w-6xl space-y-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <h1 className="text-3xl font-extrabold text-gray-900">명예의 전당 🏆</h1>
                  <p className="mt-2 text-gray-500">동료들이 완성한 멋진 결과물을 확인하고 피드백을 남겨주세요.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setUploadOpen(true)}
                  className="flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-black"
                >
                  <i className="fas fa-upload"></i>
                  프로젝트 등록
                </button>
              </div>

              <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                  <div className="flex flex-1 items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                    <i className="fas fa-search text-gray-400"></i>
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      className="w-full bg-transparent text-sm outline-none"
                      placeholder="프로젝트 제목/설명/팀 이름 검색"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <FilterChip active={category === 'all'} icon="fa-layer-group" label="전체" onClick={() => setCategory('all')} />
                    <FilterChip active={category === 'web'} icon="fa-globe" label="Web" onClick={() => setCategory('web')} />
                    <FilterChip active={category === 'app'} icon="fa-mobile-alt" label="App" onClick={() => setCategory('app')} />
                    <FilterChip active={category === 'ai'} icon="fa-brain" label="AI" onClick={() => setCategory('ai')} />
                    <FilterChip active={category === 'game'} icon="fa-gamepad" label="Game" onClick={() => setCategory('game')} />
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={sort}
                      onChange={(event) => setSort(event.target.value as SortFilter)}
                      className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none"
                    >
                      <option value="popular">인기순 (좋아요)</option>
                      <option value="recent">최신순</option>
                      <option value="views">조회순</option>
                      <option value="comments">댓글많은순</option>
                    </select>
                  </div>
                </div>
              </section>

              {loading ? (
                <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm font-bold text-gray-400">쇼케이스를 불러오는 중입니다.</div>
              ) : (
                <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {visibleShowcases.length > 0 ? (
                    visibleShowcases.map((showcase) => (
                      <ShowcaseCard
                        key={showcase.showcaseId}
                        showcase={showcase}
                        liked={likedShowcaseIds.has(showcase.showcaseId)}
                        commentCount={activeShowcase?.showcaseId === showcase.showcaseId ? comments.length : 0}
                        onLike={() => toggleLike(showcase.showcaseId)}
                        onOpen={() => openDetail(showcase)}
                      />
                    ))
                  ) : (
                    <div className="col-span-full rounded-2xl border border-gray-200 bg-white p-12 text-center text-gray-500">
                      <i className="fas fa-box-open mb-3 text-4xl text-gray-300"></i>
                      <p className="font-bold">조건에 맞는 프로젝트가 없습니다.</p>
                    </div>
                  )}
                </section>
              )}
            </div>
          </div>
        </main>
      </div>

      {activeShowcase && (
        <DetailModal
          showcase={activeShowcase}
          comments={comments}
          commentText={commentText}
          liked={likedShowcaseIds.has(activeShowcase.showcaseId)}
          onCommentTextChange={setCommentText}
          onClose={() => setActiveShowcase(null)}
          onSubmitComment={submitComment}
          onToggleLike={() => toggleLike(activeShowcase.showcaseId)}
        />
      )}

      {uploadOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <button type="button" className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-label="닫기" onClick={() => setUploadOpen(false)}></button>
          <form onSubmit={createShowcase} className="modal-enter relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-8 shadow-2xl transition-all">
            <h3 className="mb-6 flex items-center gap-2 text-xl font-extrabold text-gray-900">
              <i className="fas fa-upload text-brand"></i>
              완성 프로젝트 등록
            </h3>

            <div className="mb-6 border-b border-gray-100 pb-6">
              <label className="mb-2 flex items-center gap-2 text-xs font-bold text-gray-600">
                <i className="fas fa-archive text-brand"></i>
                내 워크스페이스에서 바로 불러오기
              </label>
              <select
                value=""
                onChange={(event) => importWorkspaceProject(event.target.value)}
                className="w-full cursor-pointer rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-brand transition focus:outline-none focus:ring-1 focus:ring-brand"
              >
                <option value="">-- 완료된 프로젝트 선택 --</option>
                {completedWorkspaceProjects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.title} (완료)
                  </option>
                ))}
              </select>
              <p className="mt-2 text-[10px] text-gray-400">
                <i className="fas fa-info-circle"></i>
                {' '}종료/완료된 프로젝트만 쇼케이스에 등록 가능합니다.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <UploadField label="카테고리">
                  <select
                    value={newShowcase.category}
                    onChange={(event) => setNewShowcase((current) => ({ ...current, category: event.target.value as ShowcaseCategory }))}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-brand"
                  >
                    <option value="FULLSTACK">Web</option>
                    <option value="MOBILE">App</option>
                    <option value="AI">AI</option>
                    <option value="ETC">Game</option>
                  </select>
                </UploadField>
                <UploadField label="팀 이름">
                  <input
                    value={newShowcase.team}
                    onChange={(event) => setNewShowcase((current) => ({ ...current, team: event.target.value }))}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand"
                    placeholder="Team DevPath"
                  />
                </UploadField>
              </div>

              <UploadField label="프로젝트 제목">
                <input
                  required
                  value={newShowcase.title}
                  onChange={(event) => setNewShowcase((current) => ({ ...current, title: event.target.value }))}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand"
                  placeholder="눈에 띄는 제목을 작성해주세요."
                />
              </UploadField>

              <UploadField label="한 줄 소개 (리스트 노출용)">
                <input
                  value={newShowcase.short}
                  onChange={(event) => setNewShowcase((current) => ({ ...current, short: event.target.value }))}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand"
                  placeholder="프로젝트의 핵심 가치를 한 줄로 요약해주세요."
                />
              </UploadField>

              <UploadField label="상세 설명">
                <textarea
                  required
                  value={newShowcase.description}
                  onChange={(event) => setNewShowcase((current) => ({ ...current, description: event.target.value }))}
                  className="h-32 w-full resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand"
                  placeholder="프로젝트 기획 의도, 구현된 핵심 기능, 배운 점 등을 상세히 적어주세요."
                />
              </UploadField>

              <UploadField label="기술 스택 (쉼표로 구분)">
                <input
                  value={newShowcase.tech}
                  onChange={(event) => setNewShowcase((current) => ({ ...current, tech: event.target.value }))}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand"
                  placeholder="React, Spring Boot, MySQL"
                />
              </UploadField>

              <div className="grid grid-cols-1 gap-4 border-t border-gray-100 pt-4 md:grid-cols-2">
                <UploadField label="GitHub 저장소 URL">
                  <input
                    value={newShowcase.githubUrl}
                    onChange={(event) => setNewShowcase((current) => ({ ...current, githubUrl: event.target.value }))}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand"
                    placeholder="https://github.com/..."
                  />
                </UploadField>
                <UploadField label="배포/시연 URL">
                  <input
                    value={newShowcase.demoUrl}
                    onChange={(event) => setNewShowcase((current) => ({ ...current, demoUrl: event.target.value }))}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand"
                    placeholder="https://..."
                  />
                </UploadField>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button type="button" onClick={() => setUploadOpen(false)} className="rounded-xl bg-gray-100 px-6 py-3 text-sm font-bold text-gray-600 transition hover:bg-gray-200">
                취소
              </button>
              <button type="submit" disabled={submitting} className="rounded-xl bg-gray-900 px-8 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-black disabled:opacity-60">
                {submitting ? '등록 중' : '등록하기'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

function FilterChip({ active, icon, label, onClick }: { active: boolean; icon: string; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? 'inline-flex items-center gap-1.5 rounded-full border border-brand bg-[#EBFDF5] px-2.5 py-1.5 text-xs font-bold text-brand transition'
          : 'inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-bold text-gray-700 transition hover:bg-gray-100'
      }
    >
      <i className={`fas ${icon} text-[11px]`}></i>
      {label}
    </button>
  )
}

function ShowcaseCard({
  showcase,
  liked,
  commentCount,
  onLike,
  onOpen,
}: {
  showcase: ShowcaseSummary
  liked: boolean
  commentCount: number
  onLike: () => void
  onOpen: () => void
}) {
  const techStack = techByCategory[showcase.category]
  const team = getShowcaseTeam(showcase)
  const likeCount = showcase.likeCount + (liked ? 1 : 0)

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpen()
        }
      }}
      className="project-card group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition duration-300 hover:border-brand hover:shadow-xl"
    >
      <div className="mb-4 flex items-start justify-between">
        <div className="flex gap-2">
          <span className="rounded border border-gray-200 bg-gray-100 px-2 py-1 text-[10px] font-bold text-gray-700">{categoryLabels[showcase.category]}</span>
          <span className="rounded border border-green-100 bg-green-50 px-2 py-1 text-[10px] font-bold text-brand">{getShowcaseStatus(showcase)}</span>
        </div>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onLike()
          }}
          className="text-gray-300 transition hover:text-brand"
          title="좋아요"
        >
          <i className={`${liked ? 'fas text-brand' : 'far'} fa-heart text-xl`}></i>
        </button>
      </div>

      <div className="mb-4 flex-1">
        <h3 className="line-clamp-1 text-xl font-extrabold text-gray-900 transition group-hover:text-brand">{showcase.title}</h3>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-gray-500">{getShowcaseShort(showcase)}</p>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {techStack.slice(0, 4).map((tech) => (
          <span key={tech} className="rounded border border-gray-100 bg-gray-50 px-2 py-1 text-[10px] font-bold text-gray-600 shadow-sm">
            {tech}
          </span>
        ))}
        {techStack.length > 4 && <span className="px-1 py-1 text-[10px] font-bold text-gray-400">+{techStack.length - 4}</span>}
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-gray-100 pt-4">
        <div className="flex min-w-0 items-center gap-2">
          <img src={team.image} alt="" className="h-6 w-6 rounded-full border border-gray-100 bg-gray-50" />
          <span className="truncate text-xs font-extrabold text-gray-700">{team.name}</span>
        </div>
        <div className="flex gap-4 text-xs font-bold text-gray-400">
          <span className={`flex items-center gap-1.5 ${liked ? 'text-brand' : ''}`}>
            <i className={`${liked ? 'fas' : 'far'} fa-heart`}></i>
            {likeCount}
          </span>
          <span className="flex items-center gap-1.5">
            <i className="fas fa-eye"></i>
            {formatViews(showcase.viewCount)}
          </span>
          <span className="flex items-center gap-1.5">
            <i className="fas fa-comment"></i>
            {commentCount}
          </span>
        </div>
      </div>
    </article>
  )
}

function DetailModal({
  showcase,
  comments,
  commentText,
  liked,
  onCommentTextChange,
  onClose,
  onSubmitComment,
  onToggleLike,
}: {
  showcase: ShowcaseDetail
  comments: ShowcaseComment[]
  commentText: string
  liked: boolean
  onCommentTextChange: (value: string) => void
  onClose: () => void
  onSubmitComment: () => void
  onToggleLike: () => void
}) {
  const techStack = techByCategory[showcase.category]
  const team = getShowcaseTeam(showcase)
  const likeCount = showcase.likeCount + (liked ? 1 : 0)

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-label="닫기" onClick={onClose}></button>
      <div className="modal-enter relative z-10 flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="relative flex h-44 shrink-0 flex-col justify-end bg-gradient-to-br from-gray-800 to-gray-950 p-8">
          <button type="button" onClick={onClose} className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20">
            <i className="fas fa-times"></i>
          </button>
          <div className="relative z-10">
            <div className="mb-2 flex flex-wrap gap-2">
              <span className="rounded border border-white/20 bg-white/15 px-2 py-1 text-[10px] font-bold text-white">{categoryLabels[showcase.category]}</span>
              <span className="rounded bg-brand/80 px-2 py-1 text-[10px] font-bold text-white">{getShowcaseStatus(showcase)}</span>
            </div>
            <h2 className="text-3xl font-extrabold leading-tight text-white">{showcase.title}</h2>
            <p className="mt-1 line-clamp-1 text-sm text-gray-300">{getShowcaseShort(showcase)}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-3">
            <section className="space-y-6 lg:col-span-2">
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6">
                <h3 className="mb-4 flex items-center gap-2 border-b border-gray-200 pb-2 text-sm font-extrabold text-gray-900">
                  <i className="fas fa-align-left text-brand"></i>
                  상세 설명
                </h3>
                <p className="text-sm leading-relaxed text-gray-700">{showcase.description}</p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 flex items-center gap-2 border-b border-gray-100 pb-2 text-sm font-extrabold text-gray-900">
                  <i className="fas fa-code text-brand"></i>
                  사용 기술 스택
                </h3>
                <div className="flex flex-wrap gap-2">
                  {techStack.map((tech) => (
                    <span key={tech} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-600 shadow-sm">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-2">
                  <h3 className="flex items-center gap-2 text-sm font-extrabold text-gray-900">
                    <i className="fas fa-comments text-brand"></i>
                    피드백 및 응원
                  </h3>
                  <span className="rounded bg-gray-100 px-2 py-1 text-xs font-bold text-gray-400">{comments.length}개</span>
                </div>

                <div className="mb-6 flex items-start gap-3">
                  <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=MyUser" alt="" className="h-10 w-10 rounded-full border border-gray-200 shadow-sm" />
                  <div className="flex-1">
                    <textarea
                      value={commentText}
                      onChange={(event) => onCommentTextChange(event.target.value)}
                      className="h-20 w-full resize-none rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm outline-none transition focus:border-brand focus:bg-white"
                      placeholder="프로젝트에 대한 피드백이나 응원을 남겨주세요!"
                    />
                    <div className="mt-2 flex justify-end">
                      <button type="button" onClick={onSubmitComment} className="flex items-center gap-2 rounded-lg bg-gray-900 px-5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-black">
                        등록
                        <i className="fas fa-paper-plane"></i>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {comments.length > 0 ? (
                    comments.map((comment) => (
                      <div key={comment.commentId} className="flex items-start gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition hover:bg-gray-50">
                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.userId}`} alt="" className="h-10 w-10 rounded-full border border-gray-200 bg-white" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-extrabold text-gray-900">{getAuthorName(comment.userId)}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-bold text-gray-400">{formatDate(comment.createdAt)}</span>
                              <button type="button" className="text-gray-300 transition hover:text-red-500" title="댓글 삭제">
                                <i className="fas fa-trash text-xs"></i>
                              </button>
                            </div>
                          </div>
                          <p className="mt-1 break-words text-sm leading-relaxed text-gray-700">{comment.content}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-5 text-center text-sm font-medium text-gray-500">
                      아직 작성된 피드백이 없습니다. 첫 번째 피드백을 남겨보세요!
                    </div>
                  )}
                </div>
              </div>
            </section>

            <aside className="space-y-6">
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <img src={team.image} alt="" className="h-12 w-12 rounded-full border border-gray-200 bg-gray-50 shadow-sm" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-extrabold tracking-wider text-gray-400">TEAM</p>
                    <p className="truncate text-base font-extrabold text-gray-900">{team.name}</p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2">
                  <DetailMetric label="좋아요" value={likeCount} />
                  <DetailMetric label="조회" value={showcase.viewCount} />
                  <DetailMetric label="댓글" value={comments.length} />
                </div>

                <button
                  type="button"
                  onClick={onToggleLike}
                  className={
                    liked
                      ? 'mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-brand bg-[#EBFDF5] py-3.5 text-sm font-extrabold text-brand shadow-sm transition hover:bg-[#DFF9ED]'
                      : 'mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 py-3.5 text-sm font-extrabold shadow-sm transition hover:bg-gray-50'
                  }
                >
                  <i className={`${liked ? 'fas' : 'far'} fa-heart`}></i>
                  {liked ? '좋아요 취소' : '좋아요'}
                </button>

                <div className="mt-4 space-y-2 border-t border-gray-100 pt-4">
                  <a
                    href={showcase.links?.find((link) => link.linkType === 'GITHUB')?.url ?? '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 py-3 text-sm font-extrabold text-white shadow-md transition hover:bg-black"
                  >
                    <i className="fab fa-github"></i>
                    GitHub 링크
                  </a>
                  <a
                    href={showcase.links?.find((link) => link.linkType === 'DEMO')?.url ?? '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 py-3 text-sm font-extrabold text-gray-800 shadow-sm transition hover:bg-gray-50"
                  >
                    <i className="fas fa-external-link-alt"></i>
                    데모 시연
                  </a>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-2xl bg-[#111827] p-5 text-white shadow-lg">
                <div className="absolute top-0 right-0 h-24 w-24 rounded-full bg-brand opacity-10 blur-3xl"></div>
                <h3 className="mb-1 text-sm font-extrabold text-brand">
                  <i className="fas fa-lightbulb"></i>
                  {' '}피드백 가이드
                </h3>
                <p className="text-xs leading-relaxed text-gray-300">“좋았던 점 1개 + 개선점 1개” 형태로 남겨주시면 프로젝트 팀원들에게 가장 큰 힘이 됩니다!</p>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  )
}

function DetailMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-center transition hover:bg-gray-100">
      <p className="text-[10px] font-bold text-gray-400">{label}</p>
      <p className="mt-1 text-sm font-extrabold text-gray-900">{value}</p>
    </div>
  )
}

function UploadField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold text-gray-500">{label}</label>
      {children}
    </div>
  )
}
