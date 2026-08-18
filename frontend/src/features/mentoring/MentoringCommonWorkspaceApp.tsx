import { useAuthSession } from '../../lib/useAuthSession'
import {
useEffect,
useMemo,
useState
} from 'react'
import AuthModal,{ type AuthView } from '../../components/AuthModal'
import { userApi } from '../../lib/api/auth'
import {
getPostLoginRedirect,
readStoredAuthSession,
} from '../../lib/auth-session'
import { showAuthToast } from '../../lib/auth-toast'
import { PROFILE_UPDATED_EVENT,type ProfileSyncPayload } from '../../lib/profile-sync'
import {
createMentoringCalendarEvent,
createMentoringFileLink,
createMentoringMeetingNote,
createMentoringQuestion,
createMentoringTask,
createMentoringVoiceChannel,
fetchMentoringQuestionDetail,
loadMentoringWorkspaceData,
saveMentoringErd,
sendMentoringDirectMessage,
updateMentoringTaskStatus,
uploadMentoringWorkspaceFile
} from './common-workspace/common-api'

import type {
MentoringWorkspaceData,
QuestionDetail,
TaskPriority,
TaskStatus,
WorkspaceMember,
WorkspaceTask
} from './common-workspace/common-types'
import { CurriculumPage } from './common-workspace/common-workspace-curriculum-page'
import { DashboardPage } from './common-workspace/common-workspace-dashboard-page'
import { ErdPage } from './common-workspace/common-workspace-erd-page'
import { FilesPage } from './common-workspace/common-workspace-files-page'
import { MeetingPage } from './common-workspace/common-workspace-meeting-page'
import { QnaPage } from './common-workspace/common-workspace-qna-page'
import { SchedulePage } from './common-workspace/common-workspace-schedule-page'
import { EmptyPanel,MentoringShell } from './common-workspace/common-workspace-shared'
import { EMPTY_DATA,PAGE_CONFIG,getWorkspaceIdFromUrl,percent,sortByRecent,type RenderedMentoringCommonPage } from './common-workspace/common-workspace-support'
import { WorkspacePage } from './common-workspace/common-workspace-workspace-page'


function MentoringCommonWorkspaceApp({ page }: { page: RenderedMentoringCommonPage }) {
  const workspaceId = useMemo(() => getWorkspaceIdFromUrl(), [])
  const [session,setSession] = useAuthSession()
  const [authView, setAuthView] = useState<AuthView | null>(null)
  const [data, setData] = useState<MentoringWorkspaceData>(EMPTY_DATA)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [taskSearch, setTaskSearch] = useState('')
  const [expandedQuestionId, setExpandedQuestionId] = useState<number | null>(null)
  const [questionDetails, setQuestionDetails] = useState<Map<number, QuestionDetail>>(new Map())
  const [accountProfile, setAccountProfile] = useState<{ name: string | null; profileImage: string | null } | null>(null)

  useEffect(() => {
    document.title = `DevPath - ${PAGE_CONFIG[page].title}`
    document.documentElement.classList.add('internal-page-scroll-document')
    document.body.classList.add('internal-page-scroll-body')

    return () => {
      document.documentElement.classList.remove('internal-page-scroll-document')
      document.body.classList.remove('internal-page-scroll-body')
    }
  }, [page])

  useEffect(() => {
    if (!session?.accessToken) {
      setAccountProfile(null)
      return undefined
    }

    const controller = new AbortController()

    userApi
      .getMyProfile(controller.signal)
      .then((profile) => {
        if (!controller.signal.aborted) {
          setAccountProfile({ name: profile.name, profileImage: profile.profileImage })
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setAccountProfile(null)
        }
      })

    return () => controller.abort()
  }, [session?.accessToken, session?.userId])

  useEffect(() => {
    const currentSession = readStoredAuthSession()
    setSession(currentSession)

    if (!workspaceId) {
      setError('워크스페이스 정보를 찾을 수 없습니다.')
      setLoading(false)
      return undefined
    }

    if (!currentSession?.accessToken) {
      setAuthView('login')
      setLoading(false)
      return undefined
    }

    const targetWorkspaceId = workspaceId
    const controller = new AbortController()

    async function loadData() {
      setLoading(true)
      setError(null)

      try {
        const nextData = await loadMentoringWorkspaceData(targetWorkspaceId, controller.signal)

        if (controller.signal.aborted) {
          return
        }

        setData({
          dashboard: nextData.dashboard,
          tasks: sortByRecent(nextData.tasks ?? []),
          events: [...(nextData.events ?? [])].sort((left, right) => new Date(left.startAt).getTime() - new Date(right.startAt).getTime()),
          questions: sortByRecent(nextData.questions ?? []),
          files: sortByRecent(nextData.files ?? []),
          erd: nextData.erd,
          erdVersions: sortByRecent(nextData.erdVersions ?? []),
          meetingNotes: sortByRecent(nextData.meetingNotes ?? []),
          voiceChannels: nextData.voiceChannels ?? [],
          notices: sortByRecent(nextData.notices ?? []),
        })
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(loadError instanceof Error ? loadError.message : '멘토링 워크스페이스 데이터를 불러오지 못했습니다.')
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    void loadData()

    return () => controller.abort()
  }, [workspaceId, reloadKey, setSession])

  useEffect(() => {
    if (!session?.userId) {
      return undefined
    }

    const currentUserId = session.userId

    function syncProfile(event: Event) {
      const profileEvent = event as CustomEvent<ProfileSyncPayload>

      if (!profileEvent.detail) {
        return
      }

      const nextName = profileEvent.detail.name.trim()
      const nextProfileImage = profileEvent.detail.profileImage

      setAccountProfile({ name: nextName || null, profileImage: nextProfileImage })

      setData((current) => {
        if (!current.dashboard) {
          return current
        }

        let memberChanged = false
        const members = current.dashboard.members.map((member) => {
          if (member.learnerId !== currentUserId) {
            return member
          }

          memberChanged = true

          return {
            ...member,
            learnerName: nextName || member.learnerName,
            profileImage: nextProfileImage,
          }
        })

        if (current.dashboard.ownerId !== currentUserId && !memberChanged) {
          return current
        }

        return {
          ...current,
          dashboard: {
            ...current.dashboard,
            ownerName: current.dashboard.ownerId === currentUserId
              ? nextName || current.dashboard.ownerName
              : current.dashboard.ownerName,
            ownerProfileImage: current.dashboard.ownerId === currentUserId
              ? nextProfileImage
              : current.dashboard.ownerProfileImage,
            members,
          },
        }
      })
    }

    window.addEventListener(PROFILE_UPDATED_EVENT, syncProfile)

    return () => {
      window.removeEventListener(PROFILE_UPDATED_EVENT, syncProfile)
    }
  }, [session?.userId])

  const memberById = useMemo(() => {
    const map = new Map<number, WorkspaceMember>()
    data.dashboard?.members.forEach((member) => {
      map.set(member.learnerId, member)
    })

    return map
  }, [data.dashboard?.members])

  const memberNameById = useMemo(() => {
    const map = new Map<number, string>()
    data.dashboard?.members.forEach((member) => {
      if (member.learnerName) {
        map.set(member.learnerId, member.learnerName)
      }
    })

    return map
  }, [data.dashboard?.members])

  const currentMember = session?.userId ? memberById.get(session.userId) : null
  const currentMemberName = accountProfile?.name || currentMember?.learnerName || session?.name
  const currentMemberProfileImage = accountProfile ? accountProfile.profileImage : currentMember?.profileImage
  const assignedTasks = session?.userId ? data.tasks.filter((task) => task.assigneeId === session.userId) : []
  const personalTasks = assignedTasks.length > 0 ? assignedTasks : data.tasks
  const doneTaskCount = personalTasks.filter((task) => task.status === 'DONE').length
  const progressPercent = percent(doneTaskCount, personalTasks.length)
  const currentWeek = personalTasks.length === 0 ? 1 : Math.min(4, Math.max(1, Math.ceil(Math.max(progressPercent, 1) / 25)))

  function refreshAll() {
    setReloadKey((key) => key + 1)
  }

  async function withSubmit(action: () => Promise<void>, successMessage: string) {
    setSubmitting(true)

    try {
      await action()
      showAuthToast({ message: successMessage })
      refreshAll()
    } catch (submitError) {
      showAuthToast({
        message: submitError instanceof Error ? submitError.message : '요청을 처리하지 못했습니다.',
        variant: 'error',
      })
    } finally {
      setSubmitting(false)
    }
  }

  async function createTask(payload: { title: string; description: string; priority: TaskPriority; dueDate: string }) {
    if (!workspaceId) {
      return
    }

    await withSubmit(
      () =>
        createMentoringTask(workspaceId, {
          title: payload.title,
          description: payload.description || null,
          priority: payload.priority,
          assigneeId: session?.userId ?? null,
          dueDate: payload.dueDate || null,
        }).then(() => undefined),
      '과제를 추가했습니다.',
    )
  }

  async function updateTaskStatus(task: WorkspaceTask, status: TaskStatus) {
    if (!workspaceId) {
      return
    }

    await withSubmit(
      () =>
        updateMentoringTaskStatus(workspaceId, task.taskId, status).then(() => undefined),
      '과제 상태를 변경했습니다.',
    )
  }

  async function sendMentorDm(content: string) {
    const mentorId = data.dashboard?.ownerId
    if (!workspaceId || !mentorId) {
      showAuthToast({ message: '멘토 정보를 찾지 못했습니다.', variant: 'error' })
      return
    }

    await withSubmit(
      () =>
        sendMentoringDirectMessage(workspaceId, mentorId, content).then(() => undefined),
      '멘토님에게 메시지가 전송되었습니다.',
    )
  }

  async function createQuestion(payload: { title: string; content: string; difficulty: string; templateType: string }) {
    if (!workspaceId) {
      return
    }

    await withSubmit(
      () =>
        createMentoringQuestion(workspaceId, {
          title: payload.title,
          content: payload.content,
          difficulty: payload.difficulty,
          templateType: payload.templateType,
        }).then(() => undefined),
      '질문을 등록했습니다.',
    )
  }

  async function toggleQuestion(questionId: number) {
    if (expandedQuestionId === questionId) {
      setExpandedQuestionId(null)
      return
    }

    setExpandedQuestionId(questionId)

    if (questionDetails.has(questionId)) {
      return
    }

    try {
      const detail = await fetchMentoringQuestionDetail(questionId)
      setQuestionDetails((previous) => {
        const next = new Map(previous)
        next.set(questionId, detail)
        return next
      })
    } catch (detailError) {
      showAuthToast({
        message: detailError instanceof Error ? detailError.message : '질문 상세를 불러오지 못했습니다.',
        variant: 'error',
      })
    }
  }

  async function createEvent(payload: { title: string; description: string; startAt: string; endAt: string }) {
    if (!workspaceId) {
      return
    }

    await withSubmit(
      () =>
        createMentoringCalendarEvent(workspaceId, {
          title: payload.title,
          description: payload.description || null,
          startAt: payload.startAt,
          endAt: payload.endAt,
        }).then(() => undefined),
      '일정을 추가했습니다.',
    )
  }

  async function uploadFile(file: File) {
    if (!workspaceId) {
      return
    }

    const formData = new FormData()
    formData.append('file', file)

    await withSubmit(
      () =>
        uploadMentoringWorkspaceFile(workspaceId, formData).then(() => undefined),
      '파일을 업로드했습니다.',
    )
  }

  async function createFileLink(payload: { title: string; url: string }) {
    if (!workspaceId) {
      return
    }

    await withSubmit(
      () =>
        createMentoringFileLink(workspaceId, { title: payload.title, url: payload.url, parentId: null }).then(() => undefined),
      '링크를 공유했습니다.',
    )
  }

  async function saveErd(payload: { mermaidCode: string; schemaJson: string; changeSummary: string }) {
    if (!workspaceId) {
      return
    }

    await withSubmit(
      () =>
        saveMentoringErd(workspaceId, {
          mermaidCode: payload.mermaidCode,
          schemaJson: payload.schemaJson || null,
          changeSummary: payload.changeSummary || null,
        }).then(() => undefined),
      'ERD를 저장했습니다.',
    )
  }

  async function createMeetingNote(payload: { title: string; content: string }) {
    if (!workspaceId) {
      return
    }

    await withSubmit(
      () =>
        createMentoringMeetingNote(workspaceId, { title: payload.title, content: payload.content || null }).then(() => undefined),
      '회의록을 저장했습니다.',
    )
  }

  async function createVoiceChannel(payload: { name: string; description: string }) {
    if (!workspaceId) {
      return
    }

    await withSubmit(
      () =>
        createMentoringVoiceChannel(workspaceId, { name: payload.name, description: payload.description || null }).then(() => undefined),
      '라이브 채널을 생성했습니다.',
    )
  }

  function handleAuthenticated() {
    const nextSession = readStoredAuthSession()

    if (nextSession?.role === 'ROLE_ADMIN') {
      window.location.replace(getPostLoginRedirect(nextSession.role))
      return
    }

    setSession(nextSession)
    setAuthView(null)
    setReloadKey((key) => key + 1)
  }

  function renderPage() {
    switch (page) {
      case 'dashboard':
        return (
          <DashboardPage
            data={data}
            personalTasks={personalTasks}
            progressPercent={progressPercent}
            currentWeek={currentWeek}
            workspaceId={workspaceId}
            onSendMentorDm={sendMentorDm}
            submitting={submitting}
          />
        )
      case 'workspace':
        return (
          <WorkspacePage
            tasks={personalTasks}
            members={data.dashboard?.members ?? []}
            memberNameById={memberNameById}
            search={taskSearch}
            setSearch={setTaskSearch}
            onCreateTask={createTask}
            onUpdateTaskStatus={updateTaskStatus}
            submitting={submitting}
          />
        )
      case 'curriculum':
        return <CurriculumPage tasks={personalTasks} progressPercent={progressPercent} />
      case 'qna':
        return (
          <QnaPage
            questions={data.questions}
            questionDetails={questionDetails}
            expandedQuestionId={expandedQuestionId}
            onToggleQuestion={(questionId) => void toggleQuestion(questionId)}
            onCreateQuestion={createQuestion}
            submitting={submitting}
          />
        )
      case 'schedule':
        return <SchedulePage events={data.events} onCreateEvent={createEvent} submitting={submitting} />
      case 'files':
        return <FilesPage files={data.files} onUploadFile={uploadFile} onCreateLink={createFileLink} submitting={submitting} />
      case 'erd':
        return (
          <ErdPage
            key={`${data.erd?.version ?? 0}-${data.erd?.updatedAt ?? 'empty'}-${data.erd?.schemaJson ?? ''}-${data.erd?.mermaidCode ?? ''}`}
            erd={data.erd}
            versions={data.erdVersions}
            onSaveErd={saveErd}
            submitting={submitting}
          />
        )
      case 'meeting':
        return (
          <MeetingPage
            meetingNotes={data.meetingNotes}
            voiceChannels={data.voiceChannels}
            workspaceId={workspaceId}
            onCreateMeetingNote={createMeetingNote}
            onCreateVoiceChannel={createVoiceChannel}
            submitting={submitting}
          />
        )
    }
  }

  return (
    <>
      <MentoringShell
        page={page}
        workspaceId={workspaceId}
        dashboard={data.dashboard}
        memberName={currentMemberName}
        memberProfileImage={currentMemberProfileImage}
      >
        {loading ? (
          <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-gray-100 bg-white text-sm font-bold text-gray-400">
            멘토링 워크스페이스 데이터를 불러오는 중입니다.
          </div>
        ) : error ? (
          <EmptyPanel icon="fas fa-circle-exclamation" title="데이터를 불러오지 못했습니다" description={error} />
        ) : (
          renderPage()
        )}
      </MentoringShell>

      {authView ? (
        <AuthModal
          view={authView}
          onClose={() => setAuthView(null)}
          onViewChange={setAuthView}
          onAuthenticated={handleAuthenticated}
        />
      ) : null}
    </>
  )
}

export default MentoringCommonWorkspaceApp
