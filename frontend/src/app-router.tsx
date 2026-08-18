import { Suspense,lazy,useEffect,useState,type ReactElement } from 'react'
import { NotFoundPage,RouteErrorBoundary,RouteLoadingView } from './components/AppRouteStates'
import { getCurrentLocationKey,installSpaNavigation,SPA_NAVIGATION_EVENT } from './lib/spa-navigation'
import { installWorkspacePresenceHeartbeat } from './lib/workspace-presence'
import { ACCOUNT_PAGE_ROUTES,INSTRUCTOR_PAGE_ROUTES,getCurrentPathname,normalizePathname } from './routes'

function loadWithStyle<Module>(
  loadStyle: () => Promise<unknown>,
  loadComponent: () => Promise<Module>,
) {
  return async () => {
    const [, component] = await Promise.all([loadStyle(), loadComponent()])
    return component
  }
}

const loadInstructorStyles = () => import('./styles/instructor.css')
const loadRoadmapStyles = () => import('./styles/roadmaps.css')
const loadWorkspaceStyles = () => import('./styles/workspaces.css')

const routeLoaders = {
  app: () => import('./App'),
  contentAssignmentEditor: () => import('./features/course/ContentAssignmentEditorApp'),
  courseDetail: () => import('./features/course/CourseDetailApp'),
  courseEditor: () => import('./features/course/CourseEditorApp'),
  communityLounge: () => import('./features/community/CommunityLoungeApp'),
  communityList: () => import('./features/community/CommunityListPage'),
  communityWrite: () => import('./features/community/CommunityWritePage'),
  devShowcase: () => import('./features/community/DevShowcaseApp'),
  instructor: loadWithStyle(loadInstructorStyles, () => import('./instructor/apps/InstructorApp')),
  instructorChannel: loadWithStyle(loadInstructorStyles, () => import('./instructor/channel/InstructorChannelApp')),
  instructorCourseDetail: loadWithStyle(loadInstructorStyles, () => import('./instructor/apps/InstructorCourseDetailApp')),
  instructorEditProfile: loadWithStyle(loadInstructorStyles, () => import('./instructor/apps/InstructorEditProfileApp')),
  instructorTeamWorkspace: loadWithStyle(loadWorkspaceStyles, () => import('./features/team-workspace/InstructorTeamWsDashboardApp')),
  instructorWorkspace: loadWithStyle(loadWorkspaceStyles, () => import('./features/mentoring/InstructorWsDashboardApp')),
  jobMatching: () => import('./features/jobs/JobMatchingApp'),
  learner: () => import('./features/course/LearnerApp'),
  learningPlayer: () => import('./features/course/LearningPlayerApp'),
  lectureList: () => import('./features/course/LectureListApp'),
  login: () => import('./features/auth/LoginApp'),
  loungeDashboard: () => import('./features/community/LoungeDashboardApp'),
  mentoringWorkspace: loadWithStyle(loadWorkspaceStyles, () => import('./features/mentoring/MentoringCommonWorkspaceApp')),
  mentoringHub: loadWithStyle(loadWorkspaceStyles, () => import('./features/mentoring/MentoringHubApp')),
  myRoadmapBuilder: loadWithStyle(loadRoadmapStyles, () => import('./features/roadmap/MyRoadmapBuilderApp')),
  myRoadmapList: loadWithStyle(loadRoadmapStyles, () => import('./features/roadmap/MyRoadmapListPage')),
  oauthRedirect: () => import('./features/auth/OAuthRedirectApp'),
  projectCreate: () => import('./features/project/ProjectCreateApp'),
  quizCreator: () => import('./features/course/QuizCreatorApp'),
  roadmap: loadWithStyle(loadRoadmapStyles, () => import('./features/roadmap/RoadmapApp')),
  roadmapHub: loadWithStyle(loadRoadmapStyles, () => import('./features/roadmap/RoadmapHubApp')),
  signup: () => import('./features/auth/SignupApp'),
  squadDashboard: loadWithStyle(loadWorkspaceStyles, () => import('./features/squad/SquadDashboardApp')),
  squadErd: loadWithStyle(loadWorkspaceStyles, () => import('./features/squad/SquadErdApp')),
  squadFiles: loadWithStyle(loadWorkspaceStyles, () => import('./features/squad/SquadFilesApp')),
  squadMeeting: loadWithStyle(loadWorkspaceStyles, () => import('./features/squad/SquadMeetingApp')),
  squadReview: loadWithStyle(loadWorkspaceStyles, () => import('./features/squad/SquadReviewApp')),
  squadSchedule: loadWithStyle(loadWorkspaceStyles, () => import('./features/squad/SquadScheduleApp')),
  squadSettings: loadWithStyle(loadWorkspaceStyles, () => import('./features/squad/SquadSettingsApp')),
  squadWorkspace: loadWithStyle(loadWorkspaceStyles, () => import('./features/squad/SquadWorkspaceApp')),
  survey: loadWithStyle(loadRoadmapStyles, () => import('./features/roadmap/SurveyApp')),
  teamWorkspaceDashboard: loadWithStyle(loadWorkspaceStyles, () => import('./features/team-workspace/TeamWorkspaceDashboardApp')),
  teamWorkspaceMilestone: loadWithStyle(loadWorkspaceStyles, () => import('./features/team-workspace/TeamWorkspaceMilestoneApp')),
  teamWorkspaceSuite: loadWithStyle(loadWorkspaceStyles, () => import('./features/team-workspace/TeamWorkspaceSuiteApp')),
  workspaceHub: loadWithStyle(loadWorkspaceStyles, () => import('./features/project/WorkspaceHubApp')),
}

const App = lazy(routeLoaders.app)
const ContentAssignmentEditorApp = lazy(routeLoaders.contentAssignmentEditor)
const CourseDetailApp = lazy(routeLoaders.courseDetail)
const CourseEditorApp = lazy(routeLoaders.courseEditor)
const CommunityLoungeApp = lazy(routeLoaders.communityLounge)
const CommunityListPage = lazy(routeLoaders.communityList)
const CommunityWritePage = lazy(routeLoaders.communityWrite)
const DevShowcaseApp = lazy(routeLoaders.devShowcase)
const InstructorApp = lazy(routeLoaders.instructor)
const InstructorChannelApp = lazy(routeLoaders.instructorChannel)
const InstructorCourseDetailApp = lazy(routeLoaders.instructorCourseDetail)
const InstructorEditProfileApp = lazy(routeLoaders.instructorEditProfile)
const InstructorTeamWsDashboardApp = lazy(routeLoaders.instructorTeamWorkspace)
const InstructorWsDashboardApp = lazy(routeLoaders.instructorWorkspace)
const JobMatchingApp = lazy(routeLoaders.jobMatching)
const LearnerApp = lazy(routeLoaders.learner)
const LearningPlayerApp = lazy(routeLoaders.learningPlayer)
const LectureListApp = lazy(routeLoaders.lectureList)
const LoginApp = lazy(routeLoaders.login)
const LoungeDashboardApp = lazy(routeLoaders.loungeDashboard)
const MentoringCommonWorkspaceApp = lazy(routeLoaders.mentoringWorkspace)
const MentoringHubApp = lazy(routeLoaders.mentoringHub)
const MyRoadmapBuilderApp = lazy(routeLoaders.myRoadmapBuilder)
const MyRoadmapListPage = lazy(routeLoaders.myRoadmapList)
const OAuthRedirectApp = lazy(routeLoaders.oauthRedirect)
const ProjectCreateApp = lazy(routeLoaders.projectCreate)
const QuizCreatorApp = lazy(routeLoaders.quizCreator)
const RoadmapApp = lazy(routeLoaders.roadmap)
const RoadmapHubApp = lazy(routeLoaders.roadmapHub)
const SignupApp = lazy(routeLoaders.signup)
const SquadDashboardApp = lazy(routeLoaders.squadDashboard)
const SquadErdApp = lazy(routeLoaders.squadErd)
const SquadFilesApp = lazy(routeLoaders.squadFiles)
const SquadMeetingApp = lazy(routeLoaders.squadMeeting)
const SquadReviewApp = lazy(routeLoaders.squadReview)
const SquadScheduleApp = lazy(routeLoaders.squadSchedule)
const SquadSettingsApp = lazy(routeLoaders.squadSettings)
const SquadWorkspaceApp = lazy(routeLoaders.squadWorkspace)
const SurveyApp = lazy(routeLoaders.survey)
const TeamWorkspaceDashboardApp = lazy(routeLoaders.teamWorkspaceDashboard)
const TeamWorkspaceMilestoneApp = lazy(routeLoaders.teamWorkspaceMilestone)
const TeamWorkspaceSuiteApp = lazy(routeLoaders.teamWorkspaceSuite)
const WorkspaceHubApp = lazy(routeLoaders.workspaceHub)

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

const routePreloaders = new Map<string, () => Promise<unknown>>([
  ['/', routeLoaders.app],
  ['/home', routeLoaders.app],
  ['/login', routeLoaders.login],
  ['/signup', routeLoaders.signup],
  ['/oauth2/redirect', routeLoaders.oauthRedirect],
  ['/instructor-channel', routeLoaders.instructorChannel],
  ['/instructor-profile', routeLoaders.instructorChannel],
  ['/instructor-course-detail', routeLoaders.instructorCourseDetail],
  ['/instructor-edit-profile', routeLoaders.instructorEditProfile],
  ['/course-editor', routeLoaders.courseEditor],
  ['/quiz-creator', routeLoaders.quizCreator],
  ['/content-assignment-editor', routeLoaders.contentAssignmentEditor],
  ['/lounge-dashboard', routeLoaders.loungeDashboard],
  ['/community-list', routeLoaders.communityList],
  ['/community-write', routeLoaders.communityWrite],
  ['/community-lounge', routeLoaders.communityLounge],
  ['/mentoring-hub', routeLoaders.mentoringHub],
  ['/workspace-hub', routeLoaders.workspaceHub],
  ['/dev-showcase', routeLoaders.devShowcase],
  ['/project-create', routeLoaders.projectCreate],
  ['/learning', routeLoaders.learningPlayer],
  ['/course-detail', routeLoaders.courseDetail],
  ['/lecture-list', routeLoaders.lectureList],
  ['/roadmap', routeLoaders.roadmap],
  ['/roadmap-hub', routeLoaders.roadmapHub],
  ['/survey', routeLoaders.survey],
  ['/job-matching', routeLoaders.jobMatching],
  ['/my-roadmap-list', routeLoaders.myRoadmapList],
  ['/my-roadmap', routeLoaders.myRoadmapBuilder],
  ['/team-ws-dashboard', routeLoaders.teamWorkspaceDashboard],
  ['/team-ws-milestone', routeLoaders.teamWorkspaceMilestone],
  ['/squad-dashboard', routeLoaders.squadDashboard],
  ['/squad-workspace', routeLoaders.squadWorkspace],
  ['/squad-review', routeLoaders.squadReview],
  ['/squad-erd', routeLoaders.squadErd],
  ['/squad-schedule', routeLoaders.squadSchedule],
  ['/squad-files', routeLoaders.squadFiles],
  ['/squad-meeting', routeLoaders.squadMeeting],
  ['/squad-settings', routeLoaders.squadSettings],
])

ACCOUNT_PAGE_ROUTES.forEach((pathname) => routePreloaders.set(pathname, routeLoaders.learner))
INSTRUCTOR_PAGE_ROUTES.forEach((pathname) => routePreloaders.set(pathname, routeLoaders.instructor))

for (const pathname of [
  '/instructor-ws-dashboard',
  '/instructor-ws-assignments',
  '/instructor-ws-students',
  '/instructor-ws-qna',
  '/instructor-ws-schedule',
  '/instructor-ws-files',
  '/instructor-ws-meeting',
  '/instructor-ws-live-meeting',
]) {
  routePreloaders.set(pathname, routeLoaders.instructorWorkspace)
}

for (const pathname of [
  '/instructor-team-ws-dashboard',
  '/instructor-team-ws-milestone',
  '/instructor-team-ws-kanban',
  '/instructor-team-ws-architecture',
  '/instructor-team-ws-qna',
  '/instructor-team-ws-schedule',
  '/instructor-team-ws-files',
  '/instructor-team-ws-meeting',
  '/instructor-team-live-meeting',
  '/instructor-team-voice-channel',
]) {
  routePreloaders.set(pathname, routeLoaders.instructorTeamWorkspace)
}

for (const pathname of [
  '/mentoring-dashboard',
  '/mentoring-workspace',
  '/mentoring-curriculum',
  '/mentoring-qna',
  '/mentoring-schedule',
  '/mentoring-files',
  '/mentoring-meeting',
  '/mentoring-erd',
]) {
  routePreloaders.set(pathname, routeLoaders.mentoringWorkspace)
}

routePreloaders.set('/mentoring-live-meeting', routeLoaders.instructorWorkspace)

for (const pathname of [
  '/team-ws-kanban',
  '/team-ws-files',
  '/team-ws-qna',
  '/team-ws-schedule',
  '/team-ws-architecture',
  '/team-ws-meeting',
  '/team-ws-live-meeting',
  '/team-voice-channel',
]) {
  routePreloaders.set(pathname, routeLoaders.teamWorkspaceSuite)
}

function preloadRoute(href: string) {
  const url = new URL(href, window.location.href)

  if (url.origin !== window.location.origin) {
    return Promise.resolve()
  }

  return routePreloaders.get(normalizePathname(url.pathname))?.() ?? Promise.resolve()
}

export default function AppRouter() {
  const [locationKey, setLocationKey] = useState(() => {
    getCurrentPathname()
    return getCurrentLocationKey()
  })
  const pathname = normalizePathname(new URL(locationKey, window.location.origin).pathname)

  useEffect(() => {
    const handleNavigation = () => {
      setLocationKey(getCurrentLocationKey())
    }

    const uninstallNavigation = installSpaNavigation({ preloadRoute })
    window.addEventListener('popstate', handleNavigation)
    window.addEventListener(SPA_NAVIGATION_EVENT, handleNavigation)

    return () => {
      uninstallNavigation()
      window.removeEventListener('popstate', handleNavigation)
      window.removeEventListener(SPA_NAVIGATION_EVENT, handleNavigation)
    }
  }, [])

  useEffect(() => installWorkspacePresenceHeartbeat(pathname), [locationKey, pathname])

  const page = ACCOUNT_PAGE_ROUTES.has(pathname)
    ? <LearnerApp />
    : INSTRUCTOR_PAGE_ROUTES.has(pathname)
      ? <InstructorApp />
      : ROUTE_PAGES[pathname] ?? <NotFoundPage pathname={pathname} />

  return (
    <RouteErrorBoundary key={locationKey}>
      <Suspense fallback={<RouteLoadingView />}>{page}</Suspense>
    </RouteErrorBoundary>
  )
}
