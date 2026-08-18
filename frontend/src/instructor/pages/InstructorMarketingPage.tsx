import { useEffect, useState } from 'react'
import { ErrorCard, LoadingCard } from '../../account/ui'
import { formatDate, formatNumber } from '../../account/ui-utils'
import { instructorCourseApi, instructorMarketingApi } from '../../lib/api/instructor'
import type {
  InstructorCouponItem,
  InstructorCourseListItem,
  InstructorPromotionItem,
} from '../../types/instructor'

type CouponStatusKey = 'ALL' | 'ACTIVE' | 'EXPIRED' | 'PAUSED'

const quickActionBaseClass =
  'flex cursor-pointer items-center justify-between rounded-2xl border bg-gradient-to-r p-6 text-left transition hover:shadow-md'

function isExpired(expiresAt: string | null) {
  return Boolean(expiresAt) && new Date(expiresAt as string).getTime() < Date.now()
}

function getCouponStatusKey(coupon: InstructorCouponItem): Exclude<CouponStatusKey, 'ALL'> {
  if (!coupon.active) {
    return 'PAUSED'
  }

  if (isExpired(coupon.expiresAt)) {
    return 'EXPIRED'
  }

  return 'ACTIVE'
}

function getCouponStatusLabel(coupon: InstructorCouponItem) {
  switch (getCouponStatusKey(coupon)) {
    case 'PAUSED':
      return '일시 중지'
    case 'EXPIRED':
      return '만료'
    case 'ACTIVE':
    default:
      return '진행 중'
  }
}

function getCouponStatusTone(coupon: InstructorCouponItem) {
  switch (getCouponStatusKey(coupon)) {
    case 'PAUSED':
      return 'bg-yellow-100 text-yellow-700'
    case 'EXPIRED':
      return 'bg-gray-200 text-gray-700'
    case 'ACTIVE':
    default:
      return 'bg-green-100 text-green-800'
  }
}

function formatDiscount(coupon: InstructorCouponItem) {
  if (coupon.discountType === 'AMOUNT') {
    return `${formatNumber(coupon.discountValue)}원`
  }

  return `${formatNumber(coupon.discountValue)}%`
}

function buildUsageWidth(coupon: InstructorCouponItem) {
  if (!coupon.maxUsageCount || coupon.maxUsageCount <= 0) {
    return 0
  }

  return Math.min(100, Math.round((coupon.usageCount / coupon.maxUsageCount) * 100))
}

function getUsageTone(index: number) {
  return index === 0 ? 'bg-primary' : 'bg-blue-500'
}

function getCouponDisplayTitle(coupon: InstructorCouponItem) {
  return coupon.couponTitle || coupon.targetCourseTitle || `쿠폰 #${coupon.id}`
}

export default function InstructorMarketingPage() {
  const [courses, setCourses] = useState<InstructorCourseListItem[]>([])
  const [coupons, setCoupons] = useState<InstructorCouponItem[]>([])
  const [promotions, setPromotions] = useState<InstructorPromotionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCourseId, setSelectedCourseId] = useState('ALL')
  const [selectedStatus, setSelectedStatus] = useState<CouponStatusKey>('ALL')
  const [query, setQuery] = useState('')
  const [showExpiringSoonOnly, setShowExpiringSoonOnly] = useState(false)
  const [now] = useState(() => Date.now())

  useEffect(() => {
    const controller = new AbortController()

    Promise.all([
      instructorCourseApi.getCourses(controller.signal),
      instructorMarketingApi.getCoupons(controller.signal),
      instructorMarketingApi.getPromotions(controller.signal),
    ])
      .then(([nextCourses, nextCoupons, nextPromotions]) => {
        setCourses(nextCourses)
        setCoupons(nextCoupons)
        setPromotions(nextPromotions)
      })
      .catch((nextError: Error) => {
        if (!controller.signal.aborted) {
          setError(nextError.message)
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      })

    return () => controller.abort()
  }, [])

  if (loading) {
    return (
      <div className="p-6">
        <LoadingCard label="마케팅 데이터를 불러오는 중입니다." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <ErrorCard message={error} />
      </div>
    )
  }

  const activePromotions = promotions.filter((item) => item.active)
  const expiringSoonCoupons = coupons.filter((item) => {
    if (!item.expiresAt || getCouponStatusKey(item) !== 'ACTIVE') {
      return false
    }

    const expiresAt = new Date(item.expiresAt).getTime()
    const diffDays = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24))
    return diffDays >= 0 && diffDays <= 7
  })

  const filteredCoupons = coupons.filter((coupon) => {
    const matchesCourse = selectedCourseId === 'ALL'
      || String(coupon.targetCourseId ?? 'ALL') === selectedCourseId
    const matchesStatus = selectedStatus === 'ALL' || getCouponStatusKey(coupon) === selectedStatus
    const matchesExpiringSoon = !showExpiringSoonOnly || expiringSoonCoupons.some((item) => item.id === coupon.id)
    const searchText = `${getCouponDisplayTitle(coupon)} ${coupon.couponCode} ${coupon.targetCourseTitle}`.toLowerCase()
    const matchesQuery = !query.trim() || searchText.includes(query.trim().toLowerCase())

    return matchesCourse && matchesStatus && matchesExpiringSoon && matchesQuery
  })

  const topPromotion = activePromotions[0] ?? null

  return (
    <div className="p-6">
      <div className="mx-auto max-w-[1280px]">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900">마케팅 & 쿠폰 관리</h1>
            <p className="mt-1 text-sm text-gray-500">
              할인 쿠폰과 프로모션으로 수강생 유입과 전환 흐름을 정리해보세요.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex h-11 items-center gap-2 rounded-full border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 shadow-sm">
              <i className="fas fa-book text-indigo-500" />
              <select
                value={selectedCourseId}
                onChange={(event) => setSelectedCourseId(event.target.value)}
                className="h-full appearance-none bg-transparent leading-none outline-none"
              >
                <option value="ALL">전체 강의</option>
                {courses.map((course) => (
                  <option key={course.courseId} value={String(course.courseId)}>
                    {course.title}
                  </option>
                ))}
              </select>
            </label>

            <label className="inline-flex h-11 items-center gap-2 rounded-full border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 shadow-sm">
              <i className="fas fa-sliders text-violet-500" />
              <select
                value={selectedStatus}
                onChange={(event) => setSelectedStatus(event.target.value as CouponStatusKey)}
                className="h-full appearance-none bg-transparent leading-none outline-none"
              >
                <option value="ALL">전체 상태</option>
                <option value="ACTIVE">진행 중</option>
                <option value="EXPIRED">만료</option>
                <option value="PAUSED">일시 중지</option>
              </select>
            </label>

            <button
              type="button"
              onClick={() => window.alert('새 쿠폰 발행 기능은 다음 단계에서 연결합니다.')}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-gray-900 px-5 text-sm font-semibold text-white shadow-md transition hover:bg-black"
            >
              <i className="fas fa-plus" />
              새 쿠폰 발행하기
            </button>
          </div>
        </div>

        <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h3 className="font-semibold text-gray-900">진행 중인 프로모션</h3>

            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex h-11 items-center gap-2 rounded-full border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 shadow-sm">
                <i className="fas fa-magnifying-glass text-blue-500" />
                <input
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="쿠폰명 / 코드 검색"
                  className="h-full w-44 bg-transparent leading-none outline-none placeholder:text-gray-400"
                />
              </label>

              <button
                type="button"
                onClick={() => window.alert('내보내기 기능은 다음 단계에서 연결합니다.')}
                className="inline-flex h-11 items-center gap-2 rounded-full border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
              >
                <i className="fas fa-file-export text-rose-500" />
                내보내기
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-500">
              <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase text-gray-700">
                <tr>
                  <th className="rounded-l-lg px-4 py-3">쿠폰명 / 코드</th>
                  <th className="px-4 py-3">적용 강의</th>
                  <th className="px-4 py-3">할인</th>
                  <th className="px-4 py-3">사용 현황</th>
                  <th className="px-4 py-3">만료일</th>
                  <th className="rounded-r-lg px-4 py-3">상태</th>
                </tr>
              </thead>

              <tbody className="font-medium">
                {filteredCoupons.length > 0 ? (
                  filteredCoupons.map((coupon, index) => (
                    <tr key={coupon.id} className="border-b border-gray-50 bg-white transition hover:bg-gray-50">
                      <td className="px-4 py-4 font-semibold text-gray-900">
                        <div>{getCouponDisplayTitle(coupon)}</div>
                        <div className="mt-1 font-mono text-xs text-gray-400">{coupon.couponCode}</div>
                      </td>
                      <td className="px-4 py-4">{coupon.targetCourseTitle}</td>
                      <td className="px-4 py-4 font-semibold text-primary">{formatDiscount(coupon)}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">{formatNumber(coupon.usageCount)}</span>
                          <span>/ {coupon.maxUsageCount ? formatNumber(coupon.maxUsageCount) : '무제한'}</span>
                          <div className="h-2 w-20 overflow-hidden rounded-full bg-gray-200">
                            <div
                              className={`h-full ${getUsageTone(index)}`}
                              style={{ width: `${buildUsageWidth(coupon)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">{formatDate(coupon.expiresAt)}</td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-[5px] text-xs font-semibold leading-none ${getCouponStatusTone(coupon)}`}
                        >
                          {getCouponStatusLabel(coupon)}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-sm font-medium text-gray-400">
                      조건에 맞는 쿠폰이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-xs font-medium text-gray-400">
              만료 임박 쿠폰 {formatNumber(expiringSoonCoupons.length)}건, 진행 중인 프로모션 {formatNumber(activePromotions.length)}건이 있습니다.
            </p>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => window.alert('선택 쿠폰 비활성화 기능은 다음 단계에서 연결합니다.')}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                <i className="fas fa-pause text-amber-500" />
                즉시 비활성화
              </button>
              <button
                type="button"
                onClick={() => setShowExpiringSoonOnly((current) => !current)}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                <i className="fas fa-hourglass-half text-orange-500" />
                {showExpiringSoonOnly ? '전체 보기' : '만료 임박 보기'}
              </button>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <button
            type="button"
            onClick={() => window.alert('추천 코드 생성 기능은 다음 단계에서 연결합니다.')}
            className={`${quickActionBaseClass} from-yellow-50 to-orange-50 border-orange-100`}
          >
            <div>
              <h3 className="font-semibold text-gray-800">지인 추천 코드 생성</h3>
              <p className="mt-1 text-sm text-gray-500">
                친구 초대 시 강사와 학생 모두에게 혜택이 가는 추천 코드를 준비해보세요.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/80 px-3 py-2 text-sm font-semibold text-gray-700">
                  <i className="fas fa-ticket text-orange-500" />
                  추천코드
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/80 px-3 py-2 text-sm font-semibold text-gray-700">
                  <i className="fas fa-bolt text-yellow-500" />
                  자동적용
                </span>
              </div>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-orange-400 shadow-sm">
              <i className="fas fa-user-plus" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => window.alert('타임세일 설정 기능은 다음 단계에서 연결합니다.')}
            className={`${quickActionBaseClass} from-purple-50 to-indigo-50 border-indigo-100`}
          >
            <div>
              <h3 className="font-semibold text-gray-800">타임세일 설정</h3>
              <p className="mt-1 text-sm text-gray-500">
                {topPromotion
                  ? `현재 ${topPromotion.courseTitle} 포함 ${formatNumber(activePromotions.length)}개의 프로모션이 진행 중입니다.`
                  : '48시간 한정 할인으로 구매 전환 흐름을 빠르게 올려보세요.'}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/80 px-3 py-2 text-sm font-semibold text-gray-700">
                  <i className="fas fa-stopwatch text-indigo-500" />
                  48H
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/80 px-3 py-2 text-sm font-semibold text-gray-700">
                  <i className="fas fa-arrow-trend-up text-purple-500" />
                  전환율
                </span>
              </div>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-indigo-400 shadow-sm">
              <i className="fas fa-stopwatch" />
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
