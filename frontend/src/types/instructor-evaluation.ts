export interface InstructorQuizEditorOption {
  optionId: number | null
  optionText: string
  isCorrect: boolean
  displayOrder: number | null
}

export interface InstructorQuizEditorQuestion {
  questionId: number | null
  questionType: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER'
  questionText: string
  explanation: string | null
  points: number | null
  displayOrder: number | null
  sourceTimestamp: string | null
  options: InstructorQuizEditorOption[]
}

export interface InstructorQuizEditor {
  lessonId: number
  nodeId: number | null
  quizId: number | null
  title: string
  description: string | null
  quizType: 'MANUAL' | 'AI_TOPIC' | 'AI_VIDEO'
  totalScore: number
  passScore: number
  timeLimitMinutes: number
  exposeAnswer: boolean
  exposeExplanation: boolean
  isPublished: boolean
  keywords: string[]
  scriptText: string | null
  questions: InstructorQuizEditorQuestion[]
}

export interface SaveInstructorQuizEditorRequest {
  title: string
  description: string | null
  quizType: 'MANUAL' | 'AI_TOPIC' | 'AI_VIDEO'
  passScore: number
  timeLimitMinutes: number
  exposeAnswer: boolean
  exposeExplanation: boolean
  isPublished: boolean
  keywords: string[]
  scriptText: string | null
  questions: InstructorQuizEditorQuestion[]
}

export interface GenerateInstructorQuizRequest {
  mode: 'video' | 'text'
  videoFileName: string | null
  videoMimeType: string | null
  videoBase64Content: string | null
  scriptText: string | null
  questionCount: number
  difficultyLevel: number
  keywords: string[]
}

export interface InstructorAssignmentRubric {
  rubricId: number | null
  criteriaName: string
  criteriaKeywords: string | null
  maxPoints: number
  displayOrder: number | null
}

export interface InstructorAssignmentReferenceFile {
  fileId: number | null
  fileName: string
  contentType: string | null
  fileSize: number
  displayOrder: number | null
  createdAt: string | null
}

export interface InstructorAssignmentEditor {
  lessonId: number
  nodeId: number | null
  assignmentId: number | null
  title: string
  description: string
  totalScore: number
  passScore: number
  aiReviewEnabled: boolean
  allowTextSubmission: boolean
  allowFileSubmission: boolean
  allowUrlSubmission: boolean
  rubrics: InstructorAssignmentRubric[]
  referenceFiles: InstructorAssignmentReferenceFile[]
}

export interface SaveInstructorAssignmentReferenceFileRequest {
  fileId: number | null
  fileName: string
  contentType: string | null
  fileSize: number
  displayOrder: number | null
  base64Content: string | null
}

export interface SaveInstructorAssignmentEditorRequest {
  title: string
  description: string
  totalScore: number
  passScore: number
  aiReviewEnabled: boolean
  allowTextSubmission: boolean
  allowFileSubmission: boolean
  allowUrlSubmission: boolean
  rubrics: InstructorAssignmentRubric[]
  referenceFiles: SaveInstructorAssignmentReferenceFileRequest[]
}
