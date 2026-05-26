import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { communityApi } from '../../lib/api'
import { LearnerContentRow, LearnerPageShell, MyMenuSidebar } from '../template'
import type { AuthSession } from '../../types/auth'
import type { CommunityComment, CommunityPost } from '../../types/learner'

type FilterCategory = 'all' | 'qna' | 'tech' | 'career' | 'free' | 'project'
type SortType = 'latest' | 'popular' | 'views'

type PostViewItem = CommunityPost & {
  filterCategory: FilterCategory
  commentCount: number | null
  tags: string[]
}

const filterCategories: FilterCategory[] = ['all', 'qna', 'tech', 'career', 'free', 'project']

const filterBarStyle: CSSProperties = {
  backgroundColor: '#FFFFFF',
  border: '1px solid #E5E7EB',
  borderRadius: '12px',
  marginBottom: '24px',
  paddingLeft: '8px',
  paddingRight: '8px',
  boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
}

function filterTabStyle(isActive: boolean): CSSProperties {
  return {
    boxSizing: 'border-box',
    height: '43px',
    margin: 0,
    padding: '10px 16px',
    border: 0,
    borderBottom: `2px solid ${isActive ? '#1F2937' : 'transparent'}`,
    backgroundColor: 'transparent',
    color: isActive ? '#1F2937' : '#6B7280',
    cursor: 'pointer',
    fontFamily: 'Pretendard, sans-serif',
    fontSize: '14px',
    fontWeight: isActive ? 700 : 500,
    lineHeight: '21px',
    letterSpacing: '0',
    outline: 'none',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
  }
}

const searchInputStyle: CSSProperties = {
  boxSizing: 'border-box',
  width: '100%',
  height: '34px',
  padding: '6px 12px 6px 32px',
  border: '1px solid #E5E7EB',
  borderRadius: '8px',
  backgroundColor: '#F9FAFB',
  color: '#111827',
  fontFamily: 'Pretendard, sans-serif',
  fontSize: '14px',
  lineHeight: '20px',
  letterSpacing: '0',
  outline: 'none',
  transition: 'all 0.2s',
}

const sortSelectStyle: CSSProperties = {
  boxSizing: 'border-box',
  height: '30px',
  margin: 0,
  padding: '6px 8px',
  border: '1px solid #E5E7EB',
  borderRadius: '8px',
  backgroundColor: '#FFFFFF',
  color: '#4B5563',
  cursor: 'pointer',
  fontFamily: 'Pretendard, sans-serif',
  fontSize: '12px',
  lineHeight: '16px',
  letterSpacing: '0',
  outline: 'none',
}

function mapCategory(category: string): FilterCategory {
  switch (category) {
    case 'TECH_SHARE':
      return 'tech'
    case 'CAREER':
      return 'career'
    case 'FREE':
      return 'free'
    case 'PROJECT':
      return 'project'
    case 'QNA':
      return 'qna'
    default:
      return 'free'
  }
}

function badgeTone(category: FilterCategory) {
  switch (category) {
    case 'qna':
      return 'text-purple-600 bg-purple-50 border-purple-100'
    case 'project':
      return 'text-blue-600 bg-blue-50 border-blue-100'
    case 'tech':
      return 'text-green-600 bg-green-50 border-green-100'
    case 'career':
      return 'text-orange-600 bg-orange-50 border-orange-100'
    case 'free':
      return 'text-gray-600 bg-gray-50 border-gray-200'
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200'
  }
}

function categoryLabel(category: FilterCategory) {
  switch (category) {
    case 'qna':
      return 'Q&A'
    case 'tech':
      return '기술 공유'
    case 'career':
      return '커리어/이직'
    case 'free':
      return '자유게시판'
    case 'project':
      return '팀프로젝트'
    default:
      return '전체'
  }
}

function formatShortDate(value: string | null | undefined) {
  if (!value) {
    return '-'
  }

  const date = new Date(value)

  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
}

function extractHashTags(post: CommunityPost) {
  const text = `${post.title}\n${post.content}`
  const matches = text.match(/#[\p{L}\p{N}_-]+/gu) ?? []

  return [...new Set(matches)].slice(0, 4)
}

function toPostViewItem(post: CommunityPost): PostViewItem {
  return {
    ...post,
    filterCategory: mapCategory(post.category),
    commentCount: null,
    tags: extractHashTags(post),
  }
}

function countComments(comments: CommunityComment[]): number {
  return comments.reduce((total, comment) => total + 1 + countComments(comment.children ?? []), 0)
}

function buildPostParagraphs(content: string) {
  const paragraphs = content
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)

  return paragraphs.length ? paragraphs : ['본문 내용이 없습니다.']
}

export default function MyPostsPage({ session }: { session: AuthSession }) {
  const [posts, setPosts] = useState<PostViewItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [category, setCategory] = useState<FilterCategory>('all')
  const [keyword, setKeyword] = useState('')
  const [sort, setSort] = useState<SortType>('latest')
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      if (!session.userId) {
        setPosts([])
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setLoadError('')

      try {
        const response = await communityApi.searchPosts({
          authorId: session.userId,
          page: 0,
          size: 100,
        }, controller.signal)
        const nextPosts = response.content.map(toPostViewItem)

        if (controller.signal.aborted) {
          return
        }

        setPosts(nextPosts)

        if (nextPosts.length) {
          const commentCounts = await Promise.all(
            nextPosts.map(async (post) => {
              try {
                const comments = await communityApi.getComments(post.id, controller.signal)
                return [post.id, countComments(comments)] as const
              } catch {
                return [post.id, null] as const
              }
            }),
          )

          if (!controller.signal.aborted) {
            const countByPostId = new Map(commentCounts)
            setPosts((current) =>
              current.map((post) => ({
                ...post,
                commentCount: countByPostId.get(post.id) ?? post.commentCount,
              })),
            )
          }
        }
      } catch {
        if (!controller.signal.aborted) {
          setPosts([])
          setLoadError('게시글을 불러오지 못했습니다.')
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    void load()

    return () => controller.abort()
  }, [session.userId])

  const filteredPosts = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase()
    const result = posts.filter((post) => {
      const categoryMatch = category === 'all' || post.filterCategory === category
      const keywordMatch =
        !normalizedKeyword ||
        post.title.toLowerCase().includes(normalizedKeyword) ||
        post.content.toLowerCase().includes(normalizedKeyword)

      return categoryMatch && keywordMatch
    })

    return [...result].sort((left, right) => {
      if (sort === 'popular') {
        return right.likeCount - left.likeCount
      }

      if (sort === 'views') {
        return right.viewCount - left.viewCount
      }

      return new Date(right.createdAt ?? 0).getTime() - new Date(left.createdAt ?? 0).getTime()
    })
  }, [category, keyword, posts, sort])

  const selectedPost = posts.find((post) => post.id === selectedPostId) ?? null
  const selectedPostParagraphs = selectedPost ? buildPostParagraphs(selectedPost.content) : []

  return (
    <LearnerPageShell>
      <LearnerContentRow>
        <MyMenuSidebar currentPageKey="my-posts" wrapperClassName="w-60 shrink-0 hidden lg:block -ml-0" />

        <section className="min-w-0 flex-1">
          {selectedPost ? (
            <div className="fade-in">
              <div className="mb-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setSelectedPostId(null)}
                  className="flex items-center gap-2 text-sm font-bold text-gray-500 transition hover:text-gray-900"
                >
                  <i className="fas fa-arrow-left" /> 목록으로 돌아가기
                </button>
              </div>

              <article className="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
                <div className="prose max-w-none text-gray-800">
                  <h3>{selectedPost.title}</h3>
                  {selectedPostParagraphs.map((paragraph, index) => (
                    <p key={`${selectedPost.id}-${index}`}>{paragraph}</p>
                  ))}
                </div>
              </article>
            </div>
          ) : (
            <div className="fade-in">
              <div className="mb-6 flex items-end justify-between">
                <h2 className="text-2xl font-bold text-gray-900">작성한 게시글</h2>
                <div className="text-sm text-gray-500">
                  총 <span className="font-bold text-brand">{filteredPosts.length}</span>개의 글
                </div>
              </div>

              <div className="flex flex-col items-center justify-between md:flex-row" style={filterBarStyle}>
                <div className="hide-scroll flex w-full overflow-x-auto md:w-auto">
                  {filterCategories.map((item) => (
                    <button
                      key={item}
                      type="button"
                      style={filterTabStyle(category === item)}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => setCategory(item)}
                    >
                      {item === 'all' ? '전체' : categoryLabel(item)}
                    </button>
                  ))}
                </div>

                <div className="flex w-full items-center gap-2 p-2 md:w-auto">
                  <div className="relative flex-1 md:w-56">
                    <input
                      type="text"
                      value={keyword}
                      onChange={(event) => setKeyword(event.target.value)}
                      placeholder="내 글 검색"
                      disabled={isLoading || !posts.length}
                      className="disabled:opacity-50"
                      style={searchInputStyle}
                    />
                    <i className="fas fa-search absolute top-1/2 left-2.5 -translate-y-1/2 text-xs text-gray-400" />
                  </div>
                  <select
                    value={sort}
                    onChange={(event) => setSort(event.target.value as SortType)}
                    disabled={isLoading || !posts.length}
                    className="disabled:opacity-50"
                    style={sortSelectStyle}
                  >
                    <option value="latest">최신순</option>
                    <option value="popular">인기순</option>
                    <option value="views">조회순</option>
                  </select>
                </div>
              </div>

              <div id="postListContainer" className="space-y-4">
                {isLoading ? (
                  <div className="py-10 text-center text-gray-500">
                    <i className="fas fa-spinner mb-3 text-4xl text-gray-300" />
                    <p>게시글을 불러오는 중입니다.</p>
                  </div>
                ) : loadError ? (
                  <div className="py-10 text-center text-gray-500">
                    <i className="fas fa-inbox mb-3 text-4xl text-gray-300" />
                    <p>{loadError}</p>
                  </div>
                ) : posts.length === 0 ? (
                  <div id="noResult" className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
                      <i className="fas fa-pen-nib text-3xl text-gray-300" />
                    </div>
                    <h3 className="mb-2 text-lg font-bold text-gray-900">아직 작성한 게시글이 없습니다</h3>
                    <p className="mb-6 text-sm text-gray-500">커뮤니티에 첫 글을 남기고 다른 개발자들과 소통해보세요.</p>
                    <a href="/community-lounge" className="rounded-xl bg-gray-900 px-6 py-3 font-bold text-white shadow-sm transition hover:bg-black">
                      새 게시글 작성하기
                    </a>
                  </div>
                ) : filteredPosts.length ? (
                  filteredPosts.map((post) => (
                    <article
                      key={post.id}
                      className="group cursor-pointer rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-brand hover:shadow-md"
                      onClick={() => setSelectedPostId(post.id)}
                    >
                      <div className="flex items-start gap-5">
                        <div className="flex min-w-[40px] shrink-0 flex-col items-center gap-1 pt-1">
                          <i className="far fa-heart text-xl text-gray-400 transition group-hover:text-red-500" />
                          <span className="text-sm font-bold text-gray-600 transition group-hover:text-red-500">{post.likeCount}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex items-center gap-2">
                            <span className={`rounded border px-2 py-0.5 text-xs font-bold ${badgeTone(post.filterCategory)}`}>
                              {categoryLabel(post.filterCategory)}
                            </span>
                            <h3 className="truncate text-lg font-bold text-gray-900 transition group-hover:text-brand">{post.title}</h3>
                          </div>
                          <p className="mb-3 line-clamp-2 text-sm text-gray-600">{post.content}</p>
                          {post.tags.length ? (
                            <div className="mb-3 flex flex-wrap gap-2">
                              {post.tags.map((tag) => (
                                <span key={`${post.id}-${tag}`} className="tech-tag">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          ) : null}
                          <div className="flex items-center justify-between border-t border-gray-100 pt-3 text-xs text-gray-500">
                            <span className="text-gray-400">{formatShortDate(post.createdAt)}</span>
                            <div className="flex items-center gap-3">
                              <span>
                                <i className="far fa-comment-alt mr-1" /> {post.commentCount ?? '-'}
                              </span>
                              <span>
                                <i className="far fa-eye mr-1" /> {post.viewCount}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="py-10 text-center text-gray-500">
                    <i className="fas fa-inbox mb-3 text-4xl text-gray-300" />
                    <p>해당 카테고리의 글이 없습니다.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </LearnerContentRow>
    </LearnerPageShell>
  )
}
