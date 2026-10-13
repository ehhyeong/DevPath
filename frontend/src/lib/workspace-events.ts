import { useEffect, useState } from 'react'
import { SPA_NAVIGATION_EVENT } from './spa-navigation'

/** AI 비서가 워크스페이스 데이터를 바꾼 뒤 발생시킨다. 해당 데이터를 보여주는 화면은 이 이벤트를 받아 다시 불러온다. */
export const WORKSPACE_DATA_CHANGED_EVENT = 'devpath:workspace-data-changed'

/** 데이터 변경이나 해당 페이지 재방문 시 증가하여, 보존한 화면 위에 최신 데이터를 갱신한다. */
export function useWorkspaceDataVersion() {
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const pagePath = window.location.pathname
    const bump = () => setVersion((current) => current + 1)
    const refreshOnReturn = () => {
      if (window.location.pathname === pagePath) bump()
    }
    window.addEventListener(WORKSPACE_DATA_CHANGED_EVENT, bump)
    window.addEventListener(SPA_NAVIGATION_EVENT, refreshOnReturn)
    window.addEventListener('popstate', refreshOnReturn)
    return () => {
      window.removeEventListener(WORKSPACE_DATA_CHANGED_EVENT, bump)
      window.removeEventListener(SPA_NAVIGATION_EVENT, refreshOnReturn)
      window.removeEventListener('popstate', refreshOnReturn)
    }
  }, [])

  return version
}
