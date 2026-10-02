import { useEffect, useState } from 'react'

/** AI 비서가 워크스페이스 데이터를 바꾼 뒤 발생시킨다. 해당 데이터를 보여주는 화면은 이 이벤트를 받아 다시 불러온다. */
export const WORKSPACE_DATA_CHANGED_EVENT = 'devpath:workspace-data-changed'

/** 이벤트를 받을 때마다 1씩 커지는 값. 화면의 불러오기 useEffect 의존성에 넣으면 다시 불러온다. */
export function useWorkspaceDataVersion() {
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const bump = () => setVersion((current) => current + 1)
    window.addEventListener(WORKSPACE_DATA_CHANGED_EVENT, bump)
    return () => window.removeEventListener(WORKSPACE_DATA_CHANGED_EVENT, bump)
  }, [])

  return version
}