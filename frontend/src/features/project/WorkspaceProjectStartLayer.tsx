import { useEffect, useState } from 'react'
import WorkspaceProjectStartModal from './WorkspaceProjectStartModal'
import { WORKSPACE_PROJECT_START_EVENT } from './workspace-project-start-event'

export default function WorkspaceProjectStartLayer() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const openProjectStart = () => setOpen(true)
    window.addEventListener(WORKSPACE_PROJECT_START_EVENT, openProjectStart)

    return () => window.removeEventListener(WORKSPACE_PROJECT_START_EVENT, openProjectStart)
  }, [])

  return (
    <WorkspaceProjectStartModal
      open={open}
      onClose={() => setOpen(false)}
      onOpen={() => setOpen(true)}
    />
  )
}
