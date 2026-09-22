import type { AuthenticatedHomeDashboard, HomeOverview } from '../../types/home'
import { request } from './client'

export const homeApi = {
  getOverview(signal?: AbortSignal) {
    return request<HomeOverview>('/api/home/overview', { method: 'GET', signal })
  },
  getDashboard(signal?: AbortSignal) {
    return request<AuthenticatedHomeDashboard>(
      '/api/home/dashboard',
      { method: 'GET', signal },
      { auth: true },
    )
  },
}
