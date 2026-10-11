import { useRef, useState } from 'react'
import UserAvatar from '../../../components/UserAvatar'
import { showAuthToast } from '../../../lib/auth-toast'
import { MediaStreamVideo } from './meeting-media-stream-video'
import type { CameraView, ScreenShareView, VoiceParticipant, WorkspaceMember } from './meeting-types'

type Props = {
  participants: VoiceParticipant[]
  members: WorkspaceMember[]
  currentUserId?: number | null
  getCamera: (participant: VoiceParticipant) => CameraView | null
  screenShares: ScreenShareView[]
  onFullscreenShare: (userId: number) => void
}

export default function MeetingParticipantStage({ participants, members, currentUserId, getCamera, screenShares, onFullscreenShare }: Props) {
  // 확대 선택은 서버나 시그널링에 보내지 않아 각 참가자의 화면에만 적용된다.
  const [focusedKey, setFocusedKey] = useState<string | null>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const ordered = [...participants].sort((left, right) => {
    const joinedDifference = Date.parse(left.joinedAt ?? '') - Date.parse(right.joinedAt ?? '')
    return (Number.isFinite(joinedDifference) ? joinedDifference : 0) || left.participantId - right.participantId
  })
  const cards = ordered.map((participant) => {
    const camera = getCamera(participant)
    const share = screenShares.find((item) => item.userId === participant.userId)
    return { key: `participant-${participant.participantId}`, participant, media: share ?? camera, share: Boolean(share) }
  })
  const focused = cards.find((card) => card.key === focusedKey)
  if (focusedKey && !focused) setFocusedKey(null)

  function closeFocus() {
    setFocusedKey(null)
    if (document.fullscreenElement === stageRef.current) void document.exitFullscreen()
  }

  function renderCard(card: typeof cards[number], expanded = false) {
    const { participant, media, share } = card
    const member = members.find((item) => item.learnerId === participant.userId)
    const name = `${participant.userName}${participant.userId === currentUserId ? ' (나)' : ''}${share ? ' 화면 공유' : ''}`
    const speaking = participant.speaking && !participant.muted && !share
    return (
      <div key={card.key} className={`meeting-participant-card relative isolate overflow-hidden rounded-xl border bg-gray-800 shadow-md ${expanded ? 'h-full w-full' : 'h-44 w-72 max-w-full shrink-0'} ${speaking ? 'border-brand shadow-[0_0_15px_rgba(0,196,113,0.2)]' : 'border-gray-700'}`} data-participant-id={participant.participantId} data-media-kind={share ? 'screen' : 'camera'}>
        <button type="button" onClick={() => setFocusedKey(card.key)} className="absolute inset-0 flex h-full w-full items-center justify-center bg-transparent p-0! outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand" aria-label={`${name} 크게 보기`}>
          {media ? <MediaStreamVideo stream={media.stream} muted={media.local} className={`h-full w-full ${share || expanded ? 'object-contain' : 'object-cover'} ${media.local && !share ? '-scale-x-100' : ''}`} /> : <UserAvatar name={participant.userName} imageUrl={member?.profileImage} className="h-20 w-20 border-2 border-gray-600 bg-gray-700!" iconClassName="text-3xl text-gray-300" />}
        </button>
        {media ? <button type="button" onClick={async () => {
          if (share) onFullscreenShare(participant.userId)
          else {
            setFocusedKey(card.key)
            try {
              // 공유 플레이어 위에 전체화면을 겹치면 복귀할 때 이전 전체화면이 남는다.
              if (document.fullscreenElement && document.fullscreenElement !== stageRef.current) await document.exitFullscreen()
              await stageRef.current?.requestFullscreen?.()
            } catch {
              showAuthToast({ message: '브라우저가 전체화면을 허용하지 않아 회의 화면 안에서 확대합니다.', durationMs: 2600 })
            }
          }
        }} aria-label={`${name} 전체화면으로 보기`} className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-lg border border-gray-600 bg-black/70 p-0! text-xs! text-white transition hover:bg-gray-700"><i className="fas fa-expand" aria-hidden="true" /></button> : null}
        <div className="pointer-events-none absolute bottom-2 left-2 z-10 flex max-w-[calc(100%-16px)] items-center gap-2 rounded border border-gray-600 bg-black/70 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-sm">
          <i className={`fas ${share ? 'fa-desktop text-brand' : participant.muted ? 'fa-microphone-slash text-red-500' : 'fa-microphone text-brand'} text-[10px]`} aria-hidden="true" /><span className="truncate">{name}</span>
        </div>
      </div>
    )
  }

  return (
    <div ref={stageRef} className="meeting-participant-stage flex h-full min-h-0 w-full flex-col bg-gray-900" onKeyDown={(event) => { if (event.key === 'Escape') closeFocus() }}>
      {focused ? (
        <>
          <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-3 text-xs text-gray-400"><span>내 화면에서만 크게 보고 있습니다.</span><button type="button" onClick={closeFocus} className="rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-xs! font-bold text-white hover:bg-gray-700"><i className="fas fa-th mr-2" aria-hidden="true" />전체 참가자 보기</button></div>
          <div className="meeting-focused-card min-h-0 flex-1 px-4 pb-4">{renderCard(focused, true)}</div>
        </>
      ) : (
        <div className="flex min-h-0 flex-1 overflow-y-auto p-4 dark-scrollbar">
          <div className="meeting-participant-cards m-auto flex w-full flex-wrap items-center justify-center gap-4" aria-label="회의 참가자 화면">{cards.map((card) => renderCard(card))}</div>
        </div>
      )}
    </div>
  )
}
