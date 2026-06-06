import { useEffect, useState } from 'react'
import LoginRequiredView from '../components/LoginRequiredView'
import SiteHeader from '../components/SiteHeader'
import { authApi, roadmapApi, userApi } from '../lib/api'
import {
  AUTH_SESSION_SYNC_EVENT,
  clearStoredAuthSession,
  readStoredAuthSession,
} from '../lib/auth-session'
import type { AuthSession } from '../types/auth'

type Screen = 'start' | 'question' | 'loading' | 'result'

interface QuestionOption {
  text: string
  scores: Record<string, number>
}

interface Question {
  id: number
  text: string
  options: QuestionOption[]
}

interface RoadmapData {
  title: string
  desc: string
  icon: string
}

const QUESTIONS: Question[] = [
  {
    id: 1,
    text: '가장 흥미를 느끼거나 만들고 싶은 것은 무엇인가요?',
    options: [
      { text: '사용자가 직접 보고 사용하는 웹사이트 화면', scores: { frontend: 5, fullstack: 3 } },
      { text: '보이지 않는 곳에서 데이터를 처리하는 서버 시스템', scores: { backend: 5, fullstack: 3, architect: 2 } },
      { text: '스마트폰에서 돌아가는 앱 (iOS 또는 Android)', scores: { android: 3, ios: 3 } },
      { text: '스스로 학습하고 예측하는 AI/ML 모델', scores: { ai_engineer: 5, mlops: 3, machine_learning: 4, ai_data_scientist: 4 } },
      { text: '게임이나 가상 현실 세계', scores: { game: 5, server_side_game: 3, frontend: 1 } },
      { text: '해킹 방어, 시스템 보안 및 안전성', scores: { security: 5, devsecops: 4, backend: 1 } },
      { text: 'UX/UI 사용자 경험과 서비스 디자인', scores: { uiux: 5, pm: 2 } },
    ],
  },
  {
    id: 2,
    text: '선호하는 작업 방식은 무엇인가요?',
    options: [
      { text: '시각적 UI 컴포넌트 설계와 인터랙션 구현', scores: { frontend: 4, fullstack: 2, uiux: 2 } },
      { text: '터미널과 서버·인프라·자동화 관리', scores: { devops: 5, devsecops: 3, backend: 2, server_side_game: 2 } },
      { text: '데이터 수집·분석·시각화 대시보드 구축', scores: { data_analyst: 5, data_eng: 3, bi_analyst: 3 } },
      { text: '기술 문서·가이드·API 명세 작성', scores: { technical_writer: 5, pm: 2, developer_relations: 3 } },
      { text: '개발팀 리더십과 구성원 성장 코칭', scores: { engineering_manager: 5, pm: 2, architect: 1 } },
    ],
  },
  {
    id: 3,
    text: '만약 서비스를 만든다면 어떤 환경을 주로 다루고 싶나요?',
    options: [
      { text: '아이폰/아이패드 (Apple 생태계)', scores: { ios: 5 } },
      { text: '갤럭시 등 안드로이드 폰', scores: { android: 5 } },
      { text: '웹 브라우저에서 돌아가는 서비스', scores: { frontend: 3, fullstack: 3 } },
      { text: '클라우드 서버·컨테이너·인프라 환경', scores: { devops: 4, backend: 3, architect: 2 } },
    ],
  },
  {
    id: 4,
    text: '팀 프로젝트에서 맡고 싶은 역할은 무엇인가요?',
    options: [
      { text: '전체 시스템 구조 설계 및 기술 방향 결정', scores: { architect: 5, fullstack: 2, backend: 1, engineering_manager: 2 } },
      { text: '제품 방향 기획 및 팀 조율 (PM)', scores: { pm: 5, engineering_manager: 2, developer_relations: 1 } },
      { text: '개발·배포·테스트 프로세스 자동화', scores: { devops: 5, devsecops: 3, qa: 2 } },
      { text: '주어진 기능을 코드로 정확하게 구현', scores: { frontend: 3, backend: 3 } },
    ],
  },
  {
    id: 5,
    text: '특별히 관심 있는 기술 분야가 있나요?',
    options: [
      { text: '블록체인, Web3, 스마트 컨트랙트', scores: { blockchain: 5 } },
      { text: '대규모 데이터 파이프라인 구축 (Big Data)', scores: { data_eng: 5, mlops: 2 } },
      { text: 'AI 모델 운영·서빙·자동화 (MLOps)', scores: { mlops: 5, ai_engineer: 3, machine_learning: 2 } },
      { text: '소프트웨어 품질 보증과 테스트 자동화', scores: { qa: 5, backend: 1 } },
      { text: '데이터베이스 설계·최적화와 DBA 전문성 (SQL/PostgreSQL)', scores: { postgresql: 5, data_eng: 2, backend: 1 } },
    ],
  },
  {
    id: 6,
    text: '데이터와 분석에 대한 나의 관심은?',
    options: [
      { text: '비즈니스 지표 분석과 인사이트 도출', scores: { data_analyst: 5, pm: 2, bi_analyst: 4 } },
      { text: 'AI/ML 모델 연구 및 학습 실험', scores: { ai_engineer: 5, mlops: 2, machine_learning: 4, ai_data_scientist: 3 } },
      { text: '대규모 데이터 인프라·ETL 파이프라인 구축', scores: { data_eng: 5 } },
      { text: '딱히 없다, 로직과 개발 구현이 더 좋다', scores: { backend: 2, frontend: 2, fullstack: 1 } },
    ],
  },
]

// 설문 결과 키 → 허브 아이템 subtitle(영문 역할명) 매핑. subtitle은 로드맵 이름 한글화에도 불변이라 안정적.
// (ID는 런타임에 hub catalog에서 조회)
const SURVEY_KEY_TO_ROADMAP_SUBTITLE: Record<string, string> = {
  frontend: 'Frontend',
  backend: 'Backend',
  fullstack: 'Full Stack',
  devops: 'DevOps',
  devsecops: 'DevSecOps',
  data_analyst: 'Data Analyst',
  ai_engineer: 'AI Engineer',
  ai_data_scientist: 'AI and Data Scientist',
  data_eng: 'Data Engineer',
  android: 'Android',
  machine_learning: 'Machine Learning',
  postgresql: 'PostgreSQL',
  ios: 'iOS',
  blockchain: 'Blockchain',
  qa: 'QA',
  architect: 'Software Architect',
  security: 'Cyber Security',
  uiux: 'UX Design',
  technical_writer: 'Technical Writer',
  game: 'Game Developer',
  server_side_game: 'Server Side Game Developer',
  mlops: 'MLOps',
  pm: 'Product Manager',
  engineering_manager: 'Engineering Manager',
  developer_relations: 'Developer Relations',
  bi_analyst: 'BI Analyst',
}

const ROADMAPS: Record<string, RoadmapData> = {
  frontend: { title: '프론트엔드', desc: '웹사이트의 화면을 만들고 사용자와 상호작용합니다. React, Vue 등을 사용합니다.', icon: 'fa-desktop' },
  backend: { title: '백엔드', desc: '서버와 데이터베이스를 구축하고 비즈니스 로직을 처리합니다.', icon: 'fa-server' },
  fullstack: { title: '풀스택', desc: '프론트엔드와 백엔드를 모두 다루며 전체적인 서비스를 구현합니다.', icon: 'fa-layer-group' },
  devops: { title: '데브옵스', desc: '개발과 운영을 연결하고 배포 파이프라인(CI/CD)을 자동화합니다.', icon: 'fa-infinity' },
  devsecops: { title: 'DevSecOps', desc: 'DevOps에 보안(Security)을 결합하여 개발 모든 단계에서 보안을 자동화합니다.', icon: 'fa-user-shield' },
  android: { title: '안드로이드', desc: 'Kotlin을 사용하여 갤럭시 등 안드로이드용 앱을 개발합니다.', icon: 'fa-android' },
  ios: { title: 'iOS', desc: 'Swift를 사용하여 아이폰, 아이패드용 앱을 개발합니다.', icon: 'fa-apple' },
  ai_engineer: { title: 'AI 엔지니어', desc: '머신러닝/딥러닝 모델을 개발하고 서비스에 적용합니다.', icon: 'fa-brain' },
  data_analyst: { title: '데이터 분석가', desc: '데이터를 수집 및 시각화하여 비즈니스 의사결정을 돕는 인사이트를 제공합니다.', icon: 'fa-chart-line' },
  data_eng: { title: '데이터 엔지니어', desc: '대규모 데이터 처리를 위한 파이프라인과 시스템을 구축합니다.', icon: 'fa-database' },
  security: { title: '사이버 보안', desc: '해킹 공격을 방어하고 시스템의 취약점을 분석합니다.', icon: 'fa-user-shield' },
  qa: { title: 'QA 엔지니어', desc: '소프트웨어의 버그를 찾고 품질을 보증하며 테스트 자동화를 구축합니다.', icon: 'fa-vial' },
  game: { title: '게임 개발자', desc: 'Unity나 Unreal 엔진을 사용하여 PC, 모바일 게임을 만듭니다.', icon: 'fa-gamepad' },
  blockchain: { title: '블록체인', desc: '스마트 컨트랙트와 탈중앙화 시스템(DApp)을 개발합니다.', icon: 'fa-link' },
  architect: { title: '소프트웨어 아키텍트', desc: '복잡한 시스템의 전체 구조를 설계하고 기술 표준을 정합니다.', icon: 'fa-sitemap' },
  mlops: { title: 'MLOps', desc: 'ML 파이프라인 자동화, 모델 서빙, 모니터링을 담당합니다.', icon: 'fa-gears' },
  pm: { title: '프로덕트 매니저', desc: '제품의 비전을 수립하고 개발팀과 협업하여 프로젝트를 이끕니다.', icon: 'fa-clipboard-list' },
  technical_writer: { title: '테크니컬 라이터', desc: 'API 문서, 개발 가이드, 기술 블로그 등 기술 콘텐츠를 작성합니다.', icon: 'fa-pen-fancy' },
  ai_data_scientist: { title: 'AI·데이터 사이언티스트', desc: '머신러닝 모델 연구와 데이터 분석을 결합하여 AI 서비스를 구현합니다.', icon: 'fa-atom' },
  machine_learning: { title: '머신러닝 엔지니어', desc: '딥러닝 모델을 설계·학습하고 성능을 최적화합니다.', icon: 'fa-microchip' },
  postgresql: { title: 'PostgreSQL 전문가', desc: '관계형 DB 설계, 쿼리 최적화, DBA 전문 업무를 담당합니다.', icon: 'fa-database' },
  uiux: { title: 'UX 디자이너', desc: '사용자 리서치와 프로토타이핑으로 직관적인 서비스 경험을 설계합니다.', icon: 'fa-bezier-curve' },
  server_side_game: { title: '서버 사이드 게임 개발자', desc: '게임 서버와 멀티플레이어 인프라를 구현하고 운영합니다.', icon: 'fa-dice-d20' },
  engineering_manager: { title: '엔지니어링 매니저', desc: '개발팀을 이끌고 기술 로드맵과 구성원 성장을 관리합니다.', icon: 'fa-users' },
  developer_relations: { title: '데브렐', desc: '개발자 커뮤니티를 운영하고 기술 전파와 생태계 성장을 지원합니다.', icon: 'fa-bullhorn' },
  bi_analyst: { title: 'BI 분석가', desc: '비즈니스 데이터를 분석하여 대시보드와 인사이트 리포트를 제공합니다.', icon: 'fa-chart-pie' },
}

function initScores(): Record<string, number> {
  return Object.fromEntries(Object.keys(ROADMAPS).map(k => [k, 0]))
}

function SurveyPage() {
  const [session, setSession] = useState<AuthSession | null>(() => readStoredAuthSession())
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [screen, setScreen] = useState<Screen>('start')
  const [currentStep, setCurrentStep] = useState(0)
  const [scores, setScores] = useState<Record<string, number>>(initScores)
  const [results, setResults] = useState<[string, number][]>([])
  const [roadmapSubtitleToId, setRoadmapSubtitleToId] = useState<Record<string, number>>({})

  useEffect(() => {
    roadmapApi.getHubCatalog().then((catalog) => {
      const map: Record<string, number> = {}
      for (const section of catalog.sections) {
        for (const item of section.items) {
          if (item.linkedRoadmapId != null && item.subtitle) {
            map[item.subtitle] = item.linkedRoadmapId
          }
        }
      }
      setRoadmapSubtitleToId(map)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    document.title = 'DevPath - 나만의 로드맵 찾기'

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

  function startSurvey() {
    setScores(initScores())
    setCurrentStep(0)
    setScreen('question')
  }

  function selectOption(optionScores: Record<string, number>) {
    const newScores = { ...scores }
    for (const [key, value] of Object.entries(optionScores)) {
      if (key in newScores) {
        newScores[key] += value
      }
    }
    setScores(newScores)

    const nextStep = currentStep + 1
    if (nextStep < QUESTIONS.length) {
      setCurrentStep(nextStep)
    } else {
      setScreen('loading')
      setTimeout(() => {
        const sorted = Object.entries(newScores).sort(([, a], [, b]) => b - a)
        setResults(sorted)
        setScreen('result')
      }, 1500)
    }
  }

  function resetSurvey() {
    setScreen('start')
    setCurrentStep(0)
    setScores(initScores())
    setResults([])
  }

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

  function handleLoginClick() {
    window.location.href = '/home?auth=login'
  }

  function getRoadmapId(key: string): number | null {
    const subtitle = SURVEY_KEY_TO_ROADMAP_SUBTITLE[key]
    if (!subtitle) return null
    return roadmapSubtitleToId[subtitle] ?? null
  }

  const progress = Math.round((currentStep / QUESTIONS.length) * 100)
  const question = QUESTIONS[currentStep]
  const topResult = results[0] ? ROADMAPS[results[0][0]] : null
  const topRoadmapId = results[0] ? getRoadmapId(results[0][0]) : null

  if (!session) return <LoginRequiredView />

  return (
    <div className="flex min-h-screen flex-col bg-white text-gray-900">
      <SiteHeader
        session={session}
        profileImage={profileImage}
        onLogout={handleLogout}
        onLoginClick={handleLoginClick}
        activeNavHref="/roadmap-hub"
        startOverlay={
          <a
            href="/home"
            className="pointer-events-auto absolute top-1/2 flex items-center gap-1 text-sm font-bold text-gray-500 transition hover:text-gray-800"
            style={{
              left: 'calc((var(--left-rail) * -1) + clamp(8px, 2vw, 16px) + 14px)',
              transform: 'translateY(-50%)',
            }}
          >
            <i className="fas fa-arrow-left" />
            <span>홈으로</span>
          </a>
        }
      />

      <main
        className="mx-auto flex w-full max-w-3xl flex-grow flex-col items-center justify-center px-6 pb-6"
        style={{ paddingTop: 'calc(var(--app-header-height) + 24px)' }}
      >
        {screen === 'question' && (
          <div className="mb-12 w-full">
            <div className="mb-2 flex justify-between text-xs text-gray-500">
              <span>Start</span>
              <span>{progress}%</span>
              <span>Finish</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-gray-200">
              <div
                className="bg-brand h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {screen === 'start' && (
          <div className="fade-in py-10 text-center">
            <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
              <i className="fas fa-compass text-4xl text-brand" />
            </div>
            <h1 className="mb-6 text-3xl font-bold text-gray-900 md:text-5xl">
              나에게 맞는 개발 로드맵 찾기
            </h1>
            <p className="mx-auto mb-10 max-w-xl text-lg text-gray-600">
              몇 가지 간단한 질문에 답해주시면, 당신의 성향과 목표에 가장 적합한 기술 로드맵을
              추천해 드립니다.
            </p>
            <button
              type="button"
              onClick={startSurvey}
              className="bg-brand rounded-lg px-10 py-4 text-lg font-bold text-white shadow-lg shadow-green-500/30 transition hover:scale-105 hover:bg-green-600"
            >
              추천 받기 시작
            </button>
          </div>
        )}

        {screen === 'question' && (
          <div key={currentStep} className="fade-in w-full">
            <div className="mb-8">
              <span className="mb-2 block text-sm font-bold tracking-widest text-brand uppercase">
                Question {currentStep + 1}
              </span>
              <h2 className="text-2xl font-bold leading-tight text-gray-900 md:text-3xl">
                {question.text}
              </h2>
            </div>
            <div className="space-y-4">
              {question.options.map((option, i) => (
                <div
                  key={i}
                  className="option-card group flex items-center justify-between rounded-lg border border-gray-200 bg-white p-5 text-left shadow-sm hover:shadow-md"
                  onClick={() => selectOption(option.scores)}
                >
                  <span className="text-lg font-medium text-gray-800">{option.text}</span>
                  <i className="fas fa-chevron-right text-gray-400 transition group-hover:text-brand" />
                </div>
              ))}
            </div>
          </div>
        )}

        {screen === 'loading' && (
          <div className="fade-in py-20 text-center">
            <div className="border-brand mb-6 inline-block h-16 w-16 animate-spin rounded-full border-t-4 border-b-4" />
            <h2 className="mb-2 text-2xl font-bold text-gray-900">결과 분석 중...</h2>
            <p className="text-gray-500">당신의 성향을 로드맵 데이터베이스와 매칭하고 있습니다.</p>
          </div>
        )}

        {screen === 'result' && topResult && (
          <div className="fade-in w-full text-center">
            <h2 className="mb-2 text-3xl font-bold text-gray-900">분석 완료!</h2>
            <p className="mb-10 text-gray-500">당신에게 가장 추천하는 로드맵입니다.</p>

            <div className="border-brand relative mx-auto mb-10 max-w-md overflow-hidden rounded-xl border-2 bg-white p-8 shadow-2xl shadow-green-900/10">
              <div className="absolute inset-0 bg-green-500/5" />
              <div className="relative mb-6 flex justify-center">
                <div className="border-brand flex h-20 w-20 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-4xl shadow-sm text-brand">
                  <i className={`fas ${topResult.icon}`} />
                </div>
              </div>
              <h3 className="relative mb-4 text-3xl font-bold text-brand">{topResult.title}</h3>
              <p className="relative mb-6 leading-relaxed text-gray-600">{topResult.desc}</p>
              <div className="relative flex flex-col gap-3">
                <a
                  href={topRoadmapId ? `/roadmap?original=${topRoadmapId}` : '/roadmap-hub'}
                  className="bg-brand block w-full rounded-lg py-3 font-bold text-white shadow-md transition hover:bg-green-600"
                >
                  로드맵 학습하기
                </a>
                <button
                  type="button"
                  onClick={resetSurvey}
                  className="block w-full rounded-lg bg-gray-100 py-3 font-bold text-gray-700 transition hover:bg-gray-200"
                >
                  다시 테스트하기
                </button>
              </div>
            </div>

            <div className="mt-8 border-t border-gray-200 pt-8">
              <p className="mb-4 text-sm text-gray-500">다른 추천 로드맵</p>
              <div className="flex flex-wrap justify-center gap-4">
                {results.slice(1, 4).filter(([, score]) => score > 0).map(([key]) => {
                  const data = ROADMAPS[key]
                  const rid = getRoadmapId(key)
                  return data ? (
                    <a
                      key={key}
                      href={rid ? `/roadmap?original=${rid}` : '/roadmap-hub'}
                      className="survey-result-card flex items-center gap-2 rounded border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 shadow-sm hover:bg-gray-50"
                    >
                      <i className={`fas ${data.icon} text-gray-400`} /> {data.title}
                    </a>
                  ) : null
                })}
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="mt-auto border-t border-gray-200 py-6 text-center text-sm text-gray-500">
        &copy; 2026 DevPath. All rights reserved.
      </footer>
    </div>
  )
}

export default SurveyPage
