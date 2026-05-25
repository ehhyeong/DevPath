import { useEffect, useMemo, useState, type FormEvent } from 'react'
import AuthModal, { type AuthView } from './components/AuthModal'
import SquadWorkspaceHeader from './components/SquadWorkspaceHeader'
import UserAvatar from './components/UserAvatar'
import { clearStoredAuthSession, getPostLoginRedirect, readStoredAuthSession } from './lib/auth-session'
import { projectApiRequest } from './project-api'
import { createSquadNotification, squadActorName } from './squad-notifications'

type WorkspaceStatus = 'ACTIVE' | 'ARCHIVED'
type WorkspaceType = 'SOLO' | 'SQUAD' | 'MENTORING'
type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE'
type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH'
type FilterType = 'all' | 'me' | 'urgent'

type WorkspaceMember = {
  memberId: number
  learnerId: number
  learnerName?: string | null
  profileImage?: string | null
}

type WorkspaceDashboard = {
  workspaceId: number
  name: string
  type: WorkspaceType
  status: WorkspaceStatus
  ownerId: number
  members: WorkspaceMember[]
  unresolvedTaskCount: number
}

type WorkspaceTask = {
  taskId: number
  workspaceId: number
  title: string
  description?: string | null
  status: TaskStatus
  priority?: TaskPriority | null
  assigneeId?: number | null
  dueDate?: string | null
}

type TaskFormState = {
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  assigneeId: string
  dueDate: string
}

const TASK_COLUMNS: Array<{
  id: TaskStatus
  title: string
  tone: string
  titleClass: string
  countClass: string
  dotClass: string
}> = [
  {
    id: 'TODO',
    title: '할 일 (To Do)',
    tone: 'bg-gray-200/50 border-gray-200',
    titleClass: 'text-gray-800',
    countClass: 'text-gray-500 border-gray-200',
    dotClass: 'bg-gray-400',
  },
  {
    id: 'IN_PROGRESS',
    title: '진행 중 (In Progress)',
    tone: 'bg-blue-50/50 border-blue-100',
    titleClass: 'text-blue-800',
    countClass: 'text-blue-600 border-blue-200',
    dotClass: 'bg-blue-500',
  },
  {
    id: 'IN_REVIEW',
    title: '리뷰 대기 (In Review)',
    tone: 'bg-yellow-50/60 border-yellow-200',
    titleClass: 'text-yellow-800',
    countClass: 'text-yellow-600 border-yellow-300',
    dotClass: 'bg-yellow-500 animate-pulse',
  },
  {
    id: 'DONE',
    title: '완료 (Done)',
    tone: 'bg-green-50/50 border-green-100',
    titleClass: 'text-green-800',
    countClass: 'text-green-600 border-green-200',
    dotClass: 'bg-green-500',
  },
]

function getWorkspaceIdFromUrl() {
  const params = new URLSearchParams(window.location.search)
  const value = params.get('workspaceId') ?? params.get('squadId')
  const parsed = Number(value)

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function navHref(path: string, workspaceId: number | null) {
  return workspaceId ? `${path}?workspaceId=${workspaceId}` : path
}

function createEmptyForm(): TaskFormState {
  return {
    title: '',
    description: '',
    status: 'TODO',
    priority: 'MEDIUM',
    assigneeId: '',
    dueDate: '',
  }
}

function priorityLabel(priority?: TaskPriority | null) {
  if (priority === 'HIGH') {
    return '긴급'
  }

  if (priority === 'LOW') {
    return '낮음'
  }

  return '보통'
}

function priorityClass(priority?: TaskPriority | null) {
  if (priority === 'HIGH') {
    return 'bg-red-50 text-red-500 border-red-100'
  }

  if (priority === 'LOW') {
    return 'bg-gray-50 text-gray-500 border-gray-100'
  }

  return 'bg-green-100 text-green-600 border-green-100'
}

function statusAccent(status: TaskStatus) {
  if (status === 'IN_PROGRESS') {
    return 'border-l-blue-400'
  }

  if (status === 'IN_REVIEW') {
    return 'border-l-yellow-400'
  }

  if (status === 'DONE') {
    return 'border-l-green-400'
  }

  return 'border-l-transparent'
}

function tagForTask(task: WorkspaceTask) {
  const haystack = `${task.title} ${task.description ?? ''}`.toLowerCase()

  if (/(react|ui|frontend|front|next|tailwind)/i.test(haystack)) {
    return { label: '프론트엔드 (FE)', className: 'bg-blue-50 text-blue-600 border-blue-200' }
  }

  if (/(api|spring|server|jwt|redis|payment|backend|db|database)/i.test(haystack)) {
    return { label: '백엔드 (BE)', className: 'bg-purple-50 text-purple-600 border-purple-200' }
  }

  if (/(design|ux|figma|wireframe)/i.test(haystack)) {
    return { label: '디자인 (UX/UI)', className: 'bg-pink-50 text-pink-600 border-pink-200' }
  }

  return { label: '작업', className: 'bg-gray-50 text-gray-600 border-gray-200' }
}

function formatDueDate(value?: string | null) {
  if (!value) {
    return '마감 없음'
  }

  const date = new Date(`${value}T00:00:00`)

  if (Number.isNaN(date.getTime())) {
    return '마감 없음'
  }

  return `${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')} 마감`
}

function daysUntilDue(value?: string | null) {
  if (!value) {
    return null
  }

  const today = new Date()
  const due = new Date(`${value}T00:00:00`)

  today.setHours(0, 0, 0, 0)

  if (Number.isNaN(due.getTime())) {
    return null
  }

  return Math.ceil((due.getTime() - today.getTime()) / 86400000)
}

function ddayLabel(value?: string | null) {
  const days = daysUntilDue(value)

  if (days == null) {
    return null
  }

  if (days === 0) {
    return 'D-Day'
  }

  if (days < 0) {
    return `D+${Math.abs(days)}`
  }

  return `D-${days}`
}

function isUrgentTask(task: WorkspaceTask) {
  const days = daysUntilDue(task.dueDate)
  return task.priority === 'HIGH' || (days != null && days <= 2 && task.status !== 'DONE')
}

function taskToForm(task: WorkspaceTask): TaskFormState {
  return {
    title: task.title,
    description: task.description ?? '',
    status: task.status,
    priority: task.priority ?? 'MEDIUM',
    assigneeId: task.assigneeId ? String(task.assigneeId) : '',
    dueDate: task.dueDate ?? '',
  }
}

export default function SquadWorkspaceApp() {
  const workspaceId = useMemo(getWorkspaceIdFromUrl, [])
  const [session, setSession] = useState(() => readStoredAuthSession())
  const [authView, setAuthView] = useState<AuthView | null>(null)
  const [dashboard, setDashboard] = useState<WorkspaceDashboard | null>(null)
  const [tasks, setTasks] = useState<WorkspaceTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterType>('all')
  const [editingTask, setEditingTask] = useState<WorkspaceTask | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<TaskFormState>(createEmptyForm)
  const [saving, setSaving] = useState(false)
  const [draggingTaskId, setDraggingTaskId] = useState<number | null>(null)

  useEffect(() => {
    document.title = 'DevPath - 작업 현황판'
    const html = document.documentElement
    const body = document.body

    html.classList.add('squad-dashboard-document')
    body.classList.add('squad-dashboard-body')

    return () => {
      html.classList.remove('squad-dashboard-document')
      body.classList.remove('squad-dashboard-body')
    }
  }, [])

  useEffect(() => {
    if (!workspaceId) {
      setError('워크스페이스 정보를 찾을 수 없습니다.')
      setLoading(false)
      return
    }

    let ignore = false

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const [dashboardData, taskData] = await Promise.all([
          projectApiRequest<WorkspaceDashboard>(`/api/workspaces/${workspaceId}/dashboard`, {}, 'required'),
          projectApiRequest<WorkspaceTask[]>(`/api/workspaces/${workspaceId}/tasks`, {}, 'required'),
        ])

        if (ignore) {
          return
        }

        setDashboard(dashboardData)
        setTasks(taskData ?? [])
      } catch {
        if (!ignore) {
          setError('작업 현황판을 불러오지 못했습니다.')
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      ignore = true
    }
  }, [workspaceId])

  function handleLogout() {
    clearStoredAuthSession()
    setSession(null)
    setAuthView('login')
  }

  function handleAuthenticated() {
    const nextSession = readStoredAuthSession()

    if (nextSession?.role === 'ROLE_ADMIN') {
      window.location.replace(getPostLoginRedirect(nextSession.role))
      return
    }

    setSession(nextSession)
    setAuthView(null)
    window.location.reload()
  }

  function updateTaskInState(nextTask: WorkspaceTask) {
    setTasks((current) => current.map((task) => (task.taskId === nextTask.taskId ? nextTask : task)))
  }

  function openCreateModal(status: TaskStatus = 'TODO') {
    setEditingTask(null)
    setForm({ ...createEmptyForm(), status })
    setModalOpen(true)
  }

  function openEditModal(task: WorkspaceTask) {
    setEditingTask(task)
    setForm(taskToForm(task))
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingTask(null)
    setForm(createEmptyForm())
  }

  async function saveTask(event: FormEvent) {
    event.preventDefault()

    if (!workspaceId || !form.title.trim()) {
      return
    }

    setSaving(true)

    try {
      const assigneeId = form.assigneeId ? Number(form.assigneeId) : null

      if (editingTask) {
        const updated = await projectApiRequest<WorkspaceTask>(
          `/api/workspaces/${workspaceId}/tasks/${editingTask.taskId}`,
          {
            method: 'PUT',
            body: JSON.stringify({
              title: form.title.trim(),
              description: form.description.trim(),
              priority: form.priority,
              dueDate: form.dueDate || null,
            }),
          },
          'required',
        )
        const withAssignee = await projectApiRequest<WorkspaceTask>(
          `/api/workspaces/${workspaceId}/tasks/${updated.taskId}/assignee`,
          {
            method: 'PATCH',
            body: JSON.stringify({ assigneeId }),
          },
          'required',
        )
        const withStatus = await projectApiRequest<WorkspaceTask>(
          `/api/workspaces/${workspaceId}/tasks/${withAssignee.taskId}/status`,
          {
            method: 'PATCH',
            body: JSON.stringify({ status: form.status }),
          },
          'required',
        )

        updateTaskInState(withStatus)
        void createSquadNotification(workspaceId, {
          pageKey: 'squad-workspace',
          message: `${squadActorName(session?.name)}님이 작업 "${withStatus.title}"을 수정했습니다.`,
          targetPath: '/squad-workspace',
        })
      } else {
        const created = await projectApiRequest<WorkspaceTask>(
          `/api/workspaces/${workspaceId}/tasks`,
          {
            method: 'POST',
            body: JSON.stringify({
              title: form.title.trim(),
              description: form.description.trim(),
              priority: form.priority,
              assigneeId,
              dueDate: form.dueDate || null,
            }),
          },
          'required',
        )
        const normalized =
          form.status === 'TODO'
            ? created
            : await projectApiRequest<WorkspaceTask>(
                `/api/workspaces/${workspaceId}/tasks/${created.taskId}/status`,
                {
                  method: 'PATCH',
                  body: JSON.stringify({ status: form.status }),
                },
                'required',
              )

        setTasks((current) => [normalized, ...current])
        void createSquadNotification(workspaceId, {
          pageKey: 'squad-workspace',
          message: `${squadActorName(session?.name)}님이 새 작업 "${normalized.title}"을 등록했습니다.`,
          targetPath: '/squad-workspace',
        })
      }

      closeModal()
    } finally {
      setSaving(false)
    }
  }

  async function moveTask(taskId: number, status: TaskStatus) {
    if (!workspaceId) {
      return
    }

    const current = tasks.find((task) => task.taskId === taskId)

    if (!current || current.status === status) {
      return
    }

    setTasks((list) => list.map((task) => (task.taskId === taskId ? { ...task, status } : task)))

    try {
      const updated = await projectApiRequest<WorkspaceTask>(
        `/api/workspaces/${workspaceId}/tasks/${taskId}/status`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        },
        'required',
      )

      updateTaskInState(updated)
      void createSquadNotification(workspaceId, {
        pageKey: 'squad-workspace',
        message: `${squadActorName(session?.name)}님이 작업 "${updated.title}" 상태를 ${updated.status}로 변경했습니다.`,
        targetPath: '/squad-workspace',
      })
    } catch {
      updateTaskInState(current)
    }
  }

  const members = dashboard?.members ?? []
  const memberById = new Map(members.map((member) => [member.learnerId, member]))
  const projectName = dashboard?.name ?? '스쿼드 프로젝트'
  const visibleTasks = tasks.filter((task) => {
    if (filter === 'me') {
      return Boolean(session?.userId && task.assigneeId === session.userId)
    }

    if (filter === 'urgent') {
      return isUrgentTask(task)
    }

    return true
  })


  function renderTaskCard(task: WorkspaceTask) {
    const assignee = task.assigneeId ? memberById.get(task.assigneeId) : null
    const tag = tagForTask(task)
    const dday = ddayLabel(task.dueDate)
    const urgent = isUrgentTask(task)

    return (
      <div
        key={task.taskId}
        draggable
        onDragStart={() => setDraggingTaskId(task.taskId)}
        onDragEnd={() => setDraggingTaskId(null)}
        onClick={() => openEditModal(task)}
        className={`kanban-card bg-white p-4 rounded-xl shadow-sm border-l-4 ${statusAccent(task.status)}`}
      >
        <div className="flex justify-between items-start mb-2">
          <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded border ${tag.className}`}>{tag.label}</span>
          <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">#{task.taskId}</span>
        </div>
        <h4 className="font-bold text-gray-900 text-sm mb-3 leading-snug">{task.title}</h4>

        <div className="flex justify-between items-center mb-3 pt-3 border-t border-gray-50">
          <div className={`text-[10px] font-bold flex items-center gap-1 ${urgent ? 'text-red-500' : 'text-gray-500'}`}>
            <i className="far fa-calendar-alt"></i> {formatDueDate(task.dueDate)}
          </div>
          {dday ? (
            <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${urgent ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-green-100 text-green-600'}`}>
              {dday}
            </span>
          ) : null}
        </div>

        <div className="flex justify-between items-end mt-2">
          <div className="flex items-center gap-2 min-w-0">
            {assignee ? (
              <>
                <UserAvatar
                  name={assignee.learnerName ?? '팀원'}
                  imageUrl={assignee.profileImage}
                  className="w-6 h-6 rounded-full border border-gray-200 bg-gray-50"
                  iconClassName="text-[10px]"
                />
                <span className="text-[10px] font-bold text-gray-600 truncate">{assignee.learnerName ?? '팀원'}</span>
              </>
            ) : (
              <span className="text-[10px] font-bold text-gray-400">미지정</span>
            )}
          </div>
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-extrabold border ${priorityClass(task.priority)}`}>
            {task.priority === 'HIGH' ? <i className="fas fa-fire mr-0.5"></i> : null}
            {priorityLabel(task.priority)}
          </span>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="squad-dashboard-page flex h-screen overflow-hidden text-gray-800 items-center justify-center bg-[#F9FAFB]">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-green-100 border-t-brand"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="squad-dashboard-page flex h-screen overflow-hidden text-gray-800 items-center justify-center bg-[#F9FAFB]">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <i className="fas fa-circle-exclamation text-3xl text-red-400 mb-3"></i>
          <p className="font-extrabold text-gray-900">{error}</p>
          <a href="/workspace-hub" className="inline-flex mt-5 px-5 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold">
            워크스페이스로 돌아가기
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="squad-dashboard-page squad-workspace-page flex h-screen overflow-hidden text-gray-800">
      <aside className="w-20 hover:w-64 bg-white border-r border-gray-200 flex flex-col shrink-0 z-50 transition-all duration-300 ease-in-out group shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <a
          href="/workspace-hub"
          className="h-20 flex items-center px-5 cursor-pointer hover:bg-gray-50 transition border-b border-gray-100 shrink-0"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-md">
            <i className="fas fa-arrow-left"></i>
          </div>
          <div className="sidebar-text flex flex-col justify-center">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">목록으로 돌아가기</p>
            <p className="font-extrabold text-gray-900 truncate w-36 leading-tight">{projectName}</p>
          </div>
        </a>

        <nav className="flex-1 px-3 py-6 overflow-y-auto custom-scrollbar">
          <a href={navHref('/squad-dashboard', workspaceId)} className="nav-item">
            <i className="fas fa-chart-pie w-6 text-center text-lg"></i>
            <span className="sidebar-text">대시보드</span>
          </a>
          <a href={navHref('/squad-workspace', workspaceId)} className="nav-item active">
            <i className="fas fa-columns w-6 text-center text-lg"></i>
            <span className="sidebar-text">작업 현황판</span>
          </a>
          <a href={navHref('/squad-review', workspaceId)} className="nav-item">
            <i className="fas fa-code-branch w-6 text-center text-lg"></i>
            <span className="sidebar-text flex-1">코드 피드백</span>
            {tasks.length > 0 ? <span className="sidebar-text bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full ml-auto">1</span> : null}
          </a>
          <a href={navHref('/squad-erd', workspaceId)} className="nav-item">
            <i className="fas fa-project-diagram w-6 text-center text-lg"></i>
            <span className="sidebar-text">ERD 설계</span>
          </a>
          <a href={navHref('/squad-schedule', workspaceId)} className="nav-item">
            <i className="fas fa-calendar-alt w-6 text-center text-lg"></i>
            <span className="sidebar-text">일정 관리</span>
          </a>
          <a href={navHref('/squad-files', workspaceId)} className="nav-item">
            <i className="fas fa-folder-open w-6 text-center text-lg"></i>
            <span className="sidebar-text">팀 자료실</span>
          </a>
          <a href={navHref('/squad-meeting', workspaceId)} className="nav-item">
            <i className="fas fa-headset w-6 text-center text-lg"></i>
            <span className="sidebar-text">음성 회의</span>
          </a>
          <div className="h-px bg-gray-100 my-4 mx-2"></div>
          <a href={navHref('/squad-settings', workspaceId)} className="nav-item">
            <i className="fas fa-cog w-6 text-center text-lg"></i>
            <span className="sidebar-text">스쿼드 설정</span>
          </a>
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-[#F9FAFB]">
        <SquadWorkspaceHeader
          workspaceId={workspaceId}
          projectName={projectName}
          members={members}
          statusLabel="진행 중"
          currentUserName={session?.name}
          onLogout={handleLogout}
        />

        <main className="flex-1 flex flex-col overflow-hidden relative">
          <div className="px-8 py-6 shrink-0 bg-white border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 z-10">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
                <i className="fas fa-columns text-brand"></i> 팀 작업 현황판
              </h1>
              <p className="text-sm text-gray-500 mt-1">팀원들의 작업 내역을 추가하고, 카드를 이동하여 진행 상태를 직관적으로 공유하세요.</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex bg-gray-50 border border-gray-200 rounded-xl p-1 shadow-inner">
                <button className={filter === 'all' ? 'filter-tab active px-4 py-1.5 rounded-lg text-xs font-bold' : 'filter-tab px-4 py-1.5 rounded-lg text-xs font-bold text-gray-500'} onClick={() => setFilter('all')}>
                  전체 보기
                </button>
                <button className={filter === 'me' ? 'filter-tab active px-4 py-1.5 rounded-lg text-xs font-bold' : 'filter-tab px-4 py-1.5 rounded-lg text-xs font-bold text-gray-500'} onClick={() => setFilter('me')}>
                  내 작업만
                </button>
                <button className={filter === 'urgent' ? 'filter-tab active px-4 py-1.5 rounded-lg text-xs font-bold' : 'filter-tab px-4 py-1.5 rounded-lg text-xs font-bold text-gray-500'} onClick={() => setFilter('urgent')}>
                  <i className="fas fa-fire text-red-500 mr-1"></i>긴급
                </button>
              </div>
              <button onClick={() => openCreateModal()} className="squad-workspace-add-task-button px-5 py-2.5 bg-gray-900 text-white font-bold rounded-xl text-sm hover:bg-black transition shadow-lg flex items-center gap-2">
                <i className="fas fa-plus"></i> 작업 추가
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar p-6 bg-[#F3F4F6]">
            <div className="flex gap-6 h-full min-w-max pb-4">
              {TASK_COLUMNS.map((column) => {
                const columnTasks = visibleTasks.filter((task) => task.status === column.id)

                return (
                  <div key={column.id} className={`${column.tone} border rounded-2xl w-[320px] flex flex-col h-full shrink-0`}>
                    <div className={`p-4 flex justify-between items-center shrink-0 border-b ${column.tone.includes('yellow') ? 'border-yellow-200/50' : column.tone.includes('blue') ? 'border-blue-100/50' : column.tone.includes('green') ? 'border-green-100/50' : 'border-gray-200/50'}`}>
                      <h3 className={`font-extrabold ${column.titleClass} flex items-center gap-2 text-sm`}>
                        <span className={`w-2.5 h-2.5 rounded-full ${column.dotClass}`}></span> {column.title}
                      </h3>
                      <span id={`count-${column.id === 'TODO' ? 'todo' : column.id === 'IN_PROGRESS' ? 'progress' : column.id === 'IN_REVIEW' ? 'review' : 'done'}`} className={`bg-white text-xs font-bold px-2.5 py-0.5 rounded-md shadow-sm border ${column.countClass}`}>
                        {columnTasks.length}
                      </span>
                    </div>
                    <div
                      id={`col-${column.id === 'TODO' ? 'todo' : column.id === 'IN_PROGRESS' ? 'progress' : column.id === 'IN_REVIEW' ? 'review' : 'done'}`}
                      className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3 kanban-col"
                      data-empty={column.id === 'TODO' ? '첫 작업을 추가해보세요!' : '여기로 드래그하여 이동'}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault()

                        if (draggingTaskId != null) {
                          void moveTask(draggingTaskId, column.id)
                        }
                      }}
                    >
                      {columnTasks.map(renderTaskCard)}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </main>
      </div>

      {modalOpen ? (
        <div className="modal active squad-workspace-task-modal fixed inset-0 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <form onSubmit={saveTask} className="squad-workspace-task-modal-content bg-white w-full max-w-md rounded-2xl shadow-2xl relative overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center shrink-0">
              <h3 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
                <i className="fas fa-ticket-alt text-brand"></i> {editingTask ? '작업 수정' : '새 작업 추가'}
              </h3>
              <button type="button" onClick={closeModal} className="text-gray-400 hover:text-gray-900 bg-white border border-gray-200 w-8 h-8 rounded-full flex items-center justify-center transition shadow-sm">
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">작업 제목 <span className="text-red-500">*</span></label>
                <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand transition shadow-sm font-bold" placeholder="무엇을 작업하시나요?" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">담당 직군 (태그)</label>
                  <select className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand font-medium shadow-sm bg-white cursor-pointer" defaultValue="FE">
                    <option value="FE">프론트엔드 (FE)</option>
                    <option value="BE">백엔드 (BE)</option>
                    <option value="UX/UI">디자인 (UX/UI)</option>
                    <option value="DevOps">인프라 (DevOps)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">담당자 배정</label>
                  <select value={form.assigneeId} onChange={(event) => setForm((current) => ({ ...current, assigneeId: event.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand font-medium shadow-sm bg-white cursor-pointer">
                    <option value="">미지정</option>
                    {members.map((member) => (
                      <option key={member.memberId} value={member.learnerId}>{member.learnerName ?? `팀원 ${member.learnerId}`}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">우선순위</label>
                  <div className="flex gap-4 items-center bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                    <label className="flex items-center gap-2 text-sm font-bold text-gray-700 cursor-pointer">
                      <input type="radio" name="urgency" value="false" checked={form.priority !== 'HIGH'} onChange={() => setForm((current) => ({ ...current, priority: 'MEDIUM' }))} className="accent-brand w-4 h-4" /> 보통
                    </label>
                    <label className="flex items-center gap-2 text-sm font-bold text-red-500 cursor-pointer">
                      <input type="radio" name="urgency" value="true" checked={form.priority === 'HIGH'} onChange={() => setForm((current) => ({ ...current, priority: 'HIGH' }))} className="accent-red-500 w-4 h-4" /> 🔥 긴급
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">마감 기한 (D-Day)</label>
                  <input type="date" value={form.dueDate} onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand transition shadow-sm font-bold text-gray-700 cursor-pointer bg-gray-50" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">상세 설명 <span className="text-gray-400 font-normal">(선택)</span></label>
                <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} className="w-full border border-gray-200 rounded-xl p-4 text-sm h-24 resize-none outline-none focus:border-brand transition shadow-sm leading-relaxed" placeholder="작업에 필요한 세부 사항이나 참고 링크를 남겨주세요." />
              </div>
            </div>

            <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-between items-center shrink-0">
              <button type="button" className="hidden px-4 py-2.5 text-xs font-bold text-red-500 bg-white border border-red-200 rounded-xl hover:bg-red-50 transition shadow-sm">
                <i className="fas fa-trash-alt mr-1"></i> 삭제
              </button>
              <div className="flex gap-2 ml-auto">
                <button type="button" onClick={closeModal} className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition shadow-sm">취소</button>
                <button type="submit" disabled={saving || !form.title.trim()} className="px-6 py-2.5 text-sm font-bold text-white bg-gray-900 rounded-xl hover:bg-black transition shadow-md flex items-center gap-1.5 disabled:opacity-40">
                  <i className="fas fa-save"></i> {saving ? '저장 중' : '저장하기'}
                </button>
              </div>
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
