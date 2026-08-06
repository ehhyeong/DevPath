import AppRouter from './app-router'
import { renderPage } from './lib/render-page'
import { getCurrentPathname } from './routes'

const pathname = getCurrentPathname()

if (pathname === '/admin-dashboard') {
  void import('./features/admin/admin-dashboard').then(({ mountAdminDashboardPage }) => {
    mountAdminDashboardPage()
  })
} else {
  renderPage(<AppRouter />, {
    missingRootMessage: 'root element was not found',
  })
}
