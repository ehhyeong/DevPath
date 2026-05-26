import { useEffect, useState, type ReactNode } from 'react'
import { ErrorCard, LoadingCard } from '../../account/ui'
import { instructorMentoringApi } from '../../lib/api'
import type { InstructorMentoringBoard } from '../../types/instructor'

type MentoringTab = 'recruiting' | 'requests' | 'ongoing' | 'completed'
type MentoringMode = 'study' | 'team'

type RecruitingRole = { name: string; current: number; total: number }

type RecruitingProject = {
  id: string
  title: string
  requestTitle: string
  description: string
  mode: MentoringMode
  category: string
  recruitStatus: '모집중' | '모집마감'
  current: number
  total: number
  roles: RecruitingRole[]
  tags: string[]
  mentorName: string
  mentorBio: string
  intro: string
  durationWeeks: number
  weeks: string[]
}

type PendingRequest = {
  id: string
  applicantName: string
  avatarSeed: string
  submittedAt: string
  projectId: string
  projectTitle: string
  mode: MentoringMode
  role: string
  motivation: string
  portfolioUrl: string
}

type OngoingProject = {
  id: string
  title: string
  subtitle: string
  week: number
  mode: MentoringMode
  category: string
  progress: number
  primaryAction: string
  secondaryAction: string
  menuActions: string[]
  workspaceId?: number | null
}

type ProjectRoleInput = { name: string; count: number }

type ProjectFormState = {
  mode: MentoringMode
  category: string
  recruitStatus: '모집중' | '모집마감'
  title: string
  capacityTotal: string
  durationWeeks: string
  tags: string[]
  mentorName: string
  mentorBio: string
  intro: string
  weeks: string[]
  roles: ProjectRoleInput[]
}

const modeMeta = {
  study: { label: '공통 과제형', fullLabel: '공통 과제 (스터디형)', icon: 'fas fa-users', tone: 'bg-purple-50 text-[#7C3AED] border-purple-100' },
  team: { label: '팀 프로젝트형', fullLabel: '역할 분담 (팀 프로젝트형)', icon: 'fas fa-puzzle-piece', tone: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
} as const

function createDefaultForm(): ProjectFormState {
  return {
    mode: 'study',
    category: 'Backend',
    recruitStatus: '모집중',
    title: '',
    capacityTotal: '10',
    durationWeeks: '4',
    tags: ['Spring Boot', 'Redis'],
    mentorName: '',
    mentorBio: '',
    intro: '',
    weeks: ['요구사항 분석 및 ERD 설계', '핵심 API 비즈니스 로직 개발'],
    roles: [{ name: 'Frontend', count: 2 }, { name: 'Backend', count: 2 }],
  }
}

function createSampleForm(): ProjectFormState {
  return {
    mode: 'study',
    category: 'Backend',
    recruitStatus: '모집중',
    title: '대용량 트래픽 커머스 서버 구축',
    capacityTotal: '10',
    durationWeeks: '4',
    tags: ['Spring Boot', 'Redis', 'Kafka', 'MySQL'],
    mentorName: '코드마스터 J',
    mentorBio: '네카라쿠배 백엔드 리드 개발자',
    intro: '실제 운영 환경과 유사한 트래픽 시나리오를 경험합니다. 선착순 쿠폰 발급, 재고 동시성 이슈 등을 집중적으로 다루며 코드 리뷰를 진행합니다.',
    weeks: ['요구사항 분석 및 ERD 설계', '회원/상품 기능 구현 및 단위 테스트 작성', '대용량 트래픽 처리를 위한 Redis/Kafka 도입', '성능 최적화 및 최종 발표'],
    roles: [{ name: 'Frontend', count: 2 }, { name: 'Backend', count: 2 }],
  }
}

function projectToForm(project: RecruitingProject): ProjectFormState {
  return {
    mode: project.mode,
    category: project.category,
    recruitStatus: project.recruitStatus,
    title: project.title,
    capacityTotal: String(project.total || 10),
    durationWeeks: String(project.durationWeeks || 4),
    tags: project.tags,
    mentorName: project.mentorName,
    mentorBio: project.mentorBio,
    intro: project.intro,
    weeks: project.weeks.length > 0 ? project.weeks : [''],
    roles: project.roles.length > 0 ? project.roles.map((role) => ({ name: role.name, count: role.total })) : [{ name: 'Frontend', count: 2 }, { name: 'Backend', count: 2 }],
  }
}

function getPreviewCapacity(form: ProjectFormState) {
  if (form.mode === 'study') {
    return { total: Number(form.capacityTotal || 0), detail: '' }
  }

  const roles = form.roles.filter((role) => role.name.trim() && role.count > 0)
  return { total: roles.reduce((sum, role) => sum + role.count, 0), detail: roles.map((role) => `${role.name} ${role.count}`).join(', ') }
}

function buildProjectFromForm(form: ProjectFormState, previousProject?: RecruitingProject): RecruitingProject {
  const weeks = form.weeks.map((week) => week.trim()).filter(Boolean)
  const tags = form.tags.map((tag) => tag.trim()).filter(Boolean)
  const requestTitle = form.title.replace(/ 구축$| 서비스$| 스터디$/g, '').trim() || form.title.trim()

  if (form.mode === 'study') {
    const total = Math.max(1, Number(form.capacityTotal || 0))
    return {
      id: previousProject?.id ?? `project-${Date.now()}`,
      title: form.title.trim(),
      requestTitle,
      description: form.intro.trim(),
      mode: 'study',
      category: form.category,
      recruitStatus: form.recruitStatus,
      current: previousProject?.mode === 'study' ? Math.min(previousProject.current, total) : 0,
      total,
      roles: [],
      tags,
      mentorName: form.mentorName.trim(),
      mentorBio: form.mentorBio.trim(),
      intro: form.intro.trim(),
      durationWeeks: Math.max(1, Number(form.durationWeeks || 0)),
      weeks,
    }
  }

  const roles = form.roles.map((role) => ({ name: role.name.trim(), total: Math.max(1, role.count || 0) })).filter((role) => role.name)
  const previousRoleMap = new Map(previousProject?.roles.map((role) => [role.name, role.current]) ?? [])

  return {
    id: previousProject?.id ?? `project-${Date.now()}`,
    title: form.title.trim(),
    requestTitle,
    description: form.intro.trim(),
    mode: 'team',
    category: form.category,
    recruitStatus: form.recruitStatus,
    current: roles.reduce((sum, role) => sum + Math.min(previousRoleMap.get(role.name) ?? 0, role.total), 0),
    total: roles.reduce((sum, role) => sum + role.total, 0),
    roles: roles.map((role) => ({ name: role.name, total: role.total, current: Math.min(previousRoleMap.get(role.name) ?? 0, role.total) })),
    tags,
    mentorName: form.mentorName.trim(),
    mentorBio: form.mentorBio.trim(),
    intro: form.intro.trim(),
    durationWeeks: Math.max(1, Number(form.durationWeeks || 0)),
    weeks,
  }
}

function applyApprovedRequest(project: RecruitingProject, request: PendingRequest): RecruitingProject {
  if (project.mode === 'study') {
    return { ...project, current: Math.min(project.total, project.current + 1) }
  }

  const roles = project.roles.map((role) => (role.name === request.role ? { ...role, current: Math.min(role.total, role.current + 1) } : role))
  return { ...project, roles, current: roles.reduce((sum, role) => sum + role.current, 0) }
}

function ModalShell({
  onClose,
  size = 'max-w-md',
  children,
}: {
  onClose: () => void
  size?: string
  children: ReactNode
}) {
  return (
    <div className="fixed inset-0 z-[2500] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative z-10 w-full ${size}`}>{children}</div>
    </div>
  )
}

export default function InstructorMentoringPage() {
  const [tab, setTab] = useState<MentoringTab>('recruiting')
  const [projects, setProjects] = useState<RecruitingProject[]>([])
  const [requests, setRequests] = useState<PendingRequest[]>([])
  const [ongoingProjects, setOngoingProjects] = useState<OngoingProject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [requestModeFilter, setRequestModeFilter] = useState<'all' | MentoringMode>('all')
  const [requestProjectFilter, setRequestProjectFilter] = useState('all')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [applicationId, setApplicationId] = useState<string | null>(null)
  const [setupProjectId, setSetupProjectId] = useState<string | null>(null)
  const [setupStartDate, setSetupStartDate] = useState('')
  const [setupOrientationAt, setSetupOrientationAt] = useState('')
  const [setupWelcome, setSetupWelcome] = useState('')
  const [projectFormOpen, setProjectFormOpen] = useState(false)
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)
  const [tagInput, setTagInput] = useState('')
  const [form, setForm] = useState<ProjectFormState>(() => createDefaultForm())

  const selectedRequest = requests.find((request) => request.id === applicationId) ?? null
  const selectedSetupProject = projects.find((project) => project.id === setupProjectId) ?? null
  const editingProject = projects.find((project) => project.id === editingProjectId)
  const pendingRequests = requests.filter((request) => (requestModeFilter === 'all' || request.mode === requestModeFilter) && (requestProjectFilter === 'all' || request.projectId === requestProjectFilter))
  const previewCapacity = getPreviewCapacity(form)
  const lockBody = projectFormOpen || selectedRequest !== null || selectedSetupProject !== null

  useEffect(() => {
    const controller = new AbortController()

    setLoading(true)
    setError(null)

    instructorMentoringApi
      .getBoard(controller.signal)
      .then((board) => {
        setProjects(board.projects as RecruitingProject[])
        setRequests(board.requests as PendingRequest[])
        setOngoingProjects(board.ongoingProjects as OngoingProject[])
      })
      .catch((nextError: Error) => {
        if (controller.signal.aborted) {
          return
        }

        setError(nextError.message)
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      })

    return () => controller.abort()
  }, [])

  useEffect(() => {
    document.body.style.overflow = lockBody ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [lockBody])

  async function persistBoard(
    nextProjects: RecruitingProject[],
    nextRequests: PendingRequest[],
    nextOngoingProjects: OngoingProject[],
  ) {
    setProjects(nextProjects)
    setRequests(nextRequests)
    setOngoingProjects(nextOngoingProjects)

    try {
      await instructorMentoringApi.saveBoard({
        projects: nextProjects,
        requests: nextRequests,
        ongoingProjects: nextOngoingProjects,
      } as InstructorMentoringBoard)
    } catch (nextError) {
      window.alert(nextError instanceof Error ? nextError.message : '멘토링 보드 저장에 실패했습니다.')
    }
  }

  function openProjectForm(project?: RecruitingProject) {
    setEditingProjectId(project?.id ?? null)
    setForm(project ? projectToForm(project) : createDefaultForm())
    setTagInput('')
    setProjectFormOpen(true)
    setOpenMenuId(null)
  }

  function closeProjectForm() {
    setProjectFormOpen(false)
    setEditingProjectId(null)
    setTagInput('')
  }

  function openSetupModal(projectId: string) {
    const project = projects.find((item) => item.id === projectId)
    if (!project) return
    setSetupProjectId(projectId)
    setSetupStartDate('')
    setSetupOrientationAt('')
    setSetupWelcome(`${project.title}에 참여해주셔서 감사합니다. OT 일정과 소통 채널은 워크스페이스 공지에서 확인해주세요.`)
    setOpenMenuId(null)
  }

  function updateForm<K extends keyof ProjectFormState>(key: K, value: ProjectFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function updateWeek(index: number, value: string) {
    setForm((current) => ({ ...current, weeks: current.weeks.map((week, weekIndex) => (weekIndex === index ? value : week)) }))
  }

  function addWeek() {
    setForm((current) => ({ ...current, weeks: [...current.weeks, ''] }))
  }

  function updateRole(index: number, key: keyof ProjectRoleInput, value: string | number) {
    setForm((current) => ({
      ...current,
      roles: current.roles.map((role, roleIndex) => (roleIndex === index ? { ...role, [key]: key === 'count' ? Math.max(1, Number(value || 0)) : value } : role)),
    }))
  }

  function addRole() {
    setForm((current) => ({ ...current, roles: [...current.roles, { name: '', count: 1 }] }))
  }

  function removeRole(index: number) {
    setForm((current) => ({ ...current, roles: current.roles.filter((_, roleIndex) => roleIndex !== index) }))
  }

  function addTag() {
    const nextTag = tagInput.trim()
    if (!nextTag) return
    setForm((current) => ({ ...current, tags: current.tags.includes(nextTag) ? current.tags : [...current.tags, nextTag] }))
    setTagInput('')
  }

  function removeTag(tag: string) {
    setForm((current) => ({ ...current, tags: current.tags.filter((item) => item !== tag) }))
  }

  function loadSample() {
    setForm(createSampleForm())
  }

  async function submitProjectForm() {
    if (!form.title.trim() || !form.mentorName.trim() || !form.mentorBio.trim() || !form.intro.trim()) {
      window.alert('필수 항목을 입력해주세요.')
      return
    }
    if (form.mode === 'study' && Number(form.capacityTotal || 0) < 1) {
      window.alert('총 모집 인원을 확인해주세요.')
      return
    }
    if (form.mode === 'team' && form.roles.filter((role) => role.name.trim() && role.count > 0).length === 0) {
      window.alert('직군별 모집 인원을 입력해주세요.')
      return
    }
    if (form.weeks.map((week) => week.trim()).filter(Boolean).length === 0) {
      window.alert('주차별 커리큘럼을 한 개 이상 입력해주세요.')
      return
    }

    const nextProject = buildProjectFromForm(form, editingProject)
    const nextProjects = editingProjectId
      ? projects.map((project) => (project.id === editingProjectId ? nextProject : project))
      : [nextProject, ...projects]

    await persistBoard(nextProjects, requests, ongoingProjects)
    setTab('recruiting')
    closeProjectForm()
    window.alert(editingProjectId ? '공고가 수정되었습니다!' : '공고가 성공적으로 등록되었습니다!')
  }

  async function deleteProject(projectId: string) {
    if (!window.confirm('이 공고를 삭제할까요?')) return

    const nextProjects = projects.filter((project) => project.id !== projectId)
    const nextRequests = requests.filter((request) => request.projectId !== projectId)

    await persistBoard(nextProjects, nextRequests, ongoingProjects)
    setOpenMenuId(null)
  }

  async function approveRequest(requestId: string) {
    const request = requests.find((item) => item.id === requestId)
    if (!request) return

    const nextProjects = projects.map((project) => (project.id === request.projectId ? applyApprovedRequest(project, request) : project))
    const nextRequests = requests.filter((item) => item.id !== requestId)

    await persistBoard(nextProjects, nextRequests, ongoingProjects)
    setApplicationId((current) => (current === requestId ? null : current))
    window.alert(`${request.applicantName}님의 참여가 승인되었습니다.`)
  }

  async function rejectRequest(requestId: string) {
    const request = requests.find((item) => item.id === requestId)
    if (!request || !window.confirm(`${request.applicantName}님의 신청을 거절할까요?`)) return

    const nextRequests = requests.filter((item) => item.id !== requestId)

    await persistBoard(projects, nextRequests, ongoingProjects)
    setApplicationId((current) => (current === requestId ? null : current))
  }

  async function confirmStartProject() {
    if (!setupStartDate || !setupWelcome.trim()) {
      window.alert('필수 항목을 입력해주세요.')
      return
    }

    if (!selectedSetupProject) {
      return
    }

    const nextProjects = projects.filter((project) => project.id !== selectedSetupProject.id)
    const nextRequests = requests.filter((request) => request.projectId !== selectedSetupProject.id)
    const nextOngoingProject: OngoingProject = {
      id: selectedSetupProject.id,
      title: selectedSetupProject.title,
      subtitle: setupOrientationAt ? `OT ${setupOrientationAt}` : selectedSetupProject.requestTitle,
      week: 1,
      mode: selectedSetupProject.mode,
      category: selectedSetupProject.category,
      progress: 0,
      primaryAction: '워크스페이스 이동',
      secondaryAction: '일정 관리',
      menuActions:
        selectedSetupProject.mode === 'team'
          ? ['워크스페이스 설정', '멤버 관리', '완료 처리']
          : ['과제 설정', '공지 전송', '멘토링 종료'],
      workspaceId: null,
    }
    const nextOngoingProjects = [
      nextOngoingProject,
      ...ongoingProjects.filter((project) => project.id !== selectedSetupProject.id),
    ]

    await persistBoard(nextProjects, nextRequests, nextOngoingProjects)

    const title = selectedSetupProject.title
    setSetupProjectId(null)
    setTab('ongoing')
    window.alert(`설정이 저장되었습니다.\n성공적으로 ${title} 프로젝트가 시작되며, 워크스페이스로 이동합니다.`)
  }

  function runOngoingAction(project: OngoingProject, actionLabel: string) {
    setOpenMenuId(null)
    if (actionLabel === '워크스페이스 이동' && project.workspaceId) {
      const dashPath = project.mode === 'team' ? '/instructor-team-ws-dashboard' : '/instructor-ws-dashboard'
      window.location.href = `${dashPath}?workspaceId=${project.workspaceId}`
      return
    }
    window.alert(`${project.title}: ${actionLabel}`)
  }

  if (loading) {
    return (
      <div className="p-6">
        <LoadingCard label="멘토링 보드를 불러오는 중입니다." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <ErrorCard message={error} />
      </div>
    )
  }

  return (
    <div className="p-6" onClick={() => setOpenMenuId(null)}>
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h1 className="text-2xl font-bold text-gray-900">멘토링 관리</h1>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              openProjectForm()
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-green-600"
          >
            <i className="fas fa-bullhorn" /> 멘토링 모집 공고 등록
          </button>
        </div>

        <div className="mb-6 flex gap-2 border-b border-gray-200">
          {[
            ['recruiting', '모집 중 (Recruiting)', projects.length, 'bg-blue-100 text-blue-600'],
            ['requests', '신청 관리', requests.length, 'bg-red-500 text-white'],
            ['ongoing', '진행 중 (Active)', ongoingProjects.length, 'bg-green-100 text-green-600'],
            ['completed', '종료됨 (Ended)', null, ''],
          ].map(([key, label, count, badgeTone]) => {
            const active = tab === key
            return (
              <button key={key} type="button" onClick={() => setTab(key as MentoringTab)} className={`tab-btn px-4 py-3 text-sm transition ${active ? 'active border-b-2 border-brand font-bold text-brand' : 'font-medium text-gray-500 hover:text-gray-800'}`}>
                {label}
                {count !== null ? <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] ${badgeTone}`}>{count}</span> : null}
              </button>
            )
          })}
        </div>

        {tab === 'recruiting' ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <article key={project.id} className="group flex h-full flex-col rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-brand" onClick={(event) => event.stopPropagation()}>
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex flex-wrap gap-1.5">
                    <span className="rounded border border-blue-200 bg-blue-100 px-2 py-1 text-[10px] font-bold text-blue-700">{project.recruitStatus}</span>
                    <span className={`rounded border px-2 py-1 text-[10px] font-bold ${modeMeta[project.mode].tone}`}><i className={`${modeMeta[project.mode].icon} mr-1`} />{modeMeta[project.mode].label}</span>
                    <span className="rounded border border-gray-200 bg-gray-100 px-2 py-1 text-[10px] font-bold text-gray-600">{project.category}</span>
                  </div>
                  <div className="relative">
                    <button type="button" onClick={(event) => { event.stopPropagation(); setOpenMenuId((current) => (current === `recruit-${project.id}` ? null : `recruit-${project.id}`)) }} className="rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600">
                      <i className="fas fa-ellipsis-h" />
                    </button>
                    {openMenuId === `recruit-${project.id}` ? (
                      <div className="absolute top-[calc(100%+8px)] right-0 z-20 min-w-[160px] rounded-lg border border-gray-200 bg-white shadow-lg">
                        <button type="button" onClick={(event) => { event.stopPropagation(); openProjectForm(project) }} className="block w-full px-4 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-50 hover:text-brand"><i className="fas fa-edit mr-2" />공고 수정</button>
                        <button type="button" onClick={(event) => { event.stopPropagation(); deleteProject(project.id) }} className="block w-full border-t border-gray-100 px-4 py-2 text-left text-sm text-red-500 transition hover:bg-red-50"><i className="fas fa-trash-alt mr-2" />삭제</button>
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="mb-3"><h3 className="line-clamp-2 text-lg leading-tight font-extrabold text-gray-900 transition group-hover:text-brand">{project.title}</h3></div>
                <p className="mb-6 line-clamp-2 flex-1 text-xs leading-relaxed text-gray-500">{project.description}</p>
                {project.mode === 'study' ? (
                  <div className="mb-6 flex items-center justify-between rounded-lg bg-gray-50 p-3">
                    <span className="text-[11px] font-bold text-gray-500">현재 모집 현황</span>
                    <span className="text-sm font-black text-gray-900">{project.current} <span className="font-medium text-gray-400">/ {project.total}명</span></span>
                  </div>
                ) : (
                  <div className="mb-6 space-y-2">
                    {project.roles.map((role) => (
                      <div key={role.name} className="flex items-center justify-between text-[11px] font-bold">
                        <span className="text-gray-500">{role.name}</span>
                        <span className="text-gray-900">{role.current} / {role.total}{role.current >= role.total ? <i className="fas fa-check-circle ml-0.5 text-brand" /> : null}</span>
                      </div>
                    ))}
                  </div>
                )}
                <button type="button" onClick={() => openSetupModal(project.id)} className="mt-auto flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3.5 text-xs font-bold text-white shadow-sm transition hover:bg-green-600">
                  <i className="fas fa-rocket" /> 모집 마감 및 시작
                </button>
              </article>
            ))}
          </div>
        ) : null}

        {tab === 'requests' ? (
          <section>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <select value={requestModeFilter} onChange={(event) => setRequestModeFilter(event.target.value as 'all' | MentoringMode)} className="cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 shadow-sm outline-none transition hover:bg-gray-50 focus:border-brand">
                  <option value="all">전체 방식</option>
                  <option value="study">공통 과제형 (스터디)</option>
                  <option value="team">역할 분담형 (팀 프로젝트)</option>
                </select>
                <select value={requestProjectFilter} onChange={(event) => setRequestProjectFilter(event.target.value)} className="cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 shadow-sm outline-none transition hover:bg-gray-50 focus:border-brand">
                  <option value="all">전체 프로젝트 보기</option>
                  {projects.map((project) => <option key={project.id} value={project.id}>{project.requestTitle}</option>)}
                </select>
              </div>
              <p className="text-xs font-bold text-gray-500">총 <span className="text-brand">{pendingRequests.length}</span>건의 대기 중인 신청</p>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
              <table className="min-w-full border-collapse text-left">
                <thead className="border-b border-gray-100 bg-gray-50 text-[11px] font-bold tracking-wider text-gray-400 uppercase">
                  <tr>
                    <th className="px-6 py-4">신청자</th>
                    <th className="px-6 py-4">신청 프로젝트</th>
                    <th className="px-6 py-4">진행 방식</th>
                    <th className="px-6 py-4">지원 직군</th>
                    <th className="px-6 py-4 text-center">지원서/포트폴리오</th>
                    <th className="px-6 py-4 text-center">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {pendingRequests.map((request) => (
                    <tr key={request.id} className="transition hover:bg-gray-50/50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${request.avatarSeed}`} className="h-8 w-8 rounded-full border border-gray-100" alt={request.applicantName} />
                          <div>
                            <span className="block text-sm font-bold text-gray-900">{request.applicantName}</span>
                            <span className="mt-0.5 block text-[10px] text-gray-400">{request.submittedAt}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-gray-800">{request.projectTitle}</td>
                      <td className="px-6 py-4"><span className={`rounded border px-2 py-0.5 text-[10px] font-bold ${modeMeta[request.mode].tone}`}><i className={`${modeMeta[request.mode].icon} mr-1`} />{modeMeta[request.mode].label}</span></td>
                      <td className="px-6 py-4"><span className={`rounded border px-2 py-0.5 text-[10px] font-bold ${request.mode === 'team' ? 'border-blue-100 bg-blue-50 text-blue-600' : 'border-gray-200 bg-gray-100 text-gray-500'}`}>{request.role}</span></td>
                      <td className="px-6 py-4 text-center"><button type="button" onClick={() => setApplicationId(request.id)} className="text-xs font-bold text-brand transition hover:underline"><i className="fas fa-file-alt mr-1" />상세 보기</button></td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button type="button" onClick={() => approveRequest(request.id)} className="rounded-lg bg-brand px-3 py-1.5 text-[11px] font-bold text-white shadow-sm transition hover:bg-green-600">승인</button>
                          <button type="button" onClick={() => rejectRequest(request.id)} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-bold text-gray-400 shadow-sm transition hover:bg-gray-50">거절</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {pendingRequests.length === 0 ? <tr><td colSpan={6} className="px-6 py-14 text-center text-sm font-bold text-gray-400">대기 중인 신청이 없습니다.</td></tr> : null}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {tab === 'ongoing' ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {ongoingProjects.map((project) => (
              <article key={project.id} className="group flex h-full flex-col rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-brand" onClick={(event) => event.stopPropagation()}>
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex flex-wrap gap-1.5">
                    <span className="rounded border border-green-200 bg-green-100 px-2 py-1 text-[10px] font-bold text-green-700">진행 중 ({project.week}주차)</span>
                    <span className={`rounded border px-2 py-1 text-[10px] font-bold ${modeMeta[project.mode].tone}`}><i className={`${modeMeta[project.mode].icon} mr-1`} />{modeMeta[project.mode].label}</span>
                    <span className="rounded border border-gray-200 bg-gray-100 px-2 py-1 text-[10px] font-bold text-gray-600">{project.category}</span>
                  </div>
                  <div className="relative">
                    <button type="button" onClick={(event) => { event.stopPropagation(); setOpenMenuId((current) => (current === `ongoing-${project.id}` ? null : `ongoing-${project.id}`)) }} className="rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600">
                      <i className="fas fa-ellipsis-h" />
                    </button>
                    {openMenuId === `ongoing-${project.id}` ? (
                      <div className="absolute top-[calc(100%+8px)] right-0 z-20 min-w-[170px] rounded-lg border border-gray-200 bg-white shadow-lg">
                        {project.menuActions.map((action, index) => (
                          <button key={action} type="button" onClick={(event) => { event.stopPropagation(); runOngoingAction(project, action) }} className={`block w-full px-4 py-2 text-left text-sm transition ${index === project.menuActions.length - 1 ? 'border-t border-gray-100 text-red-500 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-50 hover:text-brand'}`}>
                            <i className={`mr-2 ${index === 0 ? 'fas fa-cog' : index === 1 ? 'fas fa-users' : 'fas fa-check-circle'}`} />{action}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
                <h3 className="mb-2 text-lg font-extrabold text-gray-900 transition group-hover:text-brand">{project.title}</h3>
                <p className="mb-6 text-xs text-gray-500">{project.subtitle}</p>
                <div className="mt-auto">
                  <div className="mb-2 h-1.5 w-full rounded-full bg-gray-100"><div className="h-1.5 rounded-full bg-brand" style={{ width: `${project.progress}%` }} /></div>
                  <div className="mb-5 flex justify-between text-[10px] font-bold text-gray-400"><span>진척도</span><span className="text-brand">{project.progress}%</span></div>
                  <div className="flex gap-2 border-t border-gray-100 pt-4">
                    <button type="button" onClick={() => runOngoingAction(project, project.primaryAction)} className="flex-1 rounded-xl border border-gray-200 bg-gray-50 py-2.5 text-xs font-bold text-gray-700 transition hover:bg-gray-100">{project.primaryAction}</button>
                    <button type="button" onClick={() => runOngoingAction(project, project.secondaryAction)} className="flex-1 rounded-xl border border-gray-200 bg-gray-50 py-2.5 text-xs font-bold text-gray-700 transition hover:bg-gray-100">{project.secondaryAction}</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : null}

        {tab === 'completed' ? <div className="p-8 text-center font-bold text-gray-500">종료된 멘토링 내역입니다.</div> : null}
      </div>

      {selectedRequest ? (
        <ModalShell onClose={() => setApplicationId(null)}>
          <div className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-gray-900"><i className="fas fa-file-signature mr-1 text-brand" /> 참여 신청서 확인</h3>
              <button type="button" onClick={() => setApplicationId(null)} className="text-gray-400 transition hover:text-gray-900"><i className="fas fa-times" /></button>
            </div>
            <div className="space-y-5">
              <div>
                <p className="mb-1 text-[10px] font-bold text-gray-400">지원자</p>
                <div className="flex items-center gap-2">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedRequest.avatarSeed}`} className="h-7 w-7 rounded-full border border-gray-200 bg-gray-50" alt={selectedRequest.applicantName} />
                  <span className="text-sm font-bold text-gray-900">{selectedRequest.applicantName}</span>
                </div>
              </div>
              <div>
                <p className="mb-1 text-[10px] font-bold text-gray-400">지원 프로젝트 / 직군</p>
                <p className="text-sm font-bold text-gray-800">{selectedRequest.projectTitle}<span className="ml-1 text-xs font-medium text-brand">({selectedRequest.role})</span></p>
              </div>
              <div>
                <p className="mb-1 text-[10px] font-bold text-gray-400">참여 동기</p>
                <div className="max-h-32 overflow-y-auto rounded-xl border border-gray-100 bg-gray-50 p-4 text-xs leading-relaxed text-gray-700">{selectedRequest.motivation}</div>
              </div>
              <div>
                <p className="mb-1 text-[10px] font-bold text-gray-400">포트폴리오 / GitHub</p>
                <a href={selectedRequest.portfolioUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 break-all rounded-xl border border-green-100 bg-green-50 p-3 text-xs font-bold text-brand transition hover:bg-green-100">
                  <i className={`${selectedRequest.portfolioUrl.includes('github') ? 'fab fa-github' : 'fas fa-link'} text-sm`} />
                  <span>{selectedRequest.portfolioUrl}</span>
                </a>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2 border-t border-gray-100 pt-4">
              <button type="button" onClick={() => setApplicationId(null)} className="rounded-xl bg-gray-100 px-5 py-2.5 text-xs font-bold text-gray-700 transition hover:bg-gray-200">닫기</button>
              <button type="button" onClick={() => approveRequest(selectedRequest.id)} className="flex items-center gap-1.5 rounded-xl bg-brand px-6 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-green-600"><i className="fas fa-check" />승인하기</button>
            </div>
          </div>
        </ModalShell>
      ) : null}

      {selectedSetupProject ? (
        <ModalShell onClose={() => setSetupProjectId(null)} size="max-w-lg">
          <div className="overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 p-6">
              <div>
                <h3 className="text-lg font-extrabold text-gray-900"><i className="fas fa-rocket mr-2 text-brand" />프로젝트 시작 설정</h3>
                <p className="mt-1 text-xs text-gray-500">{selectedSetupProject.title}</p>
              </div>
              <button type="button" onClick={() => setSetupProjectId(null)} className="text-gray-400 transition hover:text-gray-900"><i className="fas fa-times" /></button>
            </div>
            <div className="space-y-5 p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-xs font-bold text-gray-600">공식 시작일 <span className="text-red-500">*</span></span>
                  <input type="date" value={setupStartDate} onChange={(event) => setSetupStartDate(event.target.value)} className="w-full cursor-pointer rounded-xl border border-gray-200 p-3 text-sm outline-none transition focus:border-brand" />
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs font-bold text-gray-600">첫 오리엔테이션 일정</span>
                  <input type="datetime-local" value={setupOrientationAt} onChange={(event) => setSetupOrientationAt(event.target.value)} className="w-full cursor-pointer rounded-xl border border-gray-200 p-3 text-sm outline-none transition focus:border-brand" />
                </label>
              </div>
              <label className="block">
                <span className="mb-2 block text-xs font-bold text-gray-600">초기 워크스페이스 공지 (환영 인사) <span className="text-red-500">*</span></span>
                <textarea value={setupWelcome} onChange={(event) => setSetupWelcome(event.target.value)} placeholder="수강생들이 워크스페이스에 입장했을 때 보게 될 첫 공지사항을 작성해주세요. (예: OT 안내, 디스코드 링크 등)" className="h-32 w-full resize-none rounded-xl border border-gray-200 p-3 text-sm outline-none transition focus:border-brand" />
              </label>
              <div className="flex gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4">
                <i className="fas fa-info-circle mt-0.5 text-blue-500" />
                <p className="text-xs leading-relaxed font-medium text-blue-700">시작하기를 누르면 모집 상태가 <strong className="text-blue-800">'마감'</strong>으로 변경되며, 수강생들과 소통할 수 있는 <strong>독립된 워크스페이스</strong>가 즉시 생성됩니다.</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50 p-5">
              <button type="button" onClick={() => setSetupProjectId(null)} className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-50">취소</button>
              <button type="button" onClick={confirmStartProject} className="flex items-center gap-2 rounded-xl bg-brand px-8 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-green-600">프로젝트 본격 시작 <i className="fas fa-arrow-right" /></button>
            </div>
          </div>
        </ModalShell>
      ) : null}

      {projectFormOpen ? (
        <div className="fixed inset-0 z-[2400] flex items-center justify-center bg-[rgba(17,24,39,0.50)] p-4 backdrop-blur-[2px]">
          <div className="flex max-h-[90vh] w-full max-w-[1100px] flex-col overflow-hidden rounded-[18px] border border-gray-200 bg-white shadow-[0_30px_90px_rgba(17,24,39,0.28)]" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 border-b border-gray-100 bg-white px-4 py-[14px]">
              <div className="flex items-center gap-2 text-sm font-black text-gray-900"><i className="fas fa-pen-nib text-brand" />멘토링 모집 공고 작성 (학습자 화면 미리보기)</div>
              <button type="button" onClick={closeProjectForm} className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 transition hover:-translate-y-px hover:bg-gray-50"><i className="fas fa-times" /></button>
            </div>
            <div className="custom-scrollbar overflow-auto bg-white p-4">
              <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-2">
                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                  <div className="flex items-center justify-between gap-3 border-b border-gray-100 bg-white px-3 py-3">
                    <div className="flex items-center gap-2 text-[13px] font-black text-gray-900"><i className="fas fa-sliders-h text-brand" />공고 정보 입력</div>
                    <div className="text-xs font-bold text-gray-400">* 필수 입력</div>
                  </div>
                  <div className="space-y-4 p-3">
                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                      <label className="mb-2 block text-xs font-black text-gray-700">진행 방식 선택 *</label>
                      <div className="grid grid-cols-2 gap-2">
                        {(['study', 'team'] as MentoringMode[]).map((mode) => (
                          <button key={mode} type="button" onClick={() => updateForm('mode', mode)} className={`rounded-lg border px-3 py-2.5 text-center text-xs font-bold shadow-sm transition ${form.mode === mode ? 'border-[#7C3AED] bg-purple-50 text-[#7C3AED]' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}>
                            <i className={`${modeMeta[mode].icon} mb-1 block text-lg`} />{modeMeta[mode].fullLabel}
                          </button>
                        ))}
                      </div>
                      <p className="mt-2 text-center text-[10px] text-gray-500">{form.mode === 'study' ? '모든 수강생이 동일한 개인 과제를 수행하며 개별 피드백을 받습니다.' : '수강생들이 역할을 나누어 하나의 팀 프로젝트를 완성합니다.'}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="block"><span className="mb-2 block text-xs font-black text-gray-700">카테고리 (분야) *</span><select value={form.category} onChange={(event) => updateForm('category', event.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:shadow-[0_0_0_3px_rgba(0,196,113,0.18)]">{['Backend', 'Frontend', 'Full Stack', 'DevOps', 'AI/Data', 'App', 'Game'].map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
                      <label className="block"><span className="mb-2 block text-xs font-black text-gray-700">모집 상태</span><select value={form.recruitStatus} onChange={(event) => updateForm('recruitStatus', event.target.value as '모집중' | '모집마감')} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:shadow-[0_0_0_3px_rgba(0,196,113,0.18)]"><option value="모집중">모집중</option><option value="모집마감">모집마감</option></select></label>
                    </div>
                    <label className="block"><span className="mb-2 block text-xs font-black text-gray-700">프로젝트 제목 *</span><input type="text" maxLength={40} value={form.title} onChange={(event) => updateForm('title', event.target.value)} placeholder="예) 대용량 트래픽 커머스 서버" className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:shadow-[0_0_0_3px_rgba(0,196,113,0.18)]" /></label>
                    {form.mode === 'study' ? <label className="block border-l-2 border-brand pl-3"><span className="mb-2 block text-xs font-black text-gray-700">총 모집 인원(명) *</span><input type="number" min={1} max={99} value={form.capacityTotal} onChange={(event) => updateForm('capacityTotal', event.target.value)} className="w-1/2 rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:shadow-[0_0_0_3px_rgba(0,196,113,0.18)]" /></label> : <div className="border-l-2 border-brand pl-3"><span className="mb-2 block text-xs font-black text-gray-700">직군별 모집 인원 *</span><div className="space-y-2">{form.roles.map((role, index) => <div key={`${role.name}-${index}`} className="flex items-center gap-2"><input type="text" value={role.name} onChange={(event) => updateRole(index, 'name', event.target.value)} placeholder="직군명" className="flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:shadow-[0_0_0_3px_rgba(0,196,113,0.18)]" /><input type="number" min={1} value={role.count} onChange={(event) => updateRole(index, 'count', event.target.value)} className="w-20 rounded-xl border border-gray-200 px-3 py-2.5 text-center text-sm outline-none transition focus:border-brand focus:shadow-[0_0_0_3px_rgba(0,196,113,0.18)]" /><button type="button" onClick={() => removeRole(index)} className="px-2 text-red-400 transition hover:text-red-600"><i className="fas fa-trash text-sm" /></button></div>)}</div><button type="button" onClick={addRole} className="mt-2 w-fit rounded-lg border border-green-100 bg-green-50 px-3 py-1.5 text-xs font-bold text-brand transition hover:text-green-700">+ 직군 추가</button></div>}
                    <label className="block"><span className="mb-2 block text-xs font-black text-gray-700">예상 기간(주) *</span><input type="number" min={1} max={52} value={form.durationWeeks} onChange={(event) => updateForm('durationWeeks', event.target.value)} className="w-1/2 rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:shadow-[0_0_0_3px_rgba(0,196,113,0.18)]" /></label>
                    <div><span className="mb-2 block text-xs font-black text-gray-700">기술 스택 (태그)</span><div className="flex items-center gap-2"><input type="text" value={tagInput} onChange={(event) => setTagInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addTag() } }} placeholder="예) Spring Boot" className="flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:shadow-[0_0_0_3px_rgba(0,196,113,0.18)]" /><button type="button" onClick={addTag} className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-black text-gray-900 transition hover:-translate-y-px hover:bg-gray-50">추가</button></div><div className="mt-2 flex flex-wrap gap-2">{form.tags.map((tag) => <span key={tag} className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-black text-gray-700">{tag}<button type="button" onClick={() => removeTag(tag)} className="flex h-[18px] w-[18px] items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition hover:border-red-500 hover:text-red-500"><i className="fas fa-times text-[10px]" /></button></span>)}</div></div>
                    <label className="block"><span className="mb-2 block text-xs font-black text-gray-700">멘토 이름 *</span><input type="text" maxLength={20} value={form.mentorName} onChange={(event) => updateForm('mentorName', event.target.value)} placeholder="예) 코드마스터 J" className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:shadow-[0_0_0_3px_rgba(0,196,113,0.18)]" /></label>
                    <label className="block"><span className="mb-2 block text-xs font-black text-gray-700">멘토 소개(한 줄) *</span><input type="text" maxLength={40} value={form.mentorBio} onChange={(event) => updateForm('mentorBio', event.target.value)} placeholder="예) 네카라쿠배 백엔드 리드 개발자" className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:shadow-[0_0_0_3px_rgba(0,196,113,0.18)]" /></label>
                    <label className="block"><span className="mb-2 block text-xs font-black text-gray-700">상세 소개 *</span><textarea maxLength={600} value={form.intro} onChange={(event) => updateForm('intro', event.target.value)} placeholder="학습자에게 보이는 소개 문구를 작성하세요." className="min-h-[92px] w-full resize-y rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:shadow-[0_0_0_3px_rgba(0,196,113,0.18)]" /></label>
                    <div><span className="mb-2 block text-xs font-black text-gray-700">주차별 커리큘럼 *</span><div className="grid grid-cols-1 gap-2">{form.weeks.map((week, index) => <input key={`week-${index}`} type="text" value={week} onChange={(event) => updateWeek(index, event.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:shadow-[0_0_0_3px_rgba(0,196,113,0.18)]" />)}</div><button type="button" onClick={addWeek} className="mt-2 w-fit rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-600 transition hover:bg-gray-200">+ 주차 추가</button></div>
                  </div>
                </div>
                <div className="rounded-2xl border-none bg-gray-50">
                  <div className="flex items-center justify-between px-3 pt-3 pb-0"><div className="flex items-center gap-2 text-[13px] font-black text-gray-500"><i className="fas fa-eye text-gray-400" />학습자 화면 미리보기</div><button type="button" onClick={loadSample} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-black text-gray-900 transition hover:-translate-y-px hover:bg-gray-50">샘플 데이터 채우기</button></div>
                  <div className="p-3">
                    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
                      <div className="flex h-[140px] flex-col justify-end gap-2 bg-[linear-gradient(135deg,#374151_0%,#111827_100%)] p-4 text-white">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <span className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-black ${form.recruitStatus === '모집중' ? 'border-[rgba(0,196,113,0.35)] bg-[rgba(0,196,113,0.22)]' : 'border-gray-500 bg-gray-600'}`}>{form.recruitStatus}</span>
                          <span className="inline-flex items-center rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-black">{form.category}</span>
                          <span className="inline-flex items-center rounded-full border border-[rgba(124,58,237,0.35)] bg-[rgba(124,58,237,0.22)] px-3 py-1.5 text-xs font-black">{form.mode === 'study' ? '공통 과제형' : '팀 프로젝트형'}</span>
                          {form.tags.map((tag) => <span key={tag} className="inline-flex items-center rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-black">{tag}</span>)}
                        </div>
                        <h2 className="truncate text-[20px] leading-[1.15] font-black tracking-[-0.02em]">{form.title || '프로젝트 제목'}</h2>
                      </div>
                      <div className="p-4">
                        <div className="mb-4 rounded-2xl border border-gray-100 bg-gray-50 p-3">
                          <div className="flex items-center gap-3">
                            <div className="h-[42px] w-[42px] overflow-hidden rounded-full border border-gray-200 bg-white"><img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${form.mentorName || 'Jonas'}`} className="h-full w-full object-cover" alt="mentor" /></div>
                            <div className="min-w-0"><div className="text-[11px] font-black tracking-[0.06em] text-brand">MENTOR</div><div className="truncate text-sm font-black text-gray-900">{form.mentorName || '멘토 성함'}</div><div className="truncate text-xs font-extrabold text-gray-500">{form.mentorBio || '멘토 한 줄 소개'}</div></div>
                          </div>
                        </div>
                        <div className="mb-2 flex items-center gap-2 text-[13px] font-black text-gray-900"><i className="fas fa-bullseye text-brand" />프로젝트 상세 소개</div>
                        <div className="max-h-32 overflow-y-auto text-sm leading-6 text-gray-700">{form.intro || '프로젝트 소개가 여기에 표시됩니다.'}</div>
                        <div className="mt-4 mb-2 flex items-center gap-2 text-[13px] font-black text-gray-900"><i className="fas fa-list-ol text-brand" />주차별 커리큘럼</div>
                        <div className="space-y-2.5">{form.weeks.map((week, index) => <div key={`preview-week-${index}`} className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-[10px]"><div className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-brand text-[11px] font-black text-white">{index + 1}</div><div className="mt-0.5 text-[13px] leading-[1.35] font-extrabold text-gray-900">{week || `${index + 1}주차 커리큘럼`}</div></div>)}</div>
                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <div className="rounded-2xl border border-gray-200 bg-white p-3 text-center shadow-sm"><div className="text-[11px] font-black tracking-[0.04em] text-gray-400">모집 인원</div><div className="mt-1 text-sm font-black text-gray-900">0 / {previewCapacity.total}명</div>{form.mode === 'team' && previewCapacity.detail ? <div className="mt-1 text-[9px] font-medium text-gray-500">({previewCapacity.detail})</div> : null}</div>
                          <div className="rounded-2xl border border-gray-200 bg-white p-3 text-center shadow-sm"><div className="text-[11px] font-black tracking-[0.04em] text-gray-400">예상 기간</div><div className="mt-1 text-sm font-black text-gray-900">{form.durationWeeks || 0}주</div></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-100 bg-white px-4 py-3">
              <button type="button" onClick={closeProjectForm} className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-black text-gray-900 transition hover:-translate-y-px hover:bg-gray-50">취소</button>
              <button type="button" onClick={submitProjectForm} className="rounded-xl border border-brand bg-brand px-4 py-2.5 text-sm font-black text-white shadow-md transition hover:bg-green-600">{editingProjectId ? '공고 수정하기' : '공고 등록하기'} <i className="fas fa-check ml-1" /></button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
