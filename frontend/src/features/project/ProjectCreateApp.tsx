import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { AUTH_SESSION_SYNC_EVENT, readStoredAuthSession } from '../../lib/auth-session'
import { showAuthToast } from '../../lib/auth-toast'
import LoginRequiredView from '../../components/LoginRequiredView'
import { projectApiRequest } from './api'

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
    <div className="project-create-panel flex h-[560px]! w-full max-w-[1024px]! overflow-hidden rounded-[16px]! border border-gray-100 bg-white font-['Pretendard',sans-serif]! tracking-[0]! shadow-2xl [box-sizing:border-box]! [&_*]:box-border! [&_*]:tracking-[0]! [&_h2]:mb-[16px]! [&_h2]:text-[30px]! [&_h2]:leading-[36px]! [&_h2]:font-black! [&_h2]:text-white! [&_h3]:text-[20px]! [&_h3]:leading-[28px]! [&_h3]:font-black! [&_h3]:text-[#111827]! [&_p]:text-[12px]! [&_p]:leading-[19px]! [&_label]:mb-[6px]! [&_label]:text-[11px]! [&_label]:leading-[16px]! [&_label]:font-bold! [&_input]:h-[38px]! [&_input]:rounded-[12px]! [&_input]:px-[12px]! [&_input]:py-[8px]! [&_input]:text-[14px]! [&_input]:leading-[20px]! [&_input]:text-[#111827]! [&_input::placeholder]:text-[14px]! [&_input::placeholder]:text-[#9CA3AF]!">
      <div className="relative flex w-[35%]! shrink-0 flex-col justify-between bg-gray-900 p-[32px]! text-white">
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
          className="relative z-10 flex min-h-[32px]! w-fit! items-center gap-2 rounded-[8px]! border border-white/10 bg-white/5 px-[12px]! py-[8px]! text-[12px]! leading-[16px]! font-bold! text-gray-400 transition hover:bg-white/10 hover:text-white"
        >
          <i className="fas fa-arrow-left"></i> 로비로 돌아가기
        </button>
        <div className="absolute bottom-[-30px] right-[-30px] w-56 h-56 bg-blue-600 rounded-full blur-[90px] opacity-30 pointer-events-none"></div>
      </div>

      <form onSubmit={handleSubmit} className="relative flex w-[65%]! flex-col justify-between bg-white p-[32px]!">
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
              <span className="prefix absolute left-[12px]! font-mono text-[12px]! leading-[16px]! text-[#9CA3AF]! transition">https://github.com/</span>
              <input
                type="text"
                value={githubRepo}
                onChange={(event) => setGithubRepo(event.target.value)}
                className="h-[46px]! w-full rounded-[12px]! border-[2px]! border-gray-200 bg-gray-50 pt-[10px]! pr-[12px]! pb-[10px]! pl-[140px]! font-mono! text-[14px]! leading-[20px]! shadow-sm transition [&&]:h-[46px]! [&&]:pt-[10px]! [&&]:pr-[12px]! [&&]:pb-[10px]! [&&]:pl-[140px]! hover:border-gray-300 hover:bg-white focus:border-blue-500 focus:bg-blue-50/10 outline-none"
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
            className="flex h-[50px]! w-full transform items-center justify-center gap-2 rounded-[12px]! bg-gray-900 px-0! py-[14px]! text-[14px]! leading-[20px]! font-bold! text-white shadow-xl shadow-gray-900/20 transition hover:bg-black active:scale-[0.98] disabled:pointer-events-none disabled:opacity-80"
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
