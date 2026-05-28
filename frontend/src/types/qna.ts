export type QnaDifficulty = 'EASY' | 'MEDIUM' | 'HARD' | string

export interface QnaQuestionTemplate {
  templateType: string
  name: string
  description: string | null
  guideExample: string | null
  sortOrder: number
}

export interface QnaAnswer {
  id: number
  authorId: number
  authorName: string
  content: string
  adopted: boolean
  createdAt: string | null
}

export interface QnaQuestionSummary {
  id: number
  authorId: number
  authorName: string
  courseId: number | null
  lessonId: number | null
  templateType: string
  difficulty: QnaDifficulty
  title: string
  adoptedAnswerId: number | null
  lectureTimestamp: string | null
  qnaStatus: string
  answerCount: number
  viewCount: number
  createdAt: string | null
}

export interface QnaQuestionDetail extends QnaQuestionSummary {
  content: string
  updatedAt: string | null
  answers: QnaAnswer[]
}

export interface CreateQnaQuestionRequest {
  templateType: string
  difficulty: QnaDifficulty
  title: string
  content: string
  courseId?: number | null
  lessonId?: number | null
  lectureTimestamp?: string | null
}

export interface CreateQnaAnswerRequest {
  content: string
}
