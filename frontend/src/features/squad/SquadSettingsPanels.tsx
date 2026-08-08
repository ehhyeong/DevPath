import { type FormEvent } from 'react'
import UserAvatar from '../../components/UserAvatar'

import type {
  ExternalIntegration,
  IntegrationProvider,
  SettingsForm,
  WorkspaceMember,
  WorkspaceSettings,
  WorkspaceType,
} from './settings-types'

const integrationMeta: Record<
  IntegrationProvider,
  { title: string; description: string; icon: string; iconColor: string; accent: string; button: string }
> = {
  GITHUB: {
    title: 'GitHub',
    description: '코드 저장소와 리뷰 흐름을 팀 공간에 연결합니다.',
    icon: 'fab fa-github',
    iconColor: 'text-gray-900',
    accent: 'bg-gray-900',
    button: 'bg-gray-900 text-white hover:bg-black',
  },
  DISCORD: {
    title: 'Discord',
    description: '팀 알림을 Discord 채널과 함께 확인합니다.',
    icon: 'fab fa-discord',
    iconColor: 'text-[#5865F2]',
    accent: 'bg-[#5865F2]',
    button: 'bg-[#5865F2] text-white hover:bg-[#4752C4]',
  },
  SLACK: {
    title: 'Slack',
    description: '주요 일정과 작업 변경 사항을 Slack으로 보냅니다.',
    icon: 'fab fa-slack',
    iconColor: 'text-[#611F69]',
    accent: 'bg-[#611F69]',
    button: 'bg-[#611F69] text-white hover:bg-[#4A154B]',
  },
  JIRA: {
    title: 'Jira',
    description: '칸반 작업을 이슈 관리 흐름과 맞춰 봅니다.',
    icon: 'fab fa-jira',
    iconColor: 'text-blue-600',
    accent: 'bg-blue-600',
    button: 'bg-blue-600 text-white hover:bg-blue-700',
  },
}

function memberName(member: WorkspaceMember) {
  return member.learnerName?.trim() || '팀원'
}

function formatDate(value?: string | null) {
  if (!value) {
    return '-'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '-'
  }

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function typeLabel(type: WorkspaceType) {
  switch (type) {
    case 'SQUAD':
      return '스쿼드 프로젝트'
    case 'MENTORING':
      return '멘토링 프로젝트'
    case 'SOLO':
      return '개인 프로젝트'
    default:
      return '프로젝트'
  }
}

function isIntegrationActive(integration?: ExternalIntegration) {
  return Boolean(integration?.active ?? integration?.isActive)
}

export function StateCard({ icon, message }: { icon: string; message: string }) {
  return (
    <div className="squad-settings-card rounded-[1rem] border border-[#F3F4F6] bg-white p-10 text-center [box-shadow:0_1px_2px_rgba(15,23,42,0.04)]">
      <i className={`${icon} text-2xl mb-4`} />
      <p className="text-sm font-bold text-gray-600">{message}</p>
    </div>
  )
}

export function GeneralPanel({
  settings,
  form,
  saving,
  canManage,
  onFormChange,
  onSave,
}: {
  settings: WorkspaceSettings
  form: SettingsForm
  saving: boolean
  canManage: boolean
  onFormChange: (form: SettingsForm) => void
  onSave: (event: FormEvent) => void
}) {
  return (
    <section className="squad-settings-fade-in space-y-8">
      <div>
        <h3 className="text-xl font-black text-gray-900 mb-1">일반 설정</h3>
        <p className="text-sm text-gray-500 font-medium">스쿼드의 기본 정보와 공개 범위를 설정합니다.</p>
      </div>

      {!canManage ? (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-2xl p-4 text-sm font-bold">
          스쿼드 소유자만 설정을 수정할 수 있습니다.
        </div>
      ) : null}

      <form onSubmit={onSave} className="space-y-6">
        <div className="squad-settings-card space-y-6 rounded-[1rem] border border-[#F3F4F6] bg-white p-8 [box-shadow:0_1px_2px_rgba(15,23,42,0.04)]">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              스쿼드 이름 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="squad-settings-input h-[46px]! w-full rounded-[12px]! border border-gray-200 px-[16px]! py-0! text-[14px]! leading-[20px]! font-bold box-border shadow-sm outline-none transition focus:border-brand disabled:bg-gray-50 disabled:text-gray-400"
              value={form.name}
              disabled={!canManage || saving}
              onChange={(event) => onFormChange({ ...form, name: event.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">상세 설명</label>
            <textarea
              className="squad-settings-textarea custom-scrollbar h-[96px]! min-h-[96px]! w-full resize-none rounded-[12px]! border border-gray-200 px-[16px]! py-[12px]! text-[14px]! leading-[20px]! box-border shadow-sm outline-none transition focus:border-brand disabled:bg-gray-50 disabled:text-gray-400"
              value={form.description}
              disabled={!canManage || saving}
              onChange={(event) => onFormChange({ ...form, description: event.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-gray-100 pt-6">
            <InfoTile label="유형" value={typeLabel(settings.type)} />
            <InfoTile label="팀원" value={`${settings.memberCount}명`} />
            <InfoTile label="최근 수정" value={formatDate(settings.updatedAt)} />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!canManage || saving}
            className="squad-settings-primary-action flex h-[44px]! min-w-[138px] items-center justify-center gap-2 whitespace-nowrap rounded-[12px]! bg-gray-900 px-[32px]! py-0! text-[14px]! leading-[20px]! font-bold text-white box-border shadow-lg transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            <i className={`${saving ? 'fas fa-spinner fa-spin' : 'fas fa-save'} text-[14px]! leading-[20px]!`} />
            변경사항 저장
          </button>
        </div>
      </form>
    </section>
  )
}

export function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="squad-settings-info-tile min-h-[68px] rounded-xl bg-gray-50 px-4 py-3 box-border">
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm font-extrabold text-gray-900">{value}</p>
    </div>
  )
}

export function MembersPanel({
  settings,
  currentUserId,
}: {
  settings: WorkspaceSettings
  currentUserId: number | null
}) {
  return (
    <section className="squad-settings-fade-in space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h3 className="text-xl font-black text-gray-900 mb-1">팀원 관리</h3>
          <p className="text-sm text-gray-500 font-medium">참여 중인 팀원을 관리하고 권한을 부여합니다.</p>
        </div>
      </div>

      <div className="squad-settings-card overflow-hidden rounded-[1rem] border border-[#F3F4F6] bg-white [box-shadow:0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="grid grid-cols-12 gap-4 p-4 border-b border-gray-100 bg-gray-50/50 text-xs font-extrabold text-gray-500 uppercase tracking-wider items-center">
          <div className="col-span-5 pl-4">이름</div>
          <div className="col-span-3">역할</div>
          <div className="col-span-2 text-center">상태</div>
          <div className="col-span-2 text-right pr-4">관리</div>
        </div>

        {settings.members.length ? (
          settings.members.map((member) => {
            const owner = member.learnerId === settings.ownerId

            return (
              <div key={member.memberId} className="grid grid-cols-12 gap-4 p-4 border-b border-gray-50 items-center hover:bg-gray-50 transition last:border-b-0">
                <div className="col-span-5 flex items-center gap-4 pl-4">
                  <UserAvatar name={memberName(member)} imageUrl={member.profileImage} className="w-10 h-10 bg-white" />
                  <div>
                    <p className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                      {memberName(member)}
                      {member.learnerId === currentUserId ? <span className="bg-green-50 text-brand px-1.5 py-0.5 rounded text-[9px] uppercase">나</span> : null}
                      {owner ? <span className="bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded text-[9px] uppercase">방장</span> : null}
                    </p>
                  </div>
                </div>

                <div className="col-span-3">
                  <span className={`px-3 py-1 rounded-lg text-xs font-bold flex w-fit items-center gap-1.5 ${owner ? 'bg-yellow-50 text-yellow-600 border border-yellow-200' : 'bg-gray-50 text-gray-600 border border-gray-200'}`}>
                    <i className={owner ? 'fas fa-crown' : 'fas fa-user'} />
                    {owner ? '방장' : '팀원'}
                  </span>
                </div>

                <div className="col-span-2 text-center">
                  <span className={`text-xs font-bold inline-flex items-center justify-center gap-1 ${member.online ? 'text-green-500' : 'text-gray-400'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${member.online ? 'bg-green-500' : 'bg-gray-300'}`} />
                    {member.online ? '온라인' : '오프라인'}
                  </span>
                </div>

                <div className="col-span-2 text-right pr-4 text-xs font-medium text-gray-400">-</div>
              </div>
            )
          })
        ) : (
          <div className="p-10 text-center text-sm font-bold text-gray-400">아직 참여 중인 팀원이 없습니다.</div>
        )}
      </div>
    </section>
  )
}

export function IntegrationsPanel({
  integrations,
  canManage,
  busyIntegration,
  syncingGithub,
  githubRepositoryUrl,
  githubToken,
  onGithubRepositoryUrlChange,
  onGithubTokenChange,
  onToggle,
  onSyncGithub,
}: {
  integrations: ExternalIntegration[]
  canManage: boolean
  busyIntegration: IntegrationProvider | null
  syncingGithub: boolean
  githubRepositoryUrl: string
  githubToken: string
  onGithubRepositoryUrlChange: (value: string) => void
  onGithubTokenChange: (value: string) => void
  onToggle: (provider: IntegrationProvider, forcedActive?: boolean) => void
  onSyncGithub: () => void
}) {
  return (
    <section className="squad-settings-fade-in space-y-8">
      <div>
        <h3 className="text-xl font-black text-gray-900 mb-1">외부 서비스 연동</h3>
        <p className="text-sm text-gray-500 font-medium">스쿼드에서 사용할 외부 서비스 연동 상태를 관리합니다.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {(Object.keys(integrationMeta) as IntegrationProvider[]).map((provider) => {
          const meta = integrationMeta[provider]
          const integration = integrations.find((item) => item.provider === provider)
          const active = isIntegrationActive(integration)
          const busy = busyIntegration === provider
          const github = provider === 'GITHUB'
          const githubRepositoryChanged =
            github && githubRepositoryUrl.trim() !== (integration?.repositoryUrl ?? '')

          return (
            <div key={provider} className="squad-settings-card group relative overflow-hidden rounded-[1rem] border border-[#F3F4F6] bg-white p-6 [box-shadow:0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-gray-300">
              <div className={`absolute top-0 left-0 w-1 h-full ${meta.accent}`} />
              <div className="flex justify-between items-start mb-4 pl-2">
                <div className="flex items-center gap-3">
                  <i className={`${meta.icon} text-3xl ${meta.iconColor}`} />
                  <div>
                    <h4 className="font-bold text-gray-900">{meta.title}</h4>
                    <p className="text-[10px] text-gray-500 font-medium">{meta.description}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${active ? 'bg-green-50 text-green-600 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                  {active ? '연결됨' : '꺼짐'}
                </span>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-500 mb-4">
                {github && active
                  ? `저장소: ${integration?.repositoryOwner ?? '-'} / ${integration?.repositoryName ?? '-'}`
                  : active ? `마지막 연결: ${formatDate(integration?.connectedAt)}` : '연동을 켜면 이 스쿼드에서 사용할 준비 상태로 바뀝니다.'}
              </div>

              {github ? (
                <div className="space-y-3">
                  <label className="block">
                    <span className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-gray-400">Repository URL</span>
                    <input
                      value={githubRepositoryUrl}
                      onChange={(event) => onGithubRepositoryUrlChange(event.target.value)}
                      disabled={!canManage || busy || syncingGithub}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-800 outline-none transition focus:border-gray-900 disabled:bg-gray-50 disabled:text-gray-400"
                      placeholder="https://github.com/owner/repository"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-wider text-gray-400">
                      <span>GitHub Access Token</span>
                      {integration?.githubTokenConfigured ? (
                        <span className="rounded-full bg-green-50 px-2 py-0.5 text-[9px] text-green-600">
                          서버 인증 설정됨
                        </span>
                      ) : null}
                    </span>
                    <input
                      type="password"
                      value={githubToken}
                      onChange={(event) => onGithubTokenChange(event.target.value)}
                      disabled={!canManage || busy || syncingGithub}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-800 outline-none transition focus:border-gray-900 disabled:bg-gray-50 disabled:text-gray-400"
                      placeholder={
                        integration?.githubTokenConfigured
                          ? '새 토큰을 입력하면 기존 토큰을 교체합니다.'
                          : '토큰을 저장하면 GitHub API 한도가 늘어납니다.'
                      }
                    />
                    <p className="mt-1.5 text-[11px] font-medium leading-relaxed text-gray-500">
                      토큰은 서버에만 저장되고 화면에 다시 표시되지 않습니다. 공개 저장소 조회용 최소 권한 토큰을 사용하세요.
                    </p>
                  </label>

                  {active ? (
                    <p className="text-[11px] font-semibold leading-relaxed text-gray-500">
                      {integration?.lastSyncMessage ?? `마지막 동기화: ${formatDate(integration?.lastSyncedAt)}`}
                    </p>
                  ) : null}

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={!canManage || busy || syncingGithub}
                      onClick={() => onToggle(provider, active ? true : undefined)}
                      className={`squad-settings-integration-action h-[32px]! justify-center whitespace-nowrap rounded-[8px]! px-[12px]! py-0! text-[12px]! leading-[16px]! font-bold box-border shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${active ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : meta.button}`}
                    >
                      {busy ? '연결 중' : active ? (githubRepositoryChanged ? '저장/동기화' : '다시 연결') : '연동하기'}
                    </button>
                    <button
                      type="button"
                      disabled={!canManage || !active || busy || syncingGithub}
                      onClick={() => onToggle(provider, false)}
                      className="squad-settings-integration-action h-[32px]! justify-center whitespace-nowrap rounded-[8px]! border border-gray-200 bg-white px-[12px]! py-0! text-[12px]! leading-[16px]! font-bold text-gray-700 box-border shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      연동 끄기
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={!canManage || !active || busy || syncingGithub}
                    onClick={onSyncGithub}
                    className="squad-settings-integration-action h-[32px]! w-full justify-center whitespace-nowrap rounded-[8px]! border border-gray-200 bg-white px-[12px]! py-0! text-[12px]! leading-[16px]! font-bold text-gray-700 box-border shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {syncingGithub ? '동기화 중' : 'GitHub PR만 다시 동기화'}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={!canManage || busy}
                  onClick={() => onToggle(provider)}
                  className={`squad-settings-integration-action h-[32px]! w-full justify-center whitespace-nowrap rounded-[8px]! px-[12px]! py-0! text-[12px]! leading-[16px]! font-bold box-border shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${active ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : meta.button}`}
                >
                  {busy ? '변경 중' : active ? '연동 끄기' : '연동 켜기'}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

export function DangerPanel({
  settings,
  canManage,
  saving,
  onArchiveToggle,
  onDeleteOpen,
}: {
  settings: WorkspaceSettings
  canManage: boolean
  saving: boolean
  onArchiveToggle: () => void
  onDeleteOpen: () => void
}) {
  return (
    <section className="squad-settings-fade-in space-y-8">
      <div>
        <h3 className="text-xl font-black text-red-600 mb-1">위험 구역 (Danger Zone)</h3>
        <p className="text-sm text-gray-500 font-medium">스쿼드의 삭제 및 보관 처리는 되돌릴 수 없으니 주의하세요.</p>
      </div>

      <div className="border-2 border-red-200 bg-red-50/30 rounded-2xl p-6 flex flex-col gap-6">
        <div className="flex justify-between items-center pb-6 border-b border-red-100 gap-6">
          <div>
            <h4 className="font-bold text-gray-900 mb-1">스쿼드 보관 (Archive)</h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              프로젝트가 완료되었나요? 읽기 전용 상태로 전환하여 데이터를 안전하게 보관합니다.
              <br />
              팀원들은 더 이상 칸반이나 코드를 수정할 수 없습니다.
            </p>
          </div>
          <button type="button" disabled={!canManage || saving} onClick={onArchiveToggle} className="squad-settings-danger-action h-[40px]! min-w-[132px] shrink-0 justify-center whitespace-nowrap rounded-[12px]! border border-gray-300 bg-white px-[20px]! py-0! text-[14px]! leading-[20px]! font-bold text-gray-700 box-border shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50">
            {settings.status === 'ARCHIVED' ? '스쿼드 보관 해제' : '스쿼드 보관하기'}
          </button>
        </div>

        <div className="flex justify-between items-center gap-6">
          <div>
            <h4 className="font-bold text-gray-900 mb-1">스쿼드 영구 삭제 (Delete)</h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              모든 데이터, 파일, 디스코드 기록, 칸반 보드 내역이 즉시 삭제되며 절대 복구할 수 없습니다.
            </p>
          </div>
          <button type="button" disabled={!canManage || saving} onClick={onDeleteOpen} className="squad-settings-danger-action h-[40px]! min-w-[132px] shrink-0 justify-center whitespace-nowrap rounded-[12px]! bg-red-600 px-[20px]! py-0! text-[14px]! leading-[20px]! font-bold text-white box-border shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50">
            스쿼드 삭제하기
          </button>
        </div>
      </div>
    </section>
  )
}

export function DeleteModal({
  settings,
  saving,
  confirmValue,
  onConfirmChange,
  onClose,
  onDelete,
}: {
  settings: WorkspaceSettings
  saving: boolean
  confirmValue: string
  onConfirmChange: (value: string) => void
  onClose: () => void
  onDelete: () => void
}) {
  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-sm z-[1200]">
      <div className="squad-settings-fade-in relative flex w-full max-w-md flex-col overflow-hidden rounded-3xl border-t-8 border-red-500 bg-white p-8 shadow-2xl">
        <h3 className="text-xl font-black text-red-600 mb-2 flex items-center gap-2">
          <i className="fas fa-exclamation-triangle" />
          정말 삭제하시겠습니까?
        </h3>
        <p className="text-sm text-gray-600 mb-6 leading-relaxed">
          이 작업은 되돌릴 수 없습니다. 파일, 디스코드 기록, 칸반 보드 등 모든 내역이 영구적으로 사라집니다.
        </p>

        <div className="mb-6 bg-gray-50 p-4 rounded-xl border border-gray-200">
          <label className="block text-xs font-bold text-gray-500 mb-2">
            삭제하려면 스쿼드 이름 <span className="text-red-500 font-black">{settings.name}</span>을 정확히 입력하세요
          </label>
          <input
            type="text"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm font-bold outline-none focus:border-red-500 transition"
            value={confirmValue}
            onChange={(event) => onConfirmChange(event.target.value)}
            autoFocus
          />
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition">
            취소
          </button>
          <button
            type="button"
            disabled={confirmValue.trim() !== settings.name || saving}
            onClick={onDelete}
            className="px-6 py-2.5 text-sm font-bold text-white bg-red-600 rounded-xl transition disabled:bg-red-300 disabled:cursor-not-allowed"
          >
            영구 삭제합니다
          </button>
        </div>
      </div>
    </div>
  )
}
