import { beforeEach,describe,expect,it } from 'vitest'
import { buildWorkspaceHref,readAuthViewFromLocation,readNumberSearchParam,readWorkspaceIdFromLocation,syncAuthViewInLocation } from './location-state'

describe('location state', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/home')
  })

  it('양의 숫자 쿼리와 workspaceId만 읽는다', () => {
    window.history.replaceState({}, '', '/squad?workspaceId=11&courseId=-1')

    expect(readWorkspaceIdFromLocation()).toBe(11)
    expect(readNumberSearchParam('courseId')).toBeNull()
    expect(readNumberSearchParam('missing')).toBeNull()
  })

  it('인증 모달 상태를 기존 쿼리와 hash를 보존하며 동기화한다', () => {
    window.history.replaceState({}, '', '/home?tab=popular#hero')

    syncAuthViewInLocation('login')
    expect(readAuthViewFromLocation()).toBe('login')
    expect(window.location.href).toContain('/home?tab=popular&auth=login#hero')

    syncAuthViewInLocation(null)
    expect(readAuthViewFromLocation()).toBeNull()
    expect(window.location.href).toContain('/home?tab=popular#hero')
  })

  it('workspace 경로에 유효한 식별자만 추가한다', () => {
    expect(buildWorkspaceHref('/squad-dashboard', 11)).toBe('/squad-dashboard?workspaceId=11')
    expect(buildWorkspaceHref('/squad-dashboard', null)).toBe('/squad-dashboard')
  })
})
