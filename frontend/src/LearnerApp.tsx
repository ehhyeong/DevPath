import { useEffect, useState } from 'react'
import LearnerLayout from './account/LearnerLayout'
import DashboardPage from './account/pages/DashboardPage'
import LearningLogGalleryPage from './account/pages/LearningLogGalleryPage'
import MyLearningPage from './account/pages/MyLearningPage'
import MyPostsPage from './account/pages/MyPostsPage'
import ProfilePage from './account/pages/ProfilePage'
import PurchasePage from './account/pages/PurchasePage'
import SettingsPage from './account/pages/SettingsPage'
import { authApi } from './lib/api'
import { getAccountPageMeta, getCurrentAccountPageKey, type AccountPageKey } from './lib/account-navigation'
import { AUTH_SESSION_SYNC_EVENT, clearStoredAuthSession, readStoredAuthSession } from './lib/auth-session'
import { PROFILE_UPDATED_EVENT, type ProfileSyncPayload } from './lib/profile-sync'
import type { AuthSession } from './types/auth'

function LoginRequiredView() {
  return (
    <div className="min-h-screen bg-[#f6f8fb] px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-[36px] border border-white/70 bg-white px-8 py-10 text-center shadow-xl shadow-gray-900/5">
          <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <i className="fas fa-user-lock text-2xl" />
          </div>
          <h1 className="mt-5 text-3xl font-black text-gray-900">로그인이 필요합니다.</h1>
          <p className="mt-3 text-sm leading-7 text-gray-500">
            대시보드와 내 학습 영역은 로그인한 사용자만 접근할 수 있습니다.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <a
              href="/home?auth=login"
              className="rounded-full bg-gray-900 px-6 py-3 text-sm font-bold text-white transition hover:bg-black"
            >
              로그인으로 이동
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

function LearnerPageRouter({
  session,
  currentPageKey,
}: {
  session: AuthSession
  currentPageKey: AccountPageKey
}) {
  switch (currentPageKey) {
    case 'dashboard':
      return <DashboardPage session={session} />
    case 'my-learning':
      return <MyLearningPage />
    case 'purchase':
      return <PurchasePage />
    case 'my-posts':
      return <MyPostsPage session={session} />
    case 'profile':
      return <ProfilePage session={session} />
    case 'settings':
      return <SettingsPage session={session} />
    case 'learning-log-gallery':
      return <LearningLogGalleryPage />
    default:
      return <DashboardPage session={session} />
  }
}

export default function LearnerApp() {
  const currentPageKey = getCurrentAccountPageKey()
  const pageMeta = getAccountPageMeta(currentPageKey)
  const [session, setSession] = useState(() => readStoredAuthSession())

  useEffect(() => {
    document.title = `DevPath - ${pageMeta.label}`
  }, [pageMeta.label])

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

  async function handleLogout() {
    const currentSession = readStoredAuthSession()

    try {
      if (currentSession?.refreshToken) {
        await authApi.logout(currentSession.refreshToken)
      }
    } catch {
      // Keep the client session cleanup even if the API call fails.
    } finally {
      clearStoredAuthSession({ persistToast: true })
      setSession(null)
      window.location.href = '/home?auth=login'
    }
  }

  if (!session) {
    return <LoginRequiredView />
  }

  return (
    <LearnerLayout session={session} currentPageKey={currentPageKey} onLogout={handleLogout}>
      <LearnerPageRouter session={session} currentPageKey={currentPageKey} />
    </LearnerLayout>
  )
}
