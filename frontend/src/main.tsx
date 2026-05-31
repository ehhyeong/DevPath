import { Suspense, lazy, type ReactElement } from 'react'
import { renderPage } from './render-page'
import { installWorkspacePresenceHeartbeat } from './lib/workspace-presence'

const App = lazy(() => import('./App.tsx'))
const ContentAssignmentEditorApp = lazy(() => import('./ContentAssignmentEditorApp'))
const CourseDetailApp = lazy(() => import('./CourseDetailApp'))
const CourseEditorApp = lazy(() => import('./CourseEditorApp'))
const CommunityLoungeApp = lazy(() => import('./CommunityLoungeApp'))
const CommunityListPage = lazy(() => import('./pages/CommunityListPage'))
const CommunityWritePage = lazy(() => import('./pages/CommunityWritePage'))
const DevShowcaseApp = lazy(() => import('./DevShowcaseApp'))
const InstructorApp = lazy(() => import('./InstructorApp'))
const InstructorChannelApp = lazy(() => import('./InstructorChannelApp'))
const InstructorCourseDetailApp = lazy(() => import('./InstructorCourseDetailApp'))
const InstructorEditProfileApp = lazy(() => import('./InstructorEditProfileApp'))
const InstructorTeamWsDashboardApp = lazy(() => import('./InstructorTeamWsDashboardApp'))
const InstructorWsDashboardApp = lazy(() => import('./InstructorWsDashboardApp'))
const JobMatchingApp = lazy(() => import('./JobMatchingApp'))
const LearnerApp = lazy(() => import('./LearnerApp'))
const LearningPlayerApp = lazy(() => import('./LearningPlayerApp'))
const LectureListApp = lazy(() => import('./LectureListApp'))
const LoginApp = lazy(() => import('./LoginApp'))
const LoungeDashboardApp = lazy(() => import('./LoungeDashboardApp'))
const MentoringCommonWorkspaceApp = lazy(() => import('./MentoringCommonWorkspaceApp'))
const MentoringHubApp = lazy(() => import('./MentoringHubApp'))
const MyRoadmapBuilderApp = lazy(() => import('./MyRoadmapBuilderApp'))
const MyRoadmapListPage = lazy(() => import('./pages/MyRoadmapListPage'))
const OAuthRedirectApp = lazy(() => import('./OAuthRedirectApp'))
const ProjectCreateApp = lazy(() => import('./ProjectCreateApp'))
const QuizCreatorApp = lazy(() => import('./QuizCreatorApp'))
const RoadmapApp = lazy(() => import('./RoadmapApp'))
const RoadmapHubApp = lazy(() => import('./RoadmapHubApp'))
const SignupApp = lazy(() => import('./SignupApp'))
const SquadDashboardApp = lazy(() => import('./SquadDashboardApp'))
const SquadErdApp = lazy(() => import('./SquadErdApp'))
const SquadFilesApp = lazy(() => import('./SquadFilesApp'))
const SquadMeetingApp = lazy(() => import('./SquadMeetingApp'))
const SquadReviewApp = lazy(() => import('./SquadReviewApp'))
const SquadScheduleApp = lazy(() => import('./SquadScheduleApp'))
const SquadSettingsApp = lazy(() => import('./SquadSettingsApp'))
const SquadWorkspaceApp = lazy(() => import('./SquadWorkspaceApp'))
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
      ? suspense(<App />)
      : pathname === '/login'
        ? suspense(<LoginApp />)
        : pathname === '/signup'
          ? suspense(<SignupApp />)
          : pathname === '/oauth2/redirect'
            ? suspense(<OAuthRedirectApp />)
            : accountPageRoutes.has(pathname)
              ? suspense(<LearnerApp />)
              : pathname === '/instructor-channel' || pathname === '/instructor-profile'
                ? suspense(<InstructorChannelApp />)
                : pathname === '/instructor-course-detail'
                  ? suspense(<InstructorCourseDetailApp />)
                  : pathname === '/instructor-edit-profile'
                    ? suspense(<InstructorEditProfileApp />)
                    : pathname === '/instructor-ws-dashboard'
                      ? suspense(<InstructorWsDashboardApp page="dashboard" />)
                    : pathname === '/instructor-ws-assignments'
                      ? suspense(<InstructorWsDashboardApp page="assignments" />)
                    : pathname === '/instructor-ws-students'
                      ? suspense(<InstructorWsDashboardApp page="students" />)
                    : pathname === '/instructor-ws-qna'
                      ? suspense(<InstructorWsDashboardApp page="qna" />)
                    : pathname === '/instructor-ws-schedule'
                      ? suspense(<InstructorWsDashboardApp page="schedule" />)
                    : pathname === '/instructor-ws-files'
                      ? suspense(<InstructorWsDashboardApp page="files" />)
                    : pathname === '/instructor-ws-meeting'
                      ? suspense(<InstructorWsDashboardApp page="meeting" />)
                    : pathname === '/instructor-ws-live-meeting'
                      ? suspense(<InstructorWsDashboardApp page="live-meeting" />)
                    : pathname === '/instructor-team-ws-dashboard'
                      ? suspense(<InstructorTeamWsDashboardApp page="dashboard" />)
                    : pathname === '/instructor-team-ws-milestone'
                      ? suspense(<InstructorTeamWsDashboardApp page="milestone" />)
                    : pathname === '/instructor-team-ws-kanban'
                      ? suspense(<InstructorTeamWsDashboardApp page="kanban" />)
                    : pathname === '/instructor-team-ws-architecture'
                      ? suspense(<InstructorTeamWsDashboardApp page="architecture" />)
                    : pathname === '/instructor-team-ws-qna'
                      ? suspense(<InstructorTeamWsDashboardApp page="qna" />)
                    : pathname === '/instructor-team-ws-schedule'
                      ? suspense(<InstructorTeamWsDashboardApp page="schedule" />)
                    : pathname === '/instructor-team-ws-files'
                      ? suspense(<InstructorTeamWsDashboardApp page="files" />)
                    : pathname === '/instructor-team-ws-meeting'
                      ? suspense(<InstructorTeamWsDashboardApp page="meeting" />)
                    : pathname === '/instructor-team-live-meeting'
                      ? suspense(<InstructorTeamWsDashboardApp page="live-meeting" />)
                    : pathname === '/instructor-team-voice-channel'
                      ? suspense(<InstructorTeamWsDashboardApp page="voice-channel" />)
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
                                            ? suspense(<CourseDetailApp />)
                                            : pathname === '/lecture-list'
                                              ? suspense(<LectureListApp />)
                                              : pathname === '/roadmap'
                                                ? suspense(<RoadmapApp />)
                                                : pathname === '/roadmap-hub'
                                                  ? suspense(<RoadmapHubApp />)
                                                  : pathname === '/survey'
                                                    ? suspense(<SurveyApp />)
                                                    : pathname === '/job-matching'
                                                      ? suspense(<JobMatchingApp />)
                                                      : pathname === '/my-roadmap-list'
                                                        ? suspense(<MyRoadmapListPage />)
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
                                                            ? suspense(<SquadDashboardApp />)
                                                            : pathname === '/squad-workspace'
                                                              ? suspense(<SquadWorkspaceApp />)
                                                              : pathname === '/squad-review'
                                                                ? suspense(<SquadReviewApp />)
                                                                : pathname === '/squad-erd'
                                                                  ? suspense(<SquadErdApp />)
                                                                  : pathname === '/squad-schedule'
                                                                    ? suspense(<SquadScheduleApp />)
                                                                    : pathname === '/squad-files'
                                                                      ? suspense(<SquadFilesApp />)
                                                                      : pathname === '/squad-meeting'
                                                                        ? suspense(<SquadMeetingApp />)
                                                                        : pathname === '/squad-settings'
                                                                          ? suspense(<SquadSettingsApp />)
                                                                          : suspense(<App />)

  renderPage(page, {
    missingRootMessage: 'root element was not found',
  })
}
