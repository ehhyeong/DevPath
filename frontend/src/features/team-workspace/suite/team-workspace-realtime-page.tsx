import { useEffect,useMemo,useRef,useState,type FormEvent,type WheelEvent as ReactWheelEvent } from 'react'
import { navigateTo } from '../../../lib/spa-navigation'
import UserAvatar from '../../../components/UserAvatar'
import { readStoredAuthSession } from '../../../lib/auth-session'
import { TEAM_WORKSPACE_PAGE_LOCK_CLASS_NAME } from './constants'
import { isOfficialLiveEvent } from './team-workspace-suite-support'
import type { SuiteData } from './types'
import { clampNumber,fallbackMemberPosition,formatConnectionTime,formatVoiceChatTime,liveMediaTracks,measureBrowserPing,memberAssignedPosition,memberPositionBadgeClass,navHref,parseDate,setMediaTrackEnabled,stopMediaStream } from './utils'


export function RealtimePage({
  page,
  data,
  workspaceId,
}: {
  page: 'live-meeting' | 'voice-channel'
  data: SuiteData
  workspaceId: number
}) {
  const localCameraVideoRef = useRef<HTMLVideoElement | null>(null)
  const screenShareVideoRef = useRef<HTMLVideoElement | null>(null)
  const screenShareStageRef = useRef<HTMLDivElement | null>(null)
  const localMediaStreamRef = useRef<MediaStream | null>(null)
  const screenShareStreamRef = useRef<MediaStream | null>(null)
  const [muted, setMuted] = useState(false)
  const [cameraOff, setCameraOff] = useState(true)
  const [deafened, setDeafened] = useState(false)
  const [screenSharing, setScreenSharing] = useState(false)
  const [screenShareFullscreen, setScreenShareFullscreen] = useState(false)
  const [screenShareZoom, setScreenShareZoom] = useState(1)
  const [screenShareTransformOrigin, setScreenShareTransformOrigin] = useState('50% 50%')
  const [cameraStreamActive, setCameraStreamActive] = useState(false)
  const [chatOpen, setChatOpen] = useState(true)
  const [connectionSeconds, setConnectionSeconds] = useState(0)
  const [networkPing, setNetworkPing] = useState<number | null>(null)
  const [pingState, setPingState] = useState<'measuring' | 'connected' | 'unstable'>('measuring')
  const [speaking, setSpeaking] = useState(false)
  const [mediaError, setMediaError] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<Array<{ id: number; text: string; createdAt: Date }>>([])
  const members = useMemo(() => data.dashboard?.members ?? [], [data.dashboard?.members])
  const isLive = page === 'live-meeting'
  const liveMeetingEvent = data.events.filter((event) => isOfficialLiveEvent(event)).sort((left, right) => (parseDate(left.startAt)?.getTime() ?? 0) - (parseDate(right.startAt)?.getTime() ?? 0))[0] ?? null
  const voiceChannel = data.voiceChannels[0] ?? null
  const voiceParticipantCount = voiceChannel?.activeParticipantCount ?? 0
  const hasLiveMeeting = Boolean(liveMeetingEvent)
  const hasVoiceSession = voiceParticipantCount > 0
  const title = isLive ? liveMeetingEvent?.title || '라이브 밋업' : voiceChannel?.name || '음성 채널 채팅'
  const session = readStoredAuthSession()
  const currentMember = members.find((member) => member.learnerId === session?.userId) ?? members[0] ?? null
  const orderedMembers = useMemo(() => {
    if (!currentMember) return members

    return [currentMember, ...members.filter((member) => member.memberId !== currentMember.memberId)]
  }, [currentMember, members])
  const visibleVoiceCount = Math.max(1, Math.min(orderedMembers.length || 1, voiceParticipantCount || (hasVoiceSession ? orderedMembers.length : 1)))
  const voiceMembers = orderedMembers.slice(0, visibleVoiceCount)
  const currentMemberPosition = currentMember ? memberAssignedPosition(currentMember, data.tasks) ?? fallbackMemberPosition(0) : 'FE'
  const pingToneClass = pingState === 'connected'
    ? networkPing !== null && networkPing > 300
      ? 'text-red-400'
      : networkPing !== null && networkPing > 150
        ? 'text-yellow-400'
        : 'text-green-500'
    : pingState === 'measuring'
      ? 'text-yellow-400'
      : 'text-red-400'
  const pingLabel = pingState === 'connected' && networkPing !== null ? `${networkPing}ms` : '측정 중'
  const pingStatusLabel = pingState === 'unstable' ? '연결 불안정' : pingState === 'measuring' ? '측정 중' : '음성 연결됨'

  useEffect(() => {
    if (isLive) return undefined

    const timer = window.setInterval(() => {
      setConnectionSeconds((current) => current + 1)
    }, 1000)

    return () => window.clearInterval(timer)
  }, [isLive])

  useEffect(() => {
    if (isLive) return undefined

    let alive = true

    const updatePing = async () => {
      try {
        const nextPing = await measureBrowserPing()
        if (!alive) return
        setNetworkPing(nextPing)
        setPingState('connected')
      } catch {
        if (!alive) return
        setNetworkPing(null)
        setPingState('unstable')
      }
    }

    void updatePing()
    const timer = window.setInterval(() => {
      void updatePing()
    }, 5000)

    return () => {
      alive = false
      window.clearInterval(timer)
    }
  }, [isLive])

  useEffect(() => {
    if (isLive) return undefined

    return () => {
      stopMediaStream(localMediaStreamRef.current)
      localMediaStreamRef.current = null
      stopMediaStream(screenShareStreamRef.current)
      screenShareStreamRef.current = null
    }
  }, [isLive])

  useEffect(() => {
    if (isLive) return undefined

    let cancelled = false

    const enableDefaultMicrophone = async () => {
      await Promise.resolve()
      if (cancelled) return

      if (liveMediaTracks(localMediaStreamRef.current, 'audio').length > 0) {
        setMediaTrackEnabled(localMediaStreamRef.current, 'audio', true)
        setMuted(false)
        setDeafened(false)
        return
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setMuted(true)
        setMediaError('이 브라우저는 마이크 장치를 지원하지 않습니다.')
        return
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        if (cancelled) {
          stopMediaStream(stream)
          return
        }

        const targetStream = localMediaStreamRef.current ?? new MediaStream()
        localMediaStreamRef.current = targetStream
        targetStream.getAudioTracks().forEach((track) => {
          targetStream.removeTrack(track)
          track.stop()
        })
        stream.getTracks().forEach((track) => {
          if (track.kind === 'audio') {
            track.enabled = true
            targetStream.addTrack(track)
            track.addEventListener('ended', () => {
              setMuted(true)
              setSpeaking(false)
            })
            return
          }

          track.stop()
        })

        setMuted(false)
        setDeafened(false)
        setMediaError(null)
      } catch {
        if (cancelled) return
        setMuted(true)
        setSpeaking(false)
        setMediaError('마이크 권한을 허용해야 음성 채널에서 말할 수 있습니다.')
      }
    }

    void enableDefaultMicrophone()

    return () => {
      cancelled = true
    }
  }, [isLive])

  useEffect(() => {
    if (isLive) return undefined

    const video = localCameraVideoRef.current
    if (!video) return undefined

    const stream = !cameraOff && cameraStreamActive ? localMediaStreamRef.current : null
    video.srcObject = stream
    if (stream) void video.play().catch(() => undefined)

    return () => {
      video.srcObject = null
    }
  }, [cameraOff, cameraStreamActive, isLive])

  useEffect(() => {
    if (isLive) return undefined

    const video = screenShareVideoRef.current
    if (!video) return undefined

    const stream = screenSharing ? screenShareStreamRef.current : null
    video.srcObject = stream
    if (stream) void video.play().catch(() => undefined)

    return () => {
      video.srcObject = null
    }
  }, [isLive, screenSharing])

  useEffect(() => {
    if (isLive) return undefined

    const syncFullscreenState = () => {
      setScreenShareFullscreen(document.fullscreenElement === screenShareStageRef.current)
    }

    document.addEventListener('fullscreenchange', syncFullscreenState)

    return () => document.removeEventListener('fullscreenchange', syncFullscreenState)
  }, [isLive])

  useEffect(() => {
    if (isLive) return undefined

    const toggleSpeaking = (event: KeyboardEvent) => {
      const hasEnabledAudio = liveMediaTracks(localMediaStreamRef.current, 'audio').some((track) => track.enabled)
      if (event.key.toLowerCase() === 'p' && hasEnabledAudio && !muted && !deafened) {
        setSpeaking((current) => !current)
      }
    }

    window.addEventListener('keydown', toggleSpeaking)

    return () => window.removeEventListener('keydown', toggleSpeaking)
  }, [deafened, isLive, muted])

  function sendMessage(event: FormEvent) {
    event.preventDefault()
    if (!message.trim()) return

    setMessages((current) => [...current, { id: Date.now(), text: message.trim(), createdAt: new Date() }])
    setMessage('')
  }

  function installLocalTracks(stream: MediaStream, kind: 'audio' | 'video') {
    const targetStream = localMediaStreamRef.current ?? new MediaStream()
    localMediaStreamRef.current = targetStream

    targetStream
      .getTracks()
      .filter((track) => track.kind === kind)
      .forEach((track) => {
        targetStream.removeTrack(track)
        track.stop()
      })

    stream.getTracks().forEach((track) => {
      if (track.kind === kind) {
        targetStream.addTrack(track)
        return
      }

      track.stop()
    })
  }

  async function ensureAudioTrack() {
    if (liveMediaTracks(localMediaStreamRef.current, 'audio').length > 0) return true

    if (!navigator.mediaDevices?.getUserMedia) {
      setMediaError('이 브라우저는 마이크 장치를 지원하지 않습니다.')
      return false
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      installLocalTracks(stream, 'audio')
      liveMediaTracks(localMediaStreamRef.current, 'audio').forEach((track) => {
        track.addEventListener('ended', () => {
          setMuted(true)
          setSpeaking(false)
        })
      })
      setMediaError(null)
      return true
    } catch {
      setMuted(true)
      setSpeaking(false)
      setMediaError('마이크 권한을 허용해야 음성 채널에서 말할 수 있습니다.')
      return false
    }
  }

  async function toggleMic() {
    if (muted || deafened) {
      const hasAudioTrack = await ensureAudioTrack()
      if (!hasAudioTrack) return

      setMediaTrackEnabled(localMediaStreamRef.current, 'audio', true)
      setDeafened(false)
      setMuted(false)
      return
    }

    setMediaTrackEnabled(localMediaStreamRef.current, 'audio', false)
    setMuted(true)
    setSpeaking(false)
  }

  async function toggleCamera() {
    if (!cameraOff && cameraStreamActive) {
      liveMediaTracks(localMediaStreamRef.current, 'video').forEach((track) => {
        localMediaStreamRef.current?.removeTrack(track)
        track.stop()
      })
      setCameraOff(true)
      setCameraStreamActive(false)
      return
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraOff(true)
      setCameraStreamActive(false)
      setMediaError('이 브라우저는 카메라 장치를 지원하지 않습니다.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      installLocalTracks(stream, 'video')
      liveMediaTracks(localMediaStreamRef.current, 'video').forEach((track) => {
        track.addEventListener('ended', () => {
          setCameraOff(true)
          setCameraStreamActive(false)
        })
      })
      setCameraOff(false)
      setCameraStreamActive(true)
      setMediaError(null)
    } catch {
      setCameraOff(true)
      setCameraStreamActive(false)
      setMediaError('카메라 권한을 허용해야 내 캠 화면을 표시할 수 있습니다.')
    }
  }

  function toggleDeafen() {
    if (!deafened) {
      setMediaTrackEnabled(localMediaStreamRef.current, 'audio', false)
      setDeafened(true)
      setMuted(true)
      setSpeaking(false)
      return
    }

    setDeafened(false)
  }

  function handleScreenShareWheel(event: ReactWheelEvent<HTMLDivElement>) {
    event.preventDefault()

    const bounds = event.currentTarget.getBoundingClientRect()
    const originX = clampNumber(((event.clientX - bounds.left) / bounds.width) * 100, 0, 100)
    const originY = clampNumber(((event.clientY - bounds.top) / bounds.height) * 100, 0, 100)
    const zoomDelta = event.deltaY < 0 ? 0.18 : -0.18

    setScreenShareTransformOrigin(`${originX.toFixed(1)}% ${originY.toFixed(1)}%`)
    setScreenShareZoom((current) => Number(clampNumber(current + zoomDelta, 1, 4).toFixed(2)))
  }

  function resetScreenShareZoom() {
    setScreenShareZoom(1)
    setScreenShareTransformOrigin('50% 50%')
  }

  async function toggleScreenShareFullscreen() {
    const stage = screenShareStageRef.current
    if (!stage) return

    try {
      if (document.fullscreenElement === stage) {
        await document.exitFullscreen()
        return
      }

      if (document.fullscreenElement) {
        await document.exitFullscreen()
      }

      await stage.requestFullscreen()
      setMediaError(null)
    } catch {
      setMediaError('브라우저가 화면 공유 전체화면 전환을 차단했습니다.')
    }
  }

  async function toggleScreenShare() {
    if (screenSharing) {
      stopMediaStream(screenShareStreamRef.current)
      screenShareStreamRef.current = null
      resetScreenShareZoom()
      if (document.fullscreenElement === screenShareStageRef.current) {
        void document.exitFullscreen().catch(() => undefined)
      }
      setScreenSharing(false)
      return
    }

    if (!navigator.mediaDevices?.getDisplayMedia) {
      setMediaError('이 브라우저는 화면 공유를 지원하지 않습니다.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
      screenShareStreamRef.current = stream
      stream.getVideoTracks().forEach((track) => {
        track.addEventListener('ended', () => {
          stopMediaStream(screenShareStreamRef.current)
          screenShareStreamRef.current = null
          resetScreenShareZoom()
          if (document.fullscreenElement === screenShareStageRef.current) {
            void document.exitFullscreen().catch(() => undefined)
          }
          setScreenSharing(false)
        })
      })
      resetScreenShareZoom()
      setScreenSharing(true)
      setMediaError(null)
    } catch {
      resetScreenShareZoom()
      setScreenSharing(false)
      setMediaError('화면 공유 권한을 허용해야 내 화면을 공유할 수 있습니다.')
    }
  }

  function leaveVoiceChannel() {
    if (window.confirm('음성 채널 연결을 끊으시겠습니까?')) {
      navigateTo(navHref('/team-ws-meeting', workspaceId))
    }
  }

  if (!isLive) {
    const renderedVoiceMembers = voiceMembers.length > 0 ? voiceMembers : [null]

    return (
      <div className={`${TEAM_WORKSPACE_PAGE_LOCK_CLASS_NAME} team-ws-dashboard-page team-ws-realtime-page flex h-screen flex-col overflow-hidden bg-[#0B0F19] text-white`}>
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-800 bg-[#111827] px-6">
          <div className="flex min-w-0 items-center gap-4">
            <button type="button" onClick={leaveVoiceChannel} className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-800 text-gray-400 transition hover:bg-gray-700 hover:text-white" title="회의장으로 돌아가기">
              <i className="fas fa-arrow-left"></i>
            </button>
            <div className="min-w-0">
              <div className="mb-0.5 flex items-center gap-2">
                <span className={`flex items-center gap-1 text-[10px] font-extrabold ${pingToneClass}`}>
                  <i className="fas fa-signal"></i>
                  Ping: {pingLabel} ({pingStatusLabel})
                </span>
                <span className="rounded border border-indigo-500/30 bg-indigo-500/20 px-1.5 py-0.5 text-[9px] font-extrabold text-indigo-400">상시 회의장</span>
              </div>
              <h1 className="flex items-center gap-2 truncate text-sm font-bold text-white">
                <i className="fas fa-volume-up text-team"></i>
                {voiceChannel?.name || '우리 팀 보이스 챗'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 font-mono text-xs text-green-400">
              <i className="far fa-clock"></i>
              <span>{formatConnectionTime(connectionSeconds)}</span>
            </div>
            <button type="button" onClick={() => setChatOpen((current) => !current)} className={`relative flex h-10 w-10 items-center justify-center rounded-full transition ${chatOpen ? 'bg-team text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'}`} title={chatOpen ? '채팅 닫기' : '채팅 열기'}>
              <i className="fas fa-comment-alt"></i>
            </button>
          </div>
        </header>

        <div className="relative flex min-h-0 flex-1 overflow-hidden">
          <main className="custom-scrollbar relative flex flex-1 flex-col items-center justify-center overflow-y-auto p-8">
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-20">
              <div className="h-96 w-96 rounded-full bg-team blur-[100px]"></div>
            </div>

            {mediaError ? (
              <div className="absolute left-1/2 top-5 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-red-500/30 bg-red-500/15 px-4 py-2 text-xs font-bold text-red-200 shadow-lg backdrop-blur">
                <i className="fas fa-triangle-exclamation"></i>
                {mediaError}
              </div>
            ) : null}

            {screenSharing ? (
              <div ref={screenShareStageRef} onWheel={handleScreenShareWheel} className="team-ws-screen-share-stage relative z-10 mb-8 aspect-video w-full max-w-5xl overflow-hidden rounded-2xl border border-gray-700 bg-black shadow-2xl">
                <video
                  ref={screenShareVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="h-full w-full object-contain opacity-95 transition-transform duration-150 ease-out"
                  style={{ transform: `scale(${screenShareZoom})`, transformOrigin: screenShareTransformOrigin }}
                />
                <div className="absolute left-4 top-4 flex items-center gap-2 rounded-lg border border-white/10 bg-black/70 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-md">
                  <i className="fas fa-desktop text-team"></i>
                  내 화면 공유 중
                </div>
                <div className="absolute right-4 top-4 flex items-center gap-2">
                  <span className="rounded-lg border border-white/10 bg-black/70 px-2.5 py-1.5 text-[11px] font-bold text-white backdrop-blur-md">{Math.round(screenShareZoom * 100)}%</span>
                  {screenShareZoom > 1 ? (
                    <button type="button" onClick={() => { setScreenShareZoom(1); setScreenShareTransformOrigin('50% 50%') }} className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-black/70 text-white transition hover:bg-white/20" title="확대 초기화">
                      <i className="fas fa-rotate-left text-xs"></i>
                    </button>
                  ) : null}
                  <button type="button" onClick={() => { void toggleScreenShareFullscreen() }} className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-black/70 text-white transition hover:bg-white/20" title={screenShareFullscreen ? '전체화면 종료' : '전체화면으로 보기'}>
                    <i className={`fas ${screenShareFullscreen ? 'fa-compress' : 'fa-expand'} text-xs`}></i>
                  </button>
                </div>
              </div>
            ) : null}

            <div className={`z-10 flex flex-wrap justify-center transition-all duration-500 ${screenSharing ? '-mt-8 scale-75 gap-6' : 'gap-12'}`}>
              {renderedVoiceMembers.map((member, index) => {
                const isCurrentMember = !member || member.learnerId === currentMember?.learnerId
                const displayName = member?.learnerName?.trim() || (isCurrentMember ? '나' : `팀원 ${index + 1}`)
                const position = member ? memberAssignedPosition(member, data.tasks) ?? fallbackMemberPosition(index) : currentMemberPosition
                const remoteMuted = !isCurrentMember && index >= 2
                const memberMuted = isCurrentMember ? muted : remoteMuted
                const memberSpeaking = isCurrentMember ? speaking && !muted && !deafened : index === 1 && hasVoiceSession && !remoteMuted
                const showLocalCameraPreview = isCurrentMember && !cameraOff && cameraStreamActive
                const badgeClassName = memberMuted
                  ? 'bg-red-500 text-white'
                  : memberSpeaking
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-700 text-gray-400'

                return (
                  <div key={member?.memberId ?? 'current-user'} className={`avatar-float flex flex-col items-center gap-3 ${memberSpeaking ? 'is-speaking' : ''} ${memberMuted ? 'opacity-50' : ''}`} style={{ animationDelay: `${index}s` }}>
                    <div className="relative">
                      {showLocalCameraPreview ? (
                        <video ref={localCameraVideoRef} autoPlay muted playsInline className="team-ws-voice-avatar h-24 w-24 rounded-full border-4 border-gray-700 bg-gray-950 object-cover shadow-lg transition-all duration-300" />
                      ) : (
                        <UserAvatar name={displayName} imageUrl={member?.profileImage} className="team-ws-voice-avatar h-24 w-24 border-4 border-gray-700 bg-gray-800 shadow-lg transition-all duration-300" iconClassName="text-3xl" />
                      )}
                      <div className={`absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#0B0F19] ${badgeClassName}`}>
                        <i className={`fas ${memberMuted ? 'fa-microphone-slash text-xs' : 'fa-microphone'}`}></i>
                      </div>
                    </div>
                    <div className="text-center">
                      <p className={`flex items-center justify-center gap-1 text-sm font-bold ${memberMuted ? 'text-gray-400' : 'text-white'}`}>
                        {displayName}
                        <span className={`rounded px-1 py-0.5 text-[9px] ${memberPositionBadgeClass(position)}`}>{position}</span>
                      </p>
                    </div>
                  </div>
                )
              })}

              {voiceMembers.length <= 1 ? (
                <div className="flex animate-pulse flex-col items-center gap-3">
                  <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-dashed border-gray-800 text-gray-600">
                    <i className="fas fa-user-plus text-xl"></i>
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-medium text-gray-500">팀원 대기 중...</p>
                  </div>
                </div>
              ) : null}
            </div>
          </main>

          <aside className={`team-ws-voice-chat-sidebar flex h-full shrink-0 flex-col overflow-hidden bg-[#111827] transition-all duration-300 ${chatOpen ? 'w-80 border-l border-gray-800 opacity-100' : 'w-0 border-none opacity-0'}`}>
            <div className="shrink-0 border-b border-gray-800 bg-gray-900/50 p-4">
              <h3 className="flex items-center gap-2 text-sm font-bold text-white"><i className="fas fa-hashtag text-gray-500"></i> 음성 채널 채팅</h3>
              <p className="mt-1 text-[10px] text-gray-400">링크나 코드를 공유할 때 사용하세요.</p>
            </div>

            <div className={`custom-scrollbar flex-1 overflow-y-auto p-4 ${messages.length === 0 ? 'flex flex-col items-center justify-center' : 'space-y-4'}`}>
              {messages.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-gray-800 bg-gray-800/50 text-gray-400">
                    <i className="fas fa-comment-alt-slash text-base"></i>
                  </div>
                  <p className="text-xs font-semibold text-gray-300">음성 채널 채팅에 오신 것을 환영합니다.</p>
                  <p className="mx-auto mt-1 max-w-[190px] text-[11px] leading-normal text-gray-500">아직 주고받은 메시지가 없습니다. 팀원들과 대화를 시작해보세요.</p>
                </div>
              ) : (
                messages.map((item) => (
                  <div key={item.id} className="flex w-full flex-row-reverse items-start gap-3">
                    <UserAvatar name={currentMember?.learnerName || '나'} imageUrl={currentMember?.profileImage} className="h-8 w-8 border border-gray-700 bg-gray-800" iconClassName="text-xs" />
                    <div className="flex min-w-0 flex-col items-end">
                      <div className="mb-0.5 flex flex-row-reverse items-center gap-2">
                        <span className="text-xs font-bold text-white">{currentMember?.learnerName || '나'}</span>
                        <span className={`rounded px-1 py-0.5 text-[9px] ${memberPositionBadgeClass(currentMemberPosition)}`}>{currentMemberPosition}</span>
                        <span className="text-[9px] text-gray-500">{formatVoiceChatTime(item.createdAt)}</span>
                      </div>
                      <p className="whitespace-pre-line break-all rounded-b-xl rounded-tl-xl border border-indigo-500 bg-team p-2.5 text-right text-xs leading-relaxed text-white shadow-md">
                        {item.text}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={sendMessage} className="shrink-0 border-t border-gray-800 bg-gray-900 p-4">
              <div className="flex gap-2 rounded-xl border border-gray-700 bg-gray-800 p-2 transition focus-within:border-team">
                <input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="메시지 보내기..." className="min-w-0 flex-1 bg-transparent px-2 text-sm text-white outline-none placeholder:text-gray-500" />
                <button type="submit" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-team text-white transition hover:bg-indigo-500">
                  <i className="fas fa-paper-plane text-xs"></i>
                </button>
              </div>
            </form>
          </aside>
        </div>

        <footer className="relative z-30 flex h-20 shrink-0 items-center justify-center border-t border-gray-800 bg-[#111827] px-6 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
          <div className="flex items-center gap-3 md:gap-5">
            <button type="button" onClick={() => { void toggleMic() }} className={`team-ws-voice-control-button group relative flex h-12 w-12 items-center justify-center rounded-full text-lg shadow-md transition ${muted ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-gray-700 text-white hover:bg-gray-600'}`}>
              <i className={`fas ${muted ? 'fa-microphone-slash' : 'fa-microphone'}`}></i>
              <span className="pointer-events-none absolute -top-8 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-[10px] text-white opacity-0 transition group-hover:opacity-100">{muted ? '마이크 켜기' : '마이크 끄기'}</span>
            </button>

            <button type="button" onClick={() => { void toggleCamera() }} className={`team-ws-voice-control-button group relative flex h-12 w-12 items-center justify-center rounded-full text-lg shadow-md transition ${cameraOff ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-gray-700 text-white hover:bg-gray-600'}`}>
              <i className={`fas ${cameraOff ? 'fa-video-slash' : 'fa-video'}`}></i>
              <span className="pointer-events-none absolute -top-8 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-[10px] text-white opacity-0 transition group-hover:opacity-100">{cameraOff ? '캠 켜기' : '캠 끄기'}</span>
            </button>

            <button type="button" onClick={toggleDeafen} className={`team-ws-voice-control-button group relative flex h-12 w-12 items-center justify-center rounded-full text-lg shadow-md transition ${deafened ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-gray-700 text-white hover:bg-gray-600'}`}>
              <i className={`fas ${deafened ? 'fa-deaf' : 'fa-headphones'}`}></i>
              <span className="pointer-events-none absolute -top-8 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-[10px] text-white opacity-0 transition group-hover:opacity-100">{deafened ? '헤드셋 켜기' : '헤드셋 소리 끄기'}</span>
            </button>

            <button type="button" onClick={() => { void toggleScreenShare() }} className={`team-ws-voice-control-button group relative flex h-12 w-12 items-center justify-center rounded-full text-lg transition ${screenSharing ? 'bg-team text-white shadow-[0_0_15px_rgba(79,70,229,0.5)] hover:bg-indigo-500' : 'bg-gray-700 text-white shadow-md hover:bg-gray-600'}`}>
              <i className="fas fa-desktop"></i>
              <span className="pointer-events-none absolute -top-8 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-[10px] text-white opacity-0 transition group-hover:opacity-100">{screenSharing ? '공유 중지하기' : '화면 공유하기'}</span>
            </button>

            <div className="mx-2 h-8 w-px bg-gray-700"></div>

            <button type="button" onClick={leaveVoiceChannel} className="flex h-12 w-14 items-center justify-center rounded-2xl bg-red-600 text-xl text-white shadow-lg shadow-red-900/50 transition hover:bg-red-700" title="채널 나가기">
              <i className="fas fa-phone-slash"></i>
            </button>
          </div>
        </footer>
      </div>
    )
  }

  return (
    <div className={`${TEAM_WORKSPACE_PAGE_LOCK_CLASS_NAME} team-ws-dashboard-page team-ws-realtime-page flex h-screen overflow-hidden bg-[#0F172A] text-white`}>
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[68px] shrink-0 items-center justify-between border-b border-white/10 bg-[#111827] px-6">
          <div className="flex min-w-0 items-center gap-3">
            <a href={navHref('/team-ws-meeting', workspaceId)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-gray-300 hover:bg-white/20">
              <i className="fas fa-arrow-left"></i>
            </a>
            <div className="min-w-0">
              <h1 className="truncate text-[17px] font-black">{title}</h1>
              <p className={`text-[11px] font-bold ${isLive ? (hasLiveMeeting ? 'text-emerald-400' : 'text-gray-400') : hasVoiceSession ? 'text-emerald-400' : 'text-gray-400'}`}>
                {isLive ? (hasLiveMeeting ? 'LIVE 대기실' : '밋업 대기 중') : hasVoiceSession ? `${voiceParticipantCount}명 접속 중` : '음성 연결 대기 중'}
              </p>
            </div>
          </div>
          <a href={navHref('/team-ws-meeting', workspaceId)} className="h-10 rounded-xl bg-red-500 px-4 text-[13px] font-black leading-10 text-white hover:bg-red-600">
            {isLive ? '밋업 나가기' : '채널 나가기'}
          </a>
        </header>

        <section className="flex min-h-0 flex-1 overflow-hidden">
          {isLive ? (
            <main className="relative flex flex-1 flex-col gap-4 p-4">
              {hasLiveMeeting ? (
                <div className="video-container group relative flex flex-1 items-center justify-center overflow-hidden rounded-2xl border border-gray-800 bg-gray-950 shadow-lg">
                  <img src="https://images.unsplash.com/photo-1555099962-4199c345e5dd?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&q=80" alt="Mentor Screen Share" className="absolute inset-0 h-full w-full object-cover opacity-90" />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-transparent to-transparent"></div>
                  <div className="absolute bottom-4 left-4 flex items-center gap-2">
                    <span className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/60 px-3 py-1.5 text-sm font-bold text-white backdrop-blur-md">
                      <i className="fas fa-desktop text-mentor"></i>
                      {liveMeetingEvent?.title}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden rounded-2xl border border-gray-800 bg-gray-950 shadow-lg">
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-20">
                    <div className="h-96 w-96 rounded-full bg-team blur-[100px]"></div>
                  </div>
                  <div className="relative z-10 mb-6 flex h-24 w-24 animate-pulse items-center justify-center rounded-full border-2 border-dashed border-indigo-500/50 bg-gray-900/50 text-indigo-400">
                    <i className="fas fa-video text-3xl"></i>
                  </div>
                  <h2 className="relative z-10 mb-2 text-xl font-bold text-white">밋업 시작 대기 중</h2>
                  <p className="relative z-10 max-w-sm text-center text-sm leading-relaxed text-gray-400">등록된 공식 라이브 밋업 일정이 없습니다.<br />일정 페이지에서 멘토 밋업 일정을 등록하면 이곳에 표시됩니다.</p>
                </div>
              )}

              <div className="grid h-40 shrink-0 grid-cols-5 gap-3">
                {(hasLiveMeeting ? members.slice(0, 5) : []).map((member, index) => (
                  <div key={member.memberId} className={`group relative overflow-hidden rounded-2xl bg-gray-800 ${index === 0 ? 'border-2 border-team shadow-[0_0_15px_rgba(79,70,229,0.3)]' : 'border border-gray-700'}`}>
                    <UserAvatar name={member.learnerName || (index === 0 ? '나' : `팀원 ${index + 1}`)} imageUrl={member.profileImage} className="absolute inset-0 h-full w-full rounded-none border-0 bg-gray-700 object-cover" iconClassName="text-4xl" />
                    <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-bold text-white backdrop-blur-md">
                      <i className={`fas ${index === 0 ? 'fa-microphone text-green-400' : 'fa-microphone-slash text-red-500'}`}></i>
                      {member.learnerName || (index === 0 ? '나 (FE)' : `팀원 ${index + 1}`)}
                    </div>
                  </div>
                ))}
                {Array.from({ length: Math.max(0, 5 - (hasLiveMeeting ? members.slice(0, 5).length : 0)) }, (_, index) => (
                  <div key={`waiting-${index}`} className="group relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-gray-700 bg-gray-800/30">
                    <i className="fas fa-user-plus mb-2 text-xl text-gray-600 transition group-hover:text-gray-500"></i>
                    <span className="text-[10px] font-medium text-gray-500 transition group-hover:text-gray-400">대기 중</span>
                  </div>
                ))}
              </div>
            </main>
          ) : (
            <main className="custom-scrollbar relative flex flex-1 flex-col items-center justify-center overflow-y-auto p-8">
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-20">
                <div className="h-96 w-96 rounded-full bg-team blur-[100px]"></div>
              </div>
              <div className="z-10 flex flex-col items-center gap-4 transition-all duration-500">
                <div className={`avatar-float flex h-28 w-28 items-center justify-center rounded-full border-4 shadow-lg ${hasVoiceSession ? 'is-speaking border-green-400 bg-gray-800 text-green-400' : 'border-dashed border-gray-800 bg-gray-900 text-gray-600'}`}>
                  <i className={`fas ${hasVoiceSession ? 'fa-headset' : 'fa-user-plus'} text-3xl`}></i>
                </div>
                <p className="text-sm font-bold text-white">{hasVoiceSession ? `${voiceParticipantCount}명 접속 중` : '팀원 대기 중...'}</p>
                <p className="max-w-sm text-center text-xs leading-relaxed text-gray-500">
                  {hasVoiceSession ? `${voiceChannel?.name || '음성 채널'}에서 실시간 회의가 진행 중입니다.` : '실제 음성 채널 참가자가 생기면 접속 상태가 표시됩니다.'}
                </p>
              </div>
            </main>
          )}
        </section>

        <footer className="flex h-[84px] shrink-0 items-center justify-center gap-3 border-t border-white/10 bg-[#111827]">
          <button type="button" onClick={() => setMuted((current) => !current)} className={`flex h-12 w-12 items-center justify-center rounded-full text-lg ${muted ? 'bg-red-500 text-white' : 'bg-white/10 text-gray-200 hover:bg-white/20'}`}>
            <i className={`fas ${muted ? 'fa-microphone-slash' : 'fa-microphone'}`}></i>
          </button>
          <button type="button" onClick={() => setCameraOff((current) => !current)} className={`flex h-12 w-12 items-center justify-center rounded-full text-lg ${cameraOff ? 'bg-red-500 text-white' : 'bg-white/10 text-gray-200 hover:bg-white/20'}`}>
            <i className={`fas ${cameraOff ? 'fa-video-slash' : 'fa-video'}`}></i>
          </button>
          <button type="button" className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-lg text-gray-200 hover:bg-white/20">
            <i className="fas fa-desktop"></i>
          </button>
          {isLive ? (
            <button type="button" className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-lg text-gray-200 hover:bg-white/20">
              <i className="fas fa-hand"></i>
            </button>
          ) : null}
        </footer>
      </main>

      <aside className="hidden w-[360px] shrink-0 flex-col border-l border-white/10 bg-[#111827] lg:flex">
        <div className="flex h-[68px] items-center border-b border-white/10 px-5">
          <h2 className="text-[15px] font-black">{isLive ? '실시간 채팅' : '음성 채널 채팅'}</h2>
          <span className="ml-auto rounded-lg bg-white/10 px-2 py-1 text-[11px] font-black text-gray-300">참여자 {members.length}</span>
        </div>
        <div className="custom-scrollbar flex-1 space-y-3 overflow-y-auto p-5">
          {messages.length === 0 ? (
            <div className="mt-20 text-center">
              <i className="far fa-comments mb-3 text-4xl text-gray-600"></i>
              <p className="text-[13px] font-bold text-gray-400">아직 주고받은 메시지가 없습니다. 팀원들과 대화를 시작해보세요.</p>
            </div>
          ) : (
            messages.map((item) => (
              <div key={item.id} className="rounded-2xl bg-white/10 p-3">
                <p className="mb-1 text-[11px] font-black text-team">나</p>
                <p className="text-[13px] font-medium leading-5 text-gray-100">{item.text}</p>
              </div>
            ))
          )}
        </div>
        <form onSubmit={sendMessage} className="flex h-[76px] items-center gap-2 border-t border-white/10 p-4">
          <input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="메시지 입력..." className="h-11 min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-4 text-[13px] font-semibold text-white outline-none placeholder:text-gray-500 focus:border-team" />
          <button type="submit" className="flex h-11 w-11 items-center justify-center rounded-xl bg-team text-white">
            <i className="fas fa-paper-plane"></i>
          </button>
        </form>
      </aside>
    </div>
  )
}
