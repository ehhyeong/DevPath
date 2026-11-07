import { useEffect, useState } from 'react'
import { homeApi } from '../../lib/api/home'
import { navigateTo } from '../../lib/spa-navigation'
import type { AuthenticatedHomeDashboard } from '../../types/home'
import WelcomeHomeDashboard from './WelcomeHomeDashboard'

type WelcomeHomeProps = { displayName: string }

type PromotionSlide = {
  image: string
  alt: string
  buttonBounds: { left: number; top: number; width: number; height: number }
  buttonLabel: string
  href: string
}

// 버튼 좌표는 첨부 원본(2089×753)의 픽셀 기준이며 이미지와 같은 비율로 확대·축소한다.
const promotionSlides: PromotionSlide[] = [
  {
    image: '/images/home/ai-builder.png',
    alt: 'AI 빌더. 아이디어를 입력하면 실무형 DB ERD와 REST API 명세서를 생성합니다.',
    buttonBounds: { left: 108, top: 500, width: 436, height: 88 },
    buttonLabel: 'AI 아키텍처 생성하기', href: '/project-create',
  },
  {
    image: '/images/home/team-squad.png',
    alt: '팀 스쿼드. 실력을 검증한 동료를 찾고 칸반 보드로 함께 협업하세요.',
    buttonBounds: { left: 125, top: 492, width: 424, height: 94 },
    buttonLabel: '스쿼드 라운지 입장', href: '/community-lounge',
  },
  {
    image: '/images/home/curated-roadmap.png',
    alt: '맞춤 학습 로드맵. 현재 실력과 목표 직무에 맞는 학습 경로를 AI가 설계합니다.',
    buttonBounds: { left: 108, top: 510, width: 415, height: 90 },
    buttonLabel: '내 맞춤 로드맵 찾기', href: '/roadmap-hub',
  },
  {
    image: '/images/home/job-analysis.png',
    alt: '채용 시장 분석. 내 스킬셋에 맞는 기업과 필요한 기술을 확인하세요.',
    buttonBounds: { left: 115, top: 507, width: 485, height: 105 },
    buttonLabel: '내 시장 가치 확인하기', href: '/job-matching',
  },
  {
    image: '/images/home/showcase.png',
    alt: '프로젝트 쇼케이스. 배포된 프로젝트로 결과물과 실력을 증명하세요.',
    buttonBounds: { left: 138, top: 499, width: 511, height: 100 },
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

          <div className="relative aspect-[2089/753] w-full overflow-hidden rounded-2xl bg-[#002d2a] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.15)] sm:rounded-3xl" data-testid="welcome-promotion">
            <div className="flex h-full transition-transform duration-600 ease-[cubic-bezier(0.25,1,0.2,1)]" style={{ transform: `translateX(-${slideIndex * 100}%)` }} data-testid="welcome-carousel-track">
              {promotionSlides.map((slide, index) => (
                <div key={slide.href} className="relative h-full min-w-full shrink-0 overflow-hidden" aria-hidden={slideIndex !== index} inert={slideIndex !== index}>
                  <img src={slide.image} alt={slide.alt} width={2089} height={753} className="block h-full w-full" loading={index === 0 ? 'eager' : 'lazy'} fetchPriority={index === 0 ? 'high' : 'auto'} decoding="async" />
                  <button
                    className="absolute min-h-11 -translate-y-1/2 cursor-pointer rounded-full bg-transparent transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                    style={{ left: `${slide.buttonBounds.left / 2089 * 100}%`, top: `${(slide.buttonBounds.top + slide.buttonBounds.height / 2) / 753 * 100}%`, width: `${slide.buttonBounds.width / 2089 * 100}%`, height: `${slide.buttonBounds.height / 753 * 100}%` }}
                    onClick={() => navigateTo(slide.href)} type="button"
                  ><span className="sr-only">{slide.buttonLabel}</span></button>
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
