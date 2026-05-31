import { useEffect, useMemo, useRef, useState } from 'react'
import { certificateApi, proofCardApi } from '../../lib/api'
import { LearnerContentRow, LearnerPageShell, MyMenuSidebar } from '../template'
import { downloadBase64File } from '../ui'
import type { ProofCardDetail, ProofCardGalleryItem } from '../../types/learner'

type ProofCardType = 'language' | 'cs' | 'framework' | 'backend'

type ProofCardViewItem = ProofCardGalleryItem & {
  type: ProofCardType
  score: number | null
}

type ProofCardTheme = {
  front: string
  badge: string
  icon: string
  scoreLabel: string
}

type ProofCardPalette = Pick<ProofCardTheme, 'front'>

const proofCardPalettes: ProofCardPalette[] = [
  {
    front: 'from-orange-500 to-red-600',
  },
  {
    front: 'from-emerald-500 to-green-600',
  },
  {
    front: 'from-blue-500 to-indigo-600',
  },
  {
    front: 'from-cyan-500 to-sky-600',
  },
  {
    front: 'from-rose-500 to-pink-600',
  },
  {
    front: 'from-violet-500 to-fuchsia-600',
  },
  {
    front: 'from-amber-500 to-yellow-600',
  },
  {
    front: 'from-teal-500 to-emerald-600',
  },
  {
    front: 'from-lime-500 to-green-600',
  },
  {
    front: 'from-fuchsia-500 to-rose-600',
  },
]


function formatShortDate(value: string | null | undefined) {
  if (!value) {
    return '-'
  }

  const date = new Date(value)
  return `${date.getFullYear()}. ${String(date.getMonth() + 1).padStart(2, '0')}. ${String(date.getDate()).padStart(2, '0')}`
}

function inferType(title: string): ProofCardType {
  const normalized = title.toLowerCase()

  if (normalized.includes('java')) {
    return 'language'
  }

  if (normalized.includes('spring')) {
    return 'framework'
  }

  if (normalized.includes('운영체제') || normalized.includes('network') || normalized.includes('os')) {
    return 'cs'
  }

  return 'backend'
}

function hashText(value: string) {
  let hash = 0

  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(31, hash) + value.charCodeAt(index)
  }

  return Math.abs(hash)
}

function getStablePalette(item: ProofCardViewItem): ProofCardPalette {
  const hashInput = `${item.proofCardId}:${item.title}:${item.nodeTitle ?? item.courseTitle ?? ''}`
  return proofCardPalettes[hashText(hashInput) % proofCardPalettes.length]
}

function typeTheme(type: ProofCardType): Omit<ProofCardTheme, keyof ProofCardPalette> {
  switch (type) {
    case 'language':
      return {
        badge: '언어 (Language)',
        icon: 'fab fa-java',
        scoreLabel: 'AI 코드 리뷰 통과',
      }
    case 'cs':
      return {
        badge: 'CS 공통지식',
        icon: 'fas fa-server',
        scoreLabel: '단답 퀴즈 통과',
      }
    case 'framework':
      return {
        badge: '프레임워크',
        icon: 'fas fa-leaf',
        scoreLabel: '실전 프로젝트 통과',
      }
    default:
      return {
        badge: 'Backend Track',
        icon: 'fas fa-code',
        scoreLabel: '성취 평가 통과',
      }
  }
}

function cardTheme(item: ProofCardViewItem): ProofCardTheme {
  return {
    ...typeTheme(item.type),
    ...getStablePalette(item),
  }
}

export default function LearningLogGalleryPage() {
  const [items, setItems] = useState<ProofCardViewItem[]>([])
  const [details, setDetails] = useState<Record<number, ProofCardDetail>>({})
  const [filterOpen, setFilterOpen] = useState(false)
  const [certificateOpen, setCertificateOpen] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'backend' | 'framework' | 'language' | 'cs'>('all')
  const [sortOrder, setSortOrder] = useState<'latest' | 'score'>('latest')
  const [selectedCard, setSelectedCard] = useState<ProofCardViewItem | null>(null)
  const [message, setMessage] = useState('')
  const prefetchedDetailIds = useRef<Set<number>>(new Set())

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      try {
        const response = await proofCardApi.getGallery(controller.signal)

        if (response.length) {
          setItems(
            response.map((item) => ({
              ...item,
              type: inferType(item.title),
              score: null,
            })),
          )
        }
      } catch {
        // API 실패 시 빈 목록 유지
      }
    }

    void load()

    return () => {
      controller.abort()
    }
  }, [])

  useEffect(() => {
    const pendingItems = items.filter(
      (item) => !details[item.proofCardId] && !prefetchedDetailIds.current.has(item.proofCardId),
    )

    if (!pendingItems.length) {
      return
    }

    const controller = new AbortController()
    let cancelled = false

    pendingItems.forEach((item) => {
      prefetchedDetailIds.current.add(item.proofCardId)
    })

    async function loadDetails() {
      const results = await Promise.allSettled(
        pendingItems.map(async (item) => ({
          proofCardId: item.proofCardId,
          detail: await proofCardApi.getCard(item.proofCardId, controller.signal),
        })),
      )

      if (cancelled) {
        return
      }

      setDetails((current) => {
        const next = { ...current }
        let changed = false

        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            next[result.value.proofCardId] = result.value.detail
            changed = true
            return
          }

          prefetchedDetailIds.current.delete(pendingItems[index].proofCardId)
        })

        return changed ? next : current
      })
    }

    void loadDetails()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [details, items])

  const visibleCards = useMemo(() => {
    const filtered = items.filter((item) => categoryFilter === 'all' || item.type === categoryFilter)

    return [...filtered].sort((left, right) => {
      if (sortOrder === 'score') {
        return (right.score ?? -1) - (left.score ?? -1)
      }

      return new Date(right.issuedAt ?? 0).getTime() - new Date(left.issuedAt ?? 0).getTime()
    })
  }, [categoryFilter, items, sortOrder])

  function handleFlip(cardElement: HTMLDivElement) {
    cardElement.classList.toggle('flipped')
  }

  async function handleDownloadCertificate(card: ProofCardViewItem) {
    setSelectedCard(card)
    setCertificateOpen(true)

    try {
      const certificate = await certificateApi.issue(card.proofCardId)
      const pdf = await certificateApi.generatePdf(card.proofCardId)
      downloadBase64File(pdf.fileName, pdf.mimeType, pdf.base64Content)
      await certificateApi.recordDownload(certificate.certificateId, 'portfolio')
      setMessage('증명서가 다운로드되었습니다.')
    } catch {
      setMessage('증명서 발급 또는 다운로드에 실패했습니다.')
    }
  }

  return (
    <LearnerPageShell>
      <LearnerContentRow>
        <MyMenuSidebar currentPageKey="learning-log-gallery" wrapperClassName="w-60 shrink-0 hidden lg:block -ml-0" />

        <section className="min-w-0 flex-1">
          <div className="mb-8 flex flex-col items-end justify-between gap-4 md:flex-row">
            <div>
              <h1 className="mb-2 text-3xl font-bold text-gray-900">나의 증명 카드 (Proof Cards)</h1>
              <p className="text-gray-500">
                완료한 <span className="font-bold text-brand">부모 노드(Module)</span>에 대한 인증서입니다.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilterOpen(true)}
                disabled={!items.length}
                className={`rounded-lg px-4 py-2 text-sm font-bold shadow-sm transition ${
                  items.length
                    ? 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                    : 'cursor-not-allowed border border-gray-200 bg-gray-50 text-gray-400'
                }`}
              >
                <i className="fas fa-filter mr-1" /> 필터
              </button>
            </div>
          </div>

          {message ? <div className="mb-6 text-sm font-bold text-brand">{message}</div> : null}

          {visibleCards.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-gray-200 bg-gray-100 shadow-sm">
                <i className="fas fa-award text-3xl text-gray-300" />
              </div>
              <h3 className="mb-2 text-lg font-bold text-gray-900">아직 발급된 증명 카드가 없습니다</h3>
              <p className="mb-6 text-sm text-gray-500">로드맵 학습을 완료하고 평가를 통과하여 첫 증명 카드를 획득해보세요.</p>
              <a href="/roadmap-hub" className="rounded-xl bg-gray-900 px-6 py-3 font-bold text-white shadow-sm transition hover:bg-black">
                로드맵 학습 시작하기
              </a>
            </div>
          ) : (
            <div id="cardGrid" className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              {visibleCards.map((item) => {
                const theme = cardTheme(item)
                const detail = details[item.proofCardId]
                const detailTags = detail?.tags.length ? detail.tags : item.tags

                return (
                  <div
                    key={item.proofCardId}
                    className="group perspective card-item h-[420px] w-full cursor-pointer"
                    onClick={(event) => handleFlip(event.currentTarget)}
                  >
                    <div className="card-inner relative rounded-2xl shadow-xl">
                      <div className="card-front flex flex-col border border-gray-200 bg-white">
                        <div className={`relative flex h-44 flex-col justify-between bg-gradient-to-br ${theme.front} p-6`}>
                          <div className="flex items-start justify-between">
                            <span className="rounded border border-white/10 bg-white/20 px-2 py-1 text-[10px] font-bold tracking-wider text-white backdrop-blur">
                              {theme.badge}
                            </span>
                          </div>
                          <i className={`${theme.icon} absolute right-[-5px] bottom-[-10px] text-7xl text-white/20`} />
                          <div className="relative z-10 text-white">
                            <h3 className="proof-card-display-title text-2xl font-extrabold tracking-tight">{item.title}</h3>
                            <p className="mt-1 text-xs font-medium text-white/80">Verified</p>
                          </div>
                        </div>
                        <div className="flex flex-1 flex-col justify-between bg-white p-6">
                          <div>
                            <p className="mb-2 text-xs font-bold text-gray-400 uppercase">학습 완료일</p>
                            <p className="text-sm font-bold text-gray-800">{formatShortDate(item.issuedAt)}</p>
                          </div>
                          <div className="mt-2 border-t border-gray-100 pt-4">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-gray-500">{theme.scoreLabel}</span>
                              <span className="text-2xl font-bold text-gray-900">
                                {item.score !== null ? (
                                  <>
                                    {item.score} <span className="text-xs font-normal text-gray-400">/ 100</span>
                                  </>
                                ) : (
                                  <span className="text-sm text-gray-400">기록 없음</span>
                                )}
                              </span>
                            </div>
                          </div>
                          <div className="mt-4 text-center">
                            <span className="flex items-center justify-center gap-1 text-xs text-gray-400 animate-pulse">
                              <i className="fas fa-sync-alt" /> 클릭하여 상세 내용 보기
                            </span>
                          </div>
                        </div>
                      </div>

                    <div className="card-back flex flex-col border border-gray-700 bg-gray-900 p-7 text-white">
                      <div className="mb-4 border-b border-gray-700 pb-3">
                        <h3 className="proof-card-back-title text-lg font-bold text-white">{detail?.title ?? item.title}</h3>
                        <p className="proof-card-back-description mt-1 text-xs text-gray-400">{detail?.description ?? item.nodeTitle ?? item.courseTitle ?? ''}</p>
                      </div>
                      <div className="custom-scrollbar flex-1 overflow-y-auto pr-2">
                        <p className="mb-2 text-[10px] font-bold tracking-wider text-brand uppercase">포함된 핵심 개념</p>
                        <ul className="list-inside list-disc space-y-2 text-sm text-gray-300 marker:text-brand">
                          {detailTags.map((tag) => (
                            <li key={`${item.proofCardId}-${tag.tagId}`} className="proof-card-list-text">{tag.tagName}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-gray-700 pt-4">
                        <button
                          onClick={(event) => {
                            event.stopPropagation()
                            window.location.href = '/roadmap-hub'
                          }}
                          className="rounded-lg border border-gray-600 bg-gray-800 py-2 text-xs font-bold text-white transition hover:bg-gray-700"
                        >
                          로드맵 보기
                        </button>
                        <button
                          onClick={(event) => {
                            event.stopPropagation()
                            void handleDownloadCertificate(item)
                          }}
                          className="rounded-lg bg-brand py-2 text-xs font-bold text-white shadow-lg transition hover:bg-green-600"
                        >
                          증명서 발급
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
              })}
            </div>
          )}
        </section>
      </LearnerContentRow>

      <div className={`modal fixed inset-0 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm ${filterOpen ? 'active' : ''}`}>
        <div className="modal-enter relative w-full max-w-sm overflow-hidden rounded-2xl bg-white p-6 shadow-2xl">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">필터 및 정렬</h3>
            <button onClick={() => setFilterOpen(false)} className="text-gray-400 transition hover:text-gray-900">
              <i className="fas fa-times" />
            </button>
          </div>
          <div className="space-y-6">
            <div>
              <label className="mb-2 block text-xs font-bold text-gray-500 uppercase">카테고리</label>
              <select
                value={categoryFilter}
                onChange={(event) =>
                  setCategoryFilter(event.target.value as 'all' | 'backend' | 'framework' | 'language' | 'cs')
                }
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand"
              >
                <option value="all">🎯 전체 보기</option>
                <option value="backend">💻 Backend Track</option>
                <option value="framework">🌱 Framework</option>
                <option value="language">☕ Language</option>
                <option value="cs">🖥️ CS (Computer Science)</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold text-gray-500 uppercase">정렬 기준</label>
              <select
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value as 'latest' | 'score')}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand"
              >
                <option value="latest">✨ 최신순 (Date)</option>
                <option value="score">🏆 점수 높은순 (Score)</option>
              </select>
            </div>
          </div>
          <div className="mt-8">
            <button onClick={() => setFilterOpen(false)} className="bg-brand w-full rounded-xl py-3 text-sm font-bold text-white shadow-md transition hover:bg-green-600">
              적용하기
            </button>
          </div>
        </div>
      </div>

      <div className={`modal fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm ${certificateOpen ? 'active' : ''}`}>
        <div className="modal-enter relative w-full max-w-3xl overflow-hidden rounded bg-white shadow-2xl">
          <button
            onClick={() => setCertificateOpen(false)}
            className="absolute top-4 right-4 z-10 text-gray-400 transition hover:text-gray-900"
          >
            <i className="fas fa-times text-xl" />
          </button>

          <div className="relative m-2 border-[12px] border-double border-gray-200 p-10">
            <i className="fas fa-code-branch absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[300px] text-gray-50 opacity-10" />

            <div className="relative z-10 text-center">
              <div className="text-brand mb-8 flex items-center justify-center gap-2 opacity-80">
                <i className="fas fa-code-branch text-2xl" />
                <span className="text-xl font-bold">DevPath</span>
              </div>

              <h1 className="mb-2 text-4xl font-bold tracking-wide text-gray-900" style={{ fontFamily: "'Noto Serif KR', serif" }}>
                수료 증명
              </h1>
              <p className="mb-10 text-sm tracking-[0.2em] text-gray-500 uppercase" style={{ fontFamily: "'Noto Serif KR', serif" }}>
                CERTIFICATE OF COMPLETION
              </p>

              <p className="mb-2 italic text-gray-500">아래 사람은 DevPath에서 제공하는</p>
              <h3 className="text-brand mb-2 text-2xl font-bold">{selectedCard?.title ?? '과정명'}</h3>
              <p className="mb-4 italic text-gray-500">
                과정을 성실히 수행하고, 지정된 평가 기준을 통과하였으므로
                <br />
                본 증명서를 수여합니다.
              </p>

              <h2 className="mt-6 mb-8 inline-block border-b border-gray-300 px-10 pb-2 text-3xl font-bold text-gray-800">
                학습자
              </h2>

              <div className="mb-12 flex justify-center gap-12 text-sm text-gray-600">
                <div className="text-center">
                  <p className="font-bold text-gray-900">{formatShortDate(selectedCard?.issuedAt)}</p>
                  <p className="mt-1 text-xs text-gray-400 uppercase">발급일 (Date)</p>
                </div>
                <div className="text-center">
                  <p className="font-bold text-gray-900">
                    {selectedCard?.score !== null && selectedCard?.score !== undefined
                      ? `${selectedCard.score} / 100`
                      : '기록 없음'}
                  </p>
                  <p className="mt-1 text-xs text-gray-400 uppercase">최종 점수 (Score)</p>
                </div>
              </div>

              <div className="flex items-end justify-between px-10">
                <div className="text-center">
                  <img src="https://api.dicebear.com/7.x/initials/svg?seed=DevPath" className="mx-auto mb-2 h-16 w-16 grayscale opacity-50" />
                  <div className="w-32 border-t border-gray-400" />
                  <p className="mt-2 text-xs font-bold text-gray-900">DevPath AI</p>
                  <p className="text-[10px] text-gray-500">Instructor</p>
                </div>

                <div className="relative text-yellow-500">
                  <i className="fas fa-certificate text-6xl shadow-sm" />
                  <i className="fas fa-check absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xl text-white" />
                </div>

                <div className="text-center">
                  <div className="mb-2 text-2xl italic text-gray-600" style={{ fontFamily: "'Noto Serif KR', serif" }}>
                    DevPath
                  </div>
                  <div className="w-32 border-t border-gray-400" />
                  <p className="mt-2 text-xs font-bold text-gray-900">DevPath Inc.</p>
                  <p className="text-[10px] text-gray-500">Platform</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center gap-3 border-t border-gray-200 bg-gray-50 p-4">
            <button
              onClick={() => {
                if (selectedCard) {
                  void handleDownloadCertificate(selectedCard)
                }
              }}
              className="flex items-center gap-2 rounded-lg bg-gray-800 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-gray-900"
            >
              <i className="fas fa-download" /> PDF 다운로드
            </button>
            <button
              onClick={async () => {
                if (!selectedCard) {
                  return
                }

                await navigator.clipboard.writeText(`${window.location.origin}/learning-log-gallery.html#${selectedCard.proofCardId}`)
                setMessage('링크가 복사되었습니다.')
              }}
              className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-gray-100"
            >
              <i className="fas fa-share-alt" /> 공유하기
            </button>
          </div>
        </div>
      </div>
    </LearnerPageShell>
  )
}
