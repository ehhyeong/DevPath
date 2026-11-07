import { useEffect, useState, type ReactNode } from 'react'
import { homeApi } from '../../lib/api/home'
import { navigateTo } from '../../lib/spa-navigation'
import type { AuthenticatedHomeDashboard } from '../../types/home'
import WelcomeHomeDashboard from './WelcomeHomeDashboard'

type WelcomeHomeProps = { displayName: string }

type PromotionSlide = {
  image: string
  alt: string
  badge: string
  title: ReactNode
  description: string
  backgroundClass: string
  badgeClass: string
  buttonClass: string
  buttonLabel: string
  href: string
}

const promotionSlides: PromotionSlide[] = [
  {
    image: '/images/home/ai-builder-artwork.png', alt: '개발자와 AI 로봇, ERD와 API 설계 카드',
    badge: 'AI BUILDER',
    title: <>토이 프로젝트는 그만,<br /><span className="text-[#42ffd3]">실무형 설계도</span>를 1분 만에.</>,
    description: '아이디어만 적어주세요. DevPath AI가 현업 수준의 DB ERD와 REST API 명세서를 즉시 생성합니다.',
    backgroundClass: 'bg-[linear-gradient(110deg,#041e2c_0%,#043f39_65%,#02564b_100%)]',
    badgeClass: 'text-[#7affe0]', buttonClass: 'bg-[#4cf5d0] text-[#032d2a] hover:bg-[#9bffe9]',
    buttonLabel: 'AI 아키텍처 생성하기', href: '/project-create',
  },
  {
    image: '/images/home/team-squad-artwork.png', alt: '네 명의 팀원이 칸반 보드와 노트북으로 협업하는 모습',
    badge: 'TEAM SQUAD',
    title: <>나와 딱 맞는 <span className="text-[#70eaff]">최고의 팀원</span>을<br />찾는 가장 빠른 방법</>,
    description: '프론트엔드부터 백엔드까지, 검증된 실력을 가진 동료들과 함께 칸반 보드로 진짜 협업을 시작하세요.',
    backgroundClass: 'bg-[linear-gradient(110deg,#080d3d_0%,#112564_65%,#2b2180_100%)]',
    badgeClass: 'text-[#9deaff]', buttonClass: 'bg-[#e3f1ff] text-[#182886] hover:bg-white',
    buttonLabel: '스쿼드 라운지 입장', href: '/community-lounge',
  },
  {
    image: '/images/home/curated-roadmap-artwork.png', alt: '개발자와 AI 로봇, 단계별 학습 경로와 지도 핀',
    badge: 'CURATED ROADMAP',
    title: <>어떤 기술부터 배워야 할지<br /><span className="text-[#42ffd3]">막막하신가요?</span></>,
    description: '내 현재 실력을 진단하고, 목표 직무에 딱 맞는 1:1 최적의 학습 경로를 AI가 설계해 드립니다.',
    backgroundClass: 'bg-[linear-gradient(110deg,#032b27_0%,#034c40_65%,#006454_100%)]',
    badgeClass: 'text-[#7affe0]', buttonClass: 'bg-[#4cf5d0] text-[#032d2a] hover:bg-[#9bffe9]',
    buttonLabel: '내 맞춤 로드맵 찾기', href: '/roadmap-hub',
  },
  {
    image: '/images/home/job-analysis-artwork.png', alt: '개발자와 채용 시장 그래프, 기업 목록과 서류 가방',
    badge: 'JOB ANALYSIS',
    title: <>내 스킬셋으로 갈 수 있는<br /><span className="text-[#ffc857]">기업 리스트 분석</span></>,
    description: '원티드, 프로그래머스 채용 공고를 실시간 분석하여 지금 나에게 가장 필요한 기술이 무엇인지 알려드립니다.',
    backgroundClass: 'bg-[linear-gradient(110deg,#321206_0%,#65250b_65%,#843909_100%)]',
    badgeClass: 'text-[#ffda8e]', buttonClass: 'bg-[#ffb94b] text-[#451900] hover:bg-[#ffdaa0]',
    buttonLabel: '내 시장 가치 확인하기', href: '/job-matching',
  },
  {
    image: '/images/home/showcase-artwork.png', alt: '개발자가 프로젝트 배포 로켓과 웹사이트를 보며 기뻐하는 모습',
    badge: 'SHOWCASE',
    title: <>배포된 프로젝트가 곧<br /><span className="text-[#f1a0ff]">완벽한 이력서</span>가 됩니다.</>,
    description: 'DevPath가 제공하는 커스텀 도메인(*.devpath.app)으로 결과물을 라이브 배포하고 실력을 증명하세요.',
    backgroundClass: 'bg-[linear-gradient(110deg,#210b3f_0%,#461475_65%,#692496_100%)]',
    badgeClass: 'text-[#efc0ff]', buttonClass: 'bg-[#f0c3ff] text-[#4b1576] hover:bg-white',
    buttonLabel: '런칭된 프로젝트 구경하기', href: '/dev-showcase',
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

          <div className="relative h-[260px] w-full overflow-hidden rounded-2xl bg-[#002d2a] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.15)] sm:rounded-3xl" data-testid="welcome-promotion">
            <div className="flex h-full transition-transform duration-600 ease-[cubic-bezier(0.25,1,0.2,1)]" style={{ transform: `translateX(-${slideIndex * 100}%)` }} data-testid="welcome-carousel-track">
              {promotionSlides.map((slide, index) => (
                <div key={slide.href} className={`relative h-full w-full shrink-0 overflow-hidden text-white ${slide.backgroundClass}`} aria-hidden={slideIndex !== index} inert={slideIndex !== index}>
                  <div className="pointer-events-none absolute inset-y-2 right-4 hidden w-[44%] items-center justify-center lg:flex">
                    <img src={slide.image} alt={slide.alt} width={1774} height={887} className="block h-full w-full object-contain" loading={index === 0 ? 'eager' : 'lazy'} fetchPriority={index === 0 ? 'high' : 'auto'} decoding="async" />
                  </div>
                  <div className="relative z-10 flex h-full w-full flex-col items-start justify-center px-5 py-4 sm:px-8 lg:w-[58%] lg:px-10">
                    <span className={`mb-1.5 inline-flex rounded-full border border-white/20 bg-white/5 px-2.5 py-0.5 text-[10px] leading-4 font-bold tracking-wide ${slide.badgeClass}`}>{slide.badge}</span>
                    <h2 className="text-[20px] leading-[26px] font-black tracking-tight sm:text-[28px] sm:leading-[34px]">{slide.title}</h2>
                    <p className="mt-2 max-w-[550px] text-[12px] leading-[17px] text-white/80 sm:text-[13px] sm:leading-[19px]">{slide.description}</p>
                    <button className={`mt-3 inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-full px-5 text-xs! font-extrabold transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white ${slide.buttonClass}`} onClick={() => navigateTo(slide.href)} type="button">{slide.buttonLabel}<i className="fas fa-arrow-right" aria-hidden="true" /></button>
                  </div>
                </div>
              ))}
            </div>
            <div className="absolute bottom-1 left-1/2 z-10 flex -translate-x-1/2 rounded-full bg-black/40 px-1 sm:bottom-3" role="group" aria-label="홍보 배너 선택">{promotionSlides.map((_, index) => <button key={index} type="button" className="grid h-6 w-7 cursor-pointer place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-white" aria-label={`${index + 1}번 배너 보기`} aria-pressed={slideIndex === index} onClick={() => selectSlide(index)}><span className={`h-1.5 rounded-full transition-all duration-300 ${slideIndex === index ? 'w-5 bg-white' : 'w-1.5 bg-white/50'}`} /></button>)}</div>
          </div>

          <WelcomeHomeDashboard dashboard={dashboard} error={dashboardError} greetingName={greetingName} loading={dashboardLoading} onRetry={() => setReloadVersion((version) => version + 1)} />
        </div>
      </div>
    </div>
  )
}
