export type AdminJob = {
  jobId: number
  companyId: number
  companyName: string
  title: string
  jobRole: string
  requiredSkills?: string | null
  region?: string | null
  careerLevel?: string | null
  source: string
  status: string
  deadline?: string | null
  description?: string | null
  sourceUrl?: string | null
  externalJobId?: string | null
  archived?: boolean
}

export type JobSkillTag = {
  skillTagId: number
  jobId: number
  name: string
  source: string
  confidenceScore?: number | null
  matchedKeyword?: string | null
  createdAt?: string | null
}

export type JobJdAnalysis = {
  jobId: number
  jobTitle: string
  extractedCount: number
  message: string
  skillTags: JobSkillTag[]
}

export type AdminCompany = {
  companyId: number
  id?: number
  name: string
  industry?: string | null
  location?: string | null
  verificationStatus?: string | null
  websiteUrl?: string | null
  description?: string | null
  logoUrl?: string | null
  archived?: boolean
}

export type LearningMetric = {
  metricKey: string
  metricName: string
  metricValue: number
  description?: string | null
  measuredAt?: string | null
}

export type LearningRule = {
  ruleId: number
  ruleKey: string
  ruleName: string
  description?: string | null
  ruleValue?: string | null
  priority: number
  status: string
}

export type RecommendationSetting = {
  id: number
  settingKey: string
  settingValue: string
  description?: string | null
  updatedAt?: string | null
}

export type PlatformNotice = {
  id: number
  authorId?: number
  title: string
  content: string
  isPinned: boolean
  createdAt?: string | null
  updatedAt?: string | null
}

export type AdminRefund = {
  id: number
  learnerId: number
  courseId: number
  instructorId: number
  reason?: string | null
  status: string
  refundAmount: number
  requestedAt?: string | null
  enrolledAt?: string | null
  progressPercentSnapshot?: number | null
  processedAt?: string | null
}

export type AdminSettlement = {
  settlementId: number
  instructorId: number
  learnerId?: number | null
  courseId: number
  grossAmount: number
  feeAmount: number
  amount: number
  status: string
  purchasedAt?: string | null
  settledAt?: string | null
}

export type SystemHealth = {
  status: 'NORMAL' | 'DEGRADED'
  database: 'UP' | 'DOWN'
  checkedAt: string
  jobkorea?: { status: string; message: string }
  gemini?: { status: string; message: string }
  ffmpeg?: { status: string; message: string }
}

export type SettlementEligibility = {
  refundRequestId: number
  courseId: number
  learnerId: number
  instructorId: number
  purchasedAt: string
  refundDeadline: string
  progressPercent: number
  refundAmount: number
  withinRefundPeriod: boolean
  progressEligible: boolean
  refundApprovable: boolean
  holdBlocked: boolean
  hasPendingSettlement: boolean
  candidateSettlementId?: number | null
  candidateSettlementAmount: number
  isEligible: boolean
  remainingDays: number
}

export type ExperimentResult = {
  experimentId: string
  experimentName: string
  hypothesis?: string | null
  status: 'DRAFT' | 'RUNNING' | 'PAUSED' | 'COMPLETED'
  metricsJson: string
  createdAt?: string | null
  updatedAt?: string | null
  startedAt?: string | null
  completedAt?: string | null
}

export type MarketReport = {
  totalPostingCount: number
  openPostingCount: number
  closedPostingCount: number
  draftPostingCount: number
  analyzedSkillTagCount: number
  topSkills: Array<{ skillName: string; postingCount: number }>
  topJobRoles: Array<{ jobRole: string; postingCount: number }>
  indicators: Array<{ type: string; label: string; postingCount: number }>
  generatedAt?: string | null
}
