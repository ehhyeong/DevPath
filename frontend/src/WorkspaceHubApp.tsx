import axios from 'axios'
import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import AuthModal, { type AuthView } from './components/AuthModal'
import ProjectAside, { type ProjectAsideSquad } from './components/ProjectAside'
import { ProjectCreatePanel } from './ProjectCreateApp'
import ProjectHeader from './components/ProjectHeader'
import UserAvatar from './components/UserAvatar'
import { clearStoredAuthSession, getPostLoginRedirect, readStoredAuthSession } from './lib/auth-session'
import { AUTH_SESSION_SYNC_EVENT, clearStoredAuthSession, getPostLoginRedirect, readStoredAuthSession } from './lib/auth-session'
import LoginRequiredView from './components/LoginRequiredView'
import { showAuthToast } from './lib/auth-toast'
import { PROFILE_UPDATED_EVENT, type ProfileSyncPayload } from './lib/profile-sync'

type ProjectType = 'all' | 'solo' | 'squad' | 'mentoring'
type ProjectStatus = 'all' | 'progress' | 'completed'

type WorkspaceHubProject = {
  projectId: number
  domId: string
  menuId: string
  type: Exclude<ProjectType, 'all'>
  status: Exclude<ProjectStatus, 'all'>
  dashboardUrl: string
  title: string
  description: string
  progressPercent: number
  mentoringModeLabel?: string | null
  mentoringModeIcon?: string | null
  categoryLabel?: string | null
  roleLabel?: string | null
  footerKind: 'avatars' | 'mentor' | 'text'
  footerDateLabel?: string | null
  memberAvatarSeeds: string[]
  extraMemberCount?: number | null
  footerAvatarSeed?: string | null
  footerText?: string | null
  footerMetaText?: string | null
  footerMetaIcon?: string | null
}

type ApiEnvelope<T> = {
  success: boolean
  message?: string
  data: T
}

type LoungeShellResponse = {
  user?: {
    profileImage?: string | null
  } | null
  mySquads?: ProjectAsideSquad[]
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? ''

export default function WorkspaceHubApp() {
  const [session, setSession] = useState(() => readStoredAuthSession())
  const [authView, setAuthView] = useState<AuthView | null>(null)
  const [dataReloadKey, setDataReloadKey] = useState(0)
  const [asideSquads, setAsideSquads] = useState<ProjectAsideSquad[]>([])
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [projects, setProjects] = useState<WorkspaceHubProject[]>([])
  const [typeFilter, setTypeFilter] = useState<ProjectType>('all')
  const [statusFilter, setStatusFilter] = useState<ProjectStatus>('all')
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)
  const [settingsProject, setSettingsProject] = useState<WorkspaceHubProject | null>(null)
  const [membersModalOpen, setMembersModalOpen] = useState(false)
  const [projectCreateModalOpen, setProjectCreateModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    document.title = 'DevPath - 워크스페이스 허브'
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
    const currentSession = readStoredAuthSession()
    setSession(currentSession)
    const headers = currentSession?.accessToken
      ? { Authorization: `${currentSession.tokenType} ${currentSession.accessToken}` }
      : undefined

    async function load() {
      setLoading(true)
      try {
        const [shellResponse, projectsResponse] = await Promise.all([
          axios
            .get<ApiEnvelope<LoungeShellResponse>>(`${API_BASE_URL}/api/lounge/shell`, {
              headers,
              signal: controller.signal,
            })
            .catch(() => null),
          axios.get<ApiEnvelope<WorkspaceHubProject[]>>(`${API_BASE_URL}/api/workspaces/hub/projects`, {
            headers,
            signal: controller.signal,
          }),
        ])

        setAsideSquads(shellResponse?.data.data.mySquads ?? [])
        setProfileImage(shellResponse?.data.data.user?.profileImage ?? null)
        setProjects(projectsResponse.data.data ?? [])
      } catch (error) {
        if ((error as Error).name !== 'CanceledError') {
          console.error(error)
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => controller.abort()
  }, [dataReloadKey])

  useEffect(() => {
    const syncProfile = (event: Event) => {
      const profileEvent = event as CustomEvent<ProfileSyncPayload>
      setProfileImage(profileEvent.detail?.profileImage ?? null)
    }

    window.addEventListener(PROFILE_UPDATED_EVENT, syncProfile)

    return () => {
      window.removeEventListener(PROFILE_UPDATED_EVENT, syncProfile)
    const syncSession = () => setSession(readStoredAuthSession())
    window.addEventListener('storage', syncSession)
    window.addEventListener(AUTH_SESSION_SYNC_EVENT, syncSession)
    return () => {
      window.removeEventListener('storage', syncSession)
      window.removeEventListener(AUTH_SESSION_SYNC_EVENT, syncSession)
    }
  }, [])

  const visibleProjects = useMemo(
    () =>
      projects.filter((project) => {
        const typeMatches = typeFilter === 'all' || project.type === typeFilter
        const statusMatches = statusFilter === 'all' || project.status === statusFilter

        return typeMatches && statusMatches
      }),
    [projects, statusFilter, typeFilter],
  )

  const showCreateCard = (statusFilter === 'all' || statusFilter === 'progress') && typeFilter === 'all'

  function handleLogout() {
    clearStoredAuthSession()
    setSession(null)
    setAsideSquads([])
    setProfileImage(null)
    setProjects([])
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

  function closeAllDropdowns(event: MouseEvent<HTMLElement>) {
    const target = event.target as HTMLElement
    if (!target.closest('.dropdown-menu') && !target.closest('button')) {
      setActiveMenuId(null)
    }
  }

  function openSettingsModal(event: MouseEvent<HTMLElement>, project: WorkspaceHubProject) {
    event.preventDefault()
    event.stopPropagation()
    setActiveMenuId(null)
    setSettingsProject(project)
  }

  function openMembersModal(event: MouseEvent<HTMLElement>) {
    event.preventDefault()
    event.stopPropagation()
    setActiveMenuId(null)
    setMembersModalOpen(true)
  }

  function openProjectCreateModal(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation()
    setActiveMenuId(null)
    if (!readStoredAuthSession()?.accessToken) {
      openAuthModal('프로젝트 시작은 로그인 후 이용할 수 있습니다.')
      return
    }
    setProjectCreateModalOpen(true)
  }

  function openProjectCreateFromCard() {
    setActiveMenuId(null)
    if (!readStoredAuthSession()?.accessToken) {
      openAuthModal('프로젝트 시작은 로그인 후 이용할 수 있습니다.')
      return
    }
    setProjectCreateModalOpen(true)
  }

  function handleProjectCreated() {
    window.location.assign('workspace-hub.html')
  }

  if (!session) return <LoginRequiredView />

  return (
    <div className="flex h-screen overflow-hidden text-gray-800">
      <ProjectAside activeKey="workspace" mySquads={asideSquads} />

      <div className="flex-1 flex min-w-0 flex-col h-screen overflow-hidden">
        <ProjectHeader
          session={session}
          profileImage={profileImage}
          activeHref="lounge-dashboard.html"
          onLoginClick={() => openAuthModal()}
          onLogout={handleLogout}
        />

        <main className="flex-1 flex flex-col h-full overflow-hidden" onClick={closeAllDropdowns}>
          <div className="px-8 pt-7 pb-4 shrink-0">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
              <div>
                <p className="text-[11px] font-extrabold text-gray-400 tracking-wide">WORKSPACES</p>
                <h2 className="font-extrabold text-gray-900 text-2xl leading-tight">내 프로젝트</h2>
                <p className="text-sm text-gray-500 mt-1">진행 중인 스쿼드/멘토링 워크스페이스를 한 곳에서 관리하세요.</p>
              </div>
              <button
                type="button"
                onClick={openProjectCreateModal}
                className="workspace-hub-create-btn bg-brand hover:bg-green-600 text-white px-5 py-3 rounded-xl text-sm font-extrabold transition flex items-center gap-2 shadow-sm w-full md:w-auto justify-center"
              >
                <i className="fas fa-plus"></i> 새 프로젝트 시작
              </button>
            </div>
          </div>

          <div className="flex-1 p-8 overflow-y-auto pt-2 custom-scrollbar">
            <div className="workspace-hub-filter-row flex flex-wrap items-center gap-3 mb-6">
              <div className="workspace-hub-filter-group flex gap-1.5 bg-gray-100/80 p-0.5 rounded-full">
                <button onClick={() => setTypeFilter('all')} className={typeFilter === 'all' ? 'workspace-hub-filter-btn type-filter active px-3 py-1 rounded-full bg-white shadow-sm border border-gray-200 text-[11px] font-bold text-gray-700 hover:bg-gray-50 transition' : 'workspace-hub-filter-btn type-filter px-3 py-1 rounded-full border border-transparent text-[11px] font-bold text-gray-500 hover:text-gray-700 transition'}>전체 보기</button>
                <button onClick={() => setTypeFilter('solo')} className={typeFilter === 'solo' ? 'workspace-hub-filter-btn type-filter active px-3 py-1 rounded-full bg-white shadow-sm border border-gray-200 text-[11px] font-bold text-gray-700 hover:bg-gray-50 transition' : 'workspace-hub-filter-btn type-filter px-3 py-1 rounded-full border border-transparent text-[11px] font-bold text-gray-500 hover:text-gray-700 transition'}>개인 (Solo)</button>
                <button onClick={() => setTypeFilter('squad')} className={typeFilter === 'squad' ? 'workspace-hub-filter-btn type-filter active px-3 py-1 rounded-full bg-white shadow-sm border border-gray-200 text-[11px] font-bold text-gray-700 hover:bg-gray-50 transition' : 'workspace-hub-filter-btn type-filter px-3 py-1 rounded-full border border-transparent text-[11px] font-bold text-gray-500 hover:text-gray-700 transition'}>팀 (Squad)</button>
                <button onClick={() => setTypeFilter('mentoring')} className={typeFilter === 'mentoring' ? 'workspace-hub-filter-btn type-filter active px-3 py-1 rounded-full bg-white shadow-sm border border-gray-200 text-[11px] font-bold text-gray-700 hover:bg-gray-50 transition' : 'workspace-hub-filter-btn type-filter px-3 py-1 rounded-full border border-transparent text-[11px] font-bold text-gray-500 hover:text-gray-700 transition'}>멘토링</button>
              </div>
              <div className="w-px h-5 bg-gray-300 hidden sm:block"></div>
              <div className="workspace-hub-filter-group flex gap-1.5 bg-gray-100/80 p-0.5 rounded-full">
                <button onClick={() => setStatusFilter('all')} className={statusFilter === 'all' ? 'workspace-hub-filter-btn status-filter active px-3 py-1 rounded-full bg-white shadow-sm border border-gray-200 text-[11px] font-bold text-gray-700 hover:bg-gray-50 transition' : 'workspace-hub-filter-btn status-filter px-3 py-1 rounded-full border border-transparent text-[11px] font-bold text-gray-500 hover:text-gray-700 transition'}>상태 전체</button>
                <button onClick={() => setStatusFilter('progress')} className={statusFilter === 'progress' ? 'workspace-hub-filter-btn status-filter active px-3 py-1 rounded-full bg-white shadow-sm border border-gray-200 text-[11px] font-bold text-gray-700 hover:bg-gray-50 transition' : 'workspace-hub-filter-btn status-filter px-3 py-1 rounded-full border border-transparent text-[11px] font-bold text-gray-500 hover:text-gray-700 transition'}>진행 중</button>
                <button onClick={() => setStatusFilter('completed')} className={statusFilter === 'completed' ? 'workspace-hub-filter-btn status-filter active px-3 py-1 rounded-full bg-white shadow-sm border border-gray-200 text-[11px] font-bold text-gray-700 hover:bg-gray-50 transition' : 'workspace-hub-filter-btn status-filter px-3 py-1 rounded-full border border-transparent text-[11px] font-bold text-gray-500 hover:text-gray-700 transition'}>완료됨</button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {!loading &&
                visibleProjects.map((project) => (
                  <WorkspaceProjectCard
                    key={project.domId}
                    project={project}
                    activeMenuId={activeMenuId}
                    currentUserId={session?.userId ?? null}
                    currentUserProfileImage={profileImage}
                    setActiveMenuId={setActiveMenuId}
                    openSettingsModal={openSettingsModal}
                    openMembersModal={openMembersModal}
                  />
                ))}

              {loading ? (
                <div className="project-card bg-white rounded-xl p-5 cursor-pointer relative group flex flex-col">
                  <div className="text-sm font-bold text-gray-400">프로젝트를 불러오는 중입니다.</div>
                </div>
              ) : null}

              {!loading && showCreateCard ? <CreateProjectCard onCreate={openProjectCreateFromCard} /> : null}
            </div>
          </div>
        </main>
      </div>

      <SettingsModal project={settingsProject} onClose={() => setSettingsProject(null)} />
      <MembersModal
        open={membersModalOpen}
        currentUserProfileImage={profileImage}
        onClose={() => setMembersModalOpen(false)}
      />
      <ProjectCreateModal
        open={projectCreateModalOpen}
        onClose={() => setProjectCreateModalOpen(false)}
        onCreated={handleProjectCreated}
      />

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

function WorkspaceProjectCard({
  project,
  activeMenuId,
  currentUserId,
  currentUserProfileImage,
  setActiveMenuId,
  openSettingsModal,
  openMembersModal,
}: {
  project: WorkspaceHubProject
  activeMenuId: string | null
  currentUserId: number | null
  currentUserProfileImage: string | null
  setActiveMenuId: (menuId: string | null) => void
  openSettingsModal: (event: MouseEvent<HTMLElement>, project: WorkspaceHubProject) => void
  openMembersModal: (event: MouseEvent<HTMLElement>) => void
}) {
  const currentUserMemberSeed = currentUserId == null ? null : `workspace-member-${currentUserId}`

  function toggleDropdown(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation()
    setActiveMenuId(activeMenuId === project.menuId ? null : project.menuId)
  }

  function goToProject(event: MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement
    if (!target.closest('button') && !target.closest('.dropdown-menu') && !target.closest('a')) {
      window.location.assign(project.dashboardUrl)
    }
  }

  if (project.type === 'mentoring') {
    return (
      <div id={project.domId} className="project-card bg-white rounded-xl p-5 cursor-pointer relative group flex flex-col" data-type={project.type} data-status={project.status} onClick={goToProject}>
        <div className="flex justify-between items-start mb-3 relative">
          <div className="flex items-center gap-1 flex-wrap w-5/6">
            <span className="bg-purple-100 text-mentor text-[10px] font-bold px-2 py-1 rounded">MENTORING</span>
            <span className={getStatusBadgeClass(project.status)}>{getStatusLabel(project.status)}</span>
            {project.mentoringModeLabel ? (
              <span className="bg-purple-50 text-mentor text-[10px] font-bold px-2 py-1 rounded border border-purple-100">
                {project.mentoringModeIcon ? <i className={project.mentoringModeIcon}></i> : null}
                {project.mentoringModeIcon ? ' ' : null}
                {project.mentoringModeLabel}
              </span>
            ) : null}
            {project.categoryLabel ? <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-1 rounded border border-gray-200">{project.categoryLabel}</span> : null}
          </div>
          <button className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition shrink-0" onClick={toggleDropdown}>
            <i className="fas fa-ellipsis-h"></i>
          </button>
          <ProjectMenu
            project={project}
            visible={activeMenuId === project.menuId}
            openSettingsModal={openSettingsModal}
            openMembersModal={openMembersModal}
          />
        </div>
        <h3 className="font-bold text-gray-900 text-lg mb-1 group-hover:text-mentor transition" id={`title-${project.domId}`}>
          {project.title}
        </h3>
        <p className={project.roleLabel ? 'text-xs text-gray-500 mb-3 line-clamp-2' : 'text-xs text-gray-500 mb-4 line-clamp-2'} id={`desc-${project.domId}`}>
          {project.description}
        </p>

        {project.roleLabel ? (
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-2.5 mb-4 flex justify-between items-center shadow-sm">
            <span className="text-[10px] text-blue-500 font-extrabold tracking-wider">MY ROLE</span>
            <span className="text-xs font-extrabold text-blue-700">{project.roleLabel}</span>
          </div>
        ) : null}

        <div className="mt-auto">
          <div className="w-full bg-gray-100 rounded-full h-1.5 mb-3">
            <div className={getProgressBarClass(project)} style={{ width: `${project.progressPercent}%` }}></div>
          </div>
          <div className="flex items-center justify-between text-xs text-gray-400 border-t border-gray-100 pt-3">
            <div className="flex items-center gap-2">
              {project.footerAvatarSeed ? <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${project.footerAvatarSeed}`} className="w-5 h-5 rounded-full border border-gray-200" /> : null}
              <span className="font-bold text-gray-600">{project.footerText}</span>
            </div>
            <span className="text-brand font-bold">
              {project.footerMetaIcon ? <i className={project.footerMetaIcon}></i> : null}
              {project.footerMetaIcon ? ' ' : null}
              {project.footerMetaText}
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div id={project.domId} className="project-card bg-white rounded-xl p-5 cursor-pointer relative group flex flex-col" data-type={project.type} data-status={project.status} onClick={goToProject}>
      <div className="flex justify-between items-start mb-3 relative">
        <div className="flex items-center gap-1">
          <span className={getTypeBadgeClass(project.type)}>{getTypeLabel(project.type)}</span>
          <span className={getStatusBadgeClass(project.status)}>{getStatusLabel(project.status)}</span>
        </div>

        <button className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition" onClick={toggleDropdown}>
          <i className="fas fa-ellipsis-h"></i>
        </button>
        <ProjectMenu
          project={project}
          visible={activeMenuId === project.menuId}
          openSettingsModal={openSettingsModal}
          openMembersModal={openMembersModal}
        />
      </div>
      <h3 className={project.type === 'squad' ? 'font-bold text-gray-900 text-lg mb-1 group-hover:text-blue-600 transition' : 'font-bold text-gray-900 text-lg mb-1 group-hover:text-brand transition'} id={`title-${project.domId}`}>
        {project.title}
      </h3>
      <p className="text-xs text-gray-500 mb-4 line-clamp-2" id={`desc-${project.domId}`}>
        {project.description}
      </p>

      <div className="mt-auto">
        <div className="w-full bg-gray-100 rounded-full h-1.5 mb-3">
          <div className={getProgressBarClass(project)} style={{ width: `${project.progressPercent}%` }}></div>
        </div>
        <div className="flex items-center justify-between text-xs text-gray-400 border-t border-gray-100 pt-3">
          <span>
            <i className="far fa-clock mr-1"></i> {project.footerDateLabel}
          </span>
          <div className="flex -space-x-2">
            {project.memberAvatarSeeds.map((seed) => (
              seed === currentUserMemberSeed ? (
                <UserAvatar
                  key={seed}
                  name="나"
                  imageUrl={currentUserProfileImage}
                  className="w-6 h-6 border-white"
                  iconClassName="text-[10px]"
                />
              ) : (
                <img key={seed} src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`} className="w-6 h-6 rounded-full border border-white" />
              )
            ))}
            {project.extraMemberCount ? <div className="w-6 h-6 rounded-full bg-gray-100 border border-white flex items-center justify-center text-[9px] font-bold">+{project.extraMemberCount}</div> : null}
          </div>
        </div>
      </div>
    </div>
  )
}

function ProjectMenu({
  project,
  visible,
  openSettingsModal,
  openMembersModal,
}: {
  project: WorkspaceHubProject
  visible: boolean
  openSettingsModal: (event: MouseEvent<HTMLElement>, project: WorkspaceHubProject) => void
  openMembersModal: (event: MouseEvent<HTMLElement>) => void
}) {
  function closeOnly(event: MouseEvent<HTMLElement>) {
    event.preventDefault()
    event.stopPropagation()
  }

  return (
    <div id={project.menuId} className={visible ? 'dropdown-menu show' : 'dropdown-menu'}>
      {project.type === 'squad' ? (
        <ul className="py-1 text-sm text-gray-700">
          <li>
            <a href="#" onClick={(event) => openSettingsModal(event, project)} className="block px-4 py-2 hover:bg-gray-50 hover:text-brand">
              <i className="fas fa-cog mr-2"></i>설정
            </a>
          </li>
          <li>
            <a href="#" onClick={openMembersModal} className="block px-4 py-2 hover:bg-gray-50 hover:text-brand">
              <i className="fas fa-users mr-2"></i>멤버 관리
            </a>
          </li>
          <li className="complete-menu-item border-t border-gray-100">
            <a href="#" onClick={closeOnly} className="block px-4 py-2 text-brand hover:bg-green-50">
              <i className="fas fa-check-circle mr-2"></i>프로젝트 완료
            </a>
          </li>
          <li className="border-t border-gray-100">
            <a href="#" onClick={closeOnly} className="block px-4 py-2 text-red-500 hover:bg-red-50">
              <i className="fas fa-sign-out-alt mr-2"></i>나가기
            </a>
          </li>
        </ul>
      ) : (
        <ul className="py-1 text-sm text-gray-700">
          {project.roleLabel ? (
            <li>
              <a href="#" onClick={openMembersModal} className="block px-4 py-2 hover:bg-gray-50 hover:text-brand">
                <i className="fas fa-users mr-2"></i>팀 멤버
              </a>
            </li>
          ) : null}
          <li className="border-t border-gray-100">
            <a href="#" onClick={closeOnly} className="block px-4 py-2 text-red-500 hover:bg-red-50">
              <i className="fas fa-sign-out-alt mr-2"></i>포기하기
            </a>
          </li>
        </ul>
      )}
    </div>
  )
}

function CreateProjectCard({ onCreate }: { onCreate: () => void }) {
  return (
    <div id="create-new-card" onClick={onCreate} className="rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center p-5 cursor-pointer hover:border-brand hover:bg-green-50 transition group h-full min-h-[180px]">
      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3 group-hover:bg-white transition">
        <i className="fas fa-plus text-gray-400 group-hover:text-brand text-lg"></i>
      </div>
      <span className="text-sm font-bold text-gray-500 group-hover:text-brand">새 프로젝트 시작</span>
    </div>
  )
}

function SettingsModal({ project, onClose }: { project: WorkspaceHubProject | null; onClose: () => void }) {
  function handleSave() {
    onClose()
    showAuthToast({ message: '변경사항이 저장되었습니다.', durationMs: 2200 })
  }

  return (
    <div id="settingsModal" className={project ? 'workspace-hub-modal-overlay fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 active' : 'workspace-hub-modal-overlay fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4'}>
      <div className="workspace-hub-modal-content workspace-hub-settings-modal bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
        <div className="workspace-hub-settings-header p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="workspace-hub-settings-title font-extrabold text-gray-900 text-lg">
            <i className="fas fa-cog text-brand mr-2"></i>프로젝트 설정
          </h3>
          <button onClick={onClose} className="workspace-hub-settings-close text-gray-400 hover:text-gray-600 transition">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>
        <div className="workspace-hub-settings-body p-6 space-y-4">
          <div>
            <label className="workspace-hub-settings-label block text-xs font-bold text-gray-600 mb-1.5">프로젝트 이름</label>
            <input value={project?.title ?? ''} readOnly className="workspace-hub-settings-control w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-brand focus:ring-1 focus:ring-brand outline-none transition" />
          </div>
          <div>
            <label className="workspace-hub-settings-label block text-xs font-bold text-gray-600 mb-1.5">설명</label>
            <textarea value={project?.description ?? ''} readOnly rows={3} className="workspace-hub-settings-control workspace-hub-settings-textarea w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-brand focus:ring-1 focus:ring-brand outline-none transition resize-none"></textarea>
          </div>
          <div>
            <label className="workspace-hub-settings-label block text-xs font-bold text-gray-600 mb-1.5">공개 범위</label>
            <select className="workspace-hub-settings-control w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-brand outline-none transition bg-white" defaultValue="팀원만 보기 (Private)">
              <option>팀원만 보기 (Private)</option>
              <option>라운지 공개 (Public)</option>
            </select>
          </div>
        </div>
        <div className="workspace-hub-settings-footer p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-2">
          <button onClick={onClose} className="workspace-hub-settings-secondary-btn px-5 py-2 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-200 transition">
            취소
          </button>
          <button onClick={handleSave} className="workspace-hub-settings-primary-btn px-5 py-2 rounded-xl text-sm font-bold bg-brand text-white hover:bg-green-600 transition">
            변경사항 저장
          </button>
        </div>
      </div>
    </div>
  )
}

function MembersModal({
  open,
  currentUserProfileImage,
  onClose,
}: {
  open: boolean
  currentUserProfileImage: string | null
  onClose: () => void
}) {
  return (
    <div id="membersModal" className={open ? 'workspace-hub-modal-overlay fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 active' : 'workspace-hub-modal-overlay fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4'}>
      <div className="workspace-hub-modal-content workspace-hub-members-modal bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-extrabold text-gray-900 text-lg">
            <i className="fas fa-users text-blue-500 mr-2"></i>멤버 관리
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>
        <div className="workspace-hub-members-invite p-4 border-b border-gray-50 flex justify-between items-center bg-blue-50">
          <span className="workspace-hub-members-invite-text text-sm font-bold text-blue-800">초대 링크 공유하기</span>
          <button className="workspace-hub-members-copy bg-white border border-blue-200 text-blue-600 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-blue-100 transition shadow-sm">
            <i className="fas fa-copy mr-1"></i>복사
          </button>
        </div>
        <div className="workspace-hub-members-list p-2 max-h-60 overflow-y-auto">
          <div className="workspace-hub-member-row flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition">
            <div className="flex items-center gap-3">
              <UserAvatar
                name="나"
                imageUrl={currentUserProfileImage}
                className="workspace-hub-member-avatar w-10 h-10 shadow-sm"
                iconClassName="text-sm"
              />
              <div>
                <p className="workspace-hub-member-name text-sm font-bold text-gray-900 flex items-center gap-1">
                  나 <span className="bg-brand text-white text-[9px] px-1.5 py-0.5 rounded">팀장</span>
                </p>
                <p className="workspace-hub-member-role text-[10px] text-gray-400">Backend</p>
              </div>
            </div>
          </div>
          <div className="workspace-hub-member-row flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition">
            <div className="flex items-center gap-3">
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=A" className="workspace-hub-member-avatar w-10 h-10 rounded-full border border-gray-200 shadow-sm" />
              <div>
                <p className="workspace-hub-member-name text-sm font-bold text-gray-900">김데브</p>
                <p className="workspace-hub-member-role text-[10px] text-gray-400">Frontend</p>
              </div>
            </div>
            <button className="workspace-hub-member-remove-btn text-xs font-bold text-red-400 bg-red-50 hover:bg-red-500 hover:text-white px-3 py-1.5 rounded-lg transition">내보내기</button>
          </div>
        </div>
        <div className="workspace-hub-members-footer p-4 border-t border-gray-100 bg-gray-50 text-center">
          <button onClick={onClose} className="workspace-hub-members-footer-button w-full py-2.5 rounded-xl text-sm font-bold bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition shadow-sm">
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}

function ProjectCreateModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
}) {
  if (!open) {
    return null
  }

  return (
    <div className="workspace-hub-modal-overlay fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 active" onClick={onClose}>
      <div className="workspace-hub-modal-content workspace-hub-project-create-modal w-full max-w-4xl" onClick={(event) => event.stopPropagation()}>
        <ProjectCreatePanel onClose={onClose} onCreated={onCreated} />
      </div>
    </div>
  )
}

function getTypeBadgeClass(type: WorkspaceHubProject['type']) {
  if (type === 'solo') {
    return 'bg-green-100 text-brand text-[10px] font-bold px-2 py-1 rounded'
  }

  if (type === 'mentoring') {
    return 'bg-purple-100 text-mentor text-[10px] font-bold px-2 py-1 rounded'
  }

  return 'bg-blue-100 text-blue-600 text-[10px] font-bold px-2 py-1 rounded'
}

function getTypeLabel(type: WorkspaceHubProject['type']) {
  if (type === 'solo') {
    return 'SOLO'
  }

  if (type === 'mentoring') {
    return 'MENTORING'
  }

  return 'SQUAD'
}

function getStatusBadgeClass(status: WorkspaceHubProject['status']) {
  if (status === 'completed') {
    return 'status-badge bg-green-50 text-brand text-[10px] font-bold px-2 py-1 rounded border border-green-100'
  }

  return 'status-badge bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-1 rounded'
}

function getStatusLabel(status: WorkspaceHubProject['status']) {
  return status === 'completed' ? '완료됨' : '진행 중'
}

function getProgressBarClass(project: WorkspaceHubProject) {
  if (project.status === 'completed') {
    return 'progress-bar bg-brand h-1.5 rounded-full transition-all duration-500'
  }

  if (project.type === 'mentoring') {
    return 'bg-mentor h-1.5 rounded-full'
  }

  if (project.type === 'solo') {
    return 'progress-bar bg-brand h-1.5 rounded-full'
  }

  return 'progress-bar bg-blue-500 h-1.5 rounded-full'
}
