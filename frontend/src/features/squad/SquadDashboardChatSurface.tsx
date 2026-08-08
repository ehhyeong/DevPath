import { createPortal } from 'react-dom'
import type { Dispatch, RefObject, SetStateAction } from 'react'
import UserAvatar from '../../components/UserAvatar'
import { showAuthToast } from '../../lib/auth-toast'
import { formatChatTime } from './squad-dashboard-support'
import type { ChatTab, DirectMessage, TeamMessage, WorkspaceDashboard, WorkspaceMember } from './dashboard-types'

type Props = {
  sessionUserId: number | null
  dashboard: WorkspaceDashboard | null
  messages: TeamMessage[]
  directMessages: DirectMessage[]
  dmMembers: WorkspaceMember[]
  memberById: Map<number, WorkspaceMember>
  selectedDmMember: WorkspaceMember | null
  currentProfileImage: string | null
  chatInPip: boolean
  chatPipContainer: HTMLElement | null
  chatOpen: boolean
  chatTab: ChatTab
  plusMenuOpen: boolean
  messageInput: string
  directInput: string
  directLoading: boolean
  chatScrollRef: RefObject<HTMLDivElement | null>
  directScrollRef: RefObject<HTMLDivElement | null>
  pipChatScrollRef: RefObject<HTMLDivElement | null>
  pipDirectScrollRef: RefObject<HTMLDivElement | null>
  setChatTab: Dispatch<SetStateAction<ChatTab>>
  setPlusMenuOpen: Dispatch<SetStateAction<boolean>>
  setMessageInput: Dispatch<SetStateAction<string>>
  setDirectInput: Dispatch<SetStateAction<string>>
  setSelectedDmMember: Dispatch<SetStateAction<WorkspaceMember | null>>
  setDirectMessages: Dispatch<SetStateAction<DirectMessage[]>>
  openChatSurface: () => Promise<void>
  closeChatSurface: () => void
  openDirectRoom: (member: WorkspaceMember) => Promise<void>
  sendTeamMessage: (content?: string) => Promise<void>
  sendDirectMessage: () => Promise<void>
  sendPlusMessage: (type: 'code' | 'meeting' | 'remind') => void
}

export default function SquadDashboardChatSurface(props: Props) {
  const { sessionUserId, dashboard, messages, directMessages, dmMembers, memberById, selectedDmMember, currentProfileImage, chatInPip, chatPipContainer, chatOpen, chatTab, plusMenuOpen, messageInput, directInput, directLoading, chatScrollRef, directScrollRef, pipChatScrollRef, pipDirectScrollRef, setChatTab, setPlusMenuOpen, setMessageInput, setDirectInput, setSelectedDmMember, setDirectMessages, openChatSurface, closeChatSurface, openDirectRoom, sendTeamMessage, sendDirectMessage, sendPlusMessage } = props

  function renderMemberAvatar(member: WorkspaceMember, className: string, iconClassName = 'text-sm') {
    const imageUrl = member.learnerId === sessionUserId ? currentProfileImage : member.profileImage

    return (
      <UserAvatar
        key={member.memberId}
        name={member.learnerName ?? '사용자'}
        imageUrl={imageUrl}
        className={className}
        iconClassName={iconClassName}
        alt={member.learnerName ?? '사용자'}
      />
    )
  }

  function renderTeamMessage(message: TeamMessage) {
    const sender = memberById.get(message.senderId)
    const imageUrl = message.isMine ? currentProfileImage : sender?.profileImage ?? null
    const senderName = sender?.learnerName ?? message.senderName

    if (message.isMine) {
      return (
        <div key={message.messageId} className="squad-dashboard-fade-in flex flex-col items-end gap-1">
          <div className="flex items-baseline gap-1.5 mb-0.5">
            <span className="text-[9px] font-bold text-gray-400">{formatChatTime(message.createdAt)}</span>
          </div>
          <div className="bg-gray-900 text-white text-sm px-3.5 py-2 rounded-2xl rounded-tr-none shadow-sm inline-block max-w-[80%] leading-relaxed">
            {message.content}
          </div>
        </div>
      )
    }

    return (
      <div key={message.messageId} className="squad-dashboard-fade-in flex items-start gap-2.5">
        <UserAvatar
          name={senderName}
          imageUrl={imageUrl}
          className="w-8 h-8 border border-gray-200 shadow-sm bg-white"
          iconClassName="text-xs"
        />
        <div>
          <div className="flex items-baseline gap-1.5 mb-1">
            <span className="text-xs font-bold text-gray-900">{senderName}</span>
            <span className="text-[9px] font-bold text-gray-400">{formatChatTime(message.createdAt)}</span>
          </div>
          <div className="bg-white border border-gray-100 text-sm text-gray-700 px-3.5 py-2 rounded-2xl rounded-tl-none shadow-sm inline-block leading-relaxed">
            {message.content}
          </div>
        </div>
      </div>
    )
  }

  function renderDirectMessage(message: DirectMessage) {
    const sender = memberById.get(message.senderId)
    const imageUrl = message.isMine ? currentProfileImage : sender?.profileImage ?? selectedDmMember?.profileImage ?? null
    const senderName = sender?.learnerName ?? message.senderName

    if (message.isMine) {
      return (
        <div key={message.messageId} className="squad-dashboard-fade-in flex flex-col items-end gap-1">
          <span className="text-[9px] font-bold text-gray-400">{formatChatTime(message.createdAt)}</span>
          <div className="bg-gray-900 text-white text-sm px-3.5 py-2 rounded-2xl rounded-tr-none shadow-sm inline-block max-w-[80%] leading-relaxed">
            {message.content}
          </div>
        </div>
      )
    }

    return (
      <div key={message.messageId} className="squad-dashboard-fade-in flex items-start gap-2.5">
        <UserAvatar
          name={senderName}
          imageUrl={imageUrl}
          className="w-8 h-8 border border-gray-200 shadow-sm bg-white"
          iconClassName="text-xs"
        />
        <div>
          <div className="flex items-baseline gap-1.5 mb-1">
            <span className="text-xs font-bold text-gray-900">{senderName}</span>
            <span className="text-[9px] font-bold text-gray-400">{formatChatTime(message.createdAt)}</span>
          </div>
          <div className="bg-white border border-gray-100 text-sm text-gray-700 px-3.5 py-2 rounded-2xl rounded-tl-none shadow-sm inline-block leading-relaxed">
            {message.content}
          </div>
        </div>
      </div>
    )
  }

  function renderPipChat() {
    return (
      <div className="squad-dashboard-page flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#F8F9FA]! font-['Pretendard',sans-serif] text-gray-800 [&_.squad-dashboard-fade-in]:[animation:squadDashboardFadeIn_0.4s_ease-in-out_forwards]">
        <div className="h-12 border-b border-gray-100 flex items-center justify-between px-4 bg-white shrink-0">
          <h2 className="font-extrabold text-sm text-gray-900 flex items-center gap-2 truncate">
            <i className="fas fa-comments text-brand"></i>
            <span className="truncate">{dashboard?.name ?? '스쿼드 소통방'}</span>
          </h2>
          <button
            onClick={closeChatSurface}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 transition"
            title="닫기"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="flex border-b border-gray-100 bg-gray-50/50 shrink-0 px-2">
          <button onClick={() => setChatTab('team')} className={chatTab === 'team' ? 'flex-1 py-2.5 text-xs font-bold text-brand border-b-2 border-brand transition' : 'flex-1 py-2.5 text-xs font-bold text-gray-500 border-b-2 border-transparent hover:text-gray-700 transition'}>
            팀 채팅
          </button>
          <button onClick={() => setChatTab('dm')} className={chatTab === 'dm' ? 'flex-1 py-2.5 text-xs font-bold text-gray-900 border-b-2 border-gray-900 transition' : 'flex-1 py-2.5 text-xs font-bold text-gray-500 border-b-2 border-transparent hover:text-gray-700 transition'}>
            1:1 메시지
          </button>
        </div>

        {chatTab === 'team' ? (
          <div className="flex-1 flex min-h-0 flex-col overflow-hidden bg-[#F8F9FA]">
            <div ref={pipChatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {messages.length > 0 ? (
                <>
                  <div className="flex justify-center"><span className="bg-gray-200/70 text-gray-500 text-[10px] font-bold px-3 py-1 rounded-full">오늘</span></div>
                  {messages.map(renderTeamMessage)}
                </>
              ) : (
                <div className="min-h-full flex flex-col items-center justify-center text-center opacity-70">
                  <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                    <i className="fas fa-hand-sparkles text-xl text-gray-400"></i>
                  </div>
                  <p className="text-gray-700 font-bold text-sm">스쿼드 소통방이 열렸습니다.</p>
                  <p className="text-xs text-gray-500 mt-1 font-medium">팀원들에게 첫 메시지를 보내보세요.</p>
                </div>
              )}
            </div>

            <div className="p-3 bg-white border-t border-gray-100 shrink-0">
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-2xl p-1.5 pr-2 focus-within:border-gray-400 transition shadow-sm">
                <input
                  type="text"
                  className="flex-1 bg-transparent text-sm outline-none px-3 font-medium"
                  placeholder="메시지 보내기..."
                  value={messageInput}
                  onChange={(event) => setMessageInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      void sendTeamMessage()
                    }
                  }}
                />
                <button onClick={() => void sendTeamMessage()} className="w-8 h-8 rounded-xl bg-brand text-white flex items-center justify-center hover:bg-green-600 transition shrink-0 shadow-sm">
                  <i className="fas fa-paper-plane text-xs"></i>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex min-h-0 flex-col overflow-hidden bg-white">
            {selectedDmMember ? (
              <>
                <div className="h-12 border-b border-gray-100 px-3 flex items-center gap-2 shrink-0 bg-white">
                  <button
                    onClick={() => {
                      setSelectedDmMember(null)
                      setDirectMessages([])
                      setDirectInput('')
                    }}
                    className="w-8 h-8 rounded-full hover:bg-gray-100 text-gray-500 flex items-center justify-center transition"
                    title="대화 목록"
                  >
                    <i className="fas fa-chevron-left text-xs"></i>
                  </button>
                  {renderMemberAvatar(selectedDmMember, 'w-8 h-8 border border-gray-200 bg-gray-50', 'text-xs')}
                  <p className="text-sm font-extrabold text-gray-900 truncate">{selectedDmMember.learnerName ?? '팀원'}</p>
                </div>

                <div ref={pipDirectScrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#F8F9FA]">
                  {directLoading ? (
                    <div className="min-h-full flex items-center justify-center text-xs font-bold text-gray-400">
                      메시지를 불러오는 중입니다.
                    </div>
                  ) : directMessages.length > 0 ? (
                    <>
                      <div className="flex justify-center"><span className="bg-gray-200/70 text-gray-500 text-[10px] font-bold px-3 py-1 rounded-full">오늘</span></div>
                      {directMessages.map(renderDirectMessage)}
                    </>
                  ) : (
                    <div className="min-h-full flex flex-col items-center justify-center text-center opacity-70">
                      <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                        <i className="fas fa-paper-plane text-xl text-gray-400"></i>
                      </div>
                      <p className="text-gray-700 font-bold text-sm">아직 메시지가 없습니다.</p>
                      <p className="text-xs text-gray-500 mt-1 font-medium">첫 1:1 메시지를 보내보세요.</p>
                    </div>
                  )}
                </div>

                <div className="p-3 bg-white border-t border-gray-100 shrink-0">
                  <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-2xl p-1.5 pr-2 focus-within:border-gray-400 transition shadow-sm">
                    <input
                      type="text"
                      className="flex-1 bg-transparent text-sm outline-none px-3 font-medium"
                      placeholder="1:1 메시지 보내기..."
                      value={directInput}
                      onChange={(event) => setDirectInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          void sendDirectMessage()
                        }
                      }}
                    />
                    <button onClick={() => void sendDirectMessage()} className="w-8 h-8 rounded-xl bg-brand text-white flex items-center justify-center hover:bg-green-600 transition shrink-0 shadow-sm">
                      <i className="fas fa-paper-plane text-xs"></i>
                    </button>
                  </div>
                </div>
              </>
            ) : dmMembers.length > 0 ? (
              <div className="p-2 overflow-y-auto custom-scrollbar">
                {dmMembers.map((member) => (
                  <button
                    type="button"
                    key={member.memberId}
                    onClick={() => void openDirectRoom(member)}
                    className="w-full text-left p-3 flex items-center gap-3 hover:bg-gray-50 rounded-xl cursor-pointer transition border-b border-gray-50"
                  >
                    <div className="relative">
                      {renderMemberAvatar(member, 'w-10 h-10 border border-gray-200 bg-gray-50', 'text-sm')}
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-gray-900">{member.learnerName ?? '팀원'}</h4>
                      <p className="text-xs text-gray-500 truncate mt-0.5 font-medium">1:1 메시지를 시작해보세요.</p>
                    </div>
                    <i className="fas fa-chevron-right text-[10px] text-gray-300"></i>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 flex-1 flex flex-col items-center justify-center text-center">
                <i className="fas fa-user-friends text-3xl text-gray-200 mb-3"></i>
                <p className="text-gray-500 font-bold text-sm">대화 가능한 팀원이 없습니다.</p>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  const showChatPanel = chatOpen && !chatInPip
  return (
    <>
      <button
        onClick={() => void openChatSurface()}
        className="fixed bottom-8 right-8 w-14 h-14 bg-gray-900 text-white rounded-full shadow-[0_10px_25px_rgba(0,0,0,0.3)] flex items-center justify-center hover:bg-black transition-transform hover:scale-105 z-40 group"
        title={window.documentPictureInPicture ? 'PiP 채팅 열기' : '채팅 열기'}
      >
        <i className="fas fa-comment-dots text-2xl group-hover:animate-bounce"></i>
        {messages.length > 0 ? <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 border-2 border-white rounded-full"></span> : null}
      </button>

      <div className={`${showChatPanel ? '' : 'hidden'} fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-[900] transition-opacity`} onClick={closeChatSurface}></div>

      <div className={`${showChatPanel ? 'translate-x-0' : 'translate-x-full'} fixed top-0 right-0 w-full sm:w-[400px] h-full bg-white shadow-[-10px_0_30px_rgba(0,0,0,0.1)] z-[1000] transform transition-transform duration-300 flex flex-col`}>
        <div className="h-16 border-b border-gray-100 flex items-center justify-between px-5 bg-white shrink-0">
          <h2 className="font-extrabold text-lg text-gray-900 flex items-center gap-2">
            <i className="fas fa-comments text-brand"></i> 스쿼드 소통방
          </h2>
          <button onClick={closeChatSurface} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 transition"><i className="fas fa-times"></i></button>
        </div>

        <div className="flex border-b border-gray-100 bg-gray-50/50 shrink-0 px-2">
          <button onClick={() => setChatTab('team')} className={chatTab === 'team' ? 'flex-1 py-3 text-sm font-bold text-brand border-b-2 border-brand transition' : 'flex-1 py-3 text-sm font-bold text-gray-500 border-b-2 border-transparent hover:text-gray-700 transition'}>
            🔥 {dashboard?.name ?? '전체 소통방'}
          </button>
          <button onClick={() => setChatTab('dm')} className={chatTab === 'dm' ? 'flex-1 py-3 text-sm font-bold text-gray-900 border-b-2 border-gray-900 transition relative' : 'flex-1 py-3 text-sm font-bold text-gray-500 border-b-2 border-transparent hover:text-gray-700 transition relative'}>
            1:1 메시지
          </button>
        </div>

        {chatTab === 'team' ? (
          <div className="flex-1 flex flex-col overflow-hidden bg-[#F8F9FA]">
            <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {messages.length > 0 ? (
                <>
                  <div className="flex justify-center"><span className="bg-gray-200/70 text-gray-500 text-[10px] font-bold px-3 py-1 rounded-full">오늘</span></div>
                  {messages.map(renderTeamMessage)}
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-70 min-h-full">
                  <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                    <i className="fas fa-hand-sparkles text-xl text-gray-400"></i>
                  </div>
                  <p className="text-gray-700 font-bold text-sm">스쿼드 소통방이 개설되었습니다!</p>
                  <p className="text-xs text-gray-500 mt-1 font-medium">아래 입력창을 통해 팀원들에게 첫 인사를 남겨보세요.</p>
                </div>
              )}
            </div>

            <div className="p-4 bg-white border-t border-gray-100 shrink-0 relative">
              <div className={`${plusMenuOpen ? '' : 'hidden'} plus-menu-enter absolute right-4 bottom-[85px] left-4 z-50 rounded-2xl border border-gray-100 bg-white p-2 shadow-2xl [animation:squadDashboardPlusMenuIn_0.2s_ease-out_forwards]`}>
                <div className="grid grid-cols-4 gap-1">
                  <button onClick={() => showAuthToast({ message: '파일 업로드는 팀 자료실에서 이용해주세요.', durationMs: 1800 })} className="flex flex-col items-center gap-2 p-3 hover:bg-gray-50 rounded-xl transition">
                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center"><i className="fas fa-file-alt"></i></div>
                    <span className="text-[10px] font-bold text-gray-600">파일</span>
                  </button>
                  <button onClick={() => sendPlusMessage('code')} className="flex flex-col items-center gap-2 p-3 hover:bg-gray-50 rounded-xl transition">
                    <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-500 flex items-center justify-center"><i className="fas fa-code"></i></div>
                    <span className="text-[10px] font-bold text-gray-600">코드</span>
                  </button>
                  <button onClick={() => sendPlusMessage('meeting')} className="flex flex-col items-center gap-2 p-3 hover:bg-gray-50 rounded-xl transition">
                    <div className="w-10 h-10 rounded-full bg-green-50 text-brand flex items-center justify-center"><i className="fas fa-headset"></i></div>
                    <span className="text-[10px] font-bold text-gray-600">회의초대</span>
                  </button>
                  <button onClick={() => sendPlusMessage('remind')} className="flex flex-col items-center gap-2 p-3 hover:bg-gray-50 rounded-xl transition">
                    <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center"><i className="fas fa-clock"></i></div>
                    <span className="text-[10px] font-bold text-gray-600">리마인드</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-2xl p-1.5 pr-2 focus-within:border-gray-400 transition shadow-sm">
                <button onClick={() => setPlusMenuOpen((open) => !open)} className="w-8 h-8 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition flex items-center justify-center shrink-0">
                  <i className={`${plusMenuOpen ? 'fas fa-times rotate-90 transition-transform duration-200' : 'fas fa-plus transition-transform duration-200'}`}></i>
                </button>
                <input
                  type="text"
                  className="flex-1 bg-transparent text-sm outline-none px-2 font-medium"
                  placeholder="메시지 보내기..."
                  value={messageInput}
                  onChange={(event) => setMessageInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      void sendTeamMessage()
                    }
                  }}
                />
                <button onClick={() => void sendTeamMessage()} className="w-8 h-8 rounded-xl bg-brand text-white flex items-center justify-center hover:bg-green-600 transition shrink-0 shadow-sm"><i className="fas fa-paper-plane text-xs"></i></button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden bg-white">
            {selectedDmMember ? (
              <>
                <div className="h-14 border-b border-gray-100 px-4 flex items-center gap-3 shrink-0 bg-white">
                  <button
                    onClick={() => {
                      setSelectedDmMember(null)
                      setDirectMessages([])
                      setDirectInput('')
                    }}
                    className="w-8 h-8 rounded-full hover:bg-gray-100 text-gray-500 flex items-center justify-center transition"
                    title="대화 목록"
                  >
                    <i className="fas fa-chevron-left text-xs"></i>
                  </button>
                  {renderMemberAvatar(selectedDmMember, 'w-9 h-9 border border-gray-200 bg-gray-50', 'text-sm')}
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold text-gray-900 truncate">{selectedDmMember.learnerName ?? '팀원'}</p>
                    <p className="text-[10px] font-bold text-green-600">워크스페이스 멤버</p>
                  </div>
                </div>

                <div ref={directScrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#F8F9FA]">
                  {directLoading ? (
                    <div className="min-h-full flex items-center justify-center text-xs font-bold text-gray-400">
                      메시지를 불러오는 중입니다.
                    </div>
                  ) : directMessages.length > 0 ? (
                    <>
                      <div className="flex justify-center"><span className="bg-gray-200/70 text-gray-500 text-[10px] font-bold px-3 py-1 rounded-full">오늘</span></div>
                      {directMessages.map(renderDirectMessage)}
                    </>
                  ) : (
                    <div className="min-h-full flex flex-col items-center justify-center text-center opacity-70">
                      <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                        <i className="fas fa-paper-plane text-xl text-gray-400"></i>
                      </div>
                      <p className="text-gray-700 font-bold text-sm">아직 주고받은 메시지가 없습니다.</p>
                      <p className="text-xs text-gray-500 mt-1 font-medium">아래 입력창으로 첫 1:1 메시지를 보내보세요.</p>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-white border-t border-gray-100 shrink-0">
                  <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-2xl p-1.5 pr-2 focus-within:border-gray-400 transition shadow-sm">
                    <input
                      type="text"
                      className="flex-1 bg-transparent text-sm outline-none px-3 font-medium"
                      placeholder="1:1 메시지 보내기..."
                      value={directInput}
                      onChange={(event) => setDirectInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          void sendDirectMessage()
                        }
                      }}
                    />
                    <button onClick={() => void sendDirectMessage()} className="w-8 h-8 rounded-xl bg-brand text-white flex items-center justify-center hover:bg-green-600 transition shrink-0 shadow-sm">
                      <i className="fas fa-paper-plane text-xs"></i>
                    </button>
                  </div>
                </div>
              </>
            ) : dmMembers.length > 0 ? (
              <div className="p-2 overflow-y-auto custom-scrollbar">
                {dmMembers.map((member) => (
                  <button
                    type="button"
                    key={member.memberId}
                    onClick={() => void openDirectRoom(member)}
                    className="w-full text-left p-3 flex items-center gap-3 hover:bg-gray-50 rounded-xl cursor-pointer transition border-b border-gray-50"
                  >
                    <div className="relative">
                      {renderMemberAvatar(member, 'w-11 h-11 border border-gray-200 bg-gray-50', 'text-sm')}
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-gray-900">{member.learnerName ?? '팀원'}</h4>
                      <p className="text-xs text-gray-500 truncate mt-0.5 font-medium">1:1 메시지를 시작해보세요.</p>
                    </div>
                    <i className="fas fa-chevron-right text-[10px] text-gray-300"></i>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 flex-1 flex flex-col items-center justify-center text-center">
                <i className="fas fa-user-friends text-3xl text-gray-200 mb-3"></i>
                <p className="text-gray-500 font-bold text-sm">진행 중인 1:1 대화가 없습니다.</p>
                <p className="text-[11px] text-gray-400 mt-1">스쿼드 설정에서 팀원을 확인하고 대화를 시작해보세요.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {chatInPip && chatPipContainer ? createPortal(renderPipChat(), chatPipContainer) : null}
    </>
  )
}
