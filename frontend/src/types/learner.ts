export interface DashboardSummary {
  totalStudyHours: number | null
  completedNodes: number | null
  currentStreak: number | null
  studyHoursDeltaMinutes?: number | null
  lastLessonInfo?: string | null
}

export interface HeatmapEntry {
  date: string
  activityLevel: number | null
  studyHours?: number | null
}

export interface DashboardStudyGroupItem {
  groupId: number
  name: string
  status: string
  maxMembers: number | null
  joinedAt: string | null
  plannedEndDate: string | null
  currentMemberCount: number | null
  memberIds?: number[]
}

export interface DashboardStudyGroup {
  joinedGroupCount: number | null
  recruitingGroupCount: number | null
  inProgressGroupCount: number | null
  groups: DashboardStudyGroupItem[]
}

export interface DashboardMentoringProject {
  projectId: number
  name: string
  status: string
  joinedAt: string | null
}

export interface DashboardMentoringApplication {
  applicationId: number
  mentorId: number | null
  mentorName: string | null
  status: string
  message: string | null
  createdAt: string | null
}

export interface DashboardMentoring {
  joinedProjectCount: number | null
  applicationCount: number | null
  pendingApplicationCount: number | null
  latestProject: DashboardMentoringProject | null
  latestApplication: DashboardMentoringApplication | null
}

export interface Enrollment {
  enrollmentId: number
  courseId: number
  courseTitle: string
  instructorName: string
  thumbnailUrl: string | null
  price: number | null
  originalPrice: number | null
  currency: string | null
  hasCertificate: boolean | null
  status: string
  progressPercentage: number | null
  enrolledAt: string | null
  completedAt: string | null
  lastAccessedAt: string | null
  tags?: string[] | null
}

export interface WishlistCourse {
  wishlistId: number
  courseId: number
  courseTitle: string
  instructorName: string
  thumbnailUrl: string | null
  price: number | null
  addedAt: string | null
}

export interface NotificationItem {
  id: number
  type: string
  message: string
  isRead: boolean
  createdAt: string | null
}

export interface CommunityPost {
  id: number
  authorName: string
  category: string
  title: string
  content: string
  viewCount: number
  likeCount: number
  createdAt: string | null
}

export interface CommunityComment {
  id: number
  authorId: number
  authorName: string
  parentCommentId: number | null
  reply: boolean
  content: string
  createdAt: string | null
  updatedAt: string | null
  children: CommunityComment[]
}

export interface PostPage {
  content: CommunityPost[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  hasNext: boolean
}

export interface TechTag {
  tagId: number
  name: string
  category: string | null
}

export interface UserProfile {
  userId: number
  name: string
  email: string
  role: string
  bio: string | null
  phone: string | null
  profileImage: string | null
  channelName: string | null
  githubUrl: string | null
  blogUrl: string | null
  tags: TechTag[]
}

export interface UserProfileUpdateRequest {
  name: string
  bio: string
  phone: string
  profileImage: string
  channelName: string
  githubUrl: string
  blogUrl: string
  tagIds: number[]
}

export interface UserPasswordChangeRequest {
  currentPassword: string
  newPassword: string
}

export interface LearningHistorySummary {
  completedNodeCount: number
  proofCardCount: number
  tilCount: number
  publishedTilCount: number
  assignmentSubmissionCount: number
  passedAssignmentCount: number
  supplementRecommendationCount: number
}

export interface CompletedNodeDetail {
  nodeId: number
  nodeTitle: string
  clearedAt: string | null
  proofIssued: boolean | null
}

export interface AssignmentDetail {
  submissionId: number
  assignmentId: number
  nodeId: number
  nodeTitle: string
  assignmentTitle: string
  submissionStatus: string
  totalScore: number | null
  submittedAt: string | null
}

export interface TilItem {
  tilId: number
  lessonId: number | null
  title: string
  content: string
  tableOfContents: string
  hasTableOfContents: boolean
  status: string
  publishedUrl: string | null
  createdAt: string | null
  updatedAt: string | null
}

export interface SupplementRecommendation {
  recommendationId: number
  nodeId: number
  nodeTitle: string
  reason: string
  priority: number | null
  coveragePercent: number | null
  missingTagCount: number | null
  status: string
  createdAt: string | null
}

export interface WeaknessAnalysis {
  resultId: number
  roadmapId: number
  score: number | null
  maxScore: number | null
  scorePercentage: number | null
  weakTags: string[]
  recommendedNodeIds: number[]
  analyzedAt: string | null
}

export interface ProofCardSummary {
  proofCardId: number
  nodeId: number
  nodeTitle: string
  title: string
  status: string
  issuedAt: string | null
}

export interface ProofCardDetail extends ProofCardSummary {
  description: string
  tags: ProofCardTag[]
}

export interface ProofCardGalleryItem {
  proofCardId: number
  title: string
  nodeTitle: string
  issuedAt: string | null
  tags: ProofCardTag[]
}

export interface ProofCardTag {
  tagId: number
  tagName: string
  evidenceType: string
}

export interface LearningHistoryDetail {
  summary: LearningHistorySummary
  completedNodes: CompletedNodeDetail[]
  assignments: AssignmentDetail[]
  tils: TilItem[]
  proofCards: ProofCardSummary[]
  supplementRecommendations: SupplementRecommendation[]
  latestWeaknessAnalysis: WeaknessAnalysis | null
}

export interface RefundItem {
  id: number
  learnerId: number
  courseId: number
  instructorId: number
  reason: string
  status: string
  enrolledAt: string | null
  progressPercentSnapshot: number | null
  refundAmount: number | null
  requestedAt: string | null
  processedAt: string | null
}

export interface CertificateDetail {
  certificateId: number
  proofCardId: number
  certificateNumber: string
  status: string
  issuedAt: string | null
  pdfGeneratedAt: string | null
  lastDownloadedAt: string | null
}

export interface CertificatePdfDetail {
  certificateId: number
  fileName: string
  mimeType: string
  base64Content: string
}

export interface CertificateDownloadHistoryDetail {
  downloadHistoryId: number
  downloadReason: string
  downloadedAt: string | null
}

export interface GrowthRecommendationItem {
  nodeId: number
  roadmapId: number
  nodeTitle: string
  roadmapTitle: string
  reason: string
  matchRateIncrease: number
  iconClass: string
}

export interface GrowthRecommendation {
  analysisText: string
  recommendations: GrowthRecommendationItem[]
}

export interface GrowthRecommendationAddResult {
  customRoadmapId: number
  customNodeId: number
  nodeId: number
  nodeTitle: string
  roadmapCreated: boolean
  alreadyExists: boolean
}

export interface WorkspaceHubProject {
  projectId: number
  domId: string
  menuId: string
  type: 'solo' | 'squad' | 'mentoring'
  status: 'progress' | 'completed'
  dashboardUrl: string
  title: string
  description: string
  progressPercent: number
  mentoringModeLabel?: string | null
  mentoringModeIcon?: string | null
  categoryLabel?: string | null
  roleLabel?: string | null
  footerKind: 'avatars' | 'mentor' | 'text'
  footerDateLabel?: string | null
  memberAvatarSeeds: string[]
  extraMemberCount?: number | null
  footerAvatarSeed?: string | null
  footerAvatarUrl?: string | null
  footerText?: string | null
  footerMetaText?: string | null
  footerMetaIcon?: string | null
  nextScheduleTitle?: string | null
  nextScheduleStartAt?: string | null
}
