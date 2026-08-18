import type { FormEvent } from 'react'
import UserAvatar from '../../components/UserAvatar'
import { type ApplyForm,type CreateForm,formatViews,type LoungeApplication,type LoungeType,type SquadMember,type SquadPost,type StatusTab } from './community-lounge-model'

export function FilterTab({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className={`tab-btn mr-[0]! whitespace-nowrap rounded-lg border-b-[2px]! [border-bottom-style:solid]! px-[1rem]! py-[0.5rem]! text-sm transition ${
        active ? 'active border-b-[#00C471]! font-[700]! text-[#00C471]!' : 'border-b-transparent! font-[500]! text-[#6B7280]! hover:bg-gray-50'
      }`}
      onClick={onClick}
    >
      {label}
    </button>
  )
}

export function SquadCard({
  squad,
  currentUserProfileImage,
  onOpen,
  onEdit,
  onAuthorOpen,
  onMemberOpen,
}: {
  squad: SquadPost
  currentUserProfileImage: string | null
  onOpen: () => void
  onEdit: () => void
  onAuthorOpen: () => void
  onMemberOpen: (member: SquadMember) => void
}) {
  const isJoin = squad.type === 'join_wish'

  return (
    <article
      className={`bg-white rounded-2xl p-6 border ${
        isJoin ? 'border-brand/30' : 'border-gray-200'
      } shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition hover:[transform:translateY(-4px)] hover:[box-shadow:0_10px_20px_rgba(0,0,0,0.05)] cursor-pointer relative flex flex-col group ${
        squad.isClosed ? 'opacity-70 grayscale-[0.3]' : ''
      }`}
      onClick={onOpen}
    >
      <div className="absolute top-5 right-5 flex items-center gap-1.5 z-10">
        {squad.isMine && !squad.isClosed ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onEdit()
            }}
            className="bg-white border border-gray-200 hover:bg-gray-100 text-gray-500 w-6 h-6 rounded flex items-center justify-center transition shadow-sm"
            title="수정"
          >
            <i className="fas fa-edit text-[10px]"></i>
          </button>
        ) : null}
        {squad.isClosed ? (
          <span className="bg-gray-200 text-gray-500 text-[10px] font-bold px-2 py-1 rounded shadow-sm">마감완료</span>
        ) : isJoin ? (
          <span className="bg-green-50 border border-green-200 text-brand text-[10px] font-bold px-2 py-1 rounded shadow-sm">
            참여희망
          </span>
        ) : (
          <span className="bg-red-50 border border-red-200 text-red-500 text-[10px] font-bold px-2 py-1 rounded shadow-sm">
            모집중
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 mb-4 pr-16">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 shadow-sm ${squad.iconBg} ${squad.iconCol}`}>
          <i className={`fas ${squad.iconClass}`}></i>
        </div>
        <div className="min-w-0">
          <h3 className="font-bold text-gray-900 leading-tight truncate">{squad.title}</h3>
          <span className="text-[10px] text-gray-400 font-bold">{squad.type.toUpperCase().replace('_', ' ')}</span>
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-4 line-clamp-2 h-10 font-medium whitespace-pre-line">
        {`${squad.desc.substring(0, 60)}${squad.desc.length > 60 ? '...' : ''}`}
      </p>

      <div className="mt-auto pt-4 border-t flex justify-between items-center">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onAuthorOpen()
          }}
          className="flex min-w-0 items-center gap-2 rounded-lg pr-2 outline-none transition hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-brand/30"
        >
          {squad.isMine ? (
            <UserAvatar
              name={squad.author}
              imageUrl={currentUserProfileImage}
              className="w-6 h-6 shadow-sm"
              iconClassName="text-[10px]"
            />
          ) : (
            <UserAvatar
              name={squad.author}
              imageUrl={squad.authorProfileImage}
              className="w-6 h-6 shadow-sm"
              iconClassName="text-[10px]"
            />
          )}
          <span className="text-xs font-bold text-gray-600 truncate">{squad.author}</span>
        </button>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-gray-400 font-medium">
            <i className="far fa-eye mr-1"></i>
            {formatViews(squad.views)}
          </span>
          <span className="text-xs font-bold text-gray-500">
            <i className="fas fa-user-friends mr-1"></i>
            {squad.current}/{squad.max}
          </span>
          <span className="text-[10px] text-red-500 font-bold">~ {squad.deadline}</span>
        </div>
      </div>

      {squad.isMine && squad.members.length > 0 ? (
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
          <span className="text-[10px] font-bold text-gray-400">참여 멤버:</span>
          <div className="flex -space-x-2">
            {squad.members.map((member) => (
              <button
                key={`${member.userId ?? member.name}-${member.role}`}
                type="button"
                aria-label={`${member.name} 프로필 보기`}
                className="group/member relative z-0 rounded-full outline-none hover:z-20 focus-visible:z-20"
                onClick={(event) => {
                  event.stopPropagation()
                  onMemberOpen(member)
                }}
              >
                <span className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 -translate-x-1/2 translate-y-1 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-[10px] font-bold leading-none text-white opacity-0 shadow-lg transition group-hover/member:translate-y-0 group-hover/member:opacity-100 group-focus-visible/member:translate-y-0 group-focus-visible/member:opacity-100">
                  {member.name}
                </span>
                <UserAvatar
                  name={member.name}
                  imageUrl={member.imageUrl}
                  className="w-6 h-6 cursor-pointer border-white transition hover:scale-110"
                  iconClassName="text-[10px]"
                />
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </article>
  )
}

export function DetailModal({
  squad,
  onClose,
  onApply,
  onMessageAuthor,
  onEdit,
  onCloseOnly,
  onCreateWorkspace,
}: {
  squad: SquadPost
  onClose: () => void
  onApply: () => void
  onMessageAuthor: () => void
  onEdit: () => void
  onCloseOnly: () => void
  onCreateWorkspace: () => void
}) {
  return (
    <div id="detailModal" className="modal active fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] modal-enter">
        <div className="p-6 border-b border-gray-100 flex justify-between items-start bg-gray-50">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl shadow-sm ${squad.iconBg} ${squad.iconCol}`}>
              <i className={`fas ${squad.iconClass}`}></i>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold text-gray-900 mb-1">{squad.title}</h2>
                <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded font-bold uppercase">{squad.type}</span>
              </div>
              <p className="text-sm text-gray-500 font-medium">Leader: {squad.author}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-900 text-lg">
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="p-8 overflow-y-auto space-y-8 flex-1">
          <div>
            <h3 className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wider">소개</h3>
            <div className="bg-white border border-gray-100 p-5 rounded-xl text-sm text-gray-700 leading-loose shadow-sm whitespace-pre-wrap font-medium">
              {squad.desc}
            </div>
          </div>
          <div>
            <h3 className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wider">기술 스택</h3>
            <div className="flex flex-wrap gap-2">
              {squad.tags.map((tag) => (
                <span key={tag} className="text-xs bg-gray-100 px-2 py-1 rounded font-bold">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-gray-100 bg-white flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-6 py-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition">
            닫기
          </button>
          {!squad.isMine ? (
            <button type="button" onClick={onMessageAuthor} className="px-5 py-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50 transition flex items-center gap-2">
              <i className="fas fa-paper-plane"></i> 메시지 보내기
            </button>
          ) : null}
          {squad.isMine && !squad.isClosed ? (
            <>
              <button type="button" onClick={onCloseOnly} className="px-4 py-3 rounded-xl text-red-400 text-sm font-bold hover:bg-red-50 transition">
                단순 마감
              </button>
              <button type="button" onClick={onEdit} className="px-4 py-3 rounded-xl border border-gray-200 text-gray-700 text-sm font-bold hover:bg-gray-50 transition">
                수정
              </button>
              <button type="button" onClick={onCreateWorkspace} className="px-6 py-3 rounded-xl bg-brand text-white text-sm font-bold hover:bg-green-600 transition shadow-sm flex items-center gap-2">
                <i className="fas fa-rocket"></i> 마감 및 워크스페이스 생성
              </button>
            </>
          ) : squad.isMine && squad.isClosed ? (
            <button type="button" onClick={onCreateWorkspace} className="px-6 py-3 rounded-xl bg-brand text-white text-sm font-bold hover:bg-green-600 transition shadow-sm flex items-center gap-2">
              <i className={squad.workspaceUrl ? 'fas fa-arrow-right' : 'fas fa-rotate-right'}></i>
              {squad.workspaceUrl ? '워크스페이스로 이동' : '워크스페이스 생성 재개'}
            </button>
          ) : !squad.isClosed ? (
            <button type="button" onClick={onApply} className="px-8 py-3 rounded-xl bg-brand text-white text-sm font-bold hover:bg-green-600 transition flex items-center gap-2">
              <i className="fas fa-hand-sparkles"></i>
              {squad.type === 'join_wish' ? '스카우트 제안하기' : '참여 신청하기'}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export function ApplyModal({
  squad,
  form,
  isSubmitting,
  onClose,
  onChange,
  onSubmit,
}: {
  squad: SquadPost
  form: ApplyForm
  isSubmitting: boolean
  onClose: () => void
  onChange: (form: ApplyForm) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  return (
    <div id="applyModal" className="modal active fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <form onSubmit={onSubmit} className="bg-white w-full max-w-lg rounded-2xl shadow-2xl relative z-10 overflow-hidden modal-enter">
        <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900">신청서 / 제안서 작성</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-900">
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {squad.type === 'project' ? (
            <>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">희망 직군 <span className="text-red-500">*</span></label>
                <select
                  value={form.role}
                  onChange={(event) => onChange({ ...form, role: event.target.value })}
                  className="w-full border rounded-xl px-3 py-2 text-sm bg-white"
                >
                  {(squad.roles.length ? squad.roles : ['직군 미정']).map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">포트폴리오</label>
                <input
                  value={form.portfolio}
                  onChange={(event) => onChange({ ...form, portfolio: event.target.value })}
                  className="w-full border rounded-xl px-3 py-2 text-sm"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">지원 동기</label>
                <textarea
                  value={form.content}
                  onChange={(event) => onChange({ ...form, content: event.target.value })}
                  className="w-full border rounded-xl px-3 py-2 text-sm h-24"
                ></textarea>
              </div>
            </>
          ) : squad.type === 'study' ? (
            <>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">학습 수준</label>
                <input
                  value={form.role}
                  onChange={(event) => onChange({ ...form, role: event.target.value })}
                  className="w-full border rounded-xl px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">목표</label>
                <textarea
                  value={form.content}
                  onChange={(event) => onChange({ ...form, content: event.target.value })}
                  className="w-full border rounded-xl px-3 py-2 text-sm h-24"
                ></textarea>
              </div>
            </>
          ) : (
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">자기소개</label>
              <textarea
                value={form.content}
                onChange={(event) => onChange({ ...form, content: event.target.value })}
                className="w-full border rounded-xl px-3 py-2 text-sm h-24"
              ></textarea>
            </div>
          )}
        </div>
        <div className="p-5 border-t border-gray-100 bg-white flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-500 hover:bg-gray-50">
            취소
          </button>
          <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 rounded-xl bg-brand text-white text-sm font-bold hover:bg-green-600 shadow-md disabled:opacity-50 disabled:cursor-not-allowed">
            {isSubmitting ? '전송 중' : '보내기'}
          </button>
        </div>
      </form>
    </div>
  )
}

export function CreateSquadModal({
  form,
  isSubmitting,
  onClose,
  onChange,
  onTypeChange,
  onSubmit,
}: {
  form: CreateForm
  isSubmitting: boolean
  onClose: () => void
  onChange: (form: CreateForm) => void
  onTypeChange: (type: LoungeType) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  return (
    <div id="createModal" className="modal active fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <form onSubmit={onSubmit} className="bg-white w-full max-w-lg rounded-2xl shadow-2xl relative z-10 p-8 modal-enter overflow-y-auto max-h-[90vh]">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">{form.editId ? '스쿼드 수정하기' : '새 스쿼드 만들기'}</h2>
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">스쿼드 제목</label>
            <input
              type="text"
              value={form.title}
              onChange={(event) => onChange({ ...form, title: event.target.value })}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:border-brand outline-none"
              placeholder="제목을 입력하세요"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">유형</label>
              <select
                value={form.type}
                onChange={(event) => onTypeChange(event.target.value as LoungeType)}
                className="w-full appearance-none border border-gray-300 rounded-xl pl-3 pr-[44px] py-3 text-sm outline-none bg-white bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20fill=%27none%27%20viewBox=%270%200%2024%2024%27%20stroke=%27%239CA3AF%27%3E%3Cpath%20stroke-linecap=%27round%27%20stroke-linejoin=%27round%27%20stroke-width=%272%27%20d=%27M19%209l-7%207-7-7%27%3E%3C/path%3E%3C/svg%3E')] bg-no-repeat bg-[position:right_18px_center] bg-[length:16px_16px] font-medium"
              >
                <option value="project">🚀 팀 프로젝트 모집</option>
                <option value="join_wish">🙋 참여 희망 (Hire Me)</option>
                <option value="study">📚 스터디 모집</option>
                <option value="networking">☕ 모각코</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">모집 마감일</label>
              <input
                type="date"
                value={form.deadline}
                onChange={(event) => onChange({ ...form, deadline: event.target.value })}
                className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm focus:border-brand outline-none bg-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">모집 인원</label>
            <input
              type="number"
              min="1"
              value={form.maxMembers}
              onChange={(event) => onChange({ ...form, maxMembers: event.target.value })}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:border-brand outline-none"
              placeholder="예: 4"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">기술 스택</label>
            <input
              type="text"
              value={form.tags}
              onChange={(event) => onChange({ ...form, tags: event.target.value })}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:border-brand outline-none"
              placeholder="#React #Spring"
            />
          </div>
          {form.type === 'project' ? (
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">모집 역할</label>
              <input
                type="text"
                value={form.roles}
                onChange={(event) => onChange({ ...form, roles: event.target.value })}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:border-brand outline-none"
                placeholder="Frontend Backend Designer"
              />
            </div>
          ) : null}
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">소개글</label>
            <textarea
              value={form.desc}
              onChange={(event) => onChange({ ...form, desc: event.target.value })}
              className="w-full h-[224px] border border-gray-300 rounded-xl px-4 py-3 text-sm resize-none focus:border-brand outline-none"
            ></textarea>
          </div>
        </div>
        <div className="mt-8 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-6 py-3 bg-gray-100 rounded-xl text-sm font-bold text-gray-600">
            취소
          </button>
          <button type="submit" disabled={isSubmitting} className="px-8 py-3 bg-gray-900 text-white rounded-xl text-sm font-bold shadow-xl transition hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed">
            {isSubmitting ? '저장 중' : form.editId ? '수정 완료' : '생성하기'}
          </button>
        </div>
      </form>
    </div>
  )
}

export function StatusModal({
  tab,
  sentApplications,
  receivedApplications,
  onTabChange,
  onClose,
  onOpenReceived,
}: {
  tab: StatusTab
  sentApplications: LoungeApplication[]
  receivedApplications: LoungeApplication[]
  onTabChange: (tab: StatusTab) => void
  onClose: () => void
  onOpenReceived: (application: LoungeApplication) => void
}) {
  const data = tab === 'sent' ? sentApplications : receivedApplications

  return (
    <div id="statusModal" className="modal active fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[80vh] modal-enter">
        <div className="p-4 border-b border-gray-100 flex flex-col bg-white">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">지원 및 요청 현황</h2>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-900">
              <i className="fas fa-times"></i>
            </button>
          </div>
          <div className="flex bg-gray-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => onTabChange('sent')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${tab === 'sent' ? 'bg-white shadow-sm text-brand' : 'text-gray-500'}`}
            >
              보낸 신청
            </button>
            <button
              type="button"
              onClick={() => onTabChange('received')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${tab === 'received' ? 'bg-white shadow-sm text-brand' : 'text-gray-500'}`}
            >
              받은 요청
            </button>
          </div>
        </div>
        <div className="p-5 space-y-3 overflow-y-auto bg-gray-50 flex-1">
          {data.length === 0 ? (
            <p className="text-center text-gray-400 text-xs py-10">내역이 없습니다.</p>
          ) : (
            data.map((item) => (
              <button
                key={item.id}
                type="button"
                disabled={tab !== 'received'}
                onClick={() => {
                  if (tab === 'received') {
                    onOpenReceived(item)
                  }
                }}
                className={`w-full text-left p-4 border rounded-xl bg-white flex flex-col gap-2 shadow-sm ${
                  tab === 'received' ? 'cursor-pointer hover:border-brand' : ''
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-extrabold text-gray-400 uppercase">{item.date}</span>
                  <span className="text-[10px] font-bold text-brand bg-green-50 px-2 py-0.5 rounded">{item.status}</span>
                </div>
                <p className="text-sm font-bold text-gray-900">{item.title}</p>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export function ReceivedApplicationModal({
  application,
  onClose,
  onProcess,
}: {
  application: LoungeApplication
  onClose: () => void
  onProcess: (action: 'approve' | 'reject') => void
}) {
  return (
    <div id="receivedAppModal" className="modal active fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl relative overflow-hidden modal-enter">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="text-lg font-bold text-gray-900">받은 신청서 확인</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-900">
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
          <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
            <UserAvatar
              name={application.sender}
              imageUrl={application.senderImageUrl}
              className="w-12 h-12"
              iconClassName="text-base"
            />
            <div>
              <p className="font-bold text-gray-900">{application.sender}</p>
              <p className="text-xs text-gray-400">{application.date}</p>
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 mb-1">지원 제목</p>
            <p className="text-sm font-medium">{application.title}</p>
          </div>
          <div className="inline-block">
            {application.type === 'project_apply' ? (
              <span className="bg-blue-100 text-blue-600 text-[10px] font-bold px-2 py-1 rounded">프로젝트 지원</span>
            ) : (
              <span className="bg-green-100 text-green-600 text-[10px] font-bold px-2 py-1 rounded">스카우트 제안</span>
            )}
          </div>
          <div className="text-sm text-gray-700 bg-gray-50 p-4 rounded-xl leading-relaxed whitespace-pre-line border border-gray-100">
            {application.content}
          </div>
        </div>
        <div className="p-5 border-t border-gray-100 bg-white flex gap-2">
          <button type="button" onClick={() => onProcess('reject')} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-500 hover:bg-gray-50 transition">
            거절하기
          </button>
          <button type="button" onClick={() => onProcess('approve')} className="flex-1 py-3 rounded-xl bg-brand text-white text-sm font-bold hover:bg-green-600 shadow-md transition">
            승인하기
          </button>
        </div>
      </div>
    </div>
  )
}

export function MemberProfileModal({
  member,
  message,
  onMessageChange,
  onClose,
  onSend,
}: {
  member: SquadMember
  message: string
  onMessageChange: (message: string) => void
  onClose: () => void
  onSend: () => void
}) {
  return (
    <div id="memberProfileModal" className="modal active fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl relative overflow-hidden modal-enter">
        <div className="relative bg-brand/10 h-24">
          <button type="button" onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800">
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="px-6 pb-6 -mt-10 text-center">
          <UserAvatar
            name={member.name}
            imageUrl={member.imageUrl}
            className="mx-auto mb-3 h-20 w-20 border-4 border-white shadow-md"
            iconClassName="text-2xl"
          />
          <h3 className="text-xl font-bold text-gray-900">{member.name}</h3>
          <p className="text-sm text-gray-500 mb-6">{member.role || 'Member'}</p>
          <div className="space-y-3">
            <textarea
              value={message}
              onChange={(event) => onMessageChange(event.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm h-24 resize-none focus:border-brand outline-none"
              placeholder="간단한 메시지를 남겨보세요.."
            ></textarea>
            <button
              type="button"
              onClick={onSend}
              className="w-full py-3 bg-brand text-white rounded-xl text-sm font-bold hover:bg-green-600 shadow-lg transition flex items-center justify-center gap-2"
            >
              <i className="fas fa-paper-plane"></i> 메시지 보내기
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
