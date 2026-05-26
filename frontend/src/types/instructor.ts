export interface InstructorPublicProfile {
  instructorId: number
  nickname: string
  profileImageUrl: string | null
  headline: string | null
  isPublic: boolean | null
}

export interface InstructorChannelExternalLinks {
  githubUrl: string | null
  blogUrl: string | null
}

export interface InstructorFeaturedCourse {
  courseId: number
  title: string
  subtitle: string | null
  thumbnailUrl: string | null
}

export interface InstructorChannel {
  profile: InstructorPublicProfile
  intro: string | null
  specialties: string[]
  externalLinks: InstructorChannelExternalLinks | null
  featuredCourses: InstructorFeaturedCourse[]
}

export interface InstructorSubscriptionResponse {
  subscriptionId: number
  channelId: number
  learnerId: number
  notificationEnabled: boolean
  subscribedAt: string | null
}

export interface InstructorNotificationItem {
  notificationId: number
  type: string
  message: string
  isRead: boolean
  createdAt: string | null
}

export interface InstructorCourseListItem {
  courseId: number
  title: string
  status: string | null
  categoryLabel: string
  levelLabel: string
  durationSeconds: number | null
  lessonCount: number
  studentCount: number
  averageProgressPercent: number
  pendingQuestionCount: number
  reviewCount?: number
  averageRating: number
  thumbnailUrl: string | null
  publishedAt: string | null
  tags?: string[] | null
}

export interface InstructorAnnouncementSummary {
  announcementId: number
  courseId: number
  type: string
  title: string
  pinned: boolean
  displayOrder: number
  publishedAt: string | null
  exposureStartAt: string | null
  exposureEndAt: string | null
  eventBannerText: string | null
  eventLink: string | null
}

export interface InstructorAnnouncementDetail extends InstructorAnnouncementSummary {
  content: string
  createdAt: string | null
  updatedAt: string | null
}

export interface InstructorQnaInboxItem {
  questionId: number
  courseId: number | null
  lessonId: number | null
  learnerId: number
  courseTitle: string | null
  lessonTitle: string | null
  learnerName: string | null
  learnerAvatarSeed: string | null
  title: string
  content: string
  status: 'UNANSWERED' | 'ANSWERED' | string
  lectureTimestamp: string | null
  createdAt: string | null
}

export interface InstructorQnaAnswer {
  answerId: number
  questionId: number
  instructorId: number
  authorName?: string | null
  authorProfileImage?: string | null
  content: string
  createdAt: string | null
  updatedAt: string | null
}

export interface InstructorQnaDraft {
  id: number
  questionId: number
  instructorId: number
  draftContent: string
  savedAt: string | null
  updatedAt: string | null
}

export interface InstructorQnaTimeline {
  question: InstructorQnaInboxItem
  publishedAnswer: InstructorQnaAnswer | null
  draft: InstructorQnaDraft | null
  lectureTitle: string | null
  lectureTimestamp: string | null
}

export interface InstructorQnaTemplate {
  id: number
  instructorId: number
  title: string
  content: string
  createdAt: string | null
  updatedAt: string | null
}

export interface InstructorReviewReply {
  replyId: number
  authorName: string
  authorProfileImage: string | null
  content: string
  createdAt: string | null
  updatedAt: string | null
}

export interface InstructorReviewListItem {
  reviewId: number
  courseId: number
  courseTitle: string
  rating: number
  learnerName: string
  createdAt: string | null
  status: string
  content: string
  issueTags: string[]
  hidden: boolean | null
  reply: InstructorReviewReply | null
}

export interface InstructorReviewSummary {
  totalReviews: number
  averageRating: number
  unansweredCount: number
  ratingDistribution: Record<string, number>
}

export interface InstructorReviewHelpful {
  totalReviews: number
  answeredCount: number
  unansweredCount: number
  unsatisfiedCount: number
  answerRate: number
}

export interface InstructorReviewTemplate {
  id: number
  instructorId: number
  title: string
  content: string
  createdAt: string | null
  updatedAt: string | null
}

export interface InstructorRevenueTransaction {
  settlementId: number
  courseId: number | null
  courseTitle: string
  grossAmount: number
  feeAmount: number
  netAmount: number
  purchasedAt: string | null
  settledAt: string | null
  status: string
}

export interface InstructorRevenueMonthlyItem {
  key: string
  label: string
  amount: number
  current: boolean
}

export interface InstructorRevenueCourseBreakdownItem {
  courseId: number | null
  courseTitle: string
  amount: number
  percentage: number
}

export interface InstructorRevenueSummary {
  totalRevenue: number
  monthlyRevenue: number
  platformFeeRate: number
  netRevenue: number
  pendingSettlementCount: number
  heldSettlementCount: number
  completedSettlementCount: number
  pendingSettlementAmount: number
  heldSettlementAmount: number
  monthlyTrend: InstructorRevenueMonthlyItem[]
  courseBreakdown: InstructorRevenueCourseBreakdownItem[]
  recentTransactions: InstructorRevenueTransaction[]
}

export interface InstructorSettlementItem {
  settlementId: number
  instructorId: number
  courseId: number | null
  grossAmount: number
  feeAmount: number
  amount: number
  purchasedAt: string | null
  status: string
  settledAt: string | null
}

export interface InstructorCouponItem {
  id: number
  couponTitle: string
  targetCourseId: number | null
  targetCourseTitle: string
  couponCode: string
  discountType: string
  discountValue: number
  usageCount: number
  maxUsageCount: number | null
  expiresAt: string | null
  active: boolean
}

export interface InstructorPromotionItem {
  id: number
  courseId: number
  courseTitle: string
  promotionType: string
  discountRate: number
  active: boolean
  startAt: string | null
  endAt: string | null
}

export interface InstructorConversionCourseItem {
  courseId: number
  courseTitle: string | null
  totalVisitors: number
  totalSignups: number
  totalPurchases: number
  signupRate: number
  purchaseRate: number
  calculatedAt: string | null
}

export interface InstructorConversionSummary {
  totalVisitors: number
  totalSignups: number
  totalPurchases: number
  signupRate: number
  purchaseRate: number
  dailySnapshotCount: number
  weeklySnapshotCount: number
  courseConversions: InstructorConversionCourseItem[]
}

export interface InstructorAnalyticsOverview {
  courseCount: number
  publishedCourseCount: number
  totalStudentCount: number
  activeStudentCount: number
  totalLessonCount: number
  completedLessonCount: number
  averageProgressPercent: number
}

export interface InstructorAnalyticsStudentItem {
  studentId: number
  studentName: string
  courseId: number
  courseTitle: string
  enrollmentStatus: string
  progressPercent: number | null
  completed: boolean
  enrolledAt: string | null
  lastAccessedAt: string | null
  completedAt: string | null
}

export interface InstructorAnalyticsCourseProgressItem {
  courseId: number
  courseTitle: string
  enrolledStudentCount: number
  completedStudentCount: number
  averageProgressPercent: number
  lastActivityAt: string | null
}

export interface InstructorAnalyticsCompletionRateItem {
  courseId: number
  courseTitle: string
  enrolledStudentCount: number
  completedStudentCount: number
  completionRate: number
}

export interface InstructorAnalyticsAverageWatchTimeItem {
  courseId: number
  courseTitle: string
  averageWatchSeconds: number
}

export interface InstructorAnalyticsDropOffItem {
  lessonId: number
  lessonTitle: string
  startedLearnerCount: number
  completedLearnerCount: number
  averageWatchSeconds: number
  dropOffRate: number
}

export interface InstructorAnalyticsDifficultyItem {
  nodeId: number
  nodeTitle: string
  difficultyScore: number
  difficultyLabel: string
  quizPassRate: number
  assignmentScoreRate: number
  dropOffRate: number
}

export interface InstructorAnalyticsQuizSummary {
  totalAttempts: number
  passedAttempts: number
  averageScoreRate: number
  averageTimeSpentSeconds: number
}

export interface InstructorAnalyticsQuizItem {
  quizId: number
  quizTitle: string
  nodeTitle: string
  questionCount: number
  attemptCount: number
  passRate: number
  averageScoreRate: number
}

export interface InstructorAnalyticsQuizStats {
  summary: InstructorAnalyticsQuizSummary
  items: InstructorAnalyticsQuizItem[]
}

export interface InstructorAnalyticsAssignmentSummary {
  totalSubmissions: number
  gradedSubmissions: number
  averageScore: number
  passRate: number
}

export interface InstructorAnalyticsAssignmentItem {
  nodeId: number
  nodeTitle: string
  submissionCount: number
  gradedCount: number
  averageScore: number
}

export interface InstructorAnalyticsAssignmentStats {
  summary: InstructorAnalyticsAssignmentSummary
  items: InstructorAnalyticsAssignmentItem[]
}

export interface InstructorAnalyticsFunnelStep {
  stepName: string
  value: number
}

export interface InstructorAnalyticsFunnel {
  steps: InstructorAnalyticsFunnelStep[]
}

export interface InstructorAnalyticsWeakPointItem {
  nodeId: number
  nodeTitle: string
  weaknessScore: number
  summary: string
}

export interface InstructorMentoringRoleItem {
  name: string
  current: number
  total: number
}

export interface InstructorMentoringProjectItem {
  id: string
  title: string
  requestTitle: string
  description: string
  mode: 'study' | 'team' | string
  category: string
  recruitStatus: string
  current: number
  total: number
  roles: InstructorMentoringRoleItem[]
  tags: string[]
  mentorName: string
  mentorBio: string
  intro: string
  durationWeeks: number
  weeks: string[]
}

export interface InstructorMentoringRequestItem {
  id: string
  applicantName: string
  avatarSeed: string
  submittedAt: string
  projectId: string
  projectTitle: string
  mode: 'study' | 'team' | string
  role: string
  motivation: string
  portfolioUrl: string
}

export interface InstructorMentoringOngoingItem {
  id: string
  title: string
  subtitle: string
  week: number
  mode: 'study' | 'team' | string
  category: string
  progress: number
  primaryAction: string
  secondaryAction: string
  menuActions: string[]
  workspaceId?: number | null
}

export interface InstructorMentoringBoard {
  projects: InstructorMentoringProjectItem[]
  requests: InstructorMentoringRequestItem[]
  ongoingProjects: InstructorMentoringOngoingItem[]
}

export interface InstructorAnalyticsDashboard {
  overview: InstructorAnalyticsOverview
  courseOptions: InstructorCourseListItem[]
  students: InstructorAnalyticsStudentItem[]
  courseProgress: InstructorAnalyticsCourseProgressItem[]
  completionRates: InstructorAnalyticsCompletionRateItem[]
  averageWatchTimes: InstructorAnalyticsAverageWatchTimeItem[]
  dropOffs: InstructorAnalyticsDropOffItem[]
  difficultyItems: InstructorAnalyticsDifficultyItem[]
  quizStats: InstructorAnalyticsQuizStats
  assignmentStats: InstructorAnalyticsAssignmentStats
  funnel: InstructorAnalyticsFunnel
  weakPoints: InstructorAnalyticsWeakPointItem[]
}
