import { projectApiRequest } from './project-api'

export const SQUAD_NOTIFICATION_CREATED_EVENT = 'squad-notification-created'

export type SquadNotificationPageKey =
  | 'squad-dashboard'
  | 'squad-workspace'
  | 'squad-review'
  | 'squad-erd'
  | 'squad-schedule'
  | 'squad-files'
  | 'squad-meeting'
  | 'squad-settings'

export type SquadHeaderNotification = {
  id: number
  workspaceId: number
  pageKey: string
  message: string
  timeLabel: string
  targetPath?: string | null
  createdAt?: string | null
}

type CreateSquadNotificationPayload = {
  pageKey: SquadNotificationPageKey
  message: string
  targetPath?: string | null
}

export function squadActorName(name?: string | null) {
  return name?.trim() || '팀원'
}

export async function createSquadNotification(
  workspaceId: number | null,
  payload: CreateSquadNotificationPayload,
) {
  if (!workspaceId || !payload.message.trim()) return null

  try {
    const notification = await projectApiRequest<SquadHeaderNotification>(
      `/api/workspaces/${workspaceId}/squad-header-notifications`,
      {
        method: 'POST',
        body: JSON.stringify({
          ...payload,
          message: payload.message.trim().slice(0, 500),
        }),
      },
      'required',
    )

    window.dispatchEvent(new CustomEvent(SQUAD_NOTIFICATION_CREATED_EVENT, { detail: notification }))
    return notification
  } catch {
    return null
  }
}
