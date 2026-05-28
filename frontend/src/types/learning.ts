export interface LearningCourseTag {
  tagId: number
  tagName: string
  proficiencyLevel: number | null
}

export interface LearningCourseObjective {
  objectiveId: number
  objectiveText: string
  displayOrder: number | null
}

export interface LearningCourseTargetAudience {
  targetAudienceId: number
  audienceDescription: string
  displayOrder: number | null
}

export interface LearningCourseInfoSection {
  sectionKey: string | null
  title: string
  displayOrder: number | null
  items: string[]
}

export interface LearningCourseInstructor {
  instructorId: number
  channelName: string | null
  profileImage: string | null
  headline: string | null
  specialties: string[]
  channelApiPath: string | null
}

export interface LearningMaterial {
  materialId: number
  materialType: string
  materialUrl: string | null
  assetKey: string | null
  originalFileName: string
  sortOrder: number | null
}

export type LearningVideoQuality = '1080' | '720'

export type LearningVideoQualityMap = Partial<Record<LearningVideoQuality | `${LearningVideoQuality}p`, string | null>>

export interface LearningVideoSource {
  quality?: LearningVideoQuality | `${LearningVideoQuality}p` | number | null
  resolution?: string | number | null
  height?: string | number | null
  label?: string | null
  name?: string | null
  url?: string | null
  src?: string | null
  videoUrl?: string | null
  href?: string | null
}

export interface LearningAssignmentRubric {
  rubricId: number
  criteriaName: string
  criteriaDescription: string | null
  maxPoints: number | null
  displayOrder: number | null
}

export interface LearningLessonAssignment {
  assignmentId: number
  roadmapNodeId: number | null
  title: string
  description: string | null
  submissionRuleDescription: string | null
  totalScore: number | null
  passScore: number | null
  aiReviewEnabled: boolean | null
  allowTextSubmission: boolean | null
  allowFileSubmission: boolean | null
  allowUrlSubmission: boolean | null
  readmeRequired: boolean | null
  testRequired: boolean | null
  lintRequired: boolean | null
  allowLateSubmission: boolean | null
  dueAt: string | null
  allowedFileFormats: string[]
  rubrics: LearningAssignmentRubric[]
}

export interface LearningLesson {
  lessonId: number
  title: string
  description: string | null
  lessonType: string
  videoUrl: string | null
  videoAssetKey: string | null
  videoUrl1080p?: string | null
  videoUrl1080?: string | null
  video1080Url?: string | null
  fullHdVideoUrl?: string | null
  videoUrl720p?: string | null
  videoUrl720?: string | null
  video720Url?: string | null
  hdVideoUrl?: string | null
  videoUrls?: LearningVideoQualityMap | null
  videoSources?: LearningVideoSource[] | LearningVideoQualityMap | null
  qualitySources?: LearningVideoSource[] | LearningVideoQualityMap | null
  sources?: LearningVideoSource[] | LearningVideoQualityMap | null
  thumbnailUrl: string | null
  durationSeconds: number | null
  isPreview: boolean | null
  isPublished: boolean | null
  sortOrder: number | null
  materials: LearningMaterial[]
  assignment?: LearningLessonAssignment | null
}

export interface LearningSection {
  sectionId: number
  title: string
  description: string | null
  sortOrder: number | null
  isPublished: boolean | null
  lessons: LearningLesson[]
}

export interface LearningNewsItem {
  title: string
  url: string | null
}

export interface LearningCourseDetail {
  courseId: number
  title: string
  subtitle: string | null
  description: string | null
  status: string | null
  price: number | null
  originalPrice: number | null
  currency: string | null
  difficultyLevel: string | null
  language: string | null
  hasCertificate: boolean | null
  thumbnailUrl: string | null
  introVideoUrl: string | null
  videoAssetKey: string | null
  videoUrl1080p?: string | null
  videoUrl1080?: string | null
  video1080Url?: string | null
  fullHdVideoUrl?: string | null
  videoUrl720p?: string | null
  videoUrl720?: string | null
  video720Url?: string | null
  hdVideoUrl?: string | null
  videoUrls?: LearningVideoQualityMap | null
  videoSources?: LearningVideoSource[] | LearningVideoQualityMap | null
  qualitySources?: LearningVideoSource[] | LearningVideoQualityMap | null
  sources?: LearningVideoSource[] | LearningVideoQualityMap | null
  durationSeconds: number | null
  prerequisites: string[]
  jobRelevance: string[]
  objectives: LearningCourseObjective[]
  targetAudiences: LearningCourseTargetAudience[]
  infoSections?: LearningCourseInfoSection[] | null
  tags: LearningCourseTag[]
  isBookmarked: boolean | null
  isEnrolled: boolean | null
  instructor: LearningCourseInstructor | null
  sections: LearningSection[]
  news: LearningNewsItem[]
}

export interface LearningLessonProgress {
  lessonId: number
  progressPercent: number
  progressSeconds: number
  defaultPlaybackRate: number
  pipEnabled: boolean
  isCompleted: boolean
  lastWatchedAt: string | null
}

export interface LearningPlayerConfig {
  lessonId: number
  defaultPlaybackRate: number
  pipEnabled: boolean
}

export interface TimestampNote {
  noteId: number
  lessonId: number
  timestampSecond: number
  seekSecond: number
  timestampLabel: string
  content: string
  createdAt: string | null
  updatedAt: string | null
}

export interface TimestampNotePayload {
  timestampSecond?: number
  timestampText?: string
  content: string
}

export interface LearningSubmissionFile {
  fileName: string
  fileUrl: string
  fileSize: number
  fileType: string
  textContent?: string | null
}

export interface AssignmentPrecheckRequest {
  submissionText: string
  submissionUrl: string
  hasReadme: boolean
  testPassed: boolean
  lintPassed: boolean
  files: LearningSubmissionFile[]
}

export interface AssignmentPrecheckResponse {
  passed: boolean
  readmePassed: boolean
  testPassed: boolean
  lintPassed: boolean
  fileFormatPassed: boolean
  qualityScore: number | null
  message: string | null
}

export interface CreateSubmissionRequest extends AssignmentPrecheckRequest {}

export interface AssignmentSubmissionResponse {
  submissionId: number
  assignmentId: number
  learnerId: number
  submissionStatus: string
  isLate: boolean | null
  submittedAt: string | null
  qualityScore: number | null
  totalScore: number | null
  fileCount: number | null
  individualFeedback: string | null
  commonFeedback: string | null
}

export interface SubmissionHistoryItem {
  submissionId: number
  assignmentId: number
  assignmentTitle: string
  submissionStatus: string
  qualityScore: number | null
  totalScore: number | null
  isLate: boolean | null
  submittedAt: string | null
}

export interface SubmissionHistoryResponse {
  learnerId: number
  totalCount: number
  submissions: SubmissionHistoryItem[]
}

export interface SubmitQuizAnswerRequest {
  questionId: number
  selectedOptionId?: number
  textAnswer?: string
}

export interface SubmitQuizAttemptRequest {
  answers: SubmitQuizAnswerRequest[]
  timeSpentSeconds: number
}

export interface QuizQuestionResult {
  questionId: number
  questionType: string
  questionText: string
  correct: boolean
  earnedPoints: number | null
  selectedOptionId: number | null
  selectedOptionText: string | null
  textAnswer: string | null
  correctAnswerText: string | null
  explanation: string | null
}

export interface QuizAttemptResultResponse {
  attemptId: number
  quizId: number
  quizTitle: string
  score: number
  maxScore: number
  passed: boolean
  attemptNumber: number
  completedAt: string | null
  questionResults: QuizQuestionResult[]
}

export interface LearningQuizOption {
  optionId: number
  optionText: string
}

export interface LearningQuizQuestion {
  questionId: number
  questionType: 'MULTIPLE_CHOICE' | 'SHORT_ANSWER'
  questionText: string
  explanation: string
  points: number
  options: LearningQuizOption[]
  correctOptionId?: number
  correctAnswerText?: string
}

export interface LearningQuizDraft {
  quizId: number | null
  title: string
  description: string
  passScore: number
  questions: LearningQuizQuestion[]
}

export interface LearningAssignmentDraft {
  assignmentId: number | null
  title: string
  description: string
  submissionRuleDescription: string
  totalScore: number
  allowedFileFormats: string[]
  dueLabel: string
}
