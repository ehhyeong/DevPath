import { useMemo,useState,type FormEvent } from 'react'
import { createInstructorTeamMilestone,updateInstructorTeamMilestone,updateInstructorTeamTaskStatus } from './instructor-api'
import { EmptyPanel } from './instructor-team-workspace-shared'
import type { TeamData } from './instructor-types'
import { INSTRUCTOR_TEAM_MILESTONE_UI_LOCK_CLASSES,avatarUrl,buildHref,buildMilestoneDescription,buildMilestoneStudents,buildMilestoneWeeks,defaultMilestoneDate,membersOnly,milestoneStudentStatusMeta,normalizeMilestoneStatus,parseMilestoneFeedbackEntries,pushTeamNotification,roleBadgeTone,shortRoleLabel,taskStatusMeta,type MilestoneGuide,type MilestoneWeek } from './instructor-workspace-support'



export function MilestonePage({ data, workspaceId, reload }: { data: TeamData; workspaceId: number | null; reload: () => Promise<void> }) {
  const learners = membersOnly(data)
  const weeks = useMemo(() => buildMilestoneWeeks(data.milestones), [data.milestones])
  const firstActiveWeek = weeks.find((week) => week.isCurrent)?.week ?? 1
  const [currentWeek, setCurrentWeek] = useState(firstActiveWeek)
  const [selectedLearnerId, setSelectedLearnerId] = useState<number | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [successOpen, setSuccessOpen] = useState(false)
  const [feedbackText, setFeedbackText] = useState('')
  const selectedWeek = weeks.find((week) => week.week === currentWeek) ?? weeks[0]
  const students = useMemo(() => buildMilestoneStudents(learners, data.tasks), [learners, data.tasks])
  const selectedStudent = students.find((student) => student.member.learnerId === selectedLearnerId) ?? null
  const selectedFeedbackThread = useMemo(
    () => parseMilestoneFeedbackEntries(selectedStudent?.task?.description, selectedStudent?.member.learnerName),
    [selectedStudent?.task?.description, selectedStudent?.member.learnerName],
  )
  const mentorDisplayName = data.dashboard?.ownerName ?? '강사'
  const mentorProfileImage = data.dashboard?.ownerProfileImage ?? avatarUrl(mentorDisplayName)

  function switchWeek(week: number) {
    setCurrentWeek(week)
    setSelectedLearnerId(null)
    setFeedbackText('')
  }

  async function saveMilestone(form: { title: string; description: string; guide: MilestoneGuide }) {
    if (!workspaceId || !form.title.trim()) return
    const description = buildMilestoneDescription(form.description, form.guide)
    const startDate = selectedWeek.milestone?.startDate ?? defaultMilestoneDate(currentWeek, 0)
    const dueDate = selectedWeek.milestone?.dueDate ?? defaultMilestoneDate(currentWeek, 6)
    if (selectedWeek.milestone) {
      await updateInstructorTeamMilestone(selectedWeek.milestone.milestoneId, {
        title: form.title,
        description,
        startDate,
        dueDate,
        status: normalizeMilestoneStatus(selectedWeek.milestone.status),
      })
    } else {
      await createInstructorTeamMilestone(workspaceId, { title: form.title, description, startDate, dueDate })
    }
    pushTeamNotification(workspaceId, {
      title: selectedWeek.milestone ? '마일스톤 가이드 수정' : '마일스톤 가이드 등록',
      description: `${currentWeek}주차 "${form.title}" 기준이 저장되었습니다.`,
      href: buildHref('milestone', workspaceId),
      icon: 'fas fa-flag-checkered',
    })
    setModalOpen(false)
    setSuccessOpen(true)
    await reload()
  }

  async function setEvaluation(status: 'wait' | 'pass' | 'fail') {
    if (!workspaceId || !selectedStudent?.task) return
    const nextStatus = status === 'pass' ? 'DONE' : status === 'wait' ? 'IN_REVIEW' : 'TODO'
    await updateInstructorTeamTaskStatus(workspaceId, selectedStudent.task.taskId, nextStatus)
    pushTeamNotification(workspaceId, {
      title: '과제 평가 변경',
      description: `${selectedStudent.member.learnerName ?? '팀원'}님의 "${selectedStudent.task.title}" 과제를 ${taskStatusMeta(nextStatus).label} 처리했습니다.`,
      href: buildHref('milestone', workspaceId),
      icon: 'fas fa-clipboard-check',
    })
    await reload()
  }

  function sendFeedback() {
    if (!selectedStudent || !feedbackText.trim()) return
    setFeedbackText('')
  }

  return (
    <div className={`instructor-team-milestone flex h-full w-full flex-col font-['Pretendard'] text-[14px] leading-normal ${INSTRUCTOR_TEAM_MILESTONE_UI_LOCK_CLASSES}`}>
      <div className="mb-6 flex shrink-0 flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-gray-900"><i className="fas fa-flag-checkered text-[#7C3AED]" /> 마일스톤 및 피드백 관리</h1>
          <p className="mt-2 text-sm text-gray-500">팀의 주차별 목표와 직군 가이드라인을 설정하고, 팀원들의 산출물을 평가하세요.</p>
        </div>
        <button type="button" onClick={() => setModalOpen(true)} className="itw-top-action flex shrink-0 items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition hover:border-[#7C3AED] hover:text-[#7C3AED]"><i className="fas fa-edit" />이번 주 가이드라인 편집</button>
      </div>

      <div className="custom-scrollbar mb-6 flex shrink-0 items-center gap-3 overflow-x-auto pb-2">
        {weeks.map((week) => (
          <button key={week.week} type="button" onClick={() => switchWeek(week.week)} className={`itw-week-tab relative flex items-center justify-center rounded-xl border px-5 py-2.5 text-sm transition ${week.week === currentWeek ? 'border-gray-900 bg-gray-900 font-bold text-white' : week.isCurrent ? 'border-gray-200 bg-white font-bold text-gray-600 hover:bg-gray-100' : 'border-gray-200 bg-gray-50 font-bold text-gray-400 hover:bg-gray-100'}`}>
            Week {week.week}{week.isCurrent ? <span className="ml-2 h-2 w-2 rounded-full bg-red-500" /> : null}
          </button>
        ))}
      </div>

      <section className="group relative mb-6 min-h-[160px] shrink-0 overflow-hidden rounded-2xl bg-gray-900 p-6 text-white shadow-lg">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-[#7C3AED] opacity-20 blur-3xl" />
        <button type="button" onClick={() => setModalOpen(true)} title="수정하기" className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 opacity-0 transition hover:bg-white/20 group-hover:opacity-100"><i className="fas fa-pen text-xs" /></button>
        {selectedWeek.title ? (
          <div className="relative z-10">
            <span className="mb-3 inline-block rounded bg-[#7C3AED] px-2 py-1 text-[10px] font-extrabold text-white shadow-sm">TEAM MILESTONE (WEEK {selectedWeek.week})</span>
            <h2 className="mb-2 text-xl font-black">{selectedWeek.title}</h2>
            <p className="mb-5 max-w-3xl text-sm leading-relaxed text-gray-300">{selectedWeek.description || '이번 주차에 팀원들이 달성해야 할 목표를 설정하세요.'}</p>
            <div className="space-y-3 rounded-xl border border-gray-700 bg-gray-800 p-4">
              <h4 className="mb-2 border-b border-gray-700 pb-2 text-xs font-bold text-gray-400">내가 작성한 직군별 미션 가이드</h4>
              <MilestoneGuideRow color="blue" label="Frontend" text={selectedWeek.guide.frontend} />
              <MilestoneGuideRow color="purple" label="Backend" text={selectedWeek.guide.backend} />
              <MilestoneGuideRow color="pink" label="Designer" text={selectedWeek.guide.design} />
            </div>
          </div>
        ) : (
          <div className="relative z-10 flex flex-col items-center py-6 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gray-800 shadow-inner"><i className="fas fa-flag text-xl text-gray-500" /></div>
            <h2 className="mb-2 text-lg font-bold text-white">아직 마일스톤이 설정되지 않았습니다.</h2>
            <p className="mb-5 text-sm text-gray-400">이번 주차의 목표와 직군별 가이드라인을 팀원들에게 제시해주세요.</p>
            <button type="button" onClick={() => setModalOpen(true)} className="itw-top-action flex items-center gap-2 rounded-xl bg-[#7C3AED] px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-purple-600"><i className="fas fa-plus" />마일스톤 작성하기</button>
          </div>
        )}
      </section>

      <div className="grid min-h-[500px] flex-1 grid-cols-1 gap-6 pb-10 lg:grid-cols-12">
        <section className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm lg:col-span-3">
          <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-gray-50 p-4">
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-gray-900"><i className="fas fa-users text-gray-400" /> 제출 목록</h3>
            <span className="rounded bg-gray-200 px-2 py-0.5 text-[10px] font-bold text-gray-600">총 {students.length}명</span>
          </div>
          <div className="custom-scrollbar flex flex-1 flex-col overflow-y-auto">
            {students.length === 0 ? <EmptyPanel icon="fas fa-users" title="팀원이 없습니다." description="승인된 학습자가 생기면 제출 목록에 표시됩니다." /> : students.map((student) => {
              const role = student.member.roleLabel ?? shortRoleLabel(student.member.position)
              const active = student.member.learnerId === selectedLearnerId
              const status = milestoneStudentStatusMeta(student.status)
              return (
                <button key={student.member.memberId} type="button" onClick={() => setSelectedLearnerId(student.member.learnerId)} className={`flex flex-col gap-2 border-b border-gray-50 border-l-4 p-4 text-left transition hover:bg-gray-50 ${active ? 'border-l-[#7C3AED] bg-[#EDE9FE]' : status.border}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <img src={student.member.profileImage ?? avatarUrl(student.member.learnerName)} className="h-8 w-8 rounded-full border border-gray-200 bg-white" alt="" />
                      <p className="flex items-center gap-1 text-xs font-bold text-gray-900">{student.member.learnerName ?? '팀원'}{role ? <span className={`rounded border px-1 text-[8px] ${roleBadgeTone(role)}`}>{role}</span> : null}</p>
                    </div>
                    <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${status.badge}`}>{status.label}</span>
                  </div>
                  <p className={`w-full truncate rounded border border-gray-100 p-1 text-[10px] ${student.task ? 'bg-white text-gray-500' : 'bg-gray-50 italic text-gray-400'}`}>{student.task?.title ?? '제출된 산출물이 없습니다.'}</p>
                </button>
              )
            })}
          </div>
        </section>

        <section className="relative flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm lg:col-span-9">
          {!selectedStudent ? (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-gray-50 text-gray-400">
              <i className="fas fa-mouse-pointer mb-4 text-4xl text-gray-300" />
              <p className="text-sm font-bold">좌측에서 피드백을 남길 팀원을 선택해주세요.</p>
            </div>
          ) : null}
          <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-white p-5">
            <div className="flex items-center gap-4">
              <img src={selectedStudent?.member.profileImage ?? avatarUrl(selectedStudent?.member.learnerName)} className="h-12 w-12 rounded-full border-2 border-gray-100 bg-gray-50 shadow-sm" alt="" />
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <h3 className="text-lg font-extrabold text-gray-900">{selectedStudent?.member.learnerName ?? '-'}</h3>
                  <span className={`rounded border px-1.5 py-0.5 text-[10px] font-extrabold ${roleBadgeTone(selectedStudent?.member.roleLabel ?? selectedStudent?.member.position)}`}>{selectedStudent ? selectedStudent.member.roleLabel ?? shortRoleLabel(selectedStudent.member.position) ?? '-' : '-'}</span>
                </div>
                <div className="flex items-center gap-2">{selectedStudent?.task ? <><span className="max-w-[400px] truncate rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-bold text-gray-600">{selectedStudent.task.title}</span><span className="text-[11px] font-bold text-blue-600"><i className="fas fa-external-link-alt mr-1" />링크 열기</span></> : <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500">아직 과제를 제출하지 않았습니다.</span>}</div>
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-2">
              <span className="text-right text-[10px] font-bold text-gray-400">해당 주차 과제 평가</span>
              <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
                <button type="button" onClick={() => void setEvaluation('wait')} disabled={!selectedStudent?.task} className={`itw-eval-button rounded-md px-4 py-2 text-xs font-bold transition focus:outline-none ${selectedStudent?.status === 'wait' || selectedStudent?.status === 'none' ? 'border border-gray-200 bg-white text-gray-700' : 'text-gray-500 hover:bg-gray-200 hover:text-gray-700'}`}>검토중</button>
                <button type="button" onClick={() => void setEvaluation('pass')} disabled={!selectedStudent?.task} className={`itw-eval-button rounded-md px-4 py-2 text-xs font-bold transition focus:outline-none ${selectedStudent?.status === 'pass' ? 'bg-green-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-200 hover:text-green-600'}`}><i className="fas fa-check mr-0.5" />Pass</button>
                <button type="button" onClick={() => void setEvaluation('fail')} disabled={!selectedStudent?.task} className={`itw-eval-button rounded-md px-4 py-2 text-xs font-bold transition focus:outline-none ${selectedStudent?.status === 'fail' ? 'bg-red-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-200 hover:text-red-500'}`}>재제출</button>
              </div>
            </div>
          </div>
          <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto bg-gray-50/30 p-6">
            {selectedFeedbackThread.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-gray-400">
                <i className="far fa-comments mb-3 text-3xl text-gray-300" />
                <p className="text-sm font-bold">주고받은 피드백 내역이 없습니다.</p>
                <p className="mt-1 text-xs">하단 입력창을 통해 첫 피드백을 남겨보세요.</p>
              </div>
            ) : selectedFeedbackThread.map((entry) => {
              const mentorEntry = entry.speaker === 'mentor'
              const displayName = mentorEntry ? mentorDisplayName : entry.author
              return (
                <div key={entry.id} className={`flex gap-4 ${mentorEntry ? 'justify-end' : ''}`}>
                  {!mentorEntry ? (
                    <img src={selectedStudent?.member.profileImage ?? avatarUrl(displayName)} className="h-10 w-10 shrink-0 rounded-full border border-gray-200 bg-white shadow-sm" alt="" />
                  ) : null}
                  <div className={`max-w-[75%] ${mentorEntry ? 'text-right' : ''}`}>
                    <div className={`mb-1 flex items-center gap-2 ${mentorEntry ? 'justify-end' : ''}`}>
                      <span className="text-sm font-bold text-gray-900">{displayName}</span>
                      <span className="text-[10px] text-gray-400">{entry.time}</span>
                    </div>
                    <div className={`whitespace-pre-line rounded-2xl border p-4 text-left text-sm leading-relaxed text-gray-800 ${mentorEntry ? 'rounded-tr-none border-purple-100 bg-purple-50' : 'rounded-tl-none border-blue-100 bg-blue-50'}`}>{entry.text}</div>
                  </div>
                  {mentorEntry ? (
                    <img src={mentorProfileImage} className="h-10 w-10 shrink-0 rounded-full border border-purple-200 bg-white shadow-sm" alt="" />
                  ) : null}
                </div>
              )
            })}
          </div>
          <div className="shrink-0 border-t border-gray-100 bg-white p-4">
            <div className="flex gap-2 rounded-xl border border-gray-200 bg-gray-50 p-2 shadow-sm transition focus-within:border-[#7C3AED] focus-within:bg-white">
              <textarea value={feedbackText} onChange={(event) => setFeedbackText(event.target.value)} disabled={!selectedStudent} className="custom-scrollbar h-20 flex-1 resize-none border-none bg-transparent p-3 text-sm leading-relaxed outline-none disabled:cursor-not-allowed disabled:opacity-50" placeholder="마크다운을 지원합니다. 코드 리뷰 내용이나 수정 요청 사항을 상세히 적어주세요." />
              <div className="flex flex-col justify-end">
                <button type="button" onClick={sendFeedback} disabled={!selectedStudent || !feedbackText.trim()} className="itw-send-button flex w-20 items-center justify-center gap-1 rounded-lg bg-gray-900 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-40"><i className="fas fa-paper-plane" />전송</button>
              </div>
            </div>
          </div>
        </section>
      </div>

      {modalOpen ? <MilestoneEditModal week={selectedWeek} onClose={() => setModalOpen(false)} onSubmit={saveMilestone} /> : null}
      {successOpen ? <MilestoneSuccessModal onClose={() => setSuccessOpen(false)} /> : null}
    </div>
  )
}

export function MilestoneGuideRow({ color, label, text }: { color: 'blue' | 'purple' | 'pink'; label: string; text: string }) {
  const colorClass = color === 'blue' ? 'border-blue-500/50 bg-blue-500/20 text-blue-300' : color === 'purple' ? 'border-purple-500/50 bg-purple-500/20 text-purple-300' : 'border-pink-500/50 bg-pink-500/20 text-pink-300'
  return (
    <div className="flex items-start gap-3">
      <span className={`mt-0.5 w-16 shrink-0 rounded border px-1.5 py-0.5 text-center text-[10px] font-extrabold ${colorClass}`}>{label}</span>
      <p className="text-sm font-medium text-gray-200">{text || '아직 가이드라인이 입력되지 않았습니다.'}</p>
    </div>
  )
}

export function MilestoneEditModal({ week, onClose, onSubmit }: { week: MilestoneWeek; onClose: () => void; onSubmit: (form: { title: string; description: string; guide: MilestoneGuide }) => Promise<void> }) {
  const [form, setForm] = useState({ title: week.title, description: week.description, guide: week.guide })
  const [saving, setSaving] = useState(false)
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    try { await onSubmit(form) } finally { setSaving(false) }
  }
  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
      <form onSubmit={submit} className="flex max-h-[95vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-gray-50 p-6">
          <h3 className="flex items-center gap-2 text-lg font-extrabold text-gray-900"><i className="fas fa-edit text-[#7C3AED]" />Week {week.week} 마일스톤 설정</h3>
          <button type="button" onClick={onClose} className="itw-icon-button flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 shadow-sm transition hover:text-gray-900"><i className="fas fa-times" /></button>
        </div>
        <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto p-6">
          <label className="block"><span className="mb-2 block text-xs font-bold text-gray-800">마일스톤 목표 (제목) <span className="text-red-500">*</span></span><input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required placeholder="예: 핵심 기능 MVP 개발" className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-bold shadow-sm outline-none transition focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]" /></label>
          <label className="block"><span className="mb-2 block text-xs font-bold text-gray-800">목표 상세 설명</span><textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="이번 주차에 팀원들이 달성해야 할 목표를 자세히 적어주세요." className="h-24 w-full resize-none rounded-xl border border-gray-200 p-4 text-sm leading-relaxed shadow-sm outline-none transition focus:border-[#7C3AED]" /></label>
          <div className="border-t border-gray-200 pt-5">
            <h4 className="mb-4 flex items-center gap-2 text-sm font-extrabold text-gray-900"><i className="fas fa-tasks text-[#7C3AED]" />직군별 상세 가이드라인 할당</h4>
            <div className="space-y-4">
              <MilestoneGuideInput color="blue" label="Frontend" value={form.guide.frontend} placeholder="프론트엔드 직무가 수행해야 할 상세 가이드를 적어주세요." onChange={(value) => setForm({ ...form, guide: { ...form.guide, frontend: value } })} />
              <MilestoneGuideInput color="purple" label="Backend" value={form.guide.backend} placeholder="백엔드 직무가 수행해야 할 상세 가이드를 적어주세요." onChange={(value) => setForm({ ...form, guide: { ...form.guide, backend: value } })} />
              <MilestoneGuideInput color="pink" label="Designer" value={form.guide.design} placeholder="디자인 또는 기획 직무가 수행해야 할 상세 가이드를 적어주세요." onChange={(value) => setForm({ ...form, guide: { ...form.guide, design: value } })} />
            </div>
          </div>
        </div>
        <div className="flex shrink-0 justify-end gap-2 border-t border-gray-100 bg-gray-50 p-5">
          <button type="button" onClick={onClose} className="itw-modal-button rounded-xl border border-gray-200 bg-white px-6 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-100">취소</button>
          <button type="submit" disabled={saving} className="itw-modal-button flex items-center gap-2 rounded-xl bg-gray-900 px-8 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-black disabled:opacity-50"><i className="fas fa-save" />{saving ? '저장 중' : '팀원들에게 배포'}</button>
        </div>
      </form>
    </div>
  )
}

export function MilestoneGuideInput({ color, label, value, placeholder, onChange }: { color: 'blue' | 'purple' | 'pink'; label: string; value: string; placeholder: string; onChange: (value: string) => void }) {
  const tone = color === 'blue' ? { box: 'border-blue-100 bg-blue-50/50', badge: 'bg-blue-500', input: 'border-blue-200 focus:border-blue-500' } : color === 'purple' ? { box: 'border-purple-100 bg-purple-50/50', badge: 'bg-purple-500', input: 'border-purple-200 focus:border-purple-500' } : { box: 'border-pink-100 bg-pink-50/50', badge: 'bg-pink-500', input: 'border-pink-200 focus:border-pink-500' }
  return (
    <div className={`flex items-start gap-3 rounded-xl border p-4 ${tone.box}`}>
      <span className={`mt-1 w-16 shrink-0 rounded px-2 py-1 text-center text-[10px] font-extrabold text-white shadow-sm ${tone.badge}`}>{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={`h-20 flex-1 resize-none rounded-lg border bg-white p-3 text-sm outline-none ${tone.input}`} />
    </div>
  )
}

export function MilestoneSuccessModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[1060] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-purple-100 bg-purple-50 shadow-sm"><i className="fas fa-check text-3xl text-[#7C3AED]" /></div>
        <h3 className="mb-2 text-xl font-extrabold text-gray-900">저장 완료!</h3>
        <p className="mb-6 text-sm font-medium leading-relaxed text-gray-500">가이드라인이 성공적으로 저장되어 팀원들에게 배포되었습니다.</p>
        <button type="button" onClick={onClose} className="itw-confirm-button w-full rounded-xl bg-gray-900 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-black">확인</button>
      </div>
    </div>
  )
}
