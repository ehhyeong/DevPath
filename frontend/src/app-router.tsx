import { Suspense,lazy,useEffect,useState,type ReactElement } from 'react'
import { NotFoundPage,RouteErrorBoundary,RouteLoadingView } from './components/AppRouteStates'
import SquadHubApp from './features/squad/SquadHubApp'
import { getCurrentLocationKey,installSpaNavigation,SPA_NAVIGATION_EVENT } from './lib/spa-navigation'
import { installWorkspacePresenceHeartbeat } from './lib/workspace-presence'
import { ACCOUNT_PAGE_ROUTES,INSTRUCTOR_PAGE_ROUTES,MENTORING_WORKSPACE_ROUTES,PROJECT_HUB_PAGE_ROUTES,SQUAD_WORKSPACE_ROUTES,getCurrentPathname,normalizePathname } from './routes'
import './styles/workspaces.css'

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
const loadWorkspaceStyles = () => Promise.resolve()

const routeLoaders = {
  app: () => import('./App'),
  contentAssignmentEditor: () => import('./features/course/ContentAssignmentEditorApp'),
  courseDetail: () => import('./features/course/CourseDetailApp'),
  courseEditor: () => import('./features/course/CourseEditorApp'),
  communityList: () => import('./features/community/CommunityListPage'),
  communityWrite: () => import('./features/community/CommunityWritePage'),
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
  projectHub: loadWithStyle(loadWorkspaceStyles, () => import('./features/project/ProjectHubApp')),
  mentoringWorkspace: loadWithStyle(loadWorkspaceStyles, () => import('./features/mentoring/MentoringCommonWorkspaceApp')),
  myRoadmapBuilder: loadWithStyle(loadRoadmapStyles, () => import('./features/roadmap/MyRoadmapBuilderApp')),
  myRoadmapList: loadWithStyle(loadRoadmapStyles, () => import('./features/roadmap/MyRoadmapListPage')),
  oauthRedirect: () => import('./features/auth/OAuthRedirectApp'),
  projectCreate: () => import('./features/project/ProjectCreateApp'),
  quizCreator: () => import('./features/course/QuizCreatorApp'),
  roadmap: loadWithStyle(loadRoadmapStyles, () => import('./features/roadmap/RoadmapApp')),
  roadmapHub: loadWithStyle(loadRoadmapStyles, () => import('./features/roadmap/RoadmapHubApp')),
  signup: () => import('./features/auth/SignupApp'),
  survey: loadWithStyle(loadRoadmapStyles, () => import('./features/roadmap/SurveyApp')),
  teamWorkspaceDashboard: loadWithStyle(loadWorkspaceStyles, () => import('./features/team-workspace/TeamWorkspaceDashboardApp')),
  teamWorkspaceMilestone: loadWithStyle(loadWorkspaceStyles, () => import('./features/team-workspace/TeamWorkspaceMilestoneApp')),
  teamWorkspaceSuite: loadWithStyle(loadWorkspaceStyles, () => import('./features/team-workspace/TeamWorkspaceSuiteApp')),
}

const App = lazy(routeLoaders.app)
const ContentAssignmentEditorApp = lazy(routeLoaders.contentAssignmentEditor)
const CourseDetailApp = lazy(routeLoaders.courseDetail)
const CourseEditorApp = lazy(routeLoaders.courseEditor)
const CommunityListPage = lazy(routeLoaders.communityList)
const CommunityWritePage = lazy(routeLoaders.communityWrite)
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
const ProjectHubApp = lazy(routeLoaders.projectHub)
const MentoringCommonWorkspaceApp = lazy(routeLoaders.mentoringWorkspace)
const MyRoadmapBuilderApp = lazy(routeLoaders.myRoadmapBuilder)
const MyRoadmapListPage = lazy(routeLoaders.myRoadmapList)
const OAuthRedirectApp = lazy(routeLoaders.oauthRedirect)
const ProjectCreateApp = lazy(routeLoaders.projectCreate)
const QuizCreatorApp = lazy(routeLoaders.quizCreator)
const RoadmapApp = lazy(routeLoaders.roadmap)
const RoadmapHubApp = lazy(routeLoaders.roadmapHub)
const SignupApp = lazy(routeLoaders.signup)
const SurveyApp = lazy(routeLoaders.survey)
const TeamWorkspaceDashboardApp = lazy(routeLoaders.teamWorkspaceDashboard)
const TeamWorkspaceMilestoneApp = lazy(routeLoaders.teamWorkspaceMilestone)
const TeamWorkspaceSuiteApp = lazy(routeLoaders.teamWorkspaceSuite)

const ROUTE_PAGES: Record<string, ReactElement> = {
  '/': <App />,
  '/home': <App />,
  '/about': <App page="about" />,
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
  '/lounge-dashboard': <ProjectHubApp />,
  '/community-list': <CommunityListPage />,
  '/community-write': <CommunityWritePage />,
  '/community-lounge': <ProjectHubApp />,
  '/mentoring-hub': <ProjectHubApp />,
  '/workspace-hub': <ProjectHubApp />,
  '/mentoring-dashboard': <MentoringCommonWorkspaceApp page="dashboard" />,
  '/mentoring-workspace': <MentoringCommonWorkspaceApp page="workspace" />,
  '/mentoring-curriculum': <MentoringCommonWorkspaceApp page="curriculum" />,
  '/mentoring-qna': <MentoringCommonWorkspaceApp page="qna" />,
  '/mentoring-schedule': <MentoringCommonWorkspaceApp page="schedule" />,
  '/mentoring-files': <MentoringCommonWorkspaceApp page="files" />,
  '/mentoring-meeting': <MentoringCommonWorkspaceApp page="meeting" />,
  '/mentoring-live-meeting': <InstructorWsDashboardApp page="live-meeting" />,
  '/mentoring-erd': <MentoringCommonWorkspaceApp page="erd" />,
  '/dev-showcase': <ProjectHubApp />,
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
  '/squad-dashboard': <SquadHubApp />,
  '/squad-blueprint': <SquadHubApp />,
  '/squad-workspace': <SquadHubApp />,
  '/squad-review': <SquadHubApp />,
  '/squad-erd': <SquadHubApp />,
  '/squad-api': <SquadHubApp />,
  '/squad-schedule': <SquadHubApp />,
  '/squad-files': <SquadHubApp />,
  '/squad-meeting': <SquadHubApp />,
  '/squad-interview': <SquadHubApp />,
  '/squad-settings': <SquadHubApp />,
}

const routePreloaders = new Map<string, () => Promise<unknown>>([
  ['/', routeLoaders.app],
  ['/home', routeLoaders.app],
  ['/about', routeLoaders.app],
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
  ['/community-list', routeLoaders.communityList],
  ['/community-write', routeLoaders.communityWrite],
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
])

ACCOUNT_PAGE_ROUTES.forEach((pathname) => routePreloaders.set(pathname, routeLoaders.learner))
INSTRUCTOR_PAGE_ROUTES.forEach((pathname) => {
  routePreloaders.set(pathname, async () => {
    const instructorModule = await routeLoaders.instructor()
    await instructorModule.preloadInstructorPage(pathname)
  })
})
PROJECT_HUB_PAGE_ROUTES.forEach((pathname) => {
  routePreloaders.set(pathname, async () => {
    const projectHubModule = await routeLoaders.projectHub()
    await projectHubModule.preloadProjectHubPage(pathname)
  })
})

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

  const pathname = normalizePathname(url.pathname)
  const routePreload = routePreloaders.get(pathname)?.() ?? Promise.resolve()

  if (!SQUAD_WORKSPACE_ROUTES.has(pathname)) {
    return routePreload
  }

  const workspaceId = Number(url.searchParams.get('workspaceId'))
  if (!Number.isInteger(workspaceId) || workspaceId <= 0) {
    return routePreload
  }

  return Promise.all([
    routePreload,
    import('./features/squad/preload').then((module) => module.preloadSquadWorkspace(workspaceId)),
  ])
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

  useEffect(() => {
    if (!SQUAD_WORKSPACE_ROUTES.has(pathname)) {
      return
    }

    const workspaceId = Number(new URL(locationKey, window.location.origin).searchParams.get('workspaceId'))
    if (!Number.isInteger(workspaceId) || workspaceId <= 0) {
      return
    }

    void import('./features/squad/preload').then((module) => module.preloadSquadWorkspace(workspaceId))
  }, [locationKey, pathname])

  const page = ACCOUNT_PAGE_ROUTES.has(pathname)
    ? <LearnerApp />
    : INSTRUCTOR_PAGE_ROUTES.has(pathname)
      ? <InstructorApp />
      : ROUTE_PAGES[pathname] ?? <NotFoundPage pathname={pathname} />
  const routeGroupKey = INSTRUCTOR_PAGE_ROUTES.has(pathname)
    ? 'instructor'
    : PROJECT_HUB_PAGE_ROUTES.has(pathname)
      ? 'project-hub'
      : MENTORING_WORKSPACE_ROUTES.has(pathname)
        ? `mentoring-workspace:${new URLSearchParams(window.location.search).get('workspaceId') ?? ''}`
        : SQUAD_WORKSPACE_ROUTES.has(pathname)
          ? `squad-workspace:${new URLSearchParams(window.location.search).get('workspaceId') ?? ''}:${new URLSearchParams(window.location.search).get('ai') ?? ''}`
          : locationKey

  return (
    <RouteErrorBoundary key={routeGroupKey} resetKey={locationKey}>
      <Suspense fallback={<RouteLoadingView />}>{page}</Suspense>
    </RouteErrorBoundary>
  )
}
