import { useState,type FormEvent } from 'react'
import { showAuthToast } from '../../../lib/auth-toast'
import type { MentoringWorkspaceData,WorkspaceTask } from './common-types'
import { Avatar,DashboardInlineEmpty,SecondaryButton,SectionCard } from './common-workspace-shared'
import { buildHref,formatDate,formatFileSize,formatRelativeTime,priorityLabel,sortByRecent,statusLabel } from './common-workspace-support'



export function DashboardPage({
  data,
  personalTasks,
  progressPercent,
  currentWeek,
  workspaceId,
  onSendMentorDm,
  submitting,
}: {
  data: MentoringWorkspaceData
  personalTasks: WorkspaceTask[]
  progressPercent: number
  currentWeek: number
  workspaceId: number | null
  onSendMentorDm: (content: string) => Promise<void>
  submitting: boolean
}) {
  const [dmModalOpen, setDmModalOpen] = useState(false)
  const [dmContent, setDmContent] = useState('')
  const dashboard = data.dashboard
  const activeTasks = personalTasks.filter((task) => task.status !== 'DONE').slice(0, 2)
  const activeTask = activeTasks[0]
  const recentFiles = sortByRecent(data.files).slice(0, 3)
  const notices = sortByRecent(data.notices).slice(0, 3)
  const answeredQuestions = data.questions
    .filter((question) => question.qnaStatus === 'ANSWERED' || question.qnaStatus === 'CLOSED')
    .slice(0, 2)
  const recentQuestions = sortByRecent(data.questions).slice(0, 2)

  async function submitMentorDm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!dmContent.trim()) {
      showAuthToast({ message: '메시지 내용을 입력해주세요.', variant: 'error' })
      return
    }

    await onSendMentorDm(dmContent)
    setDmContent('')
    setDmModalOpen(false)
  }

  return (
    <>
      <section className="mentoring-dashboard-hero relative flex flex-col items-center gap-8 overflow-hidden rounded-3xl border border-gray-100 bg-white p-8 shadow-sm md:flex-row">
        <div className="absolute right-0 top-0 h-64 w-64 translate-x-1/2 -translate-y-1/2 rounded-full bg-[#7C3AED] opacity-5 blur-3xl"></div>
        <div className="relative z-10 flex flex-1 items-center gap-6">
          <Avatar
            name={dashboard?.ownerName}
            image={dashboard?.ownerProfileImage}
            className="h-20 w-20 shrink-0 border-4 border-white shadow-md"
            textClassName="text-lg"
          />
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2">
              <span className="rounded border border-purple-200 bg-[#EDE9FE] px-2 py-0.5 text-[10px] font-extrabold text-[#7C3AED]">
                MENTOR
              </span>
              <h2 className="truncate text-2xl font-extrabold text-gray-900">
                {dashboard?.ownerName ?? '멘토 정보 없음'}
              </h2>
            </div>
            <p className="mb-3 line-clamp-2 text-sm text-gray-500">
              {dashboard?.ownerBio ?? '등록된 멘토 소개가 없습니다.'}
            </p>
            <SecondaryButton
              className="mentoring-dashboard-dm-button"
              onClick={() => {
                setDmContent('')
                setDmModalOpen(true)
              }}
              disabled={!dashboard?.ownerId}
            >
              <i className="fas fa-envelope"></i>
              멘토에게 DM 보내기
            </SecondaryButton>
          </div>
        </div>

        <a
          href={buildHref('curriculum', workspaceId)}
          className="mentoring-dashboard-progress-card relative z-10 w-full rounded-2xl border border-gray-100 bg-gray-50 p-5 transition hover:shadow-md md:w-72"
        >
          <div className="mb-2 flex items-end justify-between">
            <div>
              <p className="text-[10px] font-bold text-gray-400">나의 멘토링 진행률</p>
              <p className="text-xl font-extrabold text-[#00C471]">
                Week {currentWeek} <span className="text-sm font-medium text-gray-500">/ 4주</span>
              </p>
            </div>
            <span className="text-sm font-extrabold text-gray-800">{progressPercent}%</span>
          </div>
          <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div className="h-2 rounded-full bg-[#00C471] transition-all duration-1000" style={{ width: `${progressPercent}%` }}></div>
          </div>
          <p className="flex items-center justify-end gap-1 text-right text-[10px] text-gray-500">
            완료까지 <strong className="text-[#00C471]">{Math.max(0, 4 - currentWeek)}주</strong> 남았습니다.
            <i className="fas fa-arrow-right text-[8px] text-[#00C471]"></i>
          </p>
        </a>
      </section>

      <div className="mentoring-dashboard-grid grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="mentoring-dashboard-main-col space-y-6 lg:col-span-2 lg:contents!">
            <SectionCard title="이번 주 미션" icon="fas fa-flag-checkered text-[#7C3AED]" className="mentoring-dashboard-card mentoring-dashboard-mission-card lg:order-2! lg:col-span-2!">
              {activeTask ? (
                <div className="rounded-2xl border-l-4 border-l-[#7C3AED] bg-white p-1">
                  <div className="rounded-xl bg-gray-50 p-5">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <span className="mb-2 inline-block rounded border border-purple-200 bg-[#EDE9FE] px-2 py-1 text-[10px] font-extrabold text-[#7C3AED]">
                          THIS WEEK
                        </span>
                        <h3 className="text-xl font-extrabold text-gray-900">{activeTask.title}</h3>
                      </div>
                      <span className="rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-1.5 text-xs font-bold text-yellow-600">
                        {statusLabel(activeTask.status)}
                      </span>
                    </div>
                    <p className="line-clamp-3 text-sm leading-relaxed text-gray-600">
                      {activeTask.description ?? '상세 설명이 등록되지 않았습니다.'}
                    </p>
                    <div className="mentoring-dashboard-mission-footer mt-4 flex items-center justify-between gap-3 border-t border-gray-100 pt-5 text-[10px] font-bold text-gray-400 max-[767px]:flex-col! max-[767px]:items-stretch!">
                      <div className="flex items-center gap-3">
                        <span>
                          <i className="far fa-clock mr-1"></i>
                          {activeTask.dueDate ? `${formatDate(activeTask.dueDate)} 마감` : '기한 없음'}
                        </span>
                        <span>
                          <i className="fas fa-fire mr-1 text-red-500"></i>
                          {priorityLabel(activeTask.priority)}
                        </span>
                      </div>
                      <a href={buildHref('curriculum', workspaceId)} className="mentoring-dashboard-submit-button max-[767px]:w-full!">
                        <i className="fas fa-upload"></i>
                        과제 제출하기
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                <DashboardInlineEmpty
                  icon="fas fa-tasks"
                  title="진행 중인 미션이 없습니다."
                  description="멘토가 공통 과제를 등록하면 이번 주 미션으로 표시됩니다."
                  action={
                    <a href={buildHref('curriculum', workspaceId)} className="mentoring-dashboard-outline-button">
                      커리큘럼으로 이동
                    </a>
                  }
                />
              )}
            </SectionCard>

            <SectionCard
              title="최근 자료"
              icon="fas fa-folder-open text-yellow-500"
              className="mentoring-dashboard-card mentoring-dashboard-files-card lg:order-4! lg:col-span-2!"
              action={
                <a href={buildHref('files', workspaceId)} className="mentoring-dashboard-card-link">
                  전체보기 <i className="fas fa-chevron-right ml-0.5 text-[10px]"></i>
                </a>
              }
            >
              {recentFiles.length > 0 ? (
                <div className="space-y-3">
                  {recentFiles.map((file) => (
                    <div key={file.fileId} className="flex items-center gap-4 rounded-xl border border-gray-100 bg-gray-50/70 p-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500">
                        <i className={file.itemType === 'LINK' ? 'fas fa-link' : 'fas fa-file-alt'}></i>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-gray-900">{file.displayName ?? file.originalFileName ?? '자료'}</p>
                        <p className="text-xs text-gray-400">
                          {file.uploadedByName ?? '업로더 정보 없음'} · {formatRelativeTime(file.createdAt)}
                        </p>
                      </div>
                      <span className="text-[10px] font-bold text-gray-400">{formatFileSize(file.fileSize)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <DashboardInlineEmpty
                  icon="fas fa-file-alt"
                  title="아직 등록된 자료가 없습니다."
                  description="학습을 지원하는 첫 번째 자료가 공유되면 이곳에 표시됩니다."
                  className="mentoring-dashboard-files-empty"
                  action={
                    <a href={buildHref('files', workspaceId)} className="mentoring-dashboard-outline-button">
                      + 자료 업로드 하러가기
                    </a>
                  }
                />
              )}
            </SectionCard>
          </div>

          <div className="mentoring-dashboard-side-col space-y-6 lg:contents!">
            <SectionCard title="내 과제 피드백 현황" icon="fas fa-code-branch text-[#00C471]" className="mentoring-dashboard-card mentoring-dashboard-summary-card lg:order-1! lg:col-span-1!">
              {answeredQuestions.length > 0 ? (
                <div className="space-y-3">
                  {answeredQuestions.map((question) => (
                    <a key={question.id} href={buildHref('qna', workspaceId)} className="mentoring-dashboard-feedback-item">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="mentoring-dashboard-feedback-badge">Feedback Arrived</span>
                        <span className="text-[10px] font-bold text-gray-500">{formatRelativeTime(question.createdAt)}</span>
                      </div>
                      <p className="line-clamp-2 text-xs font-bold leading-tight text-gray-900">{question.title}</p>
                    </a>
                  ))}
                </div>
              ) : (
                <DashboardInlineEmpty
                  icon="fas fa-comment-dots"
                  title="아직 온 피드백이 없습니다."
                  description="과제를 제출하면 멘토의 리뷰가 이곳에 표시됩니다."
                  action={
                    <a href={buildHref('curriculum', workspaceId)} className="mentoring-dashboard-outline-button">
                      피드백 게시판 이동
                    </a>
                  }
                />
              )}
            </SectionCard>

            <SectionCard
              title="멘토 공지사항"
              icon="fas fa-bullhorn text-yellow-500"
              className="mentoring-dashboard-card mentoring-dashboard-notice-card lg:order-0! lg:col-span-2!"
              action={
                <a href={buildHref('curriculum', workspaceId)} className="mentoring-dashboard-card-link">
                  전체보기 <i className="fas fa-chevron-right"></i>
                </a>
              }
            >
              {notices.length > 0 ? (
                <div className="space-y-3">
                  {notices.map((notice) => (
                    <article key={notice.id} className="rounded-xl border border-purple-100 bg-[#EDE9FE]/60 p-4">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <span className="rounded bg-white px-2 py-0.5 text-[10px] font-extrabold text-[#7C3AED]">
                          NOTICE
                        </span>
                        <span className="shrink-0 text-[10px] font-bold text-gray-400">{formatRelativeTime(notice.createdAt)}</span>
                      </div>
                      <h3 className="line-clamp-1 text-sm font-extrabold text-gray-900">{notice.title}</h3>
                      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-gray-500">{notice.content}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <DashboardInlineEmpty icon="fas fa-bullhorn" title="등록된 공지사항이 없습니다." description="새로운 공지가 올라오면 이곳에 표시됩니다." />
              )}
            </SectionCard>

            <SectionCard
              title="오늘의 개인 할 일"
              icon="fas fa-columns text-green-500"
              className="mentoring-dashboard-card mentoring-dashboard-live-card lg:order-3! lg:col-span-1!"
              action={<span className={activeTasks.length > 0 ? 'mentoring-dashboard-count-badge active' : 'mentoring-dashboard-count-badge'}>진행 중 {activeTasks.length}</span>}
            >
              {activeTasks.length > 0 ? (
                <div className="space-y-3">
                  {activeTasks.map((task) => (
                    <a key={task.taskId} href={buildHref('workspace', workspaceId)} className="mentoring-dashboard-task-item">
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <span className="mentoring-dashboard-task-source">{task.dueDate ? formatDate(task.dueDate) : '개인 학습'}</span>
                        <span className={task.priority === 'HIGH' ? 'mentoring-dashboard-priority-badge high' : 'mentoring-dashboard-priority-badge'}>
                          {priorityLabel(task.priority)}
                        </span>
                      </div>
                      <h4 className="mb-1 line-clamp-1 text-xs font-bold text-gray-900">{task.title}</h4>
                      <p className="line-clamp-1 text-[11px] text-gray-500">{task.description ?? '상세 설명이 없습니다.'}</p>
                      <div className="mt-2 flex items-center justify-between text-[10px] font-bold text-gray-400">
                        <span>
                          <i className="far fa-clock"></i> {task.dueDate ? `${formatDate(task.dueDate)} 마감` : '기한 없음'}
                        </span>
                        <span>{statusLabel(task.status)}</span>
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <DashboardInlineEmpty icon="fas fa-tasks" title="진행 중인 할 일이 없습니다." description="이번 주 학습 목표를 세우고 일정을 관리해보세요." />
              )}
              <a href={buildHref('workspace', workspaceId)} className="mentoring-dashboard-wide-button">
                개인 칸반보드로 이동
              </a>
            </SectionCard>

            <SectionCard title="멘토 Q&A" icon="fas fa-question-circle text-blue-500" className="mentoring-dashboard-card mentoring-dashboard-note-card lg:order-5! lg:col-span-1!">
              {recentQuestions.length > 0 ? (
                <div className="space-y-4">
                  {recentQuestions.map((question) => {
                    const answered = question.qnaStatus === 'ANSWERED' || question.qnaStatus === 'CLOSED'

                    return (
                      <a key={question.id} href={buildHref('qna', workspaceId)} className="mentoring-dashboard-qna-item">
                        <div className="mb-1.5 flex items-start gap-2">
                          <span className={answered ? 'mentoring-dashboard-qna-badge answered' : 'mentoring-dashboard-qna-badge'}>
                            {answered ? '답변 완료' : '답변 대기'}
                          </span>
                          <p className="line-clamp-1 text-xs font-bold text-gray-800">{question.title}</p>
                        </div>
                        <p className="truncate rounded-lg border border-gray-100 bg-gray-50 p-2 pl-11 text-[10px] font-medium text-gray-500">
                          답변 {question.answerCount}개 · 조회 {question.viewCount}
                        </p>
                      </a>
                    )
                  })}
                </div>
              ) : (
                <DashboardInlineEmpty icon="fas fa-question" title="등록된 질문이 없습니다." description="막히는 부분이 있다면 언제든지 멘토에게 물어보세요." />
              )}
              <a href={buildHref('qna', workspaceId)} className="mentoring-dashboard-wide-button white">
                Q&A 전체 보기 / 질문 남기기
              </a>
            </SectionCard>
          </div>
      </div>

      {dmModalOpen ? (
        <div className="mentoring-workspace-modal-overlay fixed inset-0 z-[1050] flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm">
          <form onSubmit={submitMentorDm} className="modal-content w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between border-b border-gray-100 pb-4">
              <h3 className="flex items-center gap-2 text-lg font-extrabold text-gray-900">
                <i className="fas fa-envelope text-[#00C471]"></i>
                멘토에게 메시지 보내기
              </h3>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-50 text-gray-400 transition hover:text-gray-900"
                onClick={() => setDmModalOpen(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
              <Avatar
                name={dashboard?.ownerName}
                image={dashboard?.ownerProfileImage}
                className="h-10 w-10 border border-gray-200 bg-white"
                textClassName="text-xs"
              />
              <div>
                <p className="mb-0.5 text-[10px] font-bold text-[#7C3AED]">받는 사람</p>
                <p className="text-sm font-bold text-gray-900">{dashboard?.ownerName ?? '멘토'} 멘토님</p>
              </div>
            </div>
            <textarea
              value={dmContent}
              onChange={(event) => setDmContent(event.target.value)}
              className="h-32 w-full resize-none rounded-xl border border-gray-200 p-4 text-sm shadow-sm outline-none transition focus:border-[#00C471]"
              placeholder="질문이나 요청사항을 예의를 갖춰 작성해주세요. (학습 관련 세부 질문은 가급적 Q&A 게시판을 이용해 주세요!)"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-600 transition hover:bg-gray-50"
                onClick={() => setDmModalOpen(false)}
              >
                취소
              </button>
              <button
                type="submit"
                disabled={submitting || !dmContent.trim()}
                className="flex items-center gap-2 rounded-xl bg-[#00C471] px-6 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <i className="fas fa-paper-plane"></i>
                전송
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  )
}
