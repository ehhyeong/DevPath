import { useMemo,useState,type ReactNode } from 'react';
import { navigateTo } from '../../../lib/spa-navigation';
import { PageHeading,StatCard } from './instructor-workspace-shared';
import { avatarUrl,buildAssignmentStudentRow,buildHref,buildStudentWeekProgress,compareTasksByAssignmentOrder,eventTypeOf,formatDate,formatTime,inferAssignmentWeek,inferCurrentAssignmentWeek,isQuestionAnswered,isSameDay,noticeContent,noticeImportant,relativeTime } from './instructor-workspace-support';
import type { WorkspaceData } from './instructor-workspace-types';



export function DashboardPage({ data, workspaceId, onOpenNotice }: { data: WorkspaceData; workspaceId: number | null; onOpenNotice: () => void }) {
  const learners = useMemo(() => (data.dashboard?.members ?? [])
    .filter((member) => member.learnerId !== data.dashboard?.ownerId), [data.dashboard?.members, data.dashboard?.ownerId])
  const currentWeek = useMemo(() => inferCurrentAssignmentWeek(data.tasks), [data.tasks])
  const weekTasks = useMemo(() => data.tasks
    .filter((task, index) => inferAssignmentWeek(task, index + 1) === currentWeek)
    .sort(compareTasksByAssignmentOrder), [currentWeek, data.tasks])
  const currentAssignment = weekTasks.find((task) => !task.assigneeId || task.createdById === data.dashboard?.ownerId) ?? weekTasks[0] ?? null
  const weekRows = useMemo(() => learners.map((member) => {
    const assignedTasks = data.tasks
      .filter((task) => task.assigneeId === member.learnerId)
      .sort(compareTasksByAssignmentOrder)
    const task = assignedTasks.find((item, index) => inferAssignmentWeek(item, index + 1) === currentWeek) ?? null
    return buildAssignmentStudentRow(member, task)
  }), [currentWeek, data.tasks, learners])
  const passCount = weekRows.filter((row) => row.status === 'pass').length
  const waitingCount = weekRows.filter((row) => row.status === 'wait').length
  const rejectCount = weekRows.filter((row) => row.status === 'reject').length
  const missingCount = weekRows.filter((row) => row.status === 'missing').length
  const submittedCount = weekRows.length - missingCount
  const totalLearners = learners.length
  const progress = totalLearners === 0 ? 0 : Math.round(learners.reduce((sum, member) => {
    const assignedTasks = data.tasks.filter((task) => task.assigneeId === member.learnerId).sort(compareTasksByAssignmentOrder)
    const weeks = buildStudentWeekProgress(assignedTasks, currentWeek)
    const progressedCount = weeks.filter((week) => ['DONE', 'IN_REVIEW', 'IN_PROGRESS'].includes(week.status)).length
    return sum + Math.round((progressedCount / 4) * 100)
  }, 0) / totalLearners)
  const reviewWaiting = waitingCount
  const unanswered = data.questions.filter((question) => !isQuestionAnswered(question)).length
  const [now] = useState(() => Date.now())
  const upcomingEvents = [...data.events].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()).filter((event) => new Date(event.startAt).getTime() >= now - 86400000)
  const todayEvent = upcomingEvents.find((event) => isSameDay(event.startAt, new Date())) ?? upcomingEvents[0] ?? null
  const hasData = totalLearners > 0 || data.tasks.length > 0 || data.questions.length > 0 || data.events.length > 0
  const riskRows = learners.map((member) => {
    const assignedTasks = data.tasks.filter((task) => task.assigneeId === member.learnerId).sort(compareTasksByAssignmentOrder)
    const weeks = buildStudentWeekProgress(assignedTasks, currentWeek)
    const progressedCount = weeks.filter((week) => ['DONE', 'IN_REVIEW', 'IN_PROGRESS'].includes(week.status)).length
    const studentProgress = Math.round((progressedCount / 4) * 100)
    const missingWeeks = weeks.filter((week) => week.status === 'MISSING').length
    return { member, progress: studentProgress, missingWeeks }
  }).filter((row) => row.missingWeeks > 0 || row.progress < 50)
  const actionTasks = weekRows.filter((row) => row.status === 'wait').slice(0, 3)
  const actionQuestions = data.questions.filter((question) => !isQuestionAnswered(question)).slice(0, 2)

  return (
    <>
      <PageHeading
        page="dashboard"
        description={hasData ? '현재 진행 중인 멘토링의 주요 현황을 한눈에 파악하고 수강생들을 관리하세요.' : '새로운 멘토링이 개설되었습니다. 일정, 과제, 공지를 등록하면 이곳에 현황이 표시됩니다.'}
        action={<button type="button" onClick={onOpenNotice} className="flex items-center gap-2 rounded-xl bg-gray-900 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-black"><i className="fas fa-bullhorn" /> 새 공지사항 작성</button>}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard icon="fas fa-users" label="참여 수강생" value={totalLearners} suffix="명" tone={totalLearners > 0 ? 'text-blue-500' : 'text-gray-400'} onClick={() => { navigateTo(buildHref('students', workspaceId)) }} />
        <StatCard icon="fas fa-code-branch" label="리뷰 대기중 과제" value={reviewWaiting} suffix="건" tone={reviewWaiting > 0 ? 'text-red-500' : 'text-gray-400'} onClick={() => { navigateTo(buildHref('assignments', workspaceId)) }} />
        <StatCard icon="fas fa-question-circle" label="미답변 Q&A" value={unanswered} suffix="건" tone={unanswered > 0 ? 'text-yellow-500' : 'text-gray-400'} onClick={() => { navigateTo(buildHref('qna', workspaceId)) }} />
        <StatCard icon="fas fa-flag-checkered" label="평균 진도율" value={progress} suffix="%" tone="text-[#00C471]" />
      </div>

      <div className="flex flex-col items-start gap-6 lg:flex-row">
        <div className="flex w-full flex-col gap-6 lg:w-2/3">
          <section className={`relative overflow-hidden rounded-2xl border bg-white p-6 shadow-sm ${hasData ? 'border-[#7C3AED]' : 'border-gray-200'}`}>
            {hasData ? <div className="absolute top-0 right-0 h-32 w-32 translate-x-1/2 -translate-y-1/2 rounded-full bg-[#7C3AED] opacity-10 blur-2xl" /> : null}
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <span className={`mb-2 inline-block rounded border px-2 py-1 text-[10px] font-extrabold ${hasData ? 'border-purple-200 bg-[#EDE9FE] text-[#7C3AED]' : 'border-gray-200 bg-gray-100 text-gray-500'}`}>THIS WEEK ({hasData ? `${currentWeek}주차` : '시작 전'})</span>
                <h3 className={`text-lg font-extrabold ${hasData ? 'text-gray-900' : 'text-gray-400'}`}>{currentAssignment?.title ?? (hasData ? '이번 주 과제를 설정해주세요.' : '아직 첫 주차 학습이 시작되지 않았습니다.')}</h3>
              </div>
              {hasData ? <a href={buildHref('assignments', workspaceId)} className="relative z-10 shrink-0 rounded-lg bg-gray-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-black">제출 현황 상세 보기</a> : null}
            </div>
            <div className="relative z-10 rounded-xl border border-gray-100 bg-gray-50 p-4">
              <div className={`mb-2 flex justify-between text-xs font-bold ${hasData ? 'text-gray-700' : 'text-gray-400'}`}>
                <span>이번 주 과제 제출률</span>
                <span>{submittedCount} / {totalLearners} 명 제출</span>
              </div>
              <div className="mb-2 flex h-2 overflow-hidden rounded-full bg-gray-200">
                <div className="bg-green-500" style={{ width: `${totalLearners ? (passCount / totalLearners) * 100 : 0}%` }} />
                <div className="bg-yellow-400" style={{ width: `${totalLearners ? (waitingCount / totalLearners) * 100 : 0}%` }} />
                <div className="bg-red-400" style={{ width: `${totalLearners ? (rejectCount / totalLearners) * 100 : 0}%` }} />
                <div className="bg-gray-200" style={{ width: `${totalLearners ? (missingCount / totalLearners) * 100 : 100}%` }} />
              </div>
              <div className={`flex justify-end gap-4 text-[10px] font-bold ${hasData ? 'text-gray-500' : 'text-gray-400'}`}>
                {hasData ? (
                  <>
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500" /> Pass ({passCount})</span>
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-yellow-400" /> 대기중 ({waitingCount})</span>
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-gray-200" /> 미제출 ({missingCount})</span>
                  </>
                ) : (
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-gray-300" /> 수강생들의 제출을 기다리고 있습니다</span>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-extrabold text-gray-900"><i className={`fas fa-bolt ${actionTasks.length || actionQuestions.length ? 'text-yellow-500' : 'text-gray-300'}`} /> 강사 액션 필요 (최근 활동)</h3>
            {reviewWaiting === 0 && unanswered === 0 ? (
              <DashboardEmptyBox icon="fas fa-inbox" title="아직 확인해야 할 내역이 없습니다." description={<>수강생들이 과제를 제출하거나 Q&A에 질문을 남기면<br />이곳에 가장 먼저 알림이 표시됩니다.</>} />
            ) : (
              <div className="space-y-3">
                {actionTasks.map((row) => (
                  <a key={`${row.member.memberId}-${row.task?.taskId ?? 'task'}`} href={buildHref('assignments', workspaceId)} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-4 transition hover:-translate-y-0.5 hover:border-[#7C3AED] hover:shadow-sm">
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-red-200 bg-red-100 text-red-500"><i className="fas fa-code-branch" /></div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-gray-900"><span className="text-[#00C471]">{row.member.learnerName ?? '수강생'}</span> 수강생이 {currentWeek}주차 과제를 제출했습니다.</p>
                        <p className="mt-1 line-clamp-1 text-[10px] text-gray-500">{row.message}</p>
                      </div>
                    </div>
                    <span className="shrink-0 text-[10px] font-medium text-gray-400">{relativeTime(row.submittedAt)}</span>
                  </a>
                ))}
                {actionQuestions.map((question) => (
                  <a key={question.id} href={buildHref('qna', workspaceId)} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-4 transition hover:-translate-y-0.5 hover:border-[#7C3AED] hover:shadow-sm">
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-yellow-200 bg-yellow-100 text-yellow-600"><i className="fas fa-question" /></div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-gray-900"><span className="text-[#00C471]">{question.authorName ?? '수강생'}</span> 수강생이 질문을 남겼습니다.</p>
                        <p className="mt-1 line-clamp-1 text-[10px] text-gray-500">{question.title}</p>
                      </div>
                    </div>
                    <span className="shrink-0 text-[10px] font-medium text-gray-400">{relativeTime(question.createdAt)}</span>
                  </a>
                ))}
              </div>
            )}
          </section>

          <section className={`relative flex min-h-[280px] flex-col overflow-hidden rounded-2xl border bg-white p-6 shadow-sm ${riskRows.length > 0 ? 'border-red-200' : 'border-gray-100'}`}>
            {riskRows.length > 0 ? <div className="absolute top-0 right-0 h-32 w-32 translate-x-1/2 -translate-y-1/2 rounded-full bg-red-100 opacity-20 blur-2xl" /> : null}
            <div className="relative z-10 mb-4 flex shrink-0 items-center justify-between border-b border-gray-50 pb-3">
              <h3 className="flex items-center gap-2 text-sm font-extrabold text-gray-900">
                <i className={`fas ${riskRows.length > 0 ? 'fa-exclamation-triangle text-red-500' : 'fa-shield-alt text-[#00C471]'}`} /> 집중 케어 필요 수강생
              </h3>
              <span className={`rounded border px-2 py-0.5 text-[10px] font-bold ${riskRows.length > 0 ? 'border-red-100 bg-red-50 text-red-500' : 'border-green-100 bg-green-50 text-green-600'}`}>{riskRows.length > 0 ? `위험군 ${riskRows.length}명` : '안정적'}</span>
            </div>
            {riskRows.length === 0 ? (
              <DashboardEmptyBox icon="fas fa-smile" title="위험군 수강생이 없습니다!" description={<>진도율이 저조하거나 미제출이 반복되는 수강생이 발생하면<br />이곳에 자동으로 필터링되어 나타납니다.</>} iconClassName="bg-green-50 text-[#00C471]" />
            ) : (
              <div className="custom-scrollbar relative z-10 flex-1 space-y-3 overflow-y-auto pr-1">
                {riskRows.slice(0, 4).map((row, index) => (
                  <div key={row.member.memberId} className={`flex items-center justify-between rounded-xl border p-4 transition hover:-translate-y-0.5 hover:border-[#7C3AED] hover:shadow-sm ${index === 0 ? 'border-red-100 bg-red-50/30' : 'border-orange-100 bg-orange-50/30'}`}>
                    <div className="flex min-w-0 items-center gap-3">
                      <img src={row.member.profileImage ?? avatarUrl(row.member.learnerName)} className={`h-10 w-10 shrink-0 rounded-full border bg-white ${index === 0 ? 'border-red-200' : 'border-orange-200'}`} alt="" />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-gray-900">{row.member.learnerName ?? '수강생'} <span className={`ml-1 text-[10px] font-bold ${index === 0 ? 'text-red-500' : 'text-orange-500'}`}>진도율 {row.progress}%</span></p>
                        <p className="mt-0.5 text-[10px] text-gray-500">{row.missingWeeks}주차 과제 미제출 · {relativeTime(row.member.lastActiveAt ?? row.member.joinedAt)}</p>
                      </div>
                    </div>
                    <button type="button" className={`ml-2 shrink-0 rounded-lg border bg-white px-3 py-1.5 text-[10px] font-bold shadow-sm transition ${index === 0 ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-orange-200 text-orange-600 hover:bg-orange-50'}`}>
                      <i className="fas fa-paper-plane mr-1" />DM 보내기
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="flex w-full flex-col gap-6 lg:sticky lg:top-0 lg:w-1/3">
          <section className="flex shrink-0 flex-col rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between border-b border-gray-50 pb-3">
              <h3 className="flex items-center gap-2 text-sm font-extrabold text-gray-900"><i className="fas fa-bell text-gray-400" /> 배포한 공지사항</h3>
            </div>
            {data.notices.length === 0 ? (
              <DashboardEmptyBox icon="fas fa-bullhorn" title="등록된 공지사항이 없습니다." description={<>학습 시작 전, 전체 수강생을 환영하는<br />첫 인사 공지를 작성해 보세요!</>} action={<button type="button" onClick={onOpenNotice} className="rounded-lg bg-[#EDE9FE] px-4 py-2 text-[10px] font-bold text-[#7C3AED] transition hover:bg-[#7C3AED] hover:text-white">첫 공지 작성하기</button>} small />
            ) : (
              <div className="custom-scrollbar max-h-[220px] space-y-3 overflow-y-auto pr-1">
                {data.notices.slice(0, 5).map((notice) => (
                  <article key={notice.id} className="group relative rounded-xl border border-gray-100 bg-white p-4 transition hover:bg-gray-50">
                    <div className="mb-2 flex items-center justify-between">
                      <span className={`rounded border px-1.5 py-0.5 text-[9px] font-extrabold ${noticeImportant(notice) ? 'border-red-100 bg-red-50 text-red-500' : 'border-blue-100 bg-blue-50 text-blue-500'}`}>{noticeImportant(notice) ? '중요 공지' : '일반 공지'}</span>
                      <span className="text-[9px] text-gray-400">{relativeTime(notice.createdAt)}</span>
                    </div>
                    <p className="line-clamp-1 text-xs font-bold text-gray-900">{notice.title}</p>
                    <p className="mt-1 line-clamp-2 text-[10px] text-gray-500">{noticeContent(notice)}</p>
                    <div className="absolute top-3 right-3 flex gap-1 rounded border border-gray-100 bg-white/90 px-1 opacity-0 shadow-sm backdrop-blur transition group-hover:opacity-100">
                      <button type="button" className="h-6 w-6 text-gray-500 transition hover:text-[#00C471]"><i className="fas fa-pen text-[10px]" /></button>
                      <button type="button" className="h-6 w-6 text-gray-500 transition hover:text-red-500"><i className="fas fa-trash text-[10px]" /></button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className={`relative flex-initial overflow-hidden rounded-2xl border bg-white p-6 shadow-sm ${upcomingEvents.length > 0 ? 'border-[#7C3AED]' : 'border-gray-200'}`}>
            {upcomingEvents.length > 0 ? <div className="absolute top-0 right-0 h-32 w-32 translate-x-1/2 -translate-y-1/2 rounded-full bg-[#7C3AED] opacity-10 blur-2xl" /> : null}
            <div className="relative z-10 mb-4 flex items-center justify-between border-b border-gray-50 pb-3">
              <h3 className="flex items-center gap-2 text-sm font-extrabold text-gray-900"><i className={`${upcomingEvents.length > 0 ? 'fas fa-calendar-check text-[#7C3AED]' : 'fas fa-calendar text-gray-400'}`} /> 일정 및 라이브</h3>
              {upcomingEvents.length > 0 ? <a href={buildHref('schedule', workspaceId)} className="text-[10px] font-bold text-gray-500 hover:text-[#7C3AED]">전체보기 <i className="fas fa-chevron-right ml-0.5" /></a> : null}
            </div>
            {upcomingEvents.length === 0 ? (
              <DashboardEmptyBox icon="far fa-calendar-plus" title="다가오는 공식 일정이 없습니다." description={<>라이브 밋업(Live), 과제 마감일 등<br />주요 일정을 캘린더에 미리 등록하세요.</>} action={<a href={buildHref('schedule', workspaceId)} className="rounded-lg bg-gray-100 px-4 py-2 text-[10px] font-bold text-gray-600 transition hover:bg-gray-200">새 일정 등록하러 가기</a>} small />
            ) : (
              <div className="relative z-10 space-y-4">
                {todayEvent ? (
                  <article className="relative overflow-hidden rounded-xl bg-gray-900 p-4 text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg">
                    <div className="absolute -top-4 -right-4 h-16 w-16 animate-pulse rounded-full bg-red-500 opacity-20" />
                    <div className="mb-2 flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                      </span>
                      <span className="text-[10px] font-bold tracking-wide text-red-400 uppercase">{isSameDay(todayEvent.startAt, new Date()) ? 'Today Live' : 'Next Live'}</span>
                    </div>
                    <h4 className="mb-1 text-sm font-bold">{todayEvent.title}</h4>
                    <p className="mb-3 text-xs text-gray-400"><i className="far fa-clock mr-1" />{formatDate(todayEvent.startAt)} {formatTime(todayEvent.startAt)}{todayEvent.endAt ? ` - ${formatTime(todayEvent.endAt)}` : ''}</p>
                    <a href={buildHref('meeting', workspaceId)} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#7C3AED] py-2 text-xs font-bold text-white shadow-sm transition hover:bg-purple-700">
                      <i className="fas fa-video" /> 라이브 룸 열기
                    </a>
                  </article>
                ) : null}
                {upcomingEvents.filter((event) => event.eventId !== todayEvent?.eventId).slice(0, 2).map((event) => {
                  const type = eventTypeOf(event)
                  const isDeadline = type === 'deadline'
                  return (
                    <article key={event.eventId} className={`border-l-2 pl-3 ${isDeadline ? 'border-red-400' : 'border-gray-300'}`}>
                      <p className={`mb-0.5 text-[10px] font-bold ${isDeadline ? 'text-red-500' : 'text-gray-500'}`}>{isDeadline ? '과제 마감' : formatDate(event.startAt)}</p>
                      <p className="text-xs font-bold text-gray-800">{event.title}</p>
                      <p className="mt-0.5 text-[10px] text-gray-500">{formatTime(event.startAt)}{event.endAt ? ` - ${formatTime(event.endAt)}` : ''}</p>
                    </article>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  )
}

export function DashboardEmptyBox({ icon, title, description, action, small = false, iconClassName = 'bg-gray-100 text-gray-400' }: { icon: string; title: string; description: ReactNode; action?: ReactNode; small?: boolean; iconClassName?: string }) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-100 bg-gray-50/50 px-4 text-center ${small ? 'py-6' : 'min-h-[220px] py-8'}`}>
      <div className={`mb-4 flex items-center justify-center rounded-full ${small ? 'h-12 w-12 text-lg' : 'h-16 w-16 text-2xl'} ${iconClassName}`}>
        <i className={icon} />
      </div>
      <h4 className={`${small ? 'text-xs' : 'text-sm'} mb-1 font-bold text-gray-700`}>{title}</h4>
      <p className={`${small ? 'text-[10px]' : 'text-xs'} leading-5 text-gray-500`}>{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}
