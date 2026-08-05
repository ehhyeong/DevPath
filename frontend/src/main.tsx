import AppRouter from './app-router'
import { renderPage } from './lib/render-page'
import { installWorkspacePresenceHeartbeat } from './lib/workspace-presence'
import { getCurrentPathname } from './routes'

const pathname = getCurrentPathname()

installWorkspacePresenceHeartbeat(pathname)

if (pathname === '/admin-dashboard') {
  void import('./features/admin/admin-dashboard').then(({ mountAdminDashboardPage }) => {
    mountAdminDashboardPage()
  })
} else {
  renderPage(<AppRouter pathname={pathname} />, {
    missingRootMessage: 'root element was not found',
  })
}
