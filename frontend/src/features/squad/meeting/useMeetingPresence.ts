import { useEffect } from 'react'
import { fetchSquadVoiceParticipants, fetchSquadVoicePresence, touchSquadVoicePresence } from './meeting-api'
import type { VoiceParticipant, VoicePresence } from './meeting-types'

type Props = {
  channelId: number | null
  accessToken: string | null | undefined
  setParticipants: (participants: VoiceParticipant[]) => void
  setPresentUsers: (presence: VoicePresence[]) => void
}

export function useMeetingPresence({ channelId, accessToken, setParticipants, setPresentUsers }: Props) {
  useEffect(() => {
    if (!channelId || !accessToken) {
      setPresentUsers([])
      return
    }
    let stopped = false
    const activeChannelId = channelId

    async function syncWaitingRoom() {
      try {
        await touchSquadVoicePresence(activeChannelId)
        const [participantData, presenceData] = await Promise.all([
          fetchSquadVoiceParticipants(activeChannelId),
          fetchSquadVoicePresence(activeChannelId),
        ])
        if (stopped) return
        setParticipants(participantData)
        setPresentUsers(presenceData)
      } catch {
        // Presence is supplemental; a missed heartbeat must not make the room unusable.
      }
    }

    void syncWaitingRoom()
    const heartbeatId = window.setInterval(() => {
      void touchSquadVoicePresence(activeChannelId).catch(() => undefined)
    }, 10000)
    const refreshId = window.setInterval(() => void syncWaitingRoom(), 5000)
    const handleFocus = () => {
      if (!document.hidden) void syncWaitingRoom()
    }
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleFocus)

    return () => {
      stopped = true
      window.clearInterval(heartbeatId)
      window.clearInterval(refreshId)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleFocus)
    }
  }, [accessToken, channelId, setParticipants, setPresentUsers])
}
