import AiSquadWorkspaceApp from './AiSquadWorkspaceApp'
import SquadDashboardApp from './SquadDashboardApp'

export const squadDashboardPage = SquadDashboardApp

export const squadPageLoaders = {
  '/squad-dashboard': () => Promise.resolve({ default: SquadDashboardApp }),
  '/squad-blueprint': () => Promise.resolve({ default: AiSquadWorkspaceApp }),
  '/squad-workspace': () => import('./SquadWorkspaceApp'),
  '/squad-review': () => import('./SquadReviewApp'),
  '/squad-erd': () => import('./SquadErdApp'),
  '/squad-api': () => Promise.resolve({ default: AiSquadWorkspaceApp }),
  '/squad-schedule': () => import('./SquadScheduleApp'),
  '/squad-files': () => import('./SquadFilesApp'),
  '/squad-meeting': () => import('./SquadMeetingApp'),
  '/squad-interview': () => Promise.resolve({ default: AiSquadWorkspaceApp }),
  '/squad-settings': () => import('./SquadSettingsApp'),
}
