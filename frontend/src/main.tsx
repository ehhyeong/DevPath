import { Suspense, lazy, type ReactElement } from 'react'
import { renderPage } from './lib/render-page'
import { installWorkspacePresenceHeartbeat } from './lib/workspace-presence'

document.documentElement.classList.add(
  '[&::-webkit-scrollbar]:h-[5px]!',
  '[&::-webkit-scrollbar]:w-[5px]!',
  '[&_*::-webkit-scrollbar]:h-[5px]!',
  '[&_*::-webkit-scrollbar]:w-[5px]!',
  '[&::-webkit-scrollbar-button]:hidden!',
  '[&::-webkit-scrollbar-button]:h-0!',
  '[&::-webkit-scrollbar-button]:w-0!',
  '[&::-webkit-scrollbar-button]:[background:transparent]!',
  '[&_*::-webkit-scrollbar-button]:hidden!',
  '[&_*::-webkit-scrollbar-button]:h-0!',
  '[&_*::-webkit-scrollbar-button]:w-0!',
  '[&_*::-webkit-scrollbar-button]:[background:transparent]!',
  '[&::-webkit-scrollbar-track]:[background:transparent]!',
  '[&_*::-webkit-scrollbar-track]:[background:transparent]!',
  '[&::-webkit-scrollbar-thumb]:[background:#D1D5DB]!',
  '[&::-webkit-scrollbar-thumb]:[border:0]!',
  '[&::-webkit-scrollbar-thumb]:rounded-[5px]!',
  '[&_*::-webkit-scrollbar-thumb]:[background:#D1D5DB]!',
  '[&_*::-webkit-scrollbar-thumb]:[border:0]!',
  '[&_*::-webkit-scrollbar-thumb]:rounded-[5px]!',
  '[&::-webkit-scrollbar-thumb:hover]:[background:#D1D5DB]!',
  '[&_*::-webkit-scrollbar-thumb:hover]:[background:#D1D5DB]!',
  '[&::-webkit-scrollbar-corner]:[background:transparent]!',
  '[&_*::-webkit-scrollbar-corner]:[background:transparent]!',
)

const App = lazy(() => import('./App'))
const ContentAssignmentEditorApp = lazy(() => import('./features/course/ContentAssignmentEditorApp'))
const CourseDetailApp = lazy(() => import('./features/course/CourseDetailApp'))
const CourseEditorApp = lazy(() => import('./features/course/CourseEditorApp'))
const CommunityLoungeApp = lazy(() => import('./features/community/CommunityLoungeApp'))
const CommunityListPage = lazy(() => import('./features/community/CommunityListPage'))
const CommunityWritePage = lazy(() => import('./features/community/CommunityWritePage'))
const DevShowcaseApp = lazy(() => import('./features/community/DevShowcaseApp'))
const InstructorApp = lazy(() => import('./instructor/apps/InstructorApp'))
const InstructorChannelApp = lazy(() => import('./instructor/channel/InstructorChannelApp'))
const InstructorCourseDetailApp = lazy(() => import('./instructor/apps/InstructorCourseDetailApp'))
const InstructorEditProfileApp = lazy(() => import('./instructor/apps/InstructorEditProfileApp'))
const InstructorTeamWsDashboardApp = lazy(() => import('./features/team-workspace/InstructorTeamWsDashboardApp'))
const InstructorWsDashboardApp = lazy(() => import('./features/mentoring/InstructorWsDashboardApp'))
const JobMatchingApp = lazy(() => import('./features/jobs/JobMatchingApp'))
const LearnerApp = lazy(() => import('./features/course/LearnerApp'))
const LearningPlayerApp = lazy(() => import('./features/course/LearningPlayerApp'))
const LectureListApp = lazy(() => import('./features/course/LectureListApp'))
const LoginApp = lazy(() => import('./features/auth/LoginApp'))
const LoungeDashboardApp = lazy(() => import('./features/community/LoungeDashboardApp'))
const MentoringCommonWorkspaceApp = lazy(() => import('./features/mentoring/MentoringCommonWorkspaceApp'))
const MentoringHubApp = lazy(() => import('./features/mentoring/MentoringHubApp'))
const MyRoadmapBuilderApp = lazy(() => import('./features/roadmap/MyRoadmapBuilderApp'))
const MyRoadmapListPage = lazy(() => import('./features/roadmap/MyRoadmapListPage'))
const OAuthRedirectApp = lazy(() => import('./features/auth/OAuthRedirectApp'))
const ProjectCreateApp = lazy(() => import('./features/project/ProjectCreateApp'))
const QuizCreatorApp = lazy(() => import('./features/course/QuizCreatorApp'))
const RoadmapApp = lazy(() => import('./features/roadmap/RoadmapApp'))
const RoadmapHubApp = lazy(() => import('./features/roadmap/RoadmapHubApp'))
const SignupApp = lazy(() => import('./features/auth/SignupApp'))
const SquadDashboardApp = lazy(() => import('./features/squad/SquadDashboardApp'))
const SquadErdApp = lazy(() => import('./features/squad/SquadErdApp'))
const SquadFilesApp = lazy(() => import('./features/squad/SquadFilesApp'))
const SquadMeetingApp = lazy(() => import('./features/squad/SquadMeetingApp'))
const SquadReviewApp = lazy(() => import('./features/squad/SquadReviewApp'))
const SquadScheduleApp = lazy(() => import('./features/squad/SquadScheduleApp'))
const SquadSettingsApp = lazy(() => import('./features/squad/SquadSettingsApp'))
const SquadWorkspaceApp = lazy(() => import('./features/squad/SquadWorkspaceApp'))
const SurveyApp = lazy(() => import('./features/roadmap/SurveyApp'))
const TeamWorkspaceDashboardApp = lazy(() => import('./features/team-workspace/TeamWorkspaceDashboardApp'))
const TeamWorkspaceMilestoneApp = lazy(() => import('./features/team-workspace/TeamWorkspaceMilestoneApp'))
const TeamWorkspaceSuiteApp = lazy(() => import('./features/team-workspace/TeamWorkspaceSuiteApp'))
const WorkspaceHubApp = lazy(() => import('./features/project/WorkspaceHubApp'))

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

export function RootPage({ page }: { page: ReactElement }) {
  return page
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
  void import('./features/admin/admin-dashboard').then(({ mountAdminDashboardPage }) => {
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
                                                    ? suspense(<InstructorWsDashboardApp page="live-meeting" />)
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

  renderPage(<RootPage page={page} />, {
    missingRootMessage: 'root element was not found',
  })
}
