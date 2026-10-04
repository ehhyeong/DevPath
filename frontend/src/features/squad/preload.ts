import { projectApiRequest } from '../project/api'
import { squadPageLoaders } from './pages'

export async function preloadSquadWorkspace(workspaceId: number) {
  const workspacePath = `/api/workspaces/${workspaceId}`
  const dataPaths = [
    `${workspacePath}/dashboard`,
    `${workspacePath}/tasks`,
    `${workspacePath}/calendar-events`,
    `${workspacePath}/notices`,
    `${workspacePath}/activities/recent`,
    `${workspacePath}/erd/recent-changes`,
    `${workspacePath}/voice-channels`,
    `${workspacePath}/integrations`,
    `${workspacePath}/erd`,
    `${workspacePath}/erd/versions`,
    `${workspacePath}/erd/comments`,
    `${workspacePath}/files`,
    `${workspacePath}/files/storage`,
    `${workspacePath}/code-reviews`,
    `${workspacePath}/settings`,
    `/api/lounge/chats/messages?loungeId=${workspaceId}`,
  ]

  await Promise.allSettled([
    ...Object.values(squadPageLoaders).map((loadPage) => loadPage()),
    ...dataPaths.map((path) => projectApiRequest<unknown>(path, {}, 'required')),
  ])
}
