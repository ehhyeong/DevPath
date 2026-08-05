import { useState,type DragEvent,type FormEvent } from 'react';
import { createInstructorTeamTask,deleteInstructorTeamTask,updateInstructorTeamTask,updateInstructorTeamTaskAssignee,updateInstructorTeamTaskStatus } from './instructor-api';
import type { TaskPriority,TaskStatus,TeamData,WorkspaceMember,WorkspaceTask } from './instructor-types';
import { avatarUrl,buildHref,buildKanbanDescription,INSTRUCTOR_TEAM_KANBAN_UI_LOCK_CLASSES,KANBAN_COLUMNS,kanbanPriorityMeta,kanbanRoleMeta,kanbanTaskRole,membersOnly,parseKanbanDescription,pushTeamNotification,taskStatusMeta,type KanbanFilter } from './instructor-workspace-support';



export function KanbanPage({ data, workspaceId, reload }: { data: TeamData; workspaceId: number | null; reload: () => Promise<void> }) {
  const members = membersOnly(data)
  const [modalTask, setModalTask] = useState<WorkspaceTask | null | 'new'>(null)
  const [keyword, setKeyword] = useState('')
  const [filter, setFilter] = useState<KanbanFilter>('all')

  const visibleTasks = data.tasks.filter((task) => {
    const role = kanbanTaskRole(task, members)
    const assignee = members.find((member) => member.learnerId === task.assigneeId)
    const haystack = `${task.title} ${parseKanbanDescription(task.description).description} ${assignee?.learnerName ?? ''}`.toLowerCase()
    const keywordMatched = !keyword.trim() || haystack.includes(keyword.trim().toLowerCase())
    const roleMatched = filter === 'all' || role === filter
    return keywordMatched && roleMatched
  })

  async function saveTask(form: { title: string; description: string; priority: TaskPriority; assigneeId: string; dueDate: string; role: KanbanFilter | 'common' }) {
    if (!workspaceId || !form.title.trim()) return
    const payload = { title: form.title, description: buildKanbanDescription(form.description, form.role), priority: form.priority, dueDate: form.dueDate || null, assigneeId: form.assigneeId ? Number(form.assigneeId) : null }
    const editing = Boolean(modalTask && modalTask !== 'new')
    if (modalTask && modalTask !== 'new') {
      await updateInstructorTeamTask(workspaceId, modalTask.taskId, payload)
      await updateInstructorTeamTaskAssignee(workspaceId, modalTask.taskId, payload.assigneeId)
    } else {
      await createInstructorTeamTask(workspaceId, payload)
    }
    pushTeamNotification(workspaceId, {
      title: editing ? '칸반 티켓 수정' : '칸반 티켓 추가',
      description: `"${form.title}" 티켓이 ${editing ? '수정' : '추가'}되었습니다.`,
      href: buildHref('kanban', workspaceId),
      icon: 'fas fa-columns',
    })
    setModalTask(null)
    await reload()
  }

  async function deleteTask(task: WorkspaceTask) {
    if (!workspaceId || !window.confirm('이 티켓을 강제로 삭제하시겠습니까? (팀원 칸반 보드에서도 사라집니다)')) return
    await deleteInstructorTeamTask(workspaceId, task.taskId)
    pushTeamNotification(workspaceId, {
      title: '칸반 티켓 삭제',
      description: `"${task.title}" 티켓이 삭제되었습니다.`,
      href: buildHref('kanban', workspaceId),
      icon: 'fas fa-trash-alt',
    })
    setModalTask(null)
    await reload()
  }

  async function moveTask(taskId: number, status: TaskStatus) {
    if (!workspaceId) return
    const task = data.tasks.find((item) => item.taskId === taskId)
    if (!task || task.status === status) return
    await updateInstructorTeamTaskStatus(workspaceId, taskId, status)
    pushTeamNotification(workspaceId, {
      title: '칸반 상태 변경',
      description: `"${task.title}" 티켓이 ${taskStatusMeta(status).column} 단계로 이동했습니다.`,
      href: buildHref('kanban', workspaceId),
      icon: 'fas fa-arrows-alt',
    })
    await reload()
  }

  function startDrag(event: DragEvent<HTMLElement>, taskId: number) {
    event.dataTransfer.setData('text/plain', String(taskId))
    event.dataTransfer.effectAllowed = 'move'
  }

  function dropTask(event: DragEvent<HTMLDivElement>, status: TaskStatus) {
    event.preventDefault()
    const taskId = Number(event.dataTransfer.getData('text/plain'))
    if (Number.isFinite(taskId)) void moveTask(taskId, status)
  }

  return (
    <div className={`instructor-team-kanban flex h-full min-h-0 flex-col overflow-hidden ${INSTRUCTOR_TEAM_KANBAN_UI_LOCK_CLASSES}`}>
      <div className="relative z-10 flex shrink-0 flex-col justify-between gap-4 border-b border-gray-200 bg-white px-8 py-6 shadow-sm md:flex-row md:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-gray-900"><i className="fas fa-columns text-[#7C3AED]" />팀 칸반 보드 모니터링</h1>
          <p className="mt-2 text-sm text-gray-500">팀원들이 생성한 티켓(작업) 진행 상황을 파악하고, 병목 현상(Bottleneck)이 없는지 확인하세요.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400" />
            <input value={keyword} onChange={(event) => setKeyword(event.target.value)} className="w-48 rounded-xl border border-gray-200 bg-gray-50 py-2.5 pr-4 pl-8 text-xs font-medium placeholder-gray-400 outline-none transition focus:border-[#7C3AED] focus:bg-white focus:ring-1 focus:ring-[#7C3AED]" placeholder="티켓 검색..." />
          </div>
          <div className="flex rounded-xl border border-gray-200 bg-gray-50 p-1">
            {[
              ['all', '전체 보기'],
              ['fe', 'Frontend'],
              ['be', 'Backend'],
              ['design', 'Designer'],
            ].map(([value, label]) => (
              <button key={value} type="button" onClick={() => setFilter(value as KanbanFilter)} className={`itw-kanban-filter-tab rounded-lg px-4 py-1.5 text-xs font-bold ${filter === value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>{label}</button>
            ))}
          </div>
          <button type="button" onClick={() => setModalTask('new')} className="itw-kanban-top-button flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-black"><i className="fas fa-plus" />강사 지시 티켓 추가</button>
        </div>
      </div>

      <div className="custom-scrollbar flex-1 overflow-x-auto overflow-y-hidden bg-[#F8F9FA] p-6">
        <div className="flex h-full min-w-max gap-6 pb-4">
          {KANBAN_COLUMNS.map((column) => {
            const columnTasks = visibleTasks.filter((task) => task.status === column.status)
            const totalCount = data.tasks.filter((task) => task.status === column.status).length
            return (
              <section key={column.status} className={`flex h-full w-80 shrink-0 flex-col rounded-2xl border ${column.wrapperClass}`}>
                {column.highlight ? <div className="pointer-events-none absolute inset-0 bg-yellow-400/5 blur-xl" /> : null}
                <div className={`relative flex shrink-0 items-center justify-between border-b p-4 ${column.headerClass}`}>
                  <h3 className="flex items-center gap-2 font-extrabold"><span className={`h-2 w-2 rounded-full ${column.dotClass}`} />{column.label}</h3>
                  <span className={`rounded-md border px-2 py-0.5 text-xs font-bold ${column.countClass}`}>{keyword || filter !== 'all' ? columnTasks.length : totalCount}</span>
                </div>
                <div className="custom-scrollbar relative z-10 flex-1 space-y-3 overflow-y-auto p-3" onDragOver={(event) => event.preventDefault()} onDrop={(event) => dropTask(event, column.status)}>
                  {columnTasks.map((task) => <KanbanTaskCard key={task.taskId} task={task} members={members} onOpen={() => setModalTask(task)} onDragStart={startDrag} />)}
                  {columnTasks.length === 0 ? (
                    <div className="pointer-events-none m-0 flex h-full min-h-[120px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 p-4 text-gray-400 opacity-60">
                      <i className="fas fa-inbox mb-2 text-2xl text-gray-300" />
                      <p className="text-xs font-bold text-gray-400">티켓이 없습니다</p>
                    </div>
                  ) : null}
                </div>
              </section>
            )
          })}
        </div>
      </div>

      {modalTask ? <TaskModal task={modalTask === 'new' ? null : modalTask} members={members} onClose={() => setModalTask(null)} onSubmit={saveTask} onDelete={deleteTask} /> : null}
    </div>
  )
}

export function KanbanTaskCard({ task, members, onOpen, onDragStart }: { task: WorkspaceTask; members: WorkspaceMember[]; onOpen: () => void; onDragStart: (event: DragEvent<HTMLElement>, taskId: number) => void }) {
  const assignee = members.find((member) => member.learnerId === task.assigneeId)
  const role = kanbanRoleMeta(kanbanTaskRole(task, members))
  const priority = kanbanPriorityMeta(task.priority)
  const done = task.status === 'DONE'
  const review = task.status === 'IN_REVIEW'
  return (
    <article draggable onDragStart={(event) => onDragStart(event, task.taskId)} onClick={onOpen} className={`kanban-card group relative cursor-grab rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-[#7C3AED] hover:shadow-lg ${done ? 'opacity-70' : ''} ${review ? 'shadow-md' : ''}`}>
      {review ? <div className="absolute -top-2 -right-2 animate-bounce rounded-full bg-red-500 px-1.5 py-0.5 text-[8px] font-bold text-white shadow-sm">리뷰 필요</div> : null}
      <div className="mb-2 flex items-start justify-between">
        <span className={`rounded border px-1.5 py-0.5 text-[9px] font-extrabold ${role.badge}`}>{role.label}</span>
        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-bold text-gray-400">#{role.prefix}-{String(task.taskId).padStart(2, '0').slice(-2)}</span>
      </div>
      <h4 className={`mb-2 text-sm font-bold leading-tight text-gray-900 transition group-hover:text-[#7C3AED] ${done ? 'line-through' : ''}`}>{task.title}</h4>
      <div className="mt-4 flex items-end justify-between">
        <div className="flex min-w-0 items-center gap-1.5">
          <img src={assignee?.profileImage ?? avatarUrl(assignee?.learnerName ?? task.assigneeName)} className="h-6 w-6 rounded-full border border-gray-200 bg-gray-50" title={assignee?.learnerName ?? task.assigneeName ?? '미배정'} alt="" />
          <span className="truncate text-[10px] font-medium text-gray-500">{assignee?.learnerName ?? task.assigneeName ?? '미배정'}</span>
        </div>
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${priority.className}`}>{priority.icon ? <i className={priority.icon} /> : null}{priority.label}</span>
      </div>
    </article>
  )
}

export function TaskModal({ task, members, onClose, onSubmit, onDelete }: { task: WorkspaceTask | null; members: WorkspaceMember[]; onClose: () => void; onSubmit: (form: { title: string; description: string; priority: TaskPriority; assigneeId: string; dueDate: string; role: KanbanFilter | 'common' }) => Promise<void>; onDelete: (task: WorkspaceTask) => Promise<void> }) {
  const parsedDescription = parseKanbanDescription(task?.description)
  const [form, setForm] = useState({
    title: task?.title ?? '',
    description: parsedDescription.description,
    priority: task?.priority ?? 'MEDIUM' as TaskPriority,
    assigneeId: task?.assigneeId ? String(task.assigneeId) : '',
    dueDate: task?.dueDate ?? '',
    role: task ? parsedDescription.role ?? kanbanTaskRole(task, members) : 'fe' as KanbanFilter | 'common',
  })
  const [saving, setSaving] = useState(false)
  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try { await onSubmit(form) } finally { setSaving(false) }
  }
  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
      <form onSubmit={submit} className="flex max-h-[95vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-gray-50 p-6">
          <h3 className="flex items-center gap-2 text-lg font-extrabold text-gray-900"><i className={`fas ${task ? 'fa-search' : 'fa-ticket-alt'} text-[#7C3AED]`} />{task ? '티켓 확인 및 피드백 수정' : '강사 지시 티켓 추가'}</h3>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 shadow-sm transition hover:text-gray-900"><i className="fas fa-times" /></button>
        </div>
        <div className="custom-scrollbar flex-1 space-y-5 overflow-y-auto p-6">
          <div className="flex items-center gap-2 rounded-xl border border-purple-100 bg-purple-50 p-3 text-xs font-medium text-[#7C3AED]"><i className="fas fa-info-circle" />멘토(강사)가 팀원에게 지시하는 강제 할당 티켓을 생성할 수 있습니다.</div>
          <label className="block"><span className="mb-2 block text-xs font-bold text-gray-800">작업 제목 <span className="text-red-500">*</span></span><input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-bold shadow-sm outline-none transition focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]" placeholder="어떤 작업을 팀원이 수행해야 하나요?" /></label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block"><span className="mb-2 block text-xs font-bold text-gray-800">담당 직군 (Role)</span><select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as KanbanFilter | 'common' })} className="w-full cursor-pointer rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 shadow-sm outline-none transition focus:border-[#7C3AED]"><option value="fe">Frontend (파란색)</option><option value="be">Backend (보라색)</option><option value="design">Designer (핑크색)</option><option value="common">공통 (회색)</option></select></label>
            <label className="block"><span className="mb-2 block text-xs font-bold text-gray-800">담당자 배정</span><select value={form.assigneeId} onChange={(event) => setForm({ ...form, assigneeId: event.target.value })} className="w-full cursor-pointer rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm outline-none transition focus:border-[#7C3AED]"><option value="">담당자 없음</option>{members.map((member) => <option key={member.memberId} value={member.learnerId}>{member.learnerName}</option>)}</select></label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <label className="block"><span className="mb-2 block text-xs font-bold text-gray-800">우선순위</span><select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value as TaskPriority })} className="w-full cursor-pointer rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm outline-none transition focus:border-[#7C3AED]"><option value="HIGH">긴급 (High)</option><option value="MEDIUM">보통 (Medium)</option><option value="LOW">낮음 (Low)</option></select></label>
            <label className="block"><span className="mb-2 block text-xs font-bold text-gray-800">마감일 (기한)</span><input type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} className="w-full cursor-pointer rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 shadow-sm outline-none transition focus:border-[#7C3AED]" /></label>
          </div>
          <label className="block"><span className="mb-2 block text-xs font-bold text-gray-800">상세 설명 및 피드백 <span className="font-normal text-gray-400">(수정 시 코멘트 활용)</span></span><textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="h-32 w-full resize-none rounded-xl border border-gray-200 p-4 text-sm leading-relaxed shadow-sm outline-none transition focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]" placeholder="지시할 내용이나, 팀원이 올린 작업물에 대한 리뷰(피드백)를 작성하세요." /></label>
        </div>
        <div className="flex shrink-0 items-center justify-between border-t border-gray-100 bg-gray-50 p-5">
          {task ? <button type="button" onClick={() => void onDelete(task)} className="flex items-center gap-1 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-xs font-bold text-red-500 shadow-sm transition hover:bg-red-50"><i className="fas fa-trash-alt" />티켓 삭제</button> : <span />}
          <div className="ml-auto flex gap-2">
            <button type="button" onClick={onClose} className="rounded-xl border border-gray-200 bg-white px-6 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-100">취소</button>
            <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-xl bg-gray-900 px-8 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-black disabled:opacity-50"><i className="fas fa-save" />{saving ? '저장 중' : '저장 / 배정'}</button>
          </div>
        </div>
      </form>
    </div>
  )
}
