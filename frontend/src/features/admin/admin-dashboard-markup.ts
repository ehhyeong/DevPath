import { createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { installAdminActionDelegation } from './admin-action-registry'
import AdminDashboardShell from './shell/AdminDashboardShell'
import './admin-dashboard.css'

const ADMIN_DASHBOARD_BODY_CLASS = 'flex h-screen overflow-hidden bg-[#F8FAFC] text-slate-800'

let adminRoot: Root | null = null

export function prepareAdminDashboardDocument() {
  document.title = 'DevPath Admin'
  adminRoot?.unmount()
  adminRoot = null
  document.body.className = ADMIN_DASHBOARD_BODY_CLASS
  document.body.replaceChildren()

  const host = document.createElement('div')
  host.id = 'admin-dashboard-root'
  host.style.display = 'contents'
  document.body.appendChild(host)

  adminRoot = createRoot(host)
  flushSync(() => {
    adminRoot?.render(createElement('div', { style: { display: 'contents' } },
      createElement(AdminDashboardShell),
    ))
  })
  installAdminActionDelegation(document.body)
}
