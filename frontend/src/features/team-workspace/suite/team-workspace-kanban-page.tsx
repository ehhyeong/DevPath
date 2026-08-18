import { useMemo,useState,type FormEvent } from 'react'
import UserAvatar from '../../../components/UserAvatar'
import { readStoredAuthSession } from '../../../lib/auth-session'
import { createTeamWorkspaceTask,deleteTeamWorkspaceTask,updateTeamWorkspaceTask,updateTeamWorkspaceTaskAssignee,updateTeamWorkspaceTaskStatus } from './api'
import { KANBAN_COLUMNS,ROLE_FILTERS } from './constants'
import { Modal,PageFrame } from './team-workspace-suite-shared'
import type { SuiteData,TaskForm,TaskPriority,TaskStatus,WorkspaceMember,WorkspaceTask } from './types'
import { percent,priorityBadgeLabel,priorityClass,roleForTask,stripTaskRolePrefix,taskRoleBadgeClass,taskTicketCode } from './utils'

function priorityBadgeIcon(priority?: TaskPriority | null) {
  return priority === 'HIGH' ? <i className="fas fa-fire mr-0.5"></i> : null
}

export function TaskCard({
  task,
  members,
  onEdit,
  onDragStart,
}: {
  task: WorkspaceTask
  members: WorkspaceMember[]
  onEdit: (task: WorkspaceTask) => void
  onDragStart: (task: WorkspaceTask) => void
}) {
  const assignee = members.find((member) => member.learnerId === task.assigneeId)
  const role = roleForTask(task)

  return (
    <div
      draggable
      onDragStart={() => onDragStart(task)}
      onClick={() => onEdit(task)}
      className="kanban-card group cursor-grab rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition active:cursor-grabbing"
    >
      <div className="mb-2 flex items-start justify-between">
        <span className={`rounded border px-1.5 py-0.5 text-[9px] font-extrabold ${taskRoleBadgeClass(role)}`}>{role}</span>
        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-bold text-gray-400">{taskTicketCode(task, role)}</span>
      </div>
      <h4 className="mb-2 text-sm font-bold leading-tight text-gray-900 transition group-hover:text-team">{task.title}</h4>
      <div className="mt-4 flex items-end justify-between">
        <div className="flex min-w-0 items-center gap-1.5">
          <UserAvatar name={assignee?.learnerName || '미지정'} imageUrl={assignee?.profileImage} className="h-6 w-6 border border-gray-200 bg-gray-50" iconClassName="text-[10px]" />
          <span className="truncate text-[10px] font-medium text-gray-500">{assignee?.learnerName || '미지정'}</span>
        </div>
        <span className={`team-ws-card-priority rounded px-1.5 py-0.5 text-[10px] font-bold ${priorityClass(task.priority)}`}>
          {priorityBadgeIcon(task.priority)}
          {priorityBadgeLabel(task.priority)}
        </span>
      </div>
    </div>
  )
}

export function KanbanPage({
  data,
  workspaceId,
  reload,
}: {
  data: SuiteData
  workspaceId: number
  reload: () => Promise<void>
}) {
  const [filter, setFilter] = useState(ROLE_FILTERS[0])
  const [search, setSearch] = useState('')
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [modalTask, setModalTask] = useState<WorkspaceTask | null>(null)
  const [form, setForm] = useState<TaskForm>({ title: '', description: '', role: 'Frontend', priority: 'MEDIUM', assigneeId: '', dueDate: '' })
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [draggingTaskId, setDraggingTaskId] = useState<number | null>(null)
  const session = readStoredAuthSession()
  const currentMember = data.dashboard?.members.find((member) => member.learnerId === session?.userId) ?? data.dashboard?.members[0]

  const filteredTasks = useMemo(() => {
    const normalized = search.trim().toLowerCase()

    return data.tasks.filter((task) => {
      if (filter === '내 작업' && task.assigneeId !== session?.userId) return false
      if ((filter === 'Frontend' || filter === 'Backend') && roleForTask(task) !== filter) return false
      if (!normalized) return true

      return `${task.title} ${task.description ?? ''}`.toLowerCase().includes(normalized)
    })
  }, [data.tasks, filter, search, session?.userId])

  function openModal(task?: WorkspaceTask) {
    setError(null)
    setModalTask(task ?? null)
    setTaskModalOpen(true)
    setForm({
      title: task?.title ?? '',
      description: stripTaskRolePrefix(task?.description),
      role: task ? roleForTask(task) : 'Frontend',
      priority: task?.priority ?? 'MEDIUM',
      assigneeId: task?.assigneeId ? String(task.assigneeId) : currentMember ? String(currentMember.learnerId) : '',
      dueDate: task?.dueDate ?? '',
    })
  }

  function closeTaskModal() {
    setTaskModalOpen(false)
    setModalTask(null)
    setError(null)
    setForm({ title: '', description: '', role: 'Frontend', priority: 'MEDIUM', assigneeId: '', dueDate: '' })
  }

  async function saveTask(event: FormEvent) {
    event.preventDefault()
    if (!form.title.trim()) {
      setError('작업 제목을 입력해주세요.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const payload = {
        title: form.title.trim(),
        description: `[${form.role}] ${stripTaskRolePrefix(form.description).trim()}`.trim(),
        priority: form.priority,
        assigneeId: form.assigneeId ? Number(form.assigneeId) : null,
        dueDate: form.dueDate || null,
      }

      if (modalTask) {
        await updateTeamWorkspaceTask(workspaceId, modalTask.taskId, payload)
        if (form.assigneeId) {
          await updateTeamWorkspaceTaskAssignee(workspaceId, modalTask.taskId, Number(form.assigneeId))
        }
      } else {
        await createTeamWorkspaceTask(workspaceId, payload)
      }

      setModalTask(null)
      setTaskModalOpen(false)
      await reload()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '작업 저장에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  async function updateStatus(task: WorkspaceTask, status: TaskStatus) {
    if (task.status === status) return

    await updateTeamWorkspaceTaskStatus(workspaceId, task.taskId, status)
    await reload()
  }

  async function dropTask(status: TaskStatus) {
    const task = filteredTasks.find((item) => item.taskId === draggingTaskId)
    setDraggingTaskId(null)
    if (!task) return

    await updateStatus(task, status)
  }

  async function deleteTask() {
    if (!modalTask) return

    setSubmitting(true)
    setError(null)

    try {
      await deleteTeamWorkspaceTask(workspaceId, modalTask.taskId)
      setModalTask(null)
      setTaskModalOpen(false)
      await reload()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Task delete failed.')
    } finally {
      setSubmitting(false)
    }
  }

  const totalTasks = data.tasks.length
  const doneTasks = data.tasks.filter((task) => task.status === 'DONE').length
  const inProgressTasks = data.tasks.filter((task) => task.status === 'IN_PROGRESS').length
  const remainingTasks = data.tasks.filter((task) => task.status === 'TODO').length
  const progressPercent = percent(doneTasks, totalTasks)

  return (
    <>
      <PageFrame
        activePage="kanban"
        title="팀 애자일 칸반 보드"
        subtitle="각 직군별 작업 현황을 공유하고 Jira처럼 티켓(이슈) 단위로 일정을 관리하세요."
        action={<button type="button" onClick={() => openModal()} className="h-10 rounded-xl bg-team px-4 text-[13px] font-black text-white shadow-sm hover:bg-indigo-700"><i className="fas fa-plus mr-2"></i>새 작업 추가</button>}
        data={data}
        workspaceId={workspaceId}
        mainClassName="flex-1 flex flex-col overflow-hidden relative"
        contentClassName="flex h-full min-h-0 flex-col"
      >
        <div className="shrink-0 border-b border-gray-200 bg-white px-8 py-6 shadow-sm">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h1 className="flex items-center gap-2 text-2xl font-extrabold text-gray-900">
                  <i className="fas fa-columns text-team"></i>
                  팀 애자일 칸반 보드
                </h1>
                <p className="mt-2 text-sm text-gray-500">각 직군별 작업 현황을 공유하고 Jira처럼 티켓(이슈) 단위로 일정을 관리하세요.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="team-ws-kanban-search-wrap relative">
                  <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400"></i>
                  <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="티켓 검색..." className="team-ws-kanban-search-input w-48 rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-8 pr-4 text-xs font-medium outline-none transition placeholder:text-gray-400 focus:border-team focus:bg-white focus:ring-1 focus:ring-team" />
                </div>
                <div className="team-ws-kanban-filter-group flex rounded-xl border border-gray-200 bg-gray-50 p-1">
                  {ROLE_FILTERS.map((item) => (
                    <button key={item} type="button" onClick={() => setFilter(item)} className={`kanban-filter-tab team-ws-kanban-filter-tab rounded-lg px-4 py-1.5 text-xs font-bold ${filter === item ? 'active' : ''}`}>
                      {item}
                    </button>
                  ))}
                </div>
                <button type="button" onClick={() => openModal()} className="team-ws-kanban-add-button flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-black">
                  <i className="fas fa-plus"></i>
                  새 작업 추가
                </button>
              </div>
            </div>

            <div className="flex items-center gap-6 rounded-xl border border-gray-100 bg-gray-50 p-4">
              <div className="flex-1">
                <div className="mb-2 flex items-end justify-between">
                  <span className="flex items-center gap-2 text-xs font-bold text-gray-600">
                    <i className="fas fa-chart-line text-brand"></i>
                    이번 주 스프린트 목표 달성률
                  </span>
                  <span className="text-sm font-extrabold text-team">{progressPercent}%</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200">
                  <div className="h-2.5 rounded-full bg-team transition-all duration-700" style={{ width: `${progressPercent}%` }}></div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-6 border-l border-gray-200 pl-6">
                <div className="text-center">
                  <p className="mb-0.5 text-[10px] font-bold text-gray-400">전체 작업</p>
                  <p className="text-sm font-black text-gray-800">{totalTasks}</p>
                </div>
                <div className="text-center">
                  <p className="mb-0.5 text-[10px] font-bold text-gray-400">진행중/검토중</p>
                  <p className="text-sm font-black text-blue-500">{inProgressTasks}</p>
                </div>
                <div className="text-center">
                  <p className="mb-0.5 text-[10px] font-bold text-gray-400">남은 할일</p>
                  <p className="text-sm font-black text-orange-500">{remainingTasks}</p>
                </div>
                <div className="text-center">
                  <p className="mb-0.5 text-[10px] font-bold text-gray-400">완료됨</p>
                  <p className="text-sm font-black text-brand">{doneTasks}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="custom-scrollbar flex-1 overflow-x-auto overflow-y-hidden bg-[#F8F9FA] p-6">
          <div className="flex h-full min-w-max gap-6 pb-4">
            {KANBAN_COLUMNS.map((column) => {
              const tasks = filteredTasks.filter((task) => task.status === column.key)

              return (
                <section
                  key={column.key}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => void dropTask(column.key)}
                  className={`flex h-full w-80 shrink-0 flex-col rounded-2xl border ${column.shellClassName}`}
                >
                  <div className={`flex shrink-0 items-center justify-between border-b p-4 ${column.headerClassName}`}>
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${column.dotClassName}`}></span>
                      <h3 className={`text-[14px] font-extrabold ${column.titleClassName}`}>{column.title}</h3>
                    </div>
                    <span className={`rounded-md border bg-white px-2 py-0.5 text-xs font-bold ${column.countClassName}`}>{tasks.length}</span>
                  </div>
                  <div className="kanban-col custom-scrollbar flex-1 space-y-3 overflow-y-auto p-3">
                    {tasks.map((task) => (
                      <TaskCard
                        key={task.taskId}
                        task={task}
                        members={data.dashboard?.members ?? []}
                        onEdit={openModal}
                        onDragStart={(nextTask) => setDraggingTaskId(nextTask.taskId)}
                      />
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        </div>
      </PageFrame>

      {taskModalOpen ? (
        <Modal title={modalTask ? '작업 수정' : '새 작업 추가'} iconClassName={modalTask ? 'fa-edit' : 'fa-ticket-alt'} panelClassName="team-ws-kanban-task-modal box-border! flex! max-h-[95vh]! w-full! max-w-[512px]! flex-col! overflow-hidden! rounded-[24px]! bg-white! font-[Pretendard,sans-serif]! [box-shadow:0_25px_50px_-12px_rgba(0,0,0,0.25)]! [&>div:first-child]:min-h-[81px]! [&>div:first-child]:shrink-0! [&>div:first-child]:items-center! [&>div:first-child]:justify-between! [&>div:first-child]:border-b! [&>div:first-child]:border-b-[#F3F4F6]! [&>div:first-child]:bg-[#F9FAFB]! [&>div:first-child]:p-[24px]! [&>div:first-child_h3]:m-0! [&>div:first-child_h3]:flex! [&>div:first-child_h3]:items-center! [&>div:first-child_h3]:gap-[8px]! [&>div:first-child_h3]:text-[18px]! [&>div:first-child_h3]:leading-[28px]! [&>div:first-child_h3]:font-extrabold! [&>div:first-child_h3]:tracking-[0]! [&>div:first-child_h3]:text-[#111827]! [&>div:first-child_h3_i]:text-[18px]! [&>div:first-child_h3_i]:leading-[28px]! [&>div:first-child_h3_i]:text-[#4F46E5]! [&>div:first-child>button]:flex! [&>div:first-child>button]:h-[32px]! [&>div:first-child>button]:min-h-[32px]! [&>div:first-child>button]:w-[32px]! [&>div:first-child>button]:min-w-[32px]! [&>div:first-child>button]:items-center! [&>div:first-child>button]:justify-center! [&>div:first-child>button]:rounded-full! [&>div:first-child>button]:border! [&>div:first-child>button]:border-[#E5E7EB]! [&>div:first-child>button]:bg-white! [&>div:first-child>button]:p-0! [&>div:first-child>button]:text-[16px]! [&>div:first-child>button]:leading-[24px]! [&>div:first-child>button]:text-[#9CA3AF]! [&>div:first-child>button]:[box-shadow:0_1px_2px_rgba(15,23,42,0.05)]!" onClose={closeTaskModal}>
          <form onSubmit={saveTask} className="team-ws-kanban-task-form flex! min-h-0! flex-[1_1_auto]! flex-col!">
            <div className="team-ws-kanban-task-body custom-scrollbar flex-[1_1_auto]! min-h-0! overflow-y-auto! p-[24px]! [&>*+*]:mt-[20px]! [&>*:not(:last-child)]:mb-[20px]!">
              <div>
                <label className="m-0! mb-[8px]! block! text-[12px]! leading-[16px]! font-bold! tracking-[0]! text-[#1F2937]!">
                  작업 제목 <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder="어떤 작업을 해야 하나요?"
                  className="team-ws-kanban-task-title-input box-border! h-[46px]! w-full! rounded-[12px]! border! border-[#E5E7EB]! bg-white! px-[16px]! py-[12px]! text-[14px]! leading-[20px]! font-bold! text-[#374151]! [box-shadow:0_1px_2px_rgba(15,23,42,0.05)]! outline-none! transition focus:border-team focus:ring-1 focus:ring-team placeholder:text-[#9CA3AF]! placeholder:opacity-100!"
                />
              </div>

              <div className="team-ws-kanban-task-grid grid! grid-cols-[minmax(0,1fr)_minmax(0,1fr)]! gap-[16px]!">
                <div>
                  <label className="m-0! mb-[8px]! block! text-[12px]! leading-[16px]! font-bold! tracking-[0]! text-[#1F2937]!">담당 직군 (Role)</label>
                  <select
                    value={form.role}
                    onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
                    className="team-ws-kanban-task-role-select box-border! h-[46px]! w-full! cursor-pointer rounded-[12px]! border! border-[#E5E7EB]! bg-white! px-[16px]! py-[12px]! text-[14px]! leading-[20px]! font-bold! text-[#374151]! [box-shadow:0_1px_2px_rgba(15,23,42,0.05)]! outline-none! transition focus:border-team"
                  >
                    <option value="Frontend">Frontend (파란색)</option>
                    <option value="Backend">Backend (보라색)</option>
                    <option value="Designer">Designer (핑크색)</option>
                    <option value="공통">공통 (회색)</option>
                  </select>
                </div>
                <div>
                  <label className="m-0! mb-[8px]! block! text-[12px]! leading-[16px]! font-bold! tracking-[0]! text-[#1F2937]!">담당자 배정</label>
                  <select
                    value={form.assigneeId}
                    onChange={(event) => setForm((current) => ({ ...current, assigneeId: event.target.value }))}
                    className="team-ws-kanban-task-assignee-select box-border! h-[46px]! w-full! cursor-pointer rounded-[12px]! border! border-[#E5E7EB]! bg-white! px-[16px]! py-[12px]! text-[14px]! leading-[20px]! font-medium! text-[#374151]! [box-shadow:0_1px_2px_rgba(15,23,42,0.05)]! outline-none! transition focus:border-team"
                  >
                    <option value="">담당자 미지정</option>
                    {(data.dashboard?.members ?? []).map((member) => (
                      <option key={member.memberId} value={member.learnerId}>
                        {member.learnerId === session?.userId ? `${member.learnerName || `팀원 ${member.learnerId}`} (나)` : member.learnerName || `팀원 ${member.learnerId}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="team-ws-kanban-task-grid grid! grid-cols-[minmax(0,1fr)_minmax(0,1fr)]! gap-[16px]!">
                <div>
                  <label className="m-0! mb-[8px]! block! text-[12px]! leading-[16px]! font-bold! tracking-[0]! text-[#1F2937]!">우선순위</label>
                  <select
                    value={form.priority}
                    onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value as TaskPriority }))}
                    className="team-ws-kanban-task-priority-select box-border! h-[46px]! w-full! cursor-pointer rounded-[12px]! border! border-[#E5E7EB]! bg-white! px-[16px]! py-[12px]! text-[14px]! leading-[20px]! font-medium! text-[#374151]! [box-shadow:0_1px_2px_rgba(15,23,42,0.05)]! outline-none! transition focus:border-team"
                  >
                    <option value="HIGH">긴급 (High)</option>
                    <option value="MEDIUM">보통 (Medium)</option>
                    <option value="LOW">낮음 (Low)</option>
                  </select>
                </div>
                <div>
                  <label className="m-0! mb-[8px]! block! text-[12px]! leading-[16px]! font-bold! tracking-[0]! text-[#1F2937]!">마감일 (기한)</label>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))}
                    className="team-ws-kanban-task-date-input box-border! h-[46px]! w-full! cursor-pointer rounded-[12px]! border! border-[#E5E7EB]! bg-white! px-[16px]! py-[12px]! text-[14px]! leading-[20px]! font-medium! text-[#374151]! [box-shadow:0_1px_2px_rgba(15,23,42,0.05)]! outline-none! transition focus:border-team"
                  />
                </div>
              </div>

              <div>
                <label className="m-0! mb-[8px]! block! text-[12px]! leading-[16px]! font-bold! tracking-[0]! text-[#1F2937]!">상세 설명</label>
                <textarea
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  placeholder="작업의 구체적인 내용이나 이슈 링크 등을 기록하세요."
                  className="team-ws-kanban-task-desc box-border! h-[128px]! min-h-[128px]! w-full! resize-none! rounded-[12px]! border! border-[#E5E7EB]! bg-white! p-[16px]! text-[14px]! leading-[22.75px]! font-normal! text-[#111827]! [box-shadow:0_1px_2px_rgba(15,23,42,0.05)]! outline-none! transition focus:border-team focus:ring-1 focus:ring-team placeholder:text-[#9CA3AF]! placeholder:opacity-100!"
                ></textarea>
              </div>
              {error ? <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-bold text-red-500">{error}</p> : null}
            </div>

            <div className="team-ws-kanban-task-footer flex shrink-0! items-center! justify-between! border-t! border-gray-100 border-t-[#F3F4F6]! bg-[#F9FAFB]! p-[20px]!">
              {modalTask ? (
                <button type="button" onClick={() => void deleteTask()} disabled={submitting} className="team-ws-kanban-task-delete flex h-[38px]! items-center gap-[4px]! rounded-[12px]! border! border-[#FECACA]! bg-white! px-[16px]! py-[10px]! text-[12px]! leading-[16px]! font-bold! text-[#EF4444]! [box-shadow:0_1px_2px_rgba(15,23,42,0.05)]! transition hover:bg-red-50 disabled:opacity-60">
                  <i className="fas fa-trash-alt"></i>
                  삭제
                </button>
              ) : <span></span>}
              <div className="ml-auto flex gap-2">
                <button type="button" onClick={closeTaskModal} className="team-ws-kanban-task-cancel h-[42px]! rounded-[12px]! border! border-[#E5E7EB]! bg-white! px-[24px]! py-[10px]! text-[14px]! leading-[20px]! font-bold! text-[#374151]! [box-shadow:0_1px_2px_rgba(15,23,42,0.05)]! transition hover:bg-gray-100">취소</button>
                <button type="submit" disabled={submitting} className="team-ws-kanban-task-save flex! h-[42px]! items-center! gap-[8px]! rounded-[12px]! [border:0_none]! bg-[#111827]! px-[32px]! py-[10px]! text-[14px]! leading-[20px]! font-bold! text-white! [box-shadow:0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1)]! transition hover:bg-black disabled:opacity-60">
                  <i className="fas fa-save text-[14px]! leading-[20px]!"></i>
                  저장하기
                </button>
              </div>
            </div>
          </form>
        </Modal>
      ) : null}
    </>
  )
}
