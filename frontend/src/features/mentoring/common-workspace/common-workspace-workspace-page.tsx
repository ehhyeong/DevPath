import { useState,type FormEvent } from 'react'
import type { TaskPriority,TaskStatus,WorkspaceMember,WorkspaceTask } from './common-types'
import { SourceFormModal } from './common-workspace-shared'
import { STATUS_COLUMNS,formatDate } from './common-workspace-support'



export function WorkspacePage({
  tasks,
  members,
  memberNameById,
  search,
  setSearch,
  onCreateTask,
  onUpdateTaskStatus,
  submitting,
}: {
  tasks: WorkspaceTask[]
  members: WorkspaceMember[]
  memberNameById: Map<number, string>
  search: string
  setSearch: (value: string) => void
  onCreateTask: (payload: { title: string; description: string; priority: TaskPriority; dueDate: string }) => Promise<void>
  onUpdateTaskStatus: (task: WorkspaceTask, status: TaskStatus) => Promise<void>
  submitting: boolean
}) {
  const [formOpen, setFormOpen] = useState(false)
  const [filter, setFilter] = useState<'all' | 'urgent'>('all')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('3주차 미션')
  const [urgent, setUrgent] = useState(false)
  const [dueDate, setDueDate] = useState('')
  const loweredSearch = search.trim().toLowerCase()
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = loweredSearch
      ? `${task.title} ${task.description ?? ''}`.toLowerCase().includes(loweredSearch)
      : true
    const matchesFilter = filter === 'all' || task.priority === 'HIGH'

    return matchesSearch && matchesFilter
  })

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await onCreateTask({ title, description, priority: urgent ? 'HIGH' : 'MEDIUM', dueDate })
    setTitle('')
    setDescription('')
    setCategory('3주차 미션')
    setUrgent(false)
    setDueDate('')
    setFormOpen(false)
  }

  return (
    <div className="mentoring-source-workspace flex min-h-[calc(100vh-160px)] flex-col gap-0! overflow-hidden [&_input::placeholder]:text-[#9CA3AF]! [&_input::placeholder]:opacity-100!">
      <div className="mb-6 flex shrink-0 flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-gray-900">
            <i className="fas fa-columns text-brand"></i>
            개인 칸반 (To-do)
          </h1>
          <p className="mt-2 text-sm text-gray-500">나의 과제 진행 상황과 개인 학습 일정을 한눈에 관리하세요.</p>
        </div>
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <div className="relative flex w-44 items-center md:w-60">
            <i className="fas fa-search absolute left-3.5 text-xs text-gray-400"></i>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="할 일 제목, 내용 검색..."
              className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-4 text-xs font-medium shadow-sm outline-none transition focus:border-[#00C471] focus:ring-1 focus:ring-[#00C471]"
            />
          </div>
          <div className="hidden rounded-xl border border-gray-200 bg-white p-1 shadow-sm md:flex md:gap-1">
            {[
              ['all', '전체'],
              ['urgent', '긴급'],
            ].map(([key, label]) => (
              <button
                type="button"
                key={key}
                onClick={() => setFilter(key as 'all' | 'urgent')}
                className={
                  filter === key
                    ? 'rounded-lg bg-gray-100 px-4 py-1.5 text-xs font-bold text-gray-800 transition'
                    : 'flex items-center gap-1 rounded-lg px-4 py-1.5 text-xs font-bold text-gray-500 transition hover:text-gray-800'
                }
              >
                {key === 'urgent' ? <i className="fas fa-fire text-red-500"></i> : null}
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="flex shrink-0 items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-green-600"
          >
            <i className="fas fa-plus"></i>
            새 할 일 추가
          </button>
        </div>
      </div>

      <div className="custom-scrollbar flex min-h-[520px] flex-1 gap-6 overflow-x-auto pb-4">
        {STATUS_COLUMNS.map((column) => {
          const columnTasks = filteredTasks.filter((task) => task.status === column.status)

          return (
            <section key={column.status} className="mentoring-source-kanban-col flex min-w-[320px]! flex-1 flex-col rounded-[16px]! border-[1px]! border-[rgba(229,231,235,0.8)]! bg-[rgba(243,244,246,0.7)]! p-4">
              <div className="mb-4 flex items-center justify-between px-1">
                <h3 className={`text-sm font-extrabold ${column.tone}`}>
                  {column.label}
                  <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${column.countTone}`}>{columnTasks.length}</span>
                </h3>
              </div>

              <div className="custom-scrollbar flex min-h-[360px] flex-1 flex-col gap-3 overflow-y-auto">
                {columnTasks.map((task) => {
                  const nextStatus = task.status === 'TODO' ? 'IN_PROGRESS' : task.status === 'IN_PROGRESS' ? 'DONE' : 'TODO'
                  const assigneeName = task.assigneeId ? memberNameById.get(task.assigneeId) ?? `#${task.assigneeId}` : members[0]?.learnerName ?? '미배정'
                  const done = task.status === 'DONE'

                  return (
                    <article
                      key={task.taskId}
                      onDoubleClick={() => void onUpdateTaskStatus(task, nextStatus)}
                      className={`rounded-[12px]! border bg-white p-[16px]! shadow-sm transition hover:-translate-y-0.5 hover:border-[#00C471] hover:shadow-md ${
                        done ? 'border-gray-200 bg-gray-50 opacity-75' : task.priority === 'HIGH' ? 'border-red-200' : 'border-gray-200'
                      }`}
                      title="더블클릭하면 다음 상태로 이동합니다."
                    >
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <span className="rounded border border-purple-100 bg-purple-50 px-2 py-0.5 text-[10px] font-extrabold text-[#7C3AED]">
                          {task.createdById ? '3주차 미션' : '개인 학습'}
                        </span>
                        {task.priority === 'HIGH' ? (
                          <span className="flex items-center gap-1 rounded border border-red-100 bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-500">
                            <i className="fas fa-exclamation-circle"></i>
                            긴급
                          </span>
                        ) : null}
                      </div>
                      <h4 className={`mb-1 text-sm font-bold ${done ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{task.title}</h4>
                      <p className="mb-3 line-clamp-2 min-h-[32px] text-xs leading-relaxed text-gray-500">
                        {task.description ?? '설명 없음'}
                      </p>
                      <div className="flex items-center justify-between gap-2 text-[10px] font-bold text-gray-400">
                        <span>
                          <i className="far fa-clock mr-1"></i>
                          {task.dueDate ? `${formatDate(task.dueDate)} 마감` : '기한 없음'}
                        </span>
                        <span className="truncate">{assigneeName}</span>
                      </div>
                    </article>
                  )
                })}
                {columnTasks.length === 0 ? (
                  <div className="mt-auto mb-[220px] flex min-h-[140px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 text-center text-xs font-bold text-gray-400">
                    <i className="fas fa-inbox mb-3 text-2xl text-gray-300"></i>
                    <p>
                      {column.status === 'TODO'
                        ? '현재 대기 중인 작업이 없습니다.'
                        : column.status === 'IN_PROGRESS'
                          ? '현재 진행 중인 작업이 없습니다.'
                          : '완료된 작업이 없습니다.'}
                    </p>
                    <p className="mt-1 font-medium">
                      {column.status === 'TODO'
                        ? '카드를 이곳으로 드래그하거나 새 할 일을 추가하세요.'
                        : column.status === 'IN_PROGRESS'
                          ? '카드를 이곳으로 드래그하세요.'
                          : '카드를 이곳으로 드래그하세요.'}
                    </p>
                  </div>
                ) : null}
              </div>
            </section>
          )
        })}
      </div>

      <SourceFormModal
        open={formOpen}
        title="새 할 일 추가"
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        footer={
          <>
            <button type="button" onClick={() => setFormOpen(false)} className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-100">
              취소
            </button>
            <button type="submit" disabled={submitting} className="flex items-center gap-2 rounded-xl bg-brand px-6 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-60">
              <i className="fas fa-save"></i>
              저장
            </button>
          </>
        }
      >
        <div>
          <label className="mb-2 block text-xs font-bold text-gray-600">
            할 일 제목 <span className="text-red-500">*</span>
          </label>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
            placeholder="예: Redis 설정 파일 작성하기"
          />
        </div>
        <div>
          <label className="mb-2 block text-xs font-bold text-gray-600">상세 내용</label>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="h-24 w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
            placeholder="필요한 작업이나 메모를 기록하세요."
          ></textarea>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-2 block text-xs font-bold text-gray-600">카테고리</label>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="w-full cursor-pointer rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium shadow-sm outline-none transition focus:border-brand"
            >
              <option value="1주차 미션">1주차 미션</option>
              <option value="2주차 미션">2주차 미션</option>
              <option value="3주차 미션">3주차 미션</option>
              <option value="개인 학습">개인 학습</option>
              <option value="포트폴리오">포트폴리오</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold text-gray-600">마감일</label>
            <input
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              className="w-full cursor-pointer rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-brand"
            />
          </div>
        </div>
        <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-red-100 bg-red-50 p-4">
          <input
            type="checkbox"
            checked={urgent}
            onChange={(event) => setUrgent(event.target.checked)}
            className="h-4 w-4 cursor-pointer rounded border-gray-300 text-brand accent-red-500 focus:ring-brand"
          />
          <span className="select-none text-sm font-bold text-red-600">🔥 긴급으로 설정 (최우선 처리 필요)</span>
        </label>
      </SourceFormModal>
    </div>
  )
}
