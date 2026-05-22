import { useEffect, useMemo, useState } from 'react'
import AuthModal, { type AuthView } from './components/AuthModal'
import SiteHeader from './components/SiteHeader'
import UserAvatar from './components/UserAvatar'
import {
  applyInstructorChannelCustomization,
  buildMyInstructorEditProfileHref,
  fallbackInstructorCareers,
  readInstructorChannelCustomization,
  type InstructorChannelListItem,
  type InstructorChannelNoticeItem,
} from './instructor-channel-customization'
import {
  buildPlaylistSections,
  buildRatingFilterKey,
  buildReviewSummary,
  fallbackCommunityPosts,
  fallbackInstructorReviews,
  fallbackNotices,
  filterCommunityPosts,
  formatCompactCount,
  formatWon,
  getCommunityCategoryClass,
  getCommunityCategoryLabel,
  mergeInstructorChannel,
  reviewLectureOptions,
  sortCommunityPosts,
  type CommunityCategory,
  type CommunityFilterKey,
  type CommunityPost,
  type CommunityReply,
  type CommunitySortKey,
  type InstructorChannelTabKey,
  type InstructorReviewItem,
  type PlaylistFilterKey,
  type ReviewFilterKey,
  type ReviewSortKey,
} from './instructor-channel-support'
import { authApi, instructorSubscriptionApi, publicInstructorApi, userApi } from './lib/api'
import { AUTH_SESSION_SYNC_EVENT, clearStoredAuthSession, readStoredAuthSession } from './lib/auth-session'
import { useInternalPageScroll } from './lib/useInternalPageScroll'
import type { InstructorChannel } from './types/instructor'

type WriteCategory = Exclude<CommunityCategory, 'notice'>

function readNumberSearchParam(name: string) {
  const value = new URLSearchParams(window.location.search).get(name)
  const parsed = value ? Number(value) : Number.NaN
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function readAuthViewFromLocation(): AuthView | null {
  const value = new URLSearchParams(window.location.search).get('auth')
  return value === 'login' || value === 'signup' ? value : null
}

function syncAuthViewInLocation(view: AuthView | null) {
  const url = new URL(window.location.href)
  if (view) url.searchParams.set('auth', view)
  else url.searchParams.delete('auth')
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
}

function buildStarIcons(rating: number) {
  return Array.from({ length: 5 }).map((_, index) => {
    const starIndex = index + 1
    if (starIndex <= Math.floor(rating)) return 'fas fa-star'
    if (starIndex === Math.floor(rating) + 1 && rating % 1 >= 0.5) return 'fas fa-star-half-alt'
    return 'far fa-star'
  })
}

function filterButtonClass(active: boolean) {
  return active
    ? 'border-brand bg-brand text-white'
    : 'border-gray-200 bg-white text-gray-500 hover:border-brand hover:bg-emerald-50'
}

function getWriteGuide(category: WriteCategory | null) {
  if (category === 'question') return '강의 내용, 실습 오류, 학습 방향처럼 답변이 필요한 질문을 남겨주세요.'
  if (category === 'info') return '취업 후기, 학습 팁, 참고 자료처럼 다른 수강생에게 도움이 되는 정보를 공유해주세요.'
  if (category === 'chat') return '가벼운 소감, 응원, 근황처럼 자유로운 이야기를 남겨주세요.'
  return ''
}

function LoadingOverlay() {
  return (
    <div className="fixed inset-0 z-[2001] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="h-14 w-14 animate-spin rounded-full border-4 border-[#00c471] border-t-transparent" />
    </div>
  )
}

export default function InstructorChannelApp() {
  useInternalPageScroll()

  const instructorId = useMemo(() => readNumberSearchParam('instructorId') ?? 17, [])
  const [session, setSession] = useState(() => readStoredAuthSession())
  const [customization, setCustomization] = useState(() => readInstructorChannelCustomization(instructorId))
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [authView, setAuthView] = useState<AuthView | null>(() => readAuthViewFromLocation())
  const [channelResponse, setChannelResponse] = useState<InstructorChannel | null>(null)
  const [loadingChannel, setLoadingChannel] = useState(true)
  const [channelNotice, setChannelNotice] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<InstructorChannelTabKey>('home')
  const [subscribed, setSubscribed] = useState(false)
  const [subscriptionBusy, setSubscriptionBusy] = useState(false)
  const [playlistFilter, setPlaylistFilter] = useState<PlaylistFilterKey>('all')
  const [bookmarkedCourseIds, setBookmarkedCourseIds] = useState<number[]>([])
  const [posts, setPosts] = useState<CommunityPost[]>(fallbackCommunityPosts)
  const [communityFilter, setCommunityFilter] = useState<CommunityFilterKey>('all')
  const [communitySort, setCommunitySort] = useState<CommunitySortKey>('latest')
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  const [likedPostIds, setLikedPostIds] = useState<string[]>([])
  const [writeModalOpen, setWriteModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [writeCategory, setWriteCategory] = useState<WriteCategory | null>(null)
  const [writeTitle, setWriteTitle] = useState('')
  const [writeContent, setWriteContent] = useState('')
  const [editDraft, setEditDraft] = useState({ title: '', content: '' })
  const [replyDraft, setReplyDraft] = useState('')
  const [reviews] = useState<InstructorReviewItem[]>(fallbackInstructorReviews)
  const [reviewFilter, setReviewFilter] = useState<ReviewFilterKey>('all')
  const [reviewLectureFilter, setReviewLectureFilter] = useState('all')
  const [reviewSort, setReviewSort] = useState<ReviewSortKey>('latest')
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const channel = useMemo(
    () => applyInstructorChannelCustomization(mergeInstructorChannel(channelResponse), customization),
    [channelResponse, customization],
  )
  const playlistSections = useMemo(() => buildPlaylistSections(channel), [channel])
  const spotlightCourse = playlistSections[0]?.courses[0] ?? null
  const lectureCount = playlistSections.reduce((sum, section) => sum + section.courses.length, 0)
  const reviewSummary = useMemo(() => buildReviewSummary(reviews), [reviews])
  const notices = useMemo<InstructorChannelNoticeItem[]>(
    () => (customization?.notices.length ? customization.notices : fallbackNotices),
    [customization],
  )
  const careers = useMemo<InstructorChannelListItem[]>(
    () => (customization?.careers.length ? customization.careers : fallbackInstructorCareers),
    [customization],
  )
  const bannerImageUrl =
    customization?.bannerImageUrl.trim() ||
    'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=2000&q=80'
  const youtubeUrl = customization?.youtubeUrl.trim() || '#'
  const isOwnChannel = session?.role === 'ROLE_INSTRUCTOR' && session.userId === channel.profile.instructorId
  const editChannelHref = buildMyInstructorEditProfileHref(session)
  const sessionDisplayName = session?.name ?? '나(사용자)'

  const filteredPlaylistSections = useMemo(() => {
    if (playlistFilter === 'all') return playlistSections
    return playlistSections
      .map((section) => ({
        ...section,
        courses: section.courses.filter((course) => {
          if (playlistFilter === 'project') return course.level === 'project'
          if (playlistFilter === 'bestseller') return Boolean(course.bestseller)
          return course.level === playlistFilter
        }),
      }))
      .filter((section) => section.courses.length > 0)
  }, [playlistFilter, playlistSections])

  const filteredCommunityPosts = useMemo(
    () => sortCommunityPosts(filterCommunityPosts(posts, communityFilter), communitySort),
    [communityFilter, communitySort, posts],
  )

  const selectedPost = useMemo(
    () => posts.find((post) => post.id === selectedPostId) ?? null,
    [posts, selectedPostId],
  )

  const visibleReviews = useMemo(() => {
    const filtered = reviews
      .filter((review) => reviewFilter === 'all' || buildRatingFilterKey(review.rating) === reviewFilter)
      .filter((review) => reviewLectureFilter === 'all' || review.lectureKey === reviewLectureFilter)
    return [...filtered].sort((left, right) => {
      if (reviewSort === 'rating-high') return right.rating - left.rating || right.date.localeCompare(left.date)
      if (reviewSort === 'rating-low') return left.rating - right.rating || right.date.localeCompare(left.date)
      return right.date.localeCompare(left.date)
    })
  }, [reviewFilter, reviewLectureFilter, reviewSort, reviews])

  useEffect(() => {
    document.title = 'DevPath - 강사 채널'
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
    setCustomization(readInstructorChannelCustomization(instructorId))
  }, [instructorId])

  useEffect(() => {
    syncAuthViewInLocation(authView)
  }, [authView])

  useEffect(() => {
    if (!session) {
      setProfileImage(null)
      return
    }
    const controller = new AbortController()
    userApi.getMyProfile(controller.signal).then((profile) => setProfileImage(profile.profileImage)).catch(() => setProfileImage(null))
    return () => controller.abort()
  }, [session])

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()
    async function loadChannel() {
      setLoadingChannel(true)
      try {
        const response = await publicInstructorApi.getChannel(instructorId, controller.signal)
        if (cancelled) return
        setChannelResponse(response)
        setChannelNotice(null)
      } catch {
        if (cancelled) return
        setChannelResponse(null)
        setChannelNotice('강사 채널 정보를 불러오지 못해 기본 화면으로 표시합니다.')
      } finally {
        if (!cancelled) setLoadingChannel(false)
      }
    }
    void loadChannel()
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [instructorId])

  useEffect(() => {
    if (!toastMessage) return
    const timeoutId = window.setTimeout(() => setToastMessage(null), 2200)
    return () => window.clearTimeout(timeoutId)
  }, [toastMessage])

  async function handleLogout() {
    const currentSession = readStoredAuthSession()
    try {
      if (currentSession?.refreshToken) await authApi.logout(currentSession.refreshToken)
    } catch {
      // noop
    } finally {
      clearStoredAuthSession()
      setSession(null)
      setProfileImage(null)
    }
  }

  function handleAuthenticated() {
    setSession(readStoredAuthSession())
    setAuthView(null)
  }

  async function handleToggleSubscribe() {
    if (!session) {
      setAuthView('login')
      return
    }
    if (subscriptionBusy) return
    setSubscriptionBusy(true)
    try {
      if (subscribed) {
        await instructorSubscriptionApi.unsubscribe(channel.profile.instructorId)
        setSubscribed(false)
        setToastMessage('구독을 취소했습니다.')
      } else {
        await instructorSubscriptionApi.subscribe(channel.profile.instructorId)
        setSubscribed(true)
        setToastMessage('채널을 구독했습니다.')
      }
    } catch {
      setToastMessage('구독 상태를 변경하지 못했습니다.')
    } finally {
      setSubscriptionBusy(false)
    }
  }

  function handleOpenCourse(courseId: number) {
    window.location.href = `/course-detail?courseId=${courseId}`
  }

  function handleToggleBookmark(courseId: number) {
    setBookmarkedCourseIds((current) => current.includes(courseId) ? current.filter((item) => item !== courseId) : [...current, courseId])
  }

  function handleOpenWriteModal() {
    if (!session) {
      setAuthView('login')
      return
    }
    setWriteModalOpen(true)
  }

  function handleCloseWriteModal() {
    setWriteModalOpen(false)
    setWriteCategory(null)
    setWriteTitle('')
    setWriteContent('')
  }

  function handleSubmitWrite() {
    if (!writeCategory || !writeTitle.trim() || !writeContent.trim()) {
      setToastMessage('카테고리, 제목, 내용을 입력해주세요.')
      return
    }
    const nextPost: CommunityPost = {
      id: `post-user-${Date.now()}`,
      category: writeCategory,
      status: writeCategory === 'question' ? 'pending' : undefined,
      title: writeTitle.trim(),
      content: writeContent.trim(),
      author: session?.name ?? '나(사용자)',
      authorSeed: 'MyUser',
      date: '2026.04.06',
      views: 0,
      likes: 0,
      mine: true,
      replies: [],
    }
    setPosts((current) => [nextPost, ...current])
    handleCloseWriteModal()
    setToastMessage('커뮤니티 글이 등록되었습니다.')
  }

  function handleOpenPost(postId: string) {
    setPosts((current) => current.map((post) => post.id === postId ? { ...post, views: post.views + 1 } : post))
    setSelectedPostId(postId)
  }

  function handleClosePost() {
    setSelectedPostId(null)
    setReplyDraft('')
  }

  function handleToggleLikePost(postId: string) {
    if (!session) {
      handleClosePost()
      setAuthView('login')
      return
    }
    let nextLiked = false
    setLikedPostIds((current) => {
      nextLiked = !current.includes(postId)
      return nextLiked ? [...current, postId] : current.filter((item) => item !== postId)
    })
    setPosts((current) => current.map((post) => post.id === postId ? { ...post, likes: Math.max(0, post.likes + (nextLiked ? 1 : -1)) } : post))
  }

  function handleSubmitReply() {
    if (!session) {
      handleClosePost()
      setAuthView('login')
      return
    }
    if (!selectedPost || !replyDraft.trim()) {
      setToastMessage('댓글 내용을 입력해주세요.')
      return
    }
    const nextReply: CommunityReply = {
      id: `reply-${Date.now()}`,
      author: session.name,
      seed: 'MyUser',
      content: replyDraft.trim(),
      date: '2026.04.06',
      mine: true,
    }
    setPosts((current) => current.map((post) => post.id === selectedPost.id ? { ...post, status: post.status === 'pending' ? 'solved' : post.status, replies: [...post.replies, nextReply] } : post))
    setReplyDraft('')
  }

  function handleDeleteReply(replyId: string) {
    if (!selectedPost) return
    setPosts((current) => current.map((post) => post.id === selectedPost.id ? { ...post, replies: post.replies.filter((reply) => reply.id !== replyId) } : post))
  }

  function handleOpenEditModal() {
    if (!selectedPost?.mine) return
    setEditDraft({ title: selectedPost.title, content: selectedPost.content })
    setEditModalOpen(true)
  }

  function handleSaveEdit() {
    if (!selectedPost || !editDraft.title.trim() || !editDraft.content.trim()) {
      setToastMessage('제목과 내용을 입력해주세요.')
      return
    }
    setPosts((current) => current.map((post) => post.id === selectedPost.id ? { ...post, title: editDraft.title.trim(), content: editDraft.content.trim() } : post))
    setEditModalOpen(false)
  }

  function handleDeletePost() {
    if (!selectedPost?.mine) return
    setPosts((current) => current.filter((post) => post.id !== selectedPost.id))
    setSelectedPostId(null)
    setEditModalOpen(false)
  }

  const channelTabs: Array<[InstructorChannelTabKey, string]> = [
    ['home', '홈'],
    ['playlist', '강의 목록 (재생목록)'],
    ['community', '커뮤니티'],
    ['reviews', '수강평'],
  ]
  const communityFilterOptions: Array<[CommunityFilterKey, string]> = [
    ['all', '전체'],
    ['notice', '공지'],
    ['question', '질문'],
    ['info', '정보'],
    ['chat', '잡담'],
    ['solved', '✓ 답변완료'],
    ['pending', '답변대기'],
  ]
  const reviewFilterOptions: Array<[ReviewFilterKey, string]> = [
    ['all', '전체'],
    ['5star', '★ 5점'],
    ['4star', '★ 4점'],
    ['3star', '★ 3점'],
    ['2star', '★ 2점'],
    ['1star', '★ 1점'],
  ]

  return (
    <div className="h-screen min-h-0 overflow-hidden bg-[#f9fafb] text-gray-800">
      {loadingChannel ? <LoadingOverlay /> : null}
      <SiteHeader
        session={session}
        profileImage={profileImage}
        onLogout={handleLogout}
        onLoginClick={() => setAuthView('login')}
      />

      <main className="instructor-channel-page app-main pb-20">
        <div className="instructor-channel-body-zoom">
          {channelNotice ? (
            <div className="border-b border-amber-100 bg-amber-50 px-6 py-3 text-center text-sm font-semibold text-amber-700">
              {channelNotice}
            </div>
          ) : null}

          <ChannelHero
            channel={channel}
            bannerImageUrl={bannerImageUrl}
            youtubeUrl={youtubeUrl}
            lectureCount={lectureCount}
            reviewAverage={reviewSummary.average}
            subscribed={subscribed}
            subscriptionBusy={subscriptionBusy}
            isOwnChannel={isOwnChannel}
            editChannelHref={editChannelHref}
            activeTab={activeTab}
            tabs={channelTabs}
            onTabChange={setActiveTab}
            onToggleSubscribe={() => void handleToggleSubscribe()}
          />

          <div className="mx-auto max-w-7xl px-6 py-8">
            <div className={activeTab === 'home' ? 'block animate-fade-in' : 'hidden'}>
              <HomeTab
                channel={channel}
                careers={careers}
                notices={notices}
                spotlightCourse={spotlightCourse}
                onOpenCourse={handleOpenCourse}
              />
            </div>

            <div className={activeTab === 'playlist' ? 'block animate-fade-in' : 'hidden'}>
              <PlaylistTab
                playlistFilter={playlistFilter}
                sections={filteredPlaylistSections}
                bookmarkedCourseIds={bookmarkedCourseIds}
                onFilterChange={setPlaylistFilter}
                onOpenCourse={handleOpenCourse}
                onToggleBookmark={handleToggleBookmark}
              />
            </div>

            <div className={activeTab === 'community' ? 'block animate-fade-in' : 'hidden'}>
              <CommunityTab
                posts={filteredCommunityPosts}
                communityFilter={communityFilter}
                communitySort={communitySort}
                filterOptions={communityFilterOptions}
                onFilterChange={setCommunityFilter}
                onSortChange={setCommunitySort}
                onWrite={handleOpenWriteModal}
                onOpenPost={handleOpenPost}
              />
            </div>

            <div className={activeTab === 'reviews' ? 'block animate-fade-in' : 'hidden'}>
              <ReviewsTab
                visibleReviews={visibleReviews}
                reviewSummary={reviewSummary}
                reviewFilter={reviewFilter}
                reviewLectureFilter={reviewLectureFilter}
                reviewSort={reviewSort}
                filterOptions={reviewFilterOptions}
                onFilterChange={setReviewFilter}
                onLectureChange={setReviewLectureFilter}
                onSortChange={setReviewSort}
              />
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-12 border-t border-gray-200 bg-white py-8">
        <div className="mx-auto max-w-[1600px] px-6 text-center text-xs text-gray-400">
          &copy; 2026 DevPath Inc. All rights reserved.
        </div>
      </footer>

      <WritePostModal
        open={writeModalOpen}
        writeCategory={writeCategory}
        writeTitle={writeTitle}
        writeContent={writeContent}
        onClose={handleCloseWriteModal}
        onCategoryChange={setWriteCategory}
        onTitleChange={setWriteTitle}
        onContentChange={setWriteContent}
        onSubmit={handleSubmitWrite}
      />

      <PostDetailModal
        post={selectedPost}
        sessionName={sessionDisplayName}
        profileImage={profileImage}
        replyDraft={replyDraft}
        liked={selectedPost ? likedPostIds.includes(selectedPost.id) : false}
        onClose={handleClosePost}
        onLike={handleToggleLikePost}
        onReplyDraftChange={setReplyDraft}
        onSubmitReply={handleSubmitReply}
        onDeleteReply={handleDeleteReply}
        onEdit={handleOpenEditModal}
        onDeletePost={handleDeletePost}
      />

      <EditPostModal
        open={editModalOpen}
        title={editDraft.title}
        content={editDraft.content}
        onClose={() => setEditModalOpen(false)}
        onTitleChange={(value) => setEditDraft((current) => ({ ...current, title: value }))}
        onContentChange={(value) => setEditDraft((current) => ({ ...current, content: value }))}
        onSubmit={handleSaveEdit}
      />

      {toastMessage ? (
        <div className="fixed bottom-6 left-1/2 z-[2100] -translate-x-1/2 rounded-full bg-gray-900 px-5 py-3 text-sm font-semibold text-white shadow-2xl">
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

function ChannelHero({
  channel,
  bannerImageUrl,
  youtubeUrl,
  lectureCount,
  reviewAverage,
  subscribed,
  subscriptionBusy,
  isOwnChannel,
  editChannelHref,
  activeTab,
  tabs,
  onTabChange,
  onToggleSubscribe,
}: {
  channel: ReturnType<typeof mergeInstructorChannel>
  bannerImageUrl: string
  youtubeUrl: string
  lectureCount: number
  reviewAverage: number
  subscribed: boolean
  subscriptionBusy: boolean
  isOwnChannel: boolean
  editChannelHref: string
  activeTab: InstructorChannelTabKey
  tabs: Array<[InstructorChannelTabKey, string]>
  onTabChange: (tab: InstructorChannelTabKey) => void
  onToggleSubscribe: () => void
}) {
  return (
    <div className="border-b border-gray-200 bg-white">
      <div className="relative h-48 w-full overflow-hidden bg-gradient-to-r from-slate-900 to-slate-800 md:h-64">
        <img src={bannerImageUrl} className="h-full w-full object-cover opacity-40" alt="channel cover" />
        <div className="absolute bottom-4 right-6 flex gap-3">
          <a href={channel.externalLinks?.githubUrl ?? '#'} className="text-xl text-white/80 hover:text-white"><i className="fab fa-github" /></a>
          <a href={youtubeUrl} className="text-xl text-white/80 hover:text-white"><i className="fab fa-youtube" /></a>
          <a href={channel.externalLinks?.blogUrl ?? '#'} className="text-xl text-white/80 hover:text-white"><i className="fas fa-globe" /></a>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 pb-4 pt-8">
        <div className="relative z-10 mb-6 flex flex-col gap-6 md:-mt-1 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 flex-col gap-6 md:flex-row md:items-end md:gap-6">
            <div className="h-32 w-32 overflow-hidden rounded-full border-4 border-white bg-white shadow-lg">
              <UserAvatar
                name={channel.profile.nickname}
                imageUrl={channel.profile.profileImageUrl}
                className="h-full w-full border-0"
                iconClassName="text-3xl"
                alt={channel.profile.nickname}
              />
            </div>
            <div className="mb-2 flex-1">
              <div className="mb-1 flex items-center gap-2">
                <h1 className="text-3xl font-extrabold text-gray-900">{channel.profile.nickname}</h1>
                <i className="fas fa-check-circle text-lg text-blue-500" title="인증된 강사" />
              </div>
              <p className="mb-3 font-medium text-gray-500">
                {channel.profile.headline ?? '복잡한 백엔드 기술을 쉽고 명확하게 풀어드립니다. 10년차 서버 개발자.'}
              </p>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span><strong className="text-gray-900">{formatCompactCount(15400)}</strong> 수강생</span>
                <span>•</span>
                <span><strong className="text-gray-900">{reviewAverage.toFixed(1)}</strong> 평점</span>
                <span>•</span>
                <span><strong className="text-gray-900">{lectureCount}</strong> 개의 강의</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-3 md:flex-row">
            {isOwnChannel ? (
              <a
                href={editChannelHref}
                className="mb-4 inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-6 py-3 text-sm font-bold text-gray-700 transition hover:border-brand hover:text-brand md:mb-0"
              >
                <i className="fas fa-pen-to-square" />
                <span>{'\uCC44\uB110 \uD3B8\uC9D1'}</span>
              </a>
            ) : null}

            <button
            type="button"
            onClick={onToggleSubscribe}
            disabled={subscriptionBusy}
            className={`mb-4 flex items-center gap-2 rounded-full px-8 py-3 font-bold transition md:mb-0 ${
              subscribed ? 'bg-gray-100 text-gray-700 shadow-sm hover:bg-gray-200' : 'bg-black text-white shadow-lg hover:bg-gray-800'
            } disabled:opacity-70`}
          >
            <i className={subscribed ? 'fas fa-check' : 'far fa-bell'} />
            <span>{subscribed ? '구독 중' : '구독'}</span>
            </button>
          </div>
        </div>

        <div className="flex gap-8 border-b border-gray-100 text-sm">
          {tabs.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => onTabChange(key)}
              className={`channel-tab ${activeTab === key ? 'active' : ''}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function HomeTab({
  channel,
  careers,
  notices,
  spotlightCourse,
  onOpenCourse,
}: {
  channel: ReturnType<typeof mergeInstructorChannel>
  careers: InstructorChannelListItem[]
  notices: InstructorChannelNoticeItem[]
  spotlightCourse: ReturnType<typeof buildPlaylistSections>[number]['courses'][number] | null
  onOpenCourse: (courseId: number) => void
}) {
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="space-y-8 lg:col-span-2">
        <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-slate-50 to-gray-50 p-8 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand/10">
              <i className="fas fa-user-circle text-2xl text-brand" />
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900">강사 소개</h2>
          </div>
          <p className="mb-4 text-base leading-relaxed text-gray-700">{channel.intro}</p>
          <p className="mb-4 text-base leading-relaxed text-gray-700">
            실무에서 바로 써먹을 수 있는 구조와 사고 방식을 기준으로 설명합니다. 단순한 코드 따라치기보다,
            왜 이런 설계를 선택하는지까지 이해할 수 있도록 강의를 구성했습니다.
          </p>
          <div className="my-6 rounded-xl border-l-4 border-brand bg-white p-6 text-gray-800 italic">
            <i className="fas fa-quote-left mr-2 text-sm text-brand" />
            결국 중요한 건 화려한 기술 스택이 아니라 기본기와 문제 해결력이라고 생각합니다.
            <i className="fas fa-quote-right ml-2 text-sm text-brand" />
          </div>
          <div className="mb-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <i className="fas fa-graduation-cap text-blue-600" />
                <h4 className="font-bold text-gray-900">교육 철학</h4>
              </div>
              <p className="text-sm text-gray-700">개념을 정확히 이해하고 스스로 적용할 수 있는 실전 감각을 키우는 데 집중합니다.</p>
            </div>
            <div className="rounded-lg border border-green-100 bg-green-50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <i className="fas fa-lightbulb text-green-600" />
                <h4 className="font-bold text-gray-900">실무 중심</h4>
              </div>
              <p className="text-sm text-gray-700">프로젝트에서 검증된 패턴과 실패 사례를 함께 공유해 실무형 학습 흐름을 만듭니다.</p>
            </div>
          </div>
          <div className="border-t border-gray-200 pt-6">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900"><i className="fas fa-briefcase text-gray-600" /> 주요 경력</h3>
            <div className="space-y-3">
              {careers.map((item) => (
                <div key={item.id} className="flex gap-4">
                  <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand" />
                  <div>
                    <p className="font-bold text-gray-900">{item.title}</p>
                    <p className="text-sm text-gray-600">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {spotlightCourse ? (
          <div>
            <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900"><i className="fas fa-fire text-red-500" /> 인기 급상승 강의</h3>
            <button type="button" onClick={() => onOpenCourse(spotlightCourse.courseId)} className="group flex w-full gap-4 rounded-xl border border-gray-200 bg-white p-4 text-left transition hover:border-brand">
              <div className="h-24 w-40 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                <img src={spotlightCourse.thumbnailUrl} className="h-full w-full object-cover" alt={spotlightCourse.title} />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-gray-900 transition group-hover:text-brand">{spotlightCourse.title}</h4>
                <p className="mt-1 text-xs text-gray-500">{spotlightCourse.subtitle}</p>
                <div className="mt-3 flex items-center gap-2 text-xs">
                  <span className="font-bold text-yellow-500"><i className="fas fa-star" /> {spotlightCourse.rating.toFixed(1)}</span>
                  <span className="text-gray-400">수강평 {spotlightCourse.reviewCount.toLocaleString('ko-KR')}개</span>
                </div>
              </div>
            </button>
          </div>
        ) : null}
      </div>

      <div className="space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-bold text-gray-900">최근 공지사항</h3>
          <div className="space-y-4">
            {notices.map((notice) => (
              <div key={notice.id} className="border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                {notice.isNew ? <span className="rounded bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600">New</span> : null}
                <p className="mt-1 cursor-pointer text-sm font-medium hover:text-brand">{notice.title}</p>
                <p className="mt-1 text-xs text-gray-400">{notice.dateLabel}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-bold text-gray-900">주요 전문 분야</h3>
          <div className="flex flex-wrap gap-2">
            {channel.specialties.map((item) => (
              <span key={item} className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-600">{item}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function PlaylistTab({
  playlistFilter,
  sections,
  bookmarkedCourseIds,
  onFilterChange,
  onOpenCourse,
  onToggleBookmark,
}: {
  playlistFilter: PlaylistFilterKey
  sections: ReturnType<typeof buildPlaylistSections>
  bookmarkedCourseIds: number[]
  onFilterChange: (filter: PlaylistFilterKey) => void
  onOpenCourse: (courseId: number) => void
  onToggleBookmark: (courseId: number) => void
}) {
  return (
    <>
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap gap-2">
          {([
            ['all', '전체'],
            ['beginner', '입문'],
            ['intermediate', '중급'],
            ['advanced', '심화'],
            ['project', '프로젝트'],
            ['bestseller', '베스트'],
          ] as Array<[PlaylistFilterKey, string]>).map(([key, label]) => (
            <button key={key} type="button" onClick={() => onFilterChange(key)} className={`playlist-filter-btn rounded-lg border px-4 py-2 text-sm font-semibold transition ${filterButtonClass(playlistFilter === key)}`}>
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {sections.map((section) => (
        <div key={section.id} className="playlist-section mb-12">
          <div className="mb-4 flex items-end justify-between px-1">
            <div>
              <h3 className="text-xl font-extrabold text-gray-900">{section.emojiTitle}</h3>
              <p className="mt-1 text-sm text-gray-500">{section.description}</p>
            </div>
            <a href="/lecture-list" className="text-sm font-bold text-brand hover:underline">모두 보기</a>
          </div>
          <div className="playlist-scroll">
            {section.courses.map((course) => (
              <div key={course.courseId} className="course-card group overflow-hidden rounded-xl border border-gray-200 bg-white">
                <button type="button" onClick={() => onOpenCourse(course.courseId)} className="block w-full text-left">
                  <div className="relative h-40 overflow-hidden bg-gray-200">
                    <img src={course.thumbnailUrl} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" alt={course.title} />
                    <span className={`absolute left-2 top-2 rounded px-2 py-0.5 text-[10px] font-bold text-white ${course.bestseller ? 'bg-brand' : 'bg-black/60 backdrop-blur-sm'}`}>
                      {course.bestseller ? '베스트' : course.level === 'beginner' ? '입문' : course.level === 'intermediate' ? '중급' : course.level === 'advanced' ? '심화' : '프로젝트'}
                    </span>
                  </div>
                </button>
                <div className="p-4">
                  <button type="button" onClick={() => onOpenCourse(course.courseId)} className="text-left">
                    <h4 className="mb-1 line-clamp-2 font-bold leading-tight text-gray-900 transition group-hover:text-brand">{course.title}</h4>
                  </button>
                  <div className="mb-2 flex items-center gap-1 text-xs font-bold text-yellow-500">
                    <i className="fas fa-star" /> {course.rating.toFixed(1)} <span className="font-medium text-gray-400">({course.reviewCount.toLocaleString('ko-KR')})</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-900">{formatWon(course.price)}</span>
                    <button type="button" onClick={() => onToggleBookmark(course.courseId)} className="rounded bg-gray-100 p-1.5 text-gray-500 transition hover:bg-gray-200">
                      <i className={`${bookmarkedCourseIds.includes(course.courseId) ? 'fas text-rose-500' : 'far'} fa-heart`} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  )
}

function CommunityTab({
  posts,
  communityFilter,
  communitySort,
  filterOptions,
  onFilterChange,
  onSortChange,
  onWrite,
  onOpenPost,
}: {
  posts: CommunityPost[]
  communityFilter: CommunityFilterKey
  communitySort: CommunitySortKey
  filterOptions: Array<[CommunityFilterKey, string]>
  onFilterChange: (filter: CommunityFilterKey) => void
  onSortChange: (sort: CommunitySortKey) => void
  onWrite: () => void
  onOpenPost: (postId: string) => void
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="flex items-start justify-between gap-4 border-b border-gray-200 p-6">
        <div>
          <h2 className="mb-1 text-xl font-bold text-gray-900">질문소통 & 커뮤니티</h2>
          <p className="text-sm text-gray-500">공지 / 질문 / 잡담 / 정보 글을 한곳에서 관리해보세요.</p>
        </div>
        <button type="button" onClick={onWrite} className="shrink-0 rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-500">
          <i className="fas fa-pen mr-2" /> 글 쓰기
        </button>
      </div>

      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 flex-wrap gap-2">
            {filterOptions.map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => onFilterChange(key)}
                className={`community-filter-btn rounded-lg border px-4 py-2 text-sm font-semibold transition ${filterButtonClass(communityFilter === key)}`}
              >
                <span>{label}</span>
              </button>
            ))}
          </div>
          <select
            value={communitySort}
            onChange={(event) => onSortChange(event.target.value as CommunitySortKey)}
            className="h-[42px] rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 transition hover:border-brand"
          >
            <option value="latest">최신순</option>
            <option value="views">조회순</option>
            <option value="likes">좋아요순</option>
            <option value="comments">댓글순</option>
            <option value="mine">내가 쓴 글</option>
          </select>
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {posts.length ? posts.map((post) => (
          <button key={post.id} type="button" onClick={() => onOpenPost(post.id)} className="w-full p-6 text-left transition hover:bg-gray-50">
            <div className="mb-2 flex items-start justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded px-2 py-1 text-xs font-bold ${getCommunityCategoryClass(post.category)}`}>
                  {getCommunityCategoryLabel(post.category)}
                </span>
                {post.mine ? (
                  <span className="my-post-badge">
                    <i className="fas fa-user" /> 내 글
                  </span>
                ) : null}
                {post.category === 'notice' ? <span className="text-xs text-gray-400">{post.date}</span> : null}
              </div>
              {post.status === 'solved' ? (
                <span className="flex items-center gap-1 rounded bg-brand/10 px-2 py-1 text-xs font-bold text-brand"><i className="fas fa-check" /> 답변완료</span>
              ) : post.status === 'pending' ? (
                <span className="rounded bg-orange-100 px-2 py-1 text-xs font-bold text-orange-600">답변대기</span>
              ) : null}
            </div>
            <h3 className="mb-2 font-bold text-gray-900">{post.title}</h3>
            <p className="mb-3 text-sm text-gray-600">{post.content}</p>
            {post.category !== 'notice' ? (
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span><i className="far fa-comment" /> {post.replies.length}</span>
                <span><i className="far fa-heart" /> {post.likes}</span>
                <span>조회 {post.views}</span>
              </div>
            ) : null}
          </button>
        )) : (
          <div className="px-6 py-16 text-center text-sm font-medium text-gray-400">조건에 맞는 게시글이 없습니다.</div>
        )}
      </div>
    </div>
  )
}

function ReviewsTab({
  visibleReviews,
  reviewSummary,
  reviewFilter,
  reviewLectureFilter,
  reviewSort,
  filterOptions,
  onFilterChange,
  onLectureChange,
  onSortChange,
}: {
  visibleReviews: InstructorReviewItem[]
  reviewSummary: ReturnType<typeof buildReviewSummary>
  reviewFilter: ReviewFilterKey
  reviewLectureFilter: string
  reviewSort: ReviewSortKey
  filterOptions: Array<[ReviewFilterKey, string]>
  onFilterChange: (filter: ReviewFilterKey) => void
  onLectureChange: (value: string) => void
  onSortChange: (value: ReviewSortKey) => void
}) {
  return (
    <>
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 flex-wrap gap-2">
            {filterOptions.map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => onFilterChange(key)}
                className={`review-filter-btn rounded-lg border px-4 py-2 text-sm font-semibold transition ${filterButtonClass(reviewFilter === key)}`}
              >
                <span>{label}</span>
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              value={reviewLectureFilter}
              onChange={(event) => onLectureChange(event.target.value)}
              className="h-[42px] min-w-[220px] rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 transition hover:border-brand"
            >
              {reviewLectureOptions.map((option) => (
                <option key={option.key} value={option.key}>{option.label}</option>
              ))}
            </select>
            <select
              value={reviewSort}
              onChange={(event) => onSortChange(event.target.value as ReviewSortKey)}
              className="h-[42px] rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 transition hover:border-brand"
            >
              <option value="latest">최신순</option>
              <option value="rating-high">별점 높은순</option>
              <option value="rating-low">별점 낮은순</option>
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="mb-1 text-xl font-bold text-gray-900">수강평</h2>
              <p className="text-sm text-gray-500">총 <strong className="text-gray-900">{reviewSummary.count.toLocaleString('ko-KR')}</strong>개의 수강평이 있습니다.</p>
            </div>
            <div className="text-right">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-gray-900">{reviewSummary.average.toFixed(1)}</span>
                <span className="text-gray-400">/5.0</span>
              </div>
              <div className="mt-1 flex items-center gap-1 text-sm text-yellow-500">
                {buildStarIcons(reviewSummary.average).map((iconClassName, index) => (
                  <i key={index} className={iconClassName} />
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-2">
            {reviewSummary.distribution.map((item) => {
              const percent = reviewSummary.count ? (item.count / reviewSummary.count) * 100 : 0
              return (
                <div key={item.rating} className="flex items-center gap-3">
                  <span className="w-12 text-xs text-gray-600">★ {item.rating}점</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                    <div className="h-full bg-yellow-400" style={{ width: `${percent}%` }} />
                  </div>
                  <span className="w-12 text-right text-xs text-gray-500">{item.count.toLocaleString('ko-KR')}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {visibleReviews.length ? visibleReviews.map((review) => (
            <div key={review.id} className="p-6">
              <div className="flex items-start gap-4">
                <UserAvatar name={review.author} imageUrl={null} className="h-10 w-10" alt={review.author} />
                <div className="flex-1">
                  <div className="mb-2 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-gray-900">{review.author}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="flex text-xs text-yellow-500">
                          {buildStarIcons(review.rating).map((iconClassName, index) => (
                            <i key={index} className={iconClassName} />
                          ))}
                        </div>
                        <span className="text-xs text-gray-400">{review.date}</span>
                      </div>
                    </div>
                  </div>
                  <p className="mb-2 text-sm leading-relaxed text-gray-700">{review.content}</p>
                  <div className="text-xs font-medium text-brand">{review.lectureTitle}</div>
                </div>
              </div>
            </div>
          )) : (
            <div className="px-6 py-16 text-center text-sm font-medium text-gray-400">조건에 맞는 수강평이 없습니다.</div>
          )}
        </div>

        <div className="border-t border-gray-200 p-6 text-center">
          <button type="button" className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-gray-50">
            수강평 더보기
          </button>
        </div>
      </div>
    </>
  )
}

function WritePostModal({
  open,
  writeCategory,
  writeTitle,
  writeContent,
  onClose,
  onCategoryChange,
  onTitleChange,
  onContentChange,
  onSubmit,
}: {
  open: boolean
  writeCategory: WriteCategory | null
  writeTitle: string
  writeContent: string
  onClose: () => void
  onCategoryChange: (category: WriteCategory) => void
  onTitleChange: (value: string) => void
  onContentChange: (value: string) => void
  onSubmit: () => void
}) {
  if (!open) return null

  return (
    <div className="modal-overlay" onClick={onClose} aria-hidden="true">
      <div className="modal-box" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-extrabold text-gray-900">커뮤니티 글 쓰기</h2>
          <button type="button" onClick={onClose} className="text-gray-400 transition hover:text-gray-600">
            <i className="fas fa-times text-xl" />
          </button>
        </div>

        <div className="px-6 pb-3 pt-5">
          <p className="mb-3 text-sm font-bold text-gray-700">카테고리를 선택하세요 <span className="text-red-500">*</span></p>
          <div className="flex flex-wrap gap-2">
            {([
              ['question', '질문', 'fas fa-question-circle text-blue-500', 'border-blue-400 bg-blue-50 text-blue-600'],
              ['info', '정보', 'fas fa-info-circle text-purple-500', 'border-purple-400 bg-purple-50 text-purple-600'],
              ['chat', '잡담', 'fas fa-comments text-gray-500', 'border-gray-400 bg-gray-50 text-gray-600'],
            ] as Array<[WriteCategory, string, string, string]>).map(([key, label, iconClassName, activeClassName]) => (
              <button
                key={key}
                type="button"
                onClick={() => onCategoryChange(key)}
                className={`flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-bold transition ${
                  writeCategory === key ? activeClassName : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <i className={iconClassName} /> {label}
              </button>
            ))}
          </div>
        </div>

        {writeCategory ? (
          <div className="mx-6 mb-4 rounded-xl bg-gray-50 p-4 text-sm leading-relaxed text-gray-600">
            {getWriteGuide(writeCategory)}
          </div>
        ) : null}

        <div className="mb-4 px-6">
          <label className="mb-2 block text-sm font-bold text-gray-700">제목 <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={writeTitle}
            onChange={(event) => onTitleChange(event.target.value.slice(0, 100))}
            placeholder="제목을 입력하세요."
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm transition focus:border-brand focus:outline-none"
          />
          <div className="mt-1 flex justify-end text-xs text-gray-400">{writeTitle.length}/100</div>
        </div>

        <div className="mb-6 px-6">
          <label className="mb-2 block text-sm font-bold text-gray-700">내용 <span className="text-red-500">*</span></label>
          <textarea
            rows={7}
            value={writeContent}
            onChange={(event) => onContentChange(event.target.value)}
            placeholder="내용을 입력하세요."
            className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm transition focus:border-brand focus:outline-none"
          />
          <div className="mt-1 flex justify-end text-xs text-gray-400">{writeContent.length}자</div>
        </div>

        <div className="flex justify-end gap-3 px-6 pb-6">
          <button type="button" onClick={onClose} className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-bold text-gray-600 transition hover:bg-gray-50">
            취소
          </button>
          <button type="button" onClick={onSubmit} className="rounded-xl bg-brand px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-500">
            등록하기
          </button>
        </div>
      </div>
    </div>
  )
}

function PostDetailModal({
  post,
  sessionName,
  profileImage,
  replyDraft,
  liked,
  onClose,
  onLike,
  onReplyDraftChange,
  onSubmitReply,
  onDeleteReply,
  onEdit,
  onDeletePost,
}: {
  post: CommunityPost | null
  sessionName: string
  profileImage: string | null
  replyDraft: string
  liked: boolean
  onClose: () => void
  onLike: (postId: string) => void
  onReplyDraftChange: (value: string) => void
  onSubmitReply: () => void
  onDeleteReply: (replyId: string) => void
  onEdit: () => void
  onDeletePost: () => void
}) {
  if (!post) return null

  return (
    <div className="post-modal-overlay" onClick={onClose} aria-hidden="true">
      <div className="post-modal-box" onClick={(event) => event.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
          <span className={`rounded px-2 py-1 text-xs font-bold ${getCommunityCategoryClass(post.category)}`}>
            {getCommunityCategoryLabel(post.category)}
          </span>
          <button type="button" onClick={onClose} className="text-gray-400 transition hover:text-gray-600">
            <i className="fas fa-times text-xl" />
          </button>
        </div>

        <div className="px-6 py-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <h2 className="flex-1 text-xl font-extrabold leading-tight text-gray-900">{post.title}</h2>
            {post.mine ? (
              <div className="flex shrink-0 gap-2">
                <button type="button" onClick={onEdit} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-600 transition hover:bg-gray-50">
                  <i className="fas fa-pen mr-1 text-gray-400" /> 수정
                </button>
                <button type="button" onClick={onDeletePost} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-500 transition hover:bg-red-50">
                  <i className="fas fa-trash mr-1 text-red-400" /> 삭제
                </button>
              </div>
            ) : null}
          </div>

          <div className="mb-5 flex items-center gap-3 text-xs text-gray-500">
            <UserAvatar name={post.author} imageUrl={null} className="h-7 w-7" alt={post.author} />
            <span className="font-bold text-gray-700">{post.author}</span>
            <span>•</span>
            <span>{post.date}</span>
            <span>•</span>
            <span className="flex items-center gap-1"><i className="far fa-eye" /> {post.views}</span>
          </div>

          <div className="mb-6 whitespace-pre-wrap border-b border-gray-100 pb-6 text-sm leading-relaxed text-gray-700">{post.content}</div>

          <div className="mb-6 flex items-center gap-4">
            <button
              type="button"
              onClick={() => onLike(post.id)}
              className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold transition ${
                liked ? 'border-red-300 bg-red-50 text-red-500' : 'border-gray-200 text-gray-600 hover:border-red-300 hover:bg-red-50'
              }`}
            >
              <i className={`${liked ? 'fas' : 'far'} fa-heart`} />
              <span>{post.likes}</span>
            </button>
          </div>

          <h3 className="mb-4 flex items-center gap-2 font-bold text-gray-900">
            <i className="far fa-comment text-brand" /> 댓글 <span className="text-brand">{post.replies.length}</span>
          </h3>

          <div className="mb-5 space-y-4">
            {post.replies.length ? post.replies.map((reply) => (
              <div key={reply.id} className="reply-item flex gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
                <UserAvatar name={reply.author} imageUrl={null} className="h-9 w-9" alt={reply.author} />
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-800">{reply.author}</span>
                    <span className="text-xs text-gray-400">{reply.date}</span>
                  </div>
                  <p className="text-sm leading-relaxed text-gray-600">{reply.content}</p>
                </div>
                {reply.mine ? (
                  <button type="button" onClick={() => onDeleteReply(reply.id)} className="text-xs font-bold text-red-400 transition hover:text-red-500">
                    삭제
                  </button>
                ) : null}
              </div>
            )) : (
              <div className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-400">아직 댓글이 없습니다.</div>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="mb-3 flex items-center gap-2">
              <UserAvatar name={sessionName} imageUrl={profileImage} className="h-8 w-8" alt={sessionName} />
              <span className="text-sm font-bold text-gray-700">{sessionName}</span>
            </div>
            <textarea
              rows={3}
              value={replyDraft}
              onChange={(event) => onReplyDraftChange(event.target.value)}
              placeholder="댓글을 입력하세요."
              className="mb-3 w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm transition focus:border-brand focus:outline-none"
            />
            <div className="flex justify-end">
              <button type="button" onClick={onSubmitReply} className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-500">
                댓글 등록
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function EditPostModal({
  open,
  title,
  content,
  onClose,
  onTitleChange,
  onContentChange,
  onSubmit,
}: {
  open: boolean
  title: string
  content: string
  onClose: () => void
  onTitleChange: (value: string) => void
  onContentChange: (value: string) => void
  onSubmit: () => void
}) {
  if (!open) return null

  return (
    <div className="modal-overlay" onClick={onClose} aria-hidden="true">
      <div className="modal-box" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-extrabold text-gray-900">게시글 수정</h2>
          <button type="button" onClick={onClose} className="text-gray-400 transition hover:text-gray-600">
            <i className="fas fa-times text-xl" />
          </button>
        </div>
        <div className="px-6 pb-4 pt-5">
          <label className="mb-2 block text-sm font-bold text-gray-700">제목</label>
          <input
            type="text"
            value={title}
            onChange={(event) => onTitleChange(event.target.value.slice(0, 100))}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm transition focus:border-brand focus:outline-none"
          />
        </div>
        <div className="mb-6 px-6">
          <label className="mb-2 block text-sm font-bold text-gray-700">내용</label>
          <textarea
            rows={7}
            value={content}
            onChange={(event) => onContentChange(event.target.value)}
            className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm transition focus:border-brand focus:outline-none"
          />
        </div>
        <div className="flex justify-end gap-3 px-6 pb-6">
          <button type="button" onClick={onClose} className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-bold text-gray-600 transition hover:bg-gray-50">
            취소
          </button>
          <button type="button" onClick={onSubmit} className="rounded-xl bg-brand px-6 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-500">
            저장하기
          </button>
        </div>
      </div>
    </div>
  )
}
