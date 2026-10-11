import { useEffect, useRef, useState, type ReactNode } from 'react'
import { navigateTo } from '../../lib/spa-navigation'
import {
  createWorkspaceFromAiDesign,
  getWorkspaceAiDesignJob,
  startWorkspaceAiDesignJob,
  type WorkspaceAiDesign,
  type WorkspaceAiDesignDifficulty,
  type WorkspaceAiDesignJob,
  type WorkspaceAiDesignStackMode,
} from './api'

type ModalView = 'start' | 'manual' | 'ai'
type AiView = 'input' | 'loading' | 'result' | 'error'
type Difficulty = WorkspaceAiDesignDifficulty
type StackMode = WorkspaceAiDesignStackMode
type ResultTab = 'scenario' | 'arch' | 'api' | 'roadmap'

type Props = {
  open: boolean
  onClose: () => void
  onOpen: () => void
}

const AI_JOB_STORAGE_KEY = 'devpath.workspace-hub.ai-design-job-id'
const AI_JOB_POLL_INTERVAL_MS = 1500

const difficulties = [
  { id: 'toy' as const, emoji: '🐣', title: '토이 프로젝트', copy: '단순 CRUD 및 기본 스택 위주의 빠른 개발에 적합합니다.' },
  { id: 'mvp' as const, emoji: '🚀', title: '실전 MVP (추천)', copy: '핵심 비즈니스 로직과 소셜 로그인 등을 포함한 실서비스용.' },
  { id: 'enterprise' as const, emoji: '🏢', title: '엔터프라이즈', copy: '대용량 트래픽 대비, MSA, 캐싱, CI/CD 등 심화 아키텍처.' },
]

const resultTabs = [
  { id: 'scenario' as const, label: '기획 & 시나리오' },
  { id: 'arch' as const, label: '아키텍처 & DB' },
  { id: 'api' as const, label: 'API 명세서' },
  { id: 'roadmap' as const, label: '개발 로드맵 & 면접' },
]

export default function WorkspaceProjectStartModal({ open, onClose, onOpen }: Props) {
  const [modalView, setModalView] = useState<ModalView>('start')
  const [aiView, setAiView] = useState<AiView>('input')
  const [difficulty, setDifficulty] = useState<Difficulty>('mvp')
  const [stackMode, setStackMode] = useState<StackMode>('auto')
  const [resultTab, setResultTab] = useState<ResultTab>('scenario')
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [frontend, setFrontend] = useState('상관없음 (추천)')
  const [backend, setBackend] = useState('상관없음 (추천)')
  const [database, setDatabase] = useState('상관없음 (추천)')
  const [idea, setIdea] = useState('')
  const [aiDesign, setAiDesign] = useState<WorkspaceAiDesign | null>(null)
  const [aiError, setAiError] = useState('')
  const [aiJob, setAiJob] = useState<WorkspaceAiDesignJob | null>(null)
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const [jobPollError, setJobPollError] = useState('')
  const [workspaceCreating, setWorkspaceCreating] = useState(false)
  const [statusCardVisible, setStatusCardVisible] = useState(false)
  const preserveAiStateOnOpen = useRef(false)
  const jobStartInFlight = useRef(false)

  useEffect(() => {
    const storedJobId = window.localStorage.getItem(AI_JOB_STORAGE_KEY)
    if (storedJobId) {
      setAiJob({
        jobId: storedJobId,
        status: 'PENDING',
        result: null,
        errorMessage: null,
        createdAt: new Date().toISOString(),
        completedAt: null,
      })
      setActiveJobId(storedJobId)
      setStatusCardVisible(true)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    if (preserveAiStateOnOpen.current) {
      preserveAiStateOnOpen.current = false
      return
    }
    setModalView('start')
    setAiView('input')
    setDifficulty('mvp')
    setStackMode('auto')
    setResultTab('scenario')
    setLoadingDetail(false)
    setFrontend('상관없음 (추천)')
    setBackend('상관없음 (추천)')
    setDatabase('상관없음 (추천)')
    setIdea('')
    setAiDesign(null)
    setAiError('')
  }, [open])

  useEffect(() => {
    if (!activeJobId) return

    let stopped = false
    let pollTimer: number | undefined
    let controller: AbortController | undefined

    const poll = async () => {
      controller = new AbortController()
      try {
        const job = await getWorkspaceAiDesignJob(activeJobId, controller.signal)
        if (stopped) return

        setAiJob(job)
        setJobPollError('')

        if (job.status === 'COMPLETED' && job.result) {
          setAiDesign(job.result)
          setAiError('')
          setResultTab('scenario')
          setAiView('result')
          return
        }

        if (job.status === 'FAILED') {
          setAiError(job.errorMessage ?? 'AI 프로젝트 설계를 생성하지 못했습니다.')
          setAiView('error')
          return
        }

        setAiView('loading')
        pollTimer = window.setTimeout(poll, AI_JOB_POLL_INTERVAL_MS)
      } catch (error) {
        if (stopped || (error instanceof DOMException && error.name === 'AbortError')) return
        setJobPollError('작업 상태를 확인하지 못해 다시 연결하고 있습니다.')
        pollTimer = window.setTimeout(poll, AI_JOB_POLL_INTERVAL_MS * 2)
      }
    }

    void poll()

    return () => {
      stopped = true
      controller?.abort()
      if (pollTimer) window.clearTimeout(pollTimer)
    }
  }, [activeJobId])

  useEffect(() => {
    if (!open || aiView !== 'loading') return
    const detailTimer = window.setTimeout(() => setLoadingDetail(true), 1500)
    return () => window.clearTimeout(detailTimer)
  }, [aiView, open])

  useEffect(() => {
    if (!open) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (modalView === 'ai' && aiView !== 'input') setStatusCardVisible(true)
      onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [aiView, modalView, onClose, open])

  const resetAiInput = () => {
    window.localStorage.removeItem(AI_JOB_STORAGE_KEY)
    setActiveJobId(null)
    setAiJob(null)
    setJobPollError('')
    setAiDesign(null)
    setAiError('')
    setLoadingDetail(false)
    setAiView('input')
    setStatusCardVisible(false)
  }

  const generateAiDesign = async () => {
    if (jobStartInFlight.current) return
    jobStartInFlight.current = true
    window.localStorage.removeItem(AI_JOB_STORAGE_KEY)
    setActiveJobId(null)
    setAiJob(null)
    setJobPollError('')
    setAiDesign(null)
    setAiError('')
    setLoadingDetail(false)
    setAiView('loading')
    setStatusCardVisible(false)

    try {
      const job = await startWorkspaceAiDesignJob({
        difficulty,
        stackMode,
        frontend: stackMode === 'manual' ? frontend : null,
        backend: stackMode === 'manual' ? backend : null,
        database: stackMode === 'manual' ? database : null,
        idea: idea.trim() || null,
      })
      window.localStorage.setItem(AI_JOB_STORAGE_KEY, job.jobId)
      setAiJob(job)
      setActiveJobId(job.jobId)
    } catch (error) {
      setAiError(error instanceof Error ? error.message : 'AI 프로젝트 설계를 생성하지 못했습니다.')
      setAiView('error')
    } finally {
      jobStartInFlight.current = false
    }
  }

  const openJobDetails = () => {
    preserveAiStateOnOpen.current = true
    setStatusCardVisible(false)
    setModalView('ai')

    if (aiJob?.status === 'COMPLETED' && aiJob.result) {
      setAiDesign(aiJob.result)
      setAiView('result')
    } else if (aiJob?.status === 'FAILED') {
      setAiError(aiJob.errorMessage ?? 'AI 프로젝트 설계를 생성하지 못했습니다.')
      setAiView('error')
    } else {
      setAiView('loading')
    }

    onOpen()
  }

  const sendAiToBackground = () => {
    if (aiView !== 'input') setStatusCardVisible(true)
    onClose()
  }

  const createWorkspace = async () => {
    if (!aiJob || workspaceCreating) return
    setWorkspaceCreating(true)
    setAiError('')
    try {
      const workspace = await createWorkspaceFromAiDesign(aiJob.jobId)
      resetAiInput()
      onClose()
      const dashboardUrl = new URL(workspace.dashboardUrl, window.location.origin)
      dashboardUrl.searchParams.set('ai', '1')
      dashboardUrl.searchParams.set('created', 'ai')
      navigateTo(`${dashboardUrl.pathname}${dashboardUrl.search}${dashboardUrl.hash}`)
    } catch (error) {
      setAiError(error instanceof Error ? error.message : '워크스페이스를 생성하지 못했습니다.')
    } finally {
      setWorkspaceCreating(false)
    }
  }

  const statusCard = statusCardVisible && aiJob && !open ? (
    <AiJobStatusCard
      job={aiJob}
      pollError={jobPollError}
      onDismiss={resetAiInput}
      onOpen={openJobDetails}
    />
  ) : null

  if (!open) return statusCard
  if (modalView === 'manual') return <><ManualCreateModal onBack={() => setModalView('start')} onClose={onClose} />{statusCard}</>
  if (modalView === 'ai') {
    return (
      <>
        <AiBuilderModal
          aiView={aiView}
          aiDesign={aiDesign}
          aiError={aiError}
          backend={backend}
          database={database}
          difficulty={difficulty}
          frontend={frontend}
          idea={idea}
          loadingDetail={loadingDetail}
          resultTab={resultTab}
          stackMode={stackMode}
          onBack={() => {
            resetAiInput()
            setModalView('start')
          }}
          onBackendChange={setBackend}
          onBackground={sendAiToBackground}
          onCreateWorkspace={createWorkspace}
          onClose={sendAiToBackground}
          onDatabaseChange={setDatabase}
          onDifficultyChange={setDifficulty}
          onFrontendChange={setFrontend}
          onIdeaChange={setIdea}
          onResultTabChange={setResultTab}
          onStackModeChange={setStackMode}
          onStart={generateAiDesign}
          onReset={resetAiInput}
          workspaceCreating={workspaceCreating}
        />
        {statusCard}
      </>
    )
  }

  return (
    <>
      <ModalOverlay onClose={onClose} tone="light">
        <div aria-label="프로젝트 시작하기" aria-modal="true" className="workspace-project-start-modal workspace-project-modal-enter w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl" role="dialog">
          <div className="flex items-center justify-between border-b border-gray-100 p-6 pb-4">
            <h3 className="flex items-center gap-2 text-lg font-extrabold text-gray-900"><i className="fas fa-rocket text-brand" /> 프로젝트 시작하기</h3>
            <button aria-label="닫기" className="p-1 text-gray-400 transition hover:text-gray-600 focus:outline-none" onClick={onClose} type="button"><i className="fas fa-times text-xl" /></button>
          </div>
          <div className="p-6">
            <p className="mb-5 text-center text-sm font-bold text-gray-600">어떤 방식으로 워크스페이스를 구성할까요?</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ChoiceButton color="green" copy="어떤 프로젝트를 할지 막막하다면? AI가 트렌드에 맞는 주제와 기술 스택을 설계해 줍니다." icon="fa-magic" onClick={() => setModalView('ai')} title="AI에게 주제 추천받기" />
              <ChoiceButton color="blue" copy="이미 생각해둔 명확한 아이디어가 있다면 프로젝트 세부 정보를 직접 입력해 시작하세요." icon="fa-pen-nib" onClick={() => setModalView('manual')} title="내가 직접 설정하기" />
            </div>
          </div>
        </div>
      </ModalOverlay>
      {statusCard}
    </>
  )
}

function ModalOverlay({ children, onClose, tone }: { children: ReactNode; onClose: () => void; tone: 'light' | 'dark' }) {
  return (
    <div className={`fixed inset-0 z-[1100] flex items-center justify-center p-4 backdrop-blur-sm ${tone === 'light' ? 'bg-gray-900/50' : 'bg-gray-900/60'}`} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      {children}
    </div>
  )
}

function ChoiceButton({ color, copy, icon, onClick, title }: { color: 'green' | 'blue'; copy: string; icon: string; onClick: () => void; title: string }) {
  const green = color === 'green'
  return (
    <button className={`group flex flex-col items-center rounded-2xl border-2 border-transparent bg-gray-50 p-6 text-center shadow-sm transition focus:outline-none ${green ? 'hover:border-[#00C471] hover:bg-green-50' : 'hover:border-blue-400 hover:bg-blue-50'}`} onClick={onClick} type="button">
      <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm transition-transform group-hover:-translate-y-1 ${green ? 'text-brand' : 'text-blue-500'}`}><i className={`fas ${icon} text-2xl`} /></div>
      <h4 className="mb-2 font-extrabold text-gray-900">{title}</h4>
      <p className="word-keep text-xs leading-relaxed text-gray-500">{copy}</p>
    </button>
  )
}

function AiJobStatusCard({ job, pollError, onDismiss, onOpen }: { job: WorkspaceAiDesignJob; pollError: string; onDismiss: () => void; onOpen: () => void }) {
  const working = job.status === 'PENDING' || job.status === 'PROCESSING'
  const completed = job.status === 'COMPLETED'

  return (
    <aside aria-live="polite" className="fixed right-4 bottom-4 z-[1200] w-max min-w-0 max-w-[calc(100vw-2rem)] overflow-x-auto rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl sm:right-6 sm:bottom-6 sm:min-w-[22rem]">
      <div className="flex items-start gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${working ? 'bg-green-50 text-brand' : completed ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-500'}`}>
          <i className={`fas ${working ? 'fa-circle-notch animate-spin' : completed ? 'fa-check' : 'fa-exclamation-triangle'}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="whitespace-nowrap text-sm font-extrabold text-gray-900">{working ? 'AI 설계 작업 중' : completed ? 'AI 설계가 완료됐어요' : 'AI 설계를 완료하지 못했어요'}</p>
              <p className="mt-1 whitespace-nowrap text-xs leading-relaxed text-gray-500">
                {working
                  ? pollError || '창을 닫거나 다른 작업을 하셔도 됩니다. 완료되면 여기에서 알려드릴게요.'
                  : completed
                    ? job.result?.title ?? '완성된 프로젝트 설계를 확인해 보세요.'
                    : job.errorMessage ?? '설정 내용을 확인한 뒤 다시 시도해 주세요.'}
              </p>
            </div>
            {!working || pollError ? <button aria-label="AI 설계 알림 닫기" className="text-gray-400 transition hover:text-gray-700" onClick={onDismiss} type="button"><i className="fas fa-times" /></button> : null}
          </div>
          <button className={`mt-2.5 rounded-md px-2.5 py-1.5 text-[11px] font-extrabold transition ${completed ? 'bg-brand text-white hover:bg-green-600' : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`} onClick={onOpen} type="button">
            {working ? '진행 화면 보기' : completed ? '결과 보기' : '설정 수정'}
          </button>
        </div>
      </div>
    </aside>
  )
}

function ManualCreateModal({ onBack, onClose }: { onBack: () => void; onClose: () => void }) {
  return (
    <ModalOverlay onClose={onClose} tone="dark">
      <div aria-label="직접 프로젝트 설정" aria-modal="true" className="workspace-project-manual-modal workspace-project-modal-enter relative flex min-h-[500px] w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl" role="dialog">
        <div className="relative flex w-2/5 flex-col bg-[#0B1727] p-8 text-white md:p-10">
          <button className="group mb-10 flex w-fit items-center gap-2 text-xs! leading-4! font-bold text-gray-400 transition hover:text-white focus:outline-none" onClick={onBack} type="button"><i className="fas fa-arrow-left transition-transform group-hover:-translate-x-1" /> 이전 선택으로 돌아가기</button>
          <div className="mt-2">
            <span className="mb-5 inline-block rounded border border-blue-500/30 bg-blue-600/20 px-2 py-1 text-[10px] font-bold tracking-wide text-blue-400">TEAM SQUAD</span>
            <h2 className="mb-5 text-3xl leading-tight font-black tracking-tight">새로운 스쿼드를<br />결성합니다.</h2>
            <p className="mb-6 text-[13px] leading-relaxed font-medium text-gray-400">동료들과 하나의 목표를 공유하고 정교한 아키텍처를 빌드하는 공간입니다.</p>
            <p className="text-[13px] leading-relaxed font-medium text-gray-400">GitHub를 연동하여 코드 리뷰, 칸반 보드, AI 분석 등 강력한 협업 엔진을 활성화하세요.</p>
          </div>
        </div>
        <div className="relative flex w-3/5 flex-col bg-white p-8 md:p-10">
          <button aria-label="닫기" className="absolute top-6 right-6 flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-900 focus:outline-none" onClick={onClose} type="button"><i className="fas fa-times text-lg" /></button>
          <div className="mb-6 border-b border-gray-100 pb-5 pr-8">
            <h3 className="mb-1.5 flex items-center gap-2 text-xl font-extrabold text-gray-900"><i className="fas fa-cubes text-blue-500" /> 워크스페이스 프로필 설정</h3>
            <p className="text-xs font-medium text-gray-500">스쿼드의 기본 식별 정보와 개발 환경 백본을 정의합니다.</p>
          </div>
          <div className="flex-1 space-y-5">
            <div className="grid grid-cols-2 gap-4"><ModalField icon="fa-folder" label="프로젝트 명" placeholder="예: 배달비 절약 플랫폼 빌드" /><ModalField icon="fa-users" label="스쿼드(팀) 이름" placeholder="예: Team_Squad_A" /></div>
            <ModalField icon="fa-align-left" label="핵심 목표 및 한 줄 소개" placeholder="예: GPS 기반 근거리 매칭을 통한 실시간 배달팟 모집 서비스" />
            <ModalField icon="fa-layer-group" label="사용 기술 스택" placeholder="예: React, TypeScript, Spring Boot, Redis, MySQL" />
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold text-gray-600"><i className="fab fa-github text-sm text-gray-800" /> GitHub 저장소 연동 <span className="ml-1 rounded border border-blue-100 bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold text-blue-600">핵심 기능</span></label>
              <input className="w-full rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2.5 text-xs! leading-4! font-medium outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:bg-white" placeholder="https://github.com/organization/repository" type="text" />
              <p className="mt-2 flex items-center gap-1 text-[10px] font-medium text-gray-400"><i className="fas fa-info-circle text-blue-400" /> 연동 시 코드 리뷰, 칸반 보드, AI 분석이 자동 동기화됩니다.</p>
            </div>
          </div>
          <div className="mt-8 pt-4"><button className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0B1727] py-3.5 text-sm! leading-5! font-extrabold text-white shadow-lg transition hover:bg-black focus:outline-none" type="button"><i className="fas fa-rocket text-blue-400" /> 엔터프라이즈 스쿼드 생성</button></div>
        </div>
      </div>
    </ModalOverlay>
  )
}

function ModalField({ icon, label, placeholder }: { icon: string; label: string; placeholder: string }) {
  return <div><label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold text-gray-600"><i className={`fas ${icon} text-gray-400`} /> {label}</label><input className="w-full rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2.5 text-xs! leading-4! font-medium outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:bg-white" placeholder={placeholder} type="text" /></div>
}

type AiProps = {
  aiView: AiView
  aiDesign: WorkspaceAiDesign | null
  aiError: string
  backend: string
  database: string
  difficulty: Difficulty
  frontend: string
  idea: string
  loadingDetail: boolean
  resultTab: ResultTab
  stackMode: StackMode
  onBack: () => void
  onBackendChange: (value: string) => void
  onBackground: () => void
  onCreateWorkspace: () => void
  onClose: () => void
  onDatabaseChange: (value: string) => void
  onDifficultyChange: (difficulty: Difficulty) => void
  onFrontendChange: (value: string) => void
  onIdeaChange: (value: string) => void
  onReset: () => void
  onResultTabChange: (tab: ResultTab) => void
  onStart: () => void
  onStackModeChange: (mode: StackMode) => void
  workspaceCreating: boolean
}

function AiBuilderModal({ aiView, aiDesign, aiError, backend, database, difficulty, frontend, idea, loadingDetail, resultTab, stackMode, onBack, onBackendChange, onBackground, onClose, onCreateWorkspace, onDatabaseChange, onDifficultyChange, onFrontendChange, onIdeaChange, onReset, onResultTabChange, onStart, onStackModeChange, workspaceCreating }: AiProps) {
  return (
    <ModalOverlay onClose={onClose} tone="dark">
      <div aria-label="DevPath AI Builder" aria-modal="true" className="workspace-project-ai-modal workspace-project-modal-enter relative flex w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-[#F4F5F7] shadow-2xl" role="dialog">
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6">
          <div className="flex items-center gap-3"><button aria-label="이전으로" className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-900" onClick={onBack} type="button"><i className="fas fa-arrow-left" /></button><div className="mx-1 hidden h-4 w-px bg-gray-300 sm:block" /><div className="flex items-center gap-2 text-lg font-black text-gray-900"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white shadow-sm"><i className="fas fa-magic text-xs" /></div><span className="tracking-tight">DevPath <span className="font-bold text-brand">AI Builder</span></span></div></div>
          <button className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm! leading-5! font-bold text-gray-400 transition hover:bg-gray-100 hover:text-gray-600" onClick={onClose} type="button"><i className="fas fa-times text-lg" /> <span className="hidden sm:inline">닫기</span></button>
        </div>
        <div className={`workspace-project-modal-scroll relative flex-1 overflow-y-auto ${aiView === 'input' ? 'p-2' : 'p-6 sm:p-10'}`}>
          {aiView === 'input' ? <AiInput backend={backend} database={database} difficulty={difficulty} frontend={frontend} idea={idea} stackMode={stackMode} onBackendChange={onBackendChange} onDatabaseChange={onDatabaseChange} onDifficultyChange={onDifficultyChange} onFrontendChange={onFrontendChange} onIdeaChange={onIdeaChange} onStackModeChange={onStackModeChange} onStart={onStart} /> : null}
          {aiView === 'loading' ? <AiLoading detailed={loadingDetail} onBackground={onBackground} /> : null}
          {aiView === 'error' ? <AiError message={aiError} onReset={onReset} onRetry={onStart} /> : null}
          {aiView === 'result' && aiDesign ? <AiResult createError={aiError} creating={workspaceCreating} design={aiDesign} resultTab={resultTab} onCreate={onCreateWorkspace} onReset={onReset} onResultTabChange={onResultTabChange} /> : null}
        </div>
      </div>
    </ModalOverlay>
  )
}

type AiInputProps = {
  backend: string
  database: string
  difficulty: Difficulty
  frontend: string
  idea: string
  stackMode: StackMode
  onBackendChange: (value: string) => void
  onDatabaseChange: (value: string) => void
  onDifficultyChange: (value: Difficulty) => void
  onFrontendChange: (value: string) => void
  onIdeaChange: (value: string) => void
  onStackModeChange: (value: StackMode) => void
  onStart: () => void
}

function AiInput({ backend, database, difficulty, frontend, idea, stackMode, onBackendChange, onDatabaseChange, onDifficultyChange, onFrontendChange, onIdeaChange, onStackModeChange, onStart }: AiInputProps) {
  return (
    <div className={`workspace-project-ai-input workspace-project-modal-view mx-auto grid max-w-3xl grid-cols-1 gap-4 ${stackMode === 'manual' ? 'workspace-project-ai-input--manual' : ''}`}>
      <div className="workspace-project-ai-input-intro text-center"><span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-black text-brand shadow-sm"><i className="fas fa-sliders-h" /> STEP 1. 프로젝트 구체화</span><h1 className="mb-2 text-2xl leading-tight font-black tracking-tight text-gray-900 sm:text-3xl">어떤 규모와 기술로 구성할까요?</h1><p className="text-sm font-medium text-gray-500">원하는 옵션을 선택하면 AI가 상황에 맞는 아키텍처를 그려냅니다.</p></div>
      <div><h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-gray-900"><i className="fas fa-layer-group text-blue-500" /> 프로젝트 규모 (설계 난이도)</h3><div className="grid grid-cols-1 gap-3 md:grid-cols-3">{difficulties.map((item) => { const selected = difficulty === item.id; return <button aria-pressed={selected} className={`workspace-project-ai-difficulty rounded-2xl border-2 p-4 text-left shadow-sm transition ${selected ? 'border-brand bg-green-50' : 'border-transparent bg-white'}`} key={item.id} onClick={() => onDifficultyChange(item.id)} type="button"><div className="mb-2 flex items-start justify-between"><span className="text-xl">{item.emoji}</span><span className={`h-4 w-4 rounded-full bg-white ${selected ? 'border-4 border-brand' : 'border-2 border-gray-300'}`} /></div><h4 className="mb-1 text-sm font-extrabold text-gray-900">{item.title}</h4><p className="text-xs leading-relaxed text-gray-500">{item.copy}</p></button> })}</div></div>
      <div className={`workspace-project-ai-options grid grid-cols-1 ${stackMode === 'manual' ? 'gap-3' : 'gap-5'}`}>
        <div><h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-gray-900"><i className="fas fa-cogs text-orange-500" /> 프레임워크 및 라이브러리</h3><div className="workspace-project-ai-stack-toggle mb-4 flex gap-1 rounded-xl border border-gray-200 bg-gray-100/50 p-1.5"><StackButton active={stackMode === 'auto'} label="✨ AI 자동 추천" onClick={() => onStackModeChange('auto')} /><StackButton active={stackMode === 'manual'} label="⚙️ 사용자가 직접 설정" onClick={() => onStackModeChange('manual')} /></div>{stackMode === 'manual' ? <ManualStackFields backend={backend} database={database} frontend={frontend} onBackendChange={onBackendChange} onDatabaseChange={onDatabaseChange} onFrontendChange={onFrontendChange} /> : null}</div>
        <div className="workspace-project-ai-idea-section"><h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-gray-900"><i className="fas fa-lightbulb text-yellow-500" /> 만들고 싶은 서비스 아이디어 <span className="text-xs font-medium text-gray-400">(선택사항)</span></h3><div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20"><textarea aria-label="만들고 싶은 서비스 아이디어" className="workspace-project-ai-idea w-full resize-none border-none bg-transparent p-4 text-sm! leading-5! font-medium text-gray-800 outline-none placeholder:text-gray-400" maxLength={1000} onChange={(event) => onIdeaChange(event.target.value)} placeholder="예: 우리 동네 남는 식재료를 이웃과 나누는 플랫폼을 만들고 싶어. (빈칸으로 두셔도 AI가 트렌디한 주제를 추천합니다.)" rows={4} value={idea} /></div></div>
      </div>
      <div className="workspace-project-ai-footer sticky bottom-0 bg-[#F4F5F7] pt-4 pb-2 text-center"><button className="workspace-project-ai-submit mx-auto flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-6 py-4 text-base font-extrabold text-white shadow-[0_10px_20px_-10px_rgba(0,196,113,0.5)] transition hover:bg-green-600 sm:w-2/3" onClick={onStart} type="button"><i className="fas fa-bolt" /> 이 설정으로 AI 설계 시작하기</button></div>
    </div>
  )
}

function StackButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return <button aria-pressed={active} className={`flex-1 rounded-lg border-2 py-2.5 text-sm! leading-5! transition ${active ? 'border-gray-900 bg-white font-extrabold text-gray-900 shadow-sm' : 'border-transparent font-bold text-gray-500 hover:text-gray-800'}`} onClick={onClick} type="button">{label}</button>
}

function ManualStackFields({ backend, database, frontend, onBackendChange, onDatabaseChange, onFrontendChange }: { backend: string; database: string; frontend: string; onBackendChange: (value: string) => void; onDatabaseChange: (value: string) => void; onFrontendChange: (value: string) => void }) {
  return <div className="workspace-project-ai-manual-fields grid grid-cols-1 gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:grid-cols-3"><StackSelect label="Frontend" onChange={onFrontendChange} options={['상관없음 (추천)', 'React', 'Vue.js', 'Next.js', 'Angular', 'Svelte / SvelteKit', 'Nuxt.js', 'Remix', 'Vanilla JavaScript']} value={frontend} /><StackSelect label="Backend" onChange={onBackendChange} options={['상관없음 (추천)', 'Java / Spring Boot', 'Node.js / Express', 'Node.js / NestJS', 'Python / Django', 'Python / FastAPI', 'Kotlin / Spring Boot', 'PHP / Laravel', 'Go / Gin', 'Ruby on Rails', 'ASP.NET Core']} value={backend} /><StackSelect label="Database" onChange={onDatabaseChange} options={['상관없음 (추천)', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'MariaDB', 'SQLite', 'Oracle Database', 'Microsoft SQL Server', 'Amazon DynamoDB']} value={database} /></div>
}

function StackSelect({ label, onChange, options, value }: { label: string; onChange: (value: string) => void; options: string[]; value: string }) {
  return <div><label className="mb-1.5 block text-xs font-bold text-gray-500" htmlFor={`workspace-ai-${label.toLowerCase()}`}>{label}</label><select className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm! leading-5! font-medium outline-none focus:border-brand" id={`workspace-ai-${label.toLowerCase()}`} onChange={(event) => onChange(event.target.value)} value={value}>{options.map((option) => <option key={option}>{option}</option>)}</select></div>
}

function AiLoading({ detailed, onBackground }: { detailed: boolean; onBackground: () => void }) {
  return <div className="workspace-project-modal-view flex flex-col items-center justify-center py-32 text-center"><div className="relative mb-8 flex h-24 w-24 items-center justify-center"><div className="workspace-project-modal-ai-pulse absolute inset-0 rounded-full bg-brand/20" /><div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-brand text-3xl text-white shadow-lg shadow-green-500/40"><i className="fas fa-brain animate-bounce" /></div></div><h2 className="mb-3 text-2xl font-black text-gray-900">{detailed ? 'DB 모델링 및 API 설계 중입니다...' : '요구사항을 분석 중입니다...'}</h2><p className="text-sm font-medium text-gray-500">{detailed ? '실무 면접에 대비할 수 있는 기술적 난제와 로드맵을 구성합니다.' : '입력하신 규모와 스택을 바탕으로 최적의 아키텍처를 탐색합니다.'}</p><div className="relative mt-8 h-1.5 w-64 overflow-hidden rounded-full bg-gray-200"><div className="workspace-project-modal-progress absolute top-0 left-0 h-1.5 rounded-full bg-brand" /></div><button className="mt-6 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-50" onClick={onBackground} type="button"><i className="fas fa-window-minimize mr-2 text-brand" />백그라운드에서 계속</button></div>
}

function AiError({ message, onReset, onRetry }: { message: string; onReset: () => void; onRetry: () => void }) {
  return <div className="workspace-project-modal-view flex flex-col items-center justify-center py-28 text-center"><div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-2xl text-red-500"><i className="fas fa-exclamation-triangle" /></div><h2 className="mb-2 text-xl font-black text-gray-900">AI 설계를 생성하지 못했습니다.</h2><p className="max-w-md text-sm leading-relaxed font-medium text-gray-500">{message}</p><div className="mt-7 flex gap-3"><button className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50" onClick={onReset} type="button">설정 수정</button><button className="rounded-xl bg-brand px-5 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-green-600" onClick={onRetry} type="button"><i className="fas fa-redo-alt mr-1" /> 다시 시도</button></div></div>
}

function AiResult({ createError, creating, design, resultTab, onCreate, onReset, onResultTabChange }: { createError: string; creating: boolean; design: WorkspaceAiDesign; resultTab: ResultTab; onCreate: () => void; onReset: () => void; onResultTabChange: (tab: ResultTab) => void }) {
  return <div className="workspace-project-modal-view space-y-6 pb-10"><div className="mb-2 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end"><div><span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-brand px-2.5 py-1 text-[10px] font-black text-white shadow-sm"><i className="fas fa-check" /> AI 포트폴리오 설계 완료</span><h1 className="text-2xl leading-tight font-black text-gray-900 sm:text-3xl"><span className="workspace-project-modal-gradient">{design.title}</span></h1><p className="mt-1 text-sm font-medium text-gray-500">{design.summary}</p>{createError ? <p className="mt-2 text-xs font-bold text-red-500">{createError}</p> : null}</div><div className="flex w-full shrink-0 gap-2 sm:w-auto"><button className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm! leading-5! font-bold text-gray-700 shadow-sm transition hover:bg-gray-50 sm:flex-none" onClick={onReset} type="button"><i className="fas fa-redo-alt mr-1" /> 다시하기</button><button className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm! leading-5! font-bold text-white shadow-md transition hover:bg-black disabled:opacity-60 sm:flex-none" disabled={creating} onClick={onCreate} type="button">{creating ? '생성 중...' : '워크스페이스 생성'} <i className="fas fa-arrow-right" /></button></div></div><div className="workspace-project-modal-hide-scroll flex items-center gap-1 overflow-x-auto border-b border-gray-200 pb-px">{resultTabs.map((tab) => <button className={`shrink-0 px-4 py-3 text-sm! leading-5! ${resultTab === tab.id ? 'border-b-2 border-brand font-extrabold text-brand' : 'font-bold text-gray-500 transition hover:text-gray-900'}`} key={tab.id} onClick={() => onResultTabChange(tab.id)} type="button">{tab.label}</button>)}</div><ResultContent design={design} tab={resultTab} /></div>
}

function ResultContent({ design, tab }: { design: WorkspaceAiDesign; tab: ResultTab }) {
  if (tab === 'scenario') return <ScenarioResult design={design} />
  if (tab === 'arch') return <ArchitectureResult design={design} />
  if (tab === 'api') return <ApiResult apis={design.apis} />
  return <RoadmapResult design={design} />
}

function ResultCard({ children, icon, title }: { children: ReactNode; icon: string; title: string }) {
  return <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"><h3 className="mb-4 flex items-center gap-2 text-sm font-extrabold text-gray-900"><i className={`fas ${icon}`} /> {title}</h3>{children}</div>
}

function ScenarioResult({ design }: { design: WorkspaceAiDesign }) {
  return <div className="grid grid-cols-1 gap-6 lg:grid-cols-2"><ResultCard title="핵심 사용자 흐름 (User Flow)" icon="fa-route text-blue-500"><div className="space-y-4">{design.scenario.userFlows.map((flow, index) => <div className="flex gap-3" key={`${flow.actor}-${index}`}><div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${index % 2 === 0 ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-brand'}`}>{index + 1}</div><p className="text-sm leading-relaxed text-gray-600"><strong className="mr-1 text-gray-900">{flow.actor}</strong>{flow.action}</p></div>)}</div></ResultCard><ResultCard title="핵심 검증 기능" icon="fa-star text-yellow-500"><ul className="space-y-2.5">{design.scenario.coreFeatures.map((feature) => <li className="flex items-start gap-2 text-sm text-gray-600" key={feature}><i className="fas fa-check-circle mt-1 text-brand" /><span>{feature}</span></li>)}</ul></ResultCard></div>
}

function ArchitectureResult({ design }: { design: WorkspaceAiDesign }) {
  const architecture = design.architecture
  return <div className="space-y-6"><ResultCard title="핵심 기술적 난제" icon="fa-fire text-red-500"><ul className="space-y-2">{architecture.technicalChallenges.map((challenge) => <li className="flex items-start gap-2 text-sm leading-relaxed text-gray-600" key={challenge}><i className="fas fa-bolt mt-1 text-red-400" /><span>{challenge}</span></li>)}</ul></ResultCard><div className="grid grid-cols-1 gap-4 md:grid-cols-2"><ResultCard title="추천 기술 스택" icon="fa-layer-group text-blue-500"><TagList tags={[design.stack.frontend, design.stack.backend, design.stack.database, ...design.stack.libraries]} /><p className="mt-3 text-xs leading-relaxed text-gray-500">{design.stack.selectionReason}</p></ResultCard><ResultCard title={architecture.style} icon="fa-sitemap text-green-500"><p className="mb-3 text-sm leading-relaxed text-gray-600">{architecture.description}</p><div className="space-y-2">{architecture.components.map((component) => <div className="rounded-lg bg-gray-50 p-3" key={component.name}><strong className="text-xs text-gray-900">{component.name}</strong><p className="mt-1 text-xs text-gray-500">{component.responsibility}</p></div>)}</div></ResultCard></div><div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"><div className="border-b border-gray-200 bg-gray-50 p-4"><h3 className="text-sm font-extrabold text-gray-900">Database Schema (Mermaid ERD)</h3></div><pre className="overflow-x-auto bg-[#111827] p-4 text-xs leading-relaxed text-gray-300">{architecture.erdMermaid}</pre></div><div className="grid grid-cols-1 gap-4 lg:grid-cols-2">{architecture.entities.map((entity) => <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm" key={entity.name}><div className="border-b border-gray-100 bg-gray-50 p-4"><h4 className="font-mono text-sm font-extrabold text-gray-900">{entity.name}</h4><p className="mt-1 text-xs text-gray-500">{entity.purpose}</p></div><div className="divide-y divide-gray-100">{entity.columns.map((column) => <div className="grid grid-cols-[1fr_auto] gap-3 p-3 text-xs" key={`${entity.name}-${column.name}`}><div><span className="font-mono font-bold text-gray-800">{column.name}</span><p className="mt-1 text-gray-500">{column.description}</p></div><div className="text-right"><span className="font-mono text-gray-600">{column.type}</span><p className="mt-1 font-bold text-blue-500">{column.constraints}</p></div></div>)}</div></div>)}</div></div>
}

function TagList({ tags }: { tags: string[] }) {
  return <div className="flex flex-wrap gap-2">{tags.map((tag, index) => <span className="rounded-lg border border-gray-200 bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-700" key={`${tag}-${index}`}>{tag}</span>)}</div>
}

function ApiResult({ apis }: { apis: WorkspaceAiDesign['apis'] }) {
  return <div className="space-y-4">{apis.map((api) => <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm" key={`${api.method}-${api.path}`}><div className="flex flex-col gap-3 border-b border-gray-100 bg-gray-50 p-4 sm:flex-row sm:items-center"><span className={`w-fit rounded px-2.5 py-1 text-xs font-extrabold ${methodBadgeClass(api.method)}`}>{api.method}</span><span className="font-mono text-sm font-bold text-gray-900">{api.path}</span><span className="text-xs font-medium text-gray-500 sm:ml-auto">{api.auth}</span></div><div className="p-4"><p className="mb-4 text-sm text-gray-600">{api.description}</p><div className="grid grid-cols-1 gap-3 lg:grid-cols-2"><div><p className="mb-1 text-[10px] font-extrabold tracking-wide text-gray-400">REQUEST</p><pre className="overflow-x-auto rounded-lg bg-gray-900 p-3 text-xs text-gray-200">{api.requestExample}</pre></div><div><p className="mb-1 text-[10px] font-extrabold tracking-wide text-gray-400">RESPONSE</p><pre className="overflow-x-auto rounded-lg bg-gray-900 p-3 text-xs text-gray-200">{api.responseExample}</pre></div></div></div></div>)}</div>
}

function methodBadgeClass(method: string) {
  if (method === 'GET') return 'bg-green-100 text-green-600'
  if (method === 'DELETE') return 'bg-red-100 text-red-600'
  if (method === 'PATCH' || method === 'PUT') return 'bg-orange-100 text-orange-600'
  return 'bg-blue-100 text-blue-600'
}

function RoadmapResult({ design }: { design: WorkspaceAiDesign }) {
  return <div className="grid grid-cols-1 gap-6 lg:grid-cols-2"><ResultCard title="개발 구현 로드맵" icon="fa-tasks text-purple-500"><div className="ml-3 space-y-6 border-l-2 border-gray-100">{design.roadmap.map((phase, index) => <div className="relative pl-6" key={`${phase.phase}-${phase.title}`}><div className={`absolute -left-[9px] top-0 h-4 w-4 rounded-full border-4 border-white ${index === 0 ? 'bg-purple-500' : 'bg-gray-300'}`} /><div className="flex items-center justify-between gap-3"><h4 className="text-sm font-bold text-gray-900">{phase.phase}. {phase.title}</h4><span className="shrink-0 text-[10px] font-bold text-purple-500">약 {phase.estimatedWeeks}주</span></div><p className="mt-1 text-xs text-gray-500">{phase.goal}</p><ul className="mt-2 space-y-1">{phase.tasks.map((task) => <li className="text-xs text-gray-600" key={task}>• {task}</li>)}</ul></div>)}</div></ResultCard><ResultCard title="실무 면접 예상 질문" icon="fa-user-tie text-blue-500"><div className="space-y-4">{design.interviewQuestions.map((item) => <div className="rounded-xl border border-gray-100 bg-gray-50 p-4" key={item.question}><span className="mb-2 inline-flex rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600">{item.category}</span><p className="mb-2 text-sm font-bold text-gray-900">Q. {item.question}</p><p className="text-xs leading-relaxed text-gray-600">A. {item.answer}</p><div className="mt-3"><TagList tags={item.keywords} /></div></div>)}</div></ResultCard></div>
}
