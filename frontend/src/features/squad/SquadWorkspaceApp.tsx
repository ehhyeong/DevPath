import { aiWorkspacePageHref } from './ai-workspace-navigation'
import { useAuthSession } from '../../lib/useAuthSession'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import AuthModal, { type AuthView } from '../../components/AuthModal'
import SquadWorkspaceAside from '../../components/SquadWorkspaceAside'
import SquadWorkspaceHeader from '../../components/SquadWorkspaceHeader'
import UserAvatar from '../../components/UserAvatar'
import { clearStoredAuthSession, getPostLoginRedirect, readStoredAuthSession } from '../../lib/auth-session'
import { projectApiRequest, workspaceFeatureId } from '../project/api'
import { createSquadNotification, squadActorName } from './notifications'
import { readWorkspaceIdFromLocation as getWorkspaceIdFromUrl } from '../../lib/location-state'
import { useWorkspaceDataVersion } from '../../lib/workspace-events'
import { type AiWorkspacePageProps } from './AiWorkspaceDesignPanels'
import type { AiApi } from './ai-squad-data'
import { findApiTask, linkApisToTask, readWorkspaceApiDocument, readWorkspaceApis } from './api-workspace-links'

import type {
  FilterType,
  TaskFormState,
  TaskPriority,
  TaskStatus,
  WorkspaceDashboard,
  WorkspaceTask,
} from './workspace-types'

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

function createEmptyForm(): TaskFormState {
  return {
    tag: 'FE',
    title: '',
    description: '',
    featureIds: [],
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
  const savedTag = task.description?.match(/^\[task-tag:(FE|BE|UX\/UI|DevOps)\]\n?/)
  if (savedTag) return { label: savedTag[1], className: savedTag[1] === 'FE' ? 'bg-blue-50 text-blue-600 border-blue-200' : savedTag[1] === 'BE' ? 'bg-purple-50 text-purple-600 border-purple-200' : savedTag[1] === 'UX/UI' ? 'bg-pink-50 text-pink-600 border-pink-200' : 'bg-gray-50 text-gray-600 border-gray-200' }
  const haystack = `${task.title} ${task.description ?? ''}`.toLowerCase()

  if (/(react|ui|frontend|front|next|tailwind|화면|프론트)/i.test(haystack)) {
    return { label: '프론트엔드 (FE)', className: 'bg-blue-50 text-blue-600 border-blue-200' }
  }

  if (/(api|spring|server|jwt|redis|payment|backend|db|database)/i.test(haystack)) {
    return { label: '백엔드 (BE)', className: 'bg-purple-50 text-purple-600 border-purple-200' }
  }

  if (/(design|ux|figma|wireframe|디자인)/i.test(haystack)) {
    return { label: '디자인 (UX/UI)', className: 'bg-pink-50 text-pink-600 border-pink-200' }
  }

  if (/(deploy|devops|ci\/cd|배포|인프라|모니터링)/i.test(haystack)) {
    return { label: '인프라 (DevOps)', className: 'bg-gray-50 text-gray-600 border-gray-200' }
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
    tag: task.description?.match(/^\[task-tag:(FE|BE|UX\/UI|DevOps)\]/)?.[1] ?? 'BE',
    title: task.title,
    description: (task.description ?? '').replace(/^\[task-tag:(FE|BE|UX\/UI|DevOps)\]\n?/, ''),
    featureIds: task.featureIds ?? [],
    status: task.status,
    priority: task.priority ?? 'MEDIUM',
    assigneeId: task.assigneeId ? String(task.assigneeId) : '',
    dueDate: task.dueDate ?? '',
  }
}

export default function SquadWorkspaceApp({ aiWorkspace = false, design }: AiWorkspacePageProps = {}) {
  const workspaceId = useMemo(() => getWorkspaceIdFromUrl(), [])
  const dataVersion = useWorkspaceDataVersion()
  const [session,setSession] = useAuthSession()
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
  const [linkedApis, setLinkedApis] = useState<AiApi[]>([])
  const [apiLinkError, setApiLinkError] = useState('')
  const [apiLinksLoaded, setApiLinksLoaded] = useState(false)
  const [selectedApiIds, setSelectedApiIds] = useState<string[] | null>(null)
  const [saveError, setSaveError] = useState('')
  const taskApiIds = selectedApiIds ?? linkedApis.filter((api) => editingTask && findApiTask(api.task, [editingTask])).map((api) => api.id)

  useEffect(() => {
    if (!aiWorkspace || !workspaceId) return
    const controller = new AbortController()
    setApiLinksLoaded(false)
    projectApiRequest<{ content: string } | null>(`/api/workspaces/${workspaceId}/api-spec`, { signal: controller.signal }, 'required').then((doc) => {
      if (controller.signal.aborted) return
      setLinkedApis(doc?.content ? readWorkspaceApis(doc.content) : [])
      setApiLinkError('')
      setApiLinksLoaded(true)
    }).catch((error) => {
      if (!controller.signal.aborted) setApiLinkError(error instanceof Error ? error.message : '연결된 API를 불러오지 못했습니다.')
    })
    return () => controller.abort()
  }, [aiWorkspace, workspaceId, dataVersion])

  useEffect(() => {
    if (!aiWorkspace || loading || modalOpen) return
    const openLinkedTask = () => {
      const task = findApiTask(window.location.hash.slice(1), tasks)
      if (!task) return
      setEditingTask(task)
      setForm(taskToForm(task))
      setSelectedApiIds(null)
      setSaveError('')
      setModalOpen(true)
    }
    openLinkedTask()
    window.addEventListener('hashchange', openLinkedTask)
    return () => window.removeEventListener('hashchange', openLinkedTask)
  }, [aiWorkspace, loading, tasks, modalOpen])

  useEffect(() => {
    document.title = 'DevPath - 작업 현황판'
    const html = document.documentElement
    const body = document.body

    const root = document.getElementById('root')
    const appViewport = document.querySelector<HTMLElement>('.app-viewport')
    html.classList.add('h-full!', 'overflow-hidden!')
    body.classList.add('h-dvh!', 'min-h-0!', 'overflow-hidden!')
    root?.classList.add('h-dvh!', 'min-h-0!', 'overflow-hidden!')
    appViewport?.classList.add('h-dvh!', 'min-h-0!', 'overflow-hidden!')

    return () => {
      html.classList.remove('h-full!', 'overflow-hidden!')
      body.classList.remove('h-dvh!', 'min-h-0!', 'overflow-hidden!')
      root?.classList.remove('h-dvh!', 'min-h-0!', 'overflow-hidden!')
      appViewport?.classList.remove('h-dvh!', 'min-h-0!', 'overflow-hidden!')
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
      // AI 비서 변경 후 재조회(dataVersion > 0)는 로딩 화면 없이 갱신한다. 로딩 화면이 AI 패널을 다시 그려 대화가 사라지기 때문이다.
      if (dataVersion === 0) {
        setLoading(true)
      }
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
  }, [dataVersion, workspaceId])

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
    setSelectedApiIds(null)
    setSaveError('')
    setModalOpen(true)
  }

  function openEditModal(task: WorkspaceTask) {
    setEditingTask(task)
    setForm(taskToForm(task))
    setSelectedApiIds(null)
    setSaveError('')
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingTask(null)
    setForm(createEmptyForm())
    setSelectedApiIds(null)
    setSaveError('')
    if (/^#DP-\d+$/.test(window.location.hash)) window.history.replaceState(null, '', window.location.pathname + window.location.search)
  }

  async function saveTask(event: FormEvent) {
    event.preventDefault()

    if (!workspaceId || !form.title.trim() || saving || (aiWorkspace && !apiLinksLoaded)) {
      return
    }

    setSaving(true)
    setSaveError('')
    let linkingApis = false

    try {
      const assigneeId = form.assigneeId ? Number(form.assigneeId) : null
      let savedTask: WorkspaceTask

      if (editingTask) {
        const updated = await projectApiRequest<WorkspaceTask>(
          `/api/workspaces/${workspaceId}/tasks/${editingTask.taskId}`,
          {
            method: 'PUT',
            body: JSON.stringify({
              title: form.title.trim(),
              description: `[task-tag:${form.tag}]\n${form.description.trim()}`,
              featureIds: aiWorkspace && design ? form.featureIds : undefined,
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
        savedTask = withStatus
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
              description: `[task-tag:${form.tag}]\n${form.description.trim()}`,
              featureIds: aiWorkspace && design ? form.featureIds : undefined,
              priority: form.priority,
              assigneeId,
              dueDate: form.dueDate || null,
            }),
          },
          'required',
        )
        // 명세 저장이나 후속 상태 변경이 실패해도 재시도는 이미 생성된 작업을 수정한다.
        setEditingTask(created)
        setTasks((current) => [created, ...current])
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

        updateTaskInState(normalized)
        savedTask = normalized
        void createSquadNotification(workspaceId, {
          pageKey: 'squad-workspace',
          message: `${squadActorName(session?.name)}님이 새 작업 "${normalized.title}"을 등록했습니다.`,
          targetPath: '/squad-workspace',
        })
      }

      // 구버전 서버가 알 수 없는 필드를 무시해도 기능 연결 저장을 성공으로 표시하지 않는다.
      if (aiWorkspace && design && (!Array.isArray(savedTask.featureIds)
        || savedTask.featureIds.length !== form.featureIds.length
        || form.featureIds.some((id) => !savedTask.featureIds!.includes(id)))) {
        throw new Error('MVP 기능 연결이 서버에 저장되지 않았습니다. 백엔드를 최신 코드로 다시 실행한 뒤 저장해 주세요.')
      }
      if (aiWorkspace) {
        linkingApis = true
        // 다른 화면에서 변경한 상태·명세를 보존하도록 저장 직전에 최신 문서를 읽는다.
        const doc = await projectApiRequest<{ content: string } | null>(`/api/workspaces/${workspaceId}/api-spec`, {}, 'required')
        const currentDocument = doc?.content ? readWorkspaceApiDocument(doc.content) : { format: 'devpath-api-v1', endpoints: [], groups: [] }
        const currentApis = currentDocument.endpoints
        if (taskApiIds.some((id) => !currentApis.some((api) => api.id === id))) throw new Error('선택한 API가 삭제되었습니다. 창을 닫고 다시 확인해 주세요.')
        const nextApis = linkApisToTask(currentApis, savedTask.taskId, taskApiIds)
        if (nextApis.some((api, index) => api.task !== currentApis[index].task)) {
          await projectApiRequest(`/api/workspaces/${workspaceId}/api-spec`, { method: 'PUT', body: JSON.stringify({ content: JSON.stringify({ ...currentDocument, endpoints: nextApis }) }) }, 'required')
        }
        setLinkedApis(nextApis)
      }

      closeModal()
    } catch (error) {
      const message = error instanceof Error ? error.message : '작업을 저장하지 못했습니다.'
      setSaveError(linkingApis ? `작업은 저장되었지만 API 연결을 저장하지 못했습니다. 다시 저장해 주세요. ${message}` : message)
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


  function renderTaskApiLinks(task: WorkspaceTask) {
    const apis = linkedApis.filter((api) => findApiTask(api.task, [task]))
    if (!apis.length) return null
    return <div className="mt-3 space-y-1 border-t border-gray-100 pt-3"><p className="text-[10px] font-bold text-gray-400">연결된 API</p>{apis.map((api) => <a key={api.id} href={`${aiWorkspacePageHref('/squad-api', workspaceId)}#${api.id}`} onClick={(event) => event.stopPropagation()} className="block break-all font-mono text-xs font-bold text-brand hover:underline">{api.method} {api.path}</a>)}</div>
  }

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
        className={`kanban-card cursor-grab bg-white p-4 rounded-xl shadow-sm border-l-4 [transition:all_0.2s_cubic-bezier(0.4,0,0.2,1)] active:cursor-grabbing active:[transform:scale(0.98)] hover:[transform:translateY(-3px)] hover:[box-shadow:0_10px_20px_-5px_rgba(0,0,0,0.08)] hover:border-[#00C471]! ${statusAccent(task.status)}`}
      >
        <div className="flex justify-between items-start mb-2">
          <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded border ${tag.className}`}>{tag.label}</span>
          <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">#{task.taskId}</span>
        </div>
        <h4 className="font-bold text-gray-900 text-sm mb-3 leading-snug">{task.title}</h4>

        {aiWorkspace && task.featureIds?.length ? <div className="mb-3 flex flex-wrap gap-1">{task.featureIds.map((id) => <span key={id} title={design?.scenario.coreFeatures[design.scenario.coreFeatures.findIndex((_, index) => workspaceFeatureId(design.scenario, index) === id)]} className="rounded border border-teal-100 bg-teal-50 px-1.5 py-0.5 text-[10px] font-bold text-teal-700">{id}</span>)}</div> : null}

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
        {aiWorkspace ? renderTaskApiLinks(task) : null}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="squad-dashboard-page flex h-screen items-center justify-center overflow-hidden bg-[#F8F9FA]! font-['Pretendard',sans-serif] text-gray-800">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-green-100 border-t-brand"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="squad-dashboard-page flex h-screen items-center justify-center overflow-hidden bg-[#F8F9FA]! font-['Pretendard',sans-serif] text-gray-800">
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
    <div className="squad-dashboard-page squad-workspace-page flex h-screen overflow-hidden bg-[#F8F9FA]! font-['Pretendard',sans-serif] text-gray-800">
      <SquadWorkspaceAside
        aiWorkspace={aiWorkspace}
        activePage="workspace"
        workspaceId={workspaceId}
        projectName={projectName}
        reviewBadgeCount={aiWorkspace ? 0 : tasks.length > 0 ? 1 : 0}
      />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-[#F9FAFB]">
        <SquadWorkspaceHeader
          aiWorkspace={aiWorkspace}
          workspaceId={workspaceId}
          projectName={projectName}
          members={members}
          statusLabel="진행 중"
          currentUserName={session?.name}
          onLogout={handleLogout}
        />

        <main className="flex-1 flex flex-col overflow-hidden relative">
          {aiWorkspace && apiLinkError ? <p role="alert" className="px-6 pt-3 text-xs text-red-500">{apiLinkError}</p> : null}
          <div className="px-8 py-6 shrink-0 bg-white border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 z-10">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
                <i className="fas fa-columns text-brand"></i> 팀 작업 현황판
              </h1>
              <p className="text-sm text-gray-500 mt-1">팀원들의 작업 내역을 추가하고, 카드를 이동하여 진행 상태를 직관적으로 공유하세요.{aiWorkspace && design ? <a href={`${aiWorkspacePageHref('/squad-blueprint', workspaceId)}#roadmap`} className="ml-2 text-xs font-bold text-teal-700"><i className="fas fa-magic mr-1" />AI 로드맵 · {design.roadmap.length}단계</a> : null}</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex bg-gray-50 border border-gray-200 rounded-xl p-1 shadow-inner">
                <button className={filter === 'all' ? 'squad-workspace-filter-tab h-[30px] whitespace-nowrap border-b-[2px] border-[#111827] bg-[#111827] px-[16px] py-[6px] text-[12px]! leading-[16px]! font-bold text-white rounded-[8px] [transition:all_0.2s] focus:outline-none hover:text-white' : 'squad-workspace-filter-tab h-[30px] whitespace-nowrap border-[#6b7280] border-b-[2px] border-b-transparent px-[16px] py-[6px] text-[12px]! leading-[16px]! font-bold text-[#6b7280] rounded-[8px] [transition:all_0.2s] focus:outline-none hover:bg-[#F9FAFB] hover:text-[#00c471]'} onClick={() => setFilter('all')}>
                  전체 보기
                </button>
                <button className={filter === 'me' ? 'squad-workspace-filter-tab h-[30px] whitespace-nowrap border-b-[2px] border-[#111827] bg-[#111827] px-[16px] py-[6px] text-[12px]! leading-[16px]! font-bold text-white rounded-[8px] [transition:all_0.2s] focus:outline-none hover:text-white' : 'squad-workspace-filter-tab h-[30px] whitespace-nowrap border-[#6b7280] border-b-[2px] border-b-transparent px-[16px] py-[6px] text-[12px]! leading-[16px]! font-bold text-[#6b7280] rounded-[8px] [transition:all_0.2s] focus:outline-none hover:bg-[#F9FAFB] hover:text-[#00c471]'} onClick={() => setFilter('me')}>
                  내 작업만
                </button>
                <button className={filter === 'urgent' ? 'squad-workspace-filter-tab h-[30px] whitespace-nowrap border-b-[2px] border-[#111827] bg-[#111827] px-[16px] py-[6px] text-[12px]! leading-[16px]! font-bold text-white rounded-[8px] [transition:all_0.2s] focus:outline-none hover:text-white' : 'squad-workspace-filter-tab h-[30px] whitespace-nowrap border-[#6b7280] border-b-[2px] border-b-transparent px-[16px] py-[6px] text-[12px]! leading-[16px]! font-bold text-[#6b7280] rounded-[8px] [transition:all_0.2s] focus:outline-none hover:bg-[#F9FAFB] hover:text-[#00c471]'} onClick={() => setFilter('urgent')}>
                  <i className="fas fa-fire text-red-500 mr-1"></i>긴급
                </button>
              </div>
              <button onClick={() => openCreateModal()} className="squad-workspace-add-task-button h-[42px] px-[20px] py-0 bg-gray-900 text-white font-bold rounded-[12px] text-[14px]! leading-[20px]! hover:bg-black transition shadow-lg flex items-center gap-2">
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
                      className={`kanban-col relative min-h-[150px] flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3 empty:after:absolute empty:after:inset-[12px] empty:after:flex empty:after:items-center empty:after:justify-center empty:after:border-[2px] empty:after:border-dashed empty:after:border-[#E5E7EB] empty:after:rounded-[0.75rem] empty:after:text-[12px] empty:after:font-bold empty:after:text-[#9CA3AF] empty:after:pointer-events-none empty:after:content-[attr(data-empty)] ${column.id === 'TODO' ? 'empty:after:bg-[rgba(249,250,251,0.5)]' : ''}`}
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
        <div className="squad-workspace-task-modal fixed inset-0 z-[1050] flex visible items-center justify-center bg-gray-900/60 p-4 opacity-100 backdrop-blur-sm [transition:opacity_0.2s,visibility_0.2s] [&_input]:text-[14px]! [&_input:not([type=radio])]:leading-[20px]! [&_select]:text-[14px]! [&_select]:leading-[20px]! [&_textarea]:text-[14px]! [&_textarea]:leading-[20px]! [&_button]:text-[14px]! [&_button]:leading-[20px]!">
          <form onSubmit={saveTask} className="squad-workspace-task-modal-content relative flex max-h-[calc(100dvh-2rem)] w-full max-w-[448px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center shrink-0">
              <h3 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
                <i className="fas fa-ticket-alt text-brand"></i> {editingTask ? '작업 수정' : '새 작업 추가'}
              </h3>
              <button type="button" onClick={closeModal} className="text-[14px] leading-[20px] text-gray-400 hover:text-gray-900 bg-white border border-gray-200 w-8 h-8 rounded-full flex items-center justify-center transition shadow-sm">
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
              <div>
                <label htmlFor="task-title" className="block text-xs font-bold text-gray-700 mb-2">작업 제목 <span className="text-red-500">*</span></label>
                <input id="task-title" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand transition shadow-sm font-bold" placeholder="무엇을 작업하시나요?" />
              </div>

              {saveError ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">{saveError}</p> : null}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">담당 직군 (태그)</label>
                  <select className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand font-medium shadow-sm bg-white cursor-pointer" value={form.tag} onChange={(event) => setForm((current) => ({ ...current, tag: event.target.value }))}>
                    <option value="FE">프론트엔드 (FE)</option>
                    <option value="BE">백엔드 (BE)</option>
                    <option value="UX/UI">디자인 (UX/UI)</option>
                    <option value="DevOps">인프라 (DevOps)</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="task-assignee" className="block text-xs font-bold text-gray-700 mb-2">담당자 배정</label>
                  <select id="task-assignee" value={form.assigneeId} onChange={(event) => setForm((current) => ({ ...current, assigneeId: event.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand font-medium shadow-sm bg-white cursor-pointer">
                    <option value="">미지정</option>
                    {members.map((member) => (
                      <option key={member.memberId} value={member.learnerId}>{member.learnerName ?? `팀원 ${member.learnerId}`}</option>
                    ))}
                  </select>
                </div>
              </div>

              {aiWorkspace && design ? <fieldset className="space-y-2">
                <legend className="mb-2 text-xs font-bold text-gray-700">연결할 MVP 기능</legend>
                <p className="text-xs text-gray-500">이 작업이 구현하는 기능을 선택하세요. 대시보드는 기능별 연결 작업 중 완료된 비율을 표시합니다.</p>
                <div className="space-y-1 rounded-xl border border-gray-200 p-2">
                  {design.scenario.coreFeatures.map((feature, index) => {
                    const id = workspaceFeatureId(design.scenario, index)
                    return <label key={id} className="flex cursor-pointer items-start gap-2 rounded-lg p-2 hover:bg-gray-50">
                      <input type="checkbox" checked={form.featureIds.includes(id)} disabled={saving} onChange={(event) => setForm((current) => ({ ...current, featureIds: event.target.checked ? [...current.featureIds, id] : current.featureIds.filter((value) => value !== id) }))} className="mt-0.5 h-4 w-4 shrink-0 accent-brand" />
                      <span className="text-xs font-medium text-gray-700">{id}. {feature}</span>
                    </label>
                  })}
                </div>
              </fieldset> : null}

              {aiWorkspace ? <fieldset className="space-y-2">
                <legend className="mb-2 text-xs font-bold text-gray-700">연결할 API</legend>
                <p className="text-xs text-gray-500">선택한 API에 이 작업의 담당자와 마감일이 표시됩니다.</p>
                {apiLinkError ? <p role="alert" className="text-xs text-red-600">{apiLinkError}</p> : !apiLinksLoaded ? <p className="text-xs text-gray-400">API를 불러오는 중입니다.</p> : linkedApis.length ? <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-gray-200 p-2">
                  {linkedApis.map((api) => <label key={api.id} className="flex cursor-pointer items-start gap-2 rounded-lg p-2 hover:bg-gray-50">
                    <input type="checkbox" checked={taskApiIds.includes(api.id)} disabled={saving} onChange={(event) => setSelectedApiIds(event.target.checked ? [...taskApiIds, api.id] : taskApiIds.filter((id) => id !== api.id))} className="mt-0.5 h-4 w-4 shrink-0 accent-brand" />
                    <span className="min-w-0 text-xs text-gray-700"><span className="break-all font-mono font-bold">{api.method} {api.path}</span><span className="block text-gray-500">{api.desc}{api.task && (!editingTask || !findApiTask(api.task, [editingTask])) ? ` · ${api.task}에서 이 작업으로 연결 변경` : ''}</span></span>
                  </label>)}
                </div> : <p className="text-xs text-gray-400">등록된 API가 없습니다.</p>}
              </fieldset> : null}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">우선순위</label>
                  <div className="flex gap-4 items-center bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                    <label className="flex items-center gap-2 text-sm font-bold text-gray-700 cursor-pointer">
                      <input type="radio" name="urgency" value="false" checked={form.priority !== 'HIGH'} onChange={() => setForm((current) => ({ ...current, priority: 'MEDIUM' }))} className="accent-brand h-[16px] w-[16px] p-0 [line-height:normal]!" /> 보통
                    </label>
                    <label className="flex items-center gap-2 text-sm font-bold text-red-500 cursor-pointer">
                      <input type="radio" name="urgency" value="true" checked={form.priority === 'HIGH'} onChange={() => setForm((current) => ({ ...current, priority: 'HIGH' }))} className="accent-red-500 h-[16px] w-[16px] p-0 [line-height:normal]!" /> 🔥 긴급
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
                <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} className="w-full border border-gray-200 rounded-xl p-4 text-[14px] leading-[20px] h-24 resize-none outline-none focus:border-brand transition shadow-sm" placeholder="작업에 필요한 세부 사항이나 참고 링크를 남겨주세요." />
              </div>
              {aiWorkspace && editingTask ? renderTaskApiLinks(editingTask) : null}
            </div>

            <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-between items-center shrink-0">
              <button type="button" className="hidden px-4 py-2.5 text-[14px] leading-[20px] font-bold text-red-500 bg-white border border-red-200 rounded-xl hover:bg-red-50 transition shadow-sm">
                <i className="fas fa-trash-alt mr-1"></i> 삭제
              </button>
              <div className="flex gap-2 ml-auto">
                <button type="button" onClick={closeModal} className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition shadow-sm">취소</button>
                <button type="submit" disabled={saving || !form.title.trim() || (aiWorkspace && !apiLinksLoaded)} className="px-6 py-2.5 text-sm font-bold text-white bg-gray-900 rounded-xl hover:bg-black transition shadow-md flex items-center gap-1.5 disabled:opacity-40">
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
