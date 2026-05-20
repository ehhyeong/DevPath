import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { AUTH_SESSION_SYNC_EVENT, readStoredAuthSession } from './lib/auth-session'
import LoginRequiredView from './components/LoginRequiredView'
import { projectApiRequest } from './project-api'

type ProjectType = 'SOLO' | 'SQUAD'
type ProjectVisibility = 'PUBLIC' | 'PRIVATE'

type ProjectResponse = {
  projectId: number
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
    document.title = 'DevPath - 프로젝트 생성'
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
    <main className="flex h-screen items-center justify-center">
      <ProjectCreatePanel />
    </main>
  )
}

export function ProjectCreatePanel({ onClose, onCreated }: ProjectCreatePanelProps) {
  const [projectType, setProjectType] = useState<ProjectType>('SOLO')
  const [name, setName] = useState('')
  const [techStack, setTechStack] = useState('')
  const [visibility, setVisibility] = useState<ProjectVisibility>('PUBLIC')
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  function handleBack() {
    if (onClose) {
      onClose()
      return
    }

    window.location.assign('workspace-hub.html')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const session = readStoredAuthSession()

    if (!session?.accessToken) {
      window.location.assign('login.html')
      return
    }

    setSubmitting(true)
    setErrorMessage(null)

    const description = techStack.trim()
      ? `사용 기술: ${techStack.trim()}`
      : projectType === 'SOLO'
        ? '개인 프로젝트 워크스페이스입니다.'
        : '팀 스쿼드 프로젝트 워크스페이스입니다.'

    try {
      const created = await projectApiRequest<ProjectResponse>(
        projectType === 'SOLO' ? '/api/projects/solo' : '/api/projects',
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

      if (onCreated) {
        onCreated()
        return
      }

      window.location.assign('workspace-hub.html')
    } catch (error) {
      console.error(error)
      setErrorMessage(error instanceof Error ? error.message : '프로젝트 생성에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden flex h-[580px]">
      <div className="w-1/3 bg-gray-900 p-8 text-white flex flex-col justify-between relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl font-bold mb-4 leading-tight">
            어떤 프로젝트를
            <br />
            시작할까요?
          </h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            자유롭게 주제를 정하고
            <br />
            기록을 남기며 성장하세요.
            <br />
            생성된 프로젝트는 '워크스페이스'에서
            <br />
            언제든 확인할 수 있습니다.
          </p>
        </div>
        <button
          type="button"
          onClick={handleBack}
          className="relative z-10 text-gray-400 hover:text-white text-sm flex items-center gap-2 transition"
        >
          <i className="fas fa-arrow-left"></i> 목록으로 돌아가기
        </button>
        <div className="absolute bottom-[-20px] right-[-20px] w-40 h-40 bg-brand rounded-full blur-[80px] opacity-20"></div>
      </div>

      <form onSubmit={handleSubmit} className="w-2/3 p-8 flex flex-col justify-center">
        <h3 className="text-lg font-bold text-gray-900 mb-5">프로젝트 설정</h3>

        <div className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">유형 (TYPE)</label>
            <div className="grid grid-cols-2 gap-3">
              <TypeCard
                selected={projectType === 'SOLO'}
                icon="fa-user"
                title="개인 프로젝트 (Solo)"
                subtitle="혼자서 기획하고 개발합니다."
                iconBoxClass="w-8 h-8 bg-green-100 text-brand rounded-lg flex items-center justify-center text-lg mb-2"
                onClick={() => setProjectType('SOLO')}
              />
              <TypeCard
                selected={projectType === 'SQUAD'}
                icon="fa-users"
                title="팀 스쿼드 (Squad)"
                subtitle="팀원들과 협업 공간을 만듭니다."
                iconBoxClass="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center text-lg mb-2"
                onClick={() => setProjectType('SQUAD')}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">프로젝트 명</label>
              <input
                type="text"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-brand transition"
                placeholder="예: 토이 프로젝트 - 투두리스트"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">사용 기술 (스택)</label>
              <input
                type="text"
                value={techStack}
                onChange={(event) => setTechStack(event.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-brand transition"
                placeholder="예: React, Node.js"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-2">공개 설정</label>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm cursor-pointer text-gray-700">
                  <input
                    type="radio"
                    name="visibility"
                    checked={visibility === 'PUBLIC'}
                    onChange={() => setVisibility('PUBLIC')}
                    className="accent-brand w-4 h-4"
                  />
                  <span>
                    공개 <span className="text-xs text-gray-400">(포트폴리오 노출)</span>
                  </span>
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer text-gray-700">
                  <input
                    type="radio"
                    name="visibility"
                    checked={visibility === 'PRIVATE'}
                    onChange={() => setVisibility('PRIVATE')}
                    className="accent-brand w-4 h-4"
                  />
                  <span>비공개</span>
                </label>
              </div>
            </div>
          </div>

          {errorMessage ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-600">{errorMessage}</p>
          ) : null}

          <div className="pt-2">
            <button
              type="submit"
              className="w-full bg-gray-900 hover:bg-black text-white py-3 rounded-xl font-bold shadow-lg transition transform active:scale-95 text-sm"
            >
              {submitting ? '프로젝트 생성 중입니다.' : '프로젝트 생성 완료'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

function TypeCard({
  selected,
  icon,
  title,
  subtitle,
  iconBoxClass,
  onClick,
}: {
  selected: boolean
  icon: string
  title: string
  subtitle: string
  iconBoxClass: string
  onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={
        selected
          ? 'type-card bg-gray-50 p-3 rounded-xl cursor-pointer relative selected'
          : 'type-card bg-gray-50 p-3 rounded-xl cursor-pointer relative'
      }
    >
      <i className={`fas fa-check-circle absolute top-3 right-3 text-brand ${selected ? 'opacity-1' : 'opacity-0'} check-icon transition`}></i>
      <div className={iconBoxClass}>
        <i className={`fas ${icon}`}></i>
      </div>
      <h4 className="font-bold text-gray-800 text-sm">{title}</h4>
      <p className="text-[11px] text-gray-500 mt-0.5">{subtitle}</p>
    </div>
  )
}
