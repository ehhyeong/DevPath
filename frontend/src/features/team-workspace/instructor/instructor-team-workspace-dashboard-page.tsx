import { useState } from 'react';
import { EmptyPanel,PageHeading,StatCard } from './instructor-team-workspace-shared';
import type { ActivityLogItem,CalendarEvent,TeamData,WorkspaceTask } from './instructor-types';
import { avatarUrl,buildHref,formatDate,formatTime,isAnswered,membersOnly,relativeTime,shortRoleLabel,taskStatusMeta } from './instructor-workspace-support';



export function DashboardPage({ data, workspaceId }: { data: TeamData; workspaceId: number | null }) {
  const learners = membersOnly(data)
  const activeMilestone = data.milestones.find((item) => item.status === 'ACTIVE' || item.status === 'OPEN') ?? null
  const doneMembers = new Set(data.tasks.filter((task) => task.status === 'DONE' && task.assigneeId).map((task) => task.assigneeId))
  const milestoneProgress = learners.length ? Math.round((doneMembers.size / learners.length) * 100) : 0
  const overdue = data.tasks.filter((task) => task.status !== 'DONE' && task.dueDate && new Date(task.dueDate) < new Date()).length
  const health = learners.length === 0 ? { label: '분석 대기', color: 'text-gray-400', desc: '아직 수집된 프로젝트 활동 데이터가 없습니다.' } : overdue > 0 ? { label: '주의', color: 'text-red-500', desc: '일부 팀원의 작업이 지연되고 있습니다. 마일스톤 피드백이 필요합니다.' } : { label: '양호', color: 'text-green-500', desc: '팀 작업 흐름이 안정적으로 유지되고 있습니다.' }
  const unanswered = data.questions.filter((question) => !isAnswered(question)).length
  const latestTaskByMember = new Map<number, WorkspaceTask>()
  data.tasks.forEach((task) => { if (task.assigneeId && !latestTaskByMember.has(task.assigneeId)) latestTaskByMember.set(task.assigneeId, task) })
  const actions = [
    ...data.tasks.filter((task) => task.status === 'IN_REVIEW').slice(0, 3).map((task) => ({ title: '마일스톤 제출 리뷰하기', detail: task.title, href: buildHref('milestone', workspaceId) })),
    ...data.questions.filter((question) => !isAnswered(question)).slice(0, 2).map((question) => ({ title: `${question.authorName ?? '팀원'} Q&A 답변하기`, detail: question.title, href: buildHref('qna', workspaceId) })),
  ].slice(0, 4)

  return (
    <>
      <PageHeading page="dashboard" description="팀 프로젝트 진행 현황, 직군별 작업, 강사 액션을 한 화면에서 모니터링하세요." />
      <section className="relative flex flex-col items-center gap-8 overflow-hidden rounded-3xl border border-gray-100 bg-white p-8 shadow-sm md:flex-row">
        <div className="absolute top-0 right-0 h-64 w-64 -translate-y-1/2 translate-x-1/2 rounded-full bg-[#7C3AED] opacity-5 blur-3xl" />
        <div className="relative z-10 flex flex-1 items-center gap-6">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border-2 border-purple-100 bg-purple-50 text-[#7C3AED]"><i className="fas fa-heartbeat text-3xl" /></div>
          <div>
            <h2 className="mb-1 text-xl font-extrabold text-gray-900">현재 팀 프로젝트 건강도: <span className={health.color}>{health.label}</span></h2>
            <p className="text-xs text-gray-400">{health.desc}</p>
          </div>
        </div>
        <div className="relative z-10 w-full rounded-2xl border border-gray-100 bg-gray-50 p-5 md:w-80">
          <div className="mb-2 flex items-end justify-between">
            <div><p className="text-[10px] font-bold text-gray-400">이번 주 목표 달성률</p><p className="text-sm font-extrabold text-gray-900">{activeMilestone?.title ?? '설정된 마일스톤 없음'}</p></div>
            <span className="text-sm font-extrabold text-[#7C3AED]">{milestoneProgress}% ({doneMembers.size}/{learners.length}명)</span>
          </div>
          <div className="mb-3 flex h-2 w-full overflow-hidden rounded-full bg-gray-200"><div className="h-2 bg-[#7C3AED] transition-all" style={{ width: `${milestoneProgress}%` }} /></div>
          <a href={buildHref('milestone', workspaceId)} className="block w-full rounded-lg border border-gray-200 bg-white py-2 text-center text-xs font-bold text-gray-700 shadow-sm transition hover:bg-gray-50">팀원별 제출 현황 및 피드백 작성</a>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard icon="fas fa-users" label="담당 팀원" value={learners.length} suffix="명" tone="text-blue-500" />
        <StatCard icon="fas fa-flag-checkered" label="진행 마일스톤" value={data.milestones.filter((item) => item.status !== 'COMPLETED').length} suffix="개" tone="text-[#7C3AED]" />
        <StatCard icon="fas fa-code-branch" label="리뷰 대기 작업" value={data.tasks.filter((task) => task.status === 'IN_REVIEW').length} suffix="건" tone="text-yellow-500" />
        <StatCard icon="fas fa-question-circle" label="미답변 Q&A" value={unanswered} suffix="건" tone="text-red-500" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="space-y-6 lg:col-span-2">
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="mb-5 flex items-center gap-2 border-b border-gray-50 pb-3 font-extrabold text-gray-900"><i className="fas fa-search-location text-gray-400" />직군별 작업 모니터링</h3>
            {learners.length === 0 || data.tasks.length === 0 ? (
              <EmptyPanel icon="fas fa-tasks" title="모니터링할 작업 내역이 없습니다." description="팀원들이 칸반 보드에 카드를 등록하거나 개발 작업을 시작하면 직군 현황이 여기에 요약됩니다." action={<a href={buildHref('kanban', workspaceId)} className="rounded-lg bg-gray-900 px-4 py-2 text-xs font-bold text-white">팀 칸반 보드 확인하기</a>} />
            ) : (
              <div className="space-y-4">
                {learners.map((member) => {
                  const task = latestTaskByMember.get(member.learnerId)
                  const meta = task ? taskStatusMeta(task.status) : null
                  const roleLabel = member.roleLabel ?? shortRoleLabel(member.position)
                  return (
                    <div key={member.memberId} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-3">
                      <div className="flex items-center gap-4">
                        <img src={member.profileImage ?? avatarUrl(member.learnerName)} className="h-10 w-10 rounded-full border border-gray-200 bg-white" alt="" />
                        <div>
                          <p className="flex items-center gap-2 text-sm font-bold text-gray-900">
                            <span>{member.learnerName ?? '팀원'}</span>
                            {roleLabel ? <span title={member.position ?? roleLabel} className="rounded-md bg-gray-900 px-1.5 py-0.5 text-[10px] font-extrabold text-white">{roleLabel}</span> : null}
                          </p>
                          <p className="text-[10px] text-gray-500">{task?.title ?? '진행 중인 작업 없음'}</p>
                        </div>
                      </div>
                      {meta ? <span className={`rounded-lg px-2 py-1 text-[10px] font-bold ${meta.badge}`}>{meta.label}</span> : <span className="rounded-lg bg-gray-100 px-2 py-1 text-[10px] font-bold text-gray-400">대기</span>}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          <ActivityLogPanel logs={data.activityLogs} />
        </section>
        <aside className="space-y-6">
          <div className={`rounded-2xl border p-6 shadow-sm ${actions.length ? 'border-purple-100 bg-purple-50' : 'border-gray-200 bg-gray-50'}`}>
            <h3 className={`mb-4 flex items-center gap-2 text-sm font-extrabold ${actions.length ? 'text-[#7C3AED]' : 'text-gray-500'}`}><i className={actions.length ? 'fas fa-exclamation-circle' : 'fas fa-check-circle'} />강사 Action Required</h3>
            {actions.length ? <div className="space-y-3">{actions.map((item, index) => <a key={index} href={item.href} className="flex items-center justify-between rounded-xl bg-white p-3 text-xs shadow-sm transition hover:border-[#7C3AED]"><span><b className="block text-gray-900">{item.title}</b><span className="text-[10px] text-gray-500">{item.detail}</span></span><i className="fas fa-chevron-right text-gray-300" /></a>)}</div> : <EmptyPanel icon="fas fa-smile-beam" title="대기 중인 요청 없음" description="현재 즉시 검토하거나 답변해야 할 항목이 없습니다." />}
          </div>
          <ScheduleSummary events={data.events} workspaceId={workspaceId} />
        </aside>
      </div>
    </>
  )
}

export function ActivityLogPanel({ logs }: { logs: ActivityLogItem[] }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-extrabold text-gray-900"><i className="fas fa-history text-gray-400" />팀 주요 활동 로그</h3>
      {logs.length === 0 ? <EmptyPanel icon="fas fa-stream" title="최근 활동 로그가 없습니다." description="워크스페이스에서 발생한 팀 활동이 이곳에 표시됩니다." /> : (
        <div className="space-y-4">{logs.slice(0, 6).map((log) => <div key={log.logId} className="flex items-start gap-4"><div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full border border-blue-100 bg-blue-50 text-blue-500"><i className="fas fa-file-alt" /></div><div className="flex-1 rounded-xl border border-gray-100 bg-gray-50 p-3"><div className="mb-1 flex justify-between"><p className="text-xs font-bold text-gray-900"><span className="text-purple-600">{log.actorName ?? '시스템'}</span> {log.targetTitle ?? log.actionType ?? log.activityType}</p><span className="text-[10px] text-gray-400">{relativeTime(log.createdAt)}</span></div>{log.description ? <p className="text-[11px] text-gray-500">{log.description}</p> : null}</div></div>)}</div>
      )}
    </div>
  )
}

export function ScheduleSummary({ events, workspaceId }: { events: CalendarEvent[]; workspaceId: number | null }) {
  const [now] = useState(() => Date.now())
  const upcoming = [...events].filter((event) => new Date(event.startAt).getTime() >= now - 86400000).sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()).slice(0, 3)
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between"><h3 className="flex items-center gap-2 text-sm font-extrabold text-gray-900"><i className="far fa-calendar-check text-gray-400" />팀 공식 & 스크럼 일정</h3><a href={buildHref('schedule', workspaceId)} className="text-[10px] text-gray-400 hover:text-[#7C3AED]"><i className="fas fa-external-link-alt" /></a></div>
      {upcoming.length === 0 ? <EmptyPanel icon="far fa-calendar-plus" title="다가오는 일정이 없습니다." description="라이브 멘토링이나 코드 리뷰 일정을 추가해보세요." /> : <div className="mb-4 space-y-3">{upcoming.map((event) => <article key={event.eventId} className="rounded-xl border border-purple-100 bg-purple-50 p-3"><p className="text-xs font-bold text-gray-900">{event.title}</p><p className="mt-1 text-[10px] text-gray-500">{formatDate(event.startAt)} {formatTime(event.startAt)}</p></article>)}</div>}
      <a href={buildHref('meeting', workspaceId)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-black"><i className="fas fa-video" />호스트로 밋업 시작하기</a>
    </div>
  )
}
