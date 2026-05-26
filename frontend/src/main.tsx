import { Suspense, lazy, type ReactElement } from 'react'
import App from './App.tsx'
import CourseDetailApp from './CourseDetailApp'
import InstructorChannelApp from './InstructorChannelApp'
import JobMatchingApp from './JobMatchingApp'
import LectureListApp from './LectureListApp'
import MyRoadmapListPage from './pages/MyRoadmapListPage'
import { renderPage } from './render-page'
import RoadmapHubApp from './RoadmapHubApp'
import SquadDashboardApp from './SquadDashboardApp'
import SquadErdApp from './SquadErdApp'
import SquadFilesApp from './SquadFilesApp'
import SquadMeetingApp from './SquadMeetingApp'
import SquadReviewApp from './SquadReviewApp'
import SquadScheduleApp from './SquadScheduleApp'
import SquadSettingsApp from './SquadSettingsApp'
import SquadWorkspaceApp from './SquadWorkspaceApp'
import { installWorkspacePresenceHeartbeat } from './lib/workspace-presence'

const ContentAssignmentEditorApp = lazy(() => import('./ContentAssignmentEditorApp'))
const CourseEditorApp = lazy(() => import('./CourseEditorApp'))
const CommunityLoungeApp = lazy(() => import('./CommunityLoungeApp'))
const CommunityListPage = lazy(() => import('./pages/CommunityListPage'))
const CommunityWritePage = lazy(() => import('./pages/CommunityWritePage'))
const DevShowcaseApp = lazy(() => import('./DevShowcaseApp'))
const InstructorApp = lazy(() => import('./InstructorApp'))
const InstructorCourseDetailApp = lazy(() => import('./InstructorCourseDetailApp'))
const InstructorEditProfileApp = lazy(() => import('./InstructorEditProfileApp'))
const InstructorWsDashboardApp = lazy(() => import('./InstructorWsDashboardApp'))
const LearnerApp = lazy(() => import('./LearnerApp'))
const LearningPlayerApp = lazy(() => import('./LearningPlayerApp'))
const LoginApp = lazy(() => import('./LoginApp'))
const LoungeDashboardApp = lazy(() => import('./LoungeDashboardApp'))
const MentoringCommonWorkspaceApp = lazy(() => import('./MentoringCommonWorkspaceApp'))
const MentoringHubApp = lazy(() => import('./MentoringHubApp'))
const MyRoadmapBuilderApp = lazy(() => import('./MyRoadmapBuilderApp'))
const OAuthRedirectApp = lazy(() => import('./OAuthRedirectApp'))
const ProjectCreateApp = lazy(() => import('./ProjectCreateApp'))
const QuizCreatorApp = lazy(() => import('./QuizCreatorApp'))
const RoadmapApp = lazy(() => import('./RoadmapApp'))
const SignupApp = lazy(() => import('./SignupApp'))
const SurveyApp = lazy(() => import('./SurveyApp'))
const TeamWorkspaceDashboardApp = lazy(() => import('./TeamWorkspaceDashboardApp'))
const TeamWorkspaceMilestoneApp = lazy(() => import('./TeamWorkspaceMilestoneApp'))
const TeamWorkspaceSuiteApp = lazy(() => import('./TeamWorkspaceSuiteApp'))
const WorkspaceHubApp = lazy(() => import('./WorkspaceHubApp'))

const accountPageRoutes = new Set([
  '/dashboard',
  '/my-learning',
  '/purchase',
  '/my-posts',
  '/profile',
  '/settings',
  '/learning-log-gallery',
])

const instructorPageRoutes = new Set([
  '/instructor-dashboard',
  '/course-management',
  '/instructor-mentoring',
  '/student-analytics',
  '/instructor-qna',
  '/instructor-reviews',
  '/instructor-revenue',
  '/instructor-marketing',
])

function suspense(page: ReactElement) {
  return <Suspense fallback={null}>{page}</Suspense>
}

let pathname = window.location.pathname.replace(/\/+$/, '')

if (pathname === '') {
  pathname = '/'
}

if (pathname === '/singup') {
  const nextUrl = `/signup${window.location.search}${window.location.hash}`
  window.history.replaceState({}, '', nextUrl)
  pathname = '/signup'
}

installWorkspacePresenceHeartbeat(pathname)

if (pathname === '/admin-dashboard') {
  void import('./admin-dashboard').then(({ mountAdminDashboardPage }) => {
    mountAdminDashboardPage()
  })
} else {
  const page =
    pathname === '/' || pathname === '/home'
      ? <App />
      : pathname === '/login'
        ? suspense(<LoginApp />)
        : pathname === '/signup'
          ? suspense(<SignupApp />)
          : pathname === '/oauth2/redirect'
            ? suspense(<OAuthRedirectApp />)
            : accountPageRoutes.has(pathname)
              ? suspense(<LearnerApp />)
              : pathname === '/instructor-channel' || pathname === '/instructor-profile'
                ? <InstructorChannelApp />
                : pathname === '/instructor-course-detail'
                  ? suspense(<InstructorCourseDetailApp />)
                  : pathname === '/instructor-edit-profile'
                    ? suspense(<InstructorEditProfileApp />)
                    : pathname === '/instructor-ws-dashboard'
                      ? suspense(<InstructorWsDashboardApp />)
                    : instructorPageRoutes.has(pathname)
                      ? suspense(<InstructorApp />)
                      : pathname === '/course-editor'
                        ? suspense(<CourseEditorApp />)
                        : pathname === '/quiz-creator'
                          ? suspense(<QuizCreatorApp />)
                          : pathname === '/content-assignment-editor'
                            ? suspense(<ContentAssignmentEditorApp />)
                            : pathname === '/lounge-dashboard'
                              ? suspense(<LoungeDashboardApp />)
                              : pathname === '/community-list'
                                ? suspense(<CommunityListPage />)
                                : pathname === '/community-write'
                                  ? suspense(<CommunityWritePage />)
                                  : pathname === '/community-lounge'
                                    ? suspense(<CommunityLoungeApp />)
                                : pathname === '/mentoring-hub'
                                  ? suspense(<MentoringHubApp />)
                                  : pathname === '/workspace-hub'
                                    ? suspense(<WorkspaceHubApp />)
                                    : pathname === '/mentoring-dashboard'
                                      ? suspense(<MentoringCommonWorkspaceApp page="dashboard" />)
                                      : pathname === '/mentoring-workspace'
                                        ? suspense(<MentoringCommonWorkspaceApp page="workspace" />)
                                        : pathname === '/mentoring-curriculum'
                                          ? suspense(<MentoringCommonWorkspaceApp page="curriculum" />)
                                          : pathname === '/mentoring-qna'
                                            ? suspense(<MentoringCommonWorkspaceApp page="qna" />)
                                            : pathname === '/mentoring-schedule'
                                              ? suspense(<MentoringCommonWorkspaceApp page="schedule" />)
                                              : pathname === '/mentoring-files'
                                                ? suspense(<MentoringCommonWorkspaceApp page="files" />)
                                                : pathname === '/mentoring-meeting'
                                                  ? suspense(<MentoringCommonWorkspaceApp page="meeting" />)
                                                  : pathname === '/mentoring-live-meeting'
                                                    ? suspense(<MentoringCommonWorkspaceApp page="live-meeting" />)
                                                    : pathname === '/mentoring-erd'
                                                      ? suspense(<MentoringCommonWorkspaceApp page="erd" />)
                                    : pathname === '/dev-showcase'
                                      ? suspense(<DevShowcaseApp />)
                                      : pathname === '/project-create'
                                        ? suspense(<ProjectCreateApp />)
                                        : pathname === '/learning'
                                          ? suspense(<LearningPlayerApp />)
                                          : pathname === '/course-detail'
                                            ? <CourseDetailApp />
                                            : pathname === '/lecture-list'
                                              ? <LectureListApp />
                                              : pathname === '/roadmap'
                                                ? suspense(<RoadmapApp />)
                                                : pathname === '/roadmap-hub'
                                                  ? <RoadmapHubApp />
                                                  : pathname === '/survey'
                                                    ? suspense(<SurveyApp />)
                                                    : pathname === '/job-matching'
                                                      ? <JobMatchingApp />
                                                      : pathname === '/my-roadmap-list'
                                                        ? <MyRoadmapListPage />
                                                        : pathname === '/my-roadmap'
                                                          ? suspense(<MyRoadmapBuilderApp />)
                                                            : pathname === '/team-ws-dashboard'
                                                              ? suspense(<TeamWorkspaceDashboardApp />)
                                                              : pathname === '/team-ws-milestone'
                                                                ? suspense(<TeamWorkspaceMilestoneApp />)
                                                                : pathname === '/team-ws-kanban'
                                                                  ? suspense(<TeamWorkspaceSuiteApp page="kanban" />)
                                                                  : pathname === '/team-ws-files'
                                                                    ? suspense(<TeamWorkspaceSuiteApp page="files" />)
                                                                    : pathname === '/team-ws-qna'
                                                                      ? suspense(<TeamWorkspaceSuiteApp page="qna" />)
                                                                      : pathname === '/team-ws-schedule'
                                                                        ? suspense(<TeamWorkspaceSuiteApp page="schedule" />)
                                                                        : pathname === '/team-ws-architecture'
                                                                          ? suspense(<TeamWorkspaceSuiteApp page="architecture" />)
                                                                          : pathname === '/team-ws-meeting'
                                                                            ? suspense(<TeamWorkspaceSuiteApp page="meeting" />)
                                                                            : pathname === '/team-ws-live-meeting'
                                                                              ? suspense(<TeamWorkspaceSuiteApp page="live-meeting" />)
                                                                              : pathname === '/team-voice-channel'
                                                                                ? suspense(<TeamWorkspaceSuiteApp page="voice-channel" />)
                                                          : pathname === '/squad-dashboard'
                                                            ? <SquadDashboardApp />
                                                            : pathname === '/squad-workspace'
                                                              ? <SquadWorkspaceApp />
                                                              : pathname === '/squad-review'
                                                                ? <SquadReviewApp />
                                                                : pathname === '/squad-erd'
                                                                  ? <SquadErdApp />
                                                                  : pathname === '/squad-schedule'
                                                                    ? <SquadScheduleApp />
                                                                    : pathname === '/squad-files'
                                                                      ? <SquadFilesApp />
                                                                      : pathname === '/squad-meeting'
                                                                        ? <SquadMeetingApp />
                                                                        : pathname === '/squad-settings'
                                                                          ? <SquadSettingsApp />
                                                                          : <App />

  renderPage(page, {
    missingRootMessage: 'root element was not found',
  })
}
