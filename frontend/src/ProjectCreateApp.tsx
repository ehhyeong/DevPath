import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { AUTH_SESSION_SYNC_EVENT, readStoredAuthSession } from './lib/auth-session'
import { showAuthToast } from './lib/auth-toast'
import LoginRequiredView from './components/LoginRequiredView'
import { projectApiRequest } from './project-api'

type ProjectVisibility = 'PUBLIC' | 'PRIVATE'

type ProjectResponse = {
  projectId: number
  workspaceId?: number | null
  name: string
  description?: string | null
  visibility?: ProjectVisibility
}

type ProjectCreatePanelProps = {
  onClose?: () => void
  onCreated?: () => void
}

export default function ProjectCreateApp() {
  const [session, setSession] = useState(() => readStoredAuthSession())

  useEffect(() => {
    document.title = 'DevPath - 새 스쿼드 결성'
    const previousHtmlOverflow = document.documentElement.style.overflow
    const previousBodyOverflow = document.body.style.overflow
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow
      document.body.style.overflow = previousBodyOverflow
    }
  }, [])

  useEffect(() => {
    const syncSession = () => setSession(readStoredAuthSession())
    window.addEventListener('storage', syncSession)
    window.addEventListener(AUTH_SESSION_SYNC_EVENT, syncSession)
    return () => {
      window.removeEventListener('storage', syncSession)
      window.removeEventListener(AUTH_SESSION_SYNC_EVENT, syncSession)
    }
  }, [])

  if (!session) return <LoginRequiredView />

  return (
    <main className="flex h-screen w-screen items-center justify-center bg-[#F1F5F9] p-4">
      <ProjectCreatePanel />
    </main>
  )
}

export function ProjectCreatePanel({ onClose, onCreated }: ProjectCreatePanelProps) {
  const params = new URLSearchParams(window.location.search)
  const linkedSquadId = params.get('squadId')
  const [name, setName] = useState(params.get('title') ?? '')
  const [squadName, setSquadName] = useState('')
  const [goal, setGoal] = useState(params.get('desc') ?? '')
  const [techStack, setTechStack] = useState(params.get('tech') ?? '')
  const [githubRepo, setGithubRepo] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const visibility: ProjectVisibility = 'PUBLIC'

  function handleBack() {
    if (onClose) {
      onClose()
      return
    }

    window.location.assign('/workspace-hub')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const session = readStoredAuthSession()

    if (!session?.accessToken) {
      setErrorMessage('로그인 후 프로젝트를 생성할 수 있습니다.')
      showAuthToast({
        message: '로그인이 필요한 작업입니다. 계속하려면 로그인해 주세요.',
        durationMs: 2400,
      })
      return
    }

    if (!githubRepo.trim()) {
      const proceed = window.confirm(
        "GitHub 저장소가 연동되지 않으면 협업 자동화 기능이 제한됩니다.\n이대로 스쿼드를 생성하시겠습니까?\n(나중에 '스쿼드 설정'에서 연동할 수 있습니다.)",
      )
      if (!proceed) {
        return
      }
    }

    setSubmitting(true)
    setErrorMessage(null)

    const description = [
      goal.trim() || '스쿼드 프로젝트 워크스페이스입니다.',
      squadName.trim() ? `스쿼드: ${squadName.trim()}` : null,
      techStack.trim() ? `사용 기술: ${techStack.trim()}` : null,
      githubRepo.trim() ? `GitHub: https://github.com/${githubRepo.trim()}` : null,
    ]
      .filter(Boolean)
      .join('\n')

    try {
      const created = await projectApiRequest<ProjectResponse>(
        '/api/projects',
        {
          method: 'POST',
          body: JSON.stringify({
            name: name.trim(),
            description,
          }),
        },
        'required',
      )

      await projectApiRequest<ProjectResponse>(
        `/api/projects/${created.projectId}/visibility`,
        {
          method: 'PATCH',
          body: JSON.stringify({ visibility }),
        },
        'required',
      )

      if (linkedSquadId && created.workspaceId) {
        await projectApiRequest(
          `/api/lounge/squads/${encodeURIComponent(linkedSquadId)}/workspace`,
          {
            method: 'PATCH',
            body: JSON.stringify({ workspaceId: created.workspaceId }),
          },
          'required',
        )
      }

      showAuthToast({
        message: '성공적으로 프로덕션 스쿼드가 결성되었습니다.',
        durationMs: 2200,
      })

      if (onCreated) {
        onCreated()
        return
      }

      window.location.assign('/workspace-hub')
    } catch (error) {
      console.error(error)
      setErrorMessage(error instanceof Error ? error.message : '프로젝트 생성에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="project-create-panel w-full max-w-5xl bg-white rounded-2xl shadow-2xl flex h-[560px] border border-gray-100 overflow-hidden">
      <div className="w-[35%] bg-gray-900 p-8 text-white flex flex-col justify-between relative shrink-0">
        <div className="relative z-10">
          <span className="inline-block bg-blue-500/20 text-blue-400 text-[10px] font-black px-2 py-1 rounded border border-blue-500/30 mb-4 uppercase tracking-widest">Team Squad</span>
          <h2 className="text-3xl font-black mb-4 leading-tight tracking-tight">
            새로운 스쿼드를
            <br />
            결성합니다.
          </h2>
          <p className="text-gray-400 text-xs leading-relaxed space-y-3">
            <span className="block">동료들과 하나의 목표를 공유하고 정교한 아키텍처를 빌드하는 공간입니다.</span>
            <span className="block text-blue-300 font-medium">GitHub을 연동하여 코드 리뷰, 칸반 보드, AI 분석 등 강력한 협업 엔진을 활성화하세요.</span>
          </p>
        </div>
        <button
          type="button"
          onClick={handleBack}
          className="relative z-10 text-gray-400 hover:text-white text-xs font-bold flex items-center gap-2 transition w-fit bg-white/5 hover:bg-white/10 px-3 py-2 rounded-lg border border-white/10"
        >
          <i className="fas fa-arrow-left"></i> 로비로 돌아가기
        </button>
        <div className="absolute bottom-[-30px] right-[-30px] w-56 h-56 bg-blue-600 rounded-full blur-[90px] opacity-30 pointer-events-none"></div>
      </div>

      <form onSubmit={handleSubmit} className="w-[65%] p-8 flex flex-col justify-between bg-white relative">
        <div>
          <h3 className="text-xl font-black text-gray-900 flex items-center gap-2 tracking-tight">
            <i className="fas fa-cubes text-blue-500"></i> 워크스페이스 프로필 설정
          </h3>
          <p className="text-xs text-gray-400 mt-1 font-medium">스쿼드의 기본 식별 정보와 개발 환경 백본을 정의합니다.</p>
        </div>

        <div className="space-y-4 my-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-gray-600 mb-1.5 flex items-center gap-1.5">
                <i className="fas fa-folder-open text-gray-400"></i> 프로젝트 명
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 transition shadow-inner bg-gray-50/50"
                placeholder="예: 배달비 절약 플랫폼 빌드"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-gray-600 mb-1.5 flex items-center gap-1.5">
                <i className="fas fa-id-badge text-gray-400"></i> 스쿼드(팀) 이름
              </label>
              <input
                type="text"
                value={squadName}
                onChange={(event) => setSquadName(event.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 transition shadow-inner bg-gray-50/50"
                placeholder="예: Team_Squad_A"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-gray-600 mb-1.5 flex items-center gap-1.5">
              <i className="fas fa-align-left text-gray-400"></i> 핵심 목표 및 한 줄 소개
            </label>
            <input
              type="text"
              value={goal}
              onChange={(event) => setGoal(event.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 transition shadow-inner bg-gray-50/50"
              placeholder="예: GPS 기반 근거리 매칭을 통한 실시간 배달팟 모집 서비스"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-gray-600 mb-1.5 flex items-center gap-1.5">
              <i className="fas fa-layer-group text-gray-400"></i> 사용 기술 스택
            </label>
            <input
              type="text"
              value={techStack}
              onChange={(event) => setTechStack(event.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 transition shadow-inner bg-gray-50/50"
              placeholder="예: React, TypeScript, Spring Boot, Redis, MySQL"
            />
          </div>

          <div className="pt-3">
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
                <i className="fab fa-github text-lg text-black"></i> GitHub 저장소 연동
                <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border border-blue-100">핵심 기능</span>
              </label>
            </div>
            <div className="relative flex items-center github-input-group mb-2">
              <span className="prefix absolute left-3 text-xs text-gray-400 font-mono transition">https://github.com/</span>
              <input
                type="text"
                value={githubRepo}
                onChange={(event) => setGithubRepo(event.target.value)}
                className="w-full border-2 border-gray-200 hover:border-gray-300 rounded-xl pl-[140px] pr-3 py-2.5 text-sm font-mono outline-none focus:border-blue-500 focus:bg-blue-50/10 transition shadow-sm bg-gray-50 hover:bg-white"
                placeholder="organization/repository"
              />
            </div>
            <p className="text-[10px] text-gray-500 font-medium">
              <i className="fas fa-info-circle text-blue-400 mr-0.5"></i> 연동 시 코드 리뷰, 칸반 보드, AI 분석이 자동 동기화됩니다.
            </p>
          </div>

          {errorMessage ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-600">{errorMessage}</p>
          ) : null}
        </div>

        <div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-gray-900 hover:bg-black text-white py-3.5 rounded-xl font-bold shadow-xl shadow-gray-900/20 transition transform active:scale-[0.98] text-sm flex justify-center items-center gap-2 disabled:opacity-80 disabled:pointer-events-none"
          >
            {submitting ? (
              <>
                <i className="fas fa-spinner fa-spin mr-1"></i> 인프라 구성 및 동기화 중...
              </>
            ) : (
              <>
                <i className="fas fa-rocket text-blue-400"></i> 엔터프라이즈 스쿼드 생성
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
