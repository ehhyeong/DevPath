import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import AuthModal, { type AuthView } from '../components/AuthModal'
import SiteHeader from '../components/SiteHeader'
import { authApi, roadmapApi, userApi } from '../lib/api'
import { showAuthToast } from '../lib/auth-toast'
import {
  AUTH_SESSION_SYNC_EVENT,
  clearStoredAuthSession,
  getPostLoginRedirect,
  readStoredAuthSession,
} from '../lib/auth-session'
import { useInternalPageScroll } from '../lib/useInternalPageScroll'
import { getRoadmapHubIconClass } from '../lib/roadmap-icons'
import type { RoadmapHubCatalog, RoadmapHubItem } from '../types/roadmap-hub'

type RoadmapHubSection = RoadmapHubCatalog['sections'][number]

function buildRoadmapHref(linkedRoadmapId: number | null) {
  return linkedRoadmapId ? `/roadmap?original=${linkedRoadmapId}` : null
}

function getIconStyle(iconColor: string | null): CSSProperties | undefined {
  const color = iconColor?.trim()

  return color ? { color } : undefined
}

function getHubCategory(category: string | null) {
  return category?.trim() || ''
}

function isTabbedRoadmapSection(section: RoadmapHubSection) {
  return section.layoutType === 'CARD_GRID' || section.layoutType === 'CHIP_GRID'
}

function buildHubCategoryGroups(items: RoadmapHubItem[]) {
  const hasCategory = items.some((item) => getHubCategory(item.category))

  if (!hasCategory) {
    return []
  }

  const groups = new Map<string, RoadmapHubItem[]>()

  items.forEach((item) => {
    const category = getHubCategory(item.category) || '기타'
    groups.set(category, [...(groups.get(category) ?? []), item])
  })

  return Array.from(groups.entries()).map(([category, categoryItems]) => ({
    category,
    items: categoryItems,
  }))
}

function RoadmapHubCategoryGroup({
  category,
  children,
  variant,
}: {
  category: string
  children: ReactNode
  variant: 'card' | 'chip'
}) {
  const headingClassName =
    variant === 'card'
      ? 'roadmap-hub-category-title roadmap-hub-category-title--card text-lg font-bold text-gray-700'
      : 'roadmap-hub-category-title roadmap-hub-category-title--chip text-base font-bold text-gray-700'

  return (
    <div className="roadmap-hub-category-group">
      <h3 className={headingClassName}>{category}</h3>
      {children}
    </div>
  )
}

function RoadmapHubSectionTabs({
  sections,
  activeSectionKey,
  onSelect,
}: {
  sections: RoadmapHubSection[]
  activeSectionKey: string
  onSelect: (sectionKey: string) => void
}) {
  return (
    <div className="roadmap-hub-section-tabs mb-12 flex justify-center border-b border-gray-200">
      {sections.map((section) => (
        <button
          key={section.sectionKey}
          type="button"
          onClick={() => onSelect(section.sectionKey)}
          className={
            activeSectionKey === section.sectionKey
              ? 'roadmap-hub-section-tab roadmap-hub-section-tab--active'
              : 'roadmap-hub-section-tab'
          }
        >
          {section.title}
        </button>
      ))}
    </div>
  )
}

function RoadmapHubSectionContent({ section }: { section: RoadmapHubSection }) {
  const groups = buildHubCategoryGroups(section.items)
  const isChipGrid = section.layoutType === 'CHIP_GRID'
  const variant = isChipGrid ? 'chip' : 'card'
  const gridClassName = isChipGrid
    ? 'grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6'
    : 'roadmap-hub-card-grid grid grid-cols-1 items-start gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
  const renderItem = isChipGrid ? renderSkillChip : renderRoleCard

  if (groups.length > 0) {
    return (
      <div className="roadmap-hub-tab-panel space-y-10">
        {groups.map((group) => (
          <RoadmapHubCategoryGroup key={group.category} category={group.category} variant={variant}>
            <div className={gridClassName}>{group.items.map(renderItem)}</div>
          </RoadmapHubCategoryGroup>
        ))}
      </div>
    )
  }

  return <div className={gridClassName}>{section.items.map(renderItem)}</div>
}

function readAuthViewFromLocation(): AuthView | null {
  const value = new URLSearchParams(window.location.search).get('auth')

  return value === 'login' || value === 'signup' ? value : null
}

function syncAuthViewInLocation(view: AuthView | null) {
  const url = new URL(window.location.href)

  if (view) {
    url.searchParams.set('auth', view)
  } else {
    url.searchParams.delete('auth')
  }

  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
}

function renderRoleCard(item: RoadmapHubItem) {
  const href = buildRoadmapHref(item.linkedRoadmapId)
  const iconClass = getRoadmapHubIconClass(item, 'fas fa-map')
  const iconStyle = getIconStyle(item.iconColor)
  const cardClassName = item.featured
    ? 'roadmap-hub-card relative overflow-hidden rounded-lg border-2 border-brand bg-green-50/30 p-5 shadow-md'
    : 'roadmap-hub-card rounded-lg border border-gray-200 p-5 shadow-sm'

  const content = (
    <>
      <div className={item.featured ? 'relative mb-2 flex justify-between' : 'mb-2 flex justify-between'}>
        <h3 className={item.featured ? 'font-bold text-brand' : 'font-bold text-gray-900'}>{item.title}</h3>
        <i className={`${iconClass} ${item.featured ? 'text-brand' : 'text-gray-400'}`} style={iconStyle} />
      </div>
      <p className={item.featured ? 'relative text-xs text-gray-500' : 'text-xs text-gray-500'}>
        {item.subtitle || '공식 로드맵'}
        {item.featured ? (
          <span className="ml-1 font-bold text-brand">(추천)</span>
        ) : null}
      </p>
      {item.featured ? <div className="absolute top-2 right-2 h-2 w-2 animate-ping rounded-full bg-red-500" /> : null}
    </>
  )

  if (!href) {
    return (
      <div key={`${item.title}-${item.sortOrder}`} className={`${cardClassName} cursor-default opacity-70`}>
        {content}
      </div>
    )
  }

  return (
    <a key={`${item.title}-${item.sortOrder}`} href={href} className={cardClassName}>
      {content}
    </a>
  )
}

function renderSkillChip(item: RoadmapHubItem) {
  const href = buildRoadmapHref(item.linkedRoadmapId)
  const chipKey = `${item.title}-${item.sortOrder}`
  const iconClass = getRoadmapHubIconClass(item, 'fas fa-code')
  const iconStyle = getIconStyle(item.iconColor)
  const className = 'skill-btn rounded border border-gray-200 px-4 py-2 text-left text-sm text-gray-700 shadow-sm'
  const content = (
    <span className="flex min-w-0 items-center gap-2">
      <i className={`${iconClass} w-5 shrink-0 text-center text-base opacity-80`} style={iconStyle} aria-hidden="true" />
      <span className="min-w-0 leading-snug">{item.title}</span>
    </span>
  )

  if (!href) {
    return (
      <button key={chipKey} type="button" className={`${className} cursor-default`}>
        {content}
      </button>
    )
  }

  return (
    <a key={chipKey} href={href} className={className}>
      {content}
    </a>
  )
}

function renderLinkListItem(item: RoadmapHubItem) {
  const href = buildRoadmapHref(item.linkedRoadmapId)
  const itemKey = `${item.title}-${item.sortOrder}`

  if (!href) {
    return (
      <li key={itemKey}>
        <div className="roadmap-hub-link-row flex justify-between rounded border border-gray-200 bg-white p-3 shadow-sm">
          <span>{item.title}</span>
          <i className="fas fa-chevron-right mt-1.5 text-xs text-gray-300" />
        </div>
      </li>
    )
  }

  return (
    <li key={itemKey}>
      <a
        href={href}
        className="roadmap-hub-link-row flex justify-between rounded border border-gray-200 bg-white p-3 shadow-sm transition hover:bg-gray-50"
      >
        <span>{item.title}</span>
        <i className="fas fa-chevron-right mt-1.5 text-xs text-gray-400" />
      </a>
    </li>
  )
}

function SectionHeading({
  accentClassName,
  title,
  compact = false,
}: {
  accentClassName: string
  title: string
  compact?: boolean
}) {
  return (
    <div className={`${compact ? 'mb-2' : 'mb-8'} flex items-center gap-4`}>
      <span className={`h-8 w-1 rounded-full ${accentClassName}`} />
      <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
    </div>
  )
}

function LinkSection({
  iconClassName,
  iconToneClassName,
  title,
  items,
}: {
  iconClassName: string
  iconToneClassName: string
  title: string
  items: RoadmapHubItem[]
}) {
  return (
    <section>
      <h2 className="mb-4 flex items-center gap-2 border-b border-gray-200 pb-2 text-xl font-bold text-gray-900">
        <i className={`${iconClassName} ${iconToneClassName}`} /> {title}
      </h2>
      <ul className="space-y-2">{items.map(renderLinkListItem)}</ul>
    </section>
  )
}

function RoadmapHubSections({
  catalog,
  loading,
  error,
  onRetry,
}: {
  catalog: RoadmapHubCatalog | null
  loading: boolean
  error: string | null
  onRetry: () => void
}) {
  const [activeSectionKey, setActiveSectionKey] = useState<string | null>(null)

  if (loading) {
    return (
      <div className="rounded-3xl border border-gray-200 bg-white px-6 py-16 text-center text-sm text-gray-500 shadow-sm">
        <i className="fas fa-circle-notch mr-2 animate-spin" />
        로드맵 허브 구성을 불러오는 중입니다.
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 px-6 py-12 text-center shadow-sm">
        <p className="text-sm font-semibold text-rose-600">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="roadmap-hub-retry-button mt-4 rounded-full border border-rose-200 bg-white px-5 py-2 text-sm font-bold text-rose-600 transition hover:bg-rose-50"
        >
          다시 불러오기
        </button>
      </div>
    )
  }

  const sections = catalog?.sections ?? []
  const tabSections = sections.filter(isTabbedRoadmapSection)
  const linkSections = sections.filter((section) => section.layoutType === 'LINK_LIST')
  const resolvedActiveSectionKey =
    tabSections.find((section) => section.sectionKey === activeSectionKey)?.sectionKey ?? tabSections[0]?.sectionKey ?? ''
  const activeSection =
    tabSections.find((section) => section.sectionKey === resolvedActiveSectionKey) ?? tabSections[0] ?? null
  const showTabs = tabSections.length > 1

  return (
    <>
      {activeSection ? (
        <section key={activeSection.sectionKey}>
          {showTabs ? (
            <RoadmapHubSectionTabs
              sections={tabSections}
              activeSectionKey={resolvedActiveSectionKey}
              onSelect={setActiveSectionKey}
            />
          ) : (
            <SectionHeading
              accentClassName={activeSection.layoutType === 'CHIP_GRID' ? 'bg-yellow-400' : 'bg-brand'}
              title={activeSection.title}
              compact={buildHubCategoryGroups(activeSection.items).length > 0}
            />
          )}
          <RoadmapHubSectionContent section={activeSection} />
        </section>
      ) : null}

      {linkSections.length > 0 ? (
        <div className={`grid grid-cols-1 gap-12 ${linkSections.length > 1 ? 'md:grid-cols-2' : ''}`}>
          {linkSections.map((section, index) => (
            <LinkSection
              key={section.sectionKey}
              iconClassName={index === 0 ? 'fas fa-lightbulb' : 'fas fa-check-circle'}
              iconToneClassName={index === 0 ? 'text-yellow-400' : 'text-brand'}
              title={section.title}
              items={section.items}
            />
          ))}
        </div>
      ) : null}
    </>
  )
}

function RoadmapHubPage() {
  useInternalPageScroll()

  const [session, setSession] = useState(() => readStoredAuthSession())
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [authView, setAuthView] = useState<AuthView | null>(() => readAuthViewFromLocation())
  const [catalog, setCatalog] = useState<RoadmapHubCatalog | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    document.title = 'DevPath - 개발자 로드맵'
  }, [])

  useEffect(() => {
    const syncSession = () => {
      setSession(readStoredAuthSession())
    }

    window.addEventListener('storage', syncSession)
    window.addEventListener(AUTH_SESSION_SYNC_EVENT, syncSession)
    syncSession()

    return () => {
      window.removeEventListener('storage', syncSession)
      window.removeEventListener(AUTH_SESSION_SYNC_EVENT, syncSession)
    }
  }, [])

  useEffect(() => {
    syncAuthViewInLocation(authView)
  }, [authView])

  useEffect(() => {
    if (!session) {
      setProfileImage(null)
      return
    }

    const controller = new AbortController()

    userApi
      .getMyProfile(controller.signal)
      .then((profile) => {
        setProfileImage(profile.profileImage)
      })
      .catch(() => {
        setProfileImage(null)
      })

    return () => {
      controller.abort()
    }
  }, [session])

  useEffect(() => {
    const abortController = new AbortController()

    const loadHubCatalog = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await roadmapApi.getHubCatalog(abortController.signal)
        setCatalog(response)
      } catch (loadError) {
        if (abortController.signal.aborted) {
          return
        }

        setError(loadError instanceof Error ? loadError.message : '로드맵 허브를 불러오지 못했습니다.')
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false)
        }
      }
    }

    void loadHubCatalog()

    return () => {
      abortController.abort()
    }
  }, [])

  async function handleLogout() {
    const currentSession = readStoredAuthSession()

    try {
      if (currentSession?.refreshToken) {
        await authApi.logout(currentSession.refreshToken)
      }
    } catch {
      // 서버 로그아웃이 실패해도 브라우저 세션은 정리한다.
    } finally {
      clearStoredAuthSession()
      setSession(null)
      setProfileImage(null)
    }
  }

  function openAuthModal(view: AuthView) {
    setAuthView(view)
  }

  function closeAuthModal() {
    setAuthView(null)
  }

  function handleAuthenticated() {
    const nextSession = readStoredAuthSession()

    if (nextSession?.role === 'ROLE_ADMIN') {
      window.location.replace(getPostLoginRedirect(nextSession.role))
      return
    }

    setSession(nextSession)
    closeAuthModal()
  }

  function retryLoadHubCatalog() {
    setLoading(true)
    setError(null)

    void roadmapApi
      .getHubCatalog()
      .then((response) => {
        setCatalog(response)
      })
      .catch((retryError) => {
        setError(retryError instanceof Error ? retryError.message : '로드맵 허브를 불러오지 못했습니다.')
      })
      .finally(() => {
        setLoading(false)
      })
  }

  return (
    <div className="roadmap-hub-page flex h-screen min-h-0 flex-col overflow-hidden bg-gray-50 text-gray-900">
      <SiteHeader
        session={session}
        profileImage={profileImage}
        onLogout={handleLogout}
        onLoginClick={() => openAuthModal('login')}
        activeNavHref="/roadmap-hub"
      />

      <main className="app-main flex-1">
        <div className="roadmap-hub-body-zoom">
          <header className="border-b border-gray-100 bg-gradient-to-b from-white to-gray-50 px-4 py-20 text-center">
          <h1 className="roadmap-hub-hero-title mb-6 text-4xl font-bold text-gray-900 md:text-6xl">
            <span className="bg-gradient-to-r from-purple-600 to-green-500 bg-clip-text text-transparent">
              개발자 로드맵
            </span>
          </h1>
          <p className="roadmap-hub-hero-copy mx-auto mb-10 max-w-3xl text-lg leading-relaxed text-gray-500">
            <span className="font-bold text-brand">DevPath</span>는 개발자들의 학습 방향을 잡을 수 있도록 정리합니다.
            <br />
            역할과 기술별로 정리된 로드맵을 확인하고 성장 흐름을 바로 시작해 보세요.
          </p>
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  if (!session) {
                    showAuthToast('로그인 후 이용할 수 있습니다.')
                    return
                  }
                  window.location.href = '/my-roadmap-list'
                }}
                className="roadmap-hub-hero-button group relative flex items-center justify-center gap-3 rounded-full bg-brand px-8 py-4 font-bold text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:bg-green-600 hover:shadow-xl"
              >
                <i className="fas fa-list-ul" />
                <span className="text-lg">내 로드맵 관리</span>
                <i className="fas fa-arrow-right transition-transform group-hover:translate-x-1" />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!session) {
                    showAuthToast('로그인 후 이용할 수 있습니다.')
                    return
                  }
                  roadmapApi.getMyRoadmaps().then((list) => {
                    if (list.roadmaps.length === 0) {
                      showAuthToast('아직 학습 로드맵이 없습니다. 아래에서 로드맵을 선택해 시작해보세요.')
                    } else {
                      window.location.href = '/roadmap'
                    }
                  }).catch(() => {
                    showAuthToast('로드맵 정보를 불러오는 데 실패했습니다. 다시 시도해주세요.')
                  })
                }}
                className="roadmap-hub-hero-button group relative flex items-center justify-center gap-3 rounded-full bg-gray-800 px-8 py-4 font-bold text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:bg-gray-900 hover:shadow-xl"
              >
                <span className="text-lg">최근 학습한 로드맵 이어가기</span>
                <i className="fas fa-arrow-right transition-transform group-hover:translate-x-1" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                window.location.href = '/my-roadmap'
              }}
              className="roadmap-hub-hero-button group relative flex items-center justify-center gap-3 rounded-full border-2 border-brand bg-white px-8 py-4 font-bold text-brand shadow-sm transition-all duration-300 hover:-translate-y-1 hover:bg-green-50 hover:shadow-md"
            >
              <div className="h-2 w-2 animate-pulse rounded-full bg-brand" />
              <span className="text-lg">나만의 로드맵 만들기</span>
              <i className="fas fa-pen-ruler ml-1 transition-transform group-hover:rotate-12" />
            </button>
          </div>
        </header>

        <div className="mx-auto mt-12 max-w-7xl space-y-20 px-6 pb-32">
          <RoadmapHubSections
            catalog={catalog}
            loading={loading}
            error={error}
            onRetry={retryLoadHubCatalog}
          />
          </div>
        </div>
      </main>

      {authView ? (
        <AuthModal
          view={authView}
          onClose={closeAuthModal}
          onViewChange={setAuthView}
          onAuthenticated={handleAuthenticated}
        />
      ) : null}
    </div>
  )
}

export default RoadmapHubPage
