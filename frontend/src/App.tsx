import { useEffect, useState } from 'react'
import AuthModal, { type AuthView } from './components/AuthModal'
import { authApi } from './lib/api'
import { clearStoredAuthSession, readStoredAuthSession } from './lib/auth-session'

declare global {
  interface Window {
    AOS?: {
      init: (options: Record<string, unknown>) => void
      refresh?: () => void
    }
  }
}

function go(path: string) {
  window.location.href = path
}

function readAuthViewFromLocation(): AuthView | null {
  const value = new URLSearchParams(window.location.search).get('auth')

  if (value === 'login' || value === 'signup') {
    return value
  }

  return null
}

function syncAuthViewInLocation(view: AuthView | null) {
  const url = new URL(window.location.href)

  if (view) {
    url.searchParams.set('auth', view)
  } else {
    url.searchParams.delete('auth')
  }

  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
}

function App() {
  const [session, setSession] = useState(() => readStoredAuthSession())
  const [authView, setAuthView] = useState<AuthView | null>(() => readAuthViewFromLocation())

  useEffect(() => {
    document.title = 'DevPath - 개발자 성장의 모든 것'

    const initAos = () => {
      window.AOS?.init({
        duration: 800,
        once: true,
        offset: 100,
      })
      window.AOS?.refresh?.()
    }

    if (window.AOS) {
      initAos()
      return
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-aos-script="true"]',
    )

    if (existingScript) {
      existingScript.addEventListener('load', initAos)

      return () => {
        existingScript.removeEventListener('load', initAos)
      }
    }

    const script = document.createElement('script')
    script.src = 'https://unpkg.com/aos@2.3.1/dist/aos.js'
    script.async = true
    script.dataset.aosScript = 'true'
    script.onload = initAos
    document.body.appendChild(script)

    return () => {
      script.onload = null
    }
  }, [])

  useEffect(() => {
    const syncSession = () => {
      setSession(readStoredAuthSession())
    }

    window.addEventListener('storage', syncSession)
    syncSession()

    return () => {
      window.removeEventListener('storage', syncSession)
    }
  }, [])

  useEffect(() => {
    syncAuthViewInLocation(authView)
  }, [authView])

  async function handleLogout() {
    const currentSession = readStoredAuthSession()

    try {
      if (currentSession?.refreshToken) {
        await authApi.logout(currentSession.refreshToken)
      }
    } catch {
      // Clear the browser session even if the backend logout request fails.
    } finally {
      clearStoredAuthSession()
      setSession(null)
    }
  }

  function openAuthModal(view: AuthView) {
    setAuthView(view)
  }

  function closeAuthModal() {
    setAuthView(null)
  }

  function handleAuthenticated() {
    setSession(readStoredAuthSession())
    closeAuthModal()
  }

  return (
    <div className="flex min-h-screen flex-col text-gray-800">
      <nav className="fixed z-50 w-full border-b border-gray-100 bg-white/80 backdrop-blur-md transition-all">
        <div className="mx-auto grid h-16 max-w-7xl grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center px-6">
          <a
            href="home.html"
            className="group flex items-center justify-self-start text-xl font-bold text-gray-900 brand-gap"
          >
            <i className="fas fa-code-branch text-brand transition group-hover:rotate-12 brand-icon-shift" />
            <span className="brand-text-shift">DevPath</span>
          </a>

          <div className="header-nav-shift header-nav-gap hidden items-center justify-self-center text-sm font-bold text-gray-500 md:flex">
            <a href="roadmap-hub.html" className="transition hover:text-brand">
              로드맵
            </a>
            <a href="lecture-list.html" className="transition hover:text-brand">
              강의
            </a>
            <a href="lounge-dashboard.html" className="transition hover:text-brand">
              프로젝트
            </a>
            <a href="community-list.html" className="transition hover:text-brand">
              커뮤니티
            </a>
            <a href="job-matching.html" className="transition hover:text-brand">
              채용분석
            </a>
          </div>

          {session ? (
            <div className="flex items-center justify-self-end gap-3">
              <div className="hidden text-right sm:block">
                <div className="text-sm font-bold text-gray-900">{session.name}</div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-full bg-gray-900 px-5 py-2 text-sm font-bold text-white shadow-lg transition hover:bg-black"
              >
                로그아웃
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-self-end gap-3">
              <button
                type="button"
                onClick={() => openAuthModal('login')}
                className="rounded-full bg-gray-900 px-5 py-2 text-sm font-bold text-white shadow-lg transition hover:bg-black"
              >
                로그인
              </button>
            </div>
          )}
        </div>
      </nav>

      <section className="hero-bg relative overflow-hidden px-6 pb-20 pt-40">
        <div className="animate-blob absolute top-20 left-10 h-72 w-72 rounded-full bg-green-200 opacity-20 mix-blend-multiply blur-3xl filter" />
        <div className="animate-blob animation-delay-2000 absolute top-20 right-10 h-72 w-72 rounded-full bg-blue-200 opacity-20 mix-blend-multiply blur-3xl filter" />

        <div className="relative z-10 mx-auto max-w-6xl text-center" data-aos="fade-up">
          <span className="mb-6 inline-block rounded-full border border-green-200 bg-white px-3 py-1 text-xs font-bold text-brand shadow-sm">
            🚀 개발자 커리어 가속화 플랫폼
          </span>
          <h1 className="mb-6 text-5xl leading-tight font-extrabold tracking-tight text-gray-900 md:text-7xl">
            성장의 길을 찾다,
            <br />
            <span className="bg-gradient-to-r from-green-500 to-teal-500 bg-clip-text text-transparent">
              DevPath
            </span>
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-gray-500 md:text-xl">
            막막한 독학은 그만. AI 진단부터 로드맵 추천, 실전 프로젝트,
            <br />
            그리고 취업 매칭까지 하나의 플랫폼에서 해결하세요.
          </p>
          <div className="mb-20 flex flex-col justify-center gap-4 sm:flex-row">
            <button
              type="button"
              onClick={() => go('survey.html')}
              className="bg-brand flex items-center justify-center gap-2 rounded-xl px-8 py-4 text-lg font-bold text-white shadow-xl shadow-green-500/30 transition hover:bg-green-600"
            >
              <i className="fas fa-magic" /> AI 로드맵 추천받기
            </button>
            <button
              type="button"
              onClick={() => go('roadmap-hub.html')}
              className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-8 py-4 text-lg font-bold text-gray-700 transition hover:border-gray-400"
            >
              <i className="fas fa-map" /> 로드맵 둘러보기
            </button>
          </div>

          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 text-left md:grid-cols-3">
            <div className="glass-panel float rounded-2xl p-6" style={{ animationDelay: '0s' }}>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-red-500">
                  <i className="fab fa-hotjar" />
                </div>
                <h3 className="font-bold text-gray-800">Trending Skills</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                  Spring Boot
                </span>
                <span className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                  React
                </span>
                <span className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                  Docker
                </span>
                <span className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                  Kubernetes
                </span>
                <span className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                  Python
                </span>
              </div>
            </div>
            <div className="glass-panel float rounded-2xl p-6" style={{ animationDelay: '1s' }}>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-500">
                  <i className="fas fa-user-graduate" />
                </div>
                <h3 className="font-bold text-gray-800">Learning Now</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="mb-1 flex justify-between text-xs text-gray-500">
                    <span>Backend Path</span>
                    <span>85%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                    <div className="h-full rounded-full bg-blue-500" style={{ width: '85%' }} />
                  </div>
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-xs text-gray-500">
                    <span>CS Basic</span>
                    <span>42%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                    <div className="h-full rounded-full bg-green-500" style={{ width: '42%' }} />
                  </div>
                </div>
              </div>
            </div>
            <div className="glass-panel float rounded-2xl p-6" style={{ animationDelay: '2s' }}>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-500">
                  <i className="fas fa-briefcase" />
                </div>
                <h3 className="font-bold text-gray-800">Job Matching</h3>
              </div>
              <div className="mb-1 text-3xl font-extrabold text-gray-900">1,240+</div>
              <p className="text-xs text-gray-500">이번 주 매칭된 채용 공고</p>
              <div className="mt-4 flex -space-x-2">
                <div className="h-8 w-8 rounded-full border-2 border-white bg-gray-300" />
                <div className="h-8 w-8 rounded-full border-2 border-white bg-gray-400" />
                <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gray-500 text-[10px] font-bold text-white">
                  +99
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="overflow-hidden bg-gray-50 py-24">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-16 px-6 md:flex-row">
          <div className="flex-1" data-aos="fade-right">
            <span className="mb-2 block text-sm font-bold tracking-widest text-brand uppercase">
              Step 1. Learn
            </span>
            <h2 className="mb-6 text-4xl leading-tight font-bold text-gray-900">
              헤매지 마세요.
              <br />
              길은 이미 정해져 있습니다.
            </h2>
            <p className="mb-8 text-lg leading-relaxed text-gray-600">
              백엔드, 프론트엔드, DevOps 등 직무별 표준 커리큘럼을 제공합니다. AI가 당신의 현재
              실력을 진단하고, 가장 필요한 학습을 추천해 드립니다.
            </p>
            <ul className="mb-8 space-y-4">
              <li className="flex items-center gap-3">
                <i className="fas fa-check-circle text-xl text-brand" />
                <span className="text-gray-700">트리 구조의 시각적 로드맵</span>
              </li>
              <li className="flex items-center gap-3">
                <i className="fas fa-check-circle text-xl text-brand" />
                <span className="text-gray-700">검증된 고품질 강의 큐레이션</span>
              </li>
              <li className="flex items-center gap-3">
                <i className="fas fa-check-circle text-xl text-brand" />
                <span className="text-gray-700">학습 진척도 자동 추적</span>
              </li>
            </ul>
            <button
              type="button"
              onClick={() => go('roadmap-hub.html')}
              className="text-lg font-bold text-brand hover:underline"
            >
              로드맵 보러가기 &rarr;
            </button>
          </div>

          <div
            className="relative flex h-96 flex-1 items-center justify-center overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl"
            data-aos="fade-left"
          >
            <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-50" />

            <div className="relative w-full max-w-sm">
              <div className="roadmap-line left-1/2 top-10 h-20 w-1 -translate-x-1/2 bg-green-200" />
              <div className="roadmap-line left-1/2 top-30 h-1 w-32 -translate-x-1/2 bg-green-200" />
              <div className="roadmap-line left-[25%] top-30 h-10 w-1 bg-green-200" />
              <div className="roadmap-line right-[25%] top-30 h-10 w-1 bg-green-200" />

              <div className="relative z-10 flex flex-col items-center gap-8">
                <div className="flex items-center gap-2 rounded-full bg-gray-900 px-6 py-3 text-sm font-bold text-white shadow-lg">
                  <i className="fas fa-flag" /> 시작: 개발 기초
                </div>
                <div className="flex w-full justify-center gap-16">
                  <div className="flex flex-col items-center">
                    <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full border-2 border-brand bg-white text-xl text-brand shadow-md">
                      <i className="fab fa-html5" />
                    </div>
                    <span className="text-xs font-bold text-gray-600">HTML/CSS</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full border-2 border-blue-500 bg-white text-xl text-blue-500 shadow-md">
                      <i className="fab fa-js" />
                    </div>
                    <span className="text-xs font-bold text-gray-600">JavaScript</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm text-gray-500 shadow-md">
                  <i className="fas fa-lock text-gray-300" /> 다음 단계: 프레임워크
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-24">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-16 px-6 md:flex-row-reverse">
          <div className="flex-1" data-aos="fade-left">
            <span className="mb-2 block text-sm font-bold tracking-widest text-blue-600 uppercase">
              Step 2. Build
            </span>
            <h2 className="mb-6 text-4xl leading-tight font-bold text-gray-900">
              배운 것을 내 것으로.
              <br />
              실전 프로젝트.
            </h2>
            <p className="mb-8 text-lg leading-relaxed text-gray-600">
              단순한 강의 시청은 그만. 나만의 워크스페이스에서 코드를 작성하고, 현업 멘토에게
              직접적인 코드 리뷰와 피드백을 받아보세요.
            </p>
            <div className="mb-8 grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-gray-50 p-4">
                <i className="fas fa-users mb-2 text-2xl text-blue-500" />
                <h4 className="font-bold">팀 스쿼드</h4>
                <p className="text-sm text-gray-500">동료와 협업 경험</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-4">
                <i className="fas fa-chalkboard-teacher mb-2 text-2xl text-green-500" />
                <h4 className="font-bold">멘토링</h4>
                <p className="text-sm text-gray-500">현업자 피드백</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => go('workspace-hub.html')}
              className="text-lg font-bold text-blue-600 hover:underline"
            >
              워크스페이스 체험하기 &rarr;
            </button>
          </div>

          <div className="mx-auto w-full max-w-lg flex-1" data-aos="fade-right">
            <div className="overflow-hidden rounded-xl border border-gray-700 bg-gray-900 font-mono text-sm leading-relaxed shadow-2xl">
              <div className="flex items-center gap-2 border-b border-gray-700 bg-gray-800 px-4 py-2">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <div className="h-3 w-3 rounded-full bg-yellow-500" />
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                </div>
                <span className="ml-2 text-xs text-gray-400">main.js</span>
              </div>
              <div className="p-6 text-gray-300">
                <div className="flex">
                  <span className="mr-4 text-gray-500">1</span>
                  <span className="text-purple-400">const</span>{' '}
                  <span className="text-blue-400">devPath</span> ={' '}
                  <span className="text-yellow-300">{'{'}</span>
                </div>
                <div className="flex">
                  <span className="mr-4 text-gray-500">2</span>&nbsp;&nbsp;
                  <span className="text-blue-300">goal</span>:{' '}
                  <span className="text-green-400">'Senior Developer'</span>,
                </div>
                <div className="flex">
                  <span className="mr-4 text-gray-500">3</span>&nbsp;&nbsp;
                  <span className="text-blue-300">skills</span>: [
                  <span className="text-green-400">'React'</span>,{' '}
                  <span className="text-green-400">'Node.js'</span>],
                </div>
                <div className="flex">
                  <span className="mr-4 text-gray-500">4</span>&nbsp;&nbsp;
                  <span className="text-blue-300">start</span>:{' '}
                  <span className="text-purple-400">function</span>() {'{'}
                </div>
                <div className="flex">
                  <span className="mr-4 text-gray-500">5</span>&nbsp;&nbsp;&nbsp;&nbsp;
                  <span className="text-blue-300">console</span>.
                  <span className="text-yellow-300">log</span>(
                  <span className="text-green-400">'Growth Started!'</span>);
                </div>
                <div className="flex">
                  <span className="mr-4 text-gray-500">6</span>&nbsp;&nbsp;{'}'}
                </div>
                <div className="flex">
                  <span className="mr-4 text-gray-500">7</span>
                  <span className="text-yellow-300">{'}'}</span>;
                </div>
                <div className="mt-2 flex">
                  <span className="mr-4 text-gray-500">8</span>
                  <span className="text-gray-500">// AI Code Review Active...</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-gray-900 py-24 text-white">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <span className="mb-2 block text-sm font-bold tracking-widest text-brand uppercase">
            Step 3. Career
          </span>
          <h2 className="mb-6 text-4xl font-bold">데이터로 증명하는 나의 실력</h2>
          <p className="mx-auto mb-12 max-w-2xl text-lg text-gray-400">
            학습 이력, 프로젝트 결과물, 멘토의 평가가 모여 'Proof Card'가 됩니다.
            <br />
            AI가 당신의 시장 가치를 분석하고 딱 맞는 기업을 매칭해 드립니다.
          </p>

          <div className="mb-12 grid grid-cols-1 gap-8 md:grid-cols-3">
            <div
              className="hover:border-brand rounded-2xl border border-gray-700 bg-gray-800 p-8 transition"
              data-aos="fade-up"
              data-aos-delay="0"
            >
              <i className="fas fa-certificate mb-4 text-4xl text-brand" />
              <h3 className="mb-2 text-xl font-bold">Proof Card</h3>
              <p className="text-sm text-gray-400">위변조 불가능한 학습 인증서</p>
            </div>
            <div
              className="hover:border-brand rounded-2xl border border-gray-700 bg-gray-800 p-8 transition"
              data-aos="fade-up"
              data-aos-delay="100"
            >
              <i className="fas fa-chart-pie mb-4 text-4xl text-blue-400" />
              <h3 className="mb-2 text-xl font-bold">시장 가치 분석</h3>
              <p className="text-sm text-gray-400">내 스킬셋의 연봉 예측</p>
            </div>
            <div
              className="hover:border-brand rounded-2xl border border-gray-700 bg-gray-800 p-8 transition"
              data-aos="fade-up"
              data-aos-delay="200"
            >
              <i className="fas fa-briefcase mb-4 text-4xl text-purple-400" />
              <h3 className="mb-2 text-xl font-bold">기업 매칭</h3>
              <p className="text-sm text-gray-400">역량 기반 채용 공고 추천</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => go('job-matching.html')}
            className="rounded-full bg-white px-8 py-3 font-bold text-gray-900 transition hover:bg-gray-100"
          >
            내 시장 가치 확인하기
          </button>
        </div>
      </section>

      <section className="bg-brand relative overflow-hidden py-24">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
        <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
          <h2 className="mb-6 text-4xl font-extrabold text-white md:text-5xl">준비되셨나요?</h2>
          <p className="mb-10 text-lg text-white/90">
            지금 바로 DevPath와 함께 성장의 여정을 시작하세요.
            <br />
            당신의 가능성을 현실로 만들어 드립니다.
          </p>
          <button
            type="button"
            onClick={() => go('survey.html')}
            className="text-brand rounded-xl bg-white px-10 py-4 text-lg font-bold shadow-xl transition hover:scale-105 hover:bg-gray-100"
          >
            AI 로드맵 추천받기
          </button>
        </div>
      </section>

      <footer className="border-t border-gray-200 bg-gray-50 pb-8 pt-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-12 grid grid-cols-1 gap-12 md:grid-cols-4">
            <div className="md:col-span-1">
              <a href="#" className="mb-4 flex items-center gap-2 text-xl font-bold text-gray-900">
                <i className="fas fa-code-branch text-brand" /> DevPath
              </a>
              <p className="text-sm leading-relaxed text-gray-500">
                개발자의 성장을 돕는 올인원 플랫폼.
                <br />
                Learn, Build, and Grow.
              </p>
            </div>
            <div>
              <h4 className="mb-4 font-bold text-gray-900">서비스</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li>
                  <a href="roadmap-hub.html" className="hover:text-brand">
                    로드맵
                  </a>
                </li>
                <li>
                  <a href="lecture-list.html" className="hover:text-brand">
                    강의
                  </a>
                </li>
                <li>
                  <a href="workspace-hub.html" className="hover:text-brand">
                    워크스페이스
                  </a>
                </li>
                <li>
                  <a href="job-matching.html" className="hover:text-brand">
                    채용 분석
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 font-bold text-gray-900">커뮤니티</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li>
                  <a href="community-lounge.html" className="hover:text-brand">
                    라운지
                  </a>
                </li>
                <li>
                  <a href="mentoring-hub.html" className="hover:text-brand">
                    멘토링 찾기
                  </a>
                </li>
                <li>
                  <a href="dev-showcase.html" className="hover:text-brand">
                    쇼케이스
                  </a>
                </li>
                <li>
                  <a href="project-list.html" className="hover:text-brand">
                    프로젝트
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 font-bold text-gray-900">고객지원</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li>
                  <a href="#" className="hover:text-brand">
                    공지사항
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-brand">
                    자주 묻는 질문
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-brand">
                    문의하기
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-200 pt-8 text-center text-xs text-gray-400">
            &copy; 2026 DevPath Inc. All rights reserved.
          </div>
        </div>
      </footer>

      {authView ? (
        <AuthModal
          view={authView}
          onClose={closeAuthModal}
          onViewChange={setAuthView}
          onAuthenticated={handleAuthenticated}
        />
      ) : null}
    </div>
  )
}

export default App
