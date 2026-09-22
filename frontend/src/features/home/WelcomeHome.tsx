import { useEffect, useState, type ReactNode } from 'react'
import { homeApi } from '../../lib/api/home'
import { navigateTo } from '../../lib/spa-navigation'
import type { AuthenticatedHomeDashboard } from '../../types/home'
import WelcomeHomeDashboard from './WelcomeHomeDashboard'

type WelcomeHomeProps = { displayName: string }

type PromotionSlide = {
  backgroundClass: string
  glowClass?: string
  badge: ReactNode
  title: ReactNode
  description: ReactNode
  decoration: ReactNode
  buttonClass: string
  buttonTextClass: string
  buttonLabel: string
  buttonIcon: string
  href: string
}

const promotionSlides: PromotionSlide[] = [
  {
    backgroundClass: 'from-[#0f172a] via-[#111827] to-[#1e293b]', glowClass: 'right-0 top-0 translate-x-1/3 -translate-y-1/3 bg-[#00c471]/20',
    badge: <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-[#00c471]/30 bg-[#00c471]/20 px-2.5 py-1 text-[10px] font-black text-[#00c471]"><i className="fas fa-magic" aria-hidden="true"></i> AI BUILDER</span>,
    title: <>토이 프로젝트는 그만,<br /><span className="text-[#00c471]">실무형 설계도</span>를 1분 만에.</>,
    description: <>아이디어만 적어주세요. DevPath AI가 현업 수준의 DB ERD와 REST API 명세서를 즉시 생성합니다.</>,
    decoration: <i className="fas fa-robot text-8xl text-[#00c471] drop-shadow-[0_0_30px_rgba(0,196,113,0.5)]" aria-hidden="true"></i>,
    buttonClass: 'bg-[#00c471] hover:bg-[#22c55e] shadow-[0_0_15px_rgba(0,196,113,0.3)]',
    buttonTextClass: 'text-white',
    buttonLabel: 'AI 아키텍처 생성하기', buttonIcon: 'fas fa-arrow-right', href: '/project-create',
  },
  {
    backgroundClass: 'from-[#1e3a8a] via-[#312e81] to-[#172554]', glowClass: 'left-0 bottom-0 -translate-x-1/3 translate-y-1/3 bg-[#3b82f6]/20',
    badge: <span className="mb-4 inline-block rounded-full border border-[#60a5fa]/50 bg-[#3b82f6]/30 px-2.5 py-1 text-[10px] font-black text-[#bfdbfe]">TEAM SQUAD</span>,
    title: <>나와 딱 맞는 <span className="text-[#60a5fa]">최고의 팀원</span>을<br />찾는 가장 빠른 방법</>,
    description: <>프론트엔드부터 백엔드까지, 검증된 실력을 가진 동료들과 함께 칸반 보드로 진짜 협업을 시작하세요.</>,
    decoration: <span className="flex -space-x-4"><i className="fas fa-user-circle text-7xl text-[#93c5fd]" aria-hidden="true"></i><i className="fas fa-user-circle z-10 text-8xl text-[#60a5fa]" aria-hidden="true"></i><i className="fas fa-user-circle text-7xl text-[#93c5fd]" aria-hidden="true"></i></span>,
    buttonClass: 'bg-white hover:bg-[#eff6ff] shadow-lg',
    buttonTextClass: 'text-[#1e3a8a]',
    buttonLabel: '스쿼드 라운지 입장', buttonIcon: 'fas fa-door-open', href: '/community-lounge',
  },
  {
    backgroundClass: 'from-[#134e4a] via-[#064e3b] to-[#042f2e]',
    badge: <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-[#34d399]/50 bg-[#10b981]/30 px-2.5 py-1 text-[10px] font-black text-[#a7f3d0]"><i className="fas fa-route" aria-hidden="true"></i> CURATED ROADMAP</span>,
    title: <>어떤 기술부터 배워야 할지<br /><span className="text-[#34d399]">막막하신가요?</span></>,
    description: <>내 현재 실력을 진단하고, 목표 직무에 딱 맞는 1:1 최적의 학습 경로를 AI가 설계해 드립니다.</>,
    decoration: <i className="fas fa-map-marked-alt text-8xl text-[#34d399] drop-shadow-[0_0_30px_rgba(52,211,153,0.4)]" aria-hidden="true"></i>,
    buttonClass: 'bg-[#10b981] hover:bg-[#34d399] shadow-[0_0_15px_rgba(16,185,129,0.4)]',
    buttonTextClass: 'text-white',
    buttonLabel: '내 맞춤 로드맵 찾기', buttonIcon: 'fas fa-search', href: '/roadmap-hub',
  },
  {
    backgroundClass: 'from-[#78350f] via-[#7c2d12] to-[#451a03]',
    badge: <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-[#fb923c]/50 bg-[#f97316]/30 px-2.5 py-1 text-[10px] font-black text-[#fed7aa]"><i className="fas fa-chart-line" aria-hidden="true"></i> JOB ANALYSIS</span>,
    title: <>내 스킬셋으로 갈 수 있는<br /><span className="text-[#fb923c]">기업 리스트</span> 분석</>,
    description: <>원티드, 프로그래머스 채용 공고를 실시간 분석하여 지금 나에게 가장 필요한 기술이 무엇인지 알려드립니다.</>,
    decoration: <i className="fas fa-chart-pie text-8xl text-[#fb923c] drop-shadow-[0_0_30px_rgba(251,146,60,0.4)]" aria-hidden="true"></i>,
    buttonClass: 'bg-[#f97316] hover:bg-[#ea580c] shadow-[0_0_15px_rgba(249,115,22,0.4)]',
    buttonTextClass: 'text-white',
    buttonLabel: '내 시장 가치 확인하기', buttonIcon: 'fas fa-chart-bar', href: '/job-matching',
  },
  {
    backgroundClass: 'from-[#581c87] via-[#701a75] to-[#3b0764]',
    badge: <span className="mb-4 inline-block rounded-full border border-[#e879f9]/50 bg-[#d946ef]/30 px-2.5 py-1 text-[10px] font-black text-[#f5d0fe]">SHOWCASE</span>,
    title: <>배포된 프로젝트가 곧<br /><span className="text-[#e879f9]">완벽한 이력서</span>가 됩니다.</>,
    description: <>DevPath가 제공하는 커스텀 도메인(<span className="font-mono text-[#f0abfc]">*.devpath.app</span>)으로 결과물을 라이브 배포하고 실력을 증명하세요.</>,
    decoration: <i className="fas fa-rocket text-8xl text-[#e879f9] drop-shadow-[0_0_30px_rgba(232,121,249,0.4)]" aria-hidden="true"></i>,
    buttonClass: 'bg-[#d946ef] hover:bg-[#e879f9] shadow-[0_0_15px_rgba(217,70,239,0.4)]',
    buttonTextClass: 'text-white',
    buttonLabel: '런칭된 프로젝트 구경하기', buttonIcon: 'fas fa-globe', href: '/dev-showcase',
  },
]

export default function WelcomeHome({ displayName }: WelcomeHomeProps) {
  const [slideIndex, setSlideIndex] = useState(0)
  const [rotationVersion, setRotationVersion] = useState(0)
  const [reloadVersion, setReloadVersion] = useState(0)
  const [dashboard, setDashboard] = useState<AuthenticatedHomeDashboard | null>(null)
  const [dashboardError, setDashboardError] = useState<string | null>(null)
  const [dashboardLoading, setDashboardLoading] = useState(true)
  const greetingName = displayName === '이태형' ? '태형' : displayName

  useEffect(() => {
    const interval = window.setInterval(() => setSlideIndex((index) => (index + 1) % promotionSlides.length), 5000)
    return () => window.clearInterval(interval)
  }, [rotationVersion])

  useEffect(() => {
    const controller = new AbortController()
    setDashboardLoading(true)
    setDashboardError(null)
    homeApi.getDashboard(controller.signal)
      .then(setDashboard)
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return
        setDashboard(null)
        setDashboardError(reason instanceof Error ? reason.message : '홈 데이터를 불러오지 못했습니다.')
      })
      .finally(() => { if (!controller.signal.aborted) setDashboardLoading(false) })
    return () => controller.abort()
  }, [reloadVersion])

  function selectSlide(index: number) {
    setSlideIndex(index)
    setRotationVersion((version) => version + 1)
  }

  return (
    <div className="overflow-x-hidden bg-[#F8F9FA] text-[#1f2937]">
      <div className="px-4 pt-4 pb-16 sm:px-6">
        <div className="mx-auto w-full max-w-[1200px] [&>*+*]:mt-6">
          <div className="mt-1 mb-1 flex shrink-0 flex-col items-start justify-between gap-4 md:flex-row md:items-end">
            <div>
              <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-[#bbf7d0] bg-[#f0fdf4] px-2.5 py-1 text-[10px] font-black text-[#00c471] shadow-xs">🚀 개발자 커리어 가속화 플랫폼</span>
              <h1 className="mb-2 text-2xl leading-tight font-black tracking-tight text-[#111827] sm:text-3xl">성장의 길을 찾다, <span className="bg-[linear-gradient(135deg,#00C471_0%,#0D9488_100%)] bg-clip-text [-webkit-text-fill-color:transparent]">DevPath</span></h1>
              <p className="text-[13px] font-medium text-[#6b7280]">막막한 독학은 그만. AI 진단부터 로드맵 추천, 실전 프로젝트, 그리고 취업 매칭까지 하나의 플랫폼에서 해결하세요.</p>
            </div>
            <div className="flex shrink-0 gap-2.5">
              <button className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#00c471] px-5 py-2.5 text-xs! leading-4! font-bold text-white shadow-md shadow-[#22c55e]/20 transition hover:bg-[#16a34a]" onClick={() => navigateTo('/survey')} type="button"><i className="fas fa-magic" aria-hidden="true"></i> AI 로드맵 추천받기</button>
              <button className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#e5e7eb] bg-white px-5 py-2.5 text-xs! leading-4! font-bold text-[#374151] shadow-xs transition hover:border-[#9ca3af] hover:bg-[#f9fafb]" onClick={() => navigateTo('/roadmap-hub')} type="button"><i className="fas fa-map" aria-hidden="true"></i> 로드맵 둘러보기</button>
            </div>
          </div>

          <div className="group relative h-[260px] w-full overflow-hidden rounded-3xl shadow-[0_10px_30px_-10px_rgba(0,0,0,0.15)]">
            <div className="flex h-full transition-transform duration-600 ease-[cubic-bezier(0.25,1,0.2,1)]" style={{ transform: `translateX(-${slideIndex * 100}%)` }} data-testid="welcome-carousel-track">
              {promotionSlides.map((slide, index) => (
                <div key={slide.href} className={`relative flex min-w-full shrink-0 items-center justify-between overflow-hidden bg-linear-to-r [--tw-gradient-position:to_right] px-14 text-white ${slide.backgroundClass}`} aria-hidden={slideIndex !== index} inert={slideIndex !== index}>
                  <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.15)_1px,transparent_1px)] bg-size-[24px_24px] opacity-10"></div>
                  {slide.glowClass ? <div className={`pointer-events-none absolute h-96 w-96 rounded-full blur-[80px] ${slide.glowClass}`}></div> : null}
                  <div className="pointer-events-none absolute top-1/2 right-12 -translate-y-1/2 opacity-20 transition duration-700 group-hover:scale-105">{slide.decoration}</div>
                  <div className="relative z-10 max-w-2xl py-8">{slide.badge}<h2 className="mb-3 text-3xl leading-tight font-black tracking-tight sm:text-4xl">{slide.title}</h2><p className="mb-7 line-clamp-2 text-sm leading-relaxed font-medium text-[#d1d5db]">{slide.description}</p><button className={`flex cursor-pointer items-center gap-2 rounded-xl px-6 py-3 text-sm! leading-5! font-extrabold transition ${slide.buttonClass} ${slide.buttonTextClass}`} onClick={() => navigateTo(slide.href)} type="button">{slide.buttonLabel} <i className={slide.buttonIcon} aria-hidden="true"></i></button></div>
                </div>
              ))}
            </div>
            <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 gap-2" role="group" aria-label="홍보 배너 선택">{promotionSlides.map((_, index) => <button key={index} type="button" className={`h-2 cursor-pointer rounded-full transition-all duration-300 ${slideIndex === index ? 'w-6 bg-white' : 'w-2 bg-white/30'}`} aria-label={`${index + 1}번 배너 보기`} aria-pressed={slideIndex === index} onClick={() => selectSlide(index)} />)}</div>
          </div>

          <WelcomeHomeDashboard dashboard={dashboard} error={dashboardError} greetingName={greetingName} loading={dashboardLoading} onRetry={() => setReloadVersion((version) => version + 1)} />
        </div>
      </div>
    </div>
  )
}
