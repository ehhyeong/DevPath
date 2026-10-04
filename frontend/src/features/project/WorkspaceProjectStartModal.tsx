import { useEffect, useState, type ReactNode } from 'react'
import { navigateTo } from '../../lib/spa-navigation'

type ModalView = 'start' | 'manual' | 'ai'
type AiView = 'input' | 'loading' | 'result'
type Difficulty = 'toy' | 'mvp' | 'enterprise'
type StackMode = 'auto' | 'manual'
type ResultTab = 'scenario' | 'arch' | 'api' | 'roadmap'

type Props = {
  open: boolean
  onClose: () => void
}

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

export default function WorkspaceProjectStartModal({ open, onClose }: Props) {
  const [modalView, setModalView] = useState<ModalView>('start')
  const [aiView, setAiView] = useState<AiView>('input')
  const [difficulty, setDifficulty] = useState<Difficulty>('mvp')
  const [stackMode, setStackMode] = useState<StackMode>('auto')
  const [resultTab, setResultTab] = useState<ResultTab>('scenario')
  const [loadingDetail, setLoadingDetail] = useState(false)

  useEffect(() => {
    if (!open) return
    setModalView('start')
    setAiView('input')
    setDifficulty('mvp')
    setStackMode('auto')
    setResultTab('scenario')
    setLoadingDetail(false)
  }, [open])

  useEffect(() => {
    if (!open || aiView !== 'loading') return
    const detailTimer = window.setTimeout(() => setLoadingDetail(true), 1500)
    const resultTimer = window.setTimeout(() => {
      setResultTab('scenario')
      setAiView('result')
    }, 3500)
    return () => {
      window.clearTimeout(detailTimer)
      window.clearTimeout(resultTimer)
    }
  }, [aiView, open])

  useEffect(() => {
    if (!open) return
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose, open])

  if (!open) return null
  if (modalView === 'manual') return <ManualCreateModal onBack={() => setModalView('start')} onClose={onClose} />
  if (modalView === 'ai') {
    return (
      <AiBuilderModal
        aiView={aiView}
        difficulty={difficulty}
        loadingDetail={loadingDetail}
        resultTab={resultTab}
        stackMode={stackMode}
        onAiViewChange={setAiView}
        onBack={() => setModalView('start')}
        onClose={onClose}
        onDifficultyChange={setDifficulty}
        onResultTabChange={setResultTab}
        onStackModeChange={setStackMode}
        resetLoading={() => setLoadingDetail(false)}
      />
    )
  }

  return (
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
  difficulty: Difficulty
  loadingDetail: boolean
  resultTab: ResultTab
  stackMode: StackMode
  onAiViewChange: (view: AiView) => void
  onBack: () => void
  onClose: () => void
  onDifficultyChange: (difficulty: Difficulty) => void
  onResultTabChange: (tab: ResultTab) => void
  onStackModeChange: (mode: StackMode) => void
  resetLoading: () => void
}

function AiBuilderModal({ aiView, difficulty, loadingDetail, resultTab, stackMode, onAiViewChange, onBack, onClose, onDifficultyChange, onResultTabChange, onStackModeChange, resetLoading }: AiProps) {
  return (
    <ModalOverlay onClose={onClose} tone="dark">
      <div aria-label="DevPath AI Builder" aria-modal="true" className="workspace-project-ai-modal workspace-project-modal-enter relative flex w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-[#F4F5F7] shadow-2xl" role="dialog">
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6">
          <div className="flex items-center gap-3"><button aria-label="이전으로" className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-900" onClick={onBack} type="button"><i className="fas fa-arrow-left" /></button><div className="mx-1 hidden h-4 w-px bg-gray-300 sm:block" /><div className="flex items-center gap-2 text-lg font-black text-gray-900"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white shadow-sm"><i className="fas fa-magic text-xs" /></div><span className="tracking-tight">DevPath <span className="font-bold text-brand">AI Builder</span></span></div></div>
          <button className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm! leading-5! font-bold text-gray-400 transition hover:bg-gray-100 hover:text-gray-600" onClick={onClose} type="button"><i className="fas fa-times text-lg" /> <span className="hidden sm:inline">닫기</span></button>
        </div>
        <div className={`workspace-project-modal-scroll relative flex-1 overflow-y-auto ${aiView === 'input' ? 'p-2' : 'p-6 sm:p-10'}`}>
          {aiView === 'input' ? <AiInput difficulty={difficulty} stackMode={stackMode} onDifficultyChange={onDifficultyChange} onStackModeChange={onStackModeChange} onStart={() => { resetLoading(); onAiViewChange('loading') }} /> : null}
          {aiView === 'loading' ? <AiLoading detailed={loadingDetail} /> : null}
          {aiView === 'result' ? <AiResult resultTab={resultTab} onReset={() => { resetLoading(); onAiViewChange('input') }} onResultTabChange={onResultTabChange} /> : null}
        </div>
      </div>
    </ModalOverlay>
  )
}

function AiInput({ difficulty, stackMode, onDifficultyChange, onStackModeChange, onStart }: { difficulty: Difficulty; stackMode: StackMode; onDifficultyChange: (value: Difficulty) => void; onStackModeChange: (value: StackMode) => void; onStart: () => void }) {
  return (
    <div className={`workspace-project-ai-input workspace-project-modal-view mx-auto grid max-w-3xl grid-cols-1 gap-4 ${stackMode === 'manual' ? 'workspace-project-ai-input--manual' : ''}`}>
      <div className="workspace-project-ai-input-intro text-center"><span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-black text-brand shadow-sm"><i className="fas fa-sliders-h" /> STEP 1. 프로젝트 구체화</span><h1 className="mb-2 text-2xl leading-tight font-black tracking-tight text-gray-900 sm:text-3xl">어떤 규모와 기술로 구성할까요?</h1><p className="text-sm font-medium text-gray-500">원하는 옵션을 선택하면 AI가 상황에 맞는 아키텍처를 그려냅니다.</p></div>
      <div><h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-gray-900"><i className="fas fa-layer-group text-blue-500" /> 프로젝트 규모 (설계 난이도)</h3><div className="grid grid-cols-1 gap-3 md:grid-cols-3">{difficulties.map((item) => { const selected = difficulty === item.id; return <button aria-pressed={selected} className={`workspace-project-ai-difficulty rounded-2xl border-2 p-4 text-left shadow-sm transition ${selected ? 'border-brand bg-green-50' : 'border-transparent bg-white'}`} key={item.id} onClick={() => onDifficultyChange(item.id)} type="button"><div className="mb-2 flex items-start justify-between"><span className="text-xl">{item.emoji}</span><span className={`h-4 w-4 rounded-full bg-white ${selected ? 'border-4 border-brand' : 'border-2 border-gray-300'}`} /></div><h4 className="mb-1 text-sm font-extrabold text-gray-900">{item.title}</h4><p className="text-xs leading-relaxed text-gray-500">{item.copy}</p></button> })}</div></div>
      <div className={`workspace-project-ai-options grid grid-cols-1 ${stackMode === 'manual' ? 'gap-3' : 'gap-5'}`}>
        <div><h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-gray-900"><i className="fas fa-cogs text-orange-500" /> 프레임워크 및 라이브러리</h3><div className="workspace-project-ai-stack-toggle mb-4 flex gap-1 rounded-xl border border-gray-200 bg-gray-100/50 p-1.5"><StackButton active={stackMode === 'auto'} label="✨ AI 자동 추천" onClick={() => onStackModeChange('auto')} /><StackButton active={stackMode === 'manual'} label="⚙️ 사용자가 직접 설정" onClick={() => onStackModeChange('manual')} /></div>{stackMode === 'manual' ? <ManualStackFields /> : null}</div>
        <div className="workspace-project-ai-idea-section"><h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-gray-900"><i className="fas fa-lightbulb text-yellow-500" /> 만들고 싶은 서비스 아이디어 <span className="text-xs font-medium text-gray-400">(선택사항)</span></h3><div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20"><textarea className="workspace-project-ai-idea w-full resize-none border-none bg-transparent p-4 text-sm! leading-5! font-medium text-gray-800 outline-none placeholder:text-gray-400" placeholder="예: 우리 동네 남는 식재료를 이웃과 나누는 플랫폼을 만들고 싶어. (빈칸으로 두셔도 AI가 트렌디한 주제를 추천합니다.)" rows={4} /></div></div>
      </div>
      <div className="workspace-project-ai-footer sticky bottom-0 bg-[#F4F5F7] pt-4 pb-2 text-center"><button className="workspace-project-ai-submit mx-auto flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-6 py-4 text-base font-extrabold text-white shadow-[0_10px_20px_-10px_rgba(0,196,113,0.5)] transition hover:bg-green-600 sm:w-2/3" onClick={onStart} type="button"><i className="fas fa-bolt" /> 이 설정으로 AI 설계 시작하기</button></div>
    </div>
  )
}

function StackButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return <button aria-pressed={active} className={`flex-1 rounded-lg border-2 py-2.5 text-sm! leading-5! transition ${active ? 'border-gray-900 bg-white font-extrabold text-gray-900 shadow-sm' : 'border-transparent font-bold text-gray-500 hover:text-gray-800'}`} onClick={onClick} type="button">{label}</button>
}

function ManualStackFields() {
  return <div className="workspace-project-ai-manual-fields grid grid-cols-1 gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:grid-cols-3"><StackSelect label="Frontend" options={['상관없음 (추천)', 'React', 'Vue.js', 'Next.js', 'Angular', 'Svelte / SvelteKit', 'Nuxt.js', 'Remix', 'Vanilla JavaScript']} /><StackSelect label="Backend" options={['상관없음 (추천)', 'Java / Spring Boot', 'Node.js / Express', 'Node.js / NestJS', 'Python / Django', 'Python / FastAPI', 'Kotlin / Spring Boot', 'PHP / Laravel', 'Go / Gin', 'Ruby on Rails', 'ASP.NET Core']} /><StackSelect label="Database" options={['상관없음 (추천)', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'MariaDB', 'SQLite', 'Oracle Database', 'Microsoft SQL Server', 'Amazon DynamoDB']} /></div>
}

function StackSelect({ label, options }: { label: string; options: string[] }) {
  return <div><label className="mb-1.5 block text-xs font-bold text-gray-500">{label}</label><select className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm! leading-5! font-medium outline-none focus:border-brand">{options.map((option) => <option key={option}>{option}</option>)}</select></div>
}

function AiLoading({ detailed }: { detailed: boolean }) {
  return <div className="workspace-project-modal-view flex flex-col items-center justify-center py-32"><div className="relative mb-8 flex h-24 w-24 items-center justify-center"><div className="workspace-project-modal-ai-pulse absolute inset-0 rounded-full bg-brand/20" /><div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-brand text-3xl text-white shadow-lg shadow-green-500/40"><i className="fas fa-brain animate-bounce" /></div></div><h2 className="mb-3 text-2xl font-black text-gray-900">{detailed ? 'DB 모델링 및 API 설계 중입니다...' : '요구사항을 분석 중입니다...'}</h2><p className="text-sm font-medium text-gray-500">{detailed ? '실무 면접에 대비할 수 있는 기술적 난제와 로드맵을 구성합니다.' : '입력하신 규모와 스택을 바탕으로 최적의 아키텍처를 탐색합니다.'}</p><div className="relative mt-8 h-1.5 w-64 overflow-hidden rounded-full bg-gray-200"><div className="workspace-project-modal-progress absolute top-0 left-0 h-1.5 rounded-full bg-brand" /></div></div>
}

function AiResult({ resultTab, onReset, onResultTabChange }: { resultTab: ResultTab; onReset: () => void; onResultTabChange: (tab: ResultTab) => void }) {
  return <div className="workspace-project-modal-view space-y-6 pb-10"><div className="mb-2 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end"><div><span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-brand px-2.5 py-1 text-[10px] font-black text-white shadow-sm"><i className="fas fa-check" /> 완벽한 포트폴리오 설계 완료</span><h1 className="text-2xl leading-tight font-black text-gray-900 sm:text-3xl"><span className="workspace-project-modal-gradient">독립 출판 콘텐츠 구독 플랫폼</span></h1><p className="mt-1 text-sm font-medium text-gray-500">단순한 토이 프로젝트가 아닌, 실무 면접에서 어필할 수 있는 구조입니다.</p></div><div className="flex w-full shrink-0 gap-2 sm:w-auto"><button className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm! leading-5! font-bold text-gray-700 shadow-sm transition hover:bg-gray-50 sm:flex-none" onClick={onReset} type="button"><i className="fas fa-redo-alt mr-1" /> 다시하기</button><button className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm! leading-5! font-bold text-white shadow-md transition hover:bg-black sm:flex-none" onClick={() => navigateTo('/squad-dashboard?ai=1')} type="button">워크스페이스 생성 <i className="fas fa-arrow-right" /></button></div></div><div className="workspace-project-modal-hide-scroll flex items-center gap-1 overflow-x-auto border-b border-gray-200 pb-px">{resultTabs.map((tab) => <button className={`shrink-0 px-4 py-3 text-sm! leading-5! ${resultTab === tab.id ? 'border-b-2 border-brand font-extrabold text-brand' : 'font-bold text-gray-500 transition hover:text-gray-900'}`} key={tab.id} onClick={() => onResultTabChange(tab.id)} type="button">{tab.label}</button>)}</div><ResultContent tab={resultTab} /></div>
}

function ResultContent({ tab }: { tab: ResultTab }) {
  if (tab === 'scenario') return <ScenarioResult />
  if (tab === 'arch') return <ArchitectureResult />
  if (tab === 'api') return <ApiResult />
  return <RoadmapResult />
}

function ResultCard({ children, icon, title }: { children: ReactNode; icon: string; title: string }) {
  return <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"><h3 className="mb-4 flex items-center gap-2 text-sm font-extrabold text-gray-900"><i className={`fas ${icon}`} /> {title}</h3>{children}</div>
}

function ScenarioResult() {
  const flows = [['작가', '는 이메일/비밀번호로 회원가입 및 로그인하여 대시보드로 이동합니다.'], ['작가', '는 새 시리즈를 생성(제목, 태그 입력)하고, 글 작성 후 발행 상태로 전환합니다.'], ['독자', '는 로그인 후 발행된 시리즈 목록을 태그로 필터링하여 탐색하고 관심 시리즈를 구독합니다.'], ['독자', '는 구독한 시리즈의 글을 순서대로 읽고 이전·다음 글로 이동합니다.']]
  const features = ['이메일·비밀번호 기반 회원가입 및 로그인 (역할 분리)', '시리즈 생성 및 발행 상태(초안/발행) 관리 로직', '글 순서 관리(orderIndex) 및 이전/다음 글 이동', '태그 필터링을 통한 탐색 및 시리즈 구독 기능', '구독자 수 집계 및 대시보드 통계 조회']
  return <div className="grid grid-cols-1 gap-6 lg:grid-cols-2"><ResultCard title="핵심 사용자 흐름 (User Flow)" icon="fa-route text-blue-500"><div className="space-y-4">{flows.map(([role, copy], index) => <div className="flex gap-3" key={copy}><div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${index < 2 ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-brand'}`}>{index + 1}</div><p className="text-sm leading-relaxed text-gray-600"><strong className="text-gray-900">{role}</strong>{copy}</p></div>)}</div></ResultCard><ResultCard title="MVP 검증 기능" icon="fa-star text-yellow-500"><ul className="space-y-2.5">{features.map((feature) => <li className="flex items-start gap-2 text-sm text-gray-600" key={feature}><i className="fas fa-check-circle mt-1 text-brand" /><span>{feature}</span></li>)}</ul></ResultCard></div>
}

function ArchitectureResult() {
  const schema = `erDiagram
    MEMBER {
        bigint memberId PK
        string email UK
        string encodedPassword
        string role "AUTHOR, READER"
    }
    SERIES {
        bigint seriesId PK
        bigint memberId FK
        string title
        string publishStatus "DRAFT, PUBLISHED"
    }
    ARTICLE {
        bigint articleId PK
        bigint seriesId FK
        int orderIndex
        string publishStatus
    }
    SUBSCRIPTION {
        bigint subscriptionId PK
        bigint memberId FK
        bigint seriesId FK
    }

    MEMBER ||--o{ SERIES : "creates"
    SERIES ||--o{ ARTICLE : "contains"
    MEMBER ||--o{ SUBSCRIPTION : "subscribes"
    SERIES ||--o{ SUBSCRIPTION : "is subscribed by"`
  return <div className="space-y-6"><div className="flex items-start gap-4 rounded-2xl border border-red-100 bg-red-50 p-5"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-lg text-red-500"><i className="fas fa-fire" /></div><div><h3 className="mb-1 text-sm font-extrabold text-red-900">핵심 기술적 난제 (포트폴리오 어필 포인트)</h3><p className="text-xs leading-relaxed text-red-700"><strong>Article 엔티티의 순서 관리.</strong> <code>orderIndex</code>를 정수 순번으로 관리할 경우 중간 삽입 시 전체 재정렬이 필요합니다. 특정 글 기준으로 이전·다음 글을 조회하는 쿼리를 <code>seriesId</code>와 <code>orderIndex</code> 조건으로 정확하게 설계해야 하며, 초급 수준에서는 명시적 재정렬 로직으로 구현하여 유지보수 명확성을 확보합니다.</p></div></div><div className="grid grid-cols-1 gap-4 md:grid-cols-2"><div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"><h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-gray-900"><i className="fas fa-laptop-code text-blue-500" /> Frontend</h3><TagList tags={['Thymeleaf', 'HTML/CSS/JS']} /></div><div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"><h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-gray-900"><i className="fas fa-server text-green-500" /> Backend & DB</h3><div className="flex flex-wrap gap-2"><span className="rounded-lg border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-bold text-green-700">Spring Boot</span><span className="rounded-lg border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-bold text-green-700">Spring Security</span><span className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">MySQL</span><span className="rounded-lg border border-gray-200 bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-700">Spring Data JPA</span></div></div></div><div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 p-4"><h3 className="text-sm font-extrabold text-gray-900">Database Schema (ERD)</h3></div><pre className="overflow-x-auto bg-[#111827] p-4 text-xs leading-relaxed text-gray-300">{schema}</pre></div></div>
}

function TagList({ tags }: { tags: string[] }) {
  return <div className="flex flex-wrap gap-2">{tags.map((tag) => <span className="rounded-lg border border-gray-200 bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-700" key={tag}>{tag}</span>)}</div>
}

function ApiResult() {
  const groups = [[['POST', '/api/members/signup', '이메일, 비밀번호, 역할을 받아 회원 생성'], ['POST', '/api/members/login', '인증 및 세션 생성']], [['GET', '/api/series', '발행 상태인 시리즈 목록 조회 (태그 필터링)'], ['POST', '/api/series', '작가가 새 시리즈 초안 생성']], [['GET', '/api/series/{seriesId}/articles/{articleId}', '특정 글 본문 및 이전/다음 글 정보 조회'], ['POST', '/api/subscriptions', '독자가 특정 시리즈 구독']]]
  return <div className="space-y-4">{groups.map((group, groupIndex) => <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm" key={groupIndex}>{group.map(([method, path, copy], index) => <div className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-center ${index === 0 ? 'border-b border-gray-100 bg-gray-50/50' : ''}`} key={`${method}-${path}`}><span className={`w-fit rounded px-2.5 py-1 text-xs font-extrabold ${method === 'GET' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>{method}</span><span className="font-mono text-sm font-bold text-gray-900">{path}</span><span className="text-xs font-medium text-gray-500 sm:ml-auto">{copy}</span></div>)}</div>)}</div>
}

function RoadmapResult() {
  const roadmap = [['1. 환경 설정 및 엔티티 구성', 'Spring Boot 초기화 및 Member, Series 등 JPA 매핑'], ['2. 인증/인가 구현', 'Spring Security 세션 로그인 및 역할(Role) 분기 적용'], ['3. 시리즈 및 글 관리 핵심 로직', 'orderIndex 재정렬 로직 구현 및 발행 상태 API 구성'], ['4. 통계 및 배포', '대시보드 구독자 수 N+1 문제 해결 후 Railway/Render 배포']]
  const questions = [['Q. Article의 orderIndex 중간 삽입 시 재정렬은 어떻게 했나요?', 'A. "명시적 업데이트 쿼리를 통해 타겟 인덱스 이상의 글들을 +1 처리하는 방식으로 정합성을 우선하여 구현했습니다."'], ['Q. N+1 문제는 어디서 발생했으며 어떻게 해결했나요?', 'A. "작가 대시보드에서 시리즈 목록과 구독자 수를 동시에 가져올 때 발생하여, Fetch Join(또는 Batch Size)을 활용해 최적화했습니다."'], ['Q. Security에서 작가와 독자 분기는 어떻게 처리했나요?', 'A. "회원가입 시 부여된 Role 기반으로 URL 접근 제어를 설정하고, @AuthenticationPrincipal을 활용했습니다."']]
  return <div className="grid grid-cols-1 gap-6 lg:grid-cols-2"><ResultCard title="개발 구현 로드맵" icon="fa-tasks text-purple-500"><div className="ml-3 space-y-6 border-l-2 border-gray-100">{roadmap.map(([title, copy], index) => <div className="relative pl-6" key={title}><div className={`absolute -left-[9px] top-0 h-4 w-4 rounded-full border-4 border-white ${index === 0 ? 'bg-purple-500' : 'bg-gray-300'}`} /><h4 className="text-sm font-bold text-gray-900">{title}</h4><p className="mt-1 text-xs text-gray-500">{copy}</p></div>)}</div></ResultCard><ResultCard title="실무 면접 예상 질문" icon="fa-user-tie text-blue-500"><div className="space-y-4">{questions.map(([question, answer]) => <div className="rounded-xl border border-gray-100 bg-gray-50 p-4" key={question}><p className="mb-1 text-sm font-bold text-gray-900">{question}</p><p className="text-xs text-gray-600">{answer}</p></div>)}</div></ResultCard></div>
}
