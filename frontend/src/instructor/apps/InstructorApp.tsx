import { useAuthSession } from '../../lib/useAuthSession'
import { lazy, Suspense, useEffect, useState } from 'react'
import { authApi, userApi } from '../../lib/api/auth'
import { AUTH_SESSION_SYNC_EVENT, clearStoredAuthSession, readStoredAuthSession } from '../../lib/auth-session'
import { PROFILE_UPDATED_EVENT, type ProfileSyncPayload } from '../../lib/profile-sync'
import type { AuthSession } from '../../types/auth'
import LoginRequiredGate from '../../components/LoginRequiredView'
import InstructorLayout from '../layout/InstructorLayout'
import { getCurrentInstructorPageKey, getInstructorPageKey, getInstructorPageMeta, type InstructorPageKey } from '../navigation'

const instructorPageLoaders = {
  dashboard: () => import('../pages/InstructorDashboardPage'),
  'course-management': () => import('../pages/CourseManagementPage'),
  mentoring: () => import('../pages/InstructorMentoringPage'),
  'student-analytics': () => import('../pages/StudentAnalyticsPage'),
  qna: () => import('../pages/InstructorQnaPage'),
  reviews: () => import('../pages/InstructorReviewsPage'),
  revenue: () => import('../pages/InstructorRevenuePage'),
  marketing: () => import('../pages/InstructorMarketingPage'),
}

const InstructorDashboardPage = lazy(instructorPageLoaders.dashboard)
const CourseManagementPage = lazy(instructorPageLoaders['course-management'])
const InstructorMentoringPage = lazy(instructorPageLoaders.mentoring)
const StudentAnalyticsPage = lazy(instructorPageLoaders['student-analytics'])
const InstructorQnaPage = lazy(instructorPageLoaders.qna)
const InstructorReviewsPage = lazy(instructorPageLoaders.reviews)
const InstructorRevenuePage = lazy(instructorPageLoaders.revenue)
const InstructorMarketingPage = lazy(instructorPageLoaders.marketing)

export function preloadInstructorPage(pathname: string) {
  return instructorPageLoaders[getInstructorPageKey(pathname)]()
}

function InstructorPageLoadingView() {
  return (
    <div className="flex min-h-[240px] items-center justify-center bg-[#F8F9FA] text-sm font-semibold text-gray-500" role="status">
      <i className="fas fa-circle-notch fa-spin mr-2 text-[#00c471]" aria-hidden="true" />
      강사 화면을 준비하는 중입니다.
    </div>
  )
}

function LoginRequiredView() {
  return <LoginRequiredGate message="강사 전용 대시보드는 로그인한 강사 계정으로만 접근할 수 있습니다." />
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

function InstructorPageRouter({
  currentPageKey,
  session,
}: {
  currentPageKey: InstructorPageKey
  session: AuthSession
}) {
  switch (currentPageKey) {
    case 'dashboard':
      return <InstructorDashboardPage session={session} />
    case 'course-management':
      return <CourseManagementPage />
    case 'mentoring':
      return <InstructorMentoringPage />
    case 'student-analytics':
      return <StudentAnalyticsPage />
    case 'qna':
      return <InstructorQnaPage session={session} />
    case 'reviews':
      return <InstructorReviewsPage session={session} />
    case 'revenue':
      return <InstructorRevenuePage />
    case 'marketing':
      return <InstructorMarketingPage />
    default:
      return <InstructorDashboardPage session={session} />
  }
}

export default function InstructorApp() {
  const currentPageKey = getCurrentInstructorPageKey()
  const pageMeta = getInstructorPageMeta(currentPageKey)
  const [session,setSession] = useAuthSession()
  const [profileImage, setProfileImage] = useState<string | null>(null)

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
  }, [setSession])

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
      // Keep the client-side cleanup even if the server request fails.
    } finally {
      clearStoredAuthSession({ toastMessage: null })
      setSession(null)
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
      session={session}
      profileImage={profileImage}
      currentPageKey={currentPageKey}
      onLogout={handleLogout}
    >
      <Suspense fallback={<InstructorPageLoadingView />}>
        <InstructorPageRouter currentPageKey={currentPageKey} session={session} />
      </Suspense>
    </InstructorLayout>
  )
}
