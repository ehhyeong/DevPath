import { projectApiRequest } from './project-api'

import type {
  VoiceChannel,
  VoiceChatMessage,
  VoiceEventType,
  VoiceMeetingMinutes,
  VoiceMeetingSummaryResponse,
  VoiceMinutesKanbanTasks,
  VoiceParticipant,
  VoicePresence,
  WorkspaceDashboard,
} from './squad-meeting-types'

export async function loadSquadMeetingInitialData(workspaceId: number) {
  const dashboard = await projectApiRequest<WorkspaceDashboard>(`/api/workspaces/${workspaceId}/dashboard`, {}, 'required')
  let channels = await projectApiRequest<VoiceChannel[]>(`/api/workspaces/${workspaceId}/voice-channels`, {}, 'required')
  let selectedChannel = channels[0] ?? null

  if (!selectedChannel) {
    const createdChannel = await projectApiRequest<VoiceChannel>(
      '/api/voice-channels',
      {
        method: 'POST',
        body: JSON.stringify({
          workspaceId,
          name: `${dashboard.name} 음성 회의`,
          description: '스쿼드 프로젝트 진행을 위한 음성 회의 채널입니다.',
        }),
      },
      'required',
    )

    selectedChannel = { ...createdChannel, activeParticipantCount: 0 }
    channels = [selectedChannel]
  }

  const participants = await fetchSquadVoiceParticipants(selectedChannel.channelId)

  return { dashboard, channels, selectedChannel, participants }
}

export function fetchSquadVoiceParticipants(channelId: number) {
  return projectApiRequest<VoiceParticipant[]>(`/api/voice-channels/${channelId}/participants`, {}, 'required')
}

export function fetchSquadVoicePresence(channelId: number) {
  return projectApiRequest<VoicePresence[]>(`/api/voice-channels/${channelId}/presence`, {}, 'required')
}

export function touchSquadVoicePresence(channelId: number) {
  return projectApiRequest<VoicePresence>(
    `/api/voice-channels/${channelId}/presence`,
    { method: 'POST', body: JSON.stringify({}) },
    'required',
  )
}

export function fetchSquadVoiceChatMessages(channelId: number) {
  return projectApiRequest<VoiceChatMessage[]>(`/api/voice-channels/${channelId}/chat-messages`, {}, 'required')
}

export function fetchSquadVoiceMinutes(channelId: number) {
  return projectApiRequest<VoiceMeetingMinutes>(`/api/voice-channels/${channelId}/minutes`, {}, 'required')
}

export function createSquadVoiceEvent(channelId: number, type: VoiceEventType, memo: string) {
  return projectApiRequest(
    `/api/voice-channels/${channelId}/events`,
    { method: 'POST', body: JSON.stringify({ type, memo }) },
    'required',
  )
}

export function appendSquadVoiceMinutesTranscriptLine(channelId: number, text: string) {
  return projectApiRequest<VoiceMeetingMinutes>(
    `/api/voice-channels/${channelId}/minutes/transcript-lines`,
    { method: 'POST', body: JSON.stringify({ text }) },
    'required',
  )
}

export function sendSquadVoiceChatMessage(channelId: number, content: string) {
  return projectApiRequest<VoiceChatMessage>(
    `/api/voice-channels/${channelId}/chat-messages`,
    { method: 'POST', body: JSON.stringify({ content }) },
    'required',
  )
}

export function clearSquadVoiceChatMessages(channelId: number) {
  return projectApiRequest(
    `/api/voice-channels/${channelId}/chat-messages/clear`,
    { method: 'POST', body: JSON.stringify({}) },
    'required',
  )
}

export function updateSquadVoiceMinutes(channelId: number, payload: Partial<VoiceMeetingMinutes>) {
  return projectApiRequest<VoiceMeetingMinutes>(
    `/api/voice-channels/${channelId}/minutes`,
    { method: 'PATCH', body: JSON.stringify(payload) },
    'required',
  )
}

export function createSquadVoiceMinutesSummary(channelId: number) {
  return projectApiRequest<VoiceMeetingSummaryResponse>(
    `/api/voice-channels/${channelId}/minutes/summary`,
    { method: 'POST', body: JSON.stringify({}) },
    'required',
  )
}

export function createSquadVoiceMinutesKanbanTasks(channelId: number, actionItems: unknown[]) {
  return projectApiRequest<VoiceMinutesKanbanTasks>(
    `/api/voice-channels/${channelId}/minutes/action-items/tasks`,
    { method: 'POST', body: JSON.stringify({ actionItems }) },
    'required',
  )
}

export function joinSquadVoiceChannel(channelId: number) {
  return projectApiRequest<VoiceParticipant>(`/api/voice-channels/${channelId}/join`, { method: 'POST', body: JSON.stringify({}) }, 'required')
}

export function leaveSquadVoiceChannel(channelId: number) {
  return projectApiRequest<VoiceParticipant>(`/api/voice-channels/${channelId}/leave`, { method: 'POST', body: JSON.stringify({}) }, 'required')
}
