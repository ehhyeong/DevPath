import AdminSidebar from './AdminSidebar'
import AdminHeader from './AdminHeader'
import AdminDashboardView from './AdminDashboardView'
import AdminTagsView from './AdminTagsView'
import AdminOfficialRoadmapsView from './AdminOfficialRoadmapsView'
import AdminRoadmapInfoView from './AdminRoadmapInfoView'
import AdminRoadmapsView from './AdminRoadmapsView'
import AdminNodeResourcesView from './AdminNodeResourcesView'
import AdminCatalogMenuView from './AdminCatalogMenuView'
import AdminRoadmapHubView from './AdminRoadmapHubView'
import AdminUsersView from './AdminUsersView'
import AdminReportsView from './AdminReportsView'
import AdminNodeModal from './AdminNodeModal'
import AdminAccountDetailModal from './AdminAccountDetailModal'
import AdminCourseReviewModal from './AdminCourseReviewModal'
import AdminGovernanceView from './AdminGovernanceView'
import AdminOperationsView from './AdminOperationsView'

export default function AdminDashboardShell() {
  return (
    <>
      <AdminSidebar />
      <main className="min-w-0 flex-1 overflow-y-auto" id="main-content">
        <AdminHeader />
        <div className="admin-content-shell">
          <AdminDashboardView />
          <AdminTagsView />
          <AdminGovernanceView />
          <AdminOfficialRoadmapsView />
          <AdminRoadmapInfoView />
          <AdminRoadmapsView />
          <AdminNodeResourcesView />
          <AdminCatalogMenuView />
          <AdminRoadmapHubView />
          <AdminUsersView />
          <AdminReportsView />
          <AdminOperationsView />
        </div>
      </main>
      <AdminNodeModal />
      <AdminAccountDetailModal />
      <AdminCourseReviewModal />
    </>
  )
}
