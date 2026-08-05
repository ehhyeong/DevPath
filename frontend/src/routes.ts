export const ACCOUNT_PAGE_ROUTES = new Set([
  '/dashboard',
  '/my-learning',
  '/purchase',
  '/my-posts',
  '/profile',
  '/settings',
  '/learning-log-gallery',
])

export const INSTRUCTOR_PAGE_ROUTES = new Set([
  '/instructor-dashboard',
  '/course-management',
  '/instructor-mentoring',
  '/student-analytics',
  '/instructor-qna',
  '/instructor-reviews',
  '/instructor-revenue',
  '/instructor-marketing',
])

export function getCurrentPathname() {
  const pathname = window.location.pathname.replace(/\/+$/, '') || '/'

  if (pathname !== '/singup') {
    return pathname
  }

  const nextUrl = `/signup${window.location.search}${window.location.hash}`
  window.history.replaceState({}, '', nextUrl)
  return '/signup'
}
