import { useAuthSession } from '../../../lib/useAuthSession'
import { useState } from 'react'
import type { AuthView } from '../../../components/AuthModal'

import type { CameraView,FloatingReaction,RoomPanelTab,ScreenShareView,VoiceChannel,VoiceConnectionStatus,VoiceParticipant,VoicePresence,WorkspaceDashboard } from './meeting-types'

export function useSquadMeetingRoomState() {
  const [session,setSession] = useAuthSession()
  const [authView,setAuthView] = useState<AuthView | null>(null)
  const [dashboard,setDashboard] = useState<WorkspaceDashboard | null>(null)
  const [channels,setChannels] = useState<VoiceChannel[]>([])
  const [activeChannel,setActiveChannel] = useState<VoiceChannel | null>(null)
  const [participants,setParticipants] = useState<VoiceParticipant[]>([])
  const [presentUsers,setPresentUsers] = useState<VoicePresence[]>([])
  const [roomPanelTab,setRoomPanelTab] = useState<RoomPanelTab>('minutes')
  const [roomSidePanelOpen,setRoomSidePanelOpen] = useState(true)
  const [loading,setLoading] = useState(true)
  const [error,setError] = useState<string | null>(null)
  const [joining,setJoining] = useState(false)
  const [audioSettingsOpen,setAudioSettingsOpen] = useState(false)
  const [now,setNow] = useState(() => Date.now())

  return { session,setSession,authView,setAuthView,dashboard,setDashboard,channels,setChannels,activeChannel,setActiveChannel,participants,setParticipants,presentUsers,setPresentUsers,roomPanelTab,setRoomPanelTab,roomSidePanelOpen,setRoomSidePanelOpen,loading,setLoading,error,setError,joining,setJoining,audioSettingsOpen,setAudioSettingsOpen,now,setNow }
}

export function useSquadMeetingMediaState() {
  const [remoteAudioMuted,setRemoteAudioMuted] = useState(false)
  const [waitingMicMuted,setWaitingMicMuted] = useState(false)
  const [voiceConnectionStatus,setVoiceConnectionStatus] = useState<VoiceConnectionStatus>('idle')
  const [voiceConnectionError,setVoiceConnectionError] = useState<string | null>(null)
  const [,setLocalSpeaking] = useState(false)
  const [localCameraStream,setLocalCameraStream] = useState<MediaStream | null>(null)
  const [remoteCameraStreams,setRemoteCameraStreams] = useState<Map<number,CameraView>>(() => new Map())
  const [localScreenShareStream,setLocalScreenShareStream] = useState<MediaStream | null>(null)
  const [remoteScreenShares,setRemoteScreenShares] = useState<Map<number,ScreenShareView>>(() => new Map())
  const [floatingReactions,setFloatingReactions] = useState<FloatingReaction[]>([])

  return { remoteAudioMuted,setRemoteAudioMuted,waitingMicMuted,setWaitingMicMuted,voiceConnectionStatus,setVoiceConnectionStatus,voiceConnectionError,setVoiceConnectionError,setLocalSpeaking,localCameraStream,setLocalCameraStream,remoteCameraStreams,setRemoteCameraStreams,localScreenShareStream,setLocalScreenShareStream,remoteScreenShares,setRemoteScreenShares,floatingReactions,setFloatingReactions }
}
