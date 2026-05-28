import { useEffect, useState } from 'react'
import { ErrorCard, LoadingCard, formatDate, formatNumber } from '../../account/ui'
import UserAvatar from '../../components/UserAvatar'
import {
  buildInstructorCourseOptions,
  normalizeInstructorCourseTitle,
} from '../../instructor/course-display'
import { instructorCourseApi, instructorReviewApi, userApi } from '../../lib/api'
import type { AuthSession } from '../../types/auth'
import type {
  InstructorCourseListItem,
  InstructorReviewHelpful,
  InstructorReviewListItem,
  InstructorReviewSummary,
  InstructorReviewTemplate,
} from '../../types/instructor'
import type { UserProfile } from '../../types/learner'

type ReviewTabKey = 'all' | 'unreplied' | 'low'
type TemplateOption = { key: string; title: string; description: string; content: string }

const fallbackReviewTemplates: TemplateOption[] = [
  {
    key: 'thanks',
    title: '💖 감사 인사 (일반)',
    description: '소중한 수강평 감사합니다! 완강까지 응원하겠습니다.',
    content: '소중한 수강평 남겨주셔서 감사합니다! 도움이 되었다니 정말 기쁘네요. 완강까지 힘내시고 궁금한 점은 언제든 질문주세요! :)',
  },
  {
    key: 'apology',
    title: '🙇 사과 및 개선 약속',
    description: '불편을 드려 죄송합니다. 해당 내용은 확인 후 빠르게 수정하겠습니다.',
    content: '안녕하세요, 수강에 불편을 드려 죄송합니다. 말씀해주신 부분은 확인 후 최대한 빠르게 조치하겠습니다. 더 나은 강의가 되도록 노력하겠습니다.',
  },
  {
    key: 'guide',
    title: '📘 학습 가이드 제안',
    description: '어려움을 느끼셨군요. 섹션 3의 보충 강의를 먼저 보시면 도움이 됩니다.',
    content: "안녕하세요! 해당 부분은 조금 난이도가 있는 구간입니다. 섹션 3의 '보충 강의' 파트를 먼저 선수강하시면 이해에 큰 도움이 됩니다. 화이팅입니다!",
  },
  {
    key: 'review',
    title: '⭐ 5점 유도 (만족 시)',
    description: '도움이 되셨다니 다행입니다! 주변에도 많이 추천 부탁드려요 :)',
    content: '만족하셨다니 다행입니다! 괜찮으시다면 주변 동료분들께도 추천 부탁드립니다. 앞으로도 좋은 콘텐츠로 보답하겠습니다.',
  },
]

const legacyReviewContent: Record<string, string> = {
  'Examples were practical and the explanation flow was very clear.':
    '예제가 실무와 바로 연결돼서 좋았고, 설명 흐름도 자연스러워서 끝까지 집중해서 들을 수 있었습니다.',
  'The topic itself is useful, but I needed slower pacing around entity mapping and fetch strategy.':
    '주제 자체는 유용했지만 엔티티 매핑과 fetch 전략 부분은 조금 더 천천히 설명해주셨으면 좋겠습니다.',
  'Thanks for the feedback. I will add more mapping diagrams and a slower walkthrough in the next update.':
    '좋은 피드백 감사합니다. 다음 업데이트에서 매핑 다이어그램을 더 보강하고 해당 구간은 조금 더 천천히 설명하겠습니다.',
}

const legacyTemplateTitle: Record<string, string> = {
  'Thanks and follow-up': '감사 인사',
  'Issue acknowledged': '사과 및 개선 약속',
}

const legacyTemplateContent: Record<string, string> = {
  'Thanks for leaving a detailed review. I will reflect your feedback in the next revision.':
    '정성스러운 리뷰 남겨주셔서 감사합니다. 남겨주신 의견은 다음 개정에 바로 반영하겠습니다.',
  'I reproduced the issue and added it to the revision queue. I will update the course notes as well.':
    '불편을 드려 죄송합니다. 말씀해주신 내용을 확인했고, 강의 개정 목록에 반영해 보충 자료와 함께 정리하겠습니다.',
}

const legacyTags: Record<string, string> = {
  'clear-examples': '설명_자세해요',
  'good-pacing': '예제가_실전적이에요',
  'too-fast': '조금_빨라요',
  'needs-more-diagrams': '도식이_더_필요해요',
  'urgent-follow-up': '빠른_확인_필요',
  'follow-up': '후속_답변_필요',
}

const negativeTags = new Set([
  '조금_빨라요',
  '도식이_더_필요해요',
  '속도가_빨라요',
  '초보자에겐_어려워요',
  '보충_자료가_필요해요',
  '빠른_확인_필요',
  '후속_답변_필요',
  '설명이_조금_빨라요',
])

function t(value: string | null | undefined, dict: Record<string, string>) {
  if (!value) return ''
  return dict[value] ?? value
}

function normalizeTag(tag: string) {
  const next = tag.trim()
  return next ? legacyTags[next] ?? next : ''
}

function formatTag(tag: string) {
  return `#${normalizeTag(tag).replace(/\s+/g, '_')}`
}

function isNegativeTag(tag: string) {
  return negativeTags.has(normalizeTag(tag))
}

function relativeDateLabel(value: string | null) {
  if (!value) return '날짜 정보 없음'
  const diffMinutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000))
  if (diffMinutes < 1) return '방금 전'
  if (diffMinutes < 60) return `${diffMinutes}분 전`
  if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}시간 전`
  if (diffMinutes < 10080) return `${Math.floor(diffMinutes / 1440)}일 전`
  return formatDate(value)
}

function sortReviews(reviews: InstructorReviewListItem[], sort: string) {
  return [...reviews].sort((left, right) => {
    const leftTime = new Date(left.createdAt ?? 0).getTime()
    const rightTime = new Date(right.createdAt ?? 0).getTime()
    if (sort === 'oldest') return leftTime - rightTime
    if (sort === 'high') return right.rating - left.rating
    if (sort === 'low') return left.rating - right.rating
    return rightTime - leftTime
  })
}

function normalizeReview(review: InstructorReviewListItem): InstructorReviewListItem {
  const learnerNameMap: Record<string, string> = {
    Learner: '수강생',
    'Learner Park': '박수강',
    'Learner Lee': '이수강',
  }

  return {
    ...review,
    courseTitle: normalizeInstructorCourseTitle(review.courseTitle),
    learnerName: learnerNameMap[review.learnerName] ?? review.learnerName,
    content: t(review.content, legacyReviewContent),
    issueTags: review.issueTags.map(normalizeTag).filter(Boolean),
    reply: review.reply
      ? {
          ...review.reply,
          authorName: review.reply.authorName && review.reply.authorName !== 'Instructor' ? review.reply.authorName : '강사',
          content: t(review.reply.content, legacyReviewContent),
        }
      : null,
  }
}

function buildKeywordTags(reviews: InstructorReviewListItem[]) {
  const counts = new Map<string, number>()
  reviews.forEach((review) => review.issueTags.forEach((tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1)))
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 6)
    .map(([tag, count]) => ({ label: `#${tag} (${count})`, issue: isNegativeTag(tag) }))
}

function getIssueMeta(review: InstructorReviewListItem) {
  if (review.reply) {
    return { badge: '답변 완료', badgeTone: 'border-gray-200 bg-gray-100 text-gray-500', borderTone: 'border-l-[#00C471]', icon: 'fa-check' }
  }
  if (review.rating <= 2) {
    return { badge: '불만족', badgeTone: 'border-red-100 bg-red-50 text-red-600', borderTone: 'border-l-red-400', icon: 'fa-exclamation-triangle' }
  }
  return { badge: '미답변', badgeTone: 'border-orange-200 bg-orange-100 text-orange-600', borderTone: 'border-l-orange-400', icon: 'fa-exclamation-circle' }
}

async function fetchReviewData(signal?: AbortSignal) {
  return Promise.all([
    instructorReviewApi.getReviews(signal),
    instructorReviewApi.getSummary(signal),
    instructorReviewApi.getHelpful(signal),
    instructorReviewApi.getTemplates(signal),
  ])
}

export default function InstructorReviewsPage({ session }: { session: AuthSession }) {
  const [reviews, setReviews] = useState<InstructorReviewListItem[]>([])
  const [courseCatalog, setCourseCatalog] = useState<InstructorCourseListItem[]>([])
  const [summary, setSummary] = useState<InstructorReviewSummary | null>(null)
  const [helpful, setHelpful] = useState<InstructorReviewHelpful | null>(null)
  const [templates, setTemplates] = useState<InstructorReviewTemplate[]>([])
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentTab, setCurrentTab] = useState<ReviewTabKey>('all')
  const [courseFilter, setCourseFilter] = useState('all')
  const [sortFilter, setSortFilter] = useState('latest')
  const [starFilter, setStarFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [openReplyFormId, setOpenReplyFormId] = useState<number | null>(null)
  const [replyDrafts, setReplyDrafts] = useState<Record<number, string>>({})
  const [templateModalOpen, setTemplateModalOpen] = useState(false)
  const [activeReplyTargetId, setActiveReplyTargetId] = useState<number | null>(null)
  const [visibleLimit, setVisibleLimit] = useState(6)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    Promise.all([
      fetchReviewData(controller.signal),
      userApi.getMyProfile(controller.signal).catch(() => null),
      instructorCourseApi.getCourses(controller.signal).catch(() => []),
    ])
      .then(([[nextReviews, nextSummary, nextHelpful, nextTemplates], nextProfile, nextCourses]) => {
        setReviews(nextReviews.map(normalizeReview))
        setSummary(nextSummary)
        setHelpful(nextHelpful)
        setTemplates(nextTemplates)
        setProfile(nextProfile)
        setCourseCatalog(nextCourses)
      })
      .catch((nextError: Error) => {
        if (!controller.signal.aborted) setError(nextError.message)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    setVisibleLimit(6)
  }, [currentTab, courseFilter, sortFilter, starFilter, search])

  async function refreshReviewData() {
    const [nextReviews, nextSummary, nextHelpful, nextTemplates] = await fetchReviewData()
    setReviews(nextReviews.map(normalizeReview))
    setSummary(nextSummary)
    setHelpful(nextHelpful)
    setTemplates(nextTemplates)
  }

  function updateDraft(reviewId: number, value: string) {
    setReplyDrafts((current) => ({ ...current, [reviewId]: value }))
  }

  function toggleReplyForm(review: InstructorReviewListItem) {
    setOpenReplyFormId((current) => (current === review.reviewId ? null : review.reviewId))
    setReplyDrafts((current) => ({ ...current, [review.reviewId]: current[review.reviewId] ?? review.reply?.content ?? '' }))
  }

  function openTemplateModal(reviewId: number) {
    setActiveReplyTargetId(reviewId)
    setTemplateModalOpen(true)
  }

  function insertTemplate(template: TemplateOption) {
    if (!activeReplyTargetId) return
    setReplyDrafts((current) => ({
      ...current,
      [activeReplyTargetId]: template.content,
    }))
    setTemplateModalOpen(false)
  }

  async function submitReply(reviewId: number) {
    const review = reviews.find((item) => item.reviewId === reviewId)
    const draft = replyDrafts[reviewId]?.trim()
    if (!review) return
    if (!draft) {
      window.alert('답변 내용을 입력해주세요.')
      return
    }
    try {
      if (review.reply) await instructorReviewApi.updateReply(reviewId, review.reply.replyId, draft)
      else await instructorReviewApi.createReply(reviewId, draft)
      await refreshReviewData()
      setOpenReplyFormId(null)
    } catch (nextError) {
      window.alert(nextError instanceof Error ? nextError.message : '답변 저장에 실패했습니다.')
    }
  }

  async function registerIssue(reviewId: number) {
    const review = reviews.find((item) => item.reviewId === reviewId)
    if (!review) return
    const nextTags = review.issueTags.length > 0 ? review.issueTags : review.rating <= 2 ? ['빠른_확인_필요', '설명이_조금_빨라요'] : ['후속_답변_필요']
    try {
      await instructorReviewApi.addIssueTags(reviewId, nextTags)
      await refreshReviewData()
      window.alert('관리자 신고 대기열에 등록되었습니다.')
    } catch (nextError) {
      window.alert(nextError instanceof Error ? nextError.message : '이슈 등록에 실패했습니다.')
    }
  }

  const availableCourseOptions = buildInstructorCourseOptions(courseCatalog).filter(([value]) =>
    reviews.some((review) => String(review.courseId) === value),
  )
  const allowedCourseIds = new Set(availableCourseOptions.map(([value]) => Number(value)))
  const scopedReviews =
    courseCatalog.length > 0
      ? reviews.filter((review) => allowedCourseIds.has(review.courseId))
      : reviews

  useEffect(() => {
    if (courseFilter !== 'all' && !availableCourseOptions.some(([value]) => value === courseFilter)) {
      setCourseFilter('all')
    }
  }, [courseFilter, availableCourseOptions])

  if (loading) return <div className="instructor-reviews-page p-6"><LoadingCard label="수강평 데이터를 불러오는 중입니다." /></div>
  if (error || !summary || !helpful) return <div className="instructor-reviews-page p-6"><ErrorCard message={error ?? '수강평 데이터를 불러오지 못했습니다.'} /></div>

  const totalReviewCount = summary.totalReviews
  const unansweredCount = helpful.unansweredCount
  const lowRatingCount = scopedReviews.filter((review) => review.rating <= 3).length
  const courseOptions = availableCourseOptions
  const keywordTags = buildKeywordTags(scopedReviews)
  const apiTemplateOptions = templates.map((template) => {
    const title = t(template.title, legacyTemplateTitle)
    const content = t(template.content, legacyTemplateContent)
    return { key: String(template.id), title, description: content.length > 52 ? `${content.slice(0, 52)}...` : content, content }
  })
  const templateOptions = apiTemplateOptions.length > 0 ? apiTemplateOptions : fallbackReviewTemplates

  const filteredReviews = scopedReviews.filter((review) => {
    if (courseFilter !== 'all' && String(review.courseId) !== courseFilter) return false
    if (currentTab === 'unreplied' && review.reply) return false
    if (currentTab === 'low' && review.rating > 3) return false
    if (starFilter === '5' && Math.floor(review.rating) !== 5) return false
    if (starFilter === '4' && Math.floor(review.rating) !== 4) return false
    if (starFilter === '3' && review.rating > 3) return false
    if (!search.trim()) return true
    const searchText = `${review.courseTitle} ${review.learnerName} ${review.content} ${review.issueTags.join(' ')} ${review.reply?.content ?? ''}`.toLowerCase()
    return searchText.includes(search.trim().toLowerCase())
  })
  const visibleReviews = sortReviews(filteredReviews, sortFilter).slice(0, visibleLimit)
  const hasMore = filteredReviews.length > visibleLimit

  return (
    <div className="instructor-reviews-page w-full overflow-y-auto bg-[#F8F9FA] p-8">
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h1 className="mb-1 text-2xl font-black tracking-tight text-gray-900">수강평 관리</h1>
            <p className="text-sm font-medium text-gray-500">수강생의 피드백을 확인하고 답변으로 소통해 강의 만족도를 높여보세요.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="instructor-reviews-course-filter relative">
              <select value={courseFilter} onChange={(event) => setCourseFilter(event.target.value)} className="instructor-reviews-course-select min-w-[240px] cursor-pointer appearance-none rounded-lg border border-gray-200 bg-white py-2 pl-4 pr-10 text-sm font-bold text-gray-700 shadow-sm outline-none focus:border-green-500">
                <option value="all">전체 강의 보기</option>
                {courseOptions.map(([courseId, courseTitle]) => <option key={courseId} value={courseId}>{courseTitle}</option>)}
              </select>
              <i className="instructor-reviews-course-arrow fas fa-chevron-down pointer-events-none absolute right-3 top-3 text-xs text-gray-400" />
            </div>
            <div className="instructor-reviews-search-box flex h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 shadow-sm">
              <i className="fas fa-search text-gray-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} type="text" placeholder="검색" className="w-32 bg-transparent text-sm font-bold text-gray-600 outline-none placeholder:text-gray-400" />
            </div>
          </div>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-3">
          <article className="flex h-full flex-col justify-between rounded-2xl border border-gray-200 bg-white p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_25px_rgba(0,0,0,0.05)]">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-widest text-gray-400">평균 평점</span>
              <span className="rounded bg-green-100 px-2 py-1 text-[10px] font-bold text-green-700">최근 30일</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-gray-900">{summary.averageRating.toFixed(1)}</span>
              <span className="text-sm font-bold text-gray-400">/ 5.0</span>
            </div>
            <div className="mt-4 space-y-2">
              {[5, 4, 3, 2, 1].map((stars) => {
                const count = Number(summary.ratingDistribution?.[String(stars)] ?? 0)
                const percent = totalReviewCount > 0 ? Math.round((count / totalReviewCount) * 100) : 0
                const tone = stars === 5 ? 'bg-green-500' : stars === 4 ? 'bg-green-400' : stars === 3 ? 'bg-yellow-400' : stars === 2 ? 'bg-orange-400' : 'bg-red-400'
                return (
                  <div key={stars} className="flex items-center gap-2 text-xs font-bold text-gray-500">
                    <span className="w-3">{stars}</span>
                    <i className={`fas fa-star text-[10px] ${stars >= 4 ? 'text-yellow-400' : 'text-gray-300'}`} />
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                      <div className={`h-full rounded-full ${tone}`} style={{ width: `${percent}%` }} />
                    </div>
                    <span className="w-8 text-right">{percent}%</span>
                  </div>
                )
              })}
            </div>
          </article>

          <article className="relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_25px_rgba(0,0,0,0.05)]">
            <div className="absolute right-0 top-0 p-4 opacity-10">
              <i className="fas fa-comment-dots text-8xl text-orange-500" />
            </div>
            <div className="relative z-10 mb-4 flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-widest text-gray-400">답변 대기</span>
              <span className="rounded bg-orange-100 px-2 py-1 text-[10px] font-bold text-orange-700">확인 필요</span>
            </div>
            <div className="relative z-10">
              <div className="mb-1 text-4xl font-black text-gray-900">
                {formatNumber(unansweredCount)}
                <span className="ml-1 text-lg font-bold text-gray-400">건</span>
              </div>
              <p className="text-xs font-bold text-gray-500">답변을 기다리는 수강생이 있습니다.</p>
            </div>
            <div className="relative z-10 mt-6">
              <button type="button" onClick={() => setCurrentTab('unreplied')} className="w-full rounded-lg bg-orange-500 py-2 text-xs font-bold text-white shadow-md transition hover:bg-orange-600">
                미답변 리뷰 모아보기 <i className="fas fa-arrow-right ml-1" />
              </button>
            </div>
          </article>

          <article className="flex h-full flex-col justify-between rounded-2xl border border-gray-200 bg-white p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_25px_rgba(0,0,0,0.05)]">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-widest text-gray-400">리뷰 키워드</span>
              <i className="fas fa-lightbulb text-yellow-400" />
            </div>
            <div className="flex min-h-[108px] flex-wrap content-start gap-2">
              {keywordTags.length > 0 ? (
                keywordTags.map((tag) => (
                  <span key={tag.label} className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${tag.issue ? 'border border-red-100 bg-red-50 text-red-700' : 'border border-green-100 bg-green-50 text-green-700'}`}>
                    {tag.label}
                  </span>
                ))
              ) : (
                <span className="text-xs font-bold text-gray-400">아직 표시할 리뷰 키워드가 없습니다.</span>
              )}
            </div>
            <p className="mt-2 text-right text-[10px] font-bold text-gray-400">* 최근 30일 리뷰 분석</p>
          </article>
        </div>

        <div className="mb-4 flex border-b border-gray-200">
          {[
            { key: 'all', label: '전체 수강평', count: totalReviewCount, tone: 'bg-gray-100 text-gray-600' },
            { key: 'unreplied', label: '미답변', count: unansweredCount, tone: 'bg-orange-100 text-orange-600' },
            { key: 'low', label: '별점 3점 이하', count: lowRatingCount, tone: 'bg-gray-100 text-gray-600' },
          ].map((tab) => (
            <button key={tab.key} type="button" onClick={() => setCurrentTab(tab.key as ReviewTabKey)} className={`-mb-px flex items-center px-6 py-3 text-sm font-bold transition ${currentTab === tab.key ? 'border-b-2 border-b-[#00C471] text-[#00C471]' : 'border-b-2 border-b-transparent text-gray-500 hover:text-gray-900'}`}>
              {tab.label}
              <span className={`ml-2 rounded-full px-2 py-0.5 text-[11px] font-bold ${currentTab === tab.key ? 'bg-[#E6F9F1] text-[#00C471]' : tab.tone}`}>
                {formatNumber(tab.count)}
              </span>
            </button>
          ))}
        </div>

        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex gap-2">
            <select value={sortFilter} onChange={(event) => setSortFilter(event.target.value)} className="cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] font-semibold text-gray-700 outline-none focus:border-[#00C471]">
              <option value="latest">최신순</option>
              <option value="oldest">오래된순</option>
              <option value="high">별점 높은순</option>
              <option value="low">별점 낮은순</option>
            </select>
            <select value={starFilter} onChange={(event) => setStarFilter(event.target.value)} className="cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] font-semibold text-gray-700 outline-none focus:border-[#00C471]">
              <option value="all">별점 전체</option>
              <option value="5">5점만</option>
              <option value="4">4점만</option>
              <option value="3">3점 이하</option>
            </select>
          </div>
          <div className="text-xs font-bold text-gray-400">
            총 <span className="text-gray-900">{formatNumber(filteredReviews.length)}</span>개의 리뷰가 표시됩니다.
          </div>
        </div>

        <div id="reviewList">
          {visibleReviews.map((review) => {
            const meta = getIssueMeta(review)
            const displayName = profile?.name || review.reply?.authorName || session.name
            const profileImage = profile?.profileImage ?? review.reply?.authorProfileImage ?? null
            return (
              <article key={review.reviewId} className={`group relative mb-4 rounded-xl border border-gray-200 border-l-4 bg-white p-6 transition hover:border-emerald-200 hover:shadow-[0_4px_20px_rgba(0,196,113,0.08)] ${meta.borderTone}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="mb-2 inline-block rounded-md bg-gray-100 px-2 py-1 text-[11px] font-extrabold text-gray-500">{review.courseTitle}</span>
                    <div className="mb-2 mt-1 flex items-center gap-2">
                      <div className="flex text-xs text-yellow-400">
                        {Array.from({ length: 5 }).map((_, index) => {
                          if (index < Math.floor(review.rating)) return <i key={index} className="fas fa-star" />
                          if (index === Math.floor(review.rating) && review.rating % 1 !== 0) return <i key={index} className="fas fa-star-half-alt" />
                          return <i key={index} className="far fa-star" />
                        })}
                      </div>
                      <span className="text-sm font-black text-gray-900">{review.rating.toFixed(1)}</span>
                      <span className="mx-1 text-xs font-bold text-gray-400">·</span>
                      <span className="text-xs font-bold text-gray-500">{review.learnerName}</span>
                      <span className="text-xs font-bold text-gray-300">{relativeDateLabel(review.createdAt)}</span>
                    </div>
                  </div>
                  <span className={`rounded-full border px-2 py-1 text-[10px] font-bold ${meta.badgeTone}`}>
                    <i className={`fas ${meta.icon} mr-1`} />
                    {meta.badge}
                  </span>
                </div>

                <p className="mb-3 text-sm font-medium leading-relaxed text-gray-700">{review.content}</p>

                {review.issueTags.length > 0 ? (
                  <div className="mb-4 flex flex-wrap gap-2">
                    {review.issueTags.map((tag) => (
                      <span key={`${review.reviewId}-${tag}`} className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${isNegativeTag(tag) ? 'border border-red-100 bg-red-50 text-red-700' : 'border border-green-100 bg-green-50 text-green-700'}`}>
                        {formatTag(tag)}
                      </span>
                    ))}
                  </div>
                ) : null}

                {review.reply ? (
                  <div className="mt-4 border-t border-gray-100 pt-4">
                    <div className="flex items-start">
                      <div className="z-10 flex flex-col items-center gap-1">
                        <UserAvatar name={displayName} imageUrl={profileImage} className="h-8 w-8 bg-white shadow-sm" alt={displayName} />
                        <div className="my-1 h-full w-px bg-gray-200" />
                      </div>
                      <div className="relative ml-5 flex-1 rounded-[0_12px_12px_12px] border border-green-200 bg-green-50 px-4 py-4">
                        <div className="absolute left-[-9px] top-0 h-0 w-0 border-t-[12px] border-l-[12px] border-t-green-200 border-l-transparent" />
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-xs font-black text-green-700">{displayName} (강사)</span>
                          <span className="text-[10px] font-bold text-gray-400">{relativeDateLabel(review.reply.updatedAt ?? review.reply.createdAt)}</span>
                        </div>
                        <p className="text-sm text-gray-700">{review.reply.content}</p>
                        <div className="mt-2 text-right">
                          <button type="button" onClick={() => toggleReplyForm(review)} className="text-[10px] font-bold text-gray-400 underline transition hover:text-gray-600">수정</button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                {openReplyFormId === review.reviewId ? (
                  <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50 p-4">
                    <div className="flex items-start gap-3">
                      <UserAvatar name={displayName} imageUrl={profileImage} className="h-8 w-8 bg-white" alt={displayName} />
                      <div className="flex-1">
                        <textarea
                          rows={review.rating <= 3 ? 4 : 3}
                          value={replyDrafts[review.reviewId] ?? ''}
                          onChange={(event) => updateDraft(review.reviewId, event.target.value)}
                          placeholder={review.rating <= 3 ? '수강생에게 구체적인 해결책이나 보충 학습 방향을 답변해주세요.' : '수강생에게 격려의 말이나 해결책을 답변해주세요.'}
                          className="min-h-[110px] w-full rounded-lg border border-gray-200 bg-white px-4 py-3.5 text-sm font-medium text-gray-700 outline-none transition focus:border-[#00C471] focus:shadow-[0_0_0_3px_rgba(0,196,113,0.10)] placeholder:text-gray-400"
                        />
                        <div className="mt-3 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => openTemplateModal(review.reviewId)}
                            disabled={templateOptions.length === 0}
                            className={`rounded border px-2 py-1 text-xs font-bold transition ${
                              templateOptions.length > 0
                                ? 'border-green-100 bg-green-50 text-green-600 hover:text-green-800'
                                : 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'
                            }`}
                          >
                            <i className="fas fa-bolt mr-1" />템플릿 불러오기
                          </button>
                          <button type="button" onClick={() => submitReply(review.reviewId)} className="rounded-lg border border-gray-900 bg-gray-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-black">
                            답글 등록
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                {!review.reply && openReplyFormId !== review.reviewId ? (
                  <div className="flex gap-2">
                    <button type="button" onClick={() => toggleReplyForm(review)} className="rounded-lg border border-[#00C471] bg-green-50 px-3.5 py-2 text-xs font-bold text-[#00C471] transition hover:bg-green-100">
                      <i className="fas fa-reply mr-1" />답글 작성
                    </button>
                    <button type="button" onClick={() => registerIssue(review.reviewId)} className="rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs font-bold text-gray-700 transition hover:bg-gray-50">
                      <i className="fas fa-flag mr-1" />이슈 등록
                    </button>
                  </div>
                ) : null}
              </article>
            )
          })}
        </div>

        {hasMore ? (
          <div className="py-6 text-center">
            <button type="button" onClick={() => setVisibleLimit((current) => current + 6)} className="text-sm font-bold text-gray-500 transition hover:text-gray-800">
              더 불러오기 <i className="fas fa-chevron-down ml-1" />
            </button>
          </div>
        ) : null}
      </div>

      {templateModalOpen ? (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-[400px] overflow-hidden rounded-2xl bg-white shadow-[0_10px_40px_rgba(0,0,0,0.2)]">
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-5 py-4">
              <h3 className="text-sm font-black text-gray-900"><i className="fas fa-bolt mr-2 text-yellow-400" />빠른 답변 템플릿</h3>
              <button type="button" onClick={() => setTemplateModalOpen(false)} className="text-gray-400 transition hover:text-gray-600">
                <i className="fas fa-times" />
              </button>
            </div>
            <div className="max-h-[300px] overflow-y-auto">
              {templateOptions.length > 0 ? (
                templateOptions.map((template) => (
                  <button key={template.key} type="button" onClick={() => insertTemplate(template)} className="w-full border-b border-gray-100 px-5 py-4 text-left transition last:border-b-0 hover:bg-gray-50">
                    <div className="mb-1 text-[13px] font-extrabold text-gray-900">{template.title}</div>
                    <div className="truncate text-xs text-gray-500">{template.description}</div>
                  </button>
                ))
              ) : (
                <div className="px-5 py-10 text-center text-sm font-medium text-gray-500">
                  등록된 답변 템플릿이 없습니다.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
