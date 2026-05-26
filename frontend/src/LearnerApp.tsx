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
import LoginRequiredGate from './components/LoginRequiredView'

function LoginRequiredView() {
  return <LoginRequiredGate message="대시보드와 내 학습 영역은 로그인한 사용자만 접근할 수 있습니다." />
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
      clearStoredAuthSession({ toastMessage: null })
      setSession(null)
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
