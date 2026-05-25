import { useEffect, useState } from 'react'
import AuthModal, { type AuthView } from '../components/AuthModal'
import SiteHeader from '../components/SiteHeader'
import { AUTH_SESSION_SYNC_EVENT, clearStoredAuthSession, readStoredAuthSession } from '../lib/auth-session'

type View = 'list' | 'detail'
type CategoryFilter = 'all' | 'qa' | 'tech' | 'career' | 'free'

export default function CommunityListPage() {
  const [session, setSession] = useState(() => readStoredAuthSession())
  const [authView, setAuthView] = useState<AuthView | null>(null)
  const [view, setView] = useState<View>('list')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')

  useEffect(() => {
    function handleSessionSync() {
      setSession(readStoredAuthSession())
    }
    window.addEventListener(AUTH_SESSION_SYNC_EVENT, handleSessionSync)
    return () => window.removeEventListener(AUTH_SESSION_SYNC_EVENT, handleSessionSync)
  }, [])

  function handleLogout() {
    clearStoredAuthSession()
    setSession(null)
  }

  function handleLoginClick() {
    setAuthView('login')
  }

  function handleAuthenticated() {
    setSession(readStoredAuthSession())
    setAuthView(null)
  }

  function goDetail() {
    setView('detail')
    window.scrollTo(0, 0)
  }

  function goList() {
    setView('list')
    window.scrollTo(0, 0)
  }

  const sideNavItems: { key: CategoryFilter; icon: string; label: string }[] = [
    { key: 'all', icon: 'fas fa-th-large', label: '전체글' },
    { key: 'qa', icon: 'fas fa-question-circle', label: 'Q&A' },
    { key: 'tech', icon: 'fas fa-lightbulb', label: '기술 공유' },
    { key: 'career', icon: 'fas fa-briefcase', label: '커리어/이직' },
    { key: 'free', icon: 'fas fa-coffee', label: '자유게시판' },
  ]

  return (
    <div className="flex min-h-screen flex-col bg-[#F8F9FA] text-gray-800">
      <SiteHeader
        session={session}
        onLogout={handleLogout}
        onLoginClick={handleLoginClick}
        activeNavHref="/community-list"
      />

      {authView ? (
        <AuthModal
          view={authView}
          onViewChange={setAuthView}
          onClose={() => setAuthView(null)}
          onAuthenticated={handleAuthenticated}
        />
      ) : null}

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 pb-12 pt-24 lg:flex-row">

        {/* 좌측 사이드바 */}
        <aside className="hidden lg:block w-48 shrink-0 sticky top-24 h-fit">
          <button
            type="button"
            onClick={() => { window.location.href = '/community-write' }}
            className="mb-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#00C471] py-3 font-bold text-white shadow-md transition hover:bg-green-600"
          >
            <i className="fas fa-pen" /> 글쓰기
          </button>
          <nav className="space-y-1">
            {sideNavItems.map(({ key, icon, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setCategoryFilter(key)}
                className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition ${
                  categoryFilter === key
                    ? 'border border-gray-100 bg-white font-bold text-[#00C471] shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <i className={icon} /> {label}
              </button>
            ))}
          </nav>
        </aside>

        {/* 메인 콘텐츠 */}
        <section className="min-w-0 flex-1">
          {view === 'list' ? (
            <div className="fade-in">
              <div className="mb-6 flex flex-col items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row">
                <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
                  <i className="fas fa-fire text-orange-500" /> 이번 주 인기글
                </h2>
                <div className="flex w-full gap-2 sm:w-auto">
                  <div className="relative flex-1 sm:w-64">
                    <input
                      type="text"
                      placeholder="검색어 입력..."
                      className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-4 text-sm outline-none transition focus:border-[#00C471]"
                    />
                    <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                  <select className="cursor-pointer rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 outline-none focus:border-[#00C471]">
                    <option>최신순</option>
                    <option>인기순</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <article
                  className="group cursor-pointer rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-[#00C471] hover:shadow-md"
                  onClick={goDetail}
                >
                  <div className="flex items-start gap-5">
                    <div className="flex shrink-0 flex-col items-center gap-1 pt-1" style={{ minWidth: 40 }}>
                      <i className="far fa-heart text-2xl text-gray-400 transition duration-300 group-hover:text-red-500" />
                      <span className="text-sm font-bold text-gray-600 transition group-hover:text-red-500">24</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="rounded border border-purple-100 bg-purple-50 px-2 py-0.5 text-xs font-bold text-purple-600">Q&A</span>
                        <h3 className="truncate text-lg font-bold text-gray-900 transition group-hover:text-[#00C471]">Spring Boot JPA N+1 문제 해결 조언 부탁드립니다.</h3>
                      </div>
                      <p className="mb-3 line-clamp-2 text-sm text-gray-600">JPA 연관관계 조회 시 발생하는 N+1 문제로 인해 성능 이슈가 있습니다. Fetch Join과 BatchSize 중 어떤 것이 더 효율적일까요?</p>
                      <div className="mb-3 flex flex-wrap gap-2">
                        <span className="tech-tag">#Java</span>
                        <span className="tech-tag">#Spring Boot</span>
                        <span className="tech-tag">#JPA</span>
                      </div>
                      <div className="flex items-center justify-between border-t border-gray-100 pt-3 text-xs text-gray-500">
                        <div className="flex items-center gap-2">
                          <div className="h-5 w-5 overflow-hidden rounded-full bg-gray-200">
                            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" className="h-full w-full" alt="" />
                          </div>
                          <span className="font-medium text-gray-700">junior_dev</span>
                          <span>• 2시간 전</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span><i className="far fa-comment-alt mr-1" />5</span>
                          <span><i className="far fa-eye mr-1" />128</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>

                <article
                  className="group cursor-pointer rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-[#00C471] hover:shadow-md"
                  onClick={goDetail}
                >
                  <div className="flex items-start gap-5">
                    <div className="flex shrink-0 flex-col items-center gap-1 pt-1" style={{ minWidth: 40 }}>
                      <i className="fas fa-heart text-2xl text-red-500" />
                      <span className="text-sm font-bold text-red-500">56</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="rounded border border-blue-100 bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-600">기술공유</span>
                        <h3 className="truncate text-lg font-bold text-gray-900 transition group-hover:text-[#00C471]">2026년 프론트엔드 트렌드 정리 (React 19, RSC)</h3>
                      </div>
                      <p className="mb-3 line-clamp-2 text-sm text-gray-600">React 19의 주요 변경 사항과 서버 컴포넌트(RSC) 도입 배경 및 성능 최적화 사례 공유합니다.</p>
                      <div className="mb-3 flex flex-wrap gap-2">
                        <span className="tech-tag">#React</span>
                        <span className="tech-tag">#Frontend</span>
                        <span className="tech-tag">#Trend</span>
                      </div>
                      <div className="flex items-center justify-between border-t border-gray-100 pt-3 text-xs text-gray-500">
                        <div className="flex items-center gap-2">
                          <div className="h-5 w-5 overflow-hidden rounded-full bg-gray-200">
                            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Max" className="h-full w-full" alt="" />
                          </div>
                          <span className="font-medium text-gray-700">frontend_master</span>
                          <span>• 5시간 전</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span><i className="far fa-comment-alt mr-1" />12</span>
                          <span><i className="far fa-eye mr-1" />450</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              </div>
            </div>
          ) : (
            <div className="fade-in">
              <div className="mb-4">
                <button
                  type="button"
                  onClick={goList}
                  className="flex items-center gap-2 text-sm font-bold text-gray-500 transition hover:text-gray-900"
                >
                  <i className="fas fa-arrow-left" /> 목록으로 돌아가기
                </button>
              </div>

              <article className="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
                <div className="flex gap-6">
                  <div className="flex shrink-0 flex-col items-center gap-2 text-gray-500">
                    <button type="button" className="group flex h-12 w-12 items-center justify-center rounded-full transition hover:bg-red-50">
                      <i className="far fa-heart text-3xl text-gray-300 transition group-hover:text-red-500" />
                    </button>
                    <span className="text-lg font-bold text-gray-700">24</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-4 flex flex-wrap items-center gap-3">
                      <span className="rounded border border-purple-100 bg-purple-50 px-2 py-0.5 text-xs font-bold text-purple-600">Q&A</span>
                      <h1 className="text-2xl font-bold leading-tight text-gray-900 md:text-3xl">Spring Boot JPA N+1 문제 해결 조언 부탁드립니다.</h1>
                    </div>
                    <div className="mb-6 flex items-center gap-2 border-b border-gray-100 pb-6 text-sm text-gray-500">
                      <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" className="h-6 w-6 rounded-full bg-gray-200" alt="" />
                      <span className="font-bold text-gray-700">junior_dev</span>
                      <span>• 2시간 전</span>
                      <span>• 조회수 128</span>
                    </div>
                    <div className="prose mb-8 max-w-none text-gray-800">
                      <h3>1. 문제 상황</h3>
                      <p>안녕하세요, 현재 사이드 프로젝트를 진행하면서 JPA를 사용하고 있습니다.<br />엔티티 연관관계를 맺고 <code>findAll</code> 조회를 하는데 쿼리가 N번 더 나가는 <strong>N+1 문제</strong>가 발생해서 성능이 저하되는 것을 확인했습니다.</p>
                      <ul>
                        <li>환경: Java 17, Spring Boot 3.0</li>
                        <li>DB: MySQL 8.0</li>
                      </ul>
                      <h3>2. 시도해본 방법</h3>
                      <p><code>Fetch Join</code>을 사용해서 해결하려고 시도해봤는데, 페이징 처리(Pageable)와 함께 사용할 때 경고 로그가 뜹니다. 메모리 이슈가 발생할 수 있다고 해서 고민입니다.</p>
                      <h3>3. 코드 첨부</h3>
                      <pre><code>{`// Repository\n@Query("select m from Member m join fetch m.team")\nPage<Member> findAllMembers(Pageable pageable);`}</code></pre>
                      <p>현업에서는 보통 이런 경우 <code>BatchSize</code>를 사용하는지, 아니면 QueryDSL로 DTO 조회를 하는지 궁금합니다!</p>
                    </div>
                    <div className="mb-8 flex flex-wrap gap-2">
                      <span className="tech-tag">#Java</span>
                      <span className="tech-tag">#Spring Boot</span>
                      <span className="tech-tag">#JPA</span>
                    </div>
                  </div>
                </div>
              </article>

              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">답변 <span className="text-[#00C471]">1</span></h2>
              </div>

              <article className="relative mb-6 rounded-xl border-2 border-[#00C471] bg-white p-6 shadow-sm md:p-8">
                <div className="absolute right-0 top-0 rounded-bl-xl bg-[#00C471] px-3 py-1 text-xs font-bold text-white">
                  <i className="fas fa-check mr-1" /> 채택된 답변
                </div>
                <div className="flex gap-6">
                  <div className="flex shrink-0 flex-col items-center gap-1 pt-1">
                    <i className="fas fa-heart text-2xl text-red-500" />
                    <span className="text-sm font-bold text-red-500">15</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-4 flex items-center gap-2 text-sm">
                      <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Senior" className="h-8 w-8 rounded-full bg-gray-200" alt="" />
                      <span className="font-bold text-gray-900">tech_lead_kim</span>
                      <span className="text-gray-400">• 1시간 전</span>
                    </div>
                    <div className="prose mb-4 text-gray-800">
                      <p>결론부터 말씀드리면 <strong>ToMany 관계 페이징 시에는 Fetch Join을 쓰면 안 됩니다.</strong></p>
                      <p><code>ToOne</code> 관계는 Fetch Join, <code>ToMany</code> 관계는 <code>hibernate.default_batch_fetch_size</code> 옵션을 켜고 Lazy 로딩을 사용하세요.</p>
                      <pre><code>{`spring:\n  jpa:\n    properties:\n      hibernate:\n        default_batch_fetch_size: 1000`}</code></pre>
                    </div>
                  </div>
                </div>
              </article>

              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 font-bold text-gray-900">답변 작성하기</h3>
                <textarea
                  className="h-32 w-full resize-none rounded-lg border border-gray-200 p-4 text-sm outline-none transition focus:border-[#00C471] focus:ring-1 focus:ring-[#00C471]"
                  placeholder="지식을 공유해주세요. (마크다운 지원)"
                />
                <div className="mt-4 flex justify-end">
                  <button type="button" className="rounded-lg bg-[#00C471] px-6 py-2 font-bold text-white transition hover:bg-green-600">등록</button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* 우측 사이드바 */}
        <aside className="hidden xl:block w-72 shrink-0 h-fit sticky top-24 space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-gray-900">
              <i className="fas fa-hashtag text-[#00C471]" /> 인기 태그
            </h3>
            <div className="flex flex-wrap gap-2">
              <a href="#" className="tech-tag">#JavaScript</a>
              <a href="#" className="tech-tag">#React</a>
              <a href="#" className="tech-tag">#Python</a>
              <a href="#" className="tech-tag">#AWS</a>
              <a href="#" className="tech-tag">#Docker</a>
            </div>
          </div>
        </aside>
      </main>

      <footer className="mt-auto border-t border-gray-200 bg-gray-50 pb-8 pt-16">
        <div className="mx-auto max-w-7xl px-6 text-center text-xs text-gray-400">
          © 2026 DevPath Inc. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
