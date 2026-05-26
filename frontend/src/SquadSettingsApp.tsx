import { type FormEvent, useEffect, useMemo, useState } from 'react'
import AuthModal, { type AuthView } from './components/AuthModal'
import SquadWorkspaceAside from './components/SquadWorkspaceAside'
import UserAvatar from './components/UserAvatar'
import { clearStoredAuthSession, getPostLoginRedirect, readStoredAuthSession } from './lib/auth-session'
import { showAuthToast } from './lib/auth-toast'
import { projectApiRequest } from './project-api'
import { createSquadNotification, squadActorName } from './squad-notifications'

type WorkspaceStatus = 'ACTIVE' | 'ARCHIVED'
type WorkspaceType = 'SOLO' | 'SQUAD' | 'MENTORING'
type SettingsTab = 'general' | 'members' | 'integrations' | 'danger'
type IntegrationProvider = 'GITHUB' | 'SLACK' | 'DISCORD' | 'JIRA'

type WorkspaceMember = {
  memberId: number
  learnerId: number
  learnerName?: string | null
  profileImage?: string | null
  joinedAt?: string | null
  lastActiveAt?: string | null
  online?: boolean
}

type WorkspaceSettings = {
  workspaceId: number
  name: string
  description?: string | null
  type: WorkspaceType
  status: WorkspaceStatus
  ownerId: number
  deleted: boolean
  canManage: boolean
  memberCount: number
  members: WorkspaceMember[]
  createdAt?: string | null
  updatedAt?: string | null
}

type ExternalIntegration = {
  id: number
  workspaceId: number
  provider: IntegrationProvider
  active?: boolean
  isActive?: boolean
  connectedAt?: string | null
  repositoryUrl?: string | null
  repositoryOwner?: string | null
  repositoryName?: string | null
  lastSyncedAt?: string | null
  lastSyncMessage?: string | null
}

type SettingsForm = {
  name: string
  description: string
}

const settingsTabs: Array<{ id: SettingsTab; label: string; icon: string }> = [
  { id: 'general', label: '일반 설정', icon: 'fas fa-sliders-h' },
  { id: 'members', label: '팀원 관리', icon: 'fas fa-users' },
  { id: 'integrations', label: '외부 연동 (API)', icon: 'fas fa-plug' },
  { id: 'danger', label: '위험 구역', icon: 'fas fa-exclamation-triangle' },
]

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

function getWorkspaceIdFromUrl() {
  const params = new URLSearchParams(window.location.search)
  const raw = params.get('workspaceId') ?? params.get('squadId')
  const parsed = raw ? Number(raw) : Number.NaN
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function createForm(settings: WorkspaceSettings | null): SettingsForm {
  return {
    name: settings?.name ?? '',
    description: settings?.description ?? '',
  }
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

function statusLabel(status: WorkspaceStatus) {
  return status === 'ARCHIVED' ? '보관됨' : '진행 중'
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

export default function SquadSettingsApp() {
  const workspaceId = useMemo(getWorkspaceIdFromUrl, [])
  const [session, setSession] = useState(() => readStoredAuthSession())
  const [authView, setAuthView] = useState<AuthView | null>(null)
  const [activeTab, setActiveTab] = useState<SettingsTab>('general')
  const [settings, setSettings] = useState<WorkspaceSettings | null>(null)
  const [integrations, setIntegrations] = useState<ExternalIntegration[]>([])
  const [form, setForm] = useState<SettingsForm>(() => createForm(null))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [busyIntegration, setBusyIntegration] = useState<IntegrationProvider | null>(null)
  const [syncingGithub, setSyncingGithub] = useState(false)
  const [githubRepositoryUrl, setGithubRepositoryUrl] = useState('')
  const [dangerSaving, setDangerSaving] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')

  useEffect(() => {
    document.title = 'DevPath - 스쿼드 설정'
    const html = document.documentElement
    const body = document.body
    html.classList.add('squad-dashboard-document')
    body.classList.add('squad-dashboard-body')

    return () => {
      html.classList.remove('squad-dashboard-document')
      body.classList.remove('squad-dashboard-body')
    }
  }, [])

  useEffect(() => {
    if (!workspaceId) {
      setError('스쿼드 설정을 열 프로젝트 정보가 없습니다.')
      setLoading(false)
      return
    }

    if (!session?.accessToken) {
      setError('스쿼드 설정은 로그인 후 확인할 수 있습니다.')
      setLoading(false)
      setAuthView('login')
      return
    }

    let ignore = false

    async function loadSettings() {
      setLoading(true)
      setError(null)

      try {
        await projectApiRequest<void>(
          `/api/workspaces/${workspaceId}/presence`,
          { method: 'POST' },
          'required',
        )

        const [nextSettings, nextIntegrations] = await Promise.all([
          projectApiRequest<WorkspaceSettings>(`/api/workspaces/${workspaceId}/settings`, {}, 'required'),
          projectApiRequest<ExternalIntegration[]>(
            `/api/workspaces/${workspaceId}/integrations`,
            {},
            'required',
          ),
        ])

        if (ignore) {
          return
        }

        setSettings(nextSettings)
        setForm(createForm(nextSettings))
        setIntegrations(nextIntegrations)
        setGithubRepositoryUrl(nextIntegrations.find((integration) => integration.provider === 'GITHUB')?.repositoryUrl ?? '')
      } catch (loadError) {
        if (ignore) {
          return
        }

        const message = loadError instanceof Error ? loadError.message : '스쿼드 설정을 불러오지 못했습니다.'
        setError(message)
        showAuthToast({ message, variant: 'error' })
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    void loadSettings()

    return () => {
      ignore = true
    }
  }, [session?.accessToken, workspaceId])

  useEffect(() => {
    if (activeTab !== 'members' || !workspaceId || !session?.accessToken) {
      return
    }

    let ignore = false
    const refreshMembers = async () => {
      try {
        const nextSettings = await projectApiRequest<WorkspaceSettings>(
          `/api/workspaces/${workspaceId}/settings`,
          {},
          'required',
        )
        if (!ignore) {
          setSettings(nextSettings)
        }
      } catch {
        // Presence refresh is a convenience update; keep the current table if it misses a beat.
      }
    }

    void refreshMembers()
    const intervalId = window.setInterval(refreshMembers, 30_000)

    return () => {
      ignore = true
      window.clearInterval(intervalId)
    }
  }, [activeTab, session?.accessToken, workspaceId])

  function handleLogout() {
    clearStoredAuthSession()
    setSession(null)
    setAuthView('login')
  }

  function handleAuthenticated() {
    const nextSession = readStoredAuthSession()

    if (nextSession?.role === 'ROLE_ADMIN') {
      window.location.replace(getPostLoginRedirect(nextSession.role))
      return
    }

    setSession(nextSession)
    setAuthView(null)
  }

  function notifySettingsChange(message: string) {
    void createSquadNotification(workspaceId, {
      pageKey: 'squad-settings',
      message: `${squadActorName(session?.name)}님이 ${message}`,
      targetPath: '/squad-settings',
    })
  }

  async function saveGeneral(event: FormEvent) {
    event.preventDefault()

    if (!workspaceId || !settings?.canManage) {
      return
    }

    const name = form.name.trim()
    if (!name) {
      showAuthToast({ message: '스쿼드 이름을 입력해 주세요.', variant: 'error' })
      return
    }

    setSaving(true)

    try {
      const updated = await projectApiRequest<WorkspaceSettings>(
        `/api/workspaces/${workspaceId}/settings`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            name,
            description: form.description.trim() || null,
          }),
        },
        'required',
      )

      setSettings(updated)
      setForm(createForm(updated))
      notifySettingsChange(`스쿼드 설정을 "${updated.name}"로 수정했습니다.`)
      showAuthToast('스쿼드 설정이 저장되었습니다.')
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : '스쿼드 설정을 저장하지 못했습니다.'
      showAuthToast({ message, variant: 'error' })
    } finally {
      setSaving(false)
    }
  }

  async function toggleIntegration(provider: IntegrationProvider, forcedActive?: boolean) {
    if (!workspaceId || !settings?.canManage) {
      return
    }

    const current = integrations.find((integration) => integration.provider === provider)
    const nextActive = forcedActive ?? !isIntegrationActive(current)
    const repositoryUrl = githubRepositoryUrl.trim()

    if (provider === 'GITHUB' && nextActive && !repositoryUrl) {
      showAuthToast({ message: 'GitHub 저장소 URL을 입력해 주세요.', variant: 'error' })
      return
    }

    setBusyIntegration(provider)

    try {
      const updated = await projectApiRequest<ExternalIntegration>(
        `/api/workspaces/${workspaceId}/integrations/${provider}`,
        {
          method: 'PATCH',
          body: JSON.stringify(
            provider === 'GITHUB'
              ? { isActive: nextActive, repositoryUrl }
              : { isActive: nextActive },
          ),
        },
        'required',
      )

      setIntegrations((items) => {
        if (!items.some((item) => item.provider === provider)) {
          return [...items, updated]
        }

        return items.map((item) => (item.provider === provider ? updated : item))
      })
      if (provider === 'GITHUB') {
        setGithubRepositoryUrl(updated.repositoryUrl ?? repositoryUrl)
      }
      notifySettingsChange(`${provider} 연동을 ${nextActive ? '켰습니다.' : '껐습니다.'}`)
      showAuthToast(
        provider === 'GITHUB' && nextActive
          ? 'GitHub 저장소와 Pull Request를 동기화했습니다.'
          : nextActive ? '외부 연동이 켜졌습니다.' : '외부 연동이 꺼졌습니다.',
      )
    } catch (toggleError) {
      const message = toggleError instanceof Error ? toggleError.message : '외부 연동 상태를 바꾸지 못했습니다.'
      showAuthToast({ message, variant: 'error' })
    } finally {
      setBusyIntegration(null)
    }
  }

  async function syncGithubPullRequests() {
    if (!workspaceId || !settings?.canManage) {
      return
    }

    setSyncingGithub(true)

    try {
      const updated = await projectApiRequest<ExternalIntegration>(
        `/api/workspaces/${workspaceId}/integrations/GITHUB/sync`,
        { method: 'POST' },
        'required',
      )

      setIntegrations((items) =>
        items.map((item) => (item.provider === 'GITHUB' ? updated : item)),
      )
      setGithubRepositoryUrl(updated.repositoryUrl ?? githubRepositoryUrl)
      notifySettingsChange('GitHub Pull Request를 코드 피드백 보드로 동기화했습니다.')
      showAuthToast(updated.lastSyncMessage ?? 'GitHub Pull Request를 동기화했습니다.')
    } catch (syncError) {
      const message = syncError instanceof Error ? syncError.message : 'GitHub Pull Request를 동기화하지 못했습니다.'
      showAuthToast({ message, variant: 'error' })
    } finally {
      setSyncingGithub(false)
    }
  }

  async function toggleArchive() {
    if (!workspaceId || !settings?.canManage) {
      return
    }

    const archive = settings.status !== 'ARCHIVED'
    const ok = window.confirm(archive ? '이 스쿼드를 보관할까요?' : '이 스쿼드를 다시 진행 중으로 되돌릴까요?')
    if (!ok) {
      return
    }

    setDangerSaving(true)

    try {
      const updated = await projectApiRequest<WorkspaceSettings>(
        `/api/workspaces/${workspaceId}/settings/${archive ? 'archive' : 'restore'}`,
        { method: 'PATCH' },
        'required',
      )
      setSettings(updated)
      setForm(createForm(updated))
      notifySettingsChange(`스쿼드를 ${archive ? '보관 처리했습니다.' : '다시 활성화했습니다.'}`)
      showAuthToast(archive ? '스쿼드가 보관되었습니다.' : '스쿼드가 다시 활성화되었습니다.')
    } catch (archiveError) {
      const message = archiveError instanceof Error ? archiveError.message : '상태를 변경하지 못했습니다.'
      showAuthToast({ message, variant: 'error' })
    } finally {
      setDangerSaving(false)
    }
  }

  async function deleteWorkspace() {
    if (!workspaceId || !settings?.canManage || deleteConfirm.trim() !== settings.name) {
      return
    }

    setDangerSaving(true)

    try {
      await projectApiRequest<void>(
        `/api/workspaces/${workspaceId}/settings`,
        { method: 'DELETE' },
        'required',
      )
      showAuthToast('스쿼드가 삭제되었습니다.')
      notifySettingsChange(`스쿼드 "${settings.name}"를 삭제했습니다.`)
      window.location.replace('/workspace-hub')
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : '스쿼드를 삭제하지 못했습니다.'
      showAuthToast({ message, variant: 'error' })
      setDangerSaving(false)
    }
  }

  const canManage = Boolean(settings?.canManage)
  const projectName = settings?.name ?? '스쿼드 설정'

  return (
    <div className="squad-dashboard-page squad-settings-page flex h-screen overflow-hidden text-gray-800">
      <SquadWorkspaceAside activePage="settings" workspaceId={workspaceId} projectName={projectName} />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-[#F9FAFB]">
        <header className="h-16 bg-white border-b border-gray-100 flex items-center px-8 shrink-0 relative z-30 shadow-sm">
          <div className="flex-1 font-bold text-gray-800 flex items-center gap-3">
            {settings ? (
              <span className="bg-green-50 text-brand px-2.5 py-1 rounded-md text-xs border border-green-100 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-brand" />
                {statusLabel(settings.status)}
              </span>
            ) : null}
            <span className="tracking-tight">{projectName}</span>
          </div>

          <div className="flex items-center gap-5 relative">
            {settings?.members.length ? (
              <div className="hidden md:flex items-center mr-4 pr-5 border-r border-gray-200">
                <div className="flex -space-x-2.5 hover:-space-x-1 transition-all duration-300">
                  {settings.members.slice(0, 4).map((member) => (
                    <UserAvatar
                      key={member.memberId}
                      name={memberName(member)}
                      imageUrl={member.profileImage}
                      className="w-8 h-8 border-2 border-white bg-gray-100 shadow-sm hover:z-10 transition-transform hover:scale-110"
                      iconClassName="text-xs"
                    />
                  ))}
                </div>
              </div>
            ) : null}

            {session ? (
              <button type="button" onClick={handleLogout} className="text-[11px] font-bold text-gray-400 hover:text-gray-700 transition">
                로그아웃
              </button>
            ) : (
              <button type="button" onClick={() => setAuthView('login')} className="text-[11px] font-bold text-brand hover:text-green-700 transition">
                로그인
              </button>
            )}
          </div>
        </header>

        <main className="squad-settings-main flex-1 flex overflow-hidden relative">
          <div className="squad-settings-menu w-64 bg-white border-r border-gray-100 flex flex-col shrink-0 z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
            <div className="p-6 pb-4 border-b border-gray-50">
              <h2 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
                <i className="fas fa-cog text-brand" />
                환경 설정
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {settingsTabs.map((tab) => {
                const danger = tab.id === 'danger'
                const active = activeTab === tab.id
                const className = [
                  'squad-settings-tab-button',
                  active ? 'is-active' : '',
                  danger ? 'is-danger' : '',
                ].filter(Boolean).join(' ')

                return (
                  <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={className}>
                    <i className={`${tab.icon} w-4 text-center`} />
                    {tab.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="squad-settings-content flex-1 overflow-y-auto custom-scrollbar p-8 lg:p-12 bg-[#F9FAFB]">
            <div className="max-w-4xl mx-auto pb-20">
              {loading ? (
                <StateCard icon="fas fa-spinner fa-spin" message="스쿼드 설정을 불러오는 중입니다." />
              ) : error ? (
                <StateCard icon="fas fa-circle-exclamation text-red-500" message={error} />
              ) : settings ? (
                <>
                  {activeTab === 'general' ? (
                    <GeneralPanel
                      settings={settings}
                      form={form}
                      saving={saving}
                      canManage={canManage}
                      onFormChange={setForm}
                      onSave={saveGeneral}
                    />
                  ) : null}
                  {activeTab === 'members' ? (
                    <MembersPanel settings={settings} currentUserId={session?.userId ?? null} />
                  ) : null}
                  {activeTab === 'integrations' ? (
                    <IntegrationsPanel
                      integrations={integrations}
                      canManage={canManage}
                      busyIntegration={busyIntegration}
                      syncingGithub={syncingGithub}
                      githubRepositoryUrl={githubRepositoryUrl}
                      onGithubRepositoryUrlChange={setGithubRepositoryUrl}
                      onToggle={toggleIntegration}
                      onSyncGithub={syncGithubPullRequests}
                    />
                  ) : null}
                  {activeTab === 'danger' ? (
                    <DangerPanel
                      settings={settings}
                      canManage={canManage}
                      saving={dangerSaving}
                      onArchiveToggle={toggleArchive}
                      onDeleteOpen={() => setDeleteModalOpen(true)}
                    />
                  ) : null}
                </>
              ) : null}
            </div>
          </div>
        </main>
      </div>

      {deleteModalOpen && settings ? (
        <DeleteModal
          settings={settings}
          saving={dangerSaving}
          confirmValue={deleteConfirm}
          onConfirmChange={setDeleteConfirm}
          onClose={() => {
            setDeleteModalOpen(false)
            setDeleteConfirm('')
          }}
          onDelete={deleteWorkspace}
        />
      ) : null}

      {authView ? (
        <AuthModal
          view={authView}
          onClose={() => setAuthView(null)}
          onViewChange={setAuthView}
          onAuthenticated={handleAuthenticated}
        />
      ) : null}
    </div>
  )
}

function StateCard({ icon, message }: { icon: string; message: string }) {
  return (
    <div className="squad-settings-card bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
      <i className={`${icon} text-2xl mb-4`} />
      <p className="text-sm font-bold text-gray-600">{message}</p>
    </div>
  )
}

function GeneralPanel({
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
    <section className="space-y-8 fade-in">
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
        <div className="squad-settings-card bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              스쿼드 이름 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="squad-settings-input w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-brand transition shadow-sm disabled:bg-gray-50 disabled:text-gray-400"
              value={form.name}
              disabled={!canManage || saving}
              onChange={(event) => onFormChange({ ...form, name: event.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">상세 설명</label>
            <textarea
              className="squad-settings-textarea w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand transition shadow-sm h-24 custom-scrollbar resize-none disabled:bg-gray-50 disabled:text-gray-400"
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
            className="squad-settings-primary-action px-8 py-3 bg-gray-900 text-white font-bold rounded-xl text-sm hover:bg-black transition shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <i className={saving ? 'fas fa-spinner fa-spin' : 'fas fa-save'} />
            변경사항 저장
          </button>
        </div>
      </form>
    </section>
  )
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="squad-settings-info-tile bg-gray-50 rounded-xl px-4 py-3">
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm font-extrabold text-gray-900">{value}</p>
    </div>
  )
}

function MembersPanel({
  settings,
  currentUserId,
}: {
  settings: WorkspaceSettings
  currentUserId: number | null
}) {
  return (
    <section className="space-y-8 fade-in">
      <div className="flex justify-between items-end">
        <div>
          <h3 className="text-xl font-black text-gray-900 mb-1">팀원 관리</h3>
          <p className="text-sm text-gray-500 font-medium">참여 중인 팀원을 관리하고 권한을 부여합니다.</p>
        </div>
      </div>

      <div className="squad-settings-card bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
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

function IntegrationsPanel({
  integrations,
  canManage,
  busyIntegration,
  syncingGithub,
  githubRepositoryUrl,
  onGithubRepositoryUrlChange,
  onToggle,
  onSyncGithub,
}: {
  integrations: ExternalIntegration[]
  canManage: boolean
  busyIntegration: IntegrationProvider | null
  syncingGithub: boolean
  githubRepositoryUrl: string
  onGithubRepositoryUrlChange: (value: string) => void
  onToggle: (provider: IntegrationProvider, forcedActive?: boolean) => void
  onSyncGithub: () => void
}) {
  return (
    <section className="space-y-8 fade-in">
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
            <div key={provider} className="squad-settings-card bg-white rounded-2xl shadow-sm border border-gray-100 p-6 relative overflow-hidden group hover:border-gray-300 transition">
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
                      className={`squad-settings-integration-action py-2 text-xs font-bold rounded-lg transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${active ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : meta.button}`}
                    >
                      {busy ? '연결 중' : active ? (githubRepositoryChanged ? '저장/동기화' : '다시 연결') : '연동하기'}
                    </button>
                    <button
                      type="button"
                      disabled={!canManage || !active || busy || syncingGithub}
                      onClick={() => onToggle(provider, false)}
                      className="squad-settings-integration-action rounded-lg border border-gray-200 bg-white py-2 text-xs font-bold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      연동 끄기
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={!canManage || !active || busy || syncingGithub}
                    onClick={onSyncGithub}
                    className="squad-settings-integration-action w-full rounded-lg border border-gray-200 bg-white py-2 text-xs font-bold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {syncingGithub ? '동기화 중' : 'GitHub PR만 다시 동기화'}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={!canManage || busy}
                  onClick={() => onToggle(provider)}
                  className={`squad-settings-integration-action w-full py-2 text-xs font-bold rounded-lg transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${active ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : meta.button}`}
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

function DangerPanel({
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
    <section className="space-y-8 fade-in">
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
          <button type="button" disabled={!canManage || saving} onClick={onArchiveToggle} className="squad-settings-danger-action px-5 py-2.5 bg-white border border-gray-300 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-50 transition shadow-sm shrink-0 disabled:opacity-50 disabled:cursor-not-allowed">
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
          <button type="button" disabled={!canManage || saving} onClick={onDeleteOpen} className="squad-settings-danger-action px-5 py-2.5 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 transition shadow-sm shrink-0 disabled:opacity-50 disabled:cursor-not-allowed">
            스쿼드 삭제하기
          </button>
        </div>
      </div>
    </section>
  )
}

function DeleteModal({
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
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl relative overflow-hidden flex flex-col p-8 fade-in border-t-8 border-red-500">
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
