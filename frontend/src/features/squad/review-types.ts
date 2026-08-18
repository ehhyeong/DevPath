export type WorkspaceMember = {
  memberId: number
  learnerId: number
  learnerName?: string | null
  profileImage?: string | null
}

export type CodeReviewSummary = {
  reviewId: number
  workspaceId: number
  issueKey: string
  title: string
  status: 'OPEN' | 'CLOSED' | 'MERGED'
  authorId: number
  authorName?: string | null
  authorProfileImage?: string | null
  authorRole?: string | null
  filePath: string
  fileCount?: number | null
  sourceBranch: string
  targetBranch: string
  additions: number
  deletions: number
  aiCommentCount: number
  aiCodeReviewId?: number | null
  createdAt?: string | null
  updatedAt?: string | null
}

export type AiReviewComment = {
  commentId: number
  category: string
  lineNumber?: number | null
  title: string
  message: string
  suggestion?: string | null
}

export type AiReviewDetail = {
  reviewId: number
  summary: string
  commentCount: number
  providerName: string
  comments: AiReviewComment[]
  createdAt?: string | null
}

export type CodeReviewDetail = {
  summary: CodeReviewSummary
  description?: string | null
  prUrl?: string | null
  diffText: string
  files?: CodeReviewFile[]
  aiReview?: AiReviewDetail | null
  members: WorkspaceMember[]
  comments: MemberComment[]
}

export type CodeReviewFile = {
  fileId?: number | null
  reviewId: number
  filePath: string
  diffText: string
  additions: number
  deletions: number
  changeType?: string | null
}

export type MemberComment = {
  commentId: number
  reviewId: number
  authorId: number
  authorName?: string | null
  authorProfileImage?: string | null
  body: string
  filePath?: string | null
  statusLabel: string
  createdAt?: string | null
}

export type CodeReviewBoard = {
  workspaceId: number
  projectName: string
  members: WorkspaceMember[]
  openReviews: CodeReviewSummary[]
  closedReviews: CodeReviewSummary[]
}

export type ReviewTab = 'open' | 'closed'

export type CreateForm = {
  title: string
  filePath: string
  sourceBranch: string
  targetBranch: string
  description: string
  diffText: string
}
