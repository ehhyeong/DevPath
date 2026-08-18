import { useAuthSession } from '../../lib/useAuthSession'
import { useEffect, useMemo, useState } from 'react'
import { navigateTo } from '../../lib/spa-navigation'
import AuthModal, { type AuthView } from '../../components/AuthModal'
import SiteHeader from '../../components/SiteHeader'
import {
  applyInstructorChannelCustomization,
  buildMyInstructorEditProfileHref,
  fallbackInstructorCareers,
  readInstructorChannelCustomization,
  type InstructorChannelListItem,
  type InstructorChannelNoticeItem,
} from './customization'
import {
  buildPlaylistSections,
  buildRatingFilterKey,
  buildReviewSummary,
  fallbackCommunityPosts,
  fallbackInstructorReviews,
  fallbackNotices,
  filterCommunityPosts,
  mergeInstructorChannel,
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
} from './support'
import { authApi, userApi } from '../../lib/api/auth'
import { instructorSubscriptionApi, publicInstructorApi } from '../../lib/api/instructor'
import { AUTH_SESSION_SYNC_EVENT, clearStoredAuthSession, readStoredAuthSession } from '../../lib/auth-session'
import { useInternalPageScroll } from '../../lib/useInternalPageScroll'
import { readAuthViewFromLocation,readNumberSearchParam,syncAuthViewInLocation } from '../../lib/location-state'
import type { InstructorChannel } from '../../types/instructor'
import { ChannelHero,CommunityTab,EditPostModal,HomeTab,PlaylistTab,PostDetailModal,ReviewsTab,WritePostModal } from './InstructorChannelSections'

type WriteCategory = Exclude<CommunityCategory, 'notice'>

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
  const [session,setSession] = useAuthSession()
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
  }, [setSession])

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
    navigateTo(`/course-detail?courseId=${courseId}`)
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
        <div className="instructor-channel-body-zoom [--instructor-channel-body-zoom:0.9] w-[calc(100%_/_var(--instructor-channel-body-zoom))] ml-[calc((100%_-_(100%_/_var(--instructor-channel-body-zoom)))_/_2)] [zoom:var(--instructor-channel-body-zoom)] origin-top-left [@media(max-width:1023px)]:w-full [@media(max-width:1023px)]:ml-0 [@media(max-width:1023px)]:[zoom:1] [@media(max-width:1023px)]:transform-none">
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
            <div className={activeTab === 'home' ? 'block animate-[fadeIn_0.3s_ease-out]' : 'hidden'}>
              <HomeTab
                channel={channel}
                careers={careers}
                notices={notices}
                spotlightCourse={spotlightCourse}
                onOpenCourse={handleOpenCourse}
              />
            </div>

            <div className={activeTab === 'playlist' ? 'block animate-[fadeIn_0.3s_ease-out]' : 'hidden'}>
              <PlaylistTab
                playlistFilter={playlistFilter}
                sections={filteredPlaylistSections}
                bookmarkedCourseIds={bookmarkedCourseIds}
                onFilterChange={setPlaylistFilter}
                onOpenCourse={handleOpenCourse}
                onToggleBookmark={handleToggleBookmark}
              />
            </div>

            <div className={activeTab === 'community' ? 'block animate-[fadeIn_0.3s_ease-out]' : 'hidden'}>
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

            <div className={activeTab === 'reviews' ? 'block animate-[fadeIn_0.3s_ease-out]' : 'hidden'}>
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
