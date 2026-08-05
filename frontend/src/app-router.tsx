import { Suspense,lazy,type ReactElement } from 'react'
import { NotFoundPage,RouteErrorBoundary,RouteLoadingView } from './components/AppRouteStates'
import { ACCOUNT_PAGE_ROUTES,INSTRUCTOR_PAGE_ROUTES } from './routes'

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

const ROUTE_PAGES: Record<string, ReactElement> = {
  '/': <App />,
  '/home': <App />,
  '/login': <LoginApp />,
  '/signup': <SignupApp />,
  '/oauth2/redirect': <OAuthRedirectApp />,
  '/instructor-channel': <InstructorChannelApp />,
  '/instructor-profile': <InstructorChannelApp />,
  '/instructor-course-detail': <InstructorCourseDetailApp />,
  '/instructor-edit-profile': <InstructorEditProfileApp />,
  '/instructor-ws-dashboard': <InstructorWsDashboardApp page="dashboard" />,
  '/instructor-ws-assignments': <InstructorWsDashboardApp page="assignments" />,
  '/instructor-ws-students': <InstructorWsDashboardApp page="students" />,
  '/instructor-ws-qna': <InstructorWsDashboardApp page="qna" />,
  '/instructor-ws-schedule': <InstructorWsDashboardApp page="schedule" />,
  '/instructor-ws-files': <InstructorWsDashboardApp page="files" />,
  '/instructor-ws-meeting': <InstructorWsDashboardApp page="meeting" />,
  '/instructor-ws-live-meeting': <InstructorWsDashboardApp page="live-meeting" />,
  '/instructor-team-ws-dashboard': <InstructorTeamWsDashboardApp page="dashboard" />,
  '/instructor-team-ws-milestone': <InstructorTeamWsDashboardApp page="milestone" />,
  '/instructor-team-ws-kanban': <InstructorTeamWsDashboardApp page="kanban" />,
  '/instructor-team-ws-architecture': <InstructorTeamWsDashboardApp page="architecture" />,
  '/instructor-team-ws-qna': <InstructorTeamWsDashboardApp page="qna" />,
  '/instructor-team-ws-schedule': <InstructorTeamWsDashboardApp page="schedule" />,
  '/instructor-team-ws-files': <InstructorTeamWsDashboardApp page="files" />,
  '/instructor-team-ws-meeting': <InstructorTeamWsDashboardApp page="meeting" />,
  '/instructor-team-live-meeting': <InstructorTeamWsDashboardApp page="live-meeting" />,
  '/instructor-team-voice-channel': <InstructorTeamWsDashboardApp page="voice-channel" />,
  '/course-editor': <CourseEditorApp />,
  '/quiz-creator': <QuizCreatorApp />,
  '/content-assignment-editor': <ContentAssignmentEditorApp />,
  '/lounge-dashboard': <LoungeDashboardApp />,
  '/community-list': <CommunityListPage />,
  '/community-write': <CommunityWritePage />,
  '/community-lounge': <CommunityLoungeApp />,
  '/mentoring-hub': <MentoringHubApp />,
  '/workspace-hub': <WorkspaceHubApp />,
  '/mentoring-dashboard': <MentoringCommonWorkspaceApp page="dashboard" />,
  '/mentoring-workspace': <MentoringCommonWorkspaceApp page="workspace" />,
  '/mentoring-curriculum': <MentoringCommonWorkspaceApp page="curriculum" />,
  '/mentoring-qna': <MentoringCommonWorkspaceApp page="qna" />,
  '/mentoring-schedule': <MentoringCommonWorkspaceApp page="schedule" />,
  '/mentoring-files': <MentoringCommonWorkspaceApp page="files" />,
  '/mentoring-meeting': <MentoringCommonWorkspaceApp page="meeting" />,
  '/mentoring-live-meeting': <InstructorWsDashboardApp page="live-meeting" />,
  '/mentoring-erd': <MentoringCommonWorkspaceApp page="erd" />,
  '/dev-showcase': <DevShowcaseApp />,
  '/project-create': <ProjectCreateApp />,
  '/learning': <LearningPlayerApp />,
  '/course-detail': <CourseDetailApp />,
  '/lecture-list': <LectureListApp />,
  '/roadmap': <RoadmapApp />,
  '/roadmap-hub': <RoadmapHubApp />,
  '/survey': <SurveyApp />,
  '/job-matching': <JobMatchingApp />,
  '/my-roadmap-list': <MyRoadmapListPage />,
  '/my-roadmap': <MyRoadmapBuilderApp />,
  '/team-ws-dashboard': <TeamWorkspaceDashboardApp />,
  '/team-ws-milestone': <TeamWorkspaceMilestoneApp />,
  '/team-ws-kanban': <TeamWorkspaceSuiteApp page="kanban" />,
  '/team-ws-files': <TeamWorkspaceSuiteApp page="files" />,
  '/team-ws-qna': <TeamWorkspaceSuiteApp page="qna" />,
  '/team-ws-schedule': <TeamWorkspaceSuiteApp page="schedule" />,
  '/team-ws-architecture': <TeamWorkspaceSuiteApp page="architecture" />,
  '/team-ws-meeting': <TeamWorkspaceSuiteApp page="meeting" />,
  '/team-ws-live-meeting': <TeamWorkspaceSuiteApp page="live-meeting" />,
  '/team-voice-channel': <TeamWorkspaceSuiteApp page="voice-channel" />,
  '/squad-dashboard': <SquadDashboardApp />,
  '/squad-workspace': <SquadWorkspaceApp />,
  '/squad-review': <SquadReviewApp />,
  '/squad-erd': <SquadErdApp />,
  '/squad-schedule': <SquadScheduleApp />,
  '/squad-files': <SquadFilesApp />,
  '/squad-meeting': <SquadMeetingApp />,
  '/squad-settings': <SquadSettingsApp />,
}

export default function AppRouter({ pathname }: { pathname: string }) {
  const page = ACCOUNT_PAGE_ROUTES.has(pathname)
    ? <LearnerApp />
    : INSTRUCTOR_PAGE_ROUTES.has(pathname)
      ? <InstructorApp />
      : ROUTE_PAGES[pathname] ?? <NotFoundPage pathname={pathname} />

  return (
    <RouteErrorBoundary key={pathname}>
      <Suspense fallback={<RouteLoadingView />}>{page}</Suspense>
    </RouteErrorBoundary>
  )
}
