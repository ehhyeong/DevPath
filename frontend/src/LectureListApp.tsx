import { startTransition, useDeferredValue, useEffect, useRef, useState } from 'react'
import AuthModal, { type AuthView } from './components/AuthModal'
import SiteHeader from './components/SiteHeader'
import {
  fallbackLectureCourses,
  formatCoursePrice,
  getCourseDisplayPrice,
  getOverviewCategoryKey,
  isFreeCourse,
  matchesLectureTag,
  normalizeLectureCategoryConfigs,
  normalizeLectureCourses,
  sortLectureCourses,
  type LectureCategoryKey,
  type LectureDifficultyFilter,
  type LecturePriceFilter,
  type LectureSortKey,
} from './lecture-list-support'
import { authApi, courseApi, userApi, wishlistApi } from './lib/api'
import { AUTH_SESSION_SYNC_EVENT, clearStoredAuthSession, readStoredAuthSession } from './lib/auth-session'
import { useInternalPageScroll } from './lib/useInternalPageScroll'
import type { CourseCatalogMenu } from './types/course-catalog'

const COURSES_PER_PAGE = 8

function readAuthViewFromLocation(): AuthView | null {
  const value = new URLSearchParams(window.location.search).get('auth')
  return value === 'login' || value === 'signup' ? value : null
}

function readNodeTagsFromLocation(): string[] {
  const raw = new URLSearchParams(window.location.search).get('tags')
  return raw ? raw.split(',').map(t => t.trim()).filter(Boolean) : []
}

function syncAuthViewInLocation(view: AuthView | null) {
  const url = new URL(window.location.href)
  if (view) url.searchParams.set('auth', view)
  else url.searchParams.delete('auth')
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
}

function LoadingCards() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="aspect-video animate-pulse bg-gray-200" />
          <div className="space-y-3 p-4">
            <div className="h-3 w-24 animate-pulse rounded-full bg-gray-200" />
            <div className="h-4 w-full animate-pulse rounded-full bg-gray-200" />
            <div className="h-4 w-2/3 animate-pulse rounded-full bg-gray-200" />
            <div className="h-8 w-full animate-pulse rounded-lg bg-gray-100" />
          </div>
        </div>
      ))}
    </div>
  )
}

function buildEmptyCatalogMenu(): CourseCatalogMenu {
  return { categories: [] }
}

function getCourseInstructorLabel(course: { instructorName: string; instructorChannelName: string | null }) {
  const instructorName = course.instructorName?.trim()
  if (instructorName) {
    return instructorName
  }

  const channelName = course.instructorChannelName?.trim()
  if (channelName) {
    return channelName
  }

  return '강사'
}

function getCourseDisplayTitle(title: string) {
  const normalizedTitle = title.trim()
  if (normalizedTitle.startsWith('로드맵 실전: ')) {
    return normalizedTitle.slice('로드맵 실전: '.length)
  }

  return normalizedTitle
}

export default function LectureListApp() {
  useInternalPageScroll()

  const [session, setSession] = useState(() => readStoredAuthSession())
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [authView, setAuthView] = useState<AuthView | null>(() => readAuthViewFromLocation())
  const [rawCourses, setRawCourses] = useState(fallbackLectureCourses)
  const [catalogMenu, setCatalogMenu] = useState<CourseCatalogMenu>(() => buildEmptyCatalogMenu())
  const [loadingCourses, setLoadingCourses] = useState(true)
  const [loadingCatalogMenu, setLoadingCatalogMenu] = useState(true)
  const [catalogMenuError, setCatalogMenuError] = useState<string | null>(null)
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<LectureCategoryKey>('all')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [difficultyFilter, setDifficultyFilter] = useState<LectureDifficultyFilter>('ALL')
  const [priceFilter, setPriceFilter] = useState<LecturePriceFilter>('ALL')
  const [onlyFree, setOnlyFree] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortKey, setSortKey] = useState<LectureSortKey>('recommended')
  const [megaMenuOpen, setMegaMenuOpen] = useState(false)
  const [pendingBookmarkCourseId, setPendingBookmarkCourseId] = useState<number | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [nodeTagsFilter, setNodeTagsFilter] = useState<string[]>(() => readNodeTagsFromLocation())
  const [currentPage, setCurrentPage] = useState(1)
  const listTopRef = useRef<HTMLDivElement | null>(null)
  const deferredSearchTerm = useDeferredValue(searchTerm.trim().toLowerCase())

  const categoryConfigs = normalizeLectureCategoryConfigs(catalogMenu)
  const overviewCategoryKey = getOverviewCategoryKey(categoryConfigs)
  const activeCategory =
    categoryConfigs.find((category) => category.key === selectedCategoryKey)
    ?? categoryConfigs.find((category) => category.key === overviewCategoryKey)
    ?? categoryConfigs[0]
  const desktopMegaMenuCategories = categoryConfigs.filter((category) => category.key !== overviewCategoryKey)
  const normalizedCourses = normalizeLectureCourses(rawCourses, categoryConfigs)
  const filteredCourses = sortLectureCourses(
    normalizedCourses.filter((course) => {
      const matchesCategory = !activeCategory || selectedCategoryKey === overviewCategoryKey || course.categoryKey === selectedCategoryKey
      const matchesDifficulty = difficultyFilter === 'ALL' || course.difficulty === difficultyFilter
      const price = getCourseDisplayPrice(course) ?? 0
      const matchesPrice =
        priceFilter === 'ALL'
        || (priceFilter === 'FREE' && price <= 0)
        || (priceFilter === 'UNDER_50000' && price > 0 && price <= 50000)
        || (priceFilter === 'UNDER_100000' && price > 0 && price <= 100000)
        || (priceFilter === 'OVER_100000' && price > 100000)
      const matchesSearch = !deferredSearchTerm || course.searchIndex.includes(deferredSearchTerm)
      const matchesNodeTags =
        nodeTagsFilter.length === 0
        || nodeTagsFilter.some(tag => course.searchIndex.includes(tag.toLowerCase()))

      return (
        matchesCategory
        && matchesLectureTag(course, selectedCategoryKey, selectedTag, categoryConfigs)
        && matchesDifficulty
        && matchesPrice
        && matchesSearch
        && matchesNodeTags
        && (!onlyFree || isFreeCourse(course))
      )
    }),
    sortKey,
  )
  const totalPages = Math.max(1, Math.ceil(filteredCourses.length / COURSES_PER_PAGE))
  const paginatedCourses = filteredCourses.slice(
    (currentPage - 1) * COURSES_PER_PAGE,
    currentPage * COURSES_PER_PAGE,
  )
  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1)

  useEffect(() => {
    document.title = 'DevPath - 강의 탐색'
  }, [])

  useEffect(() => {
    const syncSession = () => setSession(readStoredAuthSession())
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
      .then((profile) => setProfileImage(profile.profileImage))
      .catch(() => setProfileImage(null))

    return () => controller.abort()
  }, [session])

  // 메뉴 설정과 강의 목록은 서로 독립적으로 불러오고 각각 실패를 처리한다.
  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()

    async function loadCatalogMenu() {
      setLoadingCatalogMenu(true)
      setCatalogMenuError(null)

      try {
        const response = await courseApi.getCatalogMenu(controller.signal)
        if (cancelled) return
        setCatalogMenu(response)
      } catch (error) {
        if (cancelled) return
        setCatalogMenu(buildEmptyCatalogMenu())
        setCatalogMenuError(error instanceof Error ? error.message : '강의 메뉴를 불러오지 못했습니다.')
      } finally {
        if (!cancelled) setLoadingCatalogMenu(false)
      }
    }

    void loadCatalogMenu()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()

    async function loadCourses() {
      setLoadingCourses(true)
      try {
        const response = await courseApi.getCourses(controller.signal)
        if (cancelled) return
        setRawCourses(response.length > 0 ? response : fallbackLectureCourses)
      } catch {
        if (cancelled) return
        setRawCourses(fallbackLectureCourses)
      } finally {
        if (!cancelled) setLoadingCourses(false)
      }
    }

    void loadCourses()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [session?.accessToken])

  useEffect(() => {
    if (!categoryConfigs.length) {
      return
    }

    if (!categoryConfigs.some((category) => category.key === selectedCategoryKey)) {
      setSelectedCategoryKey(overviewCategoryKey)
      setSelectedTag(null)
    }
  }, [categoryConfigs, overviewCategoryKey, selectedCategoryKey])

  useEffect(() => {
    setCurrentPage(1)
  }, [
    selectedCategoryKey,
    selectedTag,
    difficultyFilter,
    priceFilter,
    onlyFree,
    searchTerm,
    sortKey,
    nodeTagsFilter,
  ])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  useEffect(() => {
    if (!toastMessage) return
    const timeoutId = window.setTimeout(() => setToastMessage(null), 2200)
    return () => window.clearTimeout(timeoutId)
  }, [toastMessage])

  async function handleLogout() {
    const currentSession = readStoredAuthSession()

    try {
      if (currentSession?.refreshToken) {
        await authApi.logout(currentSession.refreshToken)
      }
    } catch {
      // 서버 로그아웃이 실패해도 클라이언트 세션은 정리한다.
    } finally {
      clearStoredAuthSession()
      setSession(null)
      setProfileImage(null)
    }
  }

  function openAuthModal(view: AuthView) {
    setAuthView(view)
  }

  function handleAuthenticated() {
    setSession(readStoredAuthSession())
    setAuthView(null)
  }

  function handleSelectCategory(nextKey: LectureCategoryKey) {
    startTransition(() => {
      setSelectedCategoryKey(nextKey)
      setSelectedTag(null)
      setMegaMenuOpen(false)
    })
  }

  function handlePageChange(nextPage: number) {
    setCurrentPage(Math.min(totalPages, Math.max(1, nextPage)))
    listTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function handleCourseOpen(courseId: number) {
    if (!session) {
      openAuthModal('login')
      return
    }

    window.location.href = `course-detail.html?courseId=${courseId}`
  }

  async function handleToggleBookmark(courseId: number) {
    if (!session) {
      openAuthModal('login')
      return
    }

    const target = rawCourses.find((item) => item.courseId === courseId)
    if (!target || pendingBookmarkCourseId === courseId) return

    const nextBookmarked = !(target.isBookmarked ?? false)
    setPendingBookmarkCourseId(courseId)
    setRawCourses((current) => current.map((item) => (
      item.courseId === courseId ? { ...item, isBookmarked: nextBookmarked } : item
    )))

    try {
      if (nextBookmarked) {
        await wishlistApi.addCourse(courseId)
        setToastMessage('찜 목록에 추가했습니다.')
      } else {
        await wishlistApi.removeCourse(courseId)
        setToastMessage('찜 목록에서 제거했습니다.')
      }
    } catch {
      setRawCourses((current) => current.map((item) => (
        item.courseId === courseId ? { ...item, isBookmarked: !nextBookmarked } : item
      )))
      setToastMessage('찜 상태 변경에 실패했습니다.')
    } finally {
      setPendingBookmarkCourseId(null)
    }
  }

  return (
    <div className="flex h-screen min-h-0 flex-col overflow-hidden bg-white text-gray-800">
      <SiteHeader
        session={session}
        profileImage={profileImage}
        onLogout={handleLogout}
        onLoginClick={() => openAuthModal('login')}
        activeNavHref="lecture-list.html"
      />

      <main className="app-main w-full bg-white pb-20">
        <div className="sticky top-16 z-40 border-b border-gray-200 bg-white shadow-sm" onMouseLeave={() => setMegaMenuOpen(false)}>
          <div className="mx-auto max-w-7xl px-6">
            {loadingCatalogMenu ? (
              <div className="flex h-20 items-center text-sm font-medium text-gray-400">강의 메뉴를 불러오는 중입니다.</div>
            ) : categoryConfigs.length > 0 ? (
              <div className="lecture-list-hide-scroll overflow-x-auto">
                <div
                  className="grid h-20 min-w-full text-sm"
                  style={{ gridTemplateColumns: `repeat(${categoryConfigs.length}, minmax(112px, 1fr))` }}
                >
                  {categoryConfigs.map((category) => {
                    const active = selectedCategoryKey === category.key
                    const buttonClassName = `lecture-category-btn ${active ? 'active' : ''}`
                    const isOverviewCategory = category.key === overviewCategoryKey

                    if (isOverviewCategory) {
                      return (
                        <div key={category.key} className="relative h-full" onMouseEnter={() => setMegaMenuOpen(true)}>
                          <button type="button" className={buttonClassName} onClick={() => handleSelectCategory(category.key)}>
                            <i className={`${category.icon} mb-1 text-xl`} />
                            <span>{category.label}</span>
                          </button>
                        </div>
                      )
                    }

                    return (
                      <button key={category.key} type="button" className={buttonClassName} onClick={() => handleSelectCategory(category.key)}>
                        <i className={`${category.icon} mb-1 text-xl`} />
                        <span>{category.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="flex h-20 items-center text-sm font-medium text-gray-400">등록된 강의 메뉴가 없습니다.</div>
            )}
          </div>

          {megaMenuOpen && desktopMegaMenuCategories.length > 0 ? (
            <div className="fixed top-[144px] left-0 right-0 z-50 hidden border-t border-gray-200 bg-white shadow-2xl xl:block">
              <div className="mx-auto max-w-7xl px-6">
                <div
                  className="grid min-h-[400px]"
                  style={{ gridTemplateColumns: `240px repeat(${desktopMegaMenuCategories.length}, minmax(0, 1fr))` }}
                >
                  <div className="flex flex-col justify-center border-r border-gray-100 bg-gray-50 px-8">
                    <h3 className="mb-2 text-base font-bold text-gray-900">전체 카테고리</h3>
                    <p className="text-xs leading-relaxed text-gray-500">원하는 분야를 선택해보세요.</p>
                  </div>

                  {desktopMegaMenuCategories.map((category, index) => (
                    <button
                      key={category.key}
                      type="button"
                      onClick={() => handleSelectCategory(category.key)}
                      className={`flex h-full flex-col px-8 py-7 text-left ${index < desktopMegaMenuCategories.length - 1 ? 'border-r border-gray-100' : ''}`}
                    >
                      <h3 className="mb-4 flex w-full items-center gap-2 border-b-2 border-gray-900 pb-2 text-[15px] font-bold text-gray-900">
                        <i className={`${category.icon} text-brand`} />
                        {category.label}
                      </h3>
                      <ul className="space-y-4 text-[15px] leading-[1.15] text-gray-600">
                        {category.megaMenuItems.map((item) => (
                          <li key={`${category.key}-${item.label}`}>
                            <span className="block transition hover:text-brand hover:font-bold">{item.label}</span>
                          </li>
                        ))}
                      </ul>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="border-b border-gray-200 bg-gray-50 py-6 transition-all duration-300">
          <div className="mx-auto max-w-7xl px-6">
            {catalogMenuError ? (
              <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {catalogMenuError}
              </div>
            ) : null}

            {activeCategory ? (
              <div className="space-y-4">
                {activeCategory.groups.map((group) => (
                  <div key={`${activeCategory.key}-${group.name}`} className="flex flex-col gap-2 border-b border-gray-100 pb-3 last:border-0 sm:flex-row sm:items-start sm:gap-4">
                    <span className="w-28 flex-shrink-0 pt-2 text-xs font-bold text-gray-500">{group.name}</span>
                    <div className="flex flex-wrap gap-2">
                      {group.tags.map((tag) => (
                        <button
                          key={`${group.name}-${tag.name}`}
                          type="button"
                          onClick={() => setSelectedTag((current) => (current === tag.name ? null : tag.name))}
                          className={`lecture-sub-tag ${selectedTag === tag.name ? 'active' : ''}`}
                        >
                          {tag.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="mt-6 flex flex-col items-center justify-between gap-4 border-t border-gray-200 pt-6 md:flex-row">
              <div className="lecture-list-hide-scroll flex w-full items-center gap-3 overflow-x-auto md:w-auto">
                <label className="lecture-filter-select-shell">
                  <select value={difficultyFilter} onChange={(event) => setDifficultyFilter(event.target.value as LectureDifficultyFilter)} className="lecture-filter-select">
                    <option value="ALL">난이도 전체</option>
                    <option value="BEGINNER">입문</option>
                    <option value="INTERMEDIATE">중급</option>
                    <option value="ADVANCED">고급</option>
                  </select>
                  <i className="fas fa-chevron-down lecture-filter-select-icon" />
                </label>
                <label className="lecture-filter-select-shell">
                  <select value={priceFilter} onChange={(event) => setPriceFilter(event.target.value as LecturePriceFilter)} className="lecture-filter-select">
                    <option value="ALL">가격 전체</option>
                    <option value="FREE">무료</option>
                    <option value="UNDER_50000">5만원 이하</option>
                    <option value="UNDER_100000">10만원 이하</option>
                    <option value="OVER_100000">10만원 초과</option>
                  </select>
                  <i className="fas fa-chevron-down lecture-filter-select-icon" />
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={onlyFree} onChange={(event) => setOnlyFree(event.target.checked)} className="h-4 w-4 accent-[#00C471]" />
                  무료만 보기
                </label>
              </div>

              <div className="flex w-full items-center gap-3 md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="강의명 검색"
                    className="w-full rounded-lg border border-gray-300 py-2 pr-4 pl-9 text-sm"
                  />
                  <i className="fas fa-search absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" />
                </div>
                <select value={sortKey} onChange={(event) => setSortKey(event.target.value as LectureSortKey)} className="bg-transparent text-sm font-bold text-gray-700">
                  <option value="recommended">추천순</option>
                  <option value="latest">최신순</option>
                  <option value="priceAsc">가격 낮은순</option>
                  <option value="priceDesc">가격 높은순</option>
                  <option value="title">이름순</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div ref={listTopRef} className="mx-auto max-w-7xl px-6 py-8">
          <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-gray-900">
            <i className="fas fa-layer-group text-brand" />
            <span>{activeCategory?.title ?? '강의 목록'}</span>
            <span className="ml-1 text-sm font-normal text-gray-400">({filteredCourses.length}개)</span>
          </h2>

          {nodeTagsFilter.length > 0 && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
              <i className="fas fa-filter" />
              <span>로드맵 노드 관련 강좌 필터 적용 중: <strong>{nodeTagsFilter.join(', ')}</strong></span>
              <button
                onClick={() => setNodeTagsFilter([])}
                className="ml-auto text-green-600 hover:text-green-800"
              >
                <i className="fas fa-times" /> 필터 해제
              </button>
            </div>
          )}

          {loadingCourses ? <LoadingCards /> : null}

          {!loadingCourses && filteredCourses.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white px-6 py-16 text-center text-sm text-gray-500">
              조건에 맞는 강의가 없습니다.
            </div>
          ) : null}

          {!loadingCourses && filteredCourses.length > 0 ? (
            <>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {paginatedCourses.map((course) => {
                const displayPrice = getCourseDisplayPrice(course)
                const priceLabel = formatCoursePrice(displayPrice)
                const instructorLabel = getCourseInstructorLabel(course)
                const courseTitle = getCourseDisplayTitle(course.title)
                const instructorTooltip =
                  course.instructorChannelName &&
                  course.instructorChannelName.trim() &&
                  course.instructorChannelName !== instructorLabel
                    ? `채널: ${course.instructorChannelName}`
                    : undefined

                return (
                  <div
                    key={course.courseId}
                    className="lecture-course-card group relative cursor-pointer overflow-hidden rounded-xl border border-gray-200 bg-white"
                    onClick={() => handleCourseOpen(course.courseId)}
                  >
                    <div className="relative aspect-video overflow-hidden bg-gray-100">
                      <img
                        src={course.thumbnailUrl ?? 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80'}
                        alt={courseTitle}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                      {course.badge ? (
                        <div className="absolute top-3 left-3">
                          <span className="rounded bg-brand px-2 py-1 text-[10px] font-bold text-white">{course.badge}</span>
                        </div>
                      ) : null}
                      <div className="absolute inset-0 flex items-center justify-center gap-3 bg-black/40 opacity-0 transition duration-200 group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            handleCourseOpen(course.courseId)
                          }}
                          className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg transition hover:bg-brand hover:text-white"
                        >
                          <i className="fas fa-cart-plus" />
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            void handleToggleBookmark(course.courseId)
                          }}
                          disabled={pendingBookmarkCourseId === course.courseId}
                          className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg transition hover:bg-red-500 hover:text-white"
                        >
                          <i className={`${course.isBookmarked ? 'fas' : 'far'} fa-heart`} />
                        </button>
                      </div>
                    </div>

                    <div className="p-4">
                      <div className="mb-1 text-[10px] font-bold text-gray-500">{course.displayCategory}</div>
                      <h3 className="line-clamp-2 h-10 text-sm leading-tight font-bold text-gray-900 transition group-hover:text-brand">{courseTitle}</h3>
                      <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                        <span className="font-medium text-gray-700" title={instructorTooltip}>{instructorLabel}</span>
                        <div className="ml-auto flex text-yellow-400">
                          <i className="fas fa-star" />
                          <i className="fas fa-star" />
                          <i className="fas fa-star" />
                          <i className="fas fa-star" />
                          <i className="fas fa-star-half-alt" />
                        </div>
                        <span>({course.rating.toFixed(1)})</span>
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
                        <div>
                          {course.price !== null && displayPrice !== null && course.price !== displayPrice ? (
                            <div className="text-[11px] text-gray-400 line-through">{formatCoursePrice(course.price)}</div>
                          ) : null}
                          <span className={`text-lg font-bold ${isFreeCourse(course) ? 'text-brand' : 'text-red-500'}`}>{priceLabel}</span>
                        </div>
                        <span className="rounded border border-green-100 bg-green-50 px-1.5 py-0.5 text-[10px] font-bold text-brand">
                          로드맵 연동
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
              </div>

              {totalPages > 1 ? (
                <nav className="mt-10 flex flex-wrap items-center justify-center gap-2" aria-label="강의 목록 페이지">
                  <button
                    type="button"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="h-10 rounded-lg border border-gray-200 px-3 text-sm font-bold text-gray-600 transition hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    이전
                  </button>
                  {pageNumbers.map((pageNumber) => (
                    <button
                      key={pageNumber}
                      type="button"
                      onClick={() => handlePageChange(pageNumber)}
                      aria-current={currentPage === pageNumber ? 'page' : undefined}
                      className={`h-10 min-w-10 rounded-lg border px-3 text-sm font-bold transition ${
                        currentPage === pageNumber
                          ? 'border-[#00C471] bg-[#00C471] text-white'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-[#00C471] hover:text-[#00C471]'
                      }`}
                    >
                      {pageNumber}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="h-10 rounded-lg border border-gray-200 px-3 text-sm font-bold text-gray-600 transition hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    다음
                  </button>
                </nav>
              ) : null}
            </>
          ) : null}
        </div>
      </main>

      <footer className="mt-auto border-t border-gray-200 bg-gray-50 pt-16 pb-8 text-center text-xs text-gray-400">
        &copy; 2026 DevPath Inc. All rights reserved.
      </footer>

      {toastMessage ? (
        <div className="fixed right-6 bottom-6 z-[1200] rounded-full bg-gray-900 px-4 py-3 text-sm font-semibold text-white shadow-2xl">
          {toastMessage}
        </div>
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
