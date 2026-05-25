import { useEffect, useState, type CSSProperties } from 'react'
import { enrollmentApi, proofCardApi, wishlistApi } from '../../lib/api'
import { LearnerContentRow, LearnerPageShell, MyMenuSidebar } from '../template'
import type { Enrollment, ProofCardGalleryItem, WishlistCourse } from '../../types/learner'

type PurchaseTab = 'history' | 'vault'

type ReceiptItem = {
  title: string
  date: string
  price: string
}

const tabButtonBaseStyle: CSSProperties = {
  position: 'relative',
  margin: 0,
  padding: '12px 8px',
  border: 0,
  backgroundColor: 'transparent',
  color: '#6B7280',
  cursor: 'pointer',
  fontFamily: 'Pretendard, sans-serif',
  fontSize: '0.95rem',
  fontWeight: 500,
  lineHeight: '1.5',
  transition: 'all 0.2s',
}

function tabButtonStyle(active: boolean): CSSProperties {
  return {
    ...tabButtonBaseStyle,
    color: active ? '#00C471' : '#6B7280',
    fontWeight: active ? 700 : 500,
  }
}

function formatShortDate(value: string | null | undefined) {
  if (!value) {
    return '-'
  }

  const date = new Date(value)

  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
}

function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return '₩0'
  }

  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(value)
}

function purchaseStatusLabel(status: string) {
  if (status === 'COMPLETED' || status === 'ACTIVE') {
    return '결제 완료'
  }

  return status
}

export default function PurchasePage() {
  const [tab, setTab] = useState<PurchaseTab>('history')
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [wishlist, setWishlist] = useState<WishlistCourse[]>([])
  const [proofCards, setProofCards] = useState<ProofCardGalleryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptItem | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      setIsLoading(true)
      setLoadError('')

      try {
        const [enrollmentResult, wishlistResult, proofCardResult] = await Promise.allSettled([
          enrollmentApi.getMyEnrollments(controller.signal),
          wishlistApi.getCourses(controller.signal),
          proofCardApi.getGallery(controller.signal),
        ])

        if (controller.signal.aborted) {
          return
        }

        setEnrollments(enrollmentResult.status === 'fulfilled' ? enrollmentResult.value : [])
        setWishlist(wishlistResult.status === 'fulfilled' ? wishlistResult.value : [])
        setProofCards(proofCardResult.status === 'fulfilled' ? proofCardResult.value : [])

        if ([enrollmentResult, wishlistResult, proofCardResult].some((result) => result.status === 'rejected')) {
          setLoadError('일부 데이터를 불러오지 못했습니다.')
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    void load()

    return () => controller.abort()
  }, [])

  const hasArchiveItems = wishlist.length > 0 || proofCards.length > 0

  return (
    <LearnerPageShell>
      <LearnerContentRow>
        <MyMenuSidebar
          currentPageKey="purchase"
          wrapperClassName="w-60 shrink-0 hidden lg:block -ml-0"
          spacerClassName="h-[64px]"
        />

        <section className="min-w-0 flex-1">
          <h2 className="mb-6 text-2xl leading-none font-bold text-gray-900" style={{ paddingTop: 5 }}>
            구매 / 보관함
          </h2>

          <div className="mb-6 flex gap-6 border-b border-gray-200">
            <button type="button" style={tabButtonStyle(tab === 'history')} onClick={() => setTab('history')}>
              결제 내역
              {tab === 'history' ? <span className="absolute right-0 bottom-0 left-0 h-0.5 bg-brand" /> : null}
            </button>
            <button type="button" style={tabButtonStyle(tab === 'vault')} onClick={() => setTab('vault')}>
              보관함 (스크랩)
              {tab === 'vault' ? <span className="absolute right-0 bottom-0 left-0 h-0.5 bg-brand" /> : null}
            </button>
          </div>

          {loadError ? <div className="mb-4 text-xs font-bold text-amber-600">{loadError}</div> : null}

          {tab === 'history' ? (
            <div id="paymentTab" className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="border-b border-gray-100 bg-gray-50/70 text-xs text-gray-400 uppercase">
                    <tr>
                      <th className="px-6 py-4 font-bold">결제일</th>
                      <th className="px-6 py-4 font-bold">상품명</th>
                      <th className="px-6 py-4 font-bold">결제 금액</th>
                      <th className="px-6 py-4 text-center font-bold">상태</th>
                      <th className="px-6 py-4 text-center font-bold">영수증</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {isLoading ? (
                      <tr>
                        <td colSpan={5} className="bg-white px-6 py-24 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-50">
                              <i className="fas fa-spinner text-2xl text-gray-300" />
                            </div>
                            <h3 className="mb-1 text-sm font-bold text-gray-700">결제 내역을 불러오는 중입니다.</h3>
                          </div>
                        </td>
                      </tr>
                    ) : enrollments.length ? (
                      enrollments.map((item) => {
                        const receipt = {
                          title: item.courseTitle,
                          date: formatShortDate(item.enrolledAt),
                          price: formatCurrency(item.price),
                        }

                        return (
                          <tr key={item.enrollmentId} className="transition hover:bg-gray-50/50">
                            <td className="px-6 py-4 text-gray-500">{receipt.date}</td>
                            <td className="px-6 py-4 font-bold text-gray-800">{item.courseTitle}</td>
                            <td className="px-6 py-4 text-gray-900">{receipt.price}</td>
                            <td className="px-6 py-4 text-center">
                              <span className="rounded-lg border border-green-100 bg-green-50 px-2.5 py-1 text-xs font-bold text-brand">
                                {purchaseStatusLabel(item.status)}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <button
                                className="text-gray-400 transition hover:text-brand"
                                type="button"
                                onClick={() => setSelectedReceipt(receipt)}
                              >
                                <i className="fas fa-file-invoice text-base" />
                              </button>
                            </td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="bg-white px-6 py-24 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-50">
                              <i className="fas fa-file-invoice text-2xl text-gray-300" />
                            </div>
                            <h3 className="mb-1 text-sm font-bold text-gray-700">결제 내역이 없습니다.</h3>
                            <p className="mb-5 text-xs text-gray-400">새로운 강의와 로드맵을 만나보고 성장을 시작해보세요.</p>
                            <a href="/lecture-list" className="rounded-lg bg-brand px-6 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-green-600 hover:shadow-md">
                              강의 둘러보기
                            </a>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : hasArchiveItems ? (
            <div id="archiveTab" className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {wishlist.map((item) => (
                <div key={`wishlist-${item.wishlistId}`} className="group flex flex-col justify-between rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm">
                  <div>
                    <div className="mb-3 flex items-start justify-between">
                      <span className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">강의 스크랩</span>
                      <span className="text-brand">
                        <i className="fas fa-bookmark text-lg" />
                      </span>
                    </div>
                    <h3 className="mb-2 text-base font-bold text-gray-900 transition group-hover:text-brand">{item.courseTitle}</h3>
                    <p className="line-clamp-2 text-sm text-gray-500">
                      {item.instructorName} · {formatCurrency(item.price)}
                    </p>
                  </div>
                  <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4 text-xs text-gray-400">
                    <span>스크랩일: {formatShortDate(item.addedAt)}</span>
                    <a href={`/course-detail?courseId=${item.courseId}`} className="flex items-center gap-1 font-bold text-brand hover:underline">
                      바로가기 <i className="fas fa-chevron-right text-[10px]" />
                    </a>
                  </div>
                </div>
              ))}

              {proofCards.map((item) => (
                <div key={`proof-card-${item.proofCardId}`} className="group flex flex-col justify-between rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm">
                  <div>
                    <div className="mb-3 flex items-start justify-between">
                      <span className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">증명 카드</span>
                      <span className="text-brand">
                        <i className="fas fa-bookmark text-lg" />
                      </span>
                    </div>
                    <h3 className="mb-2 text-base font-bold text-gray-900 transition group-hover:text-brand">{item.title}</h3>
                    <p className="line-clamp-2 text-sm text-gray-500">{item.nodeTitle}</p>
                  </div>
                  <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4 text-xs text-gray-400">
                    <span>발급일: {formatShortDate(item.issuedAt)}</span>
                    <a href="/learning-log-gallery" className="flex items-center gap-1 font-bold text-brand hover:underline">
                      바로가기 <i className="fas fa-chevron-right text-[10px]" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div id="archiveTab">
              <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200/80 bg-white py-24 text-center shadow-sm">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-50">
                  <i className="far fa-bookmark text-2xl text-gray-300" />
                </div>
                <h3 className="mb-1 text-sm font-bold text-gray-700">보관된 항목이 없습니다.</h3>
                <p className="mb-5 text-xs text-gray-400">나중에 다시 보고 싶은 커뮤니티 글이나 로드맵을 스크랩해보세요.</p>
                <a href="/community-lounge" className="rounded-lg bg-gray-900 px-6 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-black hover:shadow-md">
                  커뮤니티 구경하기
                </a>
              </div>
            </div>
          )}
        </section>
      </LearnerContentRow>

      {selectedReceipt ? (
        <div
          id="receiptModal"
          className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 opacity-100 backdrop-blur-sm transition-opacity duration-200"
          onClick={(event) => {
            if (event.target === event.currentTarget) setSelectedReceipt(null)
          }}
        >
          <div className="m-4 w-full max-w-md scale-100 overflow-hidden rounded-2xl bg-white shadow-xl transition-transform duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
              <h3 className="flex items-center gap-2 font-bold text-gray-900">
                <i className="fas fa-file-invoice text-brand" /> 전자영수증 내역
              </h3>
              <button type="button" onClick={() => setSelectedReceipt(null)} className="text-gray-400 hover:text-gray-600">
                <i className="fas fa-times text-lg" />
              </button>
            </div>
            <div className="space-y-4 p-6 text-sm text-gray-600">
              <div className="flex justify-between">
                <span className="text-gray-400">구매자</span>
                <span className="font-medium text-gray-900">DevPath 회원</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">결제일시</span>
                <span className="font-medium text-gray-900">{selectedReceipt.date}</span>
              </div>
              <div className="my-2 border-t border-dashed border-gray-200" />
              <div>
                <span className="mb-1 block text-gray-400">상품 정보</span>
                <span className="block text-base font-bold text-gray-900">{selectedReceipt.title}</span>
              </div>
              <div className="my-2 border-t border-dashed border-gray-200" />
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-400">총 결제금액</span>
                <span className="text-lg font-extrabold text-brand">{selectedReceipt.price}</span>
              </div>
              <div className="rounded-xl bg-gray-50 p-3 text-center text-xs leading-relaxed text-gray-400">
                본 영수증은 결제 증빙용이며 세무 신고용 매입영수증은 결제 대행사 이메일을 확인해 주세요.
              </div>
            </div>
            <div className="flex justify-end border-t border-gray-100 bg-gray-50 px-6 py-4">
              <button type="button" onClick={() => setSelectedReceipt(null)} className="w-full rounded-xl bg-gray-900 py-2.5 font-bold text-white transition hover:bg-black">
                확인
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </LearnerPageShell>
  )
}
