import { useAuthSession } from '../../lib/useAuthSession'
import { type FormEvent, useEffect, useMemo, useState } from 'react'
import AuthModal, { type AuthView } from '../../components/AuthModal'
import SquadWorkspaceAside from '../../components/SquadWorkspaceAside'
import UserAvatar from '../../components/UserAvatar'
import { clearStoredAuthSession, getPostLoginRedirect, readStoredAuthSession } from '../../lib/auth-session'
import { navigateTo } from '../../lib/spa-navigation'
import { showAuthToast } from '../../lib/auth-toast'
import { projectApiRequest } from '../project/api'
import { createSquadNotification, squadActorName } from './notifications'
import { readWorkspaceIdFromLocation as getWorkspaceIdFromUrl } from '../../lib/location-state'
import { DangerPanel, DeleteModal, GeneralPanel, IntegrationsPanel, MembersPanel, StateCard } from './SquadSettingsPanels'

import type {
  ExternalIntegration,
  IntegrationProvider,
  SettingsForm,
  SettingsTab,
  WorkspaceMember,
  WorkspaceSettings,
  WorkspaceStatus,
} from './settings-types'

const settingsTabs: Array<{ id: SettingsTab; label: string; icon: string }> = [
  { id: 'general', label: '일반 설정', icon: 'fas fa-sliders-h' },
  { id: 'members', label: '팀원 관리', icon: 'fas fa-users' },
  { id: 'integrations', label: '외부 연동 (API)', icon: 'fas fa-plug' },
  { id: 'danger', label: '위험 구역', icon: 'fas fa-exclamation-triangle' },
]

function createForm(settings: WorkspaceSettings | null): SettingsForm {
  return {
    name: settings?.name ?? '',
    description: settings?.description ?? '',
  }
}

function memberName(member: WorkspaceMember) {
  return member.learnerName?.trim() || '팀원'
}

function statusLabel(status: WorkspaceStatus) {
  return status === 'ARCHIVED' ? '보관됨' : '진행 중'
}

function isIntegrationActive(integration?: ExternalIntegration) {
  return Boolean(integration?.active ?? integration?.isActive)
}

export default function SquadSettingsApp() {
  const workspaceId = useMemo(() => getWorkspaceIdFromUrl(), [])
  const [session,setSession] = useAuthSession()
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
  const [githubToken, setGithubToken] = useState('')
  const [dangerSaving, setDangerSaving] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')

  useEffect(() => {
    document.title = 'DevPath - 스쿼드 설정'
    const html = document.documentElement
    const body = document.body
    const root = document.getElementById('root')
    const appViewport = document.querySelector<HTMLElement>('.app-viewport')
    html.classList.add('h-full!', 'overflow-hidden!')
    body.classList.add('h-dvh!', 'min-h-0!', 'overflow-hidden!')
    root?.classList.add('h-dvh!', 'min-h-0!', 'overflow-hidden!')
    appViewport?.classList.add('h-dvh!', 'min-h-0!', 'overflow-hidden!')

    return () => {
      html.classList.remove('h-full!', 'overflow-hidden!')
      body.classList.remove('h-dvh!', 'min-h-0!', 'overflow-hidden!')
      root?.classList.remove('h-dvh!', 'min-h-0!', 'overflow-hidden!')
      appViewport?.classList.remove('h-dvh!', 'min-h-0!', 'overflow-hidden!')
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
              ? {
                  isActive: nextActive,
                  repositoryUrl,
                  ...(githubToken.trim() ? { githubToken: githubToken.trim() } : {}),
                }
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
        setGithubToken('')
      }
      notifySettingsChange(`${provider} 연동을 ${nextActive ? '켰습니다.' : '껐습니다.'}`)
      showAuthToast(
        provider === 'GITHUB' && nextActive
          ? updated.lastSyncMessage ?? 'GitHub 저장소를 연결했습니다.'
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
      navigateTo('/workspace-hub', { replace: true })
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : '스쿼드를 삭제하지 못했습니다.'
      showAuthToast({ message, variant: 'error' })
      setDangerSaving(false)
    }
  }

  const canManage = Boolean(settings?.canManage)
  const projectName = settings?.name ?? '스쿼드 설정'

  return (
    <div className="squad-dashboard-page squad-settings-page flex h-screen overflow-hidden bg-[#F8F9FA]! font-['Pretendard',sans-serif] text-gray-800 [&_.squad-settings-fade-in]:[animation:squadDashboardFadeIn_0.4s_ease-in-out_forwards]">
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

        <main className="squad-settings-main relative flex flex-1 overflow-hidden font-['Pretendard',sans-serif] [&_button]:[font-family:inherit] [&_input]:[font-family:inherit] [&_select]:[font-family:inherit] [&_textarea]:[font-family:inherit]">
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
                  'squad-settings-tab-button flex w-full min-h-[44px] cursor-pointer items-center gap-[0.75rem] whitespace-nowrap rounded-[0.75rem] border-0 bg-transparent px-[1rem] py-0 text-left text-[14px]! leading-[20px]! font-bold text-[#4B5563] box-border [transition:background-color_0.2s_ease,color_0.2s_ease] hover:bg-[#F9FAFB]',
                  active && !danger ? 'is-active bg-[#F3F4F6]! text-[#00C471]!' : '',
                  danger ? `is-danger text-[#EF4444]! hover:bg-[#FEF2F2]! hover:text-[#DC2626]! ${active ? 'is-active bg-[#FEF2F2]! text-[#DC2626]!' : ''}` : '',
                ].filter(Boolean).join(' ')

                return (
                  <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={className}>
                    <i className={`${tab.icon} w-[16px] flex-[0_0_16px] text-center leading-[20px]!`} />
                    {tab.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="squad-settings-content custom-scrollbar flex-1 overflow-y-auto bg-[#F9FAFB] p-8 lg:p-12">
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
                      githubToken={githubToken}
                      onGithubRepositoryUrlChange={setGithubRepositoryUrl}
                      onGithubTokenChange={setGithubToken}
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
