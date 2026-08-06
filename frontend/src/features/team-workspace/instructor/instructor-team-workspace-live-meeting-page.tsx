import { useEffect,useMemo,useRef,useState } from 'react';
import { navigateTo } from '../../../lib/spa-navigation';
import { readStoredAuthSession } from '../../../lib/auth-session';
import type { TeamData,WorkspaceMember } from './instructor-types';
import { avatarUrl,buildHref,formatTime,INSTRUCTOR_TEAM_LIVE_MEETING_UI_LOCK_CLASSES,shortRoleLabel } from './instructor-workspace-support';



export function StreamVideo({ stream, className, muted = false }: { stream: MediaStream | null; className: string; muted?: boolean }) {
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream
  }, [stream])

  return <video ref={videoRef} className={className} autoPlay playsInline muted={muted} />
}

export function LiveMeetingPage({ data, workspaceId }: { data: TeamData; workspaceId: number | null }) {
  const session = useMemo(() => readStoredAuthSession(), [])
  const [sideTab, setSideTab] = useState<'chat' | 'users'>('users')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null)
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(true)
  const [recording, setRecording] = useState(false)
  const [endModalOpen, setEndModalOpen] = useState(false)
  const [handRaised, setHandRaised] = useState(false)
  const [mutedAll, setMutedAll] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<Array<{ id: number; sender: string; content: string; own?: boolean; time: string }>>([])
  const localStreamRef = useRef<MediaStream | null>(null)
  const screenStreamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const liveParticipants: WorkspaceMember[] = []
  const hostName = data.dashboard?.ownerName ?? session?.name ?? '강사'
  const participantCount = liveParticipants.length + 1
  const mediaStartupError = !navigator.mediaDevices?.getUserMedia
    ? '현재 브라우저에서 카메라와 마이크를 사용할 수 없습니다.'
    : null
  const visibleError = mediaStartupError ?? error

  function stopStream(stream: MediaStream | null) {
    stream?.getTracks().forEach((track) => track.stop())
  }

  async function ensureLocalStream() {
    if (localStreamRef.current) return localStreamRef.current
    if (!navigator.mediaDevices?.getUserMedia) {
      return null
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      localStreamRef.current = stream
      setLocalStream(stream)
      setMicOn(true)
      setCamOn(true)
      setError(null)
      return stream
    } catch {
      setError('카메라 또는 마이크 권한을 허용해야 라이브 미팅을 시작할 수 있습니다.')
      return null
    }
  }

  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      return
    }

    let active = true

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        if (!active) {
          stopStream(stream)
          return
        }

        localStreamRef.current = stream
        setLocalStream(stream)
        setMicOn(true)
        setCamOn(true)
        setError(null)
      })
      .catch(() => {
        if (active) {
          setError('카메라 또는 마이크 권한을 허용해야 라이브 미팅을 시작할 수 있습니다.')
        }
      })

    return () => {
      active = false
      mediaRecorderRef.current?.stop()
      stopStream(localStreamRef.current)
      stopStream(screenStreamRef.current)
    }
  }, [])

  function leaveMeeting() {
    mediaRecorderRef.current?.stop()
    stopStream(localStreamRef.current)
    stopStream(screenStreamRef.current)
    navigateTo(buildHref('meeting', workspaceId))
  }

  async function toggleMic() {
    const stream = await ensureLocalStream()
    if (!stream) return
    const enabled = !micOn
    stream.getAudioTracks().forEach((track) => { track.enabled = enabled })
    setMicOn(enabled)
  }

  async function toggleCam() {
    const stream = await ensureLocalStream()
    if (!stream) return
    const enabled = !camOn
    stream.getVideoTracks().forEach((track) => { track.enabled = enabled })
    setCamOn(enabled)
  }

  async function toggleScreenShare() {
    if (screenStreamRef.current) {
      stopStream(screenStreamRef.current)
      screenStreamRef.current = null
      setScreenStream(null)
      return
    }
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setError('현재 브라우저에서 화면 공유를 사용할 수 없습니다.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
      screenStreamRef.current = stream
      setScreenStream(stream)
      setError(null)
      stream.getVideoTracks()[0]?.addEventListener('ended', () => {
        screenStreamRef.current = null
        setScreenStream(null)
      })
    } catch {
      setError('화면 공유가 취소되었거나 권한이 허용되지 않았습니다.')
    }
  }

  async function toggleRecord() {
    if (recording) {
      mediaRecorderRef.current?.stop()
      return
    }
    const sourceStream = screenStreamRef.current ?? localStreamRef.current ?? await ensureLocalStream()
    if (!sourceStream) return
    if (typeof MediaRecorder === 'undefined') {
      setError('현재 브라우저에서 녹화를 사용할 수 없습니다.')
      return
    }
    const recorder = new MediaRecorder(sourceStream)
    recordedChunksRef.current = []
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) recordedChunksRef.current.push(event.data)
    }
    recorder.onstop = () => {
      setRecording(false)
      const blob = new Blob(recordedChunksRef.current, { type: recorder.mimeType || 'video/webm' })
      if (!blob.size) return
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `devpath-team-live-meeting-${Date.now()}.webm`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    }
    mediaRecorderRef.current = recorder
    recorder.start()
    setRecording(true)
    setError(null)
  }

  function sendChat() {
    const content = message.trim()
    if (!content) return
    const now = new Date()
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    setMessages((current) => [...current, { id: Date.now(), sender: '나 (Host)', content, own: true, time }])
    setMessage('')
  }

  function muteAll() {
    if (liveParticipants.length === 0) {
      setMessages((current) => [...current, { id: Date.now(), sender: '시스템', content: '현재 음소거 요청을 보낼 참가자가 없습니다.', time: formatTime(new Date().toISOString()) }])
      return
    }
    setMutedAll(true)
    setMessages((current) => [...current, { id: Date.now(), sender: '시스템', content: '나를 제외한 참가자에게 음소거 요청을 보냈습니다.', time: formatTime(new Date().toISOString()) }])
  }

  return (
    <div className={`instructor-team-live-meeting flex h-screen flex-col overflow-hidden bg-gray-950 text-white ${INSTRUCTOR_TEAM_LIVE_MEETING_UI_LOCK_CLASSES}`}>
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-800 bg-gray-900 px-6">
        <div className="flex items-center gap-4">
          <button type="button" onClick={leaveMeeting} className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-800 text-gray-400 transition hover:bg-gray-700 hover:text-white"><i className="fas fa-arrow-left" /></button>
          <div>
            <div className="mb-0.5 flex items-center gap-2">
              <span className="flex items-center gap-1 rounded border border-red-500/30 bg-red-500/20 px-1.5 py-0.5 text-[9px]! leading-[12px]! font-extrabold text-red-400"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />ON AIR</span>
              <span className="rounded border border-purple-500/30 bg-purple-500/20 px-1.5 py-0.5 text-[9px]! leading-[12px]! font-extrabold text-purple-400">강사 (Host)</span>
              {recording ? <span className="flex items-center gap-1 rounded border border-gray-700 bg-gray-800 px-1.5 py-0.5 text-[9px]! leading-[12px]! font-extrabold text-gray-300"><i className="fas fa-circle text-[8px] text-red-500 recording-pulse" />REC</span> : null}
            </div>
            <h1 className="text-sm leading-none font-bold text-white">3주차 라이브 코드 리뷰</h1>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 font-mono text-xs text-gray-300"><i className="far fa-clock" />{formatTime(new Date().toISOString())}</div>
          <button type="button" onClick={() => setSidebarOpen((current) => !current)} className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gray-800 text-gray-400 transition hover:bg-gray-700 hover:text-white">
            <i className="fas fa-users" />
            <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full border-2 border-gray-900 bg-[#7C3AED] text-[9px]! leading-[12px]! font-bold text-white">{participantCount}</span>
          </button>
        </div>
      </header>

      {visibleError ? <div className="shrink-0 bg-red-600 px-6 py-2 text-xs font-bold text-white">{visibleError}</div> : null}

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <main className="relative flex min-w-0 flex-1 flex-col gap-4 p-4">
          <div className={`group relative flex flex-1 items-center justify-center overflow-hidden rounded-2xl border shadow-inner transition ${screenStream ? 'border-[#7C3AED]/50 bg-black shadow-[0_0_20px_rgba(124,58,237,0.15)]' : 'border-gray-800 bg-gray-950'}`}>
            {screenStream ? (
              <>
                <StreamVideo stream={screenStream} muted className="absolute inset-0 h-full w-full object-contain" />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/70 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 z-10">
                  <span className="flex items-center gap-2 rounded-lg border border-purple-400/30 bg-black/60 px-3 py-1.5 text-sm font-bold text-white backdrop-blur-md"><i className="fas fa-desktop text-[#A78BFA]" />내가 화면을 공유 중입니다</span>
                </div>
              </>
            ) : (
              <>
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 via-gray-950 to-black p-6">
                  {localStream && camOn ? (
                    <StreamVideo stream={localStream} muted className="mb-4 h-40 w-40 rounded-full border-4 border-[#7C3AED] bg-gray-800 object-cover shadow-2xl" />
                  ) : (
                    <div className="mb-4 flex h-32 w-32 items-center justify-center rounded-full border-4 border-gray-700 bg-gray-800 text-gray-600"><i className="fas fa-video-slash text-4xl" /></div>
                  )}
                  <h3 className="flex items-center gap-2 text-lg font-bold text-white"><span>{hostName} (강사)</span><i className={`fas ${micOn ? 'fa-microphone text-green-400' : 'fa-microphone-slash text-red-500'} text-sm`} /></h3>
                  <p className={`mt-1 text-xs font-medium ${camOn ? 'text-purple-400' : 'text-gray-500'}`}>{camOn ? '카메라 송출 중' : '카메라 꺼짐'}</p>
                </div>
                <div className="absolute bottom-4 left-4 z-10">
                  <span className="flex items-center gap-2 rounded-lg border border-gray-700 bg-black/60 px-3 py-1.5 text-sm font-bold text-white backdrop-blur-md"><i className="fas fa-video text-[#A78BFA]" />메인 카메라 뷰</span>
                </div>
              </>
            )}
          </div>

          <div className="grid h-36 shrink-0 grid-cols-2 gap-3 md:grid-cols-4">
            {liveParticipants.length === 0 ? Array.from({ length: 4 }).map((_, index) => <WaitingTile key={index} />) : liveParticipants.map((member, index) => (
              <ParticipantTile key={member.memberId} member={member} handRaised={index === 0 && handRaised} mutedAll={mutedAll} onLowerHand={() => setHandRaised(false)} />
            ))}
          </div>
        </main>

        <aside className={`flex h-full shrink-0 flex-col border-l border-gray-800 bg-gray-900 transition-all duration-300 ${sidebarOpen ? 'w-80 opacity-100' : 'w-0 overflow-hidden border-none opacity-0'}`}>
          <div className="flex shrink-0 border-b border-gray-800">
            <button type="button" onClick={() => setSideTab('chat')} className={`flex-1 border-b-2 py-4 text-sm font-bold transition ${sideTab === 'chat' ? 'border-[#7C3AED] text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>실시간 채팅</button>
            <button type="button" onClick={() => setSideTab('users')} className={`flex-1 border-b-2 py-4 text-sm font-bold transition ${sideTab === 'users' ? 'border-[#7C3AED] text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>참가자 관리 ({participantCount})</button>
          </div>
          {sideTab === 'chat' ? (
            <>
              <div className="custom-scrollbar flex flex-1 flex-col overflow-y-auto p-4">
                <div className="my-2 shrink-0 text-center"><span className="rounded-full bg-gray-800 px-3 py-1 text-[10px]! leading-[12px]! font-medium text-gray-400">멘토링 라이브 룸이 열렸습니다.</span></div>
                {messages.length === 0 ? (
                  <div className="flex flex-1 flex-col items-center justify-center pb-10 text-gray-500 opacity-60">
                    <i className="far fa-comments mb-3 text-4xl text-gray-600" />
                    <p className="mb-1 text-sm font-bold text-gray-400">아직 채팅이 없습니다</p>
                    <p className="text-center text-xs leading-relaxed text-gray-500">팀원들이 화상 멘토링 방에 입장하면<br />이곳에서 실시간 대화가 정렬됩니다.</p>
                  </div>
                ) : messages.map((item) => (
                  <div key={item.id} className={`mb-4 flex items-start gap-3 ${item.own ? 'flex-row-reverse' : ''}`}>
                    <img src={avatarUrl(item.sender)} className="h-8 w-8 shrink-0 rounded-full border border-gray-700 bg-gray-800" alt="" />
                    <div className={item.own ? 'flex flex-col items-end' : ''}>
                      <div className={`mb-1 flex items-center gap-2 ${item.own ? 'flex-row-reverse' : ''}`}>
                        <span className={`text-xs font-bold ${item.own ? 'text-[#A78BFA]' : 'text-gray-300'}`}>{item.sender}</span>
                        <span className="text-[9px]! leading-[12px]! text-gray-500">{item.time}</span>
                      </div>
                      <p className={`max-w-[220px] break-all p-3 text-sm font-medium shadow-md ${item.own ? 'rounded-b-xl rounded-tl-xl bg-[#7C3AED] text-white' : 'rounded-b-xl rounded-tr-xl bg-gray-800 text-gray-200'}`}>{item.content}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="shrink-0 border-t border-gray-800 bg-gray-900 p-4">
                <div className="flex gap-2 rounded-xl border border-gray-700 bg-gray-800 p-2 transition focus-within:border-[#7C3AED]">
                  <input value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') sendChat() }} className="flex-1 bg-transparent px-2 text-sm text-white outline-none placeholder:text-gray-500" placeholder="메시지 보내기..." />
                  <button type="button" onClick={sendChat} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#7C3AED] text-white transition hover:bg-purple-600"><i className="fas fa-paper-plane text-xs" /></button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="flex shrink-0 items-center justify-between border-b border-gray-800 p-4">
                <span className="text-xs font-bold text-gray-400">전체 인원 제어</span>
                <button type="button" onClick={muteAll} className="rounded border border-gray-700 bg-gray-800 px-3 py-1.5 text-[10px]! leading-[12px]! font-bold text-gray-300 transition hover:bg-gray-700">모두 음소거</button>
              </div>
              <div className="custom-scrollbar flex-1 space-y-1 overflow-y-auto p-2">
                <div className="flex items-center justify-between rounded-xl border border-gray-800 bg-gray-800/40 p-2.5">
                  <div className="flex items-center gap-3">
                    <img src={avatarUrl(hostName)} className="h-8 w-8 rounded-full border border-[#7C3AED]" alt="" />
                    <div><span className="block text-sm leading-tight font-bold text-[#A78BFA]">나 ({hostName})</span><span className="mt-0.5 inline-block rounded bg-[#7C3AED] px-1.5 py-0.5 text-[10px]! leading-[12px]! font-bold text-white">Host</span></div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <i className={`fas fa-desktop ${screenStream ? 'animate-pulse text-[#A78BFA]' : 'text-gray-600'}`} />
                    <i className={`fas ${micOn ? 'fa-microphone text-green-400' : 'fa-microphone-slash text-red-500'}`} />
                    <i className={`fas ${camOn ? 'fa-video text-gray-300' : 'fa-video-slash text-red-500'}`} />
                  </div>
                </div>
                {liveParticipants.map((member, index) => (
                  <div key={member.memberId} className={`flex items-center justify-between rounded p-2 transition ${index === 0 && handRaised ? 'border border-gray-700 bg-gray-800/50' : 'hover:bg-gray-800'}`}>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img src={member.profileImage ?? avatarUrl(member.learnerName)} className="h-8 w-8 rounded-full border border-gray-600" alt="" />
                        {index === 0 && handRaised ? <div className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-yellow-500 text-[8px] text-white">✋</div> : null}
                      </div>
                      <div><span className="block text-sm font-bold text-gray-200">{member.learnerName ?? '팀원'}</span><span className="inline-block rounded border border-blue-500/30 bg-blue-500/20 px-1 text-[8px] text-blue-400">{member.roleLabel ?? shortRoleLabel(member.position) ?? 'Member'}</span></div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      {index === 0 && handRaised ? <button type="button" onClick={() => setHandRaised(false)} className="rounded bg-gray-700 px-1.5 py-0.5 text-[9px]! leading-[12px]! text-white transition hover:bg-gray-600">손 내리기</button> : null}
                      <i className={`fas fa-microphone-slash ${mutedAll ? 'text-red-500' : 'text-gray-500'}`} />
                      <i className="fas fa-video" />
                    </div>
                  </div>
                ))}
                {liveParticipants.length === 0 ? <div className="mt-4 flex flex-col items-center justify-center p-8 text-center text-gray-600"><i className="fas fa-users-slash mb-2 text-2xl opacity-30" /><p className="text-xs leading-relaxed font-medium">입장 대기 중인 팀원이 없습니다.<br />접속 요청 시 알림이 전송됩니다.</p></div> : null}
              </div>
            </div>
          )}
        </aside>
      </div>

      <footer className="relative z-30 flex h-20 shrink-0 items-center justify-center border-t border-gray-800 bg-gray-950 px-6">
        <div className="flex items-center gap-3 md:gap-4">
          <button type="button" onClick={() => void toggleMic()} className={`flex h-12 w-12 items-center justify-center rounded-full border text-lg transition ${micOn ? 'border-gray-700 bg-gray-800 text-white hover:bg-gray-700' : 'border-red-500/30 bg-red-500/20 text-red-500 hover:bg-red-500/30'}`}><i className={micOn ? 'fas fa-microphone' : 'fas fa-microphone-slash'} /></button>
          <button type="button" onClick={() => void toggleCam()} className={`flex h-12 w-12 items-center justify-center rounded-full border text-lg transition ${camOn ? 'border-gray-700 bg-gray-800 text-white hover:bg-gray-700' : 'border-red-500/30 bg-red-500/20 text-red-500 hover:bg-red-500/30'}`}><i className={camOn ? 'fas fa-video' : 'fas fa-video-slash'} /></button>
          <button type="button" onClick={() => void toggleScreenShare()} className={`flex h-12 w-12 items-center justify-center rounded-full text-lg transition ${screenStream ? 'bg-[#7C3AED] text-white shadow-lg shadow-purple-900/50 hover:bg-purple-600' : 'border border-gray-700 bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'}`}><i className="fas fa-desktop" /></button>
          <div className="mx-2 h-8 w-px bg-gray-800" />
          <button type="button" onClick={() => void toggleRecord()} className={`group relative flex h-12 w-12 items-center justify-center rounded-full border text-lg transition ${recording ? 'border-red-500/50 bg-red-500/20 text-red-500' : 'border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700'}`}><i className="fas fa-circle text-sm" /><div className="pointer-events-none absolute -top-8 rounded bg-gray-800 px-2 py-1 text-[10px]! leading-[12px]! text-white opacity-0 transition group-hover:opacity-100 whitespace-nowrap">밋업 녹화하기</div></button>
          <div className="mx-2 h-8 w-px bg-gray-800" />
          <button type="button" onClick={() => setEndModalOpen(true)} className="flex h-12 items-center justify-center gap-2 rounded-full bg-red-600 px-6 font-bold text-white shadow-lg shadow-red-900/50 transition hover:bg-red-700"><i className="fas fa-phone-slash" /><span className="hidden md:inline">회의 종료</span></button>
        </div>
      </footer>

      {endModalOpen ? (
        <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-gray-900/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-gray-700 bg-gray-900 p-6 shadow-2xl">
            <h3 className="mb-2 text-lg font-extrabold text-white">방을 나가시겠습니까?</h3>
            <p className="mb-6 text-sm text-gray-400">호스트 권한입니다. 나 혼자 나갈지, 전체 회의를 종료시킬지 선택하세요.</p>
            <div className="flex flex-col gap-3">
              <button type="button" onClick={leaveMeeting} className="w-full rounded-xl bg-red-600 py-3 text-sm font-bold text-white transition hover:bg-red-700">모두를 위해 회의 종료</button>
              <button type="button" onClick={leaveMeeting} className="w-full rounded-xl border border-gray-700 bg-gray-800 py-3 text-sm font-bold text-white transition hover:bg-gray-700">나만 방 나가기 (호스트 위임)</button>
              <button type="button" onClick={() => setEndModalOpen(false)} className="mt-2 w-full rounded-xl bg-transparent py-2 text-sm font-bold text-gray-500 transition hover:text-gray-300">취소</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function WaitingTile() {
  return (
    <div className="flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-gray-800/60 bg-gray-800/20 text-gray-500/80 transition hover:bg-gray-800/30">
      <i className="fas fa-user-clock mb-1.5 text-xl opacity-40" />
      <span className="text-xs font-semibold tracking-wide">팀원 대기 중...</span>
    </div>
  )
}

export function ParticipantTile({ member, handRaised, mutedAll, onLowerHand }: { member: WorkspaceMember; handRaised: boolean; mutedAll: boolean; onLowerHand: () => void }) {
  return (
    <div className={`group relative overflow-hidden rounded-2xl bg-gray-800 ${handRaised ? 'border-2 border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)]' : 'border border-gray-700'}`}>
      <img src={member.profileImage ?? avatarUrl(member.learnerName)} className="absolute inset-0 h-full w-full bg-gray-700 object-cover" alt="" />
      <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[9px]! leading-[12px]! font-bold text-white backdrop-blur-md">
        <i className={`fas fa-microphone-slash ${mutedAll ? 'text-red-500' : 'text-gray-400'}`} />{member.learnerName ?? '팀원'} ({member.roleLabel ?? shortRoleLabel(member.position) ?? 'Member'})
      </div>
      {handRaised ? <button type="button" onClick={onLowerHand} className="absolute top-2 right-2 flex animate-bounce items-center gap-1 rounded-full bg-yellow-500 px-2 py-1 text-[10px]! leading-[12px]! font-bold text-white shadow-lg"><i className="fas fa-hand-paper" />질문 있음</button> : null}
    </div>
  )
}
