import type { AuthLoginRequest, AuthSignUpRequest, AuthTokenResponse } from '../../types/auth'
import type { TechTag, UserPasswordChangeRequest, UserProfile, UserProfileUpdateRequest } from '../../types/learner'
import { invalidateRequestCache,request } from './client'

export const authApi = {
  signUp(payload: AuthSignUpRequest) {
    return request<void>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  login(payload: AuthLoginRequest) {
    return request<AuthTokenResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  logout(refreshToken: string) {
    return request<void>(
      '/api/auth/logout',
      {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      },
      { auth: true },
    )
  },
}

export const userApi = {
  getMyProfile(signal?: AbortSignal) {
    return request<UserProfile>(
      '/api/users/me/profile',
      { method: 'GET', signal },
      { auth: true, cache: { key: 'account:profile', ttlMs: 60_000 } },
    )
  },
  async updateMyProfile(payload: UserProfileUpdateRequest) {
    const profile = await request<UserProfile>(
      '/api/users/me/profile',
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      },
      { auth: true },
    )
    invalidateRequestCache('account:profile')
    return profile
  },
  changePassword(payload: UserPasswordChangeRequest) {
    return request<void>(
      '/api/users/me/password',
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
      { auth: true },
    )
  },
  getOfficialTags(signal?: AbortSignal) {
    return request<TechTag[]>(
      '/api/users/tags/official',
      { method: 'GET', signal },
      { auth: true, cache: { key: 'account:official-tags', ttlMs: 300_000 } },
    )
  },
}
