import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import SquadWorkspaceAside, { type SquadWorkspaceAsidePage } from '../../components/SquadWorkspaceAside'
import { showAuthToast } from '../../lib/auth-toast'
import { navigateTo } from '../../lib/spa-navigation'
import {
  aiApis,
  aiErdTables,
  aiFeatures,
  aiFiles,
  aiInterviewQuestions,
  aiRoadmap,
  aiSquadMembers,
  aiSquadProject,
  aiTasks,
  aiUserFlow,
  type AiApi,
  type AiTask,
  type AiTaskStatus,
} from './ai-squad-data'
import { loadMermaid } from './erd-support'

type AiRoute =
  | '/squad-dashboard'
  | '/squad-blueprint'
  | '/squad-workspace'
  | '/squad-review'
  | '/squad-erd'
  | '/squad-api'
  | '/squad-schedule'
  | '/squad-files'
  | '/squad-meeting'
  | '/squad-interview'
  | '/squad-settings'

const routePage: Record<AiRoute, SquadWorkspaceAsidePage> = {
  '/squad-dashboard': 'dashboard',
  '/squad-blueprint': 'blueprint',
  '/squad-workspace': 'workspace',
  '/squad-review': 'review',
  '/squad-erd': 'erd',
  '/squad-api': 'api',
  '/squad-schedule': 'schedule',
  '/squad-files': 'files',
  '/squad-meeting': 'meeting',
  '/squad-interview': 'interview',
  '/squad-settings': 'settings',
}

const routeTitle: Record<AiRoute, string> = {
  '/squad-dashboard': '스쿼드 대시보드',
  '/squad-blueprint': 'AI 설계서',
  '/squad-workspace': '작업 현황판',
  '/squad-review': '코드 피드백',
  '/squad-erd': 'ERD 설계',
  '/squad-api': 'API 명세서',
  '/squad-schedule': '일정 관리',
  '/squad-files': '팀 자료실',
  '/squad-meeting': '화상 회의',
  '/squad-interview': '면접 준비',
  '/squad-settings': '스쿼드 설정',
}

const statusMeta: Record<AiTaskStatus, { label: string; badge: string; dot: string }> = {
  todo: { label: '할 일', badge: 'border-gray-200 bg-gray-50 text-gray-500', dot: 'bg-gray-300' },
  progress: { label: '진행 중', badge: 'border-blue-200 bg-blue-50 text-blue-600', dot: 'bg-blue-500' },
  review: { label: '리뷰', badge: 'border-amber-200 bg-amber-50 text-amber-600', dot: 'bg-amber-500' },
  done: { label: '완료', badge: 'border-green-200 bg-green-50 text-green-600', dot: 'bg-brand' },
}

const tagMeta = {
  FE: 'border-blue-200 bg-blue-50 text-blue-600',
  BE: 'border-purple-200 bg-purple-50 text-purple-600',
  'UX/UI': 'border-pink-200 bg-pink-50 text-pink-600',
  DevOps: 'border-gray-300 bg-gray-100 text-gray-700',
}

type BlueprintTab = 'scenario' | 'arch' | 'api' | 'roadmap'

const blueprintTabs: BlueprintTab[] = ['scenario', 'arch', 'api', 'roadmap']
const blueprintInterviewQuestions = aiInterviewQuestions.filter((question) => question.id.startsWith('Q'))

function blueprintTabFromHash(): BlueprintTab {
  const hash = window.location.hash.slice(1)
  return blueprintTabs.includes(hash as BlueprintTab) ? hash as BlueprintTab : 'scenario'
}

function aiHref(path: AiRoute, hash = '') {
  return `${path}?ai=1${hash}`
}

function go(path: AiRoute, hash = '') {
  navigateTo(aiHref(path, hash))
}

function AiHeader() {
  const avatarSeeds = ['Felix', 'John', 'Sarah']

  return (
    <header className="relative z-30 flex h-16 shrink-0 items-center border-b border-gray-100 bg-white px-8 shadow-sm">
      <div className="flex min-w-0 flex-1 items-center gap-3 font-bold text-gray-800">
        <span className="flex shrink-0 items-center gap-1.5 rounded-md border border-green-100 bg-green-50 px-2.5 py-1 text-xs text-brand">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" /> 진행 중
        </span>
        <span className="truncate tracking-tight">{aiSquadProject.title}</span>
      </div>
      <div className="relative flex items-center gap-5">
        <div className="mr-4 hidden -space-x-2.5 border-r border-gray-200 pr-5 transition-all duration-300 hover:-space-x-1 md:flex">
          {aiSquadMembers.map((member, index) => (
            <img
              key={member.memberId}
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeeds[index]}`}
              alt={member.learnerName}
              className="h-8 w-8 rounded-full border-2 border-white bg-gray-100 shadow-sm transition-transform hover:z-10 hover:scale-110"
            />
          ))}
        </div>
        <button aria-label="스쿼드 알림" className="relative cursor-pointer p-1 text-gray-400 transition hover:text-brand" type="button"><i className="far fa-bell text-xl" /></button>
      </div>
    </header>
  )
}

function AiShell({ activePage, children, dark = false, showHeader = true }: { activePage: SquadWorkspaceAsidePage; children: ReactNode; dark?: boolean; showHeader?: boolean }) {
  return (
    <div className={`squad-dashboard-page ai-squad-workspace flex h-screen overflow-hidden font-['Pretendard',sans-serif] ${dark ? 'bg-[#111827] text-white' : 'bg-[#F8F9FA] text-gray-800'}`}>
      <SquadWorkspaceAside
        activePage={activePage}
        aiWorkspace
        workspaceId={null}
        projectName={aiSquadProject.squadName}
        reviewBadgeCount={1}
      />
      <div className={`flex h-screen min-w-0 flex-1 flex-col overflow-hidden ${dark ? 'bg-[#111827]' : 'bg-[#F8F9FA]'}`}>
        {dark || !showHeader ? null : <AiHeader />}
        {children}
      </div>
    </div>
  )
}

function PageHeading({ icon, title, copy, action }: { icon: string; title: string; copy: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex shrink-0 flex-col justify-between gap-4 border-b border-gray-100 bg-white px-8 py-5 lg:flex-row lg:items-center">
      <div><h1 className="flex items-center gap-2 text-2xl font-extrabold text-gray-900"><i className={`${icon} text-brand`} /> {title}</h1><div className="mt-1 text-sm text-gray-500">{copy}</div></div>
      {action}
    </div>
  )
}

function AiChip({ children }: { children: ReactNode }) {
  return <span className="inline-flex items-center gap-1 rounded-full border border-purple-100 bg-purple-50 px-2 py-1 text-[10px] font-black text-purple-600"><i className="fas fa-magic" />{children}</span>
}

function AiMemberAvatar({ name, className = '' }: { name: string; className?: string }) {
  const seed = name === '이태형' ? 'Felix' : name === '김개발' ? 'John' : 'Sarah'
  return <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`} alt={name} className={`rounded-full ${className}`} />
}

function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-gray-100 bg-white shadow-sm ${className}`}>{children}</section>
}

function DashboardPage() {
  const counts = Object.fromEntries((['todo', 'progress', 'review', 'done'] as AiTaskStatus[]).map((status) => [status, aiTasks.filter((task) => task.status === status).length]))
  return (
    <main className="custom-scrollbar flex-1 overflow-y-auto p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <Card className="relative flex flex-col items-start justify-between gap-6 overflow-hidden p-8 md:flex-row md:items-center">
          <div className="pointer-events-none absolute top-0 right-0 h-64 w-64 translate-x-1/2 -translate-y-1/2 rounded-full bg-brand opacity-[0.03] blur-3xl" />
          <div><p className="mb-1 flex items-center gap-2 text-sm font-bold text-gray-500">Phase 2 · 인증/인가 구현 진행 중 <AiChip>AI 로드맵</AiChip></p><h2 className="text-2xl font-extrabold tracking-tight text-gray-900">반갑습니다, 이태형님! 👋</h2><p className="mt-2 text-sm font-medium text-gray-600">전체 14개 작업 중 <strong className="text-brand">3개 완료 (21%)</strong> · 이번 Phase 마감 02.24</p></div>
          <div className="z-10 flex w-full gap-3 md:w-auto"><button onClick={() => go('/squad-workspace')} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-bold text-gray-700 shadow-sm transition hover:border-brand hover:text-brand md:flex-none" type="button"><i className="fas fa-columns" /> 내 작업 현황판</button><button onClick={() => go('/squad-meeting')} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gray-900 px-6 py-3 text-sm font-bold text-white shadow-lg md:flex-none" type="button"><i className="fas fa-video" /> 회의실 입장</button></div>
        </Card>

        <Card className="relative overflow-hidden border-green-200 bg-[linear-gradient(135deg,#F0FDF4_0%,#F0FDFA_100%)] p-7">
          <i className="fas fa-magic pointer-events-none absolute -right-6 -bottom-8 text-[140px] text-brand/5" />
          <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
            <div><div className="mb-2 flex items-center gap-2"><AiChip>AI 포트폴리오 설계서</AiChip><span className="rounded-full border border-gray-200 bg-white px-2 py-1 text-[10px] font-bold text-gray-500">{aiSquadProject.difficulty}</span></div><h3 className="bg-gradient-to-r from-brand to-teal-600 bg-clip-text text-xl font-black tracking-tight text-transparent">{aiSquadProject.title}</h3><p className="mt-1 text-sm font-medium text-gray-600">{aiSquadProject.oneLiner}</p><div className="mt-3 flex flex-wrap gap-1.5">{[...aiSquadProject.stack.frontend, ...aiSquadProject.stack.backend, ...aiSquadProject.stack.database].map((stack) => <span key={stack} className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-[10px] font-bold text-gray-600">{stack}</span>)}</div></div>
            <button onClick={() => go('/squad-blueprint')} className="flex w-fit shrink-0 items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-bold text-white shadow-md" type="button"><i className="fas fa-book-open" /> AI 설계서 전체 보기</button>
          </div>
          <div className="relative mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">{[['fa-route','기획 & 시나리오','MVP 기능 5개'],['fa-database','아키텍처 & DB','4개 테이블'],['fa-plug','API 명세서','9개 엔드포인트'],['fa-user-tie','로드맵 & 면접','4단계 · 5문항']].map(([icon,title,copy]) => <div key={title} className="rounded-xl border border-white bg-white/80 p-3"><p className="text-xs font-extrabold text-gray-900"><i className={`fas ${icon} mr-1.5 text-brand`} />{title}</p><p className="mt-1 text-[10px] font-bold text-gray-400">{copy}</p></div>)}</div>
        </Card>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-8">
            <Card className="p-7"><div className="mb-6 flex items-center justify-between"><h3 className="flex items-center gap-2 text-lg font-extrabold text-gray-900"><i className="fas fa-tasks text-brand" /> 팀 작업 현황 <AiChip>로드맵 자동 생성</AiChip></h3><button onClick={() => go('/squad-workspace')} className="text-xs font-bold text-gray-400 hover:text-brand" type="button">전체보기 <i className="fas fa-chevron-right ml-1" /></button></div><div className="grid grid-cols-2 gap-6 md:grid-cols-4">{(['todo','progress','review','done'] as AiTaskStatus[]).map((status) => <div key={status}><p className="text-[11px] font-bold text-gray-400">{statusMeta[status].label}</p><div className="mt-1 flex items-end gap-2"><strong className="text-3xl font-black text-gray-900">{counts[status]}</strong><span className={`mb-1.5 h-2 w-2 rounded-full ${statusMeta[status].dot}`} /></div></div>)}</div></Card>
            <Card className="p-7"><div className="mb-5 flex items-center justify-between"><h3 className="flex items-center gap-2 text-lg font-extrabold text-gray-900"><i className="fas fa-star text-yellow-500" /> MVP 검증 기능 진행률</h3><AiChip>기획 & 시나리오</AiChip></div><div className="space-y-4">{aiFeatures.map((feature) => <div key={feature.id}><div className="mb-1.5 flex items-center justify-between text-xs"><span className="font-bold text-gray-700">{feature.id}. {feature.title}</span><span className="font-black text-brand">{feature.progress}%</span></div><div className="h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-brand" style={{ width: `${feature.progress}%` }} /></div></div>)}</div></Card>
            <Card className="p-7"><h3 className="mb-6 flex items-center gap-2 text-lg font-extrabold text-gray-900"><i className="fas fa-history text-gray-400" /> 최근 팀 활동</h3><div className="space-y-4">{[['fa-code-branch','김개발님이 리뷰 요청을 올렸습니다.','feat: Spring Security 세션 로그인 및 Role 기반 접근 제어','1시간 전'],['fa-check','Phase 1 마일스톤 달성 🎉','환경 설정 및 엔티티 구성 단계 작업 3개가 완료되었습니다.','6일 전'],['fa-magic','AI 설계서로 워크스페이스가 생성되었습니다.',aiSquadProject.oneLiner,'02.09']].map(([icon,title,copy,time]) => <div key={title} className="flex gap-4"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-white bg-green-50 text-brand shadow-sm"><i className={`fas ${icon}`} /></div><div className="flex-1 rounded-2xl border border-gray-100 bg-gray-50 p-4"><div className="flex justify-between gap-3"><p className="text-sm font-bold text-gray-900">{title}</p><span className="text-[10px] font-bold text-gray-400">{time}</span></div><p className="mt-1 text-xs text-gray-500">{copy}</p></div></div>)}</div></Card>
          </div>
          <div className="space-y-6 lg:col-span-4">
            <Card className="p-7"><div className="mb-5 flex items-center justify-between border-b border-gray-100 pb-3"><h3 className="flex items-center gap-2 text-lg font-extrabold text-gray-900"><i className="fas fa-route text-purple-500" /> 개발 로드맵</h3><AiChip>AI</AiChip></div><div className="ml-2 space-y-5 border-l-2 border-gray-100">{aiRoadmap.map((item, index) => <div key={item.phase} className="relative pl-5"><span className={`absolute -left-[7px] top-1 h-3 w-3 rounded-full border-2 border-white ${index < 2 ? 'bg-brand' : 'bg-gray-300'}`} /><div className="flex justify-between gap-2"><p className="text-xs font-extrabold text-gray-900">Phase {item.phase}. {item.title}</p><span className="text-[9px] font-bold text-gray-400">{item.period}</span></div><p className="mt-1 text-[10px] leading-relaxed text-gray-500">{item.desc}</p></div>)}</div></Card>
            <Card className="p-7"><h3 className="mb-4 flex items-center gap-2 border-b border-gray-100 pb-3 text-lg font-extrabold text-gray-900"><i className="fas fa-clock text-orange-500" /> 마감 임박 작업</h3>{aiTasks.filter((task) => task.urgent).map((task) => <div key={task.id} className="mb-3 rounded-xl border border-red-100 bg-red-50 p-3"><p className="text-[10px] font-black text-red-500">{task.id} · {task.due} 마감</p><p className="mt-1 text-xs font-bold text-gray-800">{task.title}</p></div>)}</Card>
            <Card className="p-7"><h3 className="mb-4 flex items-center gap-2 border-b border-gray-100 pb-3 text-lg font-extrabold text-gray-900"><i className="fas fa-bullhorn text-brand" /> 팀 공지사항</h3><div className="rounded-xl border border-brand/20 bg-brand/5 p-4"><span className="rounded bg-red-500 px-1.5 py-0.5 text-[9px] font-extrabold text-white">필독</span><p className="mt-2 text-sm font-extrabold text-gray-900">핵심 난제 설계 방식 결정 필요</p><p className="mt-1 text-xs leading-relaxed text-gray-600">Phase 3 시작 전 orderIndex 재정렬 방식을 회의에서 확정합니다.</p></div></Card>
          </div>
        </div>
      </div>
    </main>
  )
}

function BlueprintPage() {
  const tabBarRef = useRef<HTMLDivElement>(null)
  const [tab, setTab] = useState<BlueprintTab>(blueprintTabFromHash)

  useEffect(() => {
    const selectFromHash = () => setTab(blueprintTabFromHash())
    window.addEventListener('hashchange', selectFromHash)
    if (window.location.hash) {
      tabBarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    return () => window.removeEventListener('hashchange', selectFromHash)
  }, [])

  const selectTab = (nextTab: BlueprintTab, scroll = false) => {
    setTab(nextTab)
    window.history.replaceState(null, '', `#${nextTab}`)
    if (scroll) {
      tabBarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const destinations = [
    { tab: 'scenario' as const, icon: 'fa-route', title: '기획 & 시나리오', links: [['/squad-dashboard','fa-chart-pie','대시보드','MVP 기능 5개 진행률'],['/squad-workspace','fa-columns','작업 현황판','작업 14개 (완료 3)']] },
    { tab: 'arch' as const, icon: 'fa-database', title: '아키텍처 & DB', links: [['/squad-erd','fa-project-diagram','ERD 설계','초기 스키마 4개 테이블'],['/squad-settings','fa-cog','스쿼드 설정','기술 스택 · 프로젝트 정보']] },
    { tab: 'api' as const, icon: 'fa-plug', title: 'API 명세서', links: [['/squad-api','fa-plug','API 명세서','9개 · 완료 0'],['/squad-review','fa-code-branch','코드 피드백','PR ↔ 엔드포인트 연결']] },
    { tab: 'roadmap' as const, icon: 'fa-user-tie', title: '로드맵 & 면접', links: [['/squad-schedule','fa-calendar-alt','일정 관리','Phase 4단계 마일스톤'],['/squad-interview','fa-user-tie','면접 준비',`예상 질문 ${blueprintInterviewQuestions.length}개`],['/squad-meeting','fa-video','화상 회의','회의 안건 자동 구성']] },
  ] satisfies Array<{ tab: BlueprintTab; icon: string; title: string; links: Array<[AiRoute, string, string, string]> }>
  return <main className="custom-scrollbar flex-1 overflow-y-auto p-8"><div className="mx-auto max-w-6xl space-y-6">
    <section className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-8 shadow-sm"><div className="pointer-events-none absolute top-0 right-0 h-72 w-72 translate-x-1/3 -translate-y-1/3 rounded-full bg-brand opacity-[0.05] blur-3xl" /><div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end"><div className="min-w-0"><div className="mb-3 flex flex-wrap items-center gap-2"><span className="inline-flex items-center gap-1.5 rounded-full bg-brand px-2.5 py-1 text-[10px] font-black text-white"><i className="fas fa-check" /> AI 포트폴리오 설계서</span><span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-1 text-[10px] font-extrabold text-gray-600">{aiSquadProject.difficulty}</span><span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-1 text-[10px] font-extrabold text-gray-600">⚙️ 직접 설정 스택</span><span className="text-[10px] font-bold text-gray-400">2026-02-09 생성</span></div><h1 className="bg-[linear-gradient(135deg,#00C471_0%,#0D9488_100%)] bg-clip-text text-3xl leading-tight font-black tracking-tight text-transparent">{aiSquadProject.title}</h1><p className="mt-2 text-sm font-medium text-gray-600">{aiSquadProject.oneLiner}</p><p className="mt-1 text-xs font-medium text-gray-400">{aiSquadProject.summary}</p></div><div className="flex shrink-0 gap-2"><button onClick={() => window.print()} className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 shadow-sm" type="button"><i className="fas fa-file-pdf mr-1" /> PDF 저장</button><button onClick={() => go('/squad-settings')} className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-bold text-white shadow-md" type="button"><i className="fas fa-sliders-h mr-1" /> 생성 조건</button></div></div></section>
    <Card className="p-7"><div className="mb-5"><h2 className="flex items-center gap-2 text-lg font-extrabold text-gray-900"><i className="fas fa-sitemap text-brand" /> 워크스페이스 반영 맵</h2><p className="mt-1 text-xs text-gray-500">설계서의 각 섹션이 어느 메뉴에 배치되었는지 보여줍니다. 카드를 눌러 바로 이동하세요.</p></div><div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">{destinations.map((group) => <div key={group.tab} className="flex flex-col rounded-2xl border border-gray-100 bg-gray-50/60 p-4"><button onClick={() => selectTab(group.tab, true)} className="mb-3 flex items-center gap-2.5 text-left" type="button"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-brand shadow-sm"><i className={`fas ${group.icon}`} /></div><div><p className="text-sm font-extrabold text-gray-900">{group.title}</p><p className="text-[10px] font-bold text-gray-400">설계서 섹션 보기 ↓</p></div></button><div className="space-y-2">{group.links.map(([path,icon,title,copy]) => <button key={path} onClick={() => go(path)} className="flex w-full items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-left transition hover:border-brand/30" type="button"><i className={`fas ${icon} w-4 text-center text-xs text-gray-400`} /><div className="min-w-0 flex-1"><p className="text-xs font-bold text-gray-800">{title}</p><p className="truncate text-[10px] text-gray-500">{copy}</p></div><i className="fas fa-arrow-right text-[9px] text-gray-300" /></button>)}</div></div>)}</div></Card>
    <Card className="overflow-hidden"><div ref={tabBarRef} className="flex items-center gap-1 overflow-x-auto border-b border-gray-200 px-4">{([['scenario','기획 & 시나리오'],['arch','아키텍처 & DB'],['api','API 명세서'],['roadmap','개발 로드맵 & 면접']] as const).map(([key,label]) => <button key={key} onClick={() => selectTab(key)} className={`shrink-0 border-b-2 px-4 py-4 text-sm font-bold ${tab === key ? 'border-brand text-brand' : 'border-transparent text-gray-500'}`} type="button">{label}</button>)}</div><div key={tab} className="ai-blueprint-tab-panel bg-[#FAFBFC] p-7">{tab === 'scenario' ? <ScenarioBlueprint /> : tab === 'arch' ? <ArchitectureBlueprint /> : tab === 'api' ? <ApiBlueprint /> : <RoadmapBlueprint />}</div></Card>
  </div></main>
}

const blueprintErdCode = `erDiagram
    MEMBER {
        bigint memberId PK
        varchar email UK
        varchar encodedPassword
        varchar role "AUTHOR, READER"
    }
    SERIES {
        bigint seriesId PK
        bigint memberId FK
        varchar title
        varchar publishStatus "DRAFT, PUBLISHED"
    }
    ARTICLE {
        bigint articleId PK
        bigint seriesId FK
        int orderIndex "핵심 난제"
        varchar publishStatus
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

function methodClass(method: AiApi['method']) {
  if (method === 'GET') return 'bg-green-100 text-green-700'
  if (method === 'POST') return 'bg-blue-100 text-blue-700'
  return 'bg-amber-100 text-amber-700'
}

function BlueprintLink({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return <button onClick={onClick} className="inline-flex items-center gap-1.5 rounded-lg border border-teal-100 bg-teal-50 px-2.5 py-1 text-[11px] font-bold text-teal-700 transition hover:bg-teal-100" type="button"><i className="fas fa-share" />{children}</button>
}

function BlueprintAiChip({ children }: { children: ReactNode }) {
  return <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-teal-200 bg-[linear-gradient(135deg,#ECFDF5,#F0FDFA)] px-[7px] py-0.5 text-[10px] leading-[1.4] font-extrabold text-teal-600"><i className="fas fa-magic text-[9px]" />{children}</span>
}

function TeamChip({ children }: { children: ReactNode }) {
  return <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-blue-200 bg-blue-50 px-[7px] py-0.5 text-[10px] font-extrabold text-blue-600"><i className="fas fa-user-edit text-[9px]" />{children}</span>
}

function BlueprintErdDiagram() {
  const [svg, setSvg] = useState('')

  useEffect(() => {
    let ignore = false
    void loadMermaid().then((mermaid) => mermaid.render(`blueprint-erd-${Date.now()}`, blueprintErdCode)).then(({ svg: renderedSvg }) => {
      if (!ignore) setSvg(renderedSvg)
    })
    return () => {
      ignore = true
    }
  }, [])

  return <div className="w-full [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full" dangerouslySetInnerHTML={{ __html: svg }} />
}

function ScenarioBlueprint() {
  const actors = [
    { name: '작가', key: 'AUTHOR', desc: '시리즈를 만들고 글을 연재·발행합니다.' },
    { name: '독자', key: 'READER', desc: '태그로 시리즈를 탐색하고 구독하여 순서대로 읽습니다.' },
  ]
  const featureLinks: Record<string, { tasks: string[]; apis: string[] }> = {
    F1: { tasks: ['DP-04', 'DP-05', 'DP-06', 'DP-07'], apis: ['A1', 'A2'] },
    F2: { tasks: ['DP-08'], apis: ['A4', 'A5', 'A6'] },
    F3: { tasks: ['DP-09', 'DP-10'], apis: ['A7'] },
    F4: { tasks: ['DP-11', 'DP-12'], apis: ['A3', 'A8'] },
    F5: { tasks: ['DP-13'], apis: ['A9'] },
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card className="border-gray-200 p-6">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-extrabold text-gray-900"><i className="fas fa-route text-blue-500" /> 핵심 사용자 흐름 (User Flow)</h3>
        <div className="mb-5 flex gap-2">
          {actors.map((actor) => <div key={actor.key} className="flex-1 rounded-xl border border-gray-100 bg-gray-50 p-3"><p className="text-xs font-extrabold text-gray-900">{actor.name} <span className="font-mono text-[10px] text-gray-400">{actor.key}</span></p><p className="mt-0.5 text-[11px] text-gray-500">{actor.desc}</p></div>)}
        </div>
        <div className="space-y-4">
          {aiUserFlow.map(([actor, text], index) => <div key={text} className="flex gap-3"><span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${actor === '독자' ? 'bg-green-50 text-brand' : 'bg-blue-50 text-blue-600'}`}>{index + 1}</span><p className="text-sm leading-relaxed text-gray-600"><strong className="text-gray-900">{actor}</strong>는 {text}</p></div>)}
        </div>
      </Card>
      <Card className="border-gray-200 p-6">
        <div className="mb-4 flex items-center justify-between gap-3"><h3 className="flex items-center gap-2 text-sm font-extrabold text-gray-900"><i className="fas fa-star text-yellow-500" /> MVP 검증 기능</h3><BlueprintLink onClick={() => go('/squad-dashboard')}>대시보드 진행률</BlueprintLink></div>
        <ul>
          {aiFeatures.map((feature) => {
            const links = featureLinks[feature.id]
            return <li key={feature.id} className="flex items-start gap-2.5 border-b border-gray-50 py-2.5 last:border-0"><i className={`fas ${feature.progress >= 100 ? 'fa-check-circle text-brand' : feature.progress > 0 ? 'fa-spinner text-blue-500' : 'fa-circle text-gray-300'} mt-1`} /><div className="min-w-0 flex-1"><p className="text-sm font-medium text-gray-700">{feature.title}</p><div className="mt-1.5 flex flex-wrap gap-1">{links.tasks.map((id) => { const task = aiTasks.find((item) => item.id === id)!; return <button key={id} onClick={() => go('/squad-workspace')} className={`rounded border px-1.5 py-0.5 text-[9px] font-bold ${statusMeta[task.status].badge}`} type="button">#{id}</button> })}{links.apis.map((id) => { const api = aiApis.find((item) => item.id === id)!; return <button key={id} onClick={() => go('/squad-api', `#${id}`)} className={`rounded px-1.5 py-0.5 font-mono text-[9px] font-bold ${methodClass(api.method)}`} type="button">{api.method}{api.path}</button> })}</div></div><span className="shrink-0 text-xs font-black text-gray-400">{feature.progress}%</span></li>
          })}
        </ul>
      </Card>
    </div>
  )
}

function ArchitectureBlueprint() {
  const stacks = [
    ['Frontend', 'fa-laptop-code text-blue-500', aiSquadProject.stack.frontend, 'border-gray-200 bg-gray-100 text-gray-700'],
    ['Backend', 'fa-server text-green-500', aiSquadProject.stack.backend, 'border-green-200 bg-green-50 text-green-700'],
    ['Database', 'fa-database text-blue-600', aiSquadProject.stack.database, 'border-blue-200 bg-blue-50 text-blue-700'],
    ['Deploy', 'fa-cloud-upload-alt text-purple-500', aiSquadProject.stack.deploy, 'border-purple-200 bg-purple-50 text-purple-700'],
  ] as const

  return <div className="space-y-6"><div className="flex items-start gap-4 rounded-2xl border border-red-100 bg-red-50 p-5"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-lg text-red-500"><i className="fas fa-fire" /></div><div className="flex-1"><h3 className="mb-1 text-sm font-extrabold text-red-900">핵심 기술적 난제 (포트폴리오 어필 포인트) · Article 엔티티의 순서 관리</h3><p className="text-xs leading-relaxed text-red-700">orderIndex를 정수 순번으로 관리할 경우 중간 삽입 시 전체 재정렬이 필요합니다. 특정 글 기준으로 이전·다음 글을 조회하는 쿼리를 seriesId와 orderIndex 조건으로 정확하게 설계해야 하며, 초급 수준에서는 명시적 재정렬 로직으로 구현하여 유지보수 명확성을 확보합니다.</p><div className="mt-3 flex flex-wrap items-center gap-1.5">{['DP-09', 'DP-10'].map((id) => <button key={id} onClick={() => go('/squad-workspace')} className="rounded border border-red-200 bg-white px-2 py-0.5 text-[10px] font-bold text-red-600" type="button">#{id}{aiTasks.find((task) => task.id === id)?.title}</button>)}<button onClick={() => go('/squad-interview', '#Q1')} className="rounded border border-purple-200 bg-white px-2 py-0.5 text-[10px] font-bold text-purple-600" type="button">면접 Q1</button></div></div></div><div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">{stacks.map(([label, icon, values, cls]) => <Card key={label} className="border-gray-200 p-5"><h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-gray-900"><i className={`fas ${icon}`} /> {label}</h3><div className="flex flex-wrap gap-2">{values.map((value) => <span key={value} className={`rounded-lg border px-2.5 py-1 text-xs font-bold ${cls}`}>{value}</span>)}</div></Card>)}</div><Card className="overflow-hidden border-gray-200"><div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 p-4"><h3 className="text-sm font-extrabold text-gray-900">Database Schema (ERD)</h3><BlueprintLink onClick={() => go('/squad-erd')}>ERD 설계에서 편집</BlueprintLink></div><div className="grid grid-cols-1 lg:grid-cols-2"><div className="flex min-h-[280px] items-center justify-center border-b border-gray-100 bg-white p-6 lg:border-r lg:border-b-0"><BlueprintErdDiagram /></div><div className="overflow-x-auto bg-[#111827] p-4"><pre className="font-mono text-xs leading-relaxed text-gray-300">{blueprintErdCode}</pre></div></div></Card></div>
}

function ApiBlueprint() {
  const aiCount = aiApis.filter((api) => api.source === 'ai').length
  const teamCount = aiApis.length - aiCount
  return <div className="space-y-4"><div className="flex items-center justify-between"><p className="flex items-center gap-1 text-xs text-gray-500"><BlueprintAiChip>AI 원본</BlueprintAiChip> {aiCount}개 · <TeamChip>팀 보강</TeamChip> {teamCount}개 (MVP 기능 커버용)</p><BlueprintLink onClick={() => go('/squad-api')}>API 명세서에서 상세 보기</BlueprintLink></div><Card className="divide-y divide-gray-100 overflow-hidden border-gray-200">{aiApis.map((api) => <button key={api.id} onClick={() => go('/squad-api', `#${api.id}`)} className="flex w-full flex-col gap-2 p-4 text-left transition hover:bg-gray-50 sm:flex-row sm:items-center sm:gap-3" type="button"><span className={`w-16 shrink-0 rounded px-2.5 py-1 text-center text-xs font-extrabold ${methodClass(api.method)}`}>{api.method}</span><code className="truncate text-sm font-bold text-gray-900">{api.path}</code>{api.source === 'ai' ? <BlueprintAiChip>AI</BlueprintAiChip> : <TeamChip>팀 보강</TeamChip>}<span className="text-xs font-medium text-gray-500 sm:ml-auto">{api.desc}</span><span className={`rounded border px-2 py-0.5 text-[10px] font-bold ${statusMeta[api.status].badge}`}>{api.status === 'review' ? '리뷰 대기' : statusMeta[api.status].label}</span></button>)}</Card></div>
}

function RoadmapBlueprint() {
  const phaseTaskRanges = [[1, 3], [4, 7], [8, 12], [13, 14]] as const

  return <div className="grid grid-cols-1 gap-6 lg:grid-cols-2"><Card className="border-gray-200 p-6"><div className="mb-4 flex items-center justify-between gap-3"><h3 className="flex items-center gap-2 text-sm font-extrabold text-gray-900"><i className="fas fa-tasks text-purple-500" />개발 구현 로드맵</h3><BlueprintLink onClick={() => go('/squad-schedule')}>일정 관리</BlueprintLink></div><div className="relative ml-3 space-y-6 border-l-2 border-gray-100">{aiRoadmap.map((item, index) => {
    const [start, end] = phaseTaskRanges[index]
    const tasks = aiTasks.filter((task) => {
      const taskNumber = Number(task.id.slice(3))
      return taskNumber >= start && taskNumber <= end
    })
    const doneCount = tasks.filter((task) => task.status === 'done').length
    const phaseStatus = index === 0 ? 'done' : index === 1 ? 'current' : 'planned'
    const dotClass = phaseStatus === 'done' ? 'bg-brand' : phaseStatus === 'current' ? 'bg-purple-500' : 'bg-gray-300'
    const progress = Math.round(doneCount / tasks.length * 100)

    return <div key={item.phase} className="relative pl-6"><span className={`absolute -left-[9px] top-0 h-4 w-4 rounded-full border-4 border-white ${dotClass}`} /><div className="flex items-center gap-2"><h4 className="text-sm font-bold text-gray-900">{item.phase}. {item.title}</h4>{phaseStatus === 'done' ? <span className="text-[10px] font-extrabold text-brand">완료</span> : phaseStatus === 'current' ? <span className="rounded bg-purple-500 px-1.5 py-0.5 text-[10px] font-extrabold text-white">진행 중</span> : <span className="text-[10px] font-bold text-gray-400">예정</span>}</div><p className="mt-1 text-xs text-gray-500">{item.desc}</p><p className="mt-1 text-[10px] font-bold text-gray-400">{item.period} · 작업 {doneCount}/{tasks.length}</p><div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-gray-100"><div className={`h-1 ${dotClass}`} style={{ width: `${progress}%` }} /></div></div>
  })}</div></Card><Card className="border-gray-200 p-6"><div className="mb-4 flex items-center justify-between gap-3"><h3 className="flex items-center gap-2 text-sm font-extrabold text-gray-900"><i className="fas fa-user-tie text-blue-500" />실무 면접 예상 질문</h3><BlueprintLink onClick={() => go('/squad-interview')}>면접 연습하기</BlueprintLink></div><div className="space-y-4">{blueprintInterviewQuestions.map((question) => <button key={question.id} onClick={() => go('/squad-interview', `#${question.id}`)} className="block w-full rounded-xl border border-gray-100 bg-gray-50 p-4 text-left transition hover:border-purple-200 hover:bg-purple-50/50" type="button"><p className="mb-1 text-sm font-bold text-gray-900">Q. {question.question}</p><p className="text-xs text-gray-600">A. &quot;{question.answer}&quot;</p></button>)}</div></Card></div>
}

type LocalTaskForm = {
  title: string
  tag: AiTask['tag']
  assignee: string
  urgent: boolean
  due: string
  description: string
}

const emptyTaskForm: LocalTaskForm = {
  title: '',
  tag: 'FE',
  assignee: '',
  urgent: false,
  due: '',
  description: '',
}

function WorkspacePage() {
  const columns: AiTaskStatus[] = ['todo', 'progress', 'review', 'done']
  const [tasks, setTasks] = useState<AiTask[]>(aiTasks)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<LocalTaskForm>(emptyTaskForm)

  function closeModal() {
    setModalOpen(false)
    setForm(emptyTaskForm)
  }

  function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const title = form.title.trim()
    if (!title) return
    const id = `DP-${String(tasks.length + 1).padStart(2, '0')}`
    setTasks((current) => [...current, {
      id,
      title,
      tag: form.tag,
      assignee: form.assignee || '미지정',
      status: 'todo',
      due: form.due || '미정',
      urgent: form.urgent,
    }])
    closeModal()
    showAuthToast({ message: `${id} 작업이 추가되었습니다.`, durationMs: 1800 })
  }

  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      <PageHeading
        icon="fas fa-columns"
        title="팀 작업 현황판"
        copy={<span>AI 로드맵에서 생성된 작업을 스프린트 상태별로 관리합니다. <AiChip>{tasks.length}개 작업</AiChip></span>}
        action={<button onClick={() => setModalOpen(true)} className="rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-bold text-white shadow-lg" type="button"><i className="fas fa-plus mr-2" />새 작업</button>}
      />
      <div className="custom-scrollbar flex flex-1 gap-5 overflow-x-auto p-6">
        {columns.map((status) => {
          const columnTasks = tasks.filter((task) => task.status === status)
          return <section key={status} className="flex w-[300px] shrink-0 flex-col rounded-2xl bg-gray-100/80 p-3"><div className="mb-3 flex items-center justify-between px-1"><h2 className="text-sm font-extrabold text-gray-800"><span className={`mr-2 inline-block h-2 w-2 rounded-full ${statusMeta[status].dot}`} />{statusMeta[status].label}</h2><span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-gray-500">{columnTasks.length}</span></div><div className="custom-scrollbar space-y-3 overflow-y-auto">{columnTasks.map((task) => <TaskCard key={task.id} task={task} />)}</div></section>
        })}
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
          <form role="dialog" aria-labelledby="task-modal-title" onSubmit={addTask} className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-gray-50 p-6">
              <h3 id="task-modal-title" className="flex items-center gap-2 text-lg font-extrabold text-gray-900"><i className="fas fa-ticket-alt text-brand" />새 작업 추가</h3>
              <button aria-label="새 작업 닫기" onClick={closeModal} className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 shadow-sm transition hover:text-gray-900" type="button"><i className="fas fa-times" /></button>
            </div>
            <div className="custom-scrollbar space-y-5 overflow-y-auto p-6">
              <label className="block"><span className="mb-2 block text-xs font-bold text-gray-700">작업 제목 <span className="text-red-500">*</span></span><input aria-label="작업 제목" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-bold shadow-sm outline-none transition focus:border-brand" placeholder="무엇을 작업하시나요?" /></label>
              <div className="grid grid-cols-2 gap-4">
                <label className="block"><span className="mb-2 block text-xs font-bold text-gray-700">담당 직군 (태그)</span><select aria-label="담당 직군" value={form.tag} onChange={(event) => setForm((current) => ({ ...current, tag: event.target.value as AiTask['tag'] }))} className="w-full cursor-pointer rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium shadow-sm outline-none focus:border-brand"><option value="FE">프론트엔드 (FE)</option><option value="BE">백엔드 (BE)</option><option value="UX/UI">디자인 (UX/UI)</option><option value="DevOps">인프라 (DevOps)</option></select></label>
                <label className="block"><span className="mb-2 block text-xs font-bold text-gray-700">담당자 배정</span><select aria-label="담당자 배정" value={form.assignee} onChange={(event) => setForm((current) => ({ ...current, assignee: event.target.value }))} className="w-full cursor-pointer rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium shadow-sm outline-none focus:border-brand"><option value="">미지정</option>{aiSquadMembers.map((member) => <option key={member.memberId} value={member.learnerName}>{member.learnerName}</option>)}</select></label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><span className="mb-2 block text-xs font-bold text-gray-700">우선순위</span><div className="flex items-center gap-4 rounded-xl border border-gray-100 bg-gray-50 p-3.5"><label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-gray-700"><input type="radio" name="urgency" checked={!form.urgent} onChange={() => setForm((current) => ({ ...current, urgent: false }))} className="h-4 w-4 accent-brand" />보통</label><label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-red-500"><input type="radio" name="urgency" checked={form.urgent} onChange={() => setForm((current) => ({ ...current, urgent: true }))} className="h-4 w-4 accent-red-500" />🔥 긴급</label></div></div>
                <label className="block"><span className="mb-2 block text-xs font-bold text-gray-700">마감 기한 (D-Day)</span><input aria-label="마감 기한" type="date" value={form.due} onChange={(event) => setForm((current) => ({ ...current, due: event.target.value }))} className="w-full cursor-pointer rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-700 shadow-sm outline-none focus:border-brand" /></label>
              </div>
              <label className="block"><span className="mb-2 block text-xs font-bold text-gray-700">상세 설명 <span className="font-normal text-gray-400">(선택)</span></span><textarea aria-label="상세 설명" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} className="h-24 w-full resize-none rounded-xl border border-gray-200 p-4 text-sm shadow-sm outline-none transition focus:border-brand" placeholder="작업에 필요한 세부 사항이나 참고 링크를 남겨주세요." /></label>
            </div>
            <div className="flex shrink-0 justify-end gap-2 border-t border-gray-100 bg-gray-50 p-5"><button onClick={closeModal} className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-600 shadow-sm hover:bg-gray-50" type="button">취소</button><button disabled={!form.title.trim()} className="flex items-center gap-1.5 rounded-xl bg-gray-900 px-6 py-2.5 text-sm font-bold text-white shadow-md disabled:opacity-40" type="submit"><i className="fas fa-save" />저장하기</button></div>
          </form>
        </div>
      ) : null}
    </main>
  )
}

function TaskCard({ task }: { task: AiTask }) {
  return <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className="mb-3 flex items-center justify-between"><span className="text-[10px] font-black text-gray-400">{task.id}</span>{task.urgent ? <span className="text-[10px] font-black text-red-500"><i className="fas fa-fire mr-1" />긴급</span> : null}</div><h3 className="text-sm leading-relaxed font-extrabold text-gray-900">{task.title}</h3><div className="mt-3 flex flex-wrap gap-1.5"><span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold ${tagMeta[task.tag]}`}>{task.tag}</span>{task.challenge ? <AiChip>핵심 난제</AiChip> : null}</div><div className="mt-4 flex items-center justify-between border-t border-gray-50 pt-3"><span className="text-[10px] font-bold text-gray-500">{task.assignee}</span><span className="text-[10px] font-bold text-gray-400"><i className="far fa-calendar mr-1" />{task.due}</span></div></article>
}

function ReviewPage() {
  const [selected, setSelected] = useState(0)
  const reviews = [
    { title: 'feat: Spring Security 세션 로그인 및 Role 기반 접근 제어', author: '김개발', branch: 'feature/DP-04-security', status: '리뷰 필요' },
    { title: 'feat: 회원가입 API 역할 분리', author: '김개발', branch: 'feature/DP-05-signup', status: '초안' },
    { title: 'style: 작가·독자 헤더 화면 분기', author: '박디자인', branch: 'design/DP-07-role-ui', status: '승인' },
  ]
  const review=reviews[selected]
  return <main className="flex flex-1 overflow-hidden"><aside className="flex w-[390px] shrink-0 flex-col border-r border-gray-200 bg-white"><div className="border-b border-gray-100 p-5"><h2 className="flex items-center gap-2 text-lg font-extrabold text-gray-900"><i className="fas fa-code-branch text-brand" /> 코드 피드백</h2><p className="mt-1 text-xs text-gray-500">GitHub PR과 AI 설계 항목을 함께 검토합니다.</p><div className="relative mt-4"><i className="fas fa-search absolute top-1/2 left-3 -translate-y-1/2 text-xs text-gray-400" /><input className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pr-3 pl-8 text-xs outline-none" placeholder="PR 검색..." /></div></div><div className="custom-scrollbar flex-1 space-y-2 overflow-y-auto p-3">{reviews.map((item,index)=><button key={item.title} onClick={()=>setSelected(index)} className={`w-full rounded-xl border p-4 text-left ${selected===index?'border-brand bg-green-50/50':'border-transparent hover:bg-gray-50'}`} type="button"><div className="mb-2 flex items-center justify-between"><span className="text-[10px] font-black text-gray-400">PR #{12-index}</span><span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${index===0?'bg-amber-50 text-amber-600':index===2?'bg-green-50 text-green-600':'bg-gray-100 text-gray-500'}`}>{item.status}</span></div><p className="text-sm leading-relaxed font-bold text-gray-900">{item.title}</p><p className="mt-2 text-[10px] font-bold text-gray-400">{item.author} · {item.branch}</p></button>)}</div></aside><section className="custom-scrollbar flex-1 overflow-y-auto bg-[#F8F9FA] p-8"><div className="mx-auto max-w-4xl space-y-5"><div><div className="mb-3 flex flex-wrap gap-2"><AiChip>Phase 2 · 인증/인가 구현</AiChip><span className="rounded border border-orange-100 bg-orange-50 px-2 py-1 font-mono text-[10px] font-bold text-orange-600">POST /api/members/login</span><span className="rounded border border-purple-100 bg-purple-50 px-2 py-1 text-[10px] font-bold text-purple-600">면접 Q3</span></div><h1 className="text-xl font-extrabold text-gray-900">{review.title}</h1><p className="mt-2 text-xs text-gray-500">{review.author} · {review.branch} → main</p></div><Card className="overflow-hidden border-gray-200"><div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-5 py-3"><span className="font-mono text-xs font-bold text-gray-700">SecurityConfig.java</span><span className="text-[10px] font-bold text-gray-400">+24 −8</span></div><pre className="overflow-x-auto bg-[#111827] p-6 text-xs leading-6 text-gray-300"><code><span className="text-green-400">+ requestMatchers(&quot;/api/series/**&quot;).hasAnyRole(&quot;AUTHOR&quot;, &quot;READER&quot;)</span>{'\n'}<span className="text-green-400">+ requestMatchers(&quot;/api/authors/**&quot;).hasRole(&quot;AUTHOR&quot;)</span>{'\n'}  anyRequest().authenticated();</code></pre></Card><div className="grid grid-cols-1 gap-4 md:grid-cols-2"><Card className="border-purple-100 p-5"><h3 className="text-sm font-extrabold text-gray-900"><i className="fas fa-robot mr-2 text-purple-500" />AI 리뷰 요약</h3><p className="mt-3 text-xs leading-relaxed text-gray-600">hasRole은 내부적으로 ROLE_ 접두사를 붙입니다. 권한 변환 로직과 통합 테스트를 함께 확인하세요.</p></Card><Card className="border-gray-200 p-5"><h3 className="text-sm font-extrabold text-gray-900"><i className="fas fa-comments mr-2 text-blue-500" />팀 피드백</h3><p className="mt-3 text-xs leading-relaxed text-gray-600">인가 실패 케이스까지 테스트에 추가하면 승인할게요.</p></Card></div><div className="flex justify-end gap-2"><button className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-700" type="button">변경 요청</button><button className="rounded-xl bg-brand px-6 py-2.5 text-sm font-bold text-white" type="button">승인하기</button></div></div></section></main>
}

type LocalErdColumn = {
  name: string
  type: string
  pk?: boolean
  fk?: boolean
  uk?: boolean
  note?: string
}

type LocalErdTable = {
  id: string
  name: string
  ai?: boolean
  columns: LocalErdColumn[]
}

type LocalErdRelationship = {
  from: string
  to: string
  type: string
  label: string
}

type LocalErdSchema = {
  tables: LocalErdTable[]
  relationships: LocalErdRelationship[]
}

const initialErdRelationships: LocalErdRelationship[] = [
  { from: 'MEMBER', to: 'SERIES', type: '||--o{', label: 'creates' },
  { from: 'SERIES', to: 'ARTICLE', type: '||--o{', label: 'contains' },
  { from: 'MEMBER', to: 'SUBSCRIPTION', type: '||--o{', label: 'subscribes' },
  { from: 'SERIES', to: 'SUBSCRIPTION', type: '||--o{', label: 'is subscribed by' },
]

function createInitialErdSchema(): LocalErdSchema {
  return {
    tables: aiErdTables.map((table, index) => ({
      id: `t${index}`,
      name: table.name,
      ai: true,
      columns: table.columns.map(([key, name, type]) => ({
        name,
        type,
        pk: key === 'PK',
        fk: key === 'FK',
        uk: key === 'UK',
        note: name === 'role' ? 'AUTHOR, READER' : name === 'publishStatus' && table.name === 'SERIES' ? 'DRAFT, PUBLISHED' : name === 'orderIndex' ? '핵심 난제' : undefined,
      })),
    })),
    relationships: initialErdRelationships.map((relationship) => ({ ...relationship })),
  }
}

function makeErdCode(schema: LocalErdSchema) {
  const lines = ['erDiagram']
  schema.tables.forEach((table) => {
    lines.push(`    ${table.name} {`)
    table.columns.forEach((column) => {
      const keys = [column.pk ? 'PK' : '', column.fk ? 'FK' : '', column.uk ? 'UK' : ''].filter(Boolean).join(',')
      const note = column.note ? ` "${column.note}"` : ''
      lines.push(`        ${column.type.split('(')[0].toLowerCase()} ${column.name}${keys ? ` ${keys}` : ''}${note}`)
    })
    lines.push('    }')
  })
  schema.relationships.forEach((relationship) => lines.push(`    ${relationship.from} ${relationship.type} ${relationship.to} : "${relationship.label}"`))
  return lines.join('\n')
}

function ErdPage() {
  const [schema, setSchema] = useState<LocalErdSchema>(() => createInitialErdSchema())
  const [code, setCode] = useState(() => makeErdCode(createInitialErdSchema()))
  const [historyCode, setHistoryCode] = useState(code)
  const [svg, setSvg] = useState('')
  const [renderError, setRenderError] = useState('')
  const [zoom, setZoom] = useState(1)
  const [bannerOpen, setBannerOpen] = useState(true)
  const [relationOpen, setRelationOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [savedOpen, setSavedOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatText, setChatText] = useState('')
  const [chats, setChats] = useState<string[]>([])
  const [relation, setRelation] = useState({ from: 'MEMBER', to: 'SERIES', type: '||--o{', label: '' })

  useEffect(() => {
    let ignore = false
    void loadMermaid()
      .then((mermaid) => mermaid.render(`ai-erd-${Date.now()}`, code))
      .then(({ svg: renderedSvg }) => {
        if (!ignore) {
          setSvg(renderedSvg)
          setRenderError('')
        }
      })
      .catch(() => {
        if (!ignore) setRenderError('Mermaid 문법을 확인해 주세요.')
      })
    return () => {
      ignore = true
    }
  }, [code])

  useEffect(() => {
    const handleSaveShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        localStorage.setItem('ai-erd-backup', code)
        setHistoryCode(code)
        setSavedOpen(true)
      }
    }
    document.addEventListener('keydown', handleSaveShortcut)
    return () => document.removeEventListener('keydown', handleSaveShortcut)
  }, [code])

  function syncSchema(nextSchema: LocalErdSchema) {
    setHistoryCode(code)
    setSchema(nextSchema)
    setCode(makeErdCode(nextSchema))
  }

  function updateTable(tableIndex: number, update: (table: LocalErdTable) => LocalErdTable) {
    syncSchema({ ...schema, tables: schema.tables.map((table, index) => index === tableIndex ? update(table) : table) })
  }

  function exportSql() {
    const sql = `-- Created by DevPath Architect\n\n${schema.tables.map((table) => `CREATE TABLE ${table.name} (\n${table.columns.map((column) => `    ${column.name} ${column.type}${column.pk ? ' PRIMARY KEY' : ''}`).join(',\n')}\n);`).join('\n\n')}`
    const href = URL.createObjectURL(new Blob([sql], { type: 'text/sql' }))
    const anchor = document.createElement('a')
    anchor.href = href
    anchor.download = 'schema.sql'
    anchor.click()
    URL.revokeObjectURL(href)
    showAuthToast({ message: 'schema.sql 파일을 만들었습니다.', durationMs: 1800 })
  }

  function restoreAiSchema() {
    if (!window.confirm('AI 설계서의 원본 스키마로 되돌릴까요? 현재 수정 내용은 사라집니다.')) return
    syncSchema(createInitialErdSchema())
    showAuthToast({ message: 'AI 추천 스키마를 다시 불러왔습니다.', durationMs: 1800 })
  }

  function addRelationship(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    syncSchema({ ...schema, relationships: [...schema.relationships, { ...relation, label: relation.label.trim() || 'relates to' }] })
    setRelationOpen(false)
  }

  return (
    <main className="relative flex h-full flex-1 flex-col overflow-hidden bg-white">
      <header className="z-20 flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6">
        <h1 className="flex items-center gap-2 text-lg font-bold text-gray-800"><i className="fas fa-project-diagram text-brand" />ERD Architect Pro</h1>
        <div className="flex items-center gap-2">
          <button aria-label="ERD 도움말" onClick={() => setHelpOpen(true)} className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition hover:bg-green-50 hover:text-brand" type="button"><i className="fas fa-question-circle text-lg" /></button>
          <div className="mx-1 h-8 w-px bg-gray-200" />
          <button onClick={() => { setCode(historyCode); showAuthToast({ message: '이전 편집 내용을 복구했습니다.', durationMs: 1800 }) }} className="rounded-lg border border-orange-100 bg-orange-50 px-4 py-2 text-xs font-bold text-orange-600 transition hover:bg-orange-100" type="button"><i className="fas fa-history mr-1" />이전 버전 복구</button>
          <button onClick={() => { if (window.confirm('초기화 하시겠습니까?')) syncSchema({ tables: [], relationships: [] }) }} className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-bold text-gray-500 transition hover:bg-gray-50" type="button"><i className="fas fa-trash-alt mr-1" />초기화</button>
          <button onClick={exportSql} className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-lg transition hover:bg-blue-700" type="button"><i className="fas fa-file-code" />SQL 내보내기</button>
          <button aria-label="설계 토론방" onClick={() => setChatOpen((current) => !current)} className="relative ml-1 flex h-9 w-9 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-600 shadow-sm transition hover:bg-blue-100" type="button"><i className="fas fa-comments" /></button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="z-10 flex w-96 shrink-0 flex-col border-r border-gray-200 bg-white shadow-[4px_0_20px_rgba(0,0,0,0.02)]">
          <div className="shrink-0 border-b border-gray-200 bg-gray-50"><button className="w-full border-b-2 border-brand bg-white py-3 text-xs font-bold text-brand" type="button">테이블 관리</button></div>
          <div className="shrink-0 border-b border-gray-100 p-4"><div className="grid grid-cols-2 gap-2"><button onClick={() => syncSchema({ ...schema, tables: [...schema.tables, { id: `t${Date.now()}`, name: 'NEW_TABLE', columns: [{ name: 'id', type: 'INT', pk: true }] }] })} className="rounded-lg border border-gray-200 bg-gray-100 py-2.5 text-xs font-bold text-gray-700 transition hover:bg-gray-200" type="button"><i className="fas fa-plus mr-1.5 text-brand" />테이블 추가</button><button onClick={() => { const first = schema.tables[0]?.name ?? ''; const second = schema.tables[1]?.name ?? first; setRelation({ from: first, to: second, type: '||--o{', label: '' }); setRelationOpen(true) }} disabled={schema.tables.length < 2} className="rounded-lg border border-gray-200 bg-gray-100 py-2.5 text-xs font-bold text-gray-700 transition hover:bg-gray-200 disabled:opacity-40" type="button"><i className="fas fa-link mr-1.5 text-blue-500" />관계 연결</button></div></div>
          <div className="custom-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
            <div className="flex items-center gap-2"><span className="text-[10px] font-bold text-gray-400">SCHEMA LIST</span><span className="h-px flex-1 bg-gray-100" /></div>
            {schema.tables.map((table, tableIndex) => (
              <section key={table.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="group flex items-center justify-between border-b border-gray-100 bg-gray-50 p-3"><div className="flex min-w-0 items-center gap-1.5"><input aria-label={`${table.name} 테이블 이름`} value={table.name} onChange={(event) => updateTable(tableIndex, (current) => ({ ...current, name: event.target.value.toUpperCase() }))} className="w-28 border-b border-transparent bg-transparent text-xs font-bold text-gray-700 outline-none transition focus:border-brand" />{table.ai ? <BlueprintAiChip>AI</BlueprintAiChip> : null}</div><div className="flex gap-1"><button aria-label={`${table.name} 컬럼 추가`} onClick={() => updateTable(tableIndex, (current) => ({ ...current, columns: [...current.columns, { name: 'new_col', type: 'VARCHAR(255)' }] }))} className="px-1 text-gray-400 transition hover:text-brand" type="button"><i className="fas fa-plus" /></button><button aria-label={`${table.name} 테이블 삭제`} onClick={() => { if (window.confirm('삭제하시겠습니까?')) syncSchema({ tables: schema.tables.filter((_, index) => index !== tableIndex), relationships: schema.relationships.filter((item) => item.from !== table.name && item.to !== table.name) }) }} className="px-1 text-gray-400 transition hover:text-red-500" type="button"><i className="fas fa-trash" /></button></div></div>
                <div className="space-y-1 bg-white p-2">
                  {table.columns.map((column, columnIndex) => (
                    <div key={`${table.id}-${columnIndex}`} className="flex items-center gap-2 text-xs">
                      <input aria-label={`${table.name} ${columnIndex + 1} 컬럼 이름`} value={column.name} onChange={(event) => updateTable(tableIndex, (current) => ({ ...current, columns: current.columns.map((item, index) => index === columnIndex ? { ...item, name: event.target.value } : item) }))} className="w-20 rounded border border-transparent bg-gray-50 px-1.5 py-1 text-gray-700 outline-none transition focus:border-brand focus:bg-white" />
                      <select aria-label={`${table.name} ${column.name} 타입`} value={column.type.startsWith('VARCHAR') ? 'VARCHAR(255)' : column.type} onChange={(event) => updateTable(tableIndex, (current) => ({ ...current, columns: current.columns.map((item, index) => index === columnIndex ? { ...item, type: event.target.value } : item) }))} className="w-20 cursor-pointer rounded border border-gray-200 bg-white px-1 py-1 text-[10px] text-blue-600 outline-none"><option>BIGINT</option><option>INT</option><option value="VARCHAR(255)">VARCHAR</option><option value="DATETIME">DATE</option><option value="BOOLEAN">BOOL</option></select>
                      <button onClick={() => updateTable(tableIndex, (current) => ({ ...current, columns: current.columns.map((item, index) => ({ ...item, pk: index === columnIndex ? !item.pk : false })) }))} className={`px-1 ${column.pk ? 'font-bold text-yellow-500' : 'text-gray-300 hover:text-gray-500'}`} type="button">PK</button>
                      <button onClick={() => updateTable(tableIndex, (current) => ({ ...current, columns: current.columns.map((item, index) => index === columnIndex ? { ...item, fk: !item.fk } : item) }))} className={`px-1 ${column.fk ? 'font-bold text-purple-500' : 'text-gray-300 hover:text-gray-500'}`} type="button">FK</button>
                      <button aria-label={`${table.name} ${column.name} 컬럼 삭제`} onClick={() => updateTable(tableIndex, (current) => ({ ...current, columns: current.columns.filter((_, index) => index !== columnIndex) }))} className="ml-auto px-1 text-gray-300 hover:text-red-500" type="button">×</button>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
          <div className="h-64 shrink-0 border-t border-gray-200 bg-[#1E1E1E] p-2"><div className="flex h-full flex-col overflow-hidden rounded-xl border border-[#333] bg-[#1E1E1E] shadow-lg"><div className="flex items-center justify-between px-3 py-1.5"><span className="flex items-center gap-1 text-[10px] font-bold text-gray-400"><i className="fas fa-code" />schema.mermaid</span><span className="text-[9px] text-gray-500">Live Editor</span></div><div className="relative flex min-h-0 flex-1 p-1"><span className="pt-1 font-mono text-[10px] leading-relaxed text-gray-600">1</span><textarea aria-label="schema.mermaid Live Editor" value={code} onChange={(event) => { setHistoryCode(code); setCode(event.target.value) }} spellCheck={false} className="custom-scrollbar h-full w-full resize-none border-0 bg-[#1E1E1E] p-1 font-mono text-[11px] leading-relaxed text-[#9CDCFE] outline-none" /></div></div></div>
        </aside>

        <section className="relative min-w-0 flex-1 overflow-hidden bg-white [background-image:radial-gradient(#E2E8F0_1px,transparent_1px)] [background-size:20px_20px]">
          <div className="absolute top-5 left-5 z-20 w-[360px] max-w-[calc(100%-2.5rem)] rounded-2xl border border-teal-100 bg-white/95 shadow-lg backdrop-blur">
            <button onClick={() => setBannerOpen((current) => !current)} className="flex w-full items-center justify-between gap-3 p-4" type="button"><span className="flex items-center gap-2.5 text-left"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand text-white"><i className="fas fa-magic text-xs" /></span><span><span className="block text-xs font-extrabold text-gray-900">AI 추천 스키마를 불러왔습니다</span><span className="block text-[10px] font-medium text-gray-500">AI 설계서 · 아키텍처 &amp; DB</span></span></span><i className={`fas fa-chevron-down text-xs text-gray-400 transition ${bannerOpen ? 'rotate-180' : ''}`} /></button>
            {bannerOpen ? <div className="space-y-3 px-4 pb-4"><div className="rounded-xl border border-red-100 bg-red-50 p-3"><p className="mb-1 flex items-center gap-1.5 text-[11px] font-extrabold text-red-700"><i className="fas fa-fire" />핵심 기술적 난제 · Article 엔티티의 순서 관리</p><p className="text-[11px] leading-relaxed text-red-700/90">orderIndex를 정수 순번으로 관리할 경우 중간 삽입 시 전체 재정렬이 필요합니다. 특정 글 기준 이전·다음 글 조회는 seriesId와 orderIndex 조건을 함께 사용합니다.</p></div><div className="flex gap-2"><button onClick={restoreAiSchema} className="flex-1 rounded-lg border border-teal-100 bg-teal-50 py-2 text-[11px] font-bold text-teal-700 transition hover:bg-teal-100" type="button"><i className="fas fa-undo mr-1" />AI 원본으로 되돌리기</button><button onClick={() => go('/squad-blueprint', '#arch')} className="flex-1 rounded-lg border border-gray-200 bg-gray-50 py-2 text-[11px] font-bold text-gray-700 transition hover:bg-gray-100" type="button"><i className="fas fa-book-open mr-1" />설계서 보기</button></div></div> : null}
          </div>
          <div className="flex h-full w-full items-center justify-center transition-transform duration-100" style={{ transform: `scale(${zoom})` }}><div className="ai-erd-diagram w-full max-w-3xl drop-shadow-xl [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-h-[68vh] [&_svg]:max-w-full" dangerouslySetInnerHTML={{ __html: svg }} />{renderError ? <p className="rounded-lg bg-red-50 px-4 py-2 text-sm font-bold text-red-600">{renderError}</p> : null}</div>
          <div className="absolute bottom-6 left-6 z-20 flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-2 shadow-lg"><button aria-label="확대" onClick={() => setZoom((current) => Math.min(3, current + 0.1))} className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition hover:bg-green-50 hover:text-brand" type="button"><i className="fas fa-plus" /></button><button aria-label="축소" onClick={() => setZoom((current) => Math.max(0.5, current - 0.1))} className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition hover:bg-green-50 hover:text-brand" type="button"><i className="fas fa-minus" /></button><button aria-label="화면 맞춤" onClick={() => setZoom(1)} className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition hover:bg-green-50 hover:text-brand" type="button"><i className="fas fa-compress" /></button></div>
        </section>
      </div>

      <aside className={`absolute top-16 right-0 bottom-0 z-[60] flex w-80 flex-col border-l border-gray-200 bg-white shadow-2xl transition-transform duration-300 ${chatOpen ? 'translate-x-0' : 'translate-x-full'}`}><div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-blue-50/50 p-4"><h2 className="flex items-center gap-2 font-extrabold text-gray-900"><i className="fas fa-comments text-blue-500" />설계 토론방</h2><button aria-label="설계 토론방 닫기" onClick={() => setChatOpen(false)} className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-200 hover:text-gray-700" type="button"><i className="fas fa-times" /></button></div><div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto p-4"><div className="flex gap-3"><AiMemberAvatar name="김개발" className="h-8 w-8 border border-gray-200 bg-white" /><div><p className="text-[10px] font-bold text-gray-400">김개발 (BE) · 10:20 AM</p><p className="mt-1 rounded-xl rounded-tl-none bg-gray-100 p-3 text-xs leading-relaxed text-gray-700">AI 설계서 ERD 그대로 불러왔어요. ARTICLE에 title, content 컬럼을 추가하고 orderIndex 복합 인덱스를 검토하면 좋겠습니다.</p></div></div>{chats.map((message, index) => <div key={`${message}-${index}`} className="ml-8 rounded-xl rounded-tr-none bg-blue-500 p-3 text-xs text-white">{message}</div>)}</div><form onSubmit={(event) => { event.preventDefault(); const message = chatText.trim(); if (!message) return; setChats((current) => [...current, message]); setChatText('') }} className="shrink-0 border-t border-gray-100 bg-white p-4"><div className="relative flex items-center"><input aria-label="토론 메시지" value={chatText} onChange={(event) => setChatText(event.target.value)} className="w-full rounded-full border border-gray-200 bg-gray-50 py-2.5 pr-10 pl-4 text-xs outline-none transition focus:border-blue-400 focus:bg-white" placeholder="메시지를 입력하세요..." /><button aria-label="토론 메시지 전송" className="absolute right-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-white shadow-sm hover:bg-blue-600" type="submit"><i className="fas fa-paper-plane text-xs" /></button></div></form></aside>

      {relationOpen ? <div className="fixed inset-0 z-[1150] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"><form role="dialog" aria-labelledby="relation-title" onSubmit={addRelationship} className="w-80 rounded-2xl bg-white p-6 shadow-2xl"><h2 id="relation-title" className="mb-4 flex items-center gap-2 text-sm font-bold text-gray-900"><i className="fas fa-link text-brand" />관계 설정</h2><div className="space-y-4"><label className="block"><span className="mb-1 block text-xs font-bold text-gray-500">출발 테이블</span><select aria-label="출발 테이블" value={relation.from} onChange={(event) => setRelation((current) => ({ ...current, from: event.target.value }))} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs outline-none focus:border-brand">{schema.tables.map((table) => <option key={table.id}>{table.name}</option>)}</select></label><label className="block"><span className="mb-1 block text-xs font-bold text-gray-500">도착 테이블</span><select aria-label="도착 테이블" value={relation.to} onChange={(event) => setRelation((current) => ({ ...current, to: event.target.value }))} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs outline-none focus:border-brand">{schema.tables.map((table) => <option key={table.id}>{table.name}</option>)}</select></label><label className="block"><span className="mb-1 block text-xs font-bold text-gray-500">관계 유형</span><select aria-label="관계 유형" value={relation.type} onChange={(event) => setRelation((current) => ({ ...current, type: event.target.value }))} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs outline-none focus:border-brand"><option value="||--o{">1 : N (0개 이상)</option><option value="||--|{">1 : N</option><option value="||--||">1 : 1</option><option value="}o--|{">N : M</option></select></label><label className="block"><span className="mb-1 block text-xs font-bold text-gray-500">설명</span><input aria-label="관계 설명" value={relation.label} onChange={(event) => setRelation((current) => ({ ...current, label: event.target.value }))} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs outline-none focus:border-brand" /></label></div><div className="mt-6 flex justify-end gap-2"><button onClick={() => setRelationOpen(false)} className="rounded-lg px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100" type="button">취소</button><button className="rounded-lg bg-brand px-5 py-2 text-xs font-bold text-white hover:bg-green-600" type="submit">연결</button></div></form></div> : null}

      {helpOpen ? <div className="fixed inset-0 z-[1150] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"><section role="dialog" aria-labelledby="erd-help-title" className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"><header className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-8 py-5"><h2 id="erd-help-title" className="flex items-center gap-3 text-xl font-bold text-gray-900"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-sm text-white"><i className="fas fa-book" /></span>DevPath ERD 가이드북</h2><button aria-label="ERD 도움말 닫기" onClick={() => setHelpOpen(false)} className="text-2xl text-gray-400 hover:text-gray-700" type="button">×</button></header><div className="custom-scrollbar grid flex-1 grid-cols-1 gap-8 overflow-y-auto p-8 md:grid-cols-2"><div><h3 className="font-extrabold text-gray-900">테이블과 컬럼 편집</h3><p className="mt-3 text-sm leading-7 text-gray-600">왼쪽 Schema List에서 이름과 타입을 바로 편집하고 PK·FK를 지정할 수 있습니다. 변경 내용은 Mermaid 다이어그램에 즉시 반영됩니다.</p></div><div><h3 className="font-extrabold text-gray-900">관계와 SQL</h3><p className="mt-3 text-sm leading-7 text-gray-600">관계 연결 버튼으로 카디널리티를 추가하고 SQL 내보내기로 현재 테이블 정의를 다운로드할 수 있습니다.</p></div><div><h3 className="font-extrabold text-gray-900">Live Editor</h3><p className="mt-3 text-sm leading-7 text-gray-600">Mermaid 코드를 직접 수정해 다이어그램을 조정합니다. Ctrl+S 또는 Cmd+S로 현재 코드를 저장합니다.</p></div><div><h3 className="font-extrabold text-gray-900">AI 원본 복구</h3><p className="mt-3 text-sm leading-7 text-gray-600">AI 추천 스키마로 되돌리기를 누르면 최초 네 개 테이블과 관계를 다시 불러옵니다.</p></div></div><footer className="flex justify-end border-t border-gray-100 bg-gray-50 p-5"><button onClick={() => setHelpOpen(false)} className="rounded-xl bg-gray-900 px-6 py-2.5 text-sm font-bold text-white" type="button">확인했습니다</button></footer></section></div> : null}

      {savedOpen ? <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm"><section role="dialog" aria-labelledby="erd-saved-title" className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl"><div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-green-100 bg-green-50 text-brand"><i className="fas fa-check text-3xl" /></div><h2 id="erd-saved-title" className="mb-2 text-xl font-extrabold text-gray-900">저장 완료</h2><p className="mb-6 text-sm text-gray-500">설계 도면이 브라우저에 안전하게 저장되었습니다.</p><button onClick={() => setSavedOpen(false)} className="w-full rounded-xl bg-gray-900 py-3 font-bold text-white" type="button">확인</button></section></div> : null}
    </main>
  )
}

const apiMethods: AiApi['method'][] = ['GET', 'POST', 'PATCH', 'PUT', 'DELETE']

function MethodBadge({ method, compact = false }: { method: AiApi['method']; compact?: boolean }) {
  const cls = method === 'GET'
    ? 'bg-green-100 text-green-700'
    : method === 'POST'
      ? 'bg-blue-100 text-blue-700'
      : method === 'DELETE'
        ? 'bg-red-100 text-red-600'
        : 'bg-amber-100 text-amber-700'
  return <span className={`shrink-0 rounded text-center font-extrabold ${cls} ${compact ? 'w-12 px-1.5 py-0.5 text-[10px]' : 'px-3 py-1.5 text-sm'}`}>{method}</span>
}

function JsonValueTokens({ value }: { value: string }) {
  return <>{value.split(/("(?:\\.|[^"\\])*"|-?\d+(?:\.\d+)?|true|false|null)/g).map((token, index) => {
    const cls = token.startsWith('"') ? 'text-yellow-200' : /^-?\d/.test(token) ? 'text-orange-300' : /^(true|false|null)$/.test(token) ? 'text-violet-300' : ''
    return <span key={`${token}-${index}`} className={cls}>{token}</span>
  })}</>
}

function ApiJsonCode({ value }: { value: unknown }) {
  return <>{JSON.stringify(value, null, 2).split('\n').map((line, index) => {
    const keyMatch = line.match(/^(\s*)("(?:\\.|[^"\\])*")(:)(.*)$/)
    return <span key={`${line}-${index}`} className="block">{keyMatch ? <>{keyMatch[1]}<span className="text-blue-300">{keyMatch[2]}</span>{keyMatch[3]}<JsonValueTokens value={keyMatch[4]} /></> : <JsonValueTokens value={line} />}</span>
  })}</>
}

function ApiJsonPanel({ title, value, status, headers }: { title: string; value: unknown; status?: number; headers?: string }) {
  return <section className="overflow-hidden rounded-2xl bg-[#111827] shadow-sm"><div className="flex items-center justify-between border-b border-gray-800 px-5 py-3"><span className="text-xs font-bold text-gray-400">{title}</span>{status === undefined ? <span className="font-mono text-[10px] text-gray-500">application/json</span> : <span className={`rounded px-2 py-0.5 text-[10px] font-extrabold ${status < 300 ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>{status}</span>}</div><pre className="overflow-x-auto p-5 text-xs leading-relaxed text-gray-300"><ApiJsonCode value={value} /></pre>{headers ? <p className="px-5 pb-4 font-mono text-[11px] text-gray-500">{headers}</p> : null}</section>
}

function roadmapPhaseForTask(taskId: string) {
  const taskNumber = Number(taskId.slice(3))
  const index = taskNumber <= 3 ? 0 : taskNumber <= 7 ? 1 : taskNumber <= 12 ? 2 : 3
  return aiRoadmap[index]
}

function ApiPage() {
  const [apis, setApis] = useState<AiApi[]>(() => aiApis.map((api) => ({ ...api })))
  const [selectedId, setSelectedId] = useState(() => {
    const hash = window.location.hash.slice(1)
    return aiApis.some((api) => api.id === hash) ? hash : aiApis[0].id
  })
  const [filter, setFilter] = useState<AiTaskStatus | 'all'>('all')
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [draft, setDraft] = useState<{ method: AiApi['method']; path: string; desc: string; group: string; feature: string }>({ method: 'GET', path: '', desc: '', group: aiApis[0].group, feature: '' })

  useEffect(() => {
    const selectFromHash = () => {
      const hash = window.location.hash.slice(1)
      if (apis.some((api) => api.id === hash)) setSelectedId(hash)
    }
    window.addEventListener('hashchange', selectFromHash)
    return () => window.removeEventListener('hashchange', selectFromHash)
  }, [apis])

  const selected = apis.find((api) => api.id === selectedId) ?? apis[0]
  const filtered = apis.filter((api) => (filter === 'all' || api.status === filter) && `${api.path} ${api.desc}`.toLowerCase().includes(search.trim().toLowerCase()))
  const groups = [...new Set(apis.map((api) => api.group))]
  const doneCount = apis.filter((api) => api.status === 'done').length
  const activeCount = apis.filter((api) => api.status === 'progress' || api.status === 'review').length
  const progress = Math.round((doneCount + activeCount * 0.5) / apis.length * 100)
  const task = aiTasks.find((item) => item.id === selected.task)
  const feature = aiFeatures.find((item) => item.id === selected.feature)
  const phase = task ? roadmapPhaseForTask(task.id) : null
  const interviewQuestions = blueprintInterviewQuestions.filter((question) => question.apis?.includes(selected.id))
  const pathParameters = [...selected.path.matchAll(/\{(\w+)\}/g)].map((match) => match[1])
  const queryParameters = selected.query?.split('&').map((value) => { const [name, example] = value.split('='); return { name, example } }) ?? []
  const curl = `curl -X ${selected.method} "http://localhost:8080${selected.path.replace(/\{\w+\}/g, '1')}${selected.query ? `?${selected.query}` : ''}"${selected.request ? ` \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(selected.request)}'` : ''}${selected.auth !== '없음' ? ` \\\n  -b "JSESSIONID=<session>"` : ''}`

  const selectApi = (id: string) => {
    setSelectedId(id)
    window.history.replaceState(null, '', `#${id}`)
  }

  const updateStatus = (status: AiTaskStatus) => {
    setApis((current) => current.map((api) => api.id === selected.id ? { ...api, status } : api))
    showAuthToast({ message: `${selected.id} 상태가 '${statusMeta[status].label}'(으)로 변경되었습니다.`, durationMs: 1800 })
  }

  const copyCurl = () => {
    if (!navigator.clipboard) {
      showAuthToast({ message: '복사에 실패했습니다. 직접 선택해 주세요.', variant: 'error' })
      return
    }
    void navigator.clipboard.writeText(curl).then(() => showAuthToast('cURL을 복사했습니다.')).catch(() => showAuthToast({ message: '복사에 실패했습니다. 직접 선택해 주세요.', variant: 'error' }))
  }

  const addEndpoint = () => {
    if (!draft.path.trim() || !draft.desc.trim()) return
    const id = `A${apis.length + 1}`
    const nextApi: AiApi = { id, group: draft.group, method: draft.method, path: draft.path.trim(), desc: draft.desc.trim(), auth: '로그인 사용자', source: 'team', status: 'todo', task: '', feature: draft.feature || undefined, response: { status: 200, body: {} } }
    setApis((current) => [...current, nextApi])
    setAddOpen(false)
    selectApi(id)
    showAuthToast('새 엔드포인트가 추가되었습니다.')
  }

  return <main className="flex flex-1 flex-col overflow-hidden">
    <PageHeading icon="fas fa-plug" title="API 명세서" copy={<span className="flex flex-wrap items-center gap-2">AI 설계서의 API 명세를 기반으로 팀이 함께 관리합니다. <button onClick={() => go('/squad-blueprint', '#api')} type="button"><AiChip>원본 보기</AiChip></button></span>} action={<div className="flex flex-wrap items-center gap-3"><div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2"><div className="text-right"><p className="text-[10px] font-bold text-gray-400">구현 진행률</p><p className="text-sm font-black text-gray-900">{progress}% <span className="text-[10px] font-bold text-gray-400">완료 {doneCount} · 진행 {activeCount} / {apis.length}</span></p></div><div className="h-2 w-24 overflow-hidden rounded-full bg-gray-200"><div className="h-2 rounded-full bg-brand transition-all" style={{ width: `${progress}%` }} /></div></div><button onClick={() => { setDraft({ method: 'GET', path: '', desc: '', group: groups[0], feature: '' }); setAddOpen(true) }} className="flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-bold text-white shadow-lg transition hover:bg-black" type="button"><i className="fas fa-plus" />엔드포인트 추가</button></div>} />

    <div className="flex flex-1 overflow-hidden">
      <aside className="flex w-[420px] max-w-[45%] shrink-0 flex-col border-r border-gray-200 bg-white">
        <div className="shrink-0 space-y-3 border-b border-gray-100 p-4"><div className="relative"><i className="fas fa-search absolute top-1/2 left-3 -translate-y-1/2 text-xs text-gray-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pr-3 pl-8 text-xs outline-none transition focus:border-brand focus:bg-white" placeholder="경로 또는 설명 검색..." /></div><div className="flex flex-wrap gap-1">{(['all', 'todo', 'progress', 'review', 'done'] as const).map((key) => <button key={key} onClick={() => setFilter(key)} className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold transition ${filter === key ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-400'}`} type="button">{key === 'all' ? '전체' : statusMeta[key].label} {key === 'all' ? apis.length : apis.filter((api) => api.status === key).length}</button>)}</div></div>
        <div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto p-3">{groups.map((group) => {
          const items = filtered.filter((api) => api.group === group)
          if (!items.length) return null
          return <section key={group}><p className="mb-1.5 px-2 text-[10px] font-extrabold tracking-wider text-gray-400 uppercase">{group}</p><div className="space-y-1">{items.map((api) => <button key={api.id} onClick={() => selectApi(api.id)} className={`w-full rounded-xl border px-3 py-2.5 text-left transition duration-150 ${selected.id === api.id ? 'border-green-200 bg-green-50' : 'border-transparent hover:bg-gray-50'}`} type="button"><div className="flex items-center gap-2"><MethodBadge method={api.method} compact /><span className="flex-1 truncate font-mono text-xs font-bold text-gray-800">{api.path}</span><span aria-label={statusMeta[api.status].label} className={`h-2 w-2 shrink-0 rounded-full ${api.status === 'done' ? 'bg-brand' : api.status === 'review' ? 'bg-yellow-400' : api.status === 'progress' ? 'bg-blue-500' : 'bg-gray-300'}`} /></div><div className="mt-1 flex items-center gap-1.5 pl-14"><span className="flex-1 truncate text-[11px] text-gray-500">{api.desc}</span>{api.source === 'ai' ? <i aria-label="AI 설계서 원본" className="fas fa-magic text-[9px] text-teal-500" /> : null}</div></button>)}</div></section>
        })}{filtered.length === 0 ? <p className="py-10 text-center text-xs font-bold text-gray-400">조건에 맞는 엔드포인트가 없습니다.</p> : null}</div>
      </aside>

      <section className="custom-scrollbar flex-1 overflow-y-auto bg-[#F3F4F6] p-8">
        <div key={selected.id} className="ai-api-detail-panel mx-auto max-w-3xl space-y-5">
          <Card className="p-6"><div className="mb-3 flex flex-wrap items-center gap-2">{selected.source === 'ai' ? <BlueprintAiChip>AI 설계서 원본</BlueprintAiChip> : <TeamChip>팀 보강 · MVP 커버용</TeamChip>}<span className="text-[10px] font-bold text-gray-400">{selected.id} · {selected.group}</span></div><div className="mb-2 flex items-center gap-3"><MethodBadge method={selected.method} /><h2 className="break-all font-mono text-lg font-bold text-gray-900">{selected.path.split(/(\{\w+\})/g).map((part, index) => /^\{\w+\}$/.test(part) ? <span key={`${part}-${index}`} className="text-orange-500">{part}</span> : part)}</h2></div><p className="text-sm font-medium text-gray-600">{selected.desc}</p><div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4"><div className="rounded-xl border border-gray-100 bg-gray-50 p-3"><label htmlFor="api-status" className="mb-1 block text-[10px] font-bold text-gray-400">구현 상태</label><select id="api-status" aria-label={`${selected.id} 구현 상태`} value={selected.status} onChange={(event) => updateStatus(event.target.value as AiTaskStatus)} className="w-full cursor-pointer rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-bold outline-none focus:border-brand">{(['todo', 'progress', 'review', 'done'] as AiTaskStatus[]).map((status) => <option key={status} value={status}>{statusMeta[status].label}</option>)}</select></div><div className="rounded-xl border border-gray-100 bg-gray-50 p-3"><p className="mb-1 text-[10px] font-bold text-gray-400">권한</p><p className="text-xs font-bold text-gray-800"><i className="fas fa-lock mr-1 text-[10px] text-gray-400" />{selected.auth}</p></div><div className="rounded-xl border border-gray-100 bg-gray-50 p-3"><p className="mb-1 text-[10px] font-bold text-gray-400">담당자</p>{task ? <p className="flex items-center gap-1.5 text-xs font-bold text-gray-800"><AiMemberAvatar name={task.assignee} className="h-4 w-4" />{task.assignee}</p> : <p className="text-xs text-gray-400">미배정</p>}</div><div className="rounded-xl border border-gray-100 bg-gray-50 p-3"><p className="mb-1 text-[10px] font-bold text-gray-400">작업 카드</p>{task ? <button onClick={() => go('/squad-workspace')} className="text-xs font-bold text-brand hover:underline" type="button">#{task.id} ·{task.due} 마감</button> : <p className="text-xs text-gray-400">-</p>}</div></div></Card>

          {feature || task || interviewQuestions.length ? <section className="space-y-2 rounded-2xl border border-green-200 bg-[linear-gradient(135deg,#F0FDF4_0%,#F0FDFA_100%)] p-5"><p className="flex items-center gap-1.5 text-[11px] font-extrabold text-teal-700"><i className="fas fa-magic" />AI 설계서 연결</p>{feature ? <p className="text-xs text-gray-700"><b>MVP 기능</b> · {feature.id}. {feature.title}</p> : null}{phase ? <p className="text-xs text-gray-700"><b>로드맵</b> · Phase {phase.phase}. {phase.title}</p> : null}{interviewQuestions.map((question) => <p key={question.id} className="text-xs text-gray-700"><b>면접 대비</b> · <button onClick={() => go('/squad-interview', `#${question.id}`)} className="font-bold text-brand hover:underline" type="button">{question.id}. {question.question}</button></p>)}</section> : null}

          {pathParameters.length || queryParameters.length ? <Card className="overflow-hidden"><div className="border-b border-gray-100 bg-gray-50 px-5 py-3"><h3 className="text-xs font-extrabold text-gray-700">Parameters</h3></div><table className="w-full text-xs"><tbody className="divide-y divide-gray-50">{pathParameters.map((parameter) => <tr key={`path-${parameter}`}><td className="w-40 px-5 py-2.5 font-mono font-bold text-gray-800">{parameter}</td><td className="px-5 py-2.5 text-gray-400">path</td><td className="px-5 py-2.5 text-gray-600">Long · 필수</td></tr>)}{queryParameters.map((parameter) => <tr key={`query-${parameter.name}`}><td className="w-40 px-5 py-2.5 font-mono font-bold text-gray-800">{parameter.name}</td><td className="px-5 py-2.5 text-gray-400">query</td><td className="px-5 py-2.5 text-gray-600">예: {parameter.example}</td></tr>)}</tbody></table></Card> : null}

          <div className={`grid grid-cols-1 gap-5 ${selected.request ? 'lg:grid-cols-2' : ''}`}>{selected.request ? <ApiJsonPanel title="Request Body" value={selected.request} /> : null}<ApiJsonPanel title="Response" value={selected.response.body} status={selected.response.status} headers={selected.response.headers} /></div>

          <Card className="overflow-hidden"><div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-5 py-3"><h3 className="text-xs font-extrabold text-gray-700">cURL 예시</h3><button onClick={copyCurl} className="text-[11px] font-bold text-gray-500 hover:text-brand" type="button"><i className="far fa-copy mr-1" />복사</button></div><pre className="overflow-x-auto p-5 font-mono text-xs text-gray-700">{curl}</pre></Card>
        </div>
      </section>
    </div>

    {addOpen ? <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm"><form onSubmit={(event) => { event.preventDefault(); addEndpoint() }} role="dialog" aria-modal="true" aria-labelledby="add-api-title" className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 p-6"><h3 id="add-api-title" className="flex items-center gap-2 text-lg font-extrabold text-gray-900"><i className="fas fa-plus-circle text-brand" />엔드포인트 추가</h3><button onClick={() => setAddOpen(false)} aria-label="닫기" className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 transition hover:text-gray-900" type="button"><i className="fas fa-times" /></button></div><div className="space-y-4 p-6"><div className="grid grid-cols-4 gap-3"><div><label htmlFor="new-api-method" className="mb-1.5 block text-xs font-bold text-gray-700">Method</label><select id="new-api-method" value={draft.method} onChange={(event) => setDraft((current) => ({ ...current, method: event.target.value as AiApi['method'] }))} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-bold outline-none focus:border-brand">{apiMethods.map((method) => <option key={method}>{method}</option>)}</select></div><div className="col-span-3"><label htmlFor="new-api-path" className="mb-1.5 block text-xs font-bold text-gray-700">경로 <span className="text-red-500">*</span></label><input id="new-api-path" required value={draft.path} onChange={(event) => setDraft((current) => ({ ...current, path: event.target.value }))} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 font-mono text-sm outline-none focus:border-brand" placeholder="/api/series/{seriesId}/articles/{articleId}" /></div></div><div><label htmlFor="new-api-desc" className="mb-1.5 block text-xs font-bold text-gray-700">설명 <span className="text-red-500">*</span></label><input id="new-api-desc" required value={draft.desc} onChange={(event) => setDraft((current) => ({ ...current, desc: event.target.value }))} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand" placeholder="예: 글 삭제 시 뒤 순번 당기기" /></div><div className="grid grid-cols-2 gap-3"><div><label htmlFor="new-api-group" className="mb-1.5 block text-xs font-bold text-gray-700">리소스 그룹</label><select id="new-api-group" value={draft.group} onChange={(event) => setDraft((current) => ({ ...current, group: event.target.value }))} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand">{groups.map((group) => <option key={group}>{group}</option>)}</select></div><div><label htmlFor="new-api-feature" className="mb-1.5 block text-xs font-bold text-gray-700">연결 MVP 기능</label><select id="new-api-feature" value={draft.feature} onChange={(event) => setDraft((current) => ({ ...current, feature: event.target.value }))} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand"><option value="">없음</option>{aiFeatures.map((item) => <option key={item.id} value={item.id}>{item.id}. {item.title}</option>)}</select></div></div></div><div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50 p-5"><button onClick={() => setAddOpen(false)} className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-600 transition hover:bg-gray-50" type="button">취소</button><button className="rounded-xl bg-gray-900 px-6 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-black" type="submit">추가하기</button></div></form></div> : null}
  </main>
}

function SchedulePage() {
  const days=Array.from({length:35},(_,index)=>index-3)
  const events:Record<number,string>={2:'DP-05 회원가입 API',3:'DP-06 로그인 화면',4:'DP-07 권한 UI',8:'Phase 2 마감',12:'DP-09 orderIndex',13:'DP-10 조회 쿼리'}
  return <main className="flex flex-1 flex-col overflow-hidden"><PageHeading icon="fas fa-calendar-alt" title="일정 관리" copy={<span>AI 로드맵과 팀 일정을 한눈에 관리합니다. <button onClick={()=>go('/squad-blueprint','#roadmap')} className="ml-2 text-[11px] font-bold text-gray-400 hover:text-brand" type="button">설계서 보기 →</button></span>} action={<button className="rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-bold text-white" type="button"><i className="fas fa-plus mr-2" />일정 추가</button>} /><div className="flex flex-1 overflow-hidden p-6"><Card className="flex flex-1 flex-col overflow-hidden"><div className="flex items-center justify-between border-b border-gray-100 px-6 py-4"><div className="flex gap-2"><button className="h-8 w-8 rounded-lg border border-gray-200 bg-white" type="button"><i className="fas fa-chevron-left text-xs" /></button><button className="h-8 w-8 rounded-lg border border-gray-200 bg-white" type="button"><i className="fas fa-chevron-right text-xs" /></button></div><h2 className="text-xl font-extrabold text-gray-900">2026년 2월</h2><button className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-600" type="button">오늘</button></div><div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50">{['일','월','화','수','목','금','토'].map((day)=><div key={day} className="py-2 text-center text-[11px] font-bold text-gray-400">{day}</div>)}</div><div className="grid flex-1 grid-cols-7 grid-rows-5">{days.map((day,index)=>{const date=day<1?28+day:day;const muted=day<1||day>28;const label=events[day];return <div key={index} className="min-h-[96px] border-r border-b border-gray-100 p-2"><span className={`text-xs font-bold ${muted?'text-gray-300':day===21?'flex h-6 w-6 items-center justify-center rounded-full bg-brand text-white':'text-gray-600'}`}>{date}</span>{label?<div className={`mt-2 truncate rounded px-2 py-1 text-[10px] font-bold ${day===8?'bg-purple-100 text-purple-700':'bg-blue-50 text-blue-600'}`}>{label}</div>:null}</div>})}</div></Card><aside className="ml-5 w-[300px] shrink-0 space-y-5"><Card className="p-5"><h3 className="mb-4 text-sm font-extrabold text-gray-900"><i className="fas fa-route mr-2 text-purple-500" />현재 마일스톤</h3><p className="text-xs font-bold text-purple-600">Phase 2</p><p className="mt-1 text-sm font-extrabold text-gray-900">인증/인가 구현</p><div className="mt-4 h-2 rounded-full bg-gray-100"><div className="h-2 w-[55%] rounded-full bg-purple-500" /></div><p className="mt-2 text-[10px] text-gray-400">02.16 ~ 02.24 · 55%</p></Card><Card className="p-5"><h3 className="mb-4 text-sm font-extrabold text-gray-900"><i className="fas fa-list-check mr-2 text-brand" />다가오는 일정</h3>{aiTasks.filter((task)=>task.status==='progress'||task.status==='review').map((task)=><div key={task.id} className="mb-3 rounded-xl border border-gray-100 bg-gray-50 p-3"><p className="text-[10px] font-black text-gray-400">{task.due} · {task.id}</p><p className="mt-1 text-xs font-bold text-gray-800">{task.title}</p></div>)}</Card></aside></div></main>
}

function FilesPage() {
  const [selected,setSelected]=useState(aiFiles[0])
  return <main className="flex flex-1 flex-col overflow-hidden"><PageHeading icon="fas fa-folder-open" title="팀 자료실" copy={<span>AI 설계 문서와 팀 파일을 한곳에서 관리합니다. <AiChip>미리보기 지원</AiChip></span>} action={<button className="rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-bold text-white" type="button"><i className="fas fa-upload mr-2" />파일 업로드</button>} /><div className="flex flex-1 overflow-hidden"><section className="custom-scrollbar flex-1 overflow-y-auto p-6"><div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">{[['fa-file-pdf','AI 설계서','기획부터 면접까지'],['fa-database','아키텍처 문서','ERD와 기술 스택'],['fa-plug','API 명세','9개 엔드포인트']].map(([icon,title,copy])=><Card key={title} className="p-4"><i className={`fas ${icon} text-brand`} /><p className="mt-3 text-sm font-extrabold text-gray-900">{title}</p><p className="mt-1 text-[10px] font-bold text-gray-400">{copy}</p></Card>)}</div><Card className="overflow-hidden"><div className="grid grid-cols-12 gap-4 border-b border-gray-100 bg-gray-50 px-5 py-3 text-[10px] font-bold text-gray-400"><span className="col-span-6">이름</span><span className="col-span-2">소유자</span><span className="col-span-2">수정일</span><span className="col-span-2">크기</span></div>{aiFiles.map((file)=><button key={file.name} onClick={()=>setSelected(file)} className={`grid w-full grid-cols-12 items-center gap-4 border-b border-gray-50 px-5 py-4 text-left hover:bg-gray-50 ${selected.name===file.name?'bg-green-50/40':''}`} type="button"><span className="col-span-6 flex items-center gap-3 text-sm font-bold text-gray-800"><i className={`fas ${file.kind==='PDF'?'fa-file-pdf text-red-500':file.kind==='FIG'?'fa-bezier-curve text-purple-500':'fa-file-code text-blue-500'} text-lg`} />{file.name}</span><span className="col-span-2 text-xs text-gray-500">{file.owner}</span><span className="col-span-2 text-xs text-gray-400">{file.date}</span><span className="col-span-2 text-xs text-gray-400">{file.size}</span></button>)}</Card></section><aside className="custom-scrollbar w-[380px] shrink-0 overflow-y-auto border-l border-gray-200 bg-white p-6"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-xl text-red-500"><i className="fas fa-file-alt" /></div><h2 className="mt-4 break-all text-xl font-black text-gray-800">{selected.name}</h2><p className="mt-2 text-xs text-gray-400">{selected.owner} · {selected.date} · {selected.size}</p><div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-5"><h3 className="text-sm font-extrabold text-gray-900">문서 미리보기</h3><p className="mt-4 text-xs leading-6 text-gray-600"># {aiSquadProject.title}</p><p className="mt-3 text-xs leading-6 text-gray-600">{aiSquadProject.summary}</p><h4 className="mt-5 text-xs font-extrabold text-gray-900">## 핵심 사용자 흐름</h4><ul className="mt-2 space-y-2 text-[11px] text-gray-500">{aiUserFlow.slice(0,3).map(([actor,text])=><li key={text}>- <b>{actor}</b> {text}</li>)}</ul></div></aside></div></main>
}

function MeetingPage() {
  const [joined,setJoined]=useState(false)
  const [muted,setMuted]=useState(false)
  const [camera,setCamera]=useState(true)
  if(joined) return <AiShell activePage="meeting" dark><div className="flex h-16 shrink-0 items-center justify-between border-b border-gray-700 bg-gray-800 px-6"><div className="flex items-center gap-4"><span className="h-2.5 w-2.5 rounded-full bg-gray-500" /><h1 className="flex items-center gap-2 text-base font-extrabold text-white">주간 스프린트 회의 <span className="ml-2 font-mono font-normal text-gray-400">01:24:30</span></h1><span className="flex items-center gap-1 rounded border border-gray-600 bg-gray-700 px-2 py-0.5 text-xs font-bold text-gray-300"><i className="fas fa-shield-alt text-green-400" /> 암호화됨</span></div><div className="flex items-center gap-4"><span className="mr-4 flex items-center gap-2 border-r border-gray-600 pr-4 text-xs font-bold text-gray-400"><i className="fas fa-signal text-green-400" /> 네트워크 우수</span><button className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-600 bg-gray-700" type="button"><i className="fas fa-list-ul" /></button></div></div><main className="flex flex-1 overflow-hidden"><section className="relative flex flex-1 flex-col p-4"><div className="relative flex flex-1 items-center justify-center overflow-hidden rounded-2xl border border-gray-700 bg-gray-800 shadow-inner"><div className="text-center"><AiMemberAvatar name="김개발" className="mx-auto mb-4 h-48 w-48 border-4 border-gray-600 bg-gray-700 shadow-2xl" /><h2 className="text-2xl font-bold tracking-wide text-white">김개발 <span className="ml-1 text-sm font-normal text-gray-400">(발표자)</span></h2><p className="mt-2 text-sm text-gray-400">DP-04 Security 설정을 공유하고 있습니다.</p></div><div className="absolute right-4 bottom-4 flex gap-2">{aiSquadMembers.map((member)=><div key={member.memberId} className="flex h-24 w-36 items-center justify-center rounded-xl border border-gray-600 bg-gray-900"><AiMemberAvatar name={member.learnerName} className="h-12 w-12 bg-gray-700" /></div>)}</div></div><div className="mt-4 flex justify-center gap-3"><button onClick={()=>setMuted((value)=>!value)} className={`flex h-11 w-11 items-center justify-center rounded-full ${muted?'bg-red-500':'bg-gray-700'} text-white`} type="button"><i className={`fas ${muted?'fa-microphone-slash':'fa-microphone'}`} /></button><button onClick={()=>setCamera((value)=>!value)} className={`flex h-11 w-11 items-center justify-center rounded-full ${camera?'bg-gray-700':'bg-red-500'} text-white`} type="button"><i className={`fas ${camera?'fa-video':'fa-video-slash'}`} /></button><button className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-700 text-white" type="button"><i className="fas fa-desktop" /></button><button onClick={()=>setJoined(false)} className="flex h-11 items-center justify-center rounded-full bg-red-500 px-5 text-xs font-bold text-white" type="button">회의 나가기</button></div></section><aside className="flex w-[360px] shrink-0 flex-col border-l border-gray-700 bg-gray-800"><div className="flex border-b border-gray-700"><button className="flex-1 border-b-2 border-brand py-3 text-xs font-bold text-brand" type="button">AI 회의록</button><button className="flex-1 py-3 text-xs font-bold text-gray-400" type="button">채팅</button></div><div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto p-5"><div className="rounded-xl border border-purple-500/20 bg-purple-500/10 p-4"><p className="text-xs font-extrabold text-purple-300"><i className="fas fa-magic mr-2" />AI 추천 안건</p><p className="mt-2 text-xs leading-relaxed text-gray-300">orderIndex 재정렬 방식과 동시성 제어 전략을 결정하세요.</p></div>{['Security 권한 접두사 확인','Phase 2 남은 작업 배분','다음 스프린트 핵심 난제 검토'].map((item,index)=><div key={item} className="flex gap-3"><span className="font-mono text-[10px] text-gray-500">0{index+3}:2{index}</span><p className="text-xs leading-relaxed text-gray-300">{item}</p></div>)}</div></aside></main></AiShell>
  return <AiShell activePage="meeting"><main className="custom-scrollbar flex flex-1 flex-col items-center justify-center overflow-y-auto p-4 md:p-8"><div className="mb-6 flex w-full max-w-5xl items-center justify-between"><div className="flex gap-2"><button className="flex items-center gap-1.5 rounded-lg bg-gray-800 px-3 py-1.5 text-xs font-bold text-gray-200 shadow-sm" type="button"><i className="fas fa-shield-alt text-green-400" />보안 연결됨</button><button className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-600 shadow-sm" type="button"><i className="fas fa-signal text-green-500" />네트워크 우수</button></div></div><div className="grid w-full max-w-5xl grid-cols-1 gap-8 lg:grid-cols-3"><div className="flex flex-col items-center justify-center lg:col-span-2"><Card className="relative flex w-full flex-col items-center justify-center overflow-hidden border-gray-200 px-6 py-8"><div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-green-50 to-white" /><div className="relative z-10 flex flex-col items-center"><div className="relative mt-2 mb-4"><div className="absolute inset-0 scale-125 animate-ping rounded-full bg-brand opacity-20" /><AiMemberAvatar name="이태형" className="relative z-10 h-24 w-24 border-4 border-white bg-gray-100 shadow-md" /><div className="absolute right-[-4px] bottom-0 z-20 flex gap-1"><span className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-white shadow-sm ${camera?'bg-brand':'bg-red-500'}`}><i className={`fas ${camera?'fa-video':'fa-video-slash'} text-[10px]`} /></span><span className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-white shadow-sm ${muted?'bg-red-500':'bg-brand'}`}><i className={`fas ${muted?'fa-microphone-slash':'fa-microphone'} text-[10px]`} /></span></div></div><h3 className="mb-2 text-lg font-extrabold text-gray-900">이태형</h3><p className="rounded-full border border-green-100 bg-green-50 px-3 py-1 text-xs font-bold text-brand shadow-sm">마이크와 카메라가 준비되었습니다.</p></div></Card><div className="mx-auto mt-4 flex w-full max-w-sm items-center gap-3"><button onClick={()=>setMuted((value)=>!value)} className="flex flex-1 flex-col items-center justify-center rounded-xl border border-gray-200 bg-white py-2.5 text-xs font-bold text-gray-700 shadow-sm" type="button"><i className={`fas ${muted?'fa-microphone-slash':'fa-microphone'} mb-1 text-lg`} /><span>{muted?'마이크 켜기':'마이크 끄기'}</span></button><button onClick={()=>setCamera((value)=>!value)} className="flex flex-1 flex-col items-center justify-center rounded-xl border border-gray-200 bg-white py-2.5 text-xs font-bold text-gray-700 shadow-sm" type="button"><i className={`fas ${camera?'fa-video':'fa-video-slash'} mb-1 text-lg`} /><span>{camera?'카메라 끄기':'카메라 켜기'}</span></button><button className="flex flex-1 flex-col items-center justify-center rounded-xl border border-gray-900 bg-gray-900 py-2.5 text-xs font-bold text-white shadow-sm" type="button"><i className="fas fa-cog mb-1 text-lg" /><span>상세 설정</span></button></div></div><div className="flex flex-col justify-center"><Card className="p-6 shadow-xl lg:p-7"><span className="mb-3 inline-block rounded-md border border-blue-100 bg-blue-50 px-2.5 py-1 text-[10px] font-extrabold text-blue-600">진행 중인 회의</span><h2 className="mb-2 text-xl font-black text-gray-900">주간 스프린트 회의</h2><p className="mb-5 text-xs leading-relaxed font-medium text-gray-500">모든 팀원이 참석할 예정입니다. 입장 전 장치 상태를 점검해 주세요.</p><div className="mb-6 rounded-2xl border border-green-200 bg-[linear-gradient(135deg,#F0FDF4_0%,#F0FDFA_100%)] p-4"><div className="mb-2.5 flex items-center justify-between"><h3 className="text-[11px] font-extrabold tracking-wider text-gray-700">오늘의 안건</h3><AiChip>AI 로드맵 기반</AiChip></div><ol className="space-y-2 text-[10px] leading-relaxed text-gray-600"><li><strong className="text-brand">1</strong> Phase 2 인증/인가 구현 점검</li><li><strong className="text-brand">2</strong> DP-04 Security 리뷰</li><li><strong className="text-brand">3</strong> orderIndex 구현 방식 결정</li></ol></div><div className="mb-6"><h3 className="mb-2.5 text-[11px] font-bold tracking-wider text-gray-400">현재 대기 중인 팀원 (2명)</h3>{aiSquadMembers.slice(1).map((member,index)=><div key={member.memberId} className="flex items-center gap-3 rounded-xl p-2"><AiMemberAvatar name={member.learnerName} className="h-9 w-9 border border-gray-200 bg-gray-50" /><p className="flex-1 text-xs font-bold text-gray-800">{member.learnerName}{index===0?<span className="ml-1 rounded bg-gray-100 px-1 py-0.5 text-[9px] text-gray-500">방장</span>:null}</p><i className={`fas ${index===0?'fa-microphone text-brand':'fa-microphone-slash text-red-400'} text-[10px]`} /></div>)}</div><button onClick={()=>setJoined(true)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3.5 text-base font-extrabold text-white shadow-[0_8px_15px_rgba(0,196,113,0.25)]" type="button">회의 참여하기</button></Card></div></div></main></AiShell>
}

type LocalInterviewQuestion = (typeof aiInterviewQuestions)[number] & {
  source?: 'ai' | 'generated' | 'team'
  from?: string
  tasks?: string[]
}

type InterviewModal = 'generate' | 'add' | 'setup' | 'mock' | null

type MockSession = {
  questions: LocalInterviewQuestion[]
  index: number
  remaining: number
  stage: 'answer' | 'feedback' | 'complete'
  score: number
  scores: number[]
}

const generatedInterviewQuestions: LocalInterviewQuestion[] = [
  { id: 'G1', category: '설계', question: '이전·다음 글 조회 쿼리는 어떻게 설계했나요?', answer: 'seriesId와 orderIndex 복합 인덱스로 양방향 범위 조회를 구성했습니다.', keywords: ['복합 인덱스', 'orderIndex', '범위 조회'], level: 2, source: 'generated', from: 'DP-10 · 이전/다음 글 조회', tasks: ['DP-10'] },
  { id: 'G2', category: '설계', question: '같은 독자가 같은 시리즈를 중복 구독하는 건 어떻게 막았나요?', answer: 'SUBSCRIPTION에 memberId와 seriesId 유니크 제약을 적용하고 충돌 시 409를 반환했습니다.', keywords: ['유니크 제약', '409', 'existsBy'], level: 1, source: 'generated', from: 'SUBSCRIPTION 테이블', tasks: ['DP-12'] },
  { id: 'G3', category: '보안', question: '다른 작가의 시리즈 발행 상태를 바꾸는 요청은 어떻게 막았나요?', answer: '서비스 계층에서 시리즈 소유자와 로그인 회원 ID를 비교하고 불일치 시 403을 반환했습니다.', keywords: ['소유권 검증', '403', '인가'], level: 2, source: 'generated', from: 'PATCH /series/{id}/status', tasks: ['DP-08'] },
  { id: 'G4', category: '성능', question: '태그 필터링 목록 조회에서 성능을 위해 고려한 점은?', answer: '발행 상태와 태그에 인덱스를 두고 DTO 조회와 페이징을 적용했습니다.', keywords: ['인덱스', 'DTO 조회', '페이징'], level: 2, source: 'generated', from: 'GET /api/series (태그 필터)', tasks: ['DP-11'] },
  { id: 'G5', category: '인프라', question: 'Railway/Render 배포 시 DB 비밀번호 같은 설정은 어떻게 관리했나요?', answer: '실제 값은 플랫폼 환경 변수로 주입하고 설정 파일에는 플레이스홀더만 남겼습니다.', keywords: ['환경 변수', '프로파일', '비밀 값'], level: 1, source: 'generated', from: 'DP-14 · 배포', tasks: ['DP-14'] },
  { id: 'G6', category: '협업', question: '코드 리뷰에서 받은 피드백으로 설계를 바꾼 경험이 있나요?', answer: '권한 접두사 피드백을 반영해 변환 로직을 수정하고 권한 테스트를 추가했습니다.', keywords: ['코드 리뷰', '테스트', '개선'], level: 1, source: 'generated', from: '팀 코드 리뷰', tasks: ['DP-04'] },
]

function InterviewPage() {
  const [tab,setTab]=useState<'bank'|'report'|'history'>('bank')
  const [search,setSearch]=useState('')
  const [questionList, setQuestionList] = useState<LocalInterviewQuestion[]>(() => blueprintInterviewQuestions.map((question) => ({ ...question, source: 'ai' })))
  const [modal, setModal] = useState<InterviewModal>(null)
  const [generationReady, setGenerationReady] = useState(false)
  const [generatedSelection, setGeneratedSelection] = useState<string[]>([])
  const [customQuestion, setCustomQuestion] = useState({ question: '', answer: '', keywords: '', category: '핵심 난제', task: '' })
  const [mockOptions, setMockOptions] = useState({ scope: 'all', count: 3, time: 90, follow: true, tts: false })
  const [mockSession, setMockSession] = useState<MockSession | null>(null)
  const [mockAnswer, setMockAnswer] = useState('')
  const questions=questionList.filter((question)=>`${question.question} ${question.keywords.join(' ')}`.toLowerCase().includes(search.toLowerCase()))
  const availableGenerated = generatedInterviewQuestions.filter((candidate) => !questionList.some((question) => question.id === candidate.id))

  useEffect(() => {
    if (modal !== 'generate') return
    setGenerationReady(false)
    const timer = window.setTimeout(() => setGenerationReady(true), 1500)
    return () => window.clearTimeout(timer)
  }, [modal])

  useEffect(() => {
    if (modal !== 'mock' || mockSession?.stage !== 'answer') return
    const timer = window.setInterval(() => setMockSession((current) => current && current.stage === 'answer' ? { ...current, remaining: Math.max(0, current.remaining - 1) } : current), 1000)
    return () => window.clearInterval(timer)
  }, [modal, mockSession?.stage, mockSession?.index])

  function addGeneratedQuestions() {
    const selected = generatedInterviewQuestions.filter((question) => generatedSelection.includes(question.id))
    setQuestionList((current) => [...current, ...selected])
    setGeneratedSelection([])
    setModal(null)
    showAuthToast({ message: `AI 질문 ${selected.length}개를 질문 은행에 추가했어요.`, durationMs: 1800 })
  }

  function addCustomQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const question = customQuestion.question.trim()
    if (!question) return
    const teamCount = questionList.filter((item) => item.source === 'team').length
    setQuestionList((current) => [...current, {
      id: `T${teamCount + 1}`,
      category: customQuestion.category,
      question,
      answer: customQuestion.answer.trim(),
      keywords: customQuestion.keywords.split(',').map((keyword) => keyword.trim()).filter(Boolean),
      level: 1,
      source: 'team',
      tasks: customQuestion.task ? [customQuestion.task] : [],
    }])
    setCustomQuestion({ question: '', answer: '', keywords: '', category: '핵심 난제', task: '' })
    setModal(null)
    showAuthToast({ message: '팀 질문이 추가되었습니다.', durationMs: 1800 })
  }

  function startMockInterview() {
    const pool = mockOptions.scope === 'new' ? questionList : [...questionList]
    const count = mockOptions.count === 99 ? pool.length : Math.min(mockOptions.count, pool.length)
    setMockSession({ questions: pool.slice(0, count), index: 0, remaining: mockOptions.time, stage: 'answer', score: 0, scores: [] })
    setMockAnswer('')
    setModal('mock')
  }

  function submitMockAnswer() {
    if (!mockSession) return
    const question = mockSession.questions[mockSession.index]
    const normalized = mockAnswer.toLowerCase()
    const matched = question.keywords.filter((keyword) => normalized.includes(keyword.toLowerCase())).length
    const score = Math.min(100, 40 + matched * 15 + (mockAnswer.trim().length >= 40 ? 15 : 0))
    setMockSession({ ...mockSession, stage: 'feedback', score })
  }

  function continueMockInterview() {
    if (!mockSession) return
    const scores = [...mockSession.scores, mockSession.score]
    if (mockSession.index + 1 >= mockSession.questions.length) {
      setMockSession({ ...mockSession, scores, stage: 'complete' })
      return
    }
    setMockAnswer('')
    setMockSession({ ...mockSession, scores, index: mockSession.index + 1, remaining: mockOptions.time, stage: 'answer', score: 0 })
  }
  return <main className="custom-scrollbar flex-1 overflow-y-auto p-8"><div className="mx-auto max-w-6xl space-y-6 pb-16">
    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><h1 className="flex items-center gap-2 text-2xl font-extrabold text-gray-900"><i className="fas fa-user-tie text-brand" />면접 준비</h1><p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500">AI가 우리 설계서에서 뽑은 질문에, 우리 코드로 답하는 연습 공간입니다. <button onClick={()=>go('/squad-blueprint','#roadmap')} type="button"><AiChip>AI 설계서 원본</AiChip></button></p></div><div className="flex flex-wrap gap-2"><button onClick={() => setModal('generate')} className="rounded-xl border border-teal-200 bg-white px-4 py-2.5 text-sm font-bold text-teal-700 shadow-sm" type="button"><i className="fas fa-magic mr-1" />AI에게 질문 더 받기</button><button onClick={() => setModal('add')} className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 shadow-sm" type="button"><i className="fas fa-plus mr-1" />직접 추가</button><button onClick={() => setModal('setup')} className="flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-bold text-white shadow-lg" type="button"><i className="fas fa-play" />모의 면접 시작</button></div></div>
    <section className="grid grid-cols-1 gap-4 lg:grid-cols-12"><Card className="flex items-center gap-5 p-6 lg:col-span-4"><div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-[9px] border-gray-100"><div className="text-center"><p className="text-2xl font-black text-gray-900">0</p><p className="-mt-1 text-[9px] font-bold text-gray-400">/ 100</p></div></div><div className="min-w-0"><p className="text-xs font-bold text-gray-400">면접 준비도</p><p className="text-lg font-black text-gray-900">이제 시작해요</p><p className="mt-1 text-[11px] leading-relaxed text-gray-500">답변 점수 70% + 자가 평가 30%로 계산합니다.</p></div></Card><div className="grid grid-cols-3 gap-4 lg:col-span-5">{[['답변 작성','0','/3','AI 3 · 팀 0'],['자신 있음','0','/3','자가 평가 😎'],['모의 면접','2','회','최근 02.19']].map(([label,value,unit,copy])=><Card key={label} className="p-5"><p className="text-xs font-bold text-gray-400">{label}</p><p className="mt-3 text-2xl font-black text-gray-900">{value}<span className="ml-0.5 text-xs text-gray-400">{unit}</span></p><p className="mt-1 text-[10px] text-gray-400">{copy}</p></Card>)}</div><section className="flex flex-col rounded-2xl border border-green-200 bg-[linear-gradient(135deg,#F0FDF4_0%,#F0FDFA_100%)] p-5 lg:col-span-3"><p className="text-xs font-extrabold text-teal-700"><i className="fas fa-pen mr-1" />오늘의 추천 연습</p><p className="mt-3 text-sm leading-snug font-extrabold text-gray-900">Article의 orderIndex 중간 삽입 시 재정렬은 어떻게 했나요?</p><p className="mt-2 text-[10px] text-gray-500">아직 답변하지 않은 질문이에요.</p><button className="mt-auto rounded-lg border border-green-200 bg-white py-2 text-xs font-bold text-teal-700" type="button">지금 연습하기 →</button></section></section>
    <div className="flex w-fit items-center gap-1 rounded-xl border border-gray-200 bg-gray-100 p-1">{([['bank','fa-layer-group','질문 은행'],['report','fa-chart-line','연습 리포트'],['history','fa-history','모의 면접 기록']] as const).map(([key,icon,label])=><button key={key} onClick={()=>setTab(key)} className={`rounded-lg border px-4 py-2 text-sm font-bold ${tab===key?'border-gray-200 bg-white text-gray-900 shadow-sm':'border-transparent text-gray-500'}`} type="button"><i className={`fas ${icon} mr-1.5`} />{label}</button>)}</div>
    {tab==='bank'?<section className="space-y-4"><Card className="flex flex-col gap-3 p-4 md:flex-row md:items-center"><div className="relative flex-1"><i className="fas fa-search absolute top-1/2 left-3 -translate-y-1/2 text-xs text-gray-400" /><input value={search} onChange={(event)=>setSearch(event.target.value)} className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pr-3 pl-8 text-xs outline-none focus:border-brand focus:bg-white" placeholder="질문 · 키워드 검색" /></div><div className="flex flex-wrap gap-1">{['전체','핵심 난제','성능','보안'].map((label,index)=><button key={label} className={`rounded-lg border px-2.5 py-2 text-xs font-bold ${index===0?'border-gray-900 bg-gray-900 text-white':'border-gray-200 bg-white text-gray-500'}`} type="button">{label}</button>)}</div><select className="rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs font-bold text-gray-600"><option>전체 상태</option></select><select className="rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs font-bold text-gray-600"><option>기본 순서</option></select></Card><div className="space-y-3">{questions.map((question,index)=><Card key={question.id} className="p-5"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><div className="mb-3 flex flex-wrap items-center gap-2"><span className="text-[10px] font-black text-gray-400">{question.id}</span><span className="rounded border border-purple-100 bg-purple-50 px-2 py-1 text-[9px] font-black text-purple-600">{question.category}</span>{question.source === 'team' ? <TeamChip>팀 추가</TeamChip> : <AiChip>{question.source === 'generated' ? 'AI 추가 생성' : 'AI 설계서 질문'}</AiChip>}<span className="text-[10px] font-bold text-gray-400">{'●'.repeat(question.level)}{'○'.repeat(3-question.level)}</span><span className={`text-[10px] font-bold ${index<2?'text-orange-500':'text-brand'}`}><i className={`fas ${index<2?'fa-triangle-exclamation':'fa-code'} mr-1`} />{index<2?'구현 전':'코드 근거 있음'}</span></div><h3 className="text-sm font-extrabold text-gray-900">Q. {question.question}</h3><p className="mt-3 text-[10px] font-bold text-gray-400"><i className="fas fa-key mr-1" />키워드 0/{question.keywords.length}<span className="mx-3">·</span><i className="fas fa-link mr-1" />꼬리 질문 {Math.max(1,3-index)}<span className="mx-3">·</span><i className="fas fa-users mr-1" />팀원 답변 {index===0?1:0}</p></div><div className="flex shrink-0 items-center gap-4"><span className="text-[10px] font-bold text-gray-400">미연습</span><i className="far fa-star text-gray-300" /><button className="h-8 w-8 rounded-lg text-gray-400" type="button"><i className="fas fa-chevron-down text-xs" /></button></div></div></Card>)}</div></section>:tab==='report'?<div className="grid grid-cols-1 gap-4 lg:grid-cols-2"><Card className="p-6"><h3 className="text-sm font-extrabold text-gray-900">모의 면접 평균 점수 추이</h3><p className="mt-2 text-xs text-gray-400">아직 기록된 답변 점수가 없습니다.</p><div className="mt-6 h-36 rounded-xl bg-gray-50" /></Card><Card className="p-6"><h3 className="text-sm font-extrabold text-gray-900">분류별 평균 점수</h3><p className="mt-2 text-xs text-gray-400">가장 약한 분류부터 보강하세요.</p><div className="mt-6 h-36 rounded-xl bg-gray-50" /></Card></div>:<div className="space-y-3">{['02.19 · 모의 면접 2회차','02.15 · 모의 면접 1회차'].map((title,index)=><Card key={title} className="flex items-center justify-between p-5"><div><p className="text-sm font-extrabold text-gray-900">{title}</p><p className="mt-1 text-xs text-gray-500">5문항 · 평균 {72-index*6}점</p></div><button className="text-xs font-bold text-brand" type="button">결과 보기</button></Card>)}</div>}
    {modal === 'generate' ? <div className="fixed inset-0 z-[1150] flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm"><section role="dialog" aria-labelledby="generate-question-title" className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"><header className="flex shrink-0 items-center justify-between border-b border-gray-100 p-6"><div><h2 id="generate-question-title" className="flex items-center gap-2 text-lg font-extrabold text-gray-900"><i className="fas fa-magic text-teal-500" />AI에게 질문 더 받기</h2><p className="mt-0.5 text-xs text-gray-500">설계서의 작업 · API · 테이블에서 아직 다루지 않은 주제를 찾아 질문을 만듭니다.</p></div><button aria-label="AI 질문 생성 닫기" onClick={() => setModal(null)} className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-900" type="button"><i className="fas fa-times" /></button></header><div className="custom-scrollbar flex-1 overflow-y-auto p-6">{generationReady ? availableGenerated.length ? <><p className="mb-3 text-xs text-gray-500">질문 {availableGenerated.length}개를 찾았어요. 연습할 질문을 골라 주세요.</p><div className="space-y-2">{availableGenerated.map((question) => <label key={question.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 p-4 transition hover:border-teal-200"><input aria-label={`${question.id} 질문 선택`} checked={generatedSelection.includes(question.id)} onChange={(event) => setGeneratedSelection((current) => event.target.checked ? [...current, question.id] : current.filter((id) => id !== question.id))} type="checkbox" className="mt-1 h-4 w-4 accent-emerald-500" /><span className="min-w-0 flex-1"><span className="mb-1 flex flex-wrap items-center gap-2"><span className="rounded border border-teal-100 bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-700">{question.category}</span><span className="text-[10px] font-bold text-gray-400">{'●'.repeat(question.level)}{'○'.repeat(3 - question.level)}</span><span className="text-[10px] font-bold text-teal-600"><i className="fas fa-link mr-1" />{question.from}</span></span><span className="block text-sm font-bold text-gray-900">{question.question}</span><span className="mt-1 block text-[10px] text-gray-400">{question.tasks?.map((task) => `#${task} 할 일`).join(' · ')}</span></span></label>)}</div></> : <p className="py-10 text-center text-sm font-bold text-gray-400">설계서에서 뽑을 수 있는 질문을 모두 추가했어요.</p> : <div className="py-10 text-center"><i className="fas fa-magic animate-pulse text-3xl text-teal-500" /><div className="mx-auto mt-5 w-fit space-y-1.5 text-left">{['개발 로드맵의 작업 14개 확인', 'API 명세 9개 · ERD 4개 테이블 분석', '기존 질문과 겹치는 주제 제외'].map((step) => <p key={step} className="text-xs font-bold text-gray-500"><i className="fas fa-check mr-1.5 text-brand" />{step}</p>)}</div></div>}</div><footer className="flex shrink-0 items-center justify-between border-t border-gray-100 bg-gray-50 p-5"><span className="text-xs font-bold text-gray-500">{generatedSelection.length ? `${generatedSelection.length}개 선택` : ''}</span><div className="flex gap-2"><button onClick={() => setModal(null)} className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50" type="button">닫기</button><button disabled={!generatedSelection.length} onClick={addGeneratedQuestions} className="rounded-xl bg-gray-900 px-6 py-2.5 text-sm font-bold text-white shadow-md disabled:opacity-40" type="button">선택한 질문 추가</button></div></footer></section></div> : null}

    {modal === 'add' ? <div className="fixed inset-0 z-[1150] flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm"><form role="dialog" aria-labelledby="add-question-title" onSubmit={addCustomQuestion} className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"><header className="flex items-center justify-between border-b border-gray-100 bg-gray-50 p-6"><h2 id="add-question-title" className="flex items-center gap-2 text-lg font-extrabold text-gray-900"><i className="fas fa-plus-circle text-brand" />팀 질문 추가</h2><button aria-label="팀 질문 추가 닫기" onClick={() => setModal(null)} className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400" type="button"><i className="fas fa-times" /></button></header><div className="space-y-4 p-6"><label className="block"><span className="mb-1.5 block text-xs font-bold text-gray-700">질문 <span className="text-red-500">*</span></span><input aria-label="질문" value={customQuestion.question} onChange={(event) => setCustomQuestion((current) => ({ ...current, question: event.target.value }))} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand" placeholder="예: 시리즈 삭제 시 글과 구독은 어떻게 처리했나요?" /></label><label className="block"><span className="mb-1.5 block text-xs font-bold text-gray-700">모범 답안</span><textarea aria-label="모범 답안" value={customQuestion.answer} onChange={(event) => setCustomQuestion((current) => ({ ...current, answer: event.target.value }))} className="h-20 w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand" /></label><label className="block"><span className="mb-1.5 block text-xs font-bold text-gray-700">핵심 키워드 <span className="font-normal text-gray-400">(쉼표로 구분 · AI 피드백 채점에 사용)</span></span><input aria-label="핵심 키워드" value={customQuestion.keywords} onChange={(event) => setCustomQuestion((current) => ({ ...current, keywords: event.target.value }))} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand" placeholder="예: cascade, 소프트 삭제, 고아 객체" /></label><div className="grid grid-cols-2 gap-3"><label><span className="mb-1.5 block text-xs font-bold text-gray-700">분류</span><select aria-label="질문 분류" value={customQuestion.category} onChange={(event) => setCustomQuestion((current) => ({ ...current, category: event.target.value }))} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand"><option>핵심 난제</option><option>성능</option><option>보안</option><option>설계</option><option>인프라</option><option>협업</option></select></label><label><span className="mb-1.5 block text-xs font-bold text-gray-700">관련 작업</span><select aria-label="관련 작업" value={customQuestion.task} onChange={(event) => setCustomQuestion((current) => ({ ...current, task: event.target.value }))} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand"><option value="">없음</option>{aiTasks.map((task) => <option key={task.id} value={task.id}>#{task.id} {task.title}</option>)}</select></label></div></div><footer className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50 p-5"><button onClick={() => setModal(null)} className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50" type="button">취소</button><button disabled={!customQuestion.question.trim()} className="rounded-xl bg-gray-900 px-6 py-2.5 text-sm font-bold text-white shadow-md disabled:opacity-40" type="submit">추가하기</button></footer></form></div> : null}

    {modal === 'setup' ? <div className="fixed inset-0 z-[1150] flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm"><section role="dialog" aria-labelledby="mock-setup-title" className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl"><header className="flex items-center justify-between border-b border-gray-100 p-6"><h2 id="mock-setup-title" className="flex items-center gap-2 text-lg font-extrabold text-gray-900"><i className="fas fa-sliders-h text-brand" />모의 면접 설정</h2><button aria-label="모의 면접 설정 닫기" onClick={() => setModal(null)} className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100" type="button"><i className="fas fa-times" /></button></header><div className="space-y-5 p-6"><div><p className="mb-2 text-xs font-bold text-gray-700">출제 범위</p><div className="flex flex-wrap gap-1.5">{[['all','전체 무작위'],['weak','약한 질문 우선'],['new','미연습만']].map(([value,label]) => <button key={value} onClick={() => setMockOptions((current) => ({ ...current, scope: value }))} className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${mockOptions.scope === value ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-700'}`} type="button">{label}</button>)}</div></div><div className="grid grid-cols-2 gap-4"><div><p className="mb-2 text-xs font-bold text-gray-700">문항 수</p><div className="flex gap-1.5">{[3,5,99].map((value) => <button key={value} onClick={() => setMockOptions((current) => ({ ...current, count: value }))} className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${mockOptions.count === value ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200'}`} type="button">{value === 99 ? '전체' : value}</button>)}</div></div><div><p className="mb-2 text-xs font-bold text-gray-700">답변 시간</p><div className="flex gap-1.5">{[60,90,120].map((value) => <button key={value} onClick={() => setMockOptions((current) => ({ ...current, time: value }))} className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${mockOptions.time === value ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200'}`} type="button">{value}초</button>)}</div></div></div><div className="space-y-2.5"><label className="flex cursor-pointer items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-3"><span><span className="block text-sm font-bold text-gray-900">꼬리 질문 포함</span><span className="block text-[11px] text-gray-500">답변 후 면접관이 한 번 더 파고듭니다.</span></span><input aria-label="꼬리 질문 포함" checked={mockOptions.follow} onChange={(event) => setMockOptions((current) => ({ ...current, follow: event.target.checked }))} type="checkbox" className="h-5 w-5 accent-emerald-500" /></label><label className="flex cursor-pointer items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-3"><span><span className="block text-sm font-bold text-gray-900">면접관 음성으로 질문 읽기</span><span className="block text-[11px] text-gray-500">브라우저 음성 합성 기능을 사용합니다.</span></span><input aria-label="면접관 음성으로 질문 읽기" checked={mockOptions.tts} onChange={(event) => setMockOptions((current) => ({ ...current, tts: event.target.checked }))} type="checkbox" className="h-5 w-5 accent-emerald-500" /></label></div></div><footer className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50 p-5"><button onClick={() => setModal(null)} className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-600" type="button">취소</button><button onClick={startMockInterview} className="rounded-xl bg-gray-900 px-6 py-2.5 text-sm font-bold text-white shadow-md" type="button"><i className="fas fa-play mr-1" />시작하기</button></footer></section></div> : null}

    {modal === 'mock' && mockSession ? <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-gray-900/85 p-4 backdrop-blur-sm"><section role="dialog" aria-labelledby="mock-title" className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"><header className="flex shrink-0 items-center justify-between border-b border-gray-100 px-7 py-4"><div className="flex items-center gap-3"><h2 id="mock-title" className="flex items-center gap-2 text-sm font-extrabold text-gray-900"><i className="fas fa-user-tie text-brand" />모의 면접</h2><div className="flex gap-1">{mockSession.questions.map((question, index) => <span key={question.id} className={`h-1.5 w-6 rounded-full ${index < mockSession.index ? 'bg-brand' : index === mockSession.index ? 'bg-gray-900' : 'bg-gray-200'}`} />)}</div></div><button onClick={() => { setModal(null); setMockSession(null) }} className="text-xs font-bold text-gray-400 hover:text-red-500" type="button">그만하기 <i className="fas fa-times ml-1" /></button></header><div className="custom-scrollbar flex-1 overflow-y-auto p-7">{mockSession.stage === 'answer' ? <div><div className="mb-6 flex items-start gap-5"><div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-[6px] border-brand text-lg font-black text-gray-900">{mockSession.remaining}</div><div className="min-w-0 flex-1"><p className="text-xs font-bold text-gray-400">면접관 · {mockSession.questions[mockSession.index].id} {mockSession.questions[mockSession.index].category}</p><h3 className="mt-2 text-xl font-black text-gray-900">{mockSession.questions[mockSession.index].question}</h3><p className="mt-2 text-xs text-gray-400">{mockOptions.time}초 안에 답해 주세요. 말로 답하면 자동으로 받아 적습니다.</p></div></div><div className="overflow-hidden rounded-xl border border-gray-200"><textarea aria-label="모의 면접 답변" value={mockAnswer} onChange={(event) => setMockAnswer(event.target.value)} className="h-36 w-full resize-none p-4 text-sm outline-none" placeholder="답변을 입력하거나 [말로 답하기]를 누르세요." /><div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 p-3"><button onClick={() => showAuthToast({ message: '브라우저 음성 입력을 준비했습니다.', durationMs: 1800 })} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-600" type="button"><i className="fas fa-microphone mr-1" />말로 답하기</button><button onClick={submitMockAnswer} className="rounded-lg bg-gray-900 px-5 py-2 text-xs font-bold text-white" type="button">답변 제출 <i className="fas fa-arrow-right ml-1" /></button></div></div></div> : mockSession.stage === 'feedback' ? <div><div className="mb-5 flex items-center gap-4"><div className="flex h-16 w-16 flex-col items-center justify-center rounded-2xl bg-brand text-white"><span className="text-2xl font-black leading-none">{mockSession.score}</span><span className="text-[9px] font-bold">점수</span></div><div><p className="text-xs font-bold text-gray-400">{mockSession.questions[mockSession.index].id} 답변 피드백</p><h3 className="mt-1 text-base font-black text-gray-900">{mockSession.questions[mockSession.index].question}</h3></div></div><div className="rounded-xl border border-green-100 bg-green-50 p-5"><p className="text-xs font-extrabold text-green-700">모범 답안</p><p className="mt-2 text-sm leading-relaxed text-gray-700">{mockSession.questions[mockSession.index].answer}</p><div className="mt-3 flex flex-wrap gap-1.5">{mockSession.questions[mockSession.index].keywords.map((keyword) => <span key={keyword} className="rounded border border-green-200 bg-white px-2 py-1 text-[10px] font-bold text-green-700">{keyword}</span>)}</div></div><div className="mt-6 text-center"><p className="mb-3 text-xs font-bold text-gray-500">답변할 때 얼마나 자신 있었나요?</p><div className="flex justify-center gap-2">{[['😵','막혔어요'],['🤔','애매해요'],['😎','자신 있어요']].map(([emoji,label]) => <button key={label} onClick={continueMockInterview} className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 hover:border-brand hover:bg-green-50" type="button"><span className="mr-1">{emoji}</span>{label}</button>)}</div></div></div> : <div className="py-6 text-center"><div className="mx-auto mb-4 flex h-20 w-20 flex-col items-center justify-center rounded-3xl bg-brand text-white shadow-lg"><span className="text-3xl font-black leading-none">{Math.round(mockSession.scores.reduce((sum, score) => sum + score, 0) / Math.max(1, mockSession.scores.length))}</span><span className="text-[10px] font-bold">평균</span></div><h3 className="text-xl font-black text-gray-900">모의 면접 완료!</h3><p className="mt-2 text-sm text-gray-500">답변 기록을 질문 은행의 연습 리포트에 반영했습니다.</p><button onClick={() => { setModal(null); setMockSession(null); setTab('history') }} className="mt-6 rounded-xl bg-gray-900 px-6 py-3 text-sm font-bold text-white" type="button">기록 확인하기</button></div>}</div></section></div> : null}
  </div></main>
}
type SettingsTab = 'general' | 'members' | 'integrations' | 'ai' | 'danger'

function SettingsPage() {
  const [tab, setTab] = useState<SettingsTab>('general')
  const [isPublic, setIsPublic] = useState(true)
  const [githubLinked, setGithubLinked] = useState(true)
  const [discordLinked, setDiscordLinked] = useState(false)
  const [memberRoles, setMemberRoles] = useState<Record<number, string>>({ 2: 'Backend', 3: 'Designer' })
  const tabs = [
    ['general', '일반 설정', 'fa-sliders-h'],
    ['members', '팀원 관리', 'fa-users'],
    ['integrations', '외부 연동 (API)', 'fa-plug'],
    ['ai', 'AI 설계', 'fa-magic'],
  ] as const

  return (
    <main className="relative flex flex-1 overflow-hidden">
      <aside className="z-10 flex w-64 shrink-0 flex-col border-r border-gray-100 bg-white shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <div className="border-b border-gray-50 p-6 pb-4">
          <h2 className="flex items-center gap-2 text-lg font-extrabold text-gray-900"><i className="fas fa-cog text-brand" /> 환경 설정</h2>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {tabs.map(([key, label, icon]) => (
            <button key={key} onClick={() => setTab(key)} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition ${tab === key ? 'bg-gray-100 text-brand' : 'text-gray-600 hover:bg-gray-50'}`} type="button">
              <i className={`fas ${icon} w-4 text-center`} /> {label}
              {key === 'ai' ? <span className="ml-auto rounded-full bg-brand px-1.5 py-0.5 text-[9px] font-black text-white">AI</span> : null}
            </button>
          ))}
          <div className="mx-2 my-2 h-px bg-gray-100" />
          <button onClick={() => setTab('danger')} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition ${tab === 'danger' ? 'bg-red-50 text-red-600' : 'text-red-500 hover:bg-red-50'}`} type="button">
            <i className="fas fa-exclamation-triangle w-4 text-center" /> 위험 구역
          </button>
        </nav>
      </aside>

      <section className="custom-scrollbar flex-1 overflow-y-auto bg-[#F9FAFB] p-8 lg:p-12">
        <div className="mx-auto max-w-4xl pb-20">
          {tab === 'general' ? (
            <div className="space-y-8">
              <SettingsTitle title="일반 설정" copy="스쿼드의 기본 정보와 공개 범위를 설정합니다." />
              <Card className="space-y-6 p-8">
                <div className="flex items-center justify-between gap-3 rounded-xl border border-teal-100 bg-teal-50 px-4 py-3">
                  <p className="flex items-center gap-2 text-xs font-medium text-teal-800"><i className="fas fa-magic" /> 아래 항목은 AI 설계서에서 자동으로 채워졌습니다. 자유롭게 수정하세요.</p>
                  <button onClick={() => setTab('ai')} className="shrink-0 text-[11px] font-bold text-teal-700 hover:underline" type="button">AI 설계 설정 →</button>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <SettingField label="프로젝트 명" value={aiSquadProject.title} required ai />
                  <SettingField label="스쿼드 이름" value={aiSquadProject.squadName} required />
                </div>
                <SettingField label="프로젝트 목표 (한 줄 설명)" value={aiSquadProject.oneLiner} ai />
                <SettingField label="상세 설명" value={aiSquadProject.summary} multiline ai />
                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-700">기술 스택 <AiChip>아키텍처 &amp; DB</AiChip></label>
                  <div className="flex flex-wrap gap-1.5 rounded-xl border border-gray-200 bg-gray-50/50 p-3">
                    {Object.entries(aiSquadProject.stack).flatMap(([group, stacks]) => stacks.map((stack) => (
                      <span key={stack} className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-bold text-gray-700"><span className="mr-1 text-[9px] text-gray-400">{group}</span>{stack}</span>
                    )))}
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-gray-100 pt-6">
                  <div><h4 className="mb-1 text-sm font-bold text-gray-900">스쿼드 공개 설정</h4><p className="text-xs text-gray-500">포트폴리오 탭에서 이 스쿼드를 외부인에게 공개할지 결정합니다.</p></div>
                  <SettingsToggle checked={isPublic} onChange={setIsPublic} label="스쿼드 공개 설정" />
                </div>
              </Card>
              <div className="flex justify-end"><button className="flex items-center gap-2 rounded-xl bg-gray-900 px-8 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-black" type="button"><i className="fas fa-save" /> 변경사항 저장</button></div>
            </div>
          ) : tab === 'members' ? (
            <div className="space-y-8">
              <div className="flex items-end justify-between"><SettingsTitle title="팀원 관리" copy="참여 중인 팀원을 관리하고 권한을 부여합니다." /><button className="flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-white shadow-md" type="button"><i className="fas fa-user-plus" /> 팀원 초대</button></div>
              <Card className="overflow-hidden">
                <div className="grid grid-cols-12 items-center gap-4 border-b border-gray-100 bg-gray-50/50 p-4 text-xs font-extrabold tracking-wider text-gray-500 uppercase"><div className="col-span-5 pl-4">이름 / 이메일</div><div className="col-span-3">역할 (Role)</div><div className="col-span-2 text-center">상태</div><div className="col-span-2 pr-4 text-right">관리</div></div>
                {aiSquadMembers.map((member, index) => (
                  <div key={member.memberId} className="grid grid-cols-12 items-center gap-4 border-b border-gray-50 p-4 last:border-0">
                    <div className="col-span-5 flex items-center gap-4 pl-4"><AiMemberAvatar name={member.learnerName} className="h-10 w-10 border border-gray-200 bg-white" /><div><p className="flex items-center gap-1.5 text-sm font-bold text-gray-900">{member.learnerName}{index === 0 ? <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[9px] text-gray-600 uppercase">나</span> : null}</p><p className="text-xs text-gray-500">{['taehyung@devpath.com', 'dev.kim@gmail.com', 'sarah.park@gmail.com'][index]}</p></div></div>
                    <div className="col-span-3">{index === 0 ? <span className="flex w-fit items-center gap-1.5 rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-1 text-xs font-bold text-yellow-600"><i className="fas fa-crown" /> 방장 (Owner)</span> : <select value={memberRoles[member.memberId]} onChange={(event) => { setMemberRoles((current) => ({ ...current, [member.memberId]: event.target.value })); showAuthToast({ message: '권한이 변경되었습니다.', durationMs: 1800 }) }} className="cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 shadow-sm outline-none focus:border-brand"><option>Frontend</option><option>Backend</option><option>Fullstack</option><option>Designer</option><option>Guest</option></select>}</div>
                    <div className="col-span-2 text-center"><span className={`flex items-center justify-center gap-1 text-xs font-bold ${index < 2 ? 'text-green-500' : 'text-gray-400'}`}><span className={`h-1.5 w-1.5 rounded-full ${index < 2 ? 'bg-green-500' : 'border-2 border-gray-400'}`} />{index < 2 ? '온라인' : '오프라인'}</span></div>
                    <div className="col-span-2 flex justify-end pr-4">{index === 0 ? <span className="text-xs font-medium text-gray-400">-</span> : <button title="추방하기" className="h-8 w-8 rounded-lg text-gray-400 transition hover:bg-red-50 hover:text-red-500" type="button"><i className="fas fa-sign-out-alt" /></button>}</div>
                  </div>
                ))}
              </Card>
            </div>
          ) : tab === 'integrations' ? (
            <div className="space-y-8">
              <SettingsTitle title="외부 서비스 연동" copy="GitHub 저장소, Discord/Slack 웹훅을 연결하여 알림을 자동화하세요." />
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <IntegrationCard icon="fab fa-github" title="GitHub Repository" copy="PR 및 커밋 내역 자동 연동" color="bg-gray-900" linked={githubLinked} value="https://github.com/taehyung/indie-publishing-platform" onToggle={() => setGithubLinked((current) => !current)} />
                <IntegrationCard icon="fab fa-discord" title="Discord Webhook" copy="칸반 변동사항 채널 알림 발송" color="bg-[#5865F2]" linked={discordLinked} value="" onToggle={() => setDiscordLinked((current) => !current)} />
              </div>
            </div>
          ) : tab === 'ai' ? (
            <div className="space-y-8">
              <div className="flex items-end justify-between gap-4"><SettingsTitle title="AI 설계" copy="이 워크스페이스를 만든 AI 설계서의 생성 조건과 반영 범위를 관리합니다." /><button onClick={() => go('/squad-blueprint')} className="flex shrink-0 items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-bold text-white shadow-md" type="button"><i className="fas fa-book-open" /> 설계서 보기</button></div>
              <Card className="space-y-6 p-8"><h4 className="text-sm font-extrabold text-gray-900">생성 조건</h4><div className="grid grid-cols-1 gap-4 md:grid-cols-3">{[['프로젝트 분야', '콘텐츠 플랫폼'], ['난이도', aiSquadProject.difficulty], ['개발 기간', '5주']].map(([label, value]) => <div key={label} className="rounded-xl border border-gray-100 bg-gray-50 p-4"><p className="mb-1 text-[11px] font-bold text-gray-400">{label}</p><p className="break-words text-sm font-extrabold text-gray-900">{value}</p></div>)}</div><p className="text-[11px] font-medium text-gray-400"><i className="far fa-clock mr-1" />2026-02-09 생성 · DevPath AI Builder</p></Card>
              <Card className="p-8"><h4 className="mb-1 text-sm font-extrabold text-gray-900">워크스페이스 반영 항목</h4><p className="mb-5 text-xs text-gray-500">설계서를 다시 생성할 때 어떤 메뉴에 자동 반영할지 선택합니다. 이미 반영된 내용은 유지됩니다.</p><div className="divide-y divide-gray-100">{[['fa-tasks', '작업 현황판', '로드맵과 MVP 기능을 작업으로 반영'], ['fa-project-diagram', 'ERD 설계', '엔티티와 관계를 다이어그램에 반영'], ['fa-plug', 'API 명세서', '엔드포인트와 요청·응답 예시 반영'], ['fa-user-tie', '면접 준비', '핵심 난제 기반 질문 반영']].map(([icon, label, copy]) => <div key={label} className="flex items-center justify-between py-3.5"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-100 bg-gray-50 text-gray-500"><i className={`fas ${icon} text-sm`} /></span><div><p className="text-sm font-bold text-gray-900">{label}</p><p className="text-[11px] text-gray-500">{copy}</p></div></div><SettingsToggle checked onChange={() => undefined} label={`${label} 자동 반영`} /></div>)}</div></Card>
              <div className="flex flex-col justify-between gap-4 rounded-2xl border border-orange-200 bg-orange-50/40 p-6 md:flex-row md:items-center"><div><h4 className="mb-1 font-bold text-gray-900">설계서 다시 생성하기</h4><p className="text-xs leading-relaxed text-gray-500">난이도나 스택을 바꿔 새 설계서를 받습니다. 새 설계서는 비교 후 선택한 항목만 반영됩니다.</p></div><button className="shrink-0 rounded-xl border border-orange-300 bg-white px-5 py-2.5 text-sm font-bold text-orange-600 shadow-sm" type="button"><i className="fas fa-redo-alt mr-1" /> AI 빌더 열기</button></div>
            </div>
          ) : (
            <div className="space-y-8">
              <SettingsTitle title="위험 구역 (Danger Zone)" copy="스쿼드의 삭제 및 보관 처리는 되돌릴 수 없으니 주의하세요." danger />
              <div className="flex flex-col gap-6 rounded-2xl border-2 border-red-200 bg-red-50/30 p-6"><div className="flex items-center justify-between border-b border-red-100 pb-6"><div><h4 className="mb-1 font-bold text-gray-900">스쿼드 보관 (Archive)</h4><p className="text-xs leading-relaxed text-gray-500">프로젝트가 완료되었나요? 읽기 전용 상태로 전환하여 데이터를 안전하게 보관합니다.<br />팀원들은 더 이상 칸반이나 코드를 수정할 수 없습니다.</p></div><button className="shrink-0 rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-bold text-gray-700 shadow-sm" type="button">스쿼드 보관하기</button></div><div className="flex items-center justify-between"><div><h4 className="mb-1 font-bold text-gray-900">스쿼드 영구 삭제 (Delete)</h4><p className="text-xs leading-relaxed text-gray-500">모든 데이터, 파일, 칸반 보드 내역이 즉시 삭제되며 절대 복구할 수 없습니다.</p></div><button className="shrink-0 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm" type="button">스쿼드 삭제하기</button></div></div>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}

function SettingsTitle({ title, copy, danger = false }: { title: string; copy: string; danger?: boolean }) {
  return <div><h3 className={`mb-1 text-xl font-black ${danger ? 'text-red-600' : 'text-gray-900'}`}>{title}</h3><p className="text-sm font-medium text-gray-500">{copy}</p></div>
}

function SettingField({ label, value, multiline = false, required = false, ai = false }: { label: string; value: string; multiline?: boolean; required?: boolean; ai?: boolean }) {
  const labelNode = <label className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-700">{label}{required ? <span className="text-red-500">*</span> : null}{ai ? <AiChip>AI</AiChip> : null}</label>
  return <div>{labelNode}{multiline ? <textarea defaultValue={value} className="custom-scrollbar h-24 w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-brand" /> : <input defaultValue={value} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-brand" />}</div>
}

function SettingsToggle({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return <button role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={`relative h-6 w-12 shrink-0 rounded-full transition ${checked ? 'bg-brand' : 'bg-gray-300'}`} type="button"><span className={`absolute top-0 h-6 w-6 rounded-full border-4 bg-white transition-all ${checked ? 'right-0 border-brand' : 'left-0 border-gray-200'}`} /></button>
}

function IntegrationCard({ icon, title, copy, color, linked, value, onToggle }: { icon: string; title: string; copy: string; color: string; linked: boolean; value: string; onToggle: () => void }) {
  return <Card className="group relative overflow-hidden p-6 transition hover:border-gray-300"><div className={`absolute top-0 left-0 h-full w-1 ${color}`} /><div className="mb-4 flex items-start justify-between pl-2"><div className="flex items-center gap-3"><i className={`${icon} text-3xl ${title.startsWith('Discord') ? 'text-[#5865F2]' : 'text-gray-900'}`} /><div><h4 className="font-bold text-gray-900">{title}</h4><p className="text-[10px] font-medium text-gray-500">{copy}</p></div></div><span className={`rounded border px-2 py-0.5 text-[10px] font-bold ${linked ? 'border-green-200 bg-green-50 text-green-600' : 'border-gray-200 bg-gray-100 text-gray-500'}`}>{linked ? '연결됨' : '미연결'}</span></div><input value={value} readOnly={linked} placeholder="Webhook URL 입력" className="mb-4 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-500 outline-none" /><button onClick={onToggle} className={`w-full rounded-lg py-2 text-xs font-bold transition ${linked ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : title.startsWith('Discord') ? 'bg-[#5865F2] text-white hover:bg-[#4752C4]' : 'bg-gray-900 text-white'}`} type="button">{linked ? '연결 해제' : '연결하기'}</button></Card>
}

function CurrentPage({ route }: { route: AiRoute }) {
  if(route==='/squad-dashboard') return <DashboardPage />
  if(route==='/squad-blueprint') return <BlueprintPage />
  if(route==='/squad-workspace') return <WorkspacePage />
  if(route==='/squad-review') return <ReviewPage />
  if(route==='/squad-erd') return <ErdPage />
  if(route==='/squad-api') return <ApiPage />
  if(route==='/squad-schedule') return <SchedulePage />
  if(route==='/squad-files') return <FilesPage />
  if(route==='/squad-meeting') return <MeetingPage />
  if(route==='/squad-interview') return <InterviewPage />
  return <SettingsPage />
}

export default function AiSquadWorkspaceApp() {
  const pathname=window.location.pathname.replace(/\/+$/,'') || '/squad-dashboard'
  const route=pathname in routePage ? pathname as AiRoute : '/squad-dashboard'

  useEffect(() => {
    document.title=`DevPath - ${routeTitle[route]}`
  }, [route])

  if(route==='/squad-meeting') return <MeetingPage />
  return <AiShell activePage={routePage[route]} showHeader={route !== '/squad-erd'}><CurrentPage route={route} /></AiShell>
}
