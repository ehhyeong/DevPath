export const WORKSPACE_PROJECT_START_EVENT = 'devpath:workspace-project-start'

export function openWorkspaceProjectStart() {
  window.dispatchEvent(new Event(WORKSPACE_PROJECT_START_EVENT))
}
