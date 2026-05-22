import { useEffect, useMemo, useState, useCallback } from 'react'
import { enrollmentApi, wishlistApi } from '../../lib/api'
import { LearnerContentRow, LearnerPageShell, MyMenuSidebar } from '../template'
import type { Enrollment, WishlistCourse } from '../../types/learner'

const fallbackEnrollments: Enrollment[] = [
  {
    enrollmentId: 1,
    courseId: 1,
    courseTitle: 'Java 프로그래밍 (Backend Basic)',
    instructorName: 'DevPath',
    thumbnailUrl: 'https://images.unsplash.com/photo-1587620962725-abab7fe55159?w=500&q=80',
    price: 99000,
    originalPrice: 99000,
    currency: 'KRW',
    hasCertificate: true,
    status: 'ACTIVE',
    progressPercentage: 60,
    enrolledAt: '2026-01-25T00:00:00',
    completedAt: null,
    lastAccessedAt: '2026-02-09T10:00:00',
    tags: ['Java', 'Spring', 'Backend', 'OOP'],
  },
  {
    enrollmentId: 2,
    courseId: 2,
    courseTitle: '비전공자도 이해할 수 있는 Docker 입문/실전',
    instructorName: 'DevPath',
    thumbnailUrl: 'https://images.unsplash.com/photo-1607799275518-d580e811cc0e?w=500&q=80',
    price: 55000,
    originalPrice: 55000,
    currency: 'KRW',
    hasCertificate: false,
    status: 'ACTIVE',
    progressPercentage: 12,
    enrolledAt: '2026-01-12T00:00:00',
    completedAt: null,
    lastAccessedAt: '2026-02-08T10:00:00',
    tags: ['Docker', 'DevOps', 'Container', 'Linux'],
  },
  {
    enrollmentId: 3,
    courseId: 3,
    courseTitle: 'React + TypeScript 실전 프로젝트',
    instructorName: 'DevPath',
    thumbnailUrl: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=500&q=80',
    price: 65000,
    originalPrice: 65000,
    currency: 'KRW',
    hasCertificate: false,
    status: 'ACTIVE',
    progressPercentage: 35,
    enrolledAt: '2026-01-08T00:00:00',
    completedAt: null,
    lastAccessedAt: '2026-02-06T10:00:00',
    tags: ['React', 'TypeScript', 'Frontend', 'SPA'],
  },
]

const fallbackWishlist: WishlistCourse[] = [
  {
    wishlistId: 1,
    courseId: 4,
    courseTitle: 'Spring Security 실전 인증/인가',
    instructorName: 'DevPath',
    thumbnailUrl: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=500&q=80',
    price: 45000,
    addedAt: '2026-02-01T00:00:00',
  },
]

function getCategoryLabel(courseTitle: string) {
  if (courseTitle.toLowerCase().includes('docker') || courseTitle.toLowerCase().includes('k8s')) {
    return 'DevOps'
  }

  if (courseTitle.toLowerCase().includes('react')) {
    return 'Frontend'
  }

  return 'Backend'
}

function formatRelativeLabel(index: number, lastAccessedAt: string | null | undefined) {
  if (!lastAccessedAt) {
    return '마지막 학습: 최근'
  }

  if (index === 0) {
    return '마지막 학습: 2시간 전'
  }

  if (index === 1) {
    return '마지막 학습: 어제'
  }

  return '마지막 학습: 3일 전'
}

type SortBy = 'recent' | 'enrolled' | 'progress_high' | 'progress_low'
type CategoryFilter = 'all' | 'Backend' | 'Frontend' | 'DevOps'
type ProgressRange = 'all' | '0-25' | '26-75' | '76-99'
type PeriodFilter = 'all' | '1month' | '3months' | '6months'

function getUniqueInstructors(enrollments: Enrollment[]): string[] {
  return [...new Set(enrollments.map((e) => e.instructorName).filter(Boolean))]
}

function getUniqueTags(enrollments: Enrollment[]): string[] {
  return [...new Set(enrollments.flatMap((e) => e.tags ?? []))].sort()
}

function isWithinPeriod(dateStr: string, period: PeriodFilter): boolean {
  if (period === 'all') return true
  const date = new Date(dateStr)
  const threshold = new Date()
  threshold.setMonth(threshold.getMonth() - (period === '1month' ? 1 : period === '3months' ? 3 : 6))
  return date >= threshold
}

export default function MyLearningPage() {
  const [tab, setTab] = useState<'active' | 'completed' | 'wishlist'>('active')
  const [enrollments, setEnrollments] = useState<Enrollment[]>(fallbackEnrollments)
  const [wishlist, setWishlist] = useState<WishlistCourse[]>(fallbackWishlist)
  const [sortBy, setSortBy] = useState<SortBy>('recent')
  const [category, setCategory] = useState<CategoryFilter>('all')
  const [progressRange, setProgressRange] = useState<ProgressRange>('all')
  const [hasCertificateOnly, setHasCertificateOnly] = useState(false)
  const [instructor, setInstructor] = useState<string>('all')
  const [enrolledPeriod, setEnrolledPeriod] = useState<PeriodFilter>('all')
  const [selectedTag, setSelectedTag] = useState<string>('all')

  useEffect(() => {
    async function load() {
      try {
        const [enrollmentResponse, wishlistResponse] = await Promise.all([
          enrollmentApi.getMyEnrollments(),
          wishlistApi.getCourses(),
        ])

        if (enrollmentResponse.length) {
          setEnrollments(enrollmentResponse)
        }

        if (wishlistResponse.length) {
          setWishlist(wishlistResponse)
        }
      } catch {
        // 원본 내 학습 화면을 그대로 유지하기 위해 실패 시 기본 템플릿 데이터를 사용합니다.
      }
    }

    void load()
  }, [])

  const instructorNames = useMemo(() => getUniqueInstructors(enrollments), [enrollments])
  const allTags = useMemo(() => getUniqueTags(enrollments), [enrollments])

  const isFilterActive =
    category !== 'all' ||
    progressRange !== 'all' ||
    hasCertificateOnly ||
    instructor !== 'all' ||
    enrolledPeriod !== 'all' ||
    selectedTag !== 'all' ||
    sortBy !== 'recent'

  const resetFilters = useCallback(() => {
    setSortBy('recent')
    setCategory('all')
    setProgressRange('all')
    setHasCertificateOnly(false)
    setInstructor('all')
    setEnrolledPeriod('all')
    setSelectedTag('all')
  }, [])

  const filteredCourses = useMemo(() => {
    if (tab === 'wishlist') return wishlist

    let result =
      tab === 'completed'
        ? enrollments.filter((e) => e.status === 'COMPLETED')
        : enrollments.filter((e) => e.status !== 'COMPLETED')

    if (category !== 'all') {
      result = result.filter((e) => getCategoryLabel(e.courseTitle) === category)
    }

    if (progressRange !== 'all') {
      result = result.filter((e) => {
        const p = e.progressPercentage ?? 0
        if (progressRange === '0-25') return p <= 25
        if (progressRange === '26-75') return p >= 26 && p <= 75
        return p >= 76
      })
    }

    if (hasCertificateOnly) {
      result = result.filter((e) => e.hasCertificate)
    }

    if (selectedTag !== 'all') {
      result = result.filter((e) => e.tags?.includes(selectedTag))
    }

    if (instructor !== 'all') {
      result = result.filter((e) => e.instructorName === instructor)
    }

    if (enrolledPeriod !== 'all') {
      result = result.filter((e) => e.enrolledAt != null && isWithinPeriod(e.enrolledAt, enrolledPeriod))
    }

    return [...result].sort((a, b) => {
      if (sortBy === 'enrolled') {
        return new Date(b.enrolledAt ?? 0).getTime() - new Date(a.enrolledAt ?? 0).getTime()
      }
      if (sortBy === 'progress_high') {
        return (b.progressPercentage ?? 0) - (a.progressPercentage ?? 0)
      }
      if (sortBy === 'progress_low') {
        return (a.progressPercentage ?? 0) - (b.progressPercentage ?? 0)
      }
      return new Date(b.lastAccessedAt ?? 0).getTime() - new Date(a.lastAccessedAt ?? 0).getTime()
    })
  }, [enrollments, tab, wishlist, category, progressRange, hasCertificateOnly, instructor, enrolledPeriod, selectedTag, sortBy])

  return (
    <LearnerPageShell>
      <LearnerContentRow>
        <MyMenuSidebar
          currentPageKey="my-learning"
          wrapperClassName="w-60 shrink-0 hidden lg:block -ml-0"
          wrapperStyle={{ transform: 'translateX(-7.5px)' }}
        />

        <section className="min-w-0 flex-1">
          <h2 className="mb-6 text-2xl font-bold text-gray-900">내 학습</h2>

          <div className="mb-6 flex border-b border-gray-200">
            <button type="button" className={`tab-btn ${tab === 'active' ? 'active' : ''}`} onClick={() => setTab('active')}>
              학습 중 ({enrollments.filter((item) => item.status !== 'COMPLETED').length})
            </button>
            <button type="button" className={`tab-btn ${tab === 'completed' ? 'active' : ''}`} onClick={() => setTab('completed')}>
              완강 ({enrollments.filter((item) => item.status === 'COMPLETED').length})
            </button>
            <button type="button" className={`tab-btn ${tab === 'wishlist' ? 'active' : ''}`} onClick={() => setTab('wishlist')}>
              찜한 강의
            </button>
          </div>

          {tab !== 'wishlist' && (
            <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
              {/* 정렬 */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 focus:outline-none"
              >
                <option value="recent">최근 학습순</option>
                <option value="enrolled">수강 등록순</option>
                <option value="progress_high">진도율 높은순</option>
                <option value="progress_low">진도율 낮은순</option>
              </select>

              {/* 카테고리 */}
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as CategoryFilter)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 focus:outline-none"
              >
                <option value="all">전체 카테고리</option>
                <option value="Backend">Backend</option>
                <option value="Frontend">Frontend</option>
                <option value="DevOps">DevOps</option>
              </select>

              {/* 진도율 구간 */}
              <select
                value={progressRange}
                onChange={(e) => setProgressRange(e.target.value as ProgressRange)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 focus:outline-none"
              >
                <option value="all">전체 진도율</option>
                <option value="0-25">0 ~ 25%</option>
                <option value="26-75">26 ~ 75%</option>
                <option value="76-99">76 ~ 99%</option>
              </select>

              {/* 태그 */}
              {allTags.length > 0 && (
                <select
                  value={selectedTag}
                  onChange={(e) => setSelectedTag(e.target.value)}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 focus:outline-none"
                >
                  <option value="all">전체 태그</option>
                  {allTags.map((tag) => (
                    <option key={tag} value={tag}>
                      {tag}
                    </option>
                  ))}
                </select>
              )}

              {/* 수료증 토글 */}
              <label className="flex cursor-pointer items-center gap-1.5 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={hasCertificateOnly}
                  onChange={(e) => setHasCertificateOnly(e.target.checked)}
                  className="h-3.5 w-3.5 rounded accent-brand"
                />
                수료증 있는 강의만
              </label>

              {/* 강사명 (2명 이상일 때만) */}
              {instructorNames.length > 1 && (
                <select
                  value={instructor}
                  onChange={(e) => setInstructor(e.target.value)}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 focus:outline-none"
                >
                  <option value="all">전체 강사</option>
                  {instructorNames.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              )}

              {/* 등록 기간 */}
              <select
                value={enrolledPeriod}
                onChange={(e) => setEnrolledPeriod(e.target.value as PeriodFilter)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 focus:outline-none"
              >
                <option value="all">전체 기간</option>
                <option value="1month">최근 1개월</option>
                <option value="3months">최근 3개월</option>
                <option value="6months">최근 6개월</option>
              </select>

              {/* 초기화 버튼 */}
              {isFilterActive && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="ml-auto text-xs text-gray-400 underline hover:text-gray-600"
                >
                  필터 초기화
                </button>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredCourses.length ? (
              filteredCourses.map((item, index) => {
                const isWishlist = tab === 'wishlist'
                const courseTitle = 'courseTitle' in item ? item.courseTitle : ''
                const thumbnailUrl = item.thumbnailUrl ?? fallbackEnrollments[index % fallbackEnrollments.length]?.thumbnailUrl ?? ''

                return (
                  <div
                    key={`${item.courseId}-${index}`}
                    className="group cursor-pointer overflow-hidden rounded-xl border border-gray-200 bg-white transition hover:shadow-lg"
                  >
                    <div className="relative aspect-video bg-gray-100">
                      <img src={thumbnailUrl} className="h-full w-full object-cover" alt="thumb" />
                      {!isWishlist ? (
                        <div className="absolute bottom-0 left-0 h-1 w-full bg-gray-200">
                          <div className="bg-brand h-full" style={{ width: `${(item as Enrollment).progressPercentage ?? 0}%` }} />
                        </div>
                      ) : null}
                    </div>

                    <div className="p-5">
                      <div className="mb-2 flex items-start justify-between">
                        <span className="rounded bg-gray-100 px-2 py-1 text-[10px] font-bold text-gray-500">
                          {getCategoryLabel(courseTitle)}
                        </span>
                        {!isWishlist ? (
                          <span className="text-brand text-xs font-bold">{(item as Enrollment).progressPercentage ?? 0}%</span>
                        ) : (
                          <span className="text-xs font-bold text-gray-400">스크랩</span>
                        )}
                      </div>

                      <h3 className="mb-4 line-clamp-2 h-12 font-bold text-gray-900">{courseTitle}</h3>

                      <div className="mt-4 flex items-center justify-between">
                        <span className="text-xs text-gray-400">
                          {isWishlist
                            ? '보관함에 저장됨'
                            : formatRelativeLabel(index, (item as Enrollment).lastAccessedAt)}
                        </span>
                        <a href={`/learning?courseId=${item.courseId}`} className="bg-brand rounded-lg px-4 py-2 text-xs font-bold text-white transition hover:bg-green-600">
                          {isWishlist ? '보러가기' : '이어하기'}
                        </a>
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="rounded-xl border border-gray-200 bg-white px-6 py-10 text-sm text-gray-500">
                표시할 강의가 없습니다.
              </div>
            )}
          </div>
        </section>
      </LearnerContentRow>
    </LearnerPageShell>
  )
}
