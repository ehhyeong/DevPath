import App from './App.tsx'
import JobMatchingApp from './JobMatchingApp'
import MyRoadmapListPage from './pages/MyRoadmapListPage'
import { renderPage } from './render-page'
import SquadDashboardApp from './SquadDashboardApp'
import SquadErdApp from './SquadErdApp'
import SquadFilesApp from './SquadFilesApp'
import SquadMeetingApp from './SquadMeetingApp'
import SquadReviewApp from './SquadReviewApp'
import SquadScheduleApp from './SquadScheduleApp'
import SquadSettingsApp from './SquadSettingsApp'
import SquadWorkspaceApp from './SquadWorkspaceApp'
import { installWorkspacePresenceHeartbeat } from './lib/workspace-presence'

let pathname = window.location.pathname.replace(/\/+$/, '')

if (pathname === '/my-roadmap-list.html') {
  const nextUrl = `/my-roadmap-list${window.location.search}${window.location.hash}`
  window.history.replaceState({}, '', nextUrl)
  pathname = '/my-roadmap-list'
}

installWorkspacePresenceHeartbeat(pathname)

const page =
  pathname === '/job-matching'
    ? <JobMatchingApp />
    : pathname === '/my-roadmap-list'
      ? <MyRoadmapListPage />
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
  missingRootMessage: 'home root element was not found',
})
