import type { HomeOverview } from '../../types/home'
import { request } from './client'

export const homeApi = {
  getOverview(signal?: AbortSignal) {
    return request<HomeOverview>('/api/home/overview', { method: 'GET', signal })
  },
}
