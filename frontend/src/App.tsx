import { type CSSProperties, useEffect, useState } from 'react'
import AccountUserMenu from './components/AccountUserMenu'
import AuthModal, { type AuthView } from './components/AuthModal'
import SiteHeader from './components/SiteHeader'
import { authApi, userApi } from './lib/api'
import {
  AUTH_SESSION_SYNC_EVENT,
  clearStoredAuthSession,
  getPostLoginRedirect,
  readStoredAuthSession,
} from './lib/auth-session'

const headerLinks = [
  { key: 'roadmap', href: 'roadmap-hub.html', label: '로드맵' },
  { key: 'lecture', href: 'lecture-list.html', label: '강의' },
  { key: 'project', href: 'lounge-dashboard.html', label: '프로젝트' },
  { key: 'jobMatching', href: '/job-matching', label: '채용분석' },
  { key: 'community', href: 'community-list.html', label: '커뮤니티' },
]

const instructorHeaderLink = { key: 'instructorDashboard', href: 'instructor-dashboard.html', label: '강사 대시보드' }

type HeaderMoveKey = 'brandGroup' | 'navGroup'

// 헤더 각 영역의 위치를 미세 조정할 때 사용하는 오프셋이다.
const headerMoveOffsets: Record<HeaderMoveKey, { x: number; y: number }> = {
  brandGroup: { x: 7.5, y: 0 },
  navGroup: { x: -10, y: 0 },
}

const serviceLinks = [
  { href: 'roadmap-hub.html', label: '로드맵' },
  { href: 'lecture-list.html', label: '강의' },
  { href: 'workspace-hub.html', label: '워크스페이스' },
  { href: '/job-matching', label: '채용 분석' },
]

const communityLinks = [
  { href: 'community-lounge.html', label: '라운지' },
  { href: 'mentoring-hub.html', label: '멘토링 찾기' },
  { href: 'dev-showcase.html', label: '쇼케이스' },
  { href: 'project-list.html', label: '프로젝트' },
]

const supportLinks = [
  { href: '#', label: '공지사항' },
  { href: '#', label: '자주 묻는 질문' },
  { href: '#', label: '문의하기' },
]

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

function initAos() {
  const elements = Array.from(document.querySelectorAll<HTMLElement>('[data-aos]'))

  if (elements.length === 0) {
    return undefined
  }

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    elements.forEach((element) => {
      element.classList.add('aos-animate')
    })
    return undefined
  }

  elements.forEach((element) => {
    const delay = Number(element.dataset.aosDelay ?? 0)

    if (Number.isFinite(delay) && delay > 0) {
      element.style.transitionDelay = `${delay}ms`
    }

    element.classList.add('aos-init')
  })

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return
        }

        entry.target.classList.add('aos-animate')
        observer.unobserve(entry.target)
      })
    },
    {
      rootMargin: '0px 0px -18% 0px',
      threshold: 0.18,
    },
  )

  elements.forEach((element) => {
    observer.observe(element)
  })

  return () => {
    observer.disconnect()
  }
}

function getHeaderMoveStyle(key: HeaderMoveKey): CSSProperties {
  const offset = headerMoveOffsets[key]
  return {
    transform: `translate(${offset.x}px, ${offset.y}px)`,
  }
}

function App() {
  const [session, setSession] = useState(() => readStoredAuthSession())
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [authView, setAuthView] = useState<AuthView | null>(() => readAuthViewFromLocation())
  const showInstructorDashboard = session?.role === 'ROLE_INSTRUCTOR'
  const navGroupOffset = headerMoveOffsets.navGroup
  const headerUserStyle = { transform: 'translateX(-20px)' }
  const headerNavStyle = { transform: `translate(${17.5 + navGroupOffset.x}px, ${navGroupOffset.y}px)` }

  useEffect(() => {
    document.title = 'DevPath - 개발자 성장의 모든 것'
    return initAos()
  }, [])

  useEffect(() => {
    document.documentElement.classList.add('home-page-document')
    document.body.classList.add('home-page-body')

    return () => {
      document.documentElement.classList.remove('home-page-document')
      document.body.classList.remove('home-page-body')
    }
  }, [])

  useEffect(() => {
    // 로그인/로그아웃이 다른 탭에서 발생해도 홈 헤더 상태를 바로 반영합니다.
    const syncSession = () => {
      setSession(readStoredAuthSession())
    }

    window.addEventListener('storage', syncSession)
    window.addEventListener(AUTH_SESSION_SYNC_EVENT, syncSession)
    syncSession()

    return () => {
      window.removeEventListener('storage', syncSession)
      window.removeEventListener(AUTH_SESSION_SYNC_EVENT, syncSession)
    }
  }, [])

  useEffect(() => {
    // 홈에서 모달을 직접 열고 닫을 수 있도록 URL 상태도 함께 맞춥니다.
    syncAuthViewInLocation(authView)
  }, [authView])

  useEffect(() => {
    if (!session) {
      setProfileImage(null)
      return
    }

    const controller = new AbortController()

    userApi
      .getMyProfile(controller.signal)
      .then((profile) => {
        setProfileImage(profile.profileImage)
      })
      .catch(() => {
        setProfileImage(null)
      })

    return () => {
      controller.abort()
    }
  }, [session])

  async function handleLogout() {
    const currentSession = readStoredAuthSession()

    try {
      if (currentSession?.refreshToken) {
        await authApi.logout(currentSession.refreshToken)
      }
    } catch {
      // 서버 로그아웃이 실패해도 브라우저 세션은 정리합니다.
    } finally {
      clearStoredAuthSession()
      setSession(null)
      setProfileImage(null)
    }
  }

  function openAuthModal(view: AuthView) {
    setAuthView(view)
  }

  function closeAuthModal() {
    setAuthView(null)
  }

  // 관리자 세션은 일반 홈 대신 전용 대시보드로 즉시 이동시킨다.
  function handleAuthenticated() {
    const nextSession = readStoredAuthSession()

    if (nextSession?.role === 'ROLE_ADMIN') {
      window.location.replace(getPostLoginRedirect(nextSession.role))
      return
    }

    setSession(nextSession)
    closeAuthModal()
  }

  return (
    <div className="home-page-shell text-gray-800">
      <SiteHeader
        session={session}
        profileImage={profileImage}
        onLogout={handleLogout}
        onLoginClick={() => openAuthModal('login')}
      />

      {false ? <nav className="app-header">
        <div className="mx-auto flex h-full w-full max-w-[1600px] items-center gap-8 px-8">
          <div className="hidden w-60 items-center px-4 lg:flex" style={{ transform: 'translateX(var(--logo-nudge))' }}>
            <a
              href="home.html"
              className="group flex items-center gap-2 text-xl font-bold text-gray-900"
              style={getHeaderMoveStyle('brandGroup')}
            >
              <i className="fas fa-code-branch text-brand inline-block transition group-hover:rotate-12" />
              <span className="inline-block">
                DevPath
              </span>
            </a>
          </div>

          <div className="flex items-center lg:hidden">
            <a
              href="home.html"
              className="group flex items-center gap-2 text-xl font-bold text-gray-900"
              style={getHeaderMoveStyle('brandGroup')}
            >
              <i className="fas fa-code-branch text-brand inline-block transition group-hover:rotate-12" />
              <span className="inline-block">
                DevPath
              </span>
            </a>
          </div>

          <div className="hidden flex-1 items-center justify-center text-sm font-bold text-gray-500 md:flex">
            <div className="relative inline-flex items-center gap-10" style={headerNavStyle}>
              {headerLinks.map((item) => (
                <a key={item.key} href={item.href} className="inline-block whitespace-nowrap transition hover:text-brand">
                  {item.label}
                </a>
              ))}

              {showInstructorDashboard ? (
                <a
                  href={instructorHeaderLink.href}
                  className="absolute top-1/2 left-full ml-10 inline-block -translate-y-1/2 whitespace-nowrap transition hover:text-brand"
                >
                  {instructorHeaderLink.label}
                </a>
              ) : null}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 md:w-60">
            <div className="hidden md:block" style={headerUserStyle}>
              {session ? (
                <AccountUserMenu session={session!} profileImage={profileImage} onLogout={handleLogout} />
              ) : (
                <button
                  type="button"
                  onClick={() => openAuthModal('login')}
                  className="rounded-full bg-gray-900 px-5 py-2 text-sm font-bold text-white shadow-lg transition hover:bg-black"
                >
                  로그인
                </button>
              )}
            </div>

            <div className="md:hidden">
              {session ? (
                <AccountUserMenu session={session!} profileImage={profileImage} onLogout={handleLogout} />
              ) : (
                <button
                  type="button"
                  onClick={() => openAuthModal('login')}
                  className="rounded-full bg-gray-900 px-5 py-2 text-sm font-bold text-white shadow-lg transition hover:bg-black"
                >
                  로그인
                </button>
              )}
            </div>
          </div>
        </div>
      </nav> : null}

      <main className="home-page-main">
      <section className="hero-bg relative overflow-hidden px-6 pt-40 pb-20">
        <div className="animate-blob absolute top-20 left-10 h-72 w-72 rounded-full bg-green-200 opacity-20 mix-blend-multiply blur-3xl filter" />
        <div className="animate-blob animation-delay-2000 absolute top-20 right-10 h-72 w-72 rounded-full bg-blue-200 opacity-20 mix-blend-multiply blur-3xl filter" />

        <div className="relative z-10 mx-auto max-w-6xl text-center" data-aos="fade-up">
          <span className="text-brand mb-6 inline-block rounded-full border border-green-200 bg-white px-3 py-1 text-xs font-bold shadow-sm">
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
            막막한 독학은 그만. 로드맵 추천, 실전 프로젝트,
            <br />
            그리고 취업 매칭까지 하나의 플랫폼에서 해결하세요.
          </p>
          <div className="mb-20 flex flex-col justify-center gap-4 sm:flex-row">
            <button
              type="button"
              onClick={() => go('survey.html')}
              className="hero-primary-button px-8 py-4 bg-brand hover:bg-green-600 text-white font-bold rounded-xl transition shadow-xl shadow-green-500/30 flex items-center justify-center gap-2 text-lg"
            >
              <i className="fas fa-magic" /> 로드맵 추천받기
            </button>
            <button
              type="button"
              onClick={() => go('roadmap-hub.html')}
              className="hero-secondary-button flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-8 py-4 text-lg font-bold text-gray-700 transition hover:border-gray-400"
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
                <span className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">Spring Boot</span>
                <span className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">React</span>
                <span className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">Docker</span>
                <span className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">Kubernetes</span>
                <span className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">Python</span>
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
                    <div className="h-full w-[85%] rounded-full bg-blue-500" />
                  </div>
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-xs text-gray-500">
                    <span>CS Basic</span>
                    <span>42%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                    <div className="h-full w-[42%] rounded-full bg-green-500" />
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
            <span className="text-brand mb-2 block text-sm font-bold tracking-widest uppercase">Step 1. Learn</span>
            <h2 className="mb-6 text-4xl leading-tight font-bold text-gray-900">
              헤매지 마세요.
              <br />
              길은 이미 정해져 있습니다.
            </h2>
            <p className="mb-8 text-lg leading-relaxed text-gray-600">
              백엔드, 프론트엔드, DevOps 등 직무별 표준 커리큘럼을 제공합니다. AI가 당신의 현재 실력을
              진단하고, 가장 필요한 학습을 추천해 드립니다.
            </p>
            <ul className="mb-8 space-y-4">
              <li className="flex items-center gap-3">
                <i className="fas fa-check-circle text-brand text-xl" />
                <span className="text-gray-700">트리 구조의 시각적 로드맵</span>
              </li>
              <li className="flex items-center gap-3">
                <i className="fas fa-check-circle text-brand text-xl" />
                <span className="text-gray-700">검증된 고품질 강의 큐레이션</span>
              </li>
              <li className="flex items-center gap-3">
                <i className="fas fa-check-circle text-brand text-xl" />
                <span className="text-gray-700">학습 진척도 자동 추적</span>
              </li>
            </ul>
            <button
              type="button"
              onClick={() => go('roadmap-hub.html')}
              className="text-brand text-lg font-bold hover:underline"
            >
              로드맵 보러가기 →
            </button>
          </div>

          <div className="flex h-96 flex-1 items-center justify-center" data-aos="fade-left">
            <div className="roadmap-preview-shell">
              <div className="roadmap-preview-scene">
                <svg
                  className="roadmap-preview-lines"
                  viewBox="0 0 280 332"
                  fill="none"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <path
                    className="roadmap-preview-line"
                    d="M140 50V86M74 86H206M74 86V106M206 86V106M74 196V220M206 196V220M74 220H206M140 220V250"
                  />
                  <circle className="roadmap-preview-joint" cx="140" cy="86" r="4" />
                  <circle className="roadmap-preview-joint" cx="140" cy="222" r="4" />
                </svg>

                <div className="roadmap-preview-pill">
                  <i className="fas fa-flag" />
                  <span>시작: 개발 기초</span>
                </div>

                <div className="roadmap-preview-branches">
                  <div className="roadmap-preview-card roadmap-preview-card--green">
                    <div className="roadmap-preview-icon roadmap-preview-icon--green">
                      <i className="fab fa-html5" />
                    </div>
                    <p className="roadmap-preview-title">HTML/CSS</p>
                  </div>
                  <div className="roadmap-preview-card roadmap-preview-card--blue">
                    <div className="roadmap-preview-icon roadmap-preview-icon--blue">
                      <i className="fab fa-js" />
                    </div>
                    <p className="roadmap-preview-title">JavaScript</p>
                  </div>
                </div>

                <div className="roadmap-preview-next">
                  <div className="roadmap-preview-next-badge">
                    <i className="fas fa-lock" />
                    <span>잠금</span>
                  </div>
                  <p className="roadmap-preview-next-title">프레임워크</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-24">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-16 px-6 md:flex-row-reverse">
          <div className="flex-1" data-aos="fade-left">
            <span className="mb-2 block text-sm font-bold tracking-widest text-blue-600 uppercase">Step 2. Build</span>
            <h2 className="mb-6 text-4xl leading-tight font-bold text-gray-900">
              배운 것을 내 것으로.
              <br />
              실전 프로젝트.
            </h2>
            <p className="mb-8 text-lg leading-relaxed text-gray-600">
              단순한 강의 시청은 그만. 나만의 워크스페이스에서 코드를 작성하고, 현업 멘토에게 직접적인 코드
              리뷰와 피드백을 받아보세요.
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
              워크스페이스 체험하기 →
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
                  <span className="text-purple-400">const</span>&nbsp;
                  <span className="text-blue-400">devPath</span> = <span className="text-yellow-300">{'{'}</span>
                </div>
                <div className="flex">
                  <span className="mr-4 text-gray-500">2</span>
                  <span>&nbsp;&nbsp;</span>
                  <span className="text-blue-300">goal</span>: <span className="text-green-400">'Senior Developer'</span>,
                </div>
                <div className="flex">
                  <span className="mr-4 text-gray-500">3</span>
                  <span>&nbsp;&nbsp;</span>
                  <span className="text-blue-300">skills</span>: [<span className="text-green-400">'React'</span>,{' '}
                  <span className="text-green-400">'Node.js'</span>],
                </div>
                <div className="flex">
                  <span className="mr-4 text-gray-500">4</span>
                  <span>&nbsp;&nbsp;</span>
                  <span className="text-blue-300">start</span>: <span className="text-purple-400">function</span>() {'{'}
                </div>
                <div className="flex">
                  <span className="mr-4 text-gray-500">5</span>
                  <span>&nbsp;&nbsp;&nbsp;&nbsp;</span>
                  <span className="text-blue-300">console</span>.<span className="text-yellow-300">log</span>(
                  <span className="text-green-400">'Growth Started!'</span>);
                </div>
                <div className="flex">
                  <span className="mr-4 text-gray-500">6</span>
                  <span>&nbsp;&nbsp;</span>
                  {'}'}
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
          <span className="text-brand mb-2 block text-sm font-bold tracking-widest uppercase">Step 3. Career</span>
          <h2 className="mb-6 text-4xl font-bold">데이터로 증명하는 나의 실력</h2>
          <p className="mx-auto mb-12 max-w-2xl text-lg text-gray-400">
            학습 이력, 프로젝트 결과물, 멘토의 평가가 모여 &apos;Proof Card&apos;가 됩니다.
            <br />
            AI가 당신의 시장 가치를 분석하고 딱 맞는 기업을 매칭해 드립니다.
          </p>

          <div className="mb-12 grid grid-cols-1 gap-8 md:grid-cols-3">
            <div
              className="rounded-2xl border border-gray-700 bg-gray-800 p-8 transition hover:border-brand"
              data-aos="fade-up"
              data-aos-delay="0"
            >
              <i className="fas fa-certificate text-brand mb-4 text-4xl" />
              <h3 className="mb-2 text-xl font-bold">Proof Card</h3>
              <p className="text-sm text-gray-400">위변조 불가능한 학습 인증서</p>
            </div>
            <div
              className="rounded-2xl border border-gray-700 bg-gray-800 p-8 transition hover:border-brand"
              data-aos="fade-up"
              data-aos-delay="100"
            >
              <i className="fas fa-chart-pie mb-4 text-4xl text-blue-400" />
              <h3 className="mb-2 text-xl font-bold">시장 가치 분석</h3>
              <p className="text-sm text-gray-400">내 스킬셋의 연봉 예측</p>
            </div>
            <div
              className="rounded-2xl border border-gray-700 bg-gray-800 p-8 transition hover:border-brand"
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
            onClick={() => go('/job-matching')}
            className="rounded-full bg-white px-8 py-3 font-bold text-gray-900 transition hover:bg-gray-100"
          >
            내 시장 가치 확인하기
          </button>
        </div>
      </section>

      <section className="py-24 bg-brand relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <h2 className="mb-6 text-4xl font-extrabold text-white md:text-5xl">준비되셨나요?</h2>
          <p className="mb-10 text-lg text-white/90">
            지금 바로 DevPath와 함께 성장의 여정을 시작하세요.
            <br />
            당신의 가능성을 현실로 만들어 드립니다.
          </p>
          <button
            type="button"
            onClick={() => go('survey.html')}
            className="px-10 py-4 bg-white text-brand font-bold rounded-xl text-lg shadow-xl hover:bg-gray-100 transition transform hover:scale-105"
          >
            로드맵 추천받기
          </button>
        </div>
      </section>

      <footer className="border-t border-gray-200 bg-gray-50 pt-16 pb-8">
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
                {serviceLinks.map((item) => (
                  <li key={item.href}>
                    <a href={item.href} className="hover:text-brand">
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="mb-4 font-bold text-gray-900">커뮤니티</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                {communityLinks.map((item) => (
                  <li key={item.href}>
                    <a href={item.href} className="hover:text-brand">
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="mb-4 font-bold text-gray-900">고객지원</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                {supportLinks.map((item) => (
                  <li key={item.label}>
                    <a href={item.href} className="hover:text-brand">
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-8 text-center text-xs text-gray-400">
            &copy; 2026 DevPath Inc. All rights reserved.
          </div>
        </div>
      </footer>
      </main>

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
