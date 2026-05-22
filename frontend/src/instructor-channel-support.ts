import { sanitizeInstructorProfileImageUrl } from './instructor-channel-customization'
import type { InstructorChannel, InstructorFeaturedCourse } from './types/instructor'

export type InstructorChannelTabKey = 'home' | 'playlist' | 'community' | 'reviews'
export type PlaylistFilterKey = 'all' | 'beginner' | 'intermediate' | 'advanced' | 'project' | 'bestseller'
export type CommunityCategory = 'notice' | 'question' | 'info' | 'chat'
export type CommunityFilterKey = 'all' | CommunityCategory | 'solved' | 'pending'
export type CommunitySortKey = 'latest' | 'views' | 'likes' | 'comments' | 'mine'
export type ReviewFilterKey = 'all' | '5star' | '4star' | '3star' | '2star' | '1star'
export type ReviewSortKey = 'latest' | 'rating-high' | 'rating-low'

export interface InstructorNoticeItem {
  id: string
  title: string
  dateLabel: string
  isNew?: boolean
}

export interface InstructorCourseCard {
  courseId: number
  title: string
  subtitle: string
  thumbnailUrl: string
  level: 'beginner' | 'intermediate' | 'advanced' | 'project'
  rating: number
  reviewCount: number
  price: number
  bestseller?: boolean
}

export interface InstructorPlaylistSection {
  id: string
  category: 'roadmap' | 'project'
  emojiTitle: string
  description: string
  courses: InstructorCourseCard[]
}

export interface CommunityReply {
  id: string
  author: string
  seed: string
  content: string
  date: string
  mine: boolean
}

export interface CommunityPost {
  id: string
  category: CommunityCategory
  status?: 'solved' | 'pending'
  title: string
  content: string
  author: string
  authorSeed: string
  date: string
  views: number
  likes: number
  mine: boolean
  replies: CommunityReply[]
}

export interface InstructorReviewItem {
  id: string
  author: string
  seed: string
  rating: 1 | 2 | 3 | 4 | 5
  date: string
  lectureKey: string
  lectureTitle: string
  content: string
}

export const fallbackInstructorChannel: InstructorChannel = {
  profile: {
    instructorId: 17,
    nickname: '김멘토 (CodeMaster)',
    profileImageUrl: null,
    headline: '복잡한 백엔드 개념을 실무 흐름에 맞춰 명확하게 설명합니다. 10년차 서버 개발자',
    isPublic: true,
  },
  intro:
    '안녕하세요. 10년차 백엔드 개발자 김멘토입니다. 기초 개념부터 실전 문제 해결까지, 왜 이렇게 설계하는지 이해할 수 있도록 강의를 만들고 있습니다.',
  specialties: ['Java', 'Spring Boot', 'JPA', 'AWS', 'Kafka', 'Microservices'],
  externalLinks: {
    githubUrl: 'https://github.com/',
    blogUrl: 'https://example.com/',
  },
  featuredCourses: [
    {
      courseId: 1001,
      title: '자바 프로그래밍 입문: 기초부터 탄탄하게',
      subtitle: '비전공자도 따라오는 자바 로드맵의 출발점',
      thumbnailUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&q=80',
    },
    {
      courseId: 1002,
      title: '스프링 부트 3.0 실전 서비스 구축',
      subtitle: '실무 서비스 구조로 배우는 스프링 부트',
      thumbnailUrl: 'https://images.unsplash.com/photo-1605379399642-870262d3d051?w=600&q=80',
    },
    {
      courseId: 1003,
      title: 'JPA 실전: 영속성 관리와 쿼리 최적화',
      subtitle: 'N+1, Fetch Join, 성능 최적화 집중 과정',
      thumbnailUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&q=80',
    },
  ],
}

export const fallbackNotices: InstructorNoticeItem[] = [
  { id: 'notice-1', title: '스프링 3.2 업데이트 관련 강의 추가 예정입니다.', dateLabel: '2026.02.15', isNew: true },
  { id: 'notice-2', title: '2월 멘토링 모집 마감 안내', dateLabel: '2026.02.10' },
]

function featuredCourseToCard(course: InstructorFeaturedCourse, index: number): InstructorCourseCard {
  const presets: Array<Pick<InstructorCourseCard, 'level' | 'rating' | 'reviewCount' | 'price' | 'bestseller'>> = [
    { level: 'beginner', rating: 4.8, reviewCount: 1240, price: 44000 },
    { level: 'intermediate', rating: 4.9, reviewCount: 3500, price: 77000, bestseller: true },
    { level: 'advanced', rating: 4.9, reviewCount: 820, price: 88000 },
  ]
  const preset = presets[index] ?? presets[presets.length - 1]

  return {
    courseId: course.courseId,
    title: course.title,
    subtitle: course.subtitle ?? '',
    thumbnailUrl: course.thumbnailUrl ?? fallbackInstructorChannel.featuredCourses[0].thumbnailUrl!,
    ...preset,
  }
}

export function buildPlaylistSections(channel: InstructorChannel) {
  const featuredCourses = (
    channel.featuredCourses.length ? channel.featuredCourses : fallbackInstructorChannel.featuredCourses
  ).map(featuredCourseToCard)

  const projectCourses: InstructorCourseCard[] = [
    {
      courseId: 2001,
      title: '배달 서비스 클론 코딩: 주문부터 결제까지',
      subtitle: '도메인 중심으로 실제 서비스 흐름을 완성하는 프로젝트',
      thumbnailUrl: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=600&q=80',
      level: 'project',
      rating: 4.7,
      reviewCount: 210,
      price: 88000,
    },
    {
      courseId: 2002,
      title: '지도 앱 클론 코딩: 위치 기반 서비스의 이해',
      subtitle: '화면 설계부터 API 흐름까지 프로젝트로 학습합니다.',
      thumbnailUrl: 'https://images.unsplash.com/photo-1616469829581-73993eb86b02?w=600&q=80',
      level: 'project',
      rating: 4.8,
      reviewCount: 150,
      price: 88000,
    },
  ]

  return [
    {
      id: 'roadmap',
      category: 'roadmap',
      emojiTitle: '☕ 자바 백엔드 마스터 로드맵',
      description: '초보자부터 실무자까지, 자바 개발자의 핵심 코스를 담았습니다.',
      courses: featuredCourses,
    },
    {
      id: 'project',
      category: 'project',
      emojiTitle: '🚀 실전 프로젝트 Series',
      description: '실제 서비스 흐름을 끝까지 완성해 보는 프로젝트 중심 강의입니다.',
      courses: projectCourses,
    },
  ] satisfies InstructorPlaylistSection[]
}

export const fallbackCommunityPosts: CommunityPost[] = [
  {
    id: 'post-1',
    category: 'notice',
    title: '2026 상반기 로드맵 업데이트 안내',
    content:
      '안녕하세요, 김멘토입니다. 올해 백엔드 트렌드에 맞춰 강의 커리큘럼 일부를 리뉴얼할 예정입니다.',
    author: '김멘토',
    authorSeed: 'Instructor',
    date: '2026.02.01',
    views: 450,
    likes: 12,
    mine: false,
    replies: [],
  },
  {
    id: 'post-2',
    category: 'question',
    status: 'solved',
    title: '스레드 풀 설정에서 corePoolSize를 어떻게 잡아야 할까요?',
    content: '스레드 풀 설정에서 corePoolSize를 어떻게 잡아야 할까요? 실무 기준이 궁금합니다.',
    author: '학습러A',
    authorSeed: 'User1',
    date: '2026.02.17',
    views: 142,
    likes: 5,
    mine: false,
    replies: [
      {
        id: 'reply-1',
        author: '김멘토(강사)',
        seed: 'Instructor',
        content:
          'CPU bound 작업인지 IO bound 작업인지 먼저 분리해서 보시면 됩니다. 서버 특성과 병목 지점을 같이 확인해 보세요.',
        date: '2026.02.17',
        mine: false,
      },
      {
        id: 'reply-2',
        author: '학습러A',
        seed: 'User1',
        content: '설명 감사합니다. 병목 구간부터 다시 체크해 보겠습니다.',
        date: '2026.02.17',
        mine: false,
      },
    ],
  },
  {
    id: 'post-3',
    category: 'question',
    status: 'pending',
    title: '강의 자료 다운로드가 안 됩니다.',
    content: '5강 예제 파일 링크가 만료된 것 같습니다. 확인 부탁드립니다.',
    author: '학습러B',
    authorSeed: 'User2',
    date: '2026.02.18',
    views: 45,
    likes: 1,
    mine: false,
    replies: [],
  },
  {
    id: 'post-4',
    category: 'info',
    title: '강사님 강의 듣고 스타트업 백엔드 합격했습니다',
    content:
      '면접 질문이 실제로 유사해서 큰 도움이 됐습니다. 기술 면접에서 물어본 내용도 강의에서 많이 다뤄 주셨어요.',
    author: '학습러C',
    authorSeed: 'User3',
    date: '2026.02.10',
    views: 890,
    likes: 45,
    mine: false,
    replies: [],
  },
  {
    id: 'post-5',
    category: 'chat',
    title: '오늘도 강의 복습 갑니다.',
    content: '퇴근하고 매일 한 강의씩 듣는 중입니다. 파이팅!',
    author: '학습러D',
    authorSeed: 'User4',
    date: '2026.02.16',
    views: 67,
    likes: 8,
    mine: false,
    replies: [],
  },
]

export const fallbackInstructorReviews: InstructorReviewItem[] = [
  {
    id: 'review-1',
    author: '김**',
    seed: 'User1',
    rating: 5,
    date: '2026.02.15',
    lectureKey: 'spring-boot',
    lectureTitle: '스프링 부트 3.0 실전 서비스 구축',
    content: '실무에 바로 적용할 수 있는 내용이 많았습니다. 성능 최적화와 에러 핸들링 설명이 특히 좋았습니다.',
  },
  {
    id: 'review-2',
    author: '이**',
    seed: 'User2',
    rating: 5,
    date: '2026.02.14',
    lectureKey: 'java-basic',
    lectureTitle: '자바 프로그래밍 입문: 기초부터 탄탄하게',
    content: '비전공자 출신인데 이 강의로 백엔드의 기초를 확실히 잡았습니다. 다른 강의도 이어서 수강할 예정입니다.',
  },
  {
    id: 'review-3',
    author: '박**',
    seed: 'User3',
    rating: 5,
    date: '2026.02.13',
    lectureKey: 'jpa-real',
    lectureTitle: 'JPA 실전: 영속성 관리와 쿼리 최적화',
    content: 'N+1, Fetch Join, JPQL 최적화 요청을 실무에서 자주 만나는 문제로 깊이 있게 설명해 주셔서 만족도가 높았습니다.',
  },
  {
    id: 'review-4',
    author: '최**',
    seed: 'User4',
    rating: 4,
    date: '2026.02.12',
    lectureKey: 'high-traffic',
    lectureTitle: '대용량 트래픽을 위한 Spring Boot 아키텍처',
    content: '단순한 구현이 아니라 왜 이렇게 설계하는지 설명해 줘서 프로젝트 적용에 큰 도움이 됐습니다.',
  },
  {
    id: 'review-5',
    author: '정**',
    seed: 'User5',
    rating: 4,
    date: '2026.02.11',
    lectureKey: 'java-basic',
    lectureTitle: '자바 프로그래밍 입문: 기초부터 탄탄하게',
    content: '자바 기초 잡기에 좋은 강의입니다. 후반부 예제 설명이 조금 더 길어도 좋을 것 같습니다.',
  },
]

export const reviewLectureOptions = [
  { key: 'all', label: '전체 강의 보기' },
  { key: 'java-basic', label: '자바 프로그래밍 입문' },
  { key: 'spring-boot', label: '스프링 부트 3.0 실전' },
  { key: 'jpa-real', label: 'JPA 실전' },
  { key: 'high-traffic', label: '대용량 트래픽 아키텍처' },
] as const

export function mergeInstructorChannel(channel: InstructorChannel | null | undefined) {
  if (!channel) return fallbackInstructorChannel

  return {
    ...fallbackInstructorChannel,
    ...channel,
    profile: {
      ...fallbackInstructorChannel.profile,
      ...channel.profile,
      profileImageUrl: sanitizeInstructorProfileImageUrl(channel.profile.profileImageUrl),
    },
    intro: channel.intro || fallbackInstructorChannel.intro,
    specialties: channel.specialties.length ? channel.specialties : fallbackInstructorChannel.specialties,
    externalLinks: channel.externalLinks ?? fallbackInstructorChannel.externalLinks,
    featuredCourses: channel.featuredCourses.length ? channel.featuredCourses : fallbackInstructorChannel.featuredCourses,
  } satisfies InstructorChannel
}

export function buildInstructorChannelHref(instructorId: number | null | undefined) {
  if (!instructorId) return '/instructor-channel'
  return `/instructor-channel?instructorId=${instructorId}`
}

export function formatCompactCount(value: number) {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`
  }
  return String(value)
}

export function formatWon(value: number) {
  return `₩${new Intl.NumberFormat('ko-KR').format(value)}`
}

export function buildRatingFilterKey(rating: number): ReviewFilterKey {
  return `${rating}star` as ReviewFilterKey
}

export function getCommunityCategoryLabel(category: CommunityCategory) {
  if (category === 'notice') return '공지'
  if (category === 'question') return '질문'
  if (category === 'info') return '정보'
  return '잡담'
}

export function getCommunityCategoryClass(category: CommunityCategory) {
  if (category === 'notice') return 'bg-red-100 text-red-600'
  if (category === 'question') return 'bg-blue-100 text-blue-600'
  if (category === 'info') return 'bg-purple-100 text-purple-600'
  return 'bg-gray-100 text-gray-600'
}

export function sortCommunityPosts(posts: CommunityPost[], sortKey: CommunitySortKey) {
  return [...posts].sort((left, right) => {
    if (sortKey === 'views') return right.views - left.views
    if (sortKey === 'likes') return right.likes - left.likes
    if (sortKey === 'comments') return right.replies.length - left.replies.length
    if (sortKey === 'mine') return Number(right.mine) - Number(left.mine) || right.date.localeCompare(left.date)
    return right.date.localeCompare(left.date)
  })
}

export function filterCommunityPosts(posts: CommunityPost[], filterKey: CommunityFilterKey) {
  return posts.filter((post) => {
    if (filterKey === 'all') return true
    if (filterKey === 'solved') return post.status === 'solved'
    if (filterKey === 'pending') return post.status === 'pending'
    return post.category === filterKey
  })
}

export function buildReviewSummary(reviews: InstructorReviewItem[]) {
  const count = reviews.length
  const average = count ? Number((reviews.reduce((sum, review) => sum + review.rating, 0) / count).toFixed(1)) : 0
  const distribution = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: reviews.filter((review) => review.rating === rating).length,
  }))

  return { count, average, distribution }
}
