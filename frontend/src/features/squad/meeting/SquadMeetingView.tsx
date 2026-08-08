import { type CSSProperties } from 'react'
import AuthModal from '../../../components/AuthModal'
import MeetingAudioSettings from './MeetingAudioSettings'
import SquadWorkspaceAside from '../../../components/SquadWorkspaceAside'
import SquadWorkspaceHeader from '../../../components/SquadWorkspaceHeader'
import UserAvatar from '../../../components/UserAvatar'
import { showAuthToast } from '../../../lib/auth-toast'
import { MediaStreamVideo } from './meeting-media-stream-video'
import { SCREEN_SHARE_BUTTON_ZOOM_STEP,SCREEN_SHARE_MIN_ZOOM,VOICE_REACTIONS,formatMeetingTime,navHref } from './meeting-support'
import type { CameraView,ScreenShareView,VoiceParticipant,WorkspaceMember } from './meeting-types'
import type { SquadMeetingViewModel } from './useSquadMeetingController'
export default function SquadMeetingView(model: SquadMeetingViewModel) {
  const { workspaceId, session, authView, setAuthView, channels, activeChannel, participants, roomPanelTab, setRoomPanelTab, roomSidePanelOpen, setRoomSidePanelOpen, voiceChatMessages, voiceChatInput, setVoiceChatInput, voiceMinutes, minutesDraft, setMinutesDraft, minutesActionItems, selectedMinutesActionItems, minutesSummaryReportOpen, setMinutesSummaryReportOpen, chatSending, chatClearing, minutesSaving, kanbanTaskCreating, speechRecognitionActive, loading, error, joining, setAudioSettingsOpen, remoteAudioMuted, micLevel, networkStatus, voiceConnectionStatus, voiceConnectionError, localCameraStream, remoteCameraStreams, localScreenShareStream, remoteScreenShares, screenSharePlayerOpen, screenSharePlayerUserId, screenShareZoom, screenSharePan, screenShareDragging, floatingReactions, controlBoxRef, minutesTextareaRef, members, projectName, currentParticipant, isJoined, isMuted, micMuted, selectedInputLabel, waitingMembers, networkBadgeClass, networkIconClass, securityStatus, securityBadgeClass, securityIconClass, voiceConnectionLabel, roomParticipants, meetingElapsedLabel, handleLogout, handleAuthenticated, toggleRemoteAudioMuted, toggleCamera, toggleScreenShare, sendRoomReaction, selectChannel, sendVoiceChatMessage, clearVoiceChatMessages, toggleMinutesRecording, saveMinutesDraft, toggleMinutesActionItem, generateMinutesSummary, createKanbanTasksFromMinutes, toggleWaitingMic, handleJoinedNavigation, joinChannel, handleJoinPointerDown, leaveChannel, sendVoiceEvent, resetScreenSharePlayer, openScreenSharePlayer, closeScreenSharePlayer, updateScreenShareZoom, handleScreenShareWheel, handleScreenSharePointerDown, handleScreenSharePointerMove, endScreenShareDrag } = model
  function renderMemberAvatar(member: WorkspaceMember, className = 'w-8 h-8') {
    return (
      <UserAvatar
        key={member.memberId}
        name={member.learnerName ?? '팀원'}
        imageUrl={member.profileImage}
        className={`${className} rounded-full border-2 border-white bg-gray-100 shadow-sm hover:z-10 transition-transform hover:scale-110`}
        iconClassName="text-xs"
      />
    )
  }
  function renderParticipant(participant: VoiceParticipant) {
    const member = members.find((item) => item.learnerId === participant.userId)
    return (
      <div key={participant.participantId} className="flex items-center justify-between p-3 rounded-xl bg-white border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          {member ? (
            renderMemberAvatar(member, 'w-10 h-10')
          ) : (
            <UserAvatar
              name={participant.userName}
              className="w-10 h-10 rounded-full border-2 border-white bg-gray-100 shadow-sm"
              iconClassName="text-xs"
            />
          )}
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-gray-900 truncate">{participant.userName}</p>
            <p className="text-[10px] font-bold text-gray-400">{formatMeetingTime(participant.joinedAt)} 입장</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-8 h-8 rounded-full flex items-center justify-center ${participant.muted ? 'bg-red-50 text-red-500' : 'bg-green-50 text-brand'}`}>
            <i className={`fas ${participant.muted ? 'fa-microphone-slash' : 'fa-microphone'} text-xs`}></i>
          </span>
        </div>
      </div>
    )
  }
  function renderChatPanel() {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-gray-900">
        <div className="border-b border-gray-800 bg-gray-900 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <p
              className="min-w-0 flex-1 truncate whitespace-nowrap text-[10px] font-semibold leading-relaxed text-gray-400"
              title="회의 채팅은 30일 또는 최신 500개까지만 보관됩니다. 기록 지우기는 내 화면에서만 이전 대화를 숨깁니다."
            >
              채팅은 30일·최신 500개 보관, 지우기는 내 화면에만 적용됩니다.
            </p>
            <button
              type="button"
              onClick={() => void clearVoiceChatMessages()}
              disabled={chatClearing || voiceChatMessages.length === 0}
              className="squad-meeting-room-chat-clear-button flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-gray-700 bg-gray-800 text-gray-400 transition hover:border-red-500/60 hover:bg-red-500/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
              title="내 화면의 이전 채팅 지우기"
              aria-label="내 화면의 이전 채팅 지우기"
            >
              <i className="fas fa-trash-alt text-xs"></i>
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 dark-scrollbar">
          {voiceChatMessages.length > 0 ? voiceChatMessages.map((message) => {
            const mine = message.senderId === session?.userId
            return (
              <div key={message.messageId} className={`flex flex-col gap-1.5 ${mine ? 'items-end' : ''}`}>
                <span className={`text-[11px] text-gray-400 font-bold ${mine ? 'mr-1' : 'ml-1'}`}>
                  {mine ? '나' : message.senderName}
                </span>
                <div
                  className={`w-fit max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    mine
                      ? 'rounded-tr-none bg-blue-600 text-white shadow-md'
                      : 'rounded-tl-none border border-gray-700 bg-gray-800 text-gray-200'
                  }`}
                  title={formatMeetingTime(message.createdAt)}
                >
                  <p className="whitespace-pre-line">{message.content}</p>
                </div>
              </div>
            )
          }) : (
            <div className="rounded-2xl border border-dashed border-gray-700 bg-gray-800/50 p-8 text-center">
              <i className="fas fa-comments text-3xl text-gray-600"></i>
              <p className="mt-3 text-sm font-extrabold text-white">아직 회의 채팅이 없습니다.</p>
            </div>
          )}
        </div>
        <div className="p-4 border-t border-gray-800 bg-gray-800 shrink-0">
          <div className="flex gap-2 bg-gray-900 rounded-xl px-3 py-2 border border-gray-700 focus-within:border-blue-500 transition shadow-inner">
            <input
              value={voiceChatInput}
              onChange={(event) => setVoiceChatInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  void sendVoiceChatMessage()
                }
              }}
              className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none text-white placeholder-gray-500"
              placeholder="메시지 입력..."
            />
            <button
              type="button"
              onClick={() => void sendVoiceChatMessage()}
              disabled={chatSending || !voiceChatInput.trim()}
              className="squad-meeting-room-chat-send-button h-[32px]! w-[38px]! min-w-[38px]! rounded-[8px]! bg-blue-500/10 p-0! text-[14px]! leading-[16px]! font-bold text-blue-500 box-border transition hover:bg-blue-500/20 hover:text-blue-400 disabled:opacity-50"
              title="보내기"
            >
              <i className="fas fa-paper-plane"></i>
            </button>
          </div>
        </div>
      </div>
    )
  }

  function getParticipantGridClass(participantCount: number) {
    if (participantCount <= 1) {
      return 'squad-meeting-participant-grid-1 [--participant-grid-width:320px] [--participant-card-height:196px] [--participant-avatar-size:92px] grid-cols-[minmax(0,1fr)] grid-rows-[var(--participant-card-height)]'
    }

    if (participantCount === 2) {
      return 'squad-meeting-participant-grid-2 [--participant-grid-width:592px] grid-cols-[repeat(2,minmax(0,1fr))] grid-rows-[var(--participant-card-height)] [@media(max-width:900px)]:w-[min(100%,288px)] [@media(max-width:900px)]:grid-cols-[minmax(0,1fr)] [@media(max-width:900px)]:grid-rows-none [@media(max-width:900px)]:auto-rows-[var(--participant-card-height)]'
    }

    if (participantCount === 3) {
      return 'squad-meeting-participant-grid-3 [--participant-grid-width:592px] grid-cols-[repeat(4,minmax(0,1fr))] grid-rows-[repeat(2,var(--participant-card-height))] [@media(max-width:900px)]:w-[min(100%,288px)] [@media(max-width:900px)]:grid-cols-[minmax(0,1fr)] [@media(max-width:900px)]:grid-rows-none [@media(max-width:900px)]:auto-rows-[var(--participant-card-height)]'
    }

    if (participantCount === 4) {
      return 'squad-meeting-participant-grid-4 [--participant-grid-width:592px] grid-cols-[repeat(2,minmax(0,1fr))] grid-rows-[repeat(2,var(--participant-card-height))] [@media(max-width:900px)]:w-[min(100%,288px)] [@media(max-width:900px)]:grid-cols-[minmax(0,1fr)] [@media(max-width:900px)]:grid-rows-none [@media(max-width:900px)]:auto-rows-[var(--participant-card-height)]'
    }

    if (participantCount <= 6) {
      return 'squad-meeting-participant-grid-6 [--participant-grid-width:896px] grid-cols-[repeat(3,minmax(0,1fr))] grid-rows-[repeat(2,var(--participant-card-height))] [@media(max-width:900px)]:w-[min(100%,288px)] [@media(max-width:900px)]:grid-cols-[minmax(0,1fr)] [@media(max-width:900px)]:grid-rows-none [@media(max-width:900px)]:auto-rows-[var(--participant-card-height)]'
    }

    return 'squad-meeting-participant-grid-many h-full! w-full! auto-rows-[var(--participant-card-height)] grid-cols-[repeat(auto-fit,minmax(220px,288px))] content-start justify-center overflow-y-auto pr-[4px]!'
  }

  function getParticipantCameraView(participant: VoiceParticipant) {
    if (participant.userId === session?.userId && localCameraStream) {
      return {
        userId: participant.userId,
        userName: participant.userName,
        stream: localCameraStream,
        local: true,
      } satisfies CameraView
    }

    return remoteCameraStreams.get(participant.userId) ?? null
  }

  function renderMeetingGridTile(participant: VoiceParticipant, index: number, participantCount: number) {
    const member = members.find((item) => item.learnerId === participant.userId)
    const speaking = Boolean(participant.speaking && !participant.muted)
    const cameraView = getParticipantCameraView(participant)
    const threeParticipantPlacement = participantCount === 3
      ? [
          'col-[2/span_2] [@media(max-width:900px)]:col-auto [@media(max-width:900px)]:row-auto',
          'col-[1/span_2] row-[2] [@media(max-width:900px)]:col-auto [@media(max-width:900px)]:row-auto',
          'col-[3/span_2] row-[2] [@media(max-width:900px)]:col-auto [@media(max-width:900px)]:row-auto',
        ][index]
      : ''

    return (
      <div
        key={participant.participantId}
        className={`squad-meeting-participant-tile relative isolate flex min-h-[var(--participant-card-height)] items-center justify-center overflow-hidden rounded-[12px] border border-[#374151] bg-[#111827] [box-shadow:0_8px_24px_rgba(0,0,0,0.18)] ${threeParticipantPlacement} ${speaking ? 'is-speaking border-[#00c471] [box-shadow:0_0_0_2px_rgba(0,196,113,0.65),0_0_26px_rgba(0,196,113,0.22)] [&_.squad-meeting-participant-avatar]:border-[#00c471]!' : ''} ${cameraView ? 'has-video bg-[#020617] after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:z-[1] after:h-[44%] after:bg-[linear-gradient(to_top,rgba(0,0,0,0.72),transparent)] after:content-[""]' : ''}`}
      >
        {speaking ? (
          <div className="squad-meeting-participant-pulse absolute aspect-square w-[calc(var(--participant-avatar-size)+28px)] rounded-[9999px] border-[4px] border-[#00c471] opacity-[0.65] [animation:squadMeetingParticipantPulse_1.8s_ease-out_infinite]" aria-hidden="true"></div>
        ) : null}
        {cameraView ? (
          <MediaStreamVideo
            stream={cameraView.stream}
            muted={cameraView.local}
            className={`squad-meeting-participant-video absolute inset-0 z-0 h-full w-full bg-[#020617] object-cover ${cameraView.local ? 'is-local -scale-x-100' : ''}`}
          />
        ) : (
          <UserAvatar
            name={member?.learnerName ?? participant.userName}
            imageUrl={member?.profileImage}
            className="squad-meeting-participant-avatar relative z-[1] h-[var(--participant-avatar-size)]! w-[var(--participant-avatar-size)]! rounded-full border-4 border-gray-600 bg-gray-700 shadow-2xl"
            iconClassName="squad-meeting-participant-avatar-icon text-[calc(var(--participant-avatar-size)*0.42)]! leading-none! text-gray-300"
          />
        )}
        <div className="squad-meeting-participant-label absolute bottom-[8px] left-[8px] z-[2] inline-flex min-h-[26px] max-w-[calc(100%-16px)] items-center rounded-[6px] border border-[#4b5563] bg-[rgba(0,0,0,0.7)] px-[10px] py-[4px] [box-shadow:0_8px_20px_rgba(0,0,0,0.2)] backdrop-blur-[6px]">
          <p className="truncate text-xs font-bold text-white">
            {participant.userName}
          </p>
        </div>
      </div>
    )
  }

  function renderScreenShareView(screenShare: ScreenShareView) {
    return (
      <div className="squad-meeting-screen-share-view relative flex h-full w-full min-h-0 select-none items-center justify-center overflow-hidden rounded-[12px] bg-[#020617]">
        <MediaStreamVideo
          stream={screenShare.stream}
          muted={screenShare.local}
          className="squad-meeting-screen-share-video h-full w-full bg-[#020617] object-contain"
        />
        <button
          type="button"
          onClick={() => openScreenSharePlayer(screenShare.userId)}
          className="squad-meeting-screen-share-fullscreen-button absolute top-[12px] right-[12px] z-[3] inline-flex h-[36px] w-[36px] items-center justify-center rounded-[8px] border border-[#4b5563] bg-[rgba(0,0,0,0.72)] text-[14px] leading-none text-white [box-shadow:0_8px_20px_rgba(0,0,0,0.24)] backdrop-blur-[6px] transition-[background-color,border-color,transform] duration-160 ease-[ease] hover:-translate-y-[1px] hover:border-[#00c471] hover:bg-[rgba(17,24,39,0.9)]"
          title="전체화면으로 보기"
          aria-label={`${screenShare.local ? '내' : screenShare.userName} 화면 공유 전체화면으로 보기`}
        >
          <i className="fas fa-expand"></i>
        </button>
        <div className="squad-meeting-screen-share-label absolute bottom-[12px] left-[12px] z-[2] inline-flex min-h-[30px] max-w-[calc(100%-24px)] items-center gap-[8px] rounded-[8px] border border-[#4b5563] bg-[rgba(0,0,0,0.72)] px-[12px] py-[5px] text-[12px] leading-[16px] font-extrabold text-white [box-shadow:0_8px_20px_rgba(0,0,0,0.24)] backdrop-blur-[6px]">
          <i className="fas fa-desktop text-[12px] leading-[16px] text-[#00c471]"></i>
          <span>{screenShare.local ? '내 화면 공유 중' : `${screenShare.userName} 화면 공유 중`}</span>
        </div>
      </div>
    )
  }

  function renderScreenSharePlayer(screenShare: ScreenShareView) {
    const zoomLabel = `${Math.round(screenShareZoom * 100)}%`
    const videoStyle: CSSProperties = {
      transform: `translate3d(${screenSharePan.x}px, ${screenSharePan.y}px, 0) scale(${screenShareZoom})`,
    }
    const canvasClassName = [
      'squad-meeting-screen-share-player-canvas flex min-h-0 flex-1 touch-none select-none items-center justify-center overflow-hidden',
      screenShareZoom > SCREEN_SHARE_MIN_ZOOM ? 'is-zoomed cursor-grab' : '',
      screenShareDragging ? 'is-dragging cursor-grabbing [&_.squad-meeting-screen-share-player-video]:transition-none' : '',
    ]
      .filter(Boolean)
      .join(' ')

    return (
      <div className="squad-meeting-screen-share-player fixed inset-0 z-[9999] flex flex-col overflow-hidden bg-[#020617] text-white" role="dialog" aria-modal="true">
        <div className="squad-meeting-screen-share-player-toolbar pointer-events-none absolute top-[16px] right-[16px] left-[16px] z-[2] flex min-h-[44px] items-center justify-between gap-[16px]">
          <div className="squad-meeting-screen-share-player-title pointer-events-auto inline-flex min-h-[38px] min-w-0 max-w-[min(50vw,420px)] items-center gap-[9px] rounded-[10px] border border-[rgba(75,85,99,0.88)] bg-[rgba(17,24,39,0.82)] px-[14px] text-[12px] font-extrabold text-[#e5e7eb] [box-shadow:0_14px_32px_rgba(0,0,0,0.3)] backdrop-blur-[10px]">
            <i className="fas fa-desktop text-[#00c471]"></i>
            <span className="min-w-0 truncate whitespace-nowrap">{screenShare.local ? '내 화면 공유' : `${screenShare.userName} 화면 공유`}</span>
          </div>

          <div className="squad-meeting-screen-share-player-controls pointer-events-auto inline-flex h-[40px] items-center gap-[4px] rounded-[12px] border border-[rgba(75,85,99,0.88)] bg-[rgba(17,24,39,0.82)] p-[4px] [box-shadow:0_14px_32px_rgba(0,0,0,0.3)] backdrop-blur-[10px]">
            <button
              type="button"
              onClick={() => updateScreenShareZoom(screenShareZoom - SCREEN_SHARE_BUTTON_ZOOM_STEP)}
              className="squad-meeting-screen-share-player-button inline-flex h-[32px] w-[32px] items-center justify-center rounded-[8px] border-0 bg-transparent text-[12px] leading-none font-extrabold text-[#e5e7eb] transition-[background-color,color] duration-160 ease-[ease] hover:bg-[rgba(75,85,99,0.85)] hover:text-white"
              title="축소"
              aria-label="화면 공유 축소"
            >
              <i className="fas fa-minus"></i>
            </button>
            <button
              type="button"
              onClick={resetScreenSharePlayer}
              className="squad-meeting-screen-share-player-zoom-button inline-flex h-[32px] w-[58px] items-center justify-center rounded-[8px] border-0 bg-transparent text-[12px] leading-none font-extrabold text-[#e5e7eb] tabular-nums transition-[background-color,color] duration-160 ease-[ease] hover:bg-[rgba(75,85,99,0.85)] hover:text-white"
              title="확대 초기화"
            >
              {zoomLabel}
            </button>
            <button
              type="button"
              onClick={() => updateScreenShareZoom(screenShareZoom + SCREEN_SHARE_BUTTON_ZOOM_STEP)}
              className="squad-meeting-screen-share-player-button inline-flex h-[32px] w-[32px] items-center justify-center rounded-[8px] border-0 bg-transparent text-[12px] leading-none font-extrabold text-[#e5e7eb] transition-[background-color,color] duration-160 ease-[ease] hover:bg-[rgba(75,85,99,0.85)] hover:text-white"
              title="확대"
              aria-label="화면 공유 확대"
            >
              <i className="fas fa-plus"></i>
            </button>
            <button
              type="button"
              onClick={closeScreenSharePlayer}
              className="squad-meeting-screen-share-player-button inline-flex h-[32px] w-[32px] items-center justify-center rounded-[8px] border-0 bg-transparent text-[12px] leading-none font-extrabold text-[#e5e7eb] transition-[background-color,color] duration-160 ease-[ease] hover:bg-[rgba(75,85,99,0.85)] hover:text-white"
              title="닫기"
              aria-label="화면 공유 전체화면 닫기"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>

        <div
          className={canvasClassName}
          onWheel={handleScreenShareWheel}
          onPointerDown={handleScreenSharePointerDown}
          onPointerMove={handleScreenSharePointerMove}
          onPointerUp={endScreenShareDrag}
          onPointerCancel={endScreenShareDrag}
        >
          <MediaStreamVideo
            stream={screenShare.stream}
            muted={screenShare.local}
            className="squad-meeting-screen-share-player-video h-full max-h-full w-full max-w-full origin-center bg-[#020617] object-contain transition-[transform] duration-[90ms] ease-out will-change-transform"
            style={videoStyle}
          />
        </div>
      </div>
    )
  }

  function renderRoomPanel() {
    const summary = voiceMinutes?.summary?.trim() ?? ''
    const summarySourceAvailable = Boolean(minutesDraft.trim() || voiceChatMessages.length > 0)
    const selectedActionItemCount = minutesActionItems.filter((_, index) =>
      selectedMinutesActionItems.includes(index),
    ).length

    return (
      <aside className={`${roomSidePanelOpen ? 'flex' : 'hidden'} w-96 bg-gray-800 border-l border-gray-700 flex-col shrink-0 transition-all duration-300 z-20`}>
        <div className="flex border-b border-gray-700 bg-gray-800 shrink-0">
          <button
            type="button"
            onClick={() => setRoomPanelTab('minutes')}
            className={`squad-meeting-room-tab-button flex h-[44px]! min-h-[44px]! flex-1 items-center justify-center gap-2 border-b-2 p-0! text-[12px]! leading-[16px]! font-bold box-border transition [&_i]:text-[14px]! [&_i]:leading-[16px]! ${roomPanelTab === 'minutes' ? 'text-brand border-brand bg-gray-800' : 'text-gray-400 hover:text-gray-200 border-transparent'}`}
          >
            <i className="fas fa-robot text-sm"></i> AI 회의록
          </button>
          <button
            type="button"
            onClick={() => setRoomPanelTab('chat')}
            className={`squad-meeting-room-tab-button flex h-[44px]! min-h-[44px]! flex-1 items-center justify-center gap-2 border-b-2 p-0! text-[12px]! leading-[16px]! font-bold box-border transition [&_i]:text-[14px]! [&_i]:leading-[16px]! ${roomPanelTab === 'chat' ? 'text-brand border-brand bg-gray-800' : 'text-gray-400 hover:text-gray-200 border-transparent'}`}
          >
            <i className="fas fa-comments text-sm"></i> 팀 채팅방
          </button>
        </div>

        {roomPanelTab === 'minutes' ? (
          <div className="flex-1 flex flex-col overflow-hidden bg-gray-900 relative">
            <div className="p-3 border-b border-gray-800 bg-gray-800 flex justify-between items-center shrink-0 shadow-sm">
              <div className="flex items-center gap-2">
                {voiceMinutes?.recording ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-red-500 pulse-record"></span>
                    <span className="text-xs font-bold text-red-400 tracking-wide">
                      {speechRecognitionActive ? '내 마이크 기록 중...' : '직접 입력 중...'}
                    </span>
                  </>
                ) : (
                  <span className="text-xs font-bold text-gray-400 tracking-wide">기록 대기 중...</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => void toggleMinutesRecording()}
                disabled={minutesSaving}
                className={`squad-meeting-room-record-button flex h-[28px]! items-center gap-1.5 whitespace-nowrap rounded-[6px]! px-[12px]! py-0! text-[10px]! leading-[12px]! font-bold text-white box-border transition disabled:opacity-60 ${voiceMinutes?.recording ? 'bg-gray-600 hover:bg-gray-500' : 'bg-red-500 hover:bg-red-600'}`}
              >
                <div className={`${voiceMinutes?.recording ? 'w-2 h-2 rounded-sm' : 'w-1.5 h-1.5 rounded-full'} bg-white`}></div>
                {voiceMinutes?.recording ? '기록 중지' : '기록 시작'}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto dark-scrollbar p-5 space-y-5">
              {minutesDraft.trim() ? (
                <textarea
                  ref={minutesTextareaRef}
                  value={minutesDraft}
                  onChange={(event) => setMinutesDraft(event.target.value)}
                  onBlur={() => {
                    if (!voiceMinutes?.recording) {
                      void saveMinutesDraft(false)
                    }
                  }}
                  readOnly={voiceMinutes?.recording}
                  className={`w-full min-h-[260px] resize-none rounded-xl border border-gray-700 bg-gray-800 p-4 text-sm leading-relaxed text-gray-300 outline-none focus:border-brand ${voiceMinutes?.recording ? 'cursor-default' : ''}`}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 opacity-70">
                  <i className="fas fa-microphone-alt text-4xl mb-3"></i>
                  <p className="text-xs font-bold">[기록 시작] 버튼을 누르면 내 마이크 음성을 회의록에 적습니다.</p>
                </div>
              )}
            </div>

            {summary ? (
              <div className="mx-4 mb-4 rounded-xl border border-gray-700 bg-gray-800 p-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-extrabold text-brand">
                  <i className="fas fa-magic"></i> AI 회의 요약
                </div>
                <p className="whitespace-pre-line text-sm leading-relaxed text-gray-300">{summary}</p>
                <button
                  type="button"
                  onClick={() => setMinutesSummaryReportOpen(true)}
                  className="squad-meeting-room-report-button mt-3 h-[34px]! w-full rounded-[8px]! bg-gray-700 px-[12px]! py-0! text-[12px]! leading-[16px]! font-bold text-white box-border transition hover:bg-gray-600"
                >
                  요약 리포트 열기
                </button>
              </div>
            ) : null}

            <div className="p-4 border-t border-gray-800 bg-gray-800 shrink-0">
              <button
                type="button"
                onClick={() => void generateMinutesSummary()}
                disabled={minutesSaving || !summarySourceAvailable}
                className={`squad-meeting-room-summary-button flex h-[46px]! w-full items-center justify-center gap-2 rounded-[12px]! px-[14px]! py-0! text-[14px]! leading-[20px]! font-extrabold box-border transition disabled:opacity-70 ${
                  summarySourceAvailable
                    ? 'bg-gray-700 hover:bg-gray-600 text-white'
                    : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                }`}
              >
                {minutesSaving ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i> AI 분석 및 요약 중...
                  </>
                ) : (
                  <>
                    <i className="fas fa-magic"></i> AI 회의 핵심 요약 생성
                  </>
                )}
              </button>
            </div>

            {minutesSummaryReportOpen ? (
              <div className="absolute inset-0 z-10 flex flex-col border-t border-gray-700 bg-gray-800/95 p-6 backdrop-blur-md">
                <div className="mb-5 flex items-center justify-between border-b border-gray-700 pb-3">
                  <h3 className="flex items-center gap-2 text-base font-extrabold text-white">
                    <i className="fas fa-robot text-lg text-brand"></i> AI 자동 요약 리포트
                  </h3>
                  <button
                    type="button"
                    onClick={() => setMinutesSummaryReportOpen(false)}
                    className="squad-meeting-room-report-close-button flex h-[32px]! min-h-[32px]! w-[32px]! min-w-[32px]! items-center justify-center rounded-[9999px]! bg-gray-700 p-0! text-[14px]! leading-[16px]! text-gray-400 box-border transition hover:text-white"
                    aria-label="요약 리포트 닫기"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>

                <div className="dark-scrollbar flex-1 space-y-6 overflow-y-auto pr-2">
                  <div>
                    <h4 className="mb-2 border-l-4 border-blue-500 pl-2 text-sm font-bold text-gray-400">
                      <i className="fas fa-thumbtack mr-2 text-blue-400"></i>핵심 요약
                    </h4>
                    <div className="rounded-xl border border-gray-700 bg-gray-900 p-4 text-sm leading-relaxed text-gray-200">
                      {summary ? (
                        <p className="whitespace-pre-line">{summary}</p>
                      ) : (
                        <p className="text-gray-500">아직 생성된 요약이 없습니다.</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="mb-2 border-l-4 border-brand pl-2 text-sm font-bold text-gray-400">
                      <i className="fas fa-tasks mr-2 text-brand"></i>자동 추출 To-Do List
                    </h4>
                    <div className="space-y-3 rounded-xl border border-gray-700 bg-gray-900 p-4">
                      {minutesActionItems.length > 0 ? (
                        minutesActionItems.map((item, index) => {
                          const checked = selectedMinutesActionItems.includes(index)
                          const meta = [item.assigneeName ? `담당 ${item.assigneeName}` : null, item.dueDate ? `마감 ${item.dueDate}` : null]
                            .filter(Boolean)
                            .join(' · ')

                          return (
                            <label
                              key={`${item.title}-${index}`}
                              className="flex cursor-pointer items-start gap-3 text-sm text-gray-300 transition hover:text-white"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleMinutesActionItem(index)}
                                className="mt-1 h-4 w-4 rounded border-gray-600 bg-gray-700 accent-brand"
                              />
                              <span className="min-w-0">
                                <span className="block leading-relaxed">{item.title}</span>
                                {meta ? (
                                  <span className="mt-1 block text-xs text-gray-500">{meta}</span>
                                ) : null}
                              </span>
                            </label>
                          )
                        })
                      ) : (
                        <p className="text-sm text-gray-500">칸반에 등록할 만한 할 일이 아직 없습니다.</p>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => void createKanbanTasksFromMinutes()}
                  disabled={kanbanTaskCreating || selectedActionItemCount === 0}
                  className="squad-meeting-room-kanban-create-button mt-4 flex h-[46px]! w-full items-center justify-center gap-2 rounded-[12px]! bg-gray-700 px-[14px]! py-0! text-[14px]! leading-[20px]! font-bold text-white box-border shadow-lg transition hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {kanbanTaskCreating ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i> 칸반 보드에 등록 중...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-tasks"></i> 칸반 보드에 일괄 등록
                    </>
                  )}
                </button>
              </div>
            ) : null}
          </div>
        ) : renderChatPanel()}
      </aside>
    )
  }

  function renderVoiceRoom() {
    const gridParticipants = roomParticipants.length > 0 ? roomParticipants : currentParticipant ? [currentParticipant] : []
    const participantGridClass = getParticipantGridClass(gridParticipants.length)
    const activeScreenShares = [
      ...(localScreenShareStream && session?.userId
        ? [{
          userId: session.userId,
          userName: session.name,
          stream: localScreenShareStream,
          local: true,
        } satisfies ScreenShareView]
        : []),
      ...remoteScreenShares.values(),
    ]
    const selectedScreenShare = activeScreenShares.find((screenShare) => screenShare.userId === screenSharePlayerUserId) ?? null
    const screenShareGridClass = activeScreenShares.length === 1
      ? 'grid-cols-1'
      : activeScreenShares.length === 2
        ? 'grid-cols-1 lg:grid-cols-2'
        : 'grid-cols-1 md:grid-cols-2'
    const recordDotClass = voiceMinutes?.recording ? 'bg-red-500 pulse-record' : 'bg-gray-500'

    return (
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-gray-900 text-white relative">
        <header className="h-16 bg-gray-800 border-b border-gray-700 flex items-center px-6 shrink-0 relative z-30 shadow-md justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${recordDotClass}`} title="AI 회의록 상태"></div>
            <h1 className="min-w-0 truncate text-base font-extrabold text-white flex items-center gap-2">
              {activeChannel?.name ?? `${projectName} 음성 회의`}
              <span className="font-mono text-gray-400 font-normal ml-2">{meetingElapsedLabel}</span>
            </h1>
            <button
              type="button"
              onClick={() => showAuthToast({ message: securityStatus.detail, durationMs: 2600 })}
              className="squad-meeting-room-security-button flex h-[24px]! cursor-pointer items-center gap-1 whitespace-nowrap rounded-[4px]! border border-gray-600 bg-gray-700 px-[8px]! py-0! text-[12px]! leading-[16px]! font-bold text-gray-300 box-border transition hover:bg-gray-600 [&_i]:text-[12px]! [&_i]:leading-[16px]!"
              title={securityStatus.detail}
            >
              <i className={`${securityIconClass} text-green-400`}></i> 보안 연결됨
            </button>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => showAuthToast({ message: networkStatus.detail, durationMs: 2400 })}
              className="squad-meeting-room-network-button mr-[16px]! flex h-[34px]! cursor-pointer items-center gap-2 whitespace-nowrap border-r border-gray-600 pt-0! pr-[16px]! pb-0! pl-0! text-[12px]! leading-[16px]! box-border [&_i]:text-[14px]! [&_i]:leading-[16px]!"
              title={networkStatus.detail}
            >
              <i className={`${networkIconClass} text-sm ${networkStatus.tone === 'good' ? 'text-green-400' : networkStatus.tone === 'fair' ? 'text-yellow-400' : networkStatus.tone === 'poor' ? 'text-orange-400' : networkStatus.tone === 'offline' ? 'text-red-400' : 'text-gray-400'}`}></i>
              <span className="text-xs text-gray-400 font-bold hidden md:inline">{networkStatus.label}</span>
            </button>
            <button
              type="button"
              onClick={() => setRoomSidePanelOpen((current) => !current)}
              className="squad-meeting-room-panel-toggle flex h-[36px]! w-[36px]! flex-[0_0_36px] items-center justify-center rounded-[8px]! border border-gray-600 bg-gray-700 p-0! box-border transition hover:bg-gray-600 [&_i]:text-[14px]! [&_i]:leading-[16px]!"
              title="패널 열기/닫기"
            >
              <i className="fas fa-list-ul"></i>
            </button>
          </div>
        </header>

        <main className="flex-1 flex overflow-hidden relative">
          <section className="squad-meeting-room-stage-shell group/room-stage relative flex min-w-0 flex-1 flex-col overflow-hidden p-4 pb-[112px]!">
            <div className="squad-meeting-participant-stage flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-2xl border border-gray-700 bg-gray-800 p-4 box-border shadow-inner">
              {activeScreenShares.length > 0 ? (
                <div className={`grid h-full min-h-0 w-full gap-3 ${screenShareGridClass}`}>
                  {activeScreenShares.map((screenShare) => (
                    <div key={screenShare.userId} className="min-h-0 min-w-0 overflow-hidden rounded-[12px]">
                      {renderScreenShareView(screenShare)}
                    </div>
                  ))}
                </div>
              ) : gridParticipants.length > 0 ? (
                <div className={`squad-meeting-participant-grid m-auto grid h-auto max-h-full w-[min(100%,var(--participant-grid-width,288px))] [--participant-card-width:288px] [--participant-card-height:176px] [--participant-avatar-size:80px] place-content-center gap-[16px] overflow-y-auto p-[2px] ${participantGridClass}`}>
                  {gridParticipants.map((participant, index) => renderMeetingGridTile(participant, index, gridParticipants.length))}
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-center text-gray-500">
                  <i className="fas fa-headset text-5xl text-gray-600"></i>
                  <p className="mt-4 text-sm font-extrabold text-gray-300">아직 입장한 팀원이 없습니다.</p>
                  <p className="mt-1 text-xs font-bold text-gray-500">음성 회의에 입장하면 참가자 타일이 여기에 표시됩니다.</p>
                </div>
              )}
            </div>

            <div className="squad-meeting-room-bottom-bar invisible pointer-events-none absolute right-[16px] bottom-[16px] left-[16px] z-40 flex h-20 items-center justify-between rounded-2xl border border-gray-700 bg-gray-800 px-6 opacity-0 [transform:translateY(18px)] shadow-xl [transition:opacity_180ms_ease,transform_180ms_ease,visibility_0s_linear_180ms] group-hover/room-stage:visible group-hover/room-stage:pointer-events-auto group-hover/room-stage:opacity-100 group-hover/room-stage:[transform:translateY(0)] group-hover/room-stage:delay-0 group-focus-within/room-stage:visible group-focus-within/room-stage:pointer-events-auto group-focus-within/room-stage:opacity-100 group-focus-within/room-stage:[transform:translateY(0)] group-focus-within/room-stage:delay-0 [@media(hover:none)]:visible [@media(hover:none)]:pointer-events-auto [@media(hover:none)]:opacity-100 [@media(hover:none)]:[transform:translateY(0)] [@media(hover:none)]:delay-0">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => showAuthToast({ message: `현재 ${gridParticipants.length}명이 참여 중입니다.`, durationMs: 1600 })}
                  className="squad-meeting-room-count-button flex h-[34px]! cursor-pointer items-center gap-2 whitespace-nowrap rounded-[8px]! border border-gray-600 bg-gray-700 px-[12px]! py-0! text-[12px]! leading-[16px]! font-bold text-gray-400 box-border transition hover:bg-gray-600 [&_i]:text-[12px]! [&_i]:leading-[16px]!"
                >
                  <i className="fas fa-users text-brand"></i> 참가자 {gridParticipants.length}
                </button>
              </div>

              <div ref={controlBoxRef} className="flex items-center gap-4 relative">
                <button
                  type="button"
                  onClick={() => void sendVoiceEvent(isMuted ? 'UNMUTE' : 'MUTE', isMuted ? '마이크 음소거 해제' : '마이크 음소거')}
                  className={`squad-meeting-room-control-button flex h-[56px]! min-h-[56px]! w-[56px]! min-w-[56px]! flex-[0_0_56px] items-center justify-center rounded-[9999px]! border p-0! text-white box-border shadow-sm transition [&_i]:text-[20px]! [&_i]:leading-[20px]! ${isMuted ? 'bg-red-600 hover:bg-red-700 border-red-500' : 'bg-gray-700 hover:bg-gray-600 border-gray-600'}`}
                  title={isMuted ? '마이크 켜기' : '마이크 끄기'}
                >
                  <i className={`fas ${isMuted ? 'fa-microphone-slash' : 'fa-microphone'} text-xl`}></i>
                </button>

                <button
                  type="button"
                  onClick={toggleRemoteAudioMuted}
                  aria-pressed={remoteAudioMuted}
                  className={`squad-meeting-room-control-button flex h-[56px]! min-h-[56px]! w-[56px]! min-w-[56px]! flex-[0_0_56px] items-center justify-center rounded-[9999px]! border p-0! text-white box-border shadow-sm transition [&_i]:text-[20px]! [&_i]:leading-[20px]! ${
                    remoteAudioMuted
                      ? 'bg-amber-600 hover:bg-amber-700 border-amber-500'
                      : 'bg-gray-700 hover:bg-gray-600 border-gray-600'
                  }`}
                  title={remoteAudioMuted ? '듣기 켜기' : '듣기 끄기'}
                >
                  <i className={`fas ${remoteAudioMuted ? 'fa-volume-mute' : 'fa-headphones'} text-xl`}></i>
                </button>

                <button
                  type="button"
                  onClick={() => void toggleCamera()}
                  className={`squad-meeting-room-control-button flex h-[56px]! min-h-[56px]! w-[56px]! min-w-[56px]! flex-[0_0_56px] items-center justify-center rounded-[9999px]! border p-0! text-white box-border shadow-sm transition [&_i]:text-[20px]! [&_i]:leading-[20px]! ${
                    localCameraStream
                      ? 'bg-green-600 hover:bg-green-700 border-green-500'
                      : 'bg-gray-700 hover:bg-gray-600 border-gray-600'
                  }`}
                  title={localCameraStream ? '카메라 끄기' : '카메라 켜기'}
                >
                  <i className={`fas ${localCameraStream ? 'fa-video' : 'fa-video-slash'} text-xl`}></i>
                </button>

                <div className="w-px h-8 bg-gray-600 mx-2"></div>

                <button
                  type="button"
                  onClick={() => void toggleScreenShare()}
                  className={`squad-meeting-room-control-button flex h-[56px]! min-h-[56px]! w-[56px]! min-w-[56px]! flex-[0_0_56px] items-center justify-center rounded-[9999px]! border p-0! text-white box-border shadow-sm transition [&_i]:text-[20px]! [&_i]:leading-[20px]! ${
                    localScreenShareStream
                      ? 'bg-blue-600 hover:bg-blue-700 border-blue-500'
                      : 'bg-gray-700 hover:bg-blue-600 hover:border-blue-500 border-gray-600'
                  }`}
                  title={localScreenShareStream ? '화면 공유 중지' : '화면 공유'}
                >
                  <i className="fas fa-desktop text-xl"></i>
                </button>

                <div className="relative group">
                  <button
                    type="button"
                    className="squad-meeting-room-control-button flex h-[56px]! min-h-[56px]! w-[56px]! min-w-[56px]! flex-[0_0_56px] items-center justify-center rounded-[9999px]! border border-gray-600 bg-gray-700 p-0! text-white box-border shadow-sm transition hover:border-yellow-500 hover:bg-yellow-600 [&_i]:text-[20px]! [&_i]:leading-[20px]!"
                    title="리액션 보내기"
                  >
                    <i className="fas fa-smile text-xl"></i>
                  </button>
                  <div className="squad-meeting-reaction-menu invisible absolute bottom-[64px]! left-1/2 z-50 flex -translate-x-1/2 transform gap-[8px]! rounded-[16px]! border border-gray-700 bg-gray-800 p-[10px]! opacity-0 box-border shadow-2xl transition-all group-hover:visible group-hover:opacity-100">
                    {VOICE_REACTIONS.map((reaction) => (
                      <button
                        key={reaction}
                        type="button"
                        onClick={() => sendRoomReaction(reaction)}
                        className="squad-meeting-room-reaction-button h-[48px]! min-h-[48px]! w-[48px]! min-w-[48px]! flex-[0_0_48px] rounded-[12px]! bg-gray-700 p-0! text-[24px]! leading-[24px]! box-border shadow-inner transition hover:scale-110 hover:bg-gray-600"
                      >
                        {reaction}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="w-px h-8 bg-gray-600 mx-2"></div>

                <button
                  type="button"
                  onClick={() => void leaveChannel()}
                  disabled={joining}
                  className="squad-meeting-room-end-button flex h-[48px]! w-auto min-w-[80px]! items-center justify-center gap-2 whitespace-nowrap rounded-[16px]! bg-red-600 px-[20px]! py-0! text-[14px]! leading-[20px]! font-bold text-white box-border shadow-[0_4px_15px_rgba(239,68,68,0.4)] transition hover:-translate-y-0.5 hover:bg-red-700 disabled:opacity-60 [&_i]:text-[14px]! [&_i]:leading-[20px]!"
                >
                  <i className="fas fa-phone-slash"></i>
                  종료
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAudioSettingsOpen(true)}
                  className="squad-meeting-room-settings-button flex h-[48px]! min-h-[48px]! w-[48px]! min-w-[48px]! flex-[0_0_48px] items-center justify-center rounded-[12px]! border border-gray-600 bg-gray-700 p-0! text-gray-300 box-border transition hover:bg-gray-600 [&_i]:text-[16px]! [&_i]:leading-[16px]!"
                  title="상세 설정"
                >
                  <i className="fas fa-cog"></i>
                </button>
              </div>
            </div>
          </section>

          {renderRoomPanel()}
        </main>
        {selectedScreenShare && screenSharePlayerOpen ? renderScreenSharePlayer(selectedScreenShare) : null}
        <div className="squad-meeting-reaction-container pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden="true">
          {floatingReactions.map((reaction) => (
            <div
              key={reaction.id}
              className="squad-meeting-floating-reaction pointer-events-none absolute bottom-[80px] z-50 text-[40px] leading-none [animation:squadMeetingFloatUp_2.5s_ease-out_forwards] [filter:drop-shadow(0_4px_6px_rgba(0,0,0,0.3))]"
              style={{
                left: `${reaction.left}px`,
                '--dx': `${reaction.dx}px`,
              } as CSSProperties}
              title={reaction.fromUserName ? `${reaction.fromUserName} ${reaction.reaction}` : reaction.reaction}
            >
              {reaction.reaction}
            </div>
          ))}
        </div>
      </div>
    )
  }

  function renderAuthModal() {
    return authView ? (
      <AuthModal
        view={authView}
        onClose={() => setAuthView(null)}
        onViewChange={setAuthView}
        onAuthenticated={handleAuthenticated}
      />
    ) : null
  }

  if (loading) {
    return (
      <div className="squad-dashboard-page flex h-screen items-center justify-center overflow-hidden bg-[#F8F9FA]! font-['Pretendard',sans-serif] text-gray-800">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-green-100 border-t-brand"></div>
        {renderAuthModal()}
      </div>
    )
  }

  if (error) {
    return (
      <div className="squad-dashboard-page flex h-screen items-center justify-center overflow-hidden bg-[#F8F9FA]! font-['Pretendard',sans-serif] text-gray-800">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <i className="fas fa-circle-exclamation text-3xl text-red-400 mb-3"></i>
          <p className="font-extrabold text-gray-900">{error}</p>
          <a href="/workspace-hub" className="inline-flex mt-5 px-5 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold">
            워크스페이스로 돌아가기
          </a>
        </div>
        {renderAuthModal()}
      </div>
    )
  }

  return (
    <div className="squad-dashboard-page squad-meeting-page flex h-screen overflow-hidden bg-[#F8F9FA]! font-['Pretendard',sans-serif] text-gray-800">
      <SquadWorkspaceAside
        activePage="meeting"
        workspaceId={workspaceId}
        projectName={projectName}
        onNavigate={(event, href) => {
          if (href === navHref('/squad-meeting', workspaceId) && isJoined) {
            event.preventDefault()
            return
          }

          handleJoinedNavigation(event, href)
        }}
      />

      {isJoined ? renderVoiceRoom() : (
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-[#F9FAFB]">
        <SquadWorkspaceHeader
          workspaceId={workspaceId}
          projectName={projectName}
          members={members}
          statusLabel="진행 중"
          currentUserName={session?.name}
          onLogout={handleLogout}
        />

        <main className="flex-1 overflow-y-auto custom-scrollbar bg-[#F3F4F6]">
          <div className="px-8 py-4 bg-white border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
                <i className="fas fa-headset text-brand"></i> 음성 회의
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">카메라, 마이크와 화면 공유를 함께 사용하는 스쿼드 회의 공간입니다.</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => showAuthToast({ message: securityStatus.detail, durationMs: 2600 })}
                className={`squad-meeting-status-badge inline-flex h-[34px]! items-center gap-2 rounded-full border px-[16px]! py-0! text-[12px]! leading-[16px]! font-extrabold box-border transition [&_i]:text-[12px]! [&_i]:leading-[16px]! ${securityBadgeClass}`}
                title={securityStatus.detail}
              >
                <i className={securityIconClass}></i> {securityStatus.label}
              </button>
              <span
                className={`squad-meeting-status-badge inline-flex h-[34px]! items-center gap-2 rounded-full border px-[16px]! py-0! text-[12px]! leading-[16px]! font-extrabold box-border [&_i]:text-[12px]! [&_i]:leading-[16px]! ${networkBadgeClass}`}
                title={networkStatus.detail}
              >
                <i className={networkIconClass}></i> {networkStatus.label}
              </span>
            </div>
          </div>

          <div className="px-8 pt-5 pb-8">
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 max-w-6xl mx-auto">
              <section className="xl:col-span-7 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-8 text-center border-b border-gray-100 bg-gradient-to-b from-white to-gray-50">
                  <div className="relative mx-auto mb-6 w-36 h-36">
                    <div className={`absolute inset-0 rounded-full ${micMuted ? 'bg-gray-100' : 'bg-brand/15 animate-ping'}`}></div>
                    <div className="absolute inset-3 rounded-full bg-white shadow-xl border border-gray-100 flex items-center justify-center">
                      <div className={`w-20 h-20 rounded-full flex items-center justify-center ${micMuted ? 'bg-red-50 text-red-500' : 'bg-green-50 text-brand'}`}>
                        <i className={`fas ${micMuted ? 'fa-microphone-slash' : 'fa-microphone'} text-4xl`}></i>
                      </div>
                    </div>
                  </div>

                  <h2 className="text-xl font-extrabold text-gray-900 mb-2">
                    {isJoined ? '음성 회의에 연결되어 있습니다.' : '음성 회의 대기실입니다.'}
                  </h2>
                  <p className="text-sm font-medium text-gray-500">
                    {isJoined
                      ? `${selectedInputLabel} 사용 중`
                      : micMuted
                        ? '마이크를 끈 상태로 입장할 수 있습니다.'
                        : '입장 전에 마이크와 스피커 설정을 확인해 주세요.'}
                  </p>
                  <p className={`text-xs font-extrabold mt-2 ${voiceConnectionStatus === 'error' ? 'text-red-500' : 'text-gray-400'}`}>
                    {voiceConnectionError ?? voiceConnectionLabel}
                  </p>
                </div>

                <div className="p-6">
                  <div className="mb-6 rounded-2xl bg-gray-50 border border-gray-100 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-extrabold text-gray-500">마이크 입력</span>
                      <span className="text-xs font-bold text-gray-400">{micMuted ? '음소거' : '감지 중'}</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${micMuted ? 'bg-gray-300' : 'bg-brand'}`}
                        style={{ width: `${micMuted ? 8 : micLevel}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => (
                        isJoined
                          ? void sendVoiceEvent(isMuted ? 'UNMUTE' : 'MUTE', isMuted ? '마이크 음소거 해제' : '마이크 음소거')
                          : toggleWaitingMic()
                      )}
                      className={`squad-meeting-lobby-action-button flex h-[48px]! min-h-[48px]! items-center justify-center gap-2 whitespace-nowrap rounded-[12px]! border px-[16px]! py-0! text-[14px]! leading-[20px]! font-extrabold box-border transition [&_i]:text-[14px]! [&_i]:leading-[20px]! ${micMuted ? 'bg-red-50 border-red-200 text-red-500 hover:bg-red-100' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                    >
                      <i className={`fas ${micMuted ? 'fa-microphone-slash' : 'fa-microphone'}`}></i>
                      {micMuted ? '마이크 켜기' : '마이크 끄기'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAudioSettingsOpen(true)}
                      className="squad-meeting-lobby-action-button flex h-[48px]! min-h-[48px]! items-center justify-center gap-2 whitespace-nowrap rounded-[12px]! border border-gray-200 bg-white px-[16px]! py-0! text-[14px]! leading-[20px]! font-extrabold text-gray-700 box-border transition hover:border-brand hover:text-brand [&_i]:text-[14px]! [&_i]:leading-[20px]!"
                    >
                      <i className="fas fa-sliders-h"></i> 오디오
                    </button>
                    {isJoined ? (
                      <button
                        type="button"
                        onClick={() => void leaveChannel()}
                        disabled={joining}
                        className="squad-meeting-lobby-action-button flex h-[48px]! min-h-[48px]! items-center justify-center gap-2 whitespace-nowrap rounded-[12px]! bg-red-50 px-[16px]! py-0! text-[14px]! leading-[20px]! font-extrabold text-red-500 box-border transition hover:bg-red-100 disabled:opacity-60 [&_i]:text-[14px]! [&_i]:leading-[20px]!"
                      >
                        <i className="fas fa-phone-slash"></i> 나가기
                      </button>
                    ) : (
                      <button
                        type="button"
                        onPointerDown={handleJoinPointerDown}
                        onClick={() => void joinChannel()}
                        disabled={joining || !activeChannel}
                        className="squad-meeting-lobby-action-button flex h-[48px]! min-h-[48px]! items-center justify-center gap-2 whitespace-nowrap rounded-[12px]! bg-brand px-[16px]! py-0! text-[14px]! leading-[20px]! font-extrabold text-white box-border shadow-lg shadow-green-100 transition hover:bg-green-600 disabled:opacity-60 [&_i]:text-[14px]! [&_i]:leading-[20px]!"
                      >
                        <i className="fas fa-phone-alt"></i> 입장
                      </button>
                    )}
                  </div>
                </div>
              </section>

              <aside className="xl:col-span-5 space-y-6">
                <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-extrabold text-gray-900">음성 회의 방</h3>
                      <p className="text-[11px] font-bold text-gray-400 mt-0.5">입장할 회의 방을 선택하고 팀원과 대화하세요.</p>
                    </div>
                    <span className="w-10 h-10 rounded-xl bg-green-50 text-brand flex items-center justify-center">
                      <i className="fas fa-headset"></i>
                    </span>
                  </div>

                  <div className="p-4 space-y-2">
                    {channels.map((channel) => (
                      <button
                        type="button"
                        key={channel.channelId}
                        onClick={() => void selectChannel(channel)}
                        className={`squad-meeting-channel-button min-h-[74px]! w-full rounded-[12px]! border p-[16px]! text-left text-[14px]! leading-[20px]! box-border transition ${activeChannel?.channelId === channel.channelId ? 'border-brand bg-green-50/70' : 'border-gray-100 bg-white hover:bg-gray-50'}`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-extrabold text-gray-900 truncate">{channel.name}</p>
                            <p className="text-[11px] font-bold text-gray-500 truncate mt-1">{channel.description ?? '스쿼드 음성 회의 채널'}</p>
                          </div>
                          <span className="shrink-0 rounded-full bg-white border border-gray-100 px-2.5 py-1 text-[10px] font-extrabold text-gray-500">
                            {activeChannel?.channelId === channel.channelId ? participants.length : channel.activeParticipantCount ?? 0}명
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>

                <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-extrabold text-gray-900">참가자</h3>
                      <p className="text-[11px] font-bold text-gray-400 mt-0.5">현재 접속 {participants.length}명</p>
                    </div>
                    <div className="flex -space-x-2">
                      {members.slice(0, 4).map((member) => renderMemberAvatar(member, 'w-8 h-8'))}
                    </div>
                  </div>

                  <div className="p-4 space-y-3 max-h-[420px] overflow-y-auto custom-scrollbar">
                    {participants.length > 0 ? participants.map(renderParticipant) : (
                      <div className="py-8 text-center rounded-xl border-2 border-dashed border-gray-100 bg-gray-50/50">
                        <i className="fas fa-headphones-alt text-3xl text-gray-300 mb-3"></i>
                        <p className="text-sm font-extrabold text-gray-700">아직 입장한 팀원이 없습니다.</p>
                        <p className="text-xs font-medium text-gray-400 mt-1">첫 번째로 음성 회의에 입장해 보세요.</p>
                      </div>
                    )}

                    {waitingMembers.length > 0 ? (
                      <div className="pt-3 border-t border-gray-100">
                        <p className="text-[10px] font-extrabold text-gray-400 uppercase mb-2">대기 중인 팀원</p>
                        <div className="space-y-2">
                          {waitingMembers.map((member) => (
                            <div key={member.memberId} className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
                              {renderMemberAvatar(member, 'w-8 h-8')}
                              <span className="text-xs font-bold text-gray-500">{member.learnerName ?? '팀원'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </section>
              </aside>
            </div>
          </div>
        </main>
      </div>
      )}

      <MeetingAudioSettings model={model} />

      {renderAuthModal()}
    </div>
  )
}
