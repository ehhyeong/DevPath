import { useMemo,useState } from 'react'
import { EmptyState,Modal,PageHeading,StatCard } from './instructor-workspace-shared'
import { avatarUrl,buildStudentWeekProgress,compareTasksByAssignmentOrder,inferCurrentAssignmentWeek,studentHistoryTone,studentWeekIcon,studentWeekTitle,type StudentProgressRow } from './instructor-workspace-support'
import type { WorkspaceData } from './instructor-workspace-types'



export function StudentsPage({ data }: { data: WorkspaceData }) {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'ontrack' | 'lagging'>('all')
  const [dmTarget, setDmTarget] = useState<StudentProgressRow | null>(null)
  const [detailTarget, setDetailTarget] = useState<StudentProgressRow | null>(null)
  const currentWeek = useMemo(() => inferCurrentAssignmentWeek(data.tasks), [data.tasks])
  const rows = useMemo<StudentProgressRow[]>(() => (data.dashboard?.members ?? [])
    .filter((member) => member.learnerId !== data.dashboard?.ownerId)
    .map((member) => {
      const assigned = data.tasks
        .filter((task) => task.assigneeId === member.learnerId)
        .sort(compareTasksByAssignmentOrder)
      const weeks = buildStudentWeekProgress(assigned, currentWeek)
      const progressedCount = weeks.filter((week) => ['DONE', 'IN_REVIEW', 'IN_PROGRESS'].includes(week.status)).length
      const progress = Math.round((progressedCount / 4) * 100)
      const stalledWeek = weeks.find((week) => week.status === 'MISSING')?.week ?? null
      return {
        member,
        weeks,
        progress,
        qnaCount: data.questions.filter((question) => question.authorId === member.learnerId).length,
        currentWeek,
        stalledWeek,
        lagging: stalledWeek !== null,
      }
    }), [currentWeek, data.dashboard?.members, data.dashboard?.ownerId, data.questions, data.tasks])
  const filteredRows = rows.filter((row) => {
    const matchesName = (row.member.learnerName ?? '').toLowerCase().includes(query.toLowerCase())
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'lagging' ? row.lagging : !row.lagging)
    return matchesName && matchesStatus
  })
  const onTrackCount = rows.filter((row) => !row.lagging).length
  const laggingCount = rows.filter((row) => row.lagging).length

  return (
    <>
      <PageHeading page="students" description="전체 수강생의 진도율을 한눈에 파악하고 1:1 학습 코칭을 진행하세요." />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard icon="fas fa-users" label="총 수강생" value={rows.length} suffix="명" tone="text-blue-500" />
        <StatCard icon="fas fa-running" label="진도 정상 (On Track)" value={onTrackCount} suffix="명" tone="text-[#00C471]" />
        <StatCard icon="fas fa-exclamation-triangle" label="진도 지연 (위험군)" value={laggingCount} suffix="명" tone="text-red-500" />
      </div>
      <section className="mb-6 flex flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-100 bg-gray-50 p-4 md:flex-row md:items-center md:justify-between">
          <h2 className="text-sm font-extrabold text-gray-900">수강생 진도 현황</h2>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative w-full sm:w-64">
              <i className="fas fa-search absolute top-1/2 left-3 -translate-y-1/2 text-xs text-gray-400" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full rounded-lg border border-gray-200 bg-white py-2 pr-3 pl-9 text-xs font-bold outline-none transition focus:border-[#7C3AED]" placeholder="수강생 이름 검색" />
            </div>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'all' | 'ontrack' | 'lagging')} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-600 outline-none transition focus:border-[#7C3AED]">
              <option value="all">진도율 전체</option>
              <option value="ontrack">진도 정상 (On Track)</option>
              <option value="lagging">진도 지연 (Lagging)</option>
            </select>
          </div>
        </div>
        {filteredRows.length === 0 ? (
          <EmptyState icon="fas fa-user-graduate" title="표시할 수강생이 없습니다." description="검색 조건에 맞는 수강생이 없거나 아직 멘토링에 참여한 수강생이 없습니다." />
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[920px]">
              <div className="grid grid-cols-12 gap-4 border-b border-gray-100 bg-white px-6 py-3 text-[10px] font-extrabold tracking-wider text-gray-400 uppercase">
                <span className="col-span-3">수강생 정보</span>
                <span className="col-span-4">전체 진척도 (총 4주차)</span>
                <span className="col-span-3 text-center">주차별 통과 현황</span>
                <span className="col-span-2 text-right">관리 액션</span>
              </div>
              {filteredRows.map((row) => (
                <StudentProgressItem key={row.member.memberId} row={row} onDetail={() => setDetailTarget(row)} onDm={() => setDmTarget(row)} />
              ))}
            </div>
          </div>
        )}
      </section>
      {dmTarget ? <StudentDmModal row={dmTarget} onClose={() => setDmTarget(null)} /> : null}
      {detailTarget ? <StudentDetailModal row={detailTarget} onClose={() => setDetailTarget(null)} /> : null}
    </>
  )
}

export function StudentProgressItem({ row, onDetail, onDm }: { row: StudentProgressRow; onDetail: () => void; onDm: () => void }) {
  return (
    <div className={`grid grid-cols-12 items-center gap-4 border-b border-gray-50 px-6 py-4 transition ${row.lagging ? 'border-l-4 border-l-red-500 bg-red-50/20' : 'hover:bg-gray-50/50'}`}>
      <div className="col-span-3 flex items-center gap-3">
        <img src={row.member.profileImage ?? avatarUrl(row.member.learnerName)} className={`h-10 w-10 rounded-full border border-gray-200 bg-white shadow-sm ${row.lagging ? 'grayscale opacity-80' : ''}`} alt="" />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-gray-900">{row.member.learnerName ?? '수강생'}</p>
          <a href={`https://github.com/${encodeURIComponent((row.member.learnerName ?? 'learner').replace(/\s+/g, '').toLowerCase())}`} target="_blank" rel="noreferrer" className="mt-0.5 inline-block truncate text-[10px] text-gray-400 hover:text-[#00C471] hover:underline"><i className="fab fa-github" /> GitHub</a>
        </div>
      </div>
      <div className="col-span-4 pr-6">
        <div className="mb-1 flex items-end justify-between">
          <span className={`text-[10px] font-bold ${row.lagging ? 'text-red-500' : 'text-gray-500'}`}>{row.lagging ? `진도 지연 (Week ${row.stalledWeek} 정체)` : `진행 중 (Week ${row.currentWeek})`}</span>
          <span className={`text-xs font-black ${row.lagging ? 'text-red-500' : 'text-[#00C471]'}`}>{row.progress}%</span>
        </div>
        <div className={`h-1.5 overflow-hidden rounded-full ${row.lagging ? 'bg-red-100' : 'bg-gray-100'}`}>
          <div className={`h-1.5 rounded-full ${row.lagging ? 'bg-red-500' : 'bg-[#00C471]'}`} style={{ width: `${row.progress}%` }} />
        </div>
      </div>
      <div className="col-span-3 flex justify-center gap-2 text-lg">
        {row.weeks.map((week) => (
          <i key={`${row.member.memberId}-${week.week}-${week.status}`} className={studentWeekIcon(week.status)} title={studentWeekTitle(week)} />
        ))}
      </div>
      <div className="col-span-2 flex justify-end gap-2">
        <button type="button" onClick={onDetail} className="rounded-lg border border-gray-200 bg-white p-2 text-gray-500 transition hover:bg-green-50 hover:text-[#00C471]" title="상세 기록 보기">
          <i className="fas fa-chart-line" />
        </button>
        <button type="button" onClick={onDm} className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-bold whitespace-nowrap shadow-sm transition ${row.lagging ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100' : 'border-gray-200 bg-white text-gray-700 hover:border-[#7C3AED] hover:text-[#7C3AED]'}`}>
          <i className={row.lagging ? 'fas fa-exclamation-circle' : 'fas fa-comment-dots'} /> {row.lagging ? '독려 DM' : '상담 DM'}
        </button>
      </div>
    </div>
  )
}

export function StudentDmModal({ row, onClose }: { row: StudentProgressRow; onClose: () => void }) {
  const [message, setMessage] = useState('')
  return (
    <Modal title="개별 학습 상담 (DM)" icon="fas fa-envelope" maxWidth="max-w-md" onClose={onClose}>
      <div className="space-y-5 p-6">
        <div className="flex items-center gap-3 rounded-2xl border border-purple-100 bg-purple-50/60 p-4">
          <img src={row.member.profileImage ?? avatarUrl(row.member.learnerName)} className="h-11 w-11 rounded-full border-2 border-white bg-white shadow-sm" alt="" />
          <div>
            <p className="text-[10px] font-extrabold text-[#7C3AED]">받는 사람 (수강생)</p>
            <p className="text-sm font-extrabold text-gray-900">{row.member.learnerName ?? '수강생'}</p>
          </div>
        </div>
        <textarea value={message} onChange={(event) => setMessage(event.target.value)} className="h-40 w-full resize-none rounded-xl border border-gray-200 p-4 text-sm leading-6 outline-none transition focus:border-[#7C3AED]" placeholder="수강생에게 전달할 격려 메시지나 조언을 작성해주세요. 해당 수강생의 개인 알림으로 직접 발송됩니다." />
      </div>
      <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50 p-5">
        <button type="button" onClick={onClose} className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-700">취소</button>
        <button type="button" onClick={onClose} disabled={!message.trim()} className="rounded-xl bg-gray-900 px-8 py-2.5 text-sm font-bold text-white disabled:opacity-40">전송</button>
      </div>
    </Modal>
  )
}

export function StudentDetailModal({ row, onClose }: { row: StudentProgressRow; onClose: () => void }) {
  return (
    <Modal title="수강생 상세 기록" icon="fas fa-chart-line" maxWidth="max-w-lg" onClose={onClose}>
      <div className="flex items-start justify-between border-b border-gray-100 bg-gray-50 p-6">
        <div className="flex items-center gap-4">
          <img src={row.member.profileImage ?? avatarUrl(row.member.learnerName)} className="h-14 w-14 rounded-full border-2 border-white bg-gray-100 shadow-md" alt="" />
          <div>
            <h3 className="text-lg font-extrabold text-gray-900">{row.member.learnerName ?? '수강생'}</h3>
            <a href={`https://github.com/${encodeURIComponent((row.member.learnerName ?? 'learner').replace(/\s+/g, '').toLowerCase())}`} target="_blank" rel="noreferrer" className="mt-0.5 inline-block text-[11px] text-gray-500 hover:text-[#00C471] hover:underline"><i className="fab fa-github" /> GitHub 프로필 연동</a>
          </div>
        </div>
      </div>
      <div className="space-y-6 p-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <p className="mb-1 text-[10px] font-bold text-gray-500">전체 진척도</p>
            <p className={`text-xl font-black ${row.lagging ? 'text-red-500' : 'text-[#00C471]'}`}>{row.progress}%</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <p className="mb-1 text-[10px] font-bold text-gray-500">Q&A 질문 횟수</p>
            <p className="text-xl font-black text-gray-900">{row.qnaCount}<span className="ml-1 text-xs font-medium text-gray-500">회</span></p>
          </div>
        </div>

        <div>
          <h4 className="mb-3 flex items-center gap-1.5 text-xs font-extrabold text-gray-900"><i className="fas fa-history text-[#7C3AED]" /> 주차별 제출 히스토리</h4>
          <div className="relative space-y-3 before:absolute before:inset-0 before:ml-5 before:h-full before:w-0.5 before:-translate-x-px before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent md:before:mx-auto md:before:translate-x-0">
            {row.weeks.map((week) => {
              const tone = studentHistoryTone(week.status)
              return (
                <div key={week.week} className="group relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse">
                  <div className={`z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-4 border-white shadow md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 ${tone.circle}`}>
                    <i className={`${tone.icon} text-sm`} />
                  </div>
                  <div className={`w-[calc(100%-4rem)] rounded-xl border p-3 shadow-sm md:w-[calc(50%-2.5rem)] ${tone.card}`}>
                    <div className="mb-1 flex justify-between">
                      <span className="text-xs font-bold text-gray-900">{week.week}주차</span>
                      <span className={`text-[9px] ${tone.labelClass}`}>{tone.label}</span>
                    </div>
                    <p className="truncate text-[10px] text-gray-500">{week.task?.title ?? tone.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 justify-end border-t border-gray-100 bg-gray-50 p-5">
        <button type="button" onClick={onClose} className="rounded-xl bg-gray-900 px-6 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-black">닫기</button>
      </div>
    </Modal>
  )
}
