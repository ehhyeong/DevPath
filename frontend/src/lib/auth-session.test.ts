import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { consumePostLoginReturnPath, getPostLoginRedirect, storePostLoginReturnPath } from './auth-session'

beforeEach(() => sessionStorage.clear())
afterEach(() => sessionStorage.clear())

describe('로그인 후 이동 경로', () => {
  it('관리자는 저장된 일반 화면보다 관리자 대시보드를 우선하고 복귀 경로를 소비한다', () => {
    storePostLoginReturnPath('/dashboard')

    expect(getPostLoginRedirect('ROLE_ADMIN')).toBe('/admin-dashboard')
    expect(consumePostLoginReturnPath()).toBeNull()
  })

  it('관리자는 저장된 경로가 없어도 관리자 대시보드로 이동한다', () => {
    expect(getPostLoginRedirect('ROLE_ADMIN')).toBe('/admin-dashboard')
  })

  it.each(['ROLE_LEARNER', 'ROLE_INSTRUCTOR'])('%s는 저장한 경로의 검색 조건과 해시로 복귀한다', (role) => {
    storePostLoginReturnPath('/lecture-list?keyword=React#courses')

    expect(getPostLoginRedirect(role)).toBe('/lecture-list?keyword=React#courses')
    expect(consumePostLoginReturnPath()).toBeNull()
  })

  it.each(['ROLE_LEARNER', 'ROLE_INSTRUCTOR', null])('%s는 저장된 경로가 없으면 홈으로 이동한다', (role) => {
    expect(getPostLoginRedirect(role)).toBe('/')
  })
})
