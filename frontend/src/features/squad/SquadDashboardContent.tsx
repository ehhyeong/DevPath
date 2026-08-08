import { activityFallback, activityIcon, formatChatTime, formatEventDay, formatEventMonth, formatShortDate, getDday, isImportantNotice, navHref, percent, stripNoticePrefix, stripScheduleCategoryDescription } from './squad-dashboard-support'
import type { ActivityLog, CalendarEvent, Notice, VoiceChannel, WorkspaceErdChange, WorkspaceMember } from './dashboard-types'

type Props = {
  workspaceId: number | null
  notices: Notice[]
  activities: ActivityLog[]
  erdChanges: WorkspaceErdChange[]
  memberById: Map<number, WorkspaceMember>
  currentUserName: string
  doingCount: number
  doneCount: number
  goalRemainingPercent: number
  hasDashboardBodyData: boolean
  liveVoiceChannel: VoiceChannel | null | undefined
  taskTotal: number
  todoCount: number
  upcomingEvents: CalendarEvent[]
  onOpenNotice: () => void
}

export default function SquadDashboardContent(props: Props) {
  const { workspaceId, notices, activities, erdChanges, memberById, currentUserName, doingCount, doneCount, goalRemainingPercent, hasDashboardBodyData, liveVoiceChannel, taskTotal, todoCount, upcomingEvents, onOpenNotice } = props

  function renderActivity(activity: ActivityLog) {
    const actor = activity.actorId ? memberById.get(activity.actorId) : null
    const icon = activityIcon(activity.activityType)

    return (
      <div key={activity.logId} className="timeline-item timeline-line group relative flex gap-5 pb-6 before:absolute before:top-[24px] before:bottom-[-24px] before:left-[19px] before:z-0 before:w-[2px] before:bg-[#F3F4F6] before:content-[''] last:before:hidden">
        <div className={`w-10 h-10 rounded-full ${icon.className} flex items-center justify-center shrink-0 border-2 border-white shadow-sm z-10 relative group-hover:scale-110 transition`}>
          <i className={`fas ${icon.icon}`}></i>
        </div>
        <div className="hover-card flex-1 rounded-2xl border border-[#F3F4F6]! bg-gray-50 p-4 [transition:all_0.3s_cubic-bezier(0.4,0,0.2,1)]! hover:-translate-y-[3px] hover:border-[#E5E7EB]! hover:shadow-[0_10px_25px_-5px_rgba(0,0,0,0.05)]">
          <div className="flex justify-between items-start mb-1.5">
            <p className="text-sm font-bold text-gray-900">
              {actor?.learnerName ? <span className="text-blue-600">{actor.learnerName}</span> : null}
              {actor?.learnerName ? '님이 ' : ''}
              {activity.description || activityFallback(activity.activityType)}
            </p>
            <span className="text-[10px] text-gray-400 font-bold bg-white px-2 py-0.5 rounded border border-gray-100 shadow-sm">
              {formatShortDate(activity.createdAt)}
            </span>
          </div>
          <p className="text-xs text-gray-500 font-medium leading-relaxed">{activity.activityType ?? 'TEAM_ACTIVITY'}</p>
        </div>
      </div>
    )
  }

  function renderErdChange(change: WorkspaceErdChange) {
    const title = change.summary?.trim() || `ERD v${change.version} 저장`
    const authorName = change.updatedByName?.trim() || '팀원'

    return (
      <div key={change.versionId} className="hover-card flex items-start gap-3.5 rounded-xl border border-[#F3F4F6]! bg-gray-50 p-4 [transition:all_0.3s_cubic-bezier(0.4,0,0.2,1)]! hover:-translate-y-[3px] hover:border-[#E5E7EB]! hover:shadow-[0_10px_25px_-5px_rgba(0,0,0,0.05)]">
        <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0 border border-indigo-100">
          <i className="fas fa-table text-sm"></i>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center mb-1">
            <p className="text-sm font-bold text-gray-900 truncate">{title}</p>
            <span className="text-[10px] text-gray-400 font-bold shrink-0 ml-2">{formatShortDate(change.createdAt)}</span>
          </div>
          <p className="text-xs text-gray-500 font-medium leading-relaxed">
            {authorName}님이 <code className="px-1.5 py-0.5 bg-gray-200 text-red-500 rounded font-mono text-[11px]">v{change.version}</code> 설계를 저장했습니다.
          </p>
        </div>
      </div>
    )
  }

  return (
        <main className="squad-dashboard-main custom-scrollbar relative flex-1 overflow-y-auto p-8 font-['Pretendard',sans-serif] [&_a]:font-['Pretendard',sans-serif] [&_button]:font-['Pretendard',sans-serif]">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
              <div className="absolute right-0 top-0 w-64 h-64 bg-brand opacity-[0.03] rounded-full blur-3xl translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>

              <div>
                {hasDashboardBodyData ? (
                  <>
                    <p className="text-sm font-bold text-gray-500 mb-1">스프린트 2주차 진행 중</p>
                    <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">반갑습니다, {currentUserName}님! 👋</h2>
                    <p className="text-sm text-gray-600 mt-2 font-medium">
                      이번 주 팀 목표 달성까지 <span className="text-brand font-bold">{goalRemainingPercent}%</span> 남았습니다. 화이팅!
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-bold text-brand mb-1"><i className="fas fa-rocket mr-1"></i> 스쿼드 준비 완료!</p>
                    <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">반갑습니다, {currentUserName}님! 👋</h2>
                    <p className="text-sm text-gray-600 mt-2 font-medium">새로운 스쿼드 워크스페이스가 생성되었습니다. 첫 목표를 세우고 작업을 시작해보세요.</p>
                  </>
                )}
              </div>

              <div className="flex gap-3 w-full md:w-auto shrink-0 z-10">
                <a href={navHref('/squad-workspace', workspaceId)} className="squad-dashboard-action-button flex h-[44px]! min-h-[44px]! flex-1 box-border items-center justify-center gap-[8px] whitespace-nowrap rounded-[12px]! border border-gray-200 bg-white px-[24px]! py-0! text-[14px]! leading-[20px]! font-bold text-gray-700 shadow-sm transition hover:border-brand hover:text-brand md:flex-none [&_i]:text-[14px] [&_i]:leading-[20px]">
                  <i className="fas fa-columns"></i> {hasDashboardBodyData ? '내 칸반 보기' : '칸반보드 가기'}
                </a>
                <a href={navHref('/squad-meeting', workspaceId)} className="squad-dashboard-action-button flex h-[44px]! min-h-[44px]! flex-1 box-border items-center justify-center gap-[8px] whitespace-nowrap rounded-[12px]! bg-gray-900 px-[24px]! py-0! text-[14px]! leading-[20px]! font-bold text-white shadow-lg shadow-gray-900/20 transition hover:bg-black md:flex-none [&_i]:text-[14px] [&_i]:leading-[20px]">
                  <i className="fas fa-headset"></i> {hasDashboardBodyData ? '회의실 입장' : '첫 회의 열기'}
                </a>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 space-y-6">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-extrabold text-gray-900 flex items-center gap-2 text-lg">
                      <i className={`fas fa-tasks ${taskTotal > 0 ? 'text-brand' : 'text-gray-400'}`}></i> 내 이번 주 할 일
                    </h3>
                    {taskTotal > 0 ? (
                      <a className="text-xs font-bold text-gray-400 hover:text-brand transition" href={navHref('/squad-workspace', workspaceId)}>
                        전체보기 <i className="fas fa-chevron-right ml-1"></i>
                      </a>
                    ) : null}
                  </div>

                  {taskTotal > 0 ? (
                    <div className="grid grid-cols-3 gap-6 mb-2">
                      <div>
                        <div className="flex justify-between items-end mb-2">
                          <span className="text-xs font-bold text-gray-500">할 일 (To Do)</span>
                          <span className="text-lg font-black text-gray-800">{todoCount}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                          <div className="bg-gray-300 h-2.5 rounded-full" style={{ width: `${percent(todoCount, taskTotal)}%` }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between items-end mb-2">
                          <span className="text-xs font-bold text-blue-600">진행 중 (Doing)</span>
                          <span className="text-lg font-black text-blue-600">{doingCount}</span>
                        </div>
                        <div className="w-full bg-blue-50 rounded-full h-2.5 overflow-hidden">
                          <div className="bg-blue-500 h-2.5 rounded-full" style={{ width: `${percent(doingCount, taskTotal)}%` }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between items-end mb-2">
                          <span className="text-xs font-bold text-brand">완료 (Done)</span>
                          <span className="text-lg font-black text-brand">{doneCount}</span>
                        </div>
                        <div className="w-full bg-green-50 rounded-full h-2.5 overflow-hidden">
                          <div className="bg-brand h-2.5 rounded-full" style={{ width: `${percent(doneCount, taskTotal)}%` }}></div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 px-4 border-2 border-dashed border-gray-100 rounded-xl bg-gray-50/50 text-center">
                      <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 text-gray-300">
                        <i className="fas fa-clipboard-list text-2xl"></i>
                      </div>
                      <h4 className="text-gray-700 font-bold mb-1">아직 할당된 작업이 없습니다</h4>
                      <p className="text-xs text-gray-500 font-medium mb-5">작업 현황판에서 새로운 카드를 만들고 본인에게 할당해보세요.</p>
                      <a href={navHref('/squad-workspace', workspaceId)} className="text-sm font-bold text-brand bg-green-50 px-4 py-2 rounded-lg hover:bg-green-100 transition">
                        <i className="fas fa-plus mr-1"></i> 작업 카드 만들기
                      </a>
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
                  <h3 className="font-extrabold text-gray-900 flex items-center gap-2 text-lg mb-6">
                    <i className="fas fa-history text-gray-400"></i> 최근 팀 활동
                  </h3>

                  {activities.length > 0 ? (
                    <div className="space-y-0 pl-2">
                      {activities.slice(0, 5).map(renderActivity)}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <i className="fas fa-shoe-prints text-3xl text-gray-200 mb-3 rotate-[-45deg]"></i>
                      <p className="text-gray-500 font-bold text-sm mb-1">기록된 팀 활동이 없습니다</p>
                      <p className="text-[11px] text-gray-400 font-medium">작업 완료, 코드 리뷰 등의 활동이 시작되면 기록됩니다.</p>
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-extrabold text-gray-900 flex items-center gap-2 text-lg">
                      <i className="fas fa-project-diagram text-indigo-500"></i> 최근 설계 변경 알림 (ERD 연동)
                    </h3>
                    {erdChanges.length > 0 ? (
                      <a className="text-xs font-bold text-gray-400 hover:text-brand transition" href={navHref('/squad-erd', workspaceId)}>
                        ERD 열기 <i className="fas fa-chevron-right ml-1"></i>
                      </a>
                    ) : null}
                  </div>

                  {erdChanges.length > 0 ? (
                    <div className="space-y-3">
                      {erdChanges.slice(0, 3).map(renderErdChange)}
                    </div>
                  ) : (
                    <div className="squad-dashboard-fade-in flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-100 bg-gray-50/50 py-6 text-center">
                      <i className="fas fa-project-diagram text-xl text-gray-200 mb-2"></i>
                      <p className="text-gray-500 font-bold text-sm">설계 변경 내역이 없습니다</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="lg:col-span-4 space-y-6">
                <div className="squad-dashboard-side-card squad-dashboard-compact-side-card squad-dashboard-schedule-card box-border rounded-[16px]! border border-gray-100 bg-white p-[20px]! shadow-sm">
                  <h3 className="squad-dashboard-side-title mb-[12px]! box-border flex items-center gap-2 border-b border-gray-100 pb-[9px]! text-lg font-extrabold text-gray-900">
                    <i className={`fas fa-clock ${upcomingEvents.length > 0 ? 'text-orange-500' : 'text-gray-400'}`}></i> 마감 임박 일정
                  </h3>

                  {upcomingEvents.length > 0 ? (
                    <ul className="space-y-3">
                      {upcomingEvents.map((event, index) => (
                        <li key={event.eventId} className="squad-dashboard-schedule-item hover-card flex min-h-[64px] box-border items-center justify-between gap-[12px] rounded-xl border border-[#F3F4F6]! bg-white p-[12px]! [transition:all_0.3s_cubic-bezier(0.4,0,0.2,1)]! hover:-translate-y-[3px] hover:border-[#E5E7EB]! hover:shadow-[0_10px_25px_-5px_rgba(0,0,0,0.05)]">
                          <div className="squad-dashboard-schedule-content flex min-w-0 max-w-[calc(100%-50px)] flex-auto items-center gap-3">
                            <div className={`${index === 0 ? 'bg-red-50 text-red-500 border-red-100' : 'bg-gray-50 text-gray-600 border-gray-200'} squad-dashboard-schedule-date flex h-[36px]! w-[36px]! shrink-0 basis-[36px] flex-col items-center justify-center rounded-[12px]! border`}>
                              <span className="text-[9px] font-bold uppercase">{formatEventMonth(event.startAt)}</span>
                              <span className="text-sm font-black leading-none">{formatEventDay(event.startAt)}</span>
                            </div>
                            <div className="squad-dashboard-schedule-text min-w-0 flex-auto">
                              <p className="squad-dashboard-schedule-title mb-0.5 block max-w-full truncate text-[13px]! leading-[18px]! font-bold text-gray-900" title={event.title}>{event.title}</p>
                              <p className="squad-dashboard-schedule-meta block max-w-full truncate text-[10px]! leading-[13px]! font-medium text-gray-500" title={stripScheduleCategoryDescription(event.description) || formatChatTime(event.startAt)}>
                                {stripScheduleCategoryDescription(event.description) || formatChatTime(event.startAt)}
                              </p>
                            </div>
                          </div>
                          <span className={`${index === 0 ? 'bg-red-500 text-white' : 'bg-orange-100 text-orange-600 border border-orange-200'} squad-dashboard-dday-badge ml-[10px] inline-flex h-[20px] w-[40px] shrink-0 basis-[40px] box-border items-center justify-center whitespace-nowrap rounded px-[7px]! py-0! text-[10px]! leading-[12px]! font-extrabold shadow-sm`}>
                            {getDday(event.startAt)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="squad-dashboard-empty-panel squad-dashboard-schedule-empty-panel flex box-border flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-100 bg-gray-50/50 py-[18px]! text-center">
                      <i className="far fa-calendar-times mb-[6px]! text-[16px]! leading-[20px]! text-gray-300"></i>
                      <p className="text-[12px]! leading-[16px]! font-bold text-gray-500">등록된 일정이 없습니다</p>
                    </div>
                  )}
                </div>

                <div className="squad-dashboard-side-card box-border rounded-[16px]! border border-gray-100 bg-white p-7 shadow-sm">
                  <h3 className="squad-dashboard-side-title mb-5 box-border flex items-center gap-2 border-b border-gray-100 pb-3 text-lg font-extrabold text-gray-900">
                    <i className={`fas fa-headset ${liveVoiceChannel ? 'text-red-500' : 'text-gray-400'}`}></i> 라이브 음성 회의
                  </h3>

                  {liveVoiceChannel ? (
                    <div className="squad-dashboard-meeting-card hover-card flex min-h-[74px] box-border items-center justify-between gap-[12px] rounded-xl border border-[#F3F4F6]! bg-white p-[16px]! [transition:all_0.3s_cubic-bezier(0.4,0,0.2,1)]! hover:-translate-y-[3px] hover:border-[#E5E7EB]! hover:shadow-[0_10px_25px_-5px_rgba(0,0,0,0.05)]">
                      <div className="squad-dashboard-meeting-copy flex min-w-0 max-w-[calc(100%-76px)] flex-auto items-center gap-3">
                        <span className="relative flex h-3 w-3 shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate">{liveVoiceChannel.name} 진행 중</p>
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-[10px] text-gray-500 font-semibold">{liveVoiceChannel.activeParticipantCount ?? 0}명 참여 중</span>
                          </div>
                        </div>
                      </div>
                      <a href={navHref('/squad-meeting', workspaceId)} className="squad-dashboard-compact-button inline-flex min-h-[30px]! w-[64px] shrink-0 basis-[64px] box-border items-center justify-center whitespace-nowrap rounded-[8px]! bg-red-500 px-[12px]! py-0! text-[12px]! leading-[16px]! font-bold text-white shadow-sm transition hover:bg-red-600">
                        참여하기
                      </a>
                    </div>
                  ) : (
                    <div className="squad-dashboard-empty-panel squad-dashboard-compact-empty-panel squad-dashboard-fade-in flex box-border flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-100 bg-gray-50/50 py-[16px]! text-center">
                      <i className="fas fa-headset mb-[6px]! text-[16px]! leading-[20px]! text-gray-200"></i>
                      <p className="mb-[4px]! text-[12px]! leading-[16px]! font-bold text-gray-500">진행 중인 회의가 없습니다</p>
                      <a href={navHref('/squad-meeting', workspaceId)} className="squad-dashboard-compact-button mt-[8px]! inline-flex min-h-[26px]! box-border items-center justify-center whitespace-nowrap rounded-[8px]! border border-gray-200 bg-white px-[10px]! py-0! text-[11px]! leading-[14px]! font-bold text-gray-600 shadow-sm transition hover:bg-gray-50">
                        새 회의 시작
                      </a>
                    </div>
                  )}
                </div>

                <div className="squad-dashboard-side-card squad-dashboard-compact-side-card box-border rounded-[16px]! border border-gray-100 bg-white p-[22px]! shadow-sm">
                  <div className="squad-dashboard-side-title mb-[14px]! flex box-border items-center justify-between border-b border-gray-100 pb-[10px]!">
                    <h3 className="flex min-w-0 items-center gap-2 text-lg font-extrabold text-gray-900">
                      <i className={`fas fa-bullhorn ${notices.length > 0 ? 'text-brand' : 'text-gray-400'}`}></i> 팀 공지사항
                    </h3>
                    <button onClick={() => onOpenNotice()} className="squad-dashboard-icon-button flex h-[28px]! w-[28px]! shrink-0 basis-[28px] box-border items-center justify-center rounded-[6px]! bg-gray-50 text-[12px]! leading-[16px]! text-gray-500 transition hover:bg-gray-200 hover:text-brand" title="새 공지 추가">
                      <i className="fas fa-plus text-xs"></i>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {notices.length > 0 ? notices.slice(0, 3).map((notice, index) => {
                      const important = isImportantNotice(notice, index)

                      return (
                        <div key={notice.id} className={important ? 'squad-dashboard-notice-item hover-card relative box-border overflow-hidden rounded-[12px]! border border-[#F3F4F6]! bg-brand/5 p-[16px]! [transition:all_0.3s_cubic-bezier(0.4,0,0.2,1)]! hover:-translate-y-[3px] hover:border-[#E5E7EB]! hover:shadow-[0_10px_25px_-5px_rgba(0,0,0,0.05)]' : 'squad-dashboard-notice-item hover-card box-border rounded-[12px]! border border-[#F3F4F6]! bg-gray-50 p-[16px]! [transition:all_0.3s_cubic-bezier(0.4,0,0.2,1)]! hover:-translate-y-[3px] hover:border-[#E5E7EB]! hover:shadow-[0_10px_25px_-5px_rgba(0,0,0,0.05)]'}>
                          {important ? <div className="absolute top-0 right-0 w-10 h-10 bg-brand/10 rounded-bl-full"></div> : null}
                          <div className="flex justify-between items-start mb-1.5 relative z-10">
                            <span className={important ? 'bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded font-extrabold shadow-sm' : 'bg-gray-200 text-gray-600 text-[9px] px-1.5 py-0.5 rounded font-extrabold'}>
                              {important ? '필독' : '일반'}
                            </span>
                            <span className="text-[9px] text-gray-400 font-bold">{formatShortDate(notice.createdAt)}</span>
                          </div>
                          <p className="font-extrabold text-sm text-gray-900 mb-1.5 relative z-10">{stripNoticePrefix(notice.title)}</p>
                          <p className="text-xs text-gray-600 leading-relaxed font-medium line-clamp-2 relative z-10">{notice.content}</p>
                        </div>
                      )
                    }) : (
                    <div className="squad-dashboard-empty-panel squad-dashboard-compact-empty-panel flex box-border flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-100 bg-gray-50/50 py-[16px]! text-center">
                      <p className="mb-[4px]! text-[12px]! leading-[16px]! font-bold text-gray-500">작성된 공지가 없습니다</p>
                      <button onClick={() => onOpenNotice()} className="squad-dashboard-empty-notice-action text-[11px]! leading-[14px]! font-bold text-brand hover:underline">첫 공지 작성하기</button>
                    </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
  )
}
