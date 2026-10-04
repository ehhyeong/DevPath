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

export const PROJECT_HUB_PAGE_ROUTES = new Set([
  '/lounge-dashboard',
  '/community-lounge',
  '/mentoring-hub',
  '/workspace-hub',
  '/dev-showcase',
])

export const MENTORING_WORKSPACE_ROUTES = new Set([
  '/mentoring-dashboard',
  '/mentoring-workspace',
  '/mentoring-curriculum',
  '/mentoring-qna',
  '/mentoring-schedule',
  '/mentoring-files',
  '/mentoring-meeting',
  '/mentoring-erd',
])

export const SQUAD_WORKSPACE_ROUTES = new Set([
  '/squad-dashboard',
  '/squad-blueprint',
  '/squad-workspace',
  '/squad-review',
  '/squad-erd',
  '/squad-api',
  '/squad-schedule',
  '/squad-files',
  '/squad-meeting',
  '/squad-interview',
  '/squad-settings',
])

export function normalizePathname(pathname: string) {
  const normalized = pathname.replace(/\/+$/, '') || '/'
  return normalized === '/singup' ? '/signup' : normalized
}

export function getCurrentPathname() {
  const currentPathname = window.location.pathname.replace(/\/+$/, '') || '/'
  const pathname = normalizePathname(currentPathname)

  if (currentPathname !== '/singup') {
    return pathname
  }

  const nextUrl = `/signup${window.location.search}${window.location.hash}`
  window.history.replaceState({}, '', nextUrl)
  return '/signup'
}
