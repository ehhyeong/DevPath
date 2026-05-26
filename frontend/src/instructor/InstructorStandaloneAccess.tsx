import { useEffect, useState, type ReactNode } from 'react'
import { AUTH_SESSION_SYNC_EVENT, readStoredAuthSession } from '../lib/auth-session'
import LoginRequiredGate from '../components/LoginRequiredView'

function LoginRequiredView() {
  return <LoginRequiredGate message="강사용 편집 페이지는 로그인한 강사 계정으로만 접근할 수 있습니다." />
}

function InstructorOnlyView() {
  return (
    <div className="min-h-screen bg-[#f6f8fb] px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-[36px] border border-white/70 bg-white px-8 py-10 text-center shadow-xl shadow-gray-900/5">
          <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-600">
            <i className="fas fa-user-shield text-2xl" />
          </div>
          <h1 className="mt-5 text-3xl font-black text-gray-900">강사 계정만 접근 가능합니다</h1>
          <p className="mt-3 text-sm leading-7 text-gray-500">
            현재 로그인한 계정은 강사 권한이 없습니다. 강사 계정으로 다시 로그인해 주세요.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <a
              href="/home"
              className="rounded-full bg-gray-900 px-6 py-3 text-sm font-bold text-white transition hover:bg-black"
            >
              홈으로 이동
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

type Props = {
  title: string
  children: ReactNode
}

export default function InstructorStandaloneAccess({ title, children }: Props) {
  const [session, setSession] = useState(() => readStoredAuthSession())

  useEffect(() => {
    document.title = title
  }, [title])

  useEffect(() => {
    const syncSession = () => {
      setSession(readStoredAuthSession())
    }

    window.addEventListener('storage', syncSession)
    window.addEventListener(AUTH_SESSION_SYNC_EVENT, syncSession)

    return () => {
      window.removeEventListener('storage', syncSession)
      window.removeEventListener(AUTH_SESSION_SYNC_EVENT, syncSession)
    }
  }, [])

  if (!session) {
    return <LoginRequiredView />
  }

  if (session.role !== 'ROLE_INSTRUCTOR') {
    return <InstructorOnlyView />
  }

  return <>{children}</>
}
