import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import AuthModal, { type AuthView } from './components/AuthModal'
import ProjectAside, { type ProjectAsideSquad } from './components/ProjectAside'
import ProjectHeader from './components/ProjectHeader'
import UserAvatar from './components/UserAvatar'
import { AUTH_SESSION_SYNC_EVENT, clearStoredAuthSession, getPostLoginRedirect, readStoredAuthSession } from './lib/auth-session'
import LoginRequiredView from './components/LoginRequiredView'
import { showAuthToast } from './lib/auth-toast'
import { PROFILE_UPDATED_EVENT, type ProfileSyncPayload } from './lib/profile-sync'
import { projectApiRequest } from './project-api'

type LoungeType = 'project' | 'join_wish' | 'study' | 'networking'
type ActiveFilter = 'all' | 'my_posts' | LoungeType
type SortFilter = 'latest' | 'views' | 'deadline' | 'available'
type StatusTab = 'sent' | 'received'

type LoungeShellResponse = {
  user?: {
    name?: string | null
    profileImage?: string | null
  } | null
  mySquads?: ProjectAsideSquad[]
}

type SquadMemberResponse = {
  userId?: number | null
  userName?: string | null
  role?: string | null
}

type SquadLoungePostResponse = {
  id: number
  authorId?: number | null
  authorName?: string | null
  title?: string | null
  type?: string | null
  deadline?: string | null
  tags?: string[] | null
  description?: string | null
  roles?: string[] | null
  currentMembers?: number | null
  maxMembers?: number | null
  views?: number | null
  closed?: boolean | null
  createdAt?: string | null
  updatedAt?: string | null
  members?: SquadMemberResponse[] | null
}

type LoungeApplicationSummary = {
  applicationId: number
  type: 'SQUAD_APPLICATION' | 'SQUAD_PROPOSAL'
  targetId: number
  targetTitle?: string | null
  senderId?: number | null
  senderName?: string | null
  receiverId?: number | null
  receiverName?: string | null
  title?: string | null
  content?: string | null
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | string | null
  createdAt?: string | null
}

type LoungeApplication = {
  id: number
  type: 'project_apply' | 'scout'
  title: string
  sender: string
  senderImg: string
  date: string
  status: string
  content: string
}

type SquadMember = {
  name: string
  role: string
  img: string
}

type SquadPost = {
  id: number
  authorId: number | null
  author: string
  authorImg: string
  title: string
  type: LoungeType
  deadline: string
  iconClass: string
  iconBg: string
  iconCol: string
  tags: string[]
  desc: string
  roles: string[]
  members: SquadMember[]
  current: number
  max: number
  views: number
  date: string
  sortDate: string
  isClosed: boolean
  isMine: boolean
}

type CreateForm = {
  editId: number | null
  title: string
  type: LoungeType
  deadline: string
  maxMembers: string
  tags: string
  roles: string
  desc: string
}

type ApplyForm = {
  role: string
  portfolio: string
  content: string
}

const ITEMS_PER_PAGE = 6

const templates: Record<LoungeType, string> = {
  project: '[프로젝트 핵심 목표 (한줄 소개)]\n- \n\n[상세 기획 및 주요 기능]\n- \n\n[모집 역할 및 진행 방식]\n- ',
  join_wish: '[자기소개]\n- 보유 기술: \n- 가용 시간: \n\n[희망 프로젝트]\n- ',
  study: '[스터디 목표]\n- \n- 진행 시간: \n\n[모집 대상]\n- ',
  networking: '[모임 주제]\n- \n- 일시 및 장소: ',
}

const typeConfig: Record<LoungeType, { iconClass: string; iconBg: string; iconCol: string }> = {
  project: { iconClass: 'fa-plane', iconBg: 'bg-blue-50', iconCol: 'text-blue-600' },
  join_wish: { iconClass: 'fa-user-check', iconBg: 'bg-green-50', iconCol: 'text-brand' },
  study: { iconClass: 'fa-book', iconBg: 'bg-purple-50', iconCol: 'text-purple-600' },
  networking: { iconClass: 'fa-coffee', iconBg: 'bg-orange-50', iconCol: 'text-orange-600' },
}

function diceAvatar(seed: string | number | null | undefined) {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(String(seed || 'DevPath'))}`
}

function toDateText(value: string | null | undefined) {
  if (!value) {
    return ''
  }

  return value.slice(0, 10)
}

function toDateTime(value: string | null | undefined) {
  if (!value) {
    return 0
  }

  const time = Date.parse(value)
  return Number.isFinite(time) ? time : 0
}

function toDeadlineTime(value: string | null | undefined) {
  if (!value) {
    return Number.MAX_SAFE_INTEGER
  }

  const time = Date.parse(value)
  return Number.isFinite(time) ? time : Number.MAX_SAFE_INTEGER
}

function normalizeType(value: string | null | undefined): LoungeType {
  if (value === 'join_wish' || value === 'study' || value === 'networking') {
    return value
  }

  return 'project'
}

function formatViews(views: number) {
  return views > 1000 ? `${(views / 1000).toFixed(1)}k` : String(views)
}

function parseTokenList(value: string) {
  return value
    .split(/\s+/)
    .map((item) => item.replace(/^#/, '').trim())
    .filter(Boolean)
}

function mapApplication(item: LoungeApplicationSummary): LoungeApplication {
  return {
    id: Number(item.applicationId),
    type: item.type === 'SQUAD_APPLICATION' ? 'project_apply' : 'scout',
    title: item.targetTitle || item.title || '제목 없음',
    sender: item.senderName || '사용자',
    senderImg: `sender-${item.senderId || item.applicationId}`,
    date: toDateText(item.createdAt),
    status: item.status === 'APPROVED' ? '승인됨' : item.status === 'REJECTED' ? '거절됨' : '대기중',
    content: item.content || item.title || '',
  }
}

function mapSquadPost(post: SquadLoungePostResponse, currentUserId: number | null): SquadPost {
  const type = normalizeType(post.type)
  const cfg = typeConfig[type]
  const members = Array.isArray(post.members) ? post.members : []
  const currentMembers = Number(post.currentMembers) || members.length || 0
  const maxMembers = Number(post.maxMembers) || Math.max(currentMembers, 1)

  return {
    id: Number(post.id),
    authorId: post.authorId ?? null,
    author: post.authorName || '사용자',
    authorImg: `squad-${post.authorId ?? post.id}`,
    title: post.title || '제목 없음',
    type,
    deadline: toDateText(post.deadline),
    iconClass: cfg.iconClass,
    iconBg: cfg.iconBg,
    iconCol: cfg.iconCol,
    tags: Array.isArray(post.tags) ? post.tags : [],
    desc: post.description || '',
    roles: Array.isArray(post.roles) ? post.roles : [],
    members: members.map((member) => ({
      name: member.userName || `사용자 #${member.userId || ''}`,
      role: member.role || 'Member',
      img: `member-${member.userId || member.userName || 'Member'}`,
    })),
    current: currentMembers,
    max: maxMembers,
    views: Number(post.views) || 0,
    date: toDateText(post.createdAt),
    sortDate: post.createdAt || post.updatedAt || '',
    isClosed: post.closed === true,
    isMine: currentUserId !== null && Number(post.authorId) === currentUserId,
  }
}

function emptyCreateForm(): CreateForm {
  return {
    editId: null,
    title: '',
    type: 'project',
    deadline: '',
    maxMembers: '',
    tags: '',
    roles: '',
    desc: templates.project,
  }
}

function readInitialDetailSquadId() {
  const params = new URLSearchParams(window.location.search)
  const rawId = params.get('squadId')
  const id = rawId ? Number(rawId) : Number.NaN

  return Number.isInteger(id) && id > 0 ? id : null
}

function clearInitialDetailSquadId() {
  const url = new URL(window.location.href)
  url.searchParams.delete('squadId')
  window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
}

export default function CommunityLoungeApp() {
  const [session, setSession] = useState(() => readStoredAuthSession())
  const [authView, setAuthView] = useState<AuthView | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [asideSquads, setAsideSquads] = useState<ProjectAsideSquad[]>([])
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [squads, setSquads] = useState<SquadPost[]>([])
  const [sentApplications, setSentApplications] = useState<LoungeApplication[]>([])
  const [receivedApplications, setReceivedApplications] = useState<LoungeApplication[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortFilter>('latest')
  const [hideClosed, setHideClosed] = useState(false)
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [initialDetailSquadId, setInitialDetailSquadId] = useState(() => readInitialDetailSquadId())
  const [detailSquad, setDetailSquad] = useState<SquadPost | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState<CreateForm>(() => emptyCreateForm())
  const [applySquad, setApplySquad] = useState<SquadPost | null>(null)
  const [applyForm, setApplyForm] = useState<ApplyForm>({ role: '', portfolio: '', content: '' })
  const [statusOpen, setStatusOpen] = useState(false)
  const [statusTab, setStatusTab] = useState<StatusTab>('sent')
  const [receivedDetail, setReceivedDetail] = useState<LoungeApplication | null>(null)
  const [memberProfile, setMemberProfile] = useState<SquadMember | null>(null)
  const [memberMessage, setMemberMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    document.title = 'DevPath - 라운지'
    document.body.classList.add('community-lounge-body')

    return () => {
      document.body.classList.remove('community-lounge-body')
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const currentSession = readStoredAuthSession()
    const currentUserId = currentSession?.userId ?? null

    setSession(currentSession)
    setIsLoading(true)
    setLoadError(null)

    Promise.allSettled([
      projectApiRequest<LoungeShellResponse>('/api/lounge/shell', { signal: controller.signal }, 'optional'),
      projectApiRequest<SquadLoungePostResponse[]>('/api/lounge/squads', { signal: controller.signal }),
      projectApiRequest<LoungeApplicationSummary[]>('/api/lounge/applications/sent', { signal: controller.signal }, 'required'),
      projectApiRequest<LoungeApplicationSummary[]>('/api/lounge/applications/received', { signal: controller.signal }, 'required'),
    ])
      .then(([shellResult, squadsResult, sentResult, receivedResult]) => {
        if (controller.signal.aborted) {
          return
        }

        if (shellResult.status === 'fulfilled') {
          setAsideSquads(shellResult.value.mySquads ?? [])
          setProfileImage(shellResult.value.user?.profileImage ?? null)
        } else {
          setAsideSquads([])
          setProfileImage(null)
        }

        if (squadsResult.status === 'fulfilled') {
          setSquads(squadsResult.value.map((post) => mapSquadPost(post, currentUserId)))
        } else {
          setSquads([])
          setLoadError('스쿼드 라운지 글을 불러오지 못했습니다.')
        }

        setSentApplications(sentResult.status === 'fulfilled' ? sentResult.value.map(mapApplication) : [])
        setReceivedApplications(receivedResult.status === 'fulfilled' ? receivedResult.value.map(mapApplication) : [])
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
    const syncProfile = (event: Event) => {
      const profileEvent = event as CustomEvent<ProfileSyncPayload>
      setProfileImage(profileEvent.detail?.profileImage ?? null)
    }

    window.addEventListener(PROFILE_UPDATED_EVENT, syncProfile)

    return () => {
      window.removeEventListener(PROFILE_UPDATED_EVENT, syncProfile)
    }
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [activeFilter, hideClosed, search, sort])

  useEffect(() => {
    const syncSession = () => setSession(readStoredAuthSession())
    window.addEventListener('storage', syncSession)
    window.addEventListener(AUTH_SESSION_SYNC_EVENT, syncSession)
    return () => {
      window.removeEventListener('storage', syncSession)
      window.removeEventListener(AUTH_SESSION_SYNC_EVENT, syncSession)
    }
  }, [])

  const filteredSquads = useMemo(() => {
    const query = search.trim().toLowerCase()
    const next = squads.filter((squad) => {
      if (activeFilter === 'my_posts' && !squad.isMine) {
        return false
      }

      if (activeFilter !== 'all' && activeFilter !== 'my_posts' && squad.type !== activeFilter) {
        return false
      }

      if (hideClosed && squad.isClosed) {
        return false
      }

      if (!query) {
        return true
      }

      return `${squad.title} ${squad.tags.join(' ')} ${squad.desc}`.toLowerCase().includes(query)
    })

    next.sort((a, b) => {
      if (a.isClosed && !b.isClosed) {
        return 1
      }

      if (!a.isClosed && b.isClosed) {
        return -1
      }

      if (sort === 'views') {
        return b.views - a.views
      }

      if (sort === 'deadline') {
        return toDeadlineTime(a.deadline) - toDeadlineTime(b.deadline)
      }

      if (sort === 'available') {
        return a.max - a.current - (b.max - b.current)
      }

      return toDateTime(b.sortDate || b.date) - toDateTime(a.sortDate || a.date)
    })

    return next
  }, [activeFilter, hideClosed, search, sort, squads])

  const totalPages = Math.ceil(filteredSquads.length / ITEMS_PER_PAGE)
  const paginatedSquads = filteredSquads.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  function openAuthModal(message?: string) {
    if (message) {
      showAuthToast({
        message,
        durationMs: 2200,
      })
    }

    setAuthView('login')
  }

  function requireLogin(message: string) {
    if (readStoredAuthSession()?.accessToken) {
      return true
    }

    openAuthModal(message)
    return false
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

  function openCreateModal(squad?: SquadPost) {
    if (!requireLogin('스쿼드 생성은 로그인 후 이용할 수 있습니다.')) {
      return
    }

    if (squad) {
      setCreateForm({
        editId: squad.id,
        title: squad.title,
        type: squad.type,
        deadline: squad.deadline || '',
        maxMembers: String(squad.max || ''),
        tags: squad.tags.map((tag) => `#${tag}`).join(' '),
        roles: squad.roles.join(' '),
        desc: squad.desc,
      })
    } else {
      setCreateForm(emptyCreateForm())
    }

    setCreateOpen(true)
  }

  function updateCreateType(type: LoungeType) {
    setCreateForm((form) => ({
      ...form,
      type,
      desc: form.editId ? form.desc : templates[type],
    }))
  }

  async function submitSquad(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (isSubmitting) {
      return
    }

    const title = createForm.title.trim()
    const description = createForm.desc.trim()
    if (!title || !description) {
      showAuthToast({
        message: '필수 항목을 입력해주세요.',
        variant: 'error',
        durationMs: 1800,
      })
      return
    }

    setIsSubmitting(true)

    try {
      const payload = {
        title,
        type: createForm.type,
        deadline: createForm.deadline || null,
        maxMembers: Number(createForm.maxMembers || 1),
        tags: parseTokenList(createForm.tags),
        description,
        roles: createForm.type === 'project' ? parseTokenList(createForm.roles) : [],
      }
      const path = createForm.editId ? `/api/lounge/squads/${createForm.editId}` : '/api/lounge/squads'
      const method = createForm.editId ? 'PUT' : 'POST'

      await projectApiRequest(path, { method, body: JSON.stringify(payload) }, 'required')
      showAuthToast({
        message: createForm.editId ? '수정되었습니다.' : '등록되었습니다.',
        durationMs: 1800,
      })
      setCreateOpen(false)
      setReloadKey((key) => key + 1)
    } catch (error) {
      showAuthToast({
        message: error instanceof Error ? error.message : '저장에 실패했습니다.',
        variant: 'error',
        durationMs: 2200,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function openDetailModal(squad: SquadPost) {
    setDetailSquad(squad)

    try {
      const detail = await projectApiRequest<SquadLoungePostResponse>(`/api/lounge/squads/${squad.id}`)
      const mapped = mapSquadPost(detail, readStoredAuthSession()?.userId ?? null)
      setDetailSquad(mapped)
      setSquads((items) => items.map((item) => (item.id === mapped.id ? mapped : item)))
    } catch {
      // 목록 데이터가 이미 있으므로 상세 보기는 그대로 유지한다.
    }
  }

  useEffect(() => {
    if (!initialDetailSquadId || isLoading) {
      return
    }

    const targetSquad = squads.find((squad) => squad.id === initialDetailSquadId)

    if (!targetSquad) {
      return
    }

    setInitialDetailSquadId(null)
    clearInitialDetailSquadId()
    void openDetailModal(targetSquad)
  }, [initialDetailSquadId, isLoading, squads])

  async function closeSquadOnly() {
    if (!detailSquad || !window.confirm('모집을 단순 마감 처리하시겠습니까?')) {
      return
    }

    await projectApiRequest(`/api/lounge/squads/${detailSquad.id}/close`, { method: 'PATCH' }, 'required')
    setDetailSquad(null)
    setReloadKey((key) => key + 1)
  }

  async function closeAndCreateWorkspace() {
    if (!detailSquad) {
      return
    }

    const confirmed = window.confirm("모집을 마감하고, 팀원들과 함께할 '워크스페이스'를 바로 생성하시겠습니까?\n(작성하신 스쿼드 제목, 기술 스택, 소개글이 자동으로 넘어갑니다.)")
    if (!confirmed) {
      return
    }

    await projectApiRequest(`/api/lounge/squads/${detailSquad.id}/close`, { method: 'PATCH' }, 'required')
    const params = new URLSearchParams({
      title: detailSquad.title,
      tech: detailSquad.tags.join(','),
      desc: detailSquad.desc,
    })
    window.location.href = `/project-create?${params.toString()}`
  }

  function openApplyForm() {
    if (!detailSquad) {
      return
    }

    if (!requireLogin('참여 신청은 로그인 후 이용할 수 있습니다.')) {
      return
    }

    setApplySquad(detailSquad)
    setApplyForm({
      role: detailSquad.roles[0] || '',
      portfolio: '',
      content: '',
    })
  }

  async function submitApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!applySquad || isSubmitting) {
      return
    }

    if (!applySquad.authorId) {
      showAuthToast({
        message: '신청 대상을 찾을 수 없습니다.',
        variant: 'error',
        durationMs: 1800,
      })
      return
    }

    const content = [
      applyForm.role ? `[희망 직군]: ${applyForm.role}` : '',
      applyForm.portfolio ? `[포트폴리오]: ${applyForm.portfolio}` : '',
      applyForm.content,
    ]
      .filter(Boolean)
      .join('\n')

    setIsSubmitting(true)

    try {
      await projectApiRequest(
        '/api/lounge/applications',
        {
          method: 'POST',
          body: JSON.stringify({
            receiverId: applySquad.authorId,
            type: applySquad.type === 'join_wish' ? 'SQUAD_PROPOSAL' : 'SQUAD_APPLICATION',
            targetId: applySquad.id,
            targetTitle: applySquad.title,
            title: `${applySquad.type === 'join_wish' ? '스카우트 제안: ' : '참여 신청: '}${applySquad.title}`,
            content: content || '참여하고 싶습니다.',
          }),
        },
        'required',
      )
      showAuthToast({
        message: '전송되었습니다.',
        durationMs: 1800,
      })
      setApplySquad(null)
      setDetailSquad(null)
      setReloadKey((key) => key + 1)
    } catch (error) {
      showAuthToast({
        message: error instanceof Error ? error.message : '전송에 실패했습니다.',
        variant: 'error',
        durationMs: 2200,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  function openStatusModal() {
    if (!requireLogin('지원 현황은 로그인 후 확인할 수 있습니다.')) {
      return
    }

    setStatusOpen(true)
  }

  async function openReceivedRequest(application: LoungeApplication) {
    let next = application

    try {
      const detail = await projectApiRequest<LoungeApplicationSummary>(`/api/lounge/applications/${application.id}`, {}, 'required')
      next = mapApplication(detail)
    } catch {
      // 목록의 요약 정보로 계속 보여준다.
    }

    setReceivedDetail(next)
  }

  async function processRequest(action: 'approve' | 'reject') {
    if (!receivedDetail) {
      return
    }

    await projectApiRequest(
      `/api/lounge/applications/${receivedDetail.id}/${action === 'approve' ? 'approve' : 'reject'}`,
      { method: 'PATCH', body: JSON.stringify({}) },
      'required',
    )
    setReceivedDetail(null)
    setReloadKey((key) => key + 1)
  }

  function sendDM() {
    if (!memberMessage.trim()) {
      showAuthToast({
        message: '메시지를 입력해주세요.',
        variant: 'error',
        durationMs: 1800,
      })
      return
    }

    showAuthToast({
      message: '메시지가 전송되었습니다.',
      durationMs: 1800,
    })
    setMemberProfile(null)
    setMemberMessage('')
  }

  if (!session) return <LoginRequiredView />

  return (
    <div className="flex h-screen overflow-hidden text-gray-800">
      <ProjectAside activeKey="lounge" mySquads={asideSquads} />

      <div className="community-lounge-page contents">
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
          <ProjectHeader
            session={session}
            profileImage={profileImage}
            activeHref="/lounge-dashboard"
            onLoginClick={() => openAuthModal()}
            onLogout={handleLogout}
          />

          <main className="flex-1 overflow-hidden flex flex-col bg-[#F8F9FA] relative">
            <div id="viewLounge" className="flex-1 overflow-y-auto">
            <div className="bg-gray-900 text-white p-12 relative overflow-hidden">
              <div className="absolute right-0 top-0 w-96 h-96 bg-brand opacity-10 rounded-full blur-3xl transform translate-x-1/3 -translate-y-1/3"></div>
              <div className="relative z-10 max-w-5xl mx-auto">
                <span className="bg-brand/20 border border-brand/30 text-brand text-[11px] font-extrabold px-3 py-1 rounded-full mb-3 inline-block uppercase tracking-wider">
                  <i className="fas fa-rocket mr-1"></i> DevSquad Lounge
                </span>
                <h1 className="text-4xl font-extrabold mb-3 leading-tight">
                  함께 성장할 <span className="text-brand">최고의 동료</span>를 찾아보세요.
                </h1>
                <p className="text-gray-400 text-sm mb-8">
                  사이드 프로젝트부터 전공 스터디, 모각코까지. 당신의 열정을 함께 나눌 팀원들을 만나보세요.
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => openCreateModal()}
                    className="bg-brand hover:bg-green-600 text-white px-6 py-3 rounded-xl font-bold text-sm transition shadow-lg flex items-center gap-2 transform hover:-translate-y-1"
                  >
                    <i className="fas fa-plus"></i> 스쿼드 생성
                  </button>
                  <button
                    type="button"
                    onClick={openStatusModal}
                    className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl font-bold text-sm transition backdrop-blur-sm relative"
                  >
                    내 지원 현황 확인
                  </button>
                </div>
              </div>
            </div>

            <div className="max-w-6xl mx-auto p-8 -mt-8">
              <div className="bg-white p-2 rounded-2xl shadow-lg border border-gray-100 mb-8 flex items-center gap-2 flex-wrap lg:flex-nowrap">
                <div className="flex-1 relative w-full lg:w-auto">
                  <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                  <input
                    type="text"
                    id="searchInput"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="기술 스택, 제목, 태그 검색..."
                    className="community-lounge-search-input w-full pl-11 pr-4 py-3 rounded-xl text-sm outline-none focus:bg-gray-50 transition"
                  />
                </div>

                <div className="h-8 w-px bg-gray-200 mx-2 hidden lg:block"></div>

                <div className="flex items-center gap-4 w-full lg:w-auto justify-between lg:justify-start px-2 lg:px-0">
                  <select
                    id="sortSelect"
                    value={sort}
                    onChange={(event) => setSort(event.target.value as SortFilter)}
                    className="py-2 text-sm font-bold text-gray-600 bg-transparent outline-none cursor-pointer hover:text-gray-900 border-none focus:ring-0"
                  >
                    <option value="latest">최신순</option>
                    <option value="views">조회순</option>
                    <option value="deadline">마감 임박순</option>
                    <option value="available">여유 자리순</option>
                  </select>

                  <label className="flex items-center gap-1.5 text-sm font-bold text-gray-600 cursor-pointer hover:text-gray-900 shrink-0">
                    <input
                      type="checkbox"
                      id="hideClosedCheckbox"
                      checked={hideClosed}
                      onChange={(event) => setHideClosed(event.target.checked)}
                      className="w-4 h-4 text-brand focus:ring-brand rounded border-gray-300 cursor-pointer appearance-none border checked:bg-brand checked:border-brand flex items-center justify-center relative after:content-[''] after:absolute after:w-1.5 after:h-2.5 after:border-r-2 after:border-b-2 after:border-white after:rotate-45 after:-mt-0.5 checked:after:block after:hidden"
                    />
                    <span>모집중만 보기</span>
                  </label>
                </div>

                <div className="h-8 w-px bg-gray-200 mx-2 hidden lg:block"></div>

                <div className="flex gap-2 overflow-x-auto hide-scroll w-full lg:w-auto pb-2 lg:pb-0">
                  <FilterTab active={activeFilter === 'all'} label="전체" onClick={() => setActiveFilter('all')} />
                  <FilterTab active={activeFilter === 'project'} label="🚀 프로젝트" onClick={() => setActiveFilter('project')} />
                  <FilterTab active={activeFilter === 'join_wish'} label="🙋 참여 희망" onClick={() => setActiveFilter('join_wish')} />
                  <FilterTab active={activeFilter === 'study'} label="📚 스터디" onClick={() => setActiveFilter('study')} />
                  <FilterTab active={activeFilter === 'networking'} label="☕ 모각코" onClick={() => setActiveFilter('networking')} />
                  <FilterTab active={activeFilter === 'my_posts'} label="💪 내가 쓴 글" onClick={() => setActiveFilter('my_posts')} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 min-h-[300px]" id="cardList">
                {isLoading ? (
                  <div className="col-span-full py-20 flex flex-col items-center justify-center text-gray-400">
                    <i className="fas fa-spinner fa-spin text-4xl mb-3 opacity-50"></i>
                    <p className="font-bold text-sm">스쿼드 글을 불러오는 중입니다.</p>
                  </div>
                ) : loadError ? (
                  <div className="col-span-full py-20 flex flex-col items-center justify-center text-gray-400">
                    <i className="fas fa-circle-exclamation text-4xl mb-3 opacity-50"></i>
                    <p className="font-bold text-sm">{loadError}</p>
                  </div>
                ) : paginatedSquads.length === 0 ? (
                  <div className="col-span-full py-20 flex flex-col items-center justify-center text-gray-400">
                    <i className="fas fa-folder-open text-4xl mb-3 opacity-50"></i>
                    <p className="font-bold text-sm">조건에 맞는 스쿼드가 없습니다.</p>
                  </div>
                ) : (
                  paginatedSquads.map((squad) => (
                    <SquadCard
                      key={squad.id}
                      squad={squad}
                      currentUserProfileImage={profileImage}
                      onOpen={() => openDetailModal(squad)}
                      onEdit={() => openCreateModal(squad)}
                      onMemberOpen={(member) => {
                        setMemberProfile(member)
                        setMemberMessage('')
                      }}
                    />
                  ))
                )}
              </div>

              <div id="paginationContainer" className="mt-10 flex justify-center items-center gap-1.5 pb-8">
                {totalPages > 1 ? (
                  <>
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs transition ${
                        currentPage === 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-gray-100 text-gray-600 cursor-pointer'
                      }`}
                    >
                      <i className="fas fa-chevron-left"></i>
                    </button>
                    {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                      <button
                        type="button"
                        key={page}
                        onClick={() => {
                          setCurrentPage(page)
                          document.getElementById('viewLounge')?.scrollTo({ top: 400, behavior: 'smooth' })
                        }}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm transition ${
                          page === currentPage ? 'bg-gray-900 text-white shadow-md cursor-default' : 'text-gray-500 hover:bg-gray-100 cursor-pointer'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      type="button"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs transition ${
                        currentPage === totalPages ? 'opacity-30 cursor-not-allowed' : 'hover:bg-gray-100 text-gray-600 cursor-pointer'
                      }`}
                    >
                      <i className="fas fa-chevron-right"></i>
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </main>
      </div>

      {detailSquad ? (
        <DetailModal
          squad={detailSquad}
          onClose={() => setDetailSquad(null)}
          onApply={openApplyForm}
          onEdit={() => {
            openCreateModal(detailSquad)
            setDetailSquad(null)
          }}
          onCloseOnly={closeSquadOnly}
          onCreateWorkspace={closeAndCreateWorkspace}
        />
      ) : null}

      {applySquad ? (
        <ApplyModal
          squad={applySquad}
          form={applyForm}
          isSubmitting={isSubmitting}
          onClose={() => setApplySquad(null)}
          onChange={setApplyForm}
          onSubmit={submitApplication}
        />
      ) : null}

      {createOpen ? (
        <CreateSquadModal
          form={createForm}
          isSubmitting={isSubmitting}
          onClose={() => setCreateOpen(false)}
          onChange={setCreateForm}
          onTypeChange={updateCreateType}
          onSubmit={submitSquad}
        />
      ) : null}

      {statusOpen ? (
        <StatusModal
          tab={statusTab}
          sentApplications={sentApplications}
          receivedApplications={receivedApplications}
          onTabChange={setStatusTab}
          onClose={() => setStatusOpen(false)}
          onOpenReceived={openReceivedRequest}
        />
      ) : null}

      {receivedDetail ? (
        <ReceivedApplicationModal
          application={receivedDetail}
          onClose={() => setReceivedDetail(null)}
          onProcess={processRequest}
        />
      ) : null}

      {memberProfile ? (
        <MemberProfileModal
          member={memberProfile}
          message={memberMessage}
          onMessageChange={setMemberMessage}
          onClose={() => setMemberProfile(null)}
          onSend={sendDM}
        />
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
    </div>
  )
}

function FilterTab({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className={`tab-btn px-4 py-2 rounded-lg text-sm transition whitespace-nowrap ${
        active ? 'active font-bold text-brand' : 'font-medium text-gray-500 hover:bg-gray-50'
      }`}
      onClick={onClick}
    >
      {label}
    </button>
  )
}

function SquadCard({
  squad,
  currentUserProfileImage,
  onOpen,
  onEdit,
  onMemberOpen,
}: {
  squad: SquadPost
  currentUserProfileImage: string | null
  onOpen: () => void
  onEdit: () => void
  onMemberOpen: (member: SquadMember) => void
}) {
  const isJoin = squad.type === 'join_wish'

  return (
    <article
      className={`bg-white rounded-2xl p-6 border ${
        isJoin ? 'border-brand/30' : 'border-gray-200'
      } shadow-[0_2px_10px_rgba(0,0,0,0.02)] card-hover transition cursor-pointer relative flex flex-col group ${
        squad.isClosed ? 'opacity-70 grayscale-[0.3]' : ''
      }`}
      onClick={onOpen}
    >
      <div className="absolute top-5 right-5 flex items-center gap-1.5 z-10">
        {squad.isMine && !squad.isClosed ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onEdit()
            }}
            className="bg-white border border-gray-200 hover:bg-gray-100 text-gray-500 w-6 h-6 rounded flex items-center justify-center transition shadow-sm"
            title="수정"
          >
            <i className="fas fa-edit text-[10px]"></i>
          </button>
        ) : null}
        {squad.isClosed ? (
          <span className="bg-gray-200 text-gray-500 text-[10px] font-bold px-2 py-1 rounded shadow-sm">마감완료</span>
        ) : isJoin ? (
          <span className="bg-green-50 border border-green-200 text-brand text-[10px] font-bold px-2 py-1 rounded shadow-sm">
            참여희망
          </span>
        ) : (
          <span className="bg-red-50 border border-red-200 text-red-500 text-[10px] font-bold px-2 py-1 rounded shadow-sm">
            모집중
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 mb-4 pr-16">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 shadow-sm ${squad.iconBg} ${squad.iconCol}`}>
          <i className={`fas ${squad.iconClass}`}></i>
        </div>
        <div className="min-w-0">
          <h3 className="font-bold text-gray-900 leading-tight truncate">{squad.title}</h3>
          <span className="text-[10px] text-gray-400 font-bold">{squad.type.toUpperCase().replace('_', ' ')}</span>
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-4 line-clamp-2 h-10 font-medium whitespace-pre-line">
        {`${squad.desc.substring(0, 60)}${squad.desc.length > 60 ? '...' : ''}`}
      </p>

      <div className="mt-auto pt-4 border-t flex justify-between items-center">
        <div className="flex items-center gap-2 min-w-0">
          {squad.isMine ? (
            <UserAvatar
              name={squad.author}
              imageUrl={currentUserProfileImage}
              className="w-6 h-6 shadow-sm"
              iconClassName="text-[10px]"
            />
          ) : (
            <img src={diceAvatar(squad.authorImg)} className="w-6 h-6 rounded-full border shadow-sm" />
          )}
          <span className="text-xs font-bold text-gray-600 truncate">{squad.author}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-gray-400 font-medium">
            <i className="far fa-eye mr-1"></i>
            {formatViews(squad.views)}
          </span>
          <span className="text-xs font-bold text-gray-500">
            <i className="fas fa-user-friends mr-1"></i>
            {squad.current}/{squad.max}
          </span>
          <span className="text-[10px] text-red-500 font-bold">~ {squad.deadline}</span>
        </div>
      </div>

      {squad.isMine && squad.members.length > 0 ? (
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
          <span className="text-[10px] font-bold text-gray-400">참여 멤버:</span>
          <div className="flex -space-x-2">
            {squad.members.map((member) => (
              <button
                key={`${member.name}-${member.img}`}
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  onMemberOpen(member)
                }}
                title={member.name}
              >
                <img
                  src={diceAvatar(member.img)}
                  className="w-6 h-6 rounded-full border border-white cursor-pointer hover:scale-110 transition"
                />
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </article>
  )
}

function DetailModal({
  squad,
  onClose,
  onApply,
  onEdit,
  onCloseOnly,
  onCreateWorkspace,
}: {
  squad: SquadPost
  onClose: () => void
  onApply: () => void
  onEdit: () => void
  onCloseOnly: () => void
  onCreateWorkspace: () => void
}) {
  return (
    <div id="detailModal" className="modal active fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] modal-enter">
        <div className="p-6 border-b border-gray-100 flex justify-between items-start bg-gray-50">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl shadow-sm ${squad.iconBg} ${squad.iconCol}`}>
              <i className={`fas ${squad.iconClass}`}></i>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold text-gray-900 mb-1">{squad.title}</h2>
                <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded font-bold uppercase">{squad.type}</span>
              </div>
              <p className="text-sm text-gray-500 font-medium">Leader: {squad.author}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-900 text-lg">
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="p-8 overflow-y-auto space-y-8 flex-1">
          <div>
            <h3 className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wider">소개</h3>
            <div className="bg-white border border-gray-100 p-5 rounded-xl text-sm text-gray-700 leading-loose shadow-sm whitespace-pre-wrap font-medium">
              {squad.desc}
            </div>
          </div>
          <div>
            <h3 className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wider">기술 스택</h3>
            <div className="flex flex-wrap gap-2">
              {squad.tags.map((tag) => (
                <span key={tag} className="text-xs bg-gray-100 px-2 py-1 rounded font-bold">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-gray-100 bg-white flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-6 py-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition">
            닫기
          </button>
          {squad.isMine && !squad.isClosed ? (
            <>
              <button type="button" onClick={onCloseOnly} className="px-4 py-3 rounded-xl text-red-400 text-sm font-bold hover:bg-red-50 transition">
                단순 마감
              </button>
              <button type="button" onClick={onEdit} className="px-4 py-3 rounded-xl border border-gray-200 text-gray-700 text-sm font-bold hover:bg-gray-50 transition">
                수정
              </button>
              <button type="button" onClick={onCreateWorkspace} className="px-6 py-3 rounded-xl bg-brand text-white text-sm font-bold hover:bg-green-600 transition shadow-sm flex items-center gap-2">
                <i className="fas fa-rocket"></i> 마감 및 워크스페이스 생성
              </button>
            </>
          ) : !squad.isClosed ? (
            <button type="button" onClick={onApply} className="px-8 py-3 rounded-xl bg-brand text-white text-sm font-bold hover:bg-green-600 transition flex items-center gap-2">
              <i className="fas fa-hand-sparkles"></i>
              {squad.type === 'join_wish' ? '스카우트 제안하기' : '참여 신청하기'}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function ApplyModal({
  squad,
  form,
  isSubmitting,
  onClose,
  onChange,
  onSubmit,
}: {
  squad: SquadPost
  form: ApplyForm
  isSubmitting: boolean
  onClose: () => void
  onChange: (form: ApplyForm) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  return (
    <div id="applyModal" className="modal active fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <form onSubmit={onSubmit} className="bg-white w-full max-w-lg rounded-2xl shadow-2xl relative z-10 overflow-hidden modal-enter">
        <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900">신청서 / 제안서 작성</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-900">
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {squad.type === 'project' ? (
            <>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">희망 직군 <span className="text-red-500">*</span></label>
                <select
                  value={form.role}
                  onChange={(event) => onChange({ ...form, role: event.target.value })}
                  className="w-full border rounded-xl px-3 py-2 text-sm bg-white"
                >
                  {(squad.roles.length ? squad.roles : ['직군 미정']).map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">포트폴리오</label>
                <input
                  value={form.portfolio}
                  onChange={(event) => onChange({ ...form, portfolio: event.target.value })}
                  className="w-full border rounded-xl px-3 py-2 text-sm"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">지원 동기</label>
                <textarea
                  value={form.content}
                  onChange={(event) => onChange({ ...form, content: event.target.value })}
                  className="w-full border rounded-xl px-3 py-2 text-sm h-24"
                ></textarea>
              </div>
            </>
          ) : squad.type === 'study' ? (
            <>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">학습 수준</label>
                <input
                  value={form.role}
                  onChange={(event) => onChange({ ...form, role: event.target.value })}
                  className="w-full border rounded-xl px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">목표</label>
                <textarea
                  value={form.content}
                  onChange={(event) => onChange({ ...form, content: event.target.value })}
                  className="w-full border rounded-xl px-3 py-2 text-sm h-24"
                ></textarea>
              </div>
            </>
          ) : (
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">자기소개</label>
              <textarea
                value={form.content}
                onChange={(event) => onChange({ ...form, content: event.target.value })}
                className="w-full border rounded-xl px-3 py-2 text-sm h-24"
              ></textarea>
            </div>
          )}
        </div>
        <div className="p-5 border-t border-gray-100 bg-white flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-500 hover:bg-gray-50">
            취소
          </button>
          <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 rounded-xl bg-brand text-white text-sm font-bold hover:bg-green-600 shadow-md disabled:opacity-50 disabled:cursor-not-allowed">
            {isSubmitting ? '전송 중' : '보내기'}
          </button>
        </div>
      </form>
    </div>
  )
}

function CreateSquadModal({
  form,
  isSubmitting,
  onClose,
  onChange,
  onTypeChange,
  onSubmit,
}: {
  form: CreateForm
  isSubmitting: boolean
  onClose: () => void
  onChange: (form: CreateForm) => void
  onTypeChange: (type: LoungeType) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  return (
    <div id="createModal" className="modal active fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <form onSubmit={onSubmit} className="bg-white w-full max-w-lg rounded-2xl shadow-2xl relative z-10 p-8 modal-enter overflow-y-auto max-h-[90vh]">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">{form.editId ? '스쿼드 수정하기' : '새 스쿼드 만들기'}</h2>
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">스쿼드 제목</label>
            <input
              type="text"
              value={form.title}
              onChange={(event) => onChange({ ...form, title: event.target.value })}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:border-brand outline-none"
              placeholder="제목을 입력하세요"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">유형</label>
              <select
                value={form.type}
                onChange={(event) => onTypeChange(event.target.value as LoungeType)}
                className="community-lounge-create-type-select w-full border border-gray-300 rounded-xl px-3 py-3 text-sm outline-none bg-white font-medium"
              >
                <option value="project">팀 프로젝트 모집</option>
                <option value="join_wish">참여 희망 (Hire Me)</option>
                <option value="study">스터디 모집</option>
                <option value="networking">모각코</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">모집 마감일</label>
              <input
                type="date"
                value={form.deadline}
                onChange={(event) => onChange({ ...form, deadline: event.target.value })}
                className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm focus:border-brand outline-none bg-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">모집 인원</label>
            <input
              type="number"
              min="1"
              value={form.maxMembers}
              onChange={(event) => onChange({ ...form, maxMembers: event.target.value })}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:border-brand outline-none"
              placeholder="예: 4"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">기술 스택</label>
            <input
              type="text"
              value={form.tags}
              onChange={(event) => onChange({ ...form, tags: event.target.value })}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:border-brand outline-none"
              placeholder="#React #Spring"
            />
          </div>
          {form.type === 'project' ? (
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">모집 역할</label>
              <input
                type="text"
                value={form.roles}
                onChange={(event) => onChange({ ...form, roles: event.target.value })}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:border-brand outline-none"
                placeholder="Frontend Backend Designer"
              />
            </div>
          ) : null}
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">소개글</label>
            <textarea
              value={form.desc}
              onChange={(event) => onChange({ ...form, desc: event.target.value })}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm h-56 resize-none focus:border-brand outline-none"
            ></textarea>
          </div>
        </div>
        <div className="mt-8 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-6 py-3 bg-gray-100 rounded-xl text-sm font-bold text-gray-600">
            취소
          </button>
          <button type="submit" disabled={isSubmitting} className="px-8 py-3 bg-gray-900 text-white rounded-xl text-sm font-bold shadow-xl transition hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed">
            {isSubmitting ? '저장 중' : form.editId ? '수정 완료' : '생성하기'}
          </button>
        </div>
      </form>
    </div>
  )
}

function StatusModal({
  tab,
  sentApplications,
  receivedApplications,
  onTabChange,
  onClose,
  onOpenReceived,
}: {
  tab: StatusTab
  sentApplications: LoungeApplication[]
  receivedApplications: LoungeApplication[]
  onTabChange: (tab: StatusTab) => void
  onClose: () => void
  onOpenReceived: (application: LoungeApplication) => void
}) {
  const data = tab === 'sent' ? sentApplications : receivedApplications

  return (
    <div id="statusModal" className="modal active fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[80vh] modal-enter">
        <div className="p-4 border-b border-gray-100 flex flex-col bg-white">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">지원 및 요청 현황</h2>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-900">
              <i className="fas fa-times"></i>
            </button>
          </div>
          <div className="flex bg-gray-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => onTabChange('sent')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${tab === 'sent' ? 'bg-white shadow-sm text-brand' : 'text-gray-500'}`}
            >
              보낸 신청
            </button>
            <button
              type="button"
              onClick={() => onTabChange('received')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${tab === 'received' ? 'bg-white shadow-sm text-brand' : 'text-gray-500'}`}
            >
              받은 요청
            </button>
          </div>
        </div>
        <div className="p-5 space-y-3 overflow-y-auto bg-gray-50 flex-1">
          {data.length === 0 ? (
            <p className="text-center text-gray-400 text-xs py-10">내역이 없습니다.</p>
          ) : (
            data.map((item) => (
              <button
                key={item.id}
                type="button"
                disabled={tab !== 'received'}
                onClick={() => {
                  if (tab === 'received') {
                    onOpenReceived(item)
                  }
                }}
                className={`w-full text-left p-4 border rounded-xl bg-white flex flex-col gap-2 shadow-sm ${
                  tab === 'received' ? 'cursor-pointer hover:border-brand' : ''
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-extrabold text-gray-400 uppercase">{item.date}</span>
                  <span className="text-[10px] font-bold text-brand bg-green-50 px-2 py-0.5 rounded">{item.status}</span>
                </div>
                <p className="text-sm font-bold text-gray-900">{item.title}</p>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function ReceivedApplicationModal({
  application,
  onClose,
  onProcess,
}: {
  application: LoungeApplication
  onClose: () => void
  onProcess: (action: 'approve' | 'reject') => void
}) {
  return (
    <div id="receivedAppModal" className="modal active fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl relative overflow-hidden modal-enter">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="text-lg font-bold text-gray-900">받은 신청서 확인</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-900">
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
          <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
            <img src={diceAvatar(application.senderImg)} className="w-12 h-12 rounded-full border" />
            <div>
              <p className="font-bold text-gray-900">{application.sender}</p>
              <p className="text-xs text-gray-400">{application.date}</p>
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 mb-1">지원 제목</p>
            <p className="text-sm font-medium">{application.title}</p>
          </div>
          <div className="inline-block">
            {application.type === 'project_apply' ? (
              <span className="bg-blue-100 text-blue-600 text-[10px] font-bold px-2 py-1 rounded">프로젝트 지원</span>
            ) : (
              <span className="bg-green-100 text-green-600 text-[10px] font-bold px-2 py-1 rounded">스카우트 제안</span>
            )}
          </div>
          <div className="text-sm text-gray-700 bg-gray-50 p-4 rounded-xl leading-relaxed whitespace-pre-line border border-gray-100">
            {application.content}
          </div>
        </div>
        <div className="p-5 border-t border-gray-100 bg-white flex gap-2">
          <button type="button" onClick={() => onProcess('reject')} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-500 hover:bg-gray-50 transition">
            거절하기
          </button>
          <button type="button" onClick={() => onProcess('approve')} className="flex-1 py-3 rounded-xl bg-brand text-white text-sm font-bold hover:bg-green-600 shadow-md transition">
            승인하기
          </button>
        </div>
      </div>
    </div>
  )
}

function MemberProfileModal({
  member,
  message,
  onMessageChange,
  onClose,
  onSend,
}: {
  member: SquadMember
  message: string
  onMessageChange: (message: string) => void
  onClose: () => void
  onSend: () => void
}) {
  return (
    <div id="memberProfileModal" className="modal active fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl relative overflow-hidden modal-enter">
        <div className="relative bg-brand/10 h-24">
          <button type="button" onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800">
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="px-6 pb-6 -mt-10 text-center">
          <img src={diceAvatar(member.img)} className="w-20 h-20 rounded-full border-4 border-white shadow-md mx-auto mb-3" />
          <h3 className="text-xl font-bold text-gray-900">{member.name}</h3>
          <p className="text-sm text-gray-500 mb-6">{member.role || 'Member'}</p>
          <div className="space-y-3">
            <textarea
              value={message}
              onChange={(event) => onMessageChange(event.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm h-24 resize-none focus:border-brand outline-none"
              placeholder="간단한 메시지를 남겨보세요.."
            ></textarea>
            <button
              type="button"
              onClick={onSend}
              className="w-full py-3 bg-brand text-white rounded-xl text-sm font-bold hover:bg-green-600 shadow-lg transition flex items-center justify-center gap-2"
            >
              <i className="fas fa-paper-plane"></i> 메시지 보내기
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
