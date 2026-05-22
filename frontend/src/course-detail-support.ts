import { fallbackCourseDetail, formatTime, normalizeCourseDetail } from './learning-support'
import type { CourseReview } from './types/course'
import type { LearningCourseDetail, LearningLesson, LearningSection } from './types/learning'

export type CourseQuestionStatus = 'pending' | 'answered'

export interface CourseQuestionReply {
  id: number
  authorName: string
  content: string
  createdAt: string
}

export interface CourseQuestionItem {
  id: number
  status: CourseQuestionStatus
  authorName: string
  tag: string
  title: string
  body: string
  views: number
  createdAt: string
  comments: CourseQuestionReply[]
}

export interface CourseJobCard {
  key: string
  title: string
  subtitle: string
  description: string
  pill: string
  iconClassName: string
  iconShellClassName: string
}

export interface CourseNewsCard {
  id: string
  title: string
  summary: string
  dateLabel: string
  badgeLabel: string
  badgeClassName: string
  href: string | null
}

const fallbackNewsCards: CourseNewsCard[] = [
  {
    id: 'news-1',
    title: "섹션 5 '객체지향 심화' 강의 자료가 업데이트되었습니다.",
    summary: '안녕하세요 수강생 여러분, 섹션 5의 예제 코드가 최신 자바 버전에 맞춰 수정되었습니다.',
    dateLabel: '2026.02.05',
    badgeLabel: '공지',
    badgeClassName: 'bg-primary text-white',
    href: null,
  },
  {
    id: 'news-2',
    title: '수강 후기 이벤트 당첨자 발표',
    summary: '지난달 진행했던 베스트 수강평 이벤트 당첨자를 발표합니다. 참여해주신 모든 분들께 감사드립니다.',
    dateLabel: '2026.01.20',
    badgeLabel: '이벤트',
    badgeClassName: 'bg-gray-100 text-gray-600',
    href: null,
  },
]

const fallbackJobCards: CourseJobCard[] = [
  {
    key: 'backend',
    title: '백엔드 개발자',
    subtitle: 'Backend Developer',
    description: '웹 애플리케이션의 핵심 로직과 API를 개발합니다. 자바는 국내 대기업 및 금융권 백엔드의 표준 언어입니다.',
    pill: '서버 개발',
    iconClassName: 'fas fa-server',
    iconShellClassName: 'bg-blue-50 text-blue-600',
  },
  {
    key: 'fullstack',
    title: '풀스택 개발자',
    subtitle: 'Full Stack Developer',
    description: '프론트엔드와 백엔드를 모두 다룹니다. 자바 기반의 탄탄한 백엔드 지식은 풀스택 성장의 필수 조건입니다.',
    pill: 'Spring Boot',
    iconClassName: 'fas fa-layer-group',
    iconShellClassName: 'bg-purple-50 text-purple-600',
  },
]

export const fallbackCourseDetailPage: LearningCourseDetail = normalizeCourseDetail({
  ...fallbackCourseDetail,
  courseId: 1001,
  title: '자바(Java) 마스터 클래스: 입문부터 실무 스킬까지',
  subtitle: '비전공자도 따라오는 실전형 자바 로드맵',
  description: '비전공자도 OK! 자바의 기초 문법부터 객체지향, 컬렉션, 실무에서 바로 쓰는 백엔드 감각까지 한 번에 익히는 강의입니다.',
  thumbnailUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
  price: 99000,
  originalPrice: 150000,
  durationSeconds: 6300,
  prerequisites: ['기초적인 컴퓨터 사용', '개발 입문에 대한 관심'],
  jobRelevance: ['백엔드 개발자', '풀스택 개발자'],
  objectives: [
    { objectiveId: 1, objectiveText: '자바 핵심 문법과 객체지향 개념을 체계적으로 익힙니다.', displayOrder: 1 },
    { objectiveId: 2, objectiveText: '실무에서 자주 쓰는 컬렉션, 예외 처리, 스트림을 다룹니다.', displayOrder: 2 },
    { objectiveId: 3, objectiveText: '백엔드 개발자로 이어지는 다음 학습 경로를 자연스럽게 연결합니다.', displayOrder: 3 },
  ],
  targetAudiences: [
    { targetAudienceId: 1, audienceDescription: '백엔드 개발자를 꿈꾸는 비전공자/학생', displayOrder: 1 },
    { targetAudienceId: 2, audienceDescription: '기초 문법은 알지만 객체지향 개념이 약하신 분', displayOrder: 2 },
    { targetAudienceId: 3, audienceDescription: '실무형 자바 강의를 찾는 주니어 개발자', displayOrder: 3 },
  ],
  tags: [
    { tagId: 1, tagName: '백엔드 개발자', proficiencyLevel: 3 },
    { tagId: 2, tagName: 'Java_Backend', proficiencyLevel: 3 },
    { tagId: 3, tagName: '실무 개발', proficiencyLevel: 2 },
  ],
  instructor: {
    instructorId: 17,
    channelName: '박강사',
    profileImage: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=100',
    headline: '10년차 백엔드 개발자 · 실무 중심 자바 멘토',
    specialties: ['Java', 'Spring', 'Backend'],
    channelApiPath: null,
  },
  sections: [
    {
      sectionId: 201,
      title: '섹션 1. 자바 시작하기',
      description: '개발 환경을 설정하고 첫 실행까지 연결합니다.',
      sortOrder: 1,
      isPublished: true,
      lessons: [
        {
          lessonId: 2001,
          title: '1-1. 자바 개발 환경 설정',
          description: '개발 환경을 빠르게 준비합니다.',
          lessonType: 'VIDEO',
          videoUrl: fallbackCourseDetail.introVideoUrl,
          videoAssetKey: 'course-detail-2001',
          thumbnailUrl: fallbackCourseDetail.thumbnailUrl,
          durationSeconds: 600,
          isPreview: false,
          isPublished: true,
          sortOrder: 1,
          materials: [],
        },
        {
          lessonId: 2002,
          title: '1-2. Hello World 출력하기 (미리보기)',
          description: '첫 자바 코드를 실행합니다.',
          lessonType: 'VIDEO',
          videoUrl: fallbackCourseDetail.introVideoUrl,
          videoAssetKey: 'course-detail-2002',
          thumbnailUrl: fallbackCourseDetail.thumbnailUrl,
          durationSeconds: 900,
          isPreview: true,
          isPublished: true,
          sortOrder: 2,
          materials: [],
        },
        {
          lessonId: 2003,
          title: '1-3. 변수와 기본 자료형 맛보기',
          description: '변수와 자료형을 빠르게 훑습니다.',
          lessonType: 'VIDEO',
          videoUrl: fallbackCourseDetail.introVideoUrl,
          videoAssetKey: 'course-detail-2003',
          thumbnailUrl: fallbackCourseDetail.thumbnailUrl,
          durationSeconds: 1200,
          isPreview: false,
          isPublished: true,
          sortOrder: 3,
          materials: [],
        },
      ],
    },
    {
      sectionId: 202,
      title: '섹션 2. 변수와 데이터 타입',
      description: '실무에서 자주 만나는 값과 타입을 익힙니다.',
      sortOrder: 2,
      isPublished: true,
      lessons: [
        {
          lessonId: 2004,
          title: '2-1. 변수 선언과 초기화',
          description: '변수 생명주기를 이해합니다.',
          lessonType: 'VIDEO',
          videoUrl: fallbackCourseDetail.introVideoUrl,
          videoAssetKey: 'course-detail-2004',
          thumbnailUrl: fallbackCourseDetail.thumbnailUrl,
          durationSeconds: 840,
          isPreview: false,
          isPublished: true,
          sortOrder: 1,
          materials: [],
        },
        {
          lessonId: 2005,
          title: '2-2. 원시 타입과 참조 타입',
          description: '메모리 모델을 감각적으로 이해합니다.',
          lessonType: 'VIDEO',
          videoUrl: fallbackCourseDetail.introVideoUrl,
          videoAssetKey: 'course-detail-2005',
          thumbnailUrl: fallbackCourseDetail.thumbnailUrl,
          durationSeconds: 960,
          isPreview: false,
          isPublished: true,
          sortOrder: 2,
          materials: [],
        },
      ],
    },
  ],
  news: fallbackNewsCards.map((item) => ({ title: item.title, url: item.href })),
})

export const fallbackCourseReviews: CourseReview[] = [
  {
    id: 1,
    courseId: fallbackCourseDetailPage.courseId,
    learnerId: 101,
    rating: 5,
    content: '비전공자인데도 흐름이 끊기지 않게 설명해줘서 이해가 빨랐습니다. 자바가 어렵기만 한 언어가 아니라는 걸 처음 느꼈어요.',
    status: 'ANSWERED',
    isHidden: false,
    issueTags: [],
    officialReply: null,
    createdAt: '2026-02-01T09:20:00',
    updatedAt: '2026-02-01T09:20:00',
  },
  {
    id: 2,
    courseId: fallbackCourseDetailPage.courseId,
    learnerId: 102,
    rating: 4,
    content: '실무에서 자주 만나는 예시가 많아서 좋았습니다. 후반부 예제는 조금 더 자세히 다뤄줘도 좋을 것 같아요.',
    status: 'ANSWERED',
    isHidden: false,
    issueTags: ['too-fast'],
    officialReply: {
      id: 11,
      instructorId: 17,
      content: '후반부 예제 설명은 다음 업데이트에서 보강하겠습니다. 피드백 감사합니다.',
      createdAt: '2026-01-29T15:00:00',
      updatedAt: '2026-01-29T15:00:00',
    },
    createdAt: '2026-01-28T18:00:00',
    updatedAt: '2026-01-28T18:00:00',
  },
  {
    id: 3,
    courseId: fallbackCourseDetailPage.courseId,
    learnerId: 103,
    rating: 5,
    content: '커리큘럼이 깔끔하고 기초에서 실무 감각까지 이어져서 복습용으로도 좋았습니다.',
    status: 'CREATED',
    isHidden: false,
    issueTags: [],
    officialReply: null,
    createdAt: '2026-01-22T11:40:00',
    updatedAt: '2026-01-22T11:40:00',
  },
]

export const fallbackCourseQuestions: CourseQuestionItem[] = [
  {
    id: 1,
    status: 'pending',
    authorName: 'Felix',
    tag: 'Unit 3 · 12:40',
    title: '클래스와 프로세스 차이가 헷갈려요',
    body: '같은 코드를 공유해도 프로세스는 각각 가진다고 하셨는데, 메모리 관점에서 어떤 차이인지 궁금합니다.',
    views: 128,
    createdAt: '2026-04-06T09:50:00',
    comments: [
      {
        id: 101,
        authorName: 'Jiwon',
        content: '저도 이 부분이 헷갈렸는데, 인스턴스/메모리 구조까지 같이 보면 조금 더 이해가 됐습니다.',
        createdAt: '2026-04-06T10:10:00',
      },
      {
        id: 102,
        authorName: '박강사',
        content: '다음 주차에서 JVM 메모리 구조를 더 자세히 다룰 예정입니다. 그때 같이 보면 훨씬 선명해집니다.',
        createdAt: '2026-04-06T10:30:00',
      },
    ],
  },
  {
    id: 2,
    status: 'answered',
    authorName: 'Minji',
    tag: 'JPA · N+1',
    title: 'Fetch Join은 언제 쓰는 게 가장 안전한가요?',
    body: '컬렉션 Fetch Join을 쓰면 페이징이 깨진다고 알고 있는데, 실무에서는 어느 시점에 적용하는지 궁금합니다.',
    views: 214,
    createdAt: '2026-04-05T14:30:00',
    comments: [
      {
        id: 201,
        authorName: '박강사',
        content: '조회 목적과 페이징 여부를 먼저 분리해서 보시면 됩니다. 페이징이 필요하면 EntityGraph나 배치 사이즈 전략과 같이 보시는 편이 안전합니다.',
        createdAt: '2026-04-05T16:20:00',
      },
      {
        id: 202,
        authorName: 'LeeDev',
        content: '배치 사이즈만으로도 많이 좋아지는 경우가 있어서 같이 테스트해보시면 좋습니다.',
        createdAt: '2026-04-05T17:00:00',
      },
    ],
  },
]

export function mergeCourseDetailWithFallback(course: LearningCourseDetail | null | undefined) {
  const source = course ? normalizeCourseDetail(course) : fallbackCourseDetailPage

  return normalizeCourseDetail({
    ...fallbackCourseDetailPage,
    ...source,
    description: source.description || fallbackCourseDetailPage.description,
    subtitle: source.subtitle || fallbackCourseDetailPage.subtitle,
    thumbnailUrl: source.thumbnailUrl || fallbackCourseDetailPage.thumbnailUrl,
    introVideoUrl: source.introVideoUrl || fallbackCourseDetailPage.introVideoUrl,
    prerequisites: source.prerequisites.length ? source.prerequisites : fallbackCourseDetailPage.prerequisites,
    jobRelevance: source.jobRelevance.length ? source.jobRelevance : fallbackCourseDetailPage.jobRelevance,
    objectives: source.objectives.length ? source.objectives : fallbackCourseDetailPage.objectives,
    targetAudiences: source.targetAudiences.length ? source.targetAudiences : fallbackCourseDetailPage.targetAudiences,
    tags: source.tags.length ? source.tags : fallbackCourseDetailPage.tags,
    instructor: source.instructor
      ? { ...fallbackCourseDetailPage.instructor!, ...source.instructor }
      : fallbackCourseDetailPage.instructor,
    sections: source.sections.length ? source.sections : fallbackCourseDetailPage.sections,
    news: source.news.length ? source.news : fallbackCourseDetailPage.news,
  })
}

export function formatCoursePrice(value: number | null, currency: string | null = 'KRW') {
  if (!value || value <= 0) return '무료'

  if (currency === 'KRW' || !currency) {
    return new Intl.NumberFormat('ko-KR').format(value) + '원'
  }

  return new Intl.NumberFormat('ko-KR', { style: 'currency', currency }).format(value)
}

export function formatCourseDate(value: string | null) {
  if (!value) return '방금 전'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  const year = parsed.getFullYear()
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const day = String(parsed.getDate()).padStart(2, '0')
  return `${year}.${month}.${day}`
}

export function formatRelativeTime(value: string | null) {
  if (!value) return '방금 전'
  const diffMs = Date.now() - new Date(value).getTime()
  if (!Number.isFinite(diffMs) || diffMs < 0) return '방금 전'
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour
  if (diffMs < hour) return `${Math.max(1, Math.floor(diffMs / minute))}분 전`
  if (diffMs < day) return `${Math.max(1, Math.floor(diffMs / hour))}시간 전`
  return `${Math.max(1, Math.floor(diffMs / day))}일 전`
}

export function getPreviewLesson(course: LearningCourseDetail | null) {
  if (!course) return null
  const preview = course.sections.flatMap((section) => section.lessons).find((lesson) => lesson.isPreview)
  return preview ?? course.sections[0]?.lessons[0] ?? null
}

export function formatSectionMeta(section: LearningSection) {
  const lessonCount = section.lessons.length
  const videoLessons = section.lessons.filter(isCourseDetailVideoLesson)
  const totalSeconds = videoLessons.reduce((sum, lesson) => sum + (lesson.durationSeconds ?? 0), 0)

  if (!videoLessons.length) {
    return `${lessonCount}개 항목`
  }

  const totalMinutes = Math.max(1, Math.round(totalSeconds / 60))
  return `${lessonCount}개 항목 · 영상 ${videoLessons.length}개 · ${totalMinutes}분`
}

export function formatLessonDuration(value: number | null) {
  return formatTime(value ?? 0)
}

function normalizeLessonType(lesson: LearningLesson) {
  return lesson.lessonType?.toUpperCase() ?? ''
}

export function isCourseDetailAssignmentLesson(lesson: LearningLesson) {
  const lessonType = normalizeLessonType(lesson)
  return Boolean(lesson.assignment?.assignmentId)
    || lessonType === 'CODING'
    || (lessonType !== 'VIDEO' && /과제|assignment/i.test(lesson.title))
}

export function isCourseDetailQuizLesson(lesson: LearningLesson) {
  const lessonType = normalizeLessonType(lesson)
  return lessonType !== 'VIDEO' && /퀴즈|quiz/i.test(lesson.title)
}

export function isCourseDetailVideoLesson(lesson: LearningLesson) {
  return !isCourseDetailAssignmentLesson(lesson)
    && !isCourseDetailQuizLesson(lesson)
    && (normalizeLessonType(lesson) === 'VIDEO' || Boolean(lesson.videoUrl || lesson.videoAssetKey))
}

export function getCourseDetailLessonIconClassName(lesson: LearningLesson) {
  if (isCourseDetailAssignmentLesson(lesson)) return 'fas fa-clipboard-check text-purple-500'
  if (isCourseDetailQuizLesson(lesson)) return 'fas fa-circle-question text-amber-500'
  if (isCourseDetailVideoLesson(lesson)) return `fas fa-play-circle ${lesson.isPreview ? 'text-primary' : 'text-gray-400'}`
  if (normalizeLessonType(lesson) === 'READING') return 'fas fa-file-lines text-sky-500'
  return 'fas fa-code text-indigo-500'
}

export function getCourseDetailLessonMetaLabel(lesson: LearningLesson) {
  if (isCourseDetailAssignmentLesson(lesson)) return '과제'
  if (isCourseDetailQuizLesson(lesson)) return '퀴즈'
  if (isCourseDetailVideoLesson(lesson)) return formatLessonDuration(lesson.durationSeconds)
  if (normalizeLessonType(lesson) === 'READING') return '읽기'
  return '실습'
}

export function buildCourseNewsCards(course: LearningCourseDetail) {
  if (!course.news.length) return fallbackNewsCards

  return course.news.map((item, index) => ({
    id: `news-${index + 1}`,
    title: item.title,
    summary: fallbackNewsCards[index]?.summary ?? '강의와 관련된 새로운 업데이트 소식입니다.',
    dateLabel: fallbackNewsCards[index]?.dateLabel ?? '업데이트',
    badgeLabel: fallbackNewsCards[index]?.badgeLabel ?? '공지',
    badgeClassName: fallbackNewsCards[index]?.badgeClassName ?? 'bg-primary text-white',
    href: item.url,
  }))
}

export function buildCourseJobCards(course: LearningCourseDetail) {
  if (!course.jobRelevance.length) return fallbackJobCards

  return course.jobRelevance.slice(0, 2).map((item, index) => {
    const fallback = fallbackJobCards[index] ?? fallbackJobCards[0]
    return {
      ...fallback,
      key: `${item}-${index}`,
      title: item,
    }
  })
}

export function buildReviewStats(reviews: CourseReview[]) {
  const visibleReviews = reviews.filter((item) => !item.isHidden)
  const count = visibleReviews.length
  const average = count
    ? Number((visibleReviews.reduce((sum, item) => sum + item.rating, 0) / count).toFixed(1))
    : 0

  const distribution = [5, 4, 3, 2, 1].map((rating) => {
    const ratingCount = visibleReviews.filter((item) => item.rating === rating).length
    return {
      rating,
      count: ratingCount,
      percent: count ? Math.round((ratingCount / count) * 100) : 0,
    }
  })

  return { count, average, distribution }
}

export function buildReviewAuthorName(review: CourseReview) {
  return `학습자 ${review.learnerId}`
}

export function buildReviewAvatarSeed(review: CourseReview) {
  return buildReviewAuthorName(review).charAt(0)
}

export function buildQuestionCommentCount(question: CourseQuestionItem) {
  return question.comments.length
}

export function buildQuestionStatusLabel(status: CourseQuestionStatus) {
  return status === 'answered' ? '답변 완료' : '답변 대기'
}

export function createNewQuestionId(questions: CourseQuestionItem[]) {
  return questions.reduce((max, item) => Math.max(max, item.id), 0) + 1
}

export function createNewQuestionCommentId(question: CourseQuestionItem) {
  return question.comments.reduce((max, item) => Math.max(max, item.id), 0) + 1
}

export function createQuestionSearchText(question: CourseQuestionItem) {
  return `${question.authorName} ${question.tag} ${question.title} ${question.body}`.toLowerCase()
}

export function getLearningHref(courseId: number, lesson: LearningLesson | null) {
  const params = new URLSearchParams({ courseId: String(courseId) })
  if (lesson?.lessonId) params.set('lessonId', String(lesson.lessonId))
  return `/learning?${params.toString()}`
}
