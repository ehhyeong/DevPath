import { useEffect, useState } from 'react'
import { authApi, userApi } from './lib/api'
import { AUTH_SESSION_SYNC_EVENT, clearStoredAuthSession, readStoredAuthSession } from './lib/auth-session'
import { PROFILE_UPDATED_EVENT, type ProfileSyncPayload } from './lib/profile-sync'
import type { AuthSession } from './types/auth'
import InstructorLayout from './instructor/layout/InstructorLayout'
import CourseEditorPage from './instructor/pages/CourseEditorPage'

function LoginRequiredView() {
  return (
    <div className="min-h-screen bg-[#f6f8fb] px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-[36px] border border-white/70 bg-white px-8 py-10 text-center shadow-xl shadow-gray-900/5">
          <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <i className="fas fa-user-lock text-2xl" />
          </div>
          <h1 className="mt-5 text-3xl font-black text-gray-900">로그인이 필요합니다</h1>
          <p className="mt-3 text-sm leading-7 text-gray-500">
            강의 편집기는 로그인한 강사 계정으로만 접근할 수 있습니다.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <a
              href="/home?auth=login"
              className="rounded-full bg-gray-900 px-6 py-3 text-sm font-bold text-white transition hover:bg-black"
            >
              로그인하러 가기
            </a>
            <a
              href="/home"
              className="rounded-full border border-gray-200 px-6 py-3 text-sm font-bold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
            >
              홈으로 돌아가기
            </a>
          </div>
        </div>
      </div>
    </div>
  )
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

export default function CourseEditorApp() {
  const [session, setSession] = useState(() => readStoredAuthSession())
  const [profileImage, setProfileImage] = useState<string | null>(null)

  useEffect(() => {
    document.title = 'DevPath - 강의 편집기'
  }, [])

  useEffect(() => {
    const syncSession = () => {
      setSession(readStoredAuthSession())
    }

    const syncProfile = (event: Event) => {
      const profileEvent = event as CustomEvent<ProfileSyncPayload>

      setSession((current) =>
        current
          ? {
              ...current,
              name: profileEvent.detail.name,
            }
          : readStoredAuthSession(),
      )
      setProfileImage(profileEvent.detail.profileImage)
    }

    window.addEventListener('storage', syncSession)
    window.addEventListener(AUTH_SESSION_SYNC_EVENT, syncSession)
    window.addEventListener(PROFILE_UPDATED_EVENT, syncProfile)
    syncSession()

    return () => {
      window.removeEventListener('storage', syncSession)
      window.removeEventListener(AUTH_SESSION_SYNC_EVENT, syncSession)
      window.removeEventListener(PROFILE_UPDATED_EVENT, syncProfile)
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

  async function handleLogout() {
    const currentSession = readStoredAuthSession()

    try {
      if (currentSession?.refreshToken) {
        await authApi.logout(currentSession.refreshToken)
      }
    } catch {
      // Keep local cleanup even if the server logout request fails.
    } finally {
      clearStoredAuthSession({ persistToast: true })
      setSession(null)
      window.location.href = '/home?auth=login'
    }
  }

  if (!session) {
    return <LoginRequiredView />
  }

  if (session.role !== 'ROLE_INSTRUCTOR') {
    return <InstructorOnlyView />
  }

  return (
    <InstructorLayout
      session={session as AuthSession}
      profileImage={profileImage}
      currentPageKey="course-management"
      onLogout={handleLogout}
    >
      <CourseEditorPage />
    </InstructorLayout>
  )
}
